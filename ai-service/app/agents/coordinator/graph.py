import logging
import os
import secrets

import httpx

from langgraph.graph import StateGraph, START, END

from app.graph.scheduling_workflow import (
    create_scheduling_session,
    process_scheduling_message,
)

from app.agents.completeness import evaluate_completeness
from app.agents.clerk_recommendation import rank_clerks_transparently
from app.tools.clerk_tools import get_eligible_clerks

from .state import CoordinatorState
from .planner import planner_node
from .router import route_next_step
from .validator import validator_node
from .replanner import replanner_node

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Lawyer Recommendation Node
# Calls the Member-1 FastAPI service at LAWYER_RECOMMENDATION_URL.
# ---------------------------------------------------------------------------

async def lawyer_node(
    state: CoordinatorState,
) -> CoordinatorState:
    """
    Delegate lawyer discovery to the Member-1 recommendation service.

    The service is called via HTTP POST /lawyer-recommendations.
    On any transport or service error the node records a Failed status so
    the validator/replanner can decide whether to retry.
    """
    state = dict(state)
    current_step = state.get("current_step", 0)

    # Read configuration at call time (supports test overrides).
    from app.config.settings import get_settings
    settings = get_settings()
    base_url = settings.lawyer_recommendation_url.rstrip("/")
    internal_key = os.environ.get("AI_INTERNAL_KEY", "")

    legal_category = state.get("legal_category", "General Law")
    requirement = (
        f"{state.get('title', '')}. "
        f"{state.get('description', '')}. "
        f"Legal category: {legal_category}."
    ).strip()

    payload = {
        "requirement": requirement or "General legal assistance required.",
        "specializations": [],
        "services": [],
        "candidates": [],
        "limit": 5,
    }

    try:
        async with httpx.AsyncClient(timeout=45.0) as client:
            response = await client.post(
                f"{base_url}/lawyer-recommendations",
                json=payload,
                headers={
                    "X-Internal-Key": internal_key,
                    "Content-Type": "application/json",
                },
            )
            response.raise_for_status()
            data = response.json()

        recommendations = data.get("recommendations", [])
        warnings = data.get("warnings", [])
        parsed = data.get("parsedRequirement", {})

        state["lawyer_result"] = {
            "status": "Completed",
            "recommendations": recommendations,
            "warnings": warnings,
            "parsedRequirement": parsed,
            "recommendation_count": len(recommendations),
        }

        if current_step < len(state.get("plan", [])):
            state["plan"][current_step]["status"] = "Completed"

        state["current_step"] = current_step + 1

        state.setdefault("trace", []).append({
            "event": "LAWYER_AGENT_COMPLETED",
            "recommendation_count": len(recommendations),
            "warnings": warnings,
        })

        logger.info(
            "LawyerNode: %d recommendations returned for category=%s",
            len(recommendations),
            legal_category,
        )

    except httpx.HTTPStatusError as exc:
        status_code = exc.response.status_code
        logger.warning(
            "LawyerNode: HTTP %d from lawyer service",
            status_code,
        )
        state["lawyer_result"] = {
            "status": "Failed",
            "error": f"Lawyer service returned HTTP {status_code}.",
        }
        if current_step < len(state.get("plan", [])):
            state["plan"][current_step]["status"] = "Failed"
        state["current_step"] = current_step + 1
        state.setdefault("trace", []).append({
            "event": "LAWYER_AGENT_FAILED",
            "error": f"HTTP {status_code}",
        })

    except (httpx.RequestError, TimeoutError, Exception) as exc:
        logger.warning(
            "LawyerNode: unreachable or timed out — %s: %s",
            type(exc).__name__,
            exc,
        )
        state["lawyer_result"] = {
            "status": "Failed",
            "error": (
                "Lawyer Recommendation Service is temporarily unavailable."
            ),
        }
        if current_step < len(state.get("plan", [])):
            state["plan"][current_step]["status"] = "Failed"
        state["current_step"] = current_step + 1
        state.setdefault("trace", []).append({
            "event": "LAWYER_AGENT_FAILED",
            "error": type(exc).__name__,
        })

    return state


async def scheduling_node(
    state: CoordinatorState
) -> CoordinatorState:
    state = dict(state)

    try:
        session_id, _ = create_scheduling_session(
            customer_id=state.get(
                "service_request_id",
                "coordinator-user"
            ),
            client_name=None,
            user_role="Client",
        )

        message = (
            f"{state.get('title', '')}. "
            f"{state.get('description', '')}. "
            f"Legal category: "
            f"{state.get('legal_category', 'General Law')}. "
            f"I need help arranging a legal consultation."
        )

        scheduling_state = await process_scheduling_message(
            session_id=session_id,
            message=message,
        )

        state["scheduling_result"] = {
            "status": "Completed",
            "session_id": session_id,
            "phase": scheduling_state.get("phase"),
            "messages": scheduling_state.get(
                "messages",
                []
            ),
            "confirmed_booking": scheduling_state.get(
                "confirmed_booking"
            ),
        }

        current_step = state.get("current_step", 0)

        if current_step < len(state.get("plan", [])):
            state["plan"][current_step]["status"] = "Completed"

        state["current_step"] = current_step + 1

        state.setdefault("trace", []).append({
            "event": "SCHEDULING_AGENT_COMPLETED",
            "session_id": session_id,
            "phase": scheduling_state.get("phase"),
        })

        return state

    except Exception as exc:
        state["scheduling_result"] = {
            "status": "Failed",
            "error": str(exc),
        }

        state.setdefault("trace", []).append({
            "event": "SCHEDULING_AGENT_FAILED",
            "error": str(exc),
        })

        return state


async def documentation_node(
    state: CoordinatorState
) -> CoordinatorState:
    state = dict(state)

    try:
        service_request_id = state.get(
            "service_request_id",
            "coordinator-case"
        )

        legal_category = state.get(
            "legal_category",
            "General Law"
        )

        # Map coordinator category to Member 3 service type
        service_type_map = {
            "Real Estate & Property Law": "PROPERTY_TRANSFER",
            "Corporate & Commercial Law": "BUSINESS_REGISTRATION",
            "Criminal Law": "BAIL_APPLICATION",
            "Labour & Employment Law": "EMPLOYMENT_CONTRACT",
            "Tax Law": "TAX_SERVICE",
            "General Law": "GENERAL_LEGAL_SERVICE",
        }

        service_type = service_type_map.get(
            legal_category,
            "GENERAL_LEGAL_SERVICE"
        )

        # Member 3 deterministic document requirements
        required_map = {
            "PROPERTY_TRANSFER": [
                "NIC",
                "PROPERTY_DEED",
                "SALE_AGREEMENT",
                "APPLICATION_FORM",
            ],
            "BUSINESS_REGISTRATION": [
                "NIC",
                "BUSINESS_REGISTRATION",
                "APPLICATION_FORM",
                "CONTRACT",
            ],
            "BAIL_APPLICATION": [
                "NIC",
                "COURT_DOCUMENT",
                "APPLICATION_FORM",
            ],
            "EMPLOYMENT_CONTRACT": [
                "NIC",
                "APPLICATION_FORM",
                "CONTRACT",
            ],
            "TAX_SERVICE": [
                "NIC",
                "APPLICATION_FORM",
                "CONTRACT",
            ],
            "GENERAL_LEGAL_SERVICE": [
                "NIC",
                "APPLICATION_FORM",
                "CONTRACT",
            ],
        }

        required_documents = required_map.get(
            service_type,
            ["NIC", "APPLICATION_FORM", "CONTRACT"]
        )

        # At coordinator planning stage we do not assume
        # the customer has already uploaded any documents.
        provided_documents = []

        completeness = evaluate_completeness(
            required_docs=required_documents,
            provided_docs=provided_documents,
            case_id=service_request_id,
            service_type=service_type,
        )

        # Ask Member 3's real clerk recommendation logic
        candidates = await get_eligible_clerks()

        clerk_recommendations = []

        if candidates:
            ranked = rank_clerks_transparently(
                candidates,
                service_type,
            )

            clerk_recommendations = [
                {
                    "clerk_id": item.clerk_id,
                    "name": item.name,
                    "score": item.match_score,
                    "reasons": item.reasons,
                }
                for item in ranked
            ]

        state["documentation_result"] = {
            "status": "Completed",
            "service_type": service_type,
            "required_documents": required_documents,
            "completeness": (
                completeness.model_dump()
                if hasattr(completeness, "model_dump")
                else completeness
            ),
            "clerk_recommendations": clerk_recommendations,
            "requires_human_approval": True,
        }

        current_step = state.get("current_step", 0)

        if current_step < len(state.get("plan", [])):
            state["plan"][current_step]["status"] = "Completed"

        state["current_step"] = current_step + 1

        state.setdefault("trace", []).append({
            "event": "DOCUMENTATION_AGENT_COMPLETED",
            "service_type": service_type,
            "recommended_clerks": len(
                clerk_recommendations
            ),
        })

        return state

    except Exception as exc:
        state["documentation_result"] = {
            "status": "Failed",
            "error": str(exc),
        }

        state.setdefault("trace", []).append({
            "event": "DOCUMENTATION_AGENT_FAILED",
            "error": str(exc),
        })

        return state


async def approval_node(state: CoordinatorState) -> CoordinatorState:
    state = dict(state)

    current_step = state.get("current_step", 0)

    if current_step < len(state.get("plan", [])):
        state["plan"][current_step]["status"] = "AwaitingApproval"

    state["approval_status"] = "AwaitingApproval"
    state["workflow_status"] = "AwaitingApproval"

    state.setdefault("trace", []).append({
        "event": "HUMAN_APPROVAL_REQUIRED"
    })

    return state


# ---------------------------------------------------------------------------
# Post-Approval Phase
# These nodes run AFTER an admin submits their approval decision.
# They are called directly from the /approve route (not wired into the graph)
# because approval is a human gate that pauses the workflow between runs.
# ---------------------------------------------------------------------------

async def final_action_node(
    state: CoordinatorState,
) -> CoordinatorState:
    """
    Execute finalised actions after admin approval.

    Records what was achieved by each agent so the frontend and
    audit trail have a clear, structured summary of actions taken.
    Does NOT perform irreversible operations (e.g. booking) — those
    happen when the customer confirms interactively.
    """
    state = dict(state)

    actions_taken = []

    # Lawyer recommendations
    lawyer_result = state.get("lawyer_result", {})
    if lawyer_result.get("status") == "Completed":
        count = lawyer_result.get("recommendation_count", 0)
        actions_taken.append({
            "action": "LAWYER_RECOMMENDATIONS_READY",
            "detail": (
                f"{count} lawyer(s) recommended for "
                f"{state.get('legal_category', 'General Law')}. "
                "Customer can review and select via the UI."
            ),
        })

    # Scheduling session
    scheduling_result = state.get("scheduling_result", {})
    if scheduling_result.get("status") == "Completed":
        session_id = scheduling_result.get("session_id", "")
        phase = scheduling_result.get("phase", "")
        actions_taken.append({
            "action": "SCHEDULING_SESSION_ACTIVE",
            "detail": (
                f"Session {session_id} is active (phase: {phase}). "
                "Customer can select a slot and confirm the appointment."
            ),
        })

    # Documentation requirements
    documentation_result = state.get("documentation_result", {})
    if documentation_result.get("status") == "Completed":
        docs = documentation_result.get("required_documents", [])
        clerk_count = len(
            documentation_result.get("clerk_recommendations", [])
        )
        actions_taken.append({
            "action": "DOCUMENT_REQUIREMENTS_IDENTIFIED",
            "detail": (
                f"{len(docs)} document(s) required: "
                f"{', '.join(docs)}. "
                f"{clerk_count} clerk(s) recommended for processing."
            ),
        })

    state["execution_summary"] = {
        "status": "ActionsExecuted",
        "approval_status": state.get("approval_status", "Approved"),
        "actions_taken": actions_taken,
        "action_count": len(actions_taken),
    }

    state.setdefault("trace", []).append({
        "event": "FINAL_ACTIONS_EXECUTED",
        "action_count": len(actions_taken),
    })

    logger.info(
        "FinalActionNode: %d actions executed for workflow=%s",
        len(actions_taken),
        state.get("service_request_id", "unknown"),
    )

    return state


async def audit_node(
    state: CoordinatorState,
) -> CoordinatorState:
    """
    Build the complete audit trail and mark the workflow Completed.

    Produces a structured audit_log that can be persisted to the
    backend audit table in a future integration sprint.
    """
    from datetime import datetime, timezone

    state = dict(state)

    plan = state.get("plan", [])
    lawyer_result = state.get("lawyer_result", {})
    scheduling_result = state.get("scheduling_result", {})
    documentation_result = state.get("documentation_result", {})

    # Agents that were actually invoked (exclude coordinator meta-steps)
    agents_invoked = list(dict.fromkeys(
        step["agent"]
        for step in plan
        if step.get("agent") not in (
            "PlanningCoordinatorAgent",
        )
    ))

    completed_at = datetime.now(timezone.utc).isoformat()

    audit_log = {
        "workflow_id": state.get("workflow_id", "unknown"),
        "service_request_id": state.get("service_request_id", "unknown"),
        "legal_category": state.get("legal_category", "Unknown"),
        "priority": state.get("priority", "Normal"),
        "completed_at": completed_at,
        "agents_invoked": agents_invoked,
        "plan_steps_total": len(plan),
        "validation_passed": state.get("validation_passed", False),
        "approval_status": state.get("approval_status", "Unknown"),
        "retry_count": state.get("retry_count", 0),
        "lawyer_recommendations": (
            lawyer_result.get("recommendation_count", 0)
            if lawyer_result else 0
        ),
        "scheduling_session_id": (
            scheduling_result.get("session_id")
            if scheduling_result else None
        ),
        "scheduling_phase_reached": (
            scheduling_result.get("phase")
            if scheduling_result else None
        ),
        "documents_required": (
            documentation_result.get("required_documents", [])
            if documentation_result else []
        ),
        "clerks_recommended": (
            len(documentation_result.get("clerk_recommendations", []))
            if documentation_result else 0
        ),
        "trace_events": [
            t.get("event") for t in state.get("trace", [])
        ],
        "execution_summary": state.get("execution_summary", {}),
    }

    state["audit_log"] = audit_log
    state["workflow_status"] = "Completed"

    state.setdefault("trace", []).append({
        "event": "WORKFLOW_COMPLETED",
        "completed_at": completed_at,
        "workflow_status": "Completed",
    })

    logger.info(
        "AuditNode: workflow=%s completed at %s",
        state.get("service_request_id", "unknown"),
        completed_at,
    )

    return state


def validation_route(state: CoordinatorState) -> str:
    if state.get("validation_passed"):
        return "continue"

    if state.get("final_outcome", {}).get("status") == "Failed":
        return "finish"

    return "replan"


def replan_route(state: CoordinatorState) -> str:
    final_status = state.get(
        "final_outcome",
        {}
    ).get("status")

    if final_status in {
        "Failed",
        "NeedsHumanReview",
        "AwaitingCustomerInput",
    }:
        return "finish"

    return route_next_step(state)


def build_coordinator_graph():
    graph = StateGraph(CoordinatorState)

    graph.add_node("planner", planner_node)
    graph.add_node("lawyer", lawyer_node)
    graph.add_node("scheduling", scheduling_node)
    graph.add_node("documentation", documentation_node)
    graph.add_node("validate", validator_node)
    graph.add_node("replan", replanner_node)
    graph.add_node("approval", approval_node)

    graph.add_edge(START, "planner")

    # After planning, choose the first required agent.
    graph.add_conditional_edges(
        "planner",
        route_next_step,
        {
            "lawyer": "lawyer",
            "scheduling": "scheduling",
            "documentation": "documentation",
            "validate": "validate",
            "approval": "approval",
            "finish": END,
        },
    )

    # After each specialized agent, route to the next planned step.
    for node_name in [
        "lawyer",
        "scheduling",
        "documentation",
    ]:
        graph.add_conditional_edges(
            node_name,
            route_next_step,
            {
                "lawyer": "lawyer",
                "scheduling": "scheduling",
                "documentation": "documentation",
                "validate": "validate",
                "approval": "approval",
                "finish": END,
            },
        )

    # Validation either continues to approval or replans.
    graph.add_conditional_edges(
        "validate",
        validation_route,
        {
            "continue": "approval",
            "replan": "replan",
            "finish": END,
        },
    )

    # After replanning, continue from the selected step.
    graph.add_conditional_edges(
        "replan",
        replan_route,
        {
            "lawyer": "lawyer",
            "scheduling": "scheduling",
            "documentation": "documentation",
            "validate": "validate",
            "approval": "approval",
            "finish": END,
        },
    )

    # Human approval pauses the current coordinator run.
    graph.add_edge("approval", END)

    return graph.compile()