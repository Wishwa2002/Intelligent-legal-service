"""
app/graph/routing.py

Deterministic routing logic for the LangGraph workflow.

CRITICAL: All routing decisions are Python code — Gemini never decides
which node runs next. RouteDecision is produced by Python functions
that read AgentState, never by the LLM.
"""

from __future__ import annotations
import logging

from app.config.settings import get_settings
from app.graph.state import AgentState
from app.schemas.agent import RouteDecision

logger = logging.getLogger(__name__)


def route_after_validation(state: AgentState) -> str:
    """
    Routing decision after a document has been validated (accepted or rejected).

    Returns the name of the next LangGraph node to execute.
    """
    settings = get_settings()

    # Safety: iteration limit check
    if state["iteration_count"] >= settings.max_total_agent_iterations:
        logger.warning(
            "MAX_ITERATIONS reached for session=%s — forcing HUMAN_REVIEW",
            state["session_id"],
        )
        return "human_review"

    if state["human_review_triggered"]:
        return "human_review"

    statuses = state["document_statuses"]

    # Check if any doc still needs re-upload (rejected, under retry limit)
    for doc_type, doc_status in statuses.items():
        if doc_status["status"] == "rejected":
            retry = doc_status["retry_count"]
            if retry < settings.max_reupload_attempts_per_document:
                logger.info("Doc %s rejected (retry %d) — routing to request_documents", doc_type, retry)
                return "request_documents"
            else:
                logger.warning("Doc %s exceeded max retries — routing to human_review", doc_type)
                return "human_review"

    # Check if any doc is still pending (not yet uploaded)
    for doc_type, doc_status in statuses.items():
        if doc_status["status"] == "pending":
            logger.info("Doc %s still pending — routing to request_documents", doc_type)
            return "request_documents"

    # Check if all docs are accepted (or accepted_with_flag)
    all_done = all(
        s["status"] in ("accepted", "accepted_with_flag")
        for s in statuses.values()
    )
    if all_done and len(statuses) == len(state["required_documents"]):
        logger.info("All documents accepted — routing to generate_document_summary")
        return "generate_document_summary"

    # Default: still waiting for documents
    return "request_documents"


def route_after_admin_decision(state: AgentState) -> str:
    """
    Routing decision after an admin approves or rejects a clerk recommendation.
    """
    decision = state.get("last_admin_decision", "")

    if decision == "APPROVED":
        logger.info("Admin approved clerk — routing to complete")
        return "complete"
    elif decision == "REJECTED":
        # Check if there are any un-excluded clerks remaining
        logger.info("Admin rejected clerk — routing to replan")
        return "replan"
    else:
        logger.warning("Unknown admin decision %r — routing to human_review", decision)
        return "human_review"


def route_from_supervisor(state: AgentState) -> str:
    """
    Top-level routing from the supervisor node based on current phase.
    Called at the start of each resume cycle.
    """
    phase = state["phase"]

    routing_map = {
        "UNDERSTAND_REQUEST": "understand_request",
        "WAITING_FOR_DOCUMENTS": "request_documents",
        "ANALYZING": "document_analysis",
        "DOCUMENTS_COMPLETE": "generate_document_summary",
        "CLERK_RECOMMENDATION": "clerk_recommendation",
        "ADMIN_APPROVAL_PENDING": "admin_approval",
        "IN_PROCESS": "complete",
        "COMPLETED": "complete",
        "HUMAN_REVIEW": "human_review",
        "ERROR": "human_review",
    }

    next_node = routing_map.get(phase, "human_review")
    logger.info("Supervisor routing: phase=%s → node=%s", phase, next_node)
    return next_node
