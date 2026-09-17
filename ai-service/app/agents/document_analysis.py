"""
app/agents/document_analysis.py

LangGraph node: DOCUMENT_ANALYSIS

Responsibilities:
  1. Find the first document in state that needs analysis (status = "analyzing")
  2. Call document_service.analyze_document_file() — the full extraction pipeline
  3. Store the DocumentAnalysis result in state
  4. Update backend file status to "UnderReview"
  5. Append to audit log

This node does NOT make the accept/reject decision — that is document_validation.py.
This node does NOT call Gemini directly — document_service handles that pipeline.
"""

import logging
from datetime import datetime, timezone

from app.graph.state import AgentState
from app.services.backend_client import get_backend_client
from app.services.document_service import analyze_document_file

logger = logging.getLogger(__name__)


async def document_analysis_node(state: AgentState) -> AgentState:
    """
    LangGraph node function for document analysis.

    Finds the first document with status 'analyzing', runs the full extraction
    + Gemini pipeline, stores the result, and increments the iteration counter.
    """
    state = dict(state)  # work on a copy
    state["iteration_count"] = state.get("iteration_count", 0) + 1

    backend = get_backend_client()

    # Find the document currently being analyzed
    target_doc_type = None
    for doc_type, doc_status in state["document_statuses"].items():
        if doc_status["status"] == "analyzing":
            target_doc_type = doc_type
            break

    if not target_doc_type:
        logger.warning(
            "document_analysis_node called but no document has status='analyzing'. "
            "session=%s", state["session_id"]
        )
        return state

    doc_status = state["document_statuses"][target_doc_type]
    file_id = doc_status["file_id"]

    if file_id is None:
        logger.error("Document %s has no file_id. session=%s", target_doc_type, state["session_id"])
        _append_audit(state, "ANALYSIS_ERROR", target_doc_type, "No file_id set", "SKIPPED")
        return state

    logger.info(
        "Analyzing document type=%s file_id=%s session=%s",
        target_doc_type, file_id, state["session_id"],
    )

    # Notify backend: file is under review
    try:
        await backend.update_file_status(file_id, "UnderReview")
    except Exception as e:
        logger.warning("Could not update file status to UnderReview: %s", e)

    # Run the full extraction + Gemini pipeline
    analysis = await analyze_document_file(
        file_id=file_id,
        expected_doc_type=target_doc_type,
        session_id=state["session_id"],
    )

    # Store result in state (serialized to dict for TypedDict compatibility)
    state["document_statuses"][target_doc_type]["last_analysis"] = analysis.model_dump()

    _append_audit(
        state,
        event="DOCUMENT_ANALYZED",
        doc_type=target_doc_type,
        reason=(
            f"confidence={analysis.classification_confidence:.2f} "
            f"readable={analysis.readable} "
            f"detected_type={analysis.document_type}"
        ),
        decision="PENDING_VALIDATION",
    )

    logger.info(
        "Analysis complete: doc=%s confidence=%.2f readable=%s detected=%s",
        target_doc_type,
        analysis.classification_confidence,
        analysis.readable,
        analysis.document_type,
    )

    return state


def _append_audit(
    state: dict,
    event: str,
    doc_type: str | None,
    reason: str,
    decision: str,
) -> None:
    """Appends a structured audit entry to state['audit_log']."""
    entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "session_id": state.get("session_id"),
        "workflow_id": state.get("workflow_id"),
        "request_id": state.get("request_id"),
        "event": event,
        "doc_type": doc_type,
        "reason": reason,
        "decision": decision,
    }
    state["audit_log"].append(entry)
