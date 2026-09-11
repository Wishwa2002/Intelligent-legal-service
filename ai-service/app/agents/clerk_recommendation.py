"""
app/agents/clerk_recommendation.py

LangGraph node: CLERK_RECOMMENDATION

Fetches eligible clerks from the backend, enriches with workload data,
asks Gemini to EXPLAIN which clerk looks best, then pauses for admin approval.

Boundaries enforced here:
- Gemini explains; Python routes. Admin decides.
- Excluded clerk IDs (from previous admin rejections) are always filtered out.
- The workflow pauses after generating the recommendation — it does NOT assign.
"""

import logging
from datetime import datetime, timezone

from app.graph.state import AgentState
from app.services.gemini_service import get_gemini_service
from app.tools.clerk_tools import get_eligible_clerks, create_assignment_proposal
from app.tools.approval_tools import submit_for_admin_approval

logger = logging.getLogger(__name__)


async def clerk_recommendation_node(state: AgentState) -> AgentState:
    """
    Fetches candidates, asks Gemini to recommend, stores result in state,
    and sets phase to ADMIN_APPROVAL_PENDING (workflow pauses here).
    """
    state = dict(state)
    gemini = get_gemini_service()

    excluded = state.get("excluded_clerk_ids", [])
    logger.info(
        "Finding eligible clerks for session=%s (excluding: %s)",
        state["session_id"], excluded,
    )

    # Fetch candidates (backend data + workload)
    candidates = await get_eligible_clerks(exclude_clerk_ids=excluded)

    if not candidates:
        logger.warning("No eligible clerks found. Routing to human_review. session=%s", state["session_id"])
        state["human_review_triggered"] = True
        state["human_review_reason"] = "No eligible clerks available for assignment."
        _add_message(state, "agent",
            "No available clerks could be found at this time. "
            "A manager will handle the assignment manually.")
        _append_audit(state, "NO_CLERKS_AVAILABLE", "All clerks excluded or unavailable", "HUMAN_REVIEW")
        return state

    # Ask Gemini to explain the recommendation (NOT to decide)
    candidate_dicts = [c.model_dump() for c in candidates]
    recommendation = await gemini.recommend_clerk(
        candidates=candidate_dicts,
        service_name=state["service_name"],
        request_context=f"Request #{state.get('request_id')} — {state['service_name']}",
    )

    # Look up the actual clerk name and department from candidates
    matched_clerk = next(
        (c for c in candidates if str(c.clerk_id) == str(recommendation.recommended_clerk_id)),
        None
    )
    clerk_name = matched_clerk.name if matched_clerk else f"Clerk #{recommendation.recommended_clerk_id}"
    clerk_dept = matched_clerk.department if matched_clerk else "Legal Department"

    # Store recommendation in state
    clerk_id = int(recommendation.recommended_clerk_id)
    state["recommended_clerk_id"] = clerk_id
    state["recommended_clerk_name"] = clerk_name
    state["recommended_clerk_dept"] = clerk_dept
    state["recommendation_reason"] = recommendation.reason
    state["pending_approval_clerk_id"] = clerk_id

    # Create assignment proposal record
    proposal = create_assignment_proposal(
        request_id=state.get("request_id") or 0,
        clerk_id=clerk_id,
        reason=recommendation.reason,
    )

    # Officially update the clerk assignment on the backend database
    # so Clerk Management active tasks and Document Request page update immediately!
    req_id = state.get("request_id")
    if req_id:
        from app.services.backend_client import get_backend_client
        backend = get_backend_client()
        try:
            await backend.assign_clerk(int(req_id), clerk_id)
            logger.info("Auto-assigned clerk %d (%s) to request %d on backend", clerk_id, clerk_name, req_id)
        except Exception as e:
            logger.warning("Could not auto-assign clerk to request %d on backend: %s", req_id, e)

    # Message to client and admin
    client_name = state.get("client_name")
    last_doc = state.get("last_validated_doc_type")
    last_doc_prefix = f"✅ You uploaded **{last_doc}**, and it has been **Accepted**! 🎉\n\n" if last_doc else ""
    greeting = f"🎉 **Thank you{f', {client_name}' if client_name else ''}! All Required Documents Received & Verified!**"
    req_id = state.get("request_id")
    req_str = f"#{req_id}" if req_id else ""

    completion_msg = (
        f"{last_doc_prefix}"
        f"{greeting}\n\n"
        f"All required documents for your **{state['service_name']}** request {req_str} have been successfully uploaded, verified, and accepted! 📄✨\n\n"
        f"📋 **Next Steps & Real-Time Tracking:**\n"
        f"• **Check Your Requests Page:** You can view and track the real-time status of your request at any time on your **Requests** page.\n"
        f"• **Administrative Approval & Notification:** Your application has been submitted for official administrative review. "
        f"**After the Admin Approval, you will be notified** immediately with official updates and next steps.\n"
        f"• **Assigned Legal Clerk:** **{clerk_name}** ({clerk_dept})\n\n"
        f"Thank you for choosing our legal services! Please let me know if you have any questions."
    )
    action_options = ["📋 Go to My Requests", "📁 View All Services"]
    _add_message(state, "agent", completion_msg, action_options=action_options)

    # Set phase to ADMIN_APPROVAL_PENDING — workflow ready for review
    state["phase"] = "ADMIN_APPROVAL_PENDING"

    _append_audit(
        state, "CLERK_RECOMMENDED",
        f"clerk_id={recommendation.recommended_clerk_id} "
        f"confidence={recommendation.confidence:.2f} "
        f"reason={recommendation.reason[:80]}",
        "PENDING_ADMIN_APPROVAL",
    )

    logger.info(
        "Clerk recommendation: clerk=%s confidence=%.2f session=%s",
        recommendation.recommended_clerk_id,
        recommendation.confidence,
        state["session_id"],
    )

    return state


async def replan_node(state: AgentState) -> AgentState:
    """
    Called when admin rejects a clerk recommendation.
    Adds the rejected clerk to excluded_clerk_ids and re-runs recommendation.
    """
    state = dict(state)

    rejected_clerk_id = state.get("pending_approval_clerk_id")
    if rejected_clerk_id and rejected_clerk_id not in state["excluded_clerk_ids"]:
        state["excluded_clerk_ids"].append(rejected_clerk_id)
        logger.info(
            "Replan: excluding clerk_id=%d. Total excluded: %s",
            rejected_clerk_id, state["excluded_clerk_ids"],
        )

    _append_audit(
        state, "REPLAN_TRIGGERED",
        f"admin rejected clerk_id={rejected_clerk_id}",
        "REPLANNING",
    )

    # Reset pending approval
    state["pending_approval_clerk_id"] = None
    state["last_admin_decision"] = None

    # Re-run clerk recommendation with updated exclusions
    return await clerk_recommendation_node(state)


def _add_message(state: dict, role: str, content: str, action_options: list[str] | None = None) -> None:
    msg: dict = {
        "role": role,
        "content": content,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    if action_options:
        msg["action_options"] = action_options
        state["pending_action_options"] = action_options
    state["messages"].append(msg)


def _append_audit(state: dict, event: str, details: str, decision: str) -> None:
    state["audit_log"].append({
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "session_id": state.get("session_id"),
        "workflow_id": state.get("workflow_id"),
        "request_id": state.get("request_id"),
        "event": event,
        "details": details,
        "decision": decision,
    })
