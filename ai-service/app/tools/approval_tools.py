"""
app/tools/approval_tools.py

Tool functions for the admin approval workflow.
The AI service reads approval decisions but never makes them.
"""

import logging

logger = logging.getLogger(__name__)


def get_approval_status(state: dict) -> str:
    """Returns the current approval status from workflow state."""
    return state.get("last_admin_decision", "PENDING")


def record_admin_decision(
    state: dict,
    decision: str,
    approved_by: int,
    comment: str,
    clerk_id: int | None = None,
) -> dict:
    """
    Records an admin decision into the workflow state.

    Args:
        decision: "APPROVED" or "REJECTED"
        approved_by: Admin user ID
        comment: Admin's comment/reason
        clerk_id: The clerk being approved (set on APPROVED decisions)
    """
    state["last_admin_decision"] = decision

    if decision == "APPROVED" and clerk_id is not None:
        state["recommended_clerk_id"] = clerk_id

    state["audit_log"].append({
        "event": f"ADMIN_{decision}",
        "approved_by": approved_by,
        "comment": comment,
        "clerk_id": clerk_id,
    })

    logger.info(
        "Admin decision recorded: %s by user=%d clerk=%s comment=%r",
        decision, approved_by, clerk_id, comment[:80] if comment else "",
    )
    return state


async def submit_for_admin_approval(
    request_id: int,
    clerk_id: int,
    reason: str,
) -> dict:
    """
    Marks the workflow as awaiting admin approval.
    Returns the proposal dict — the backend performs the real assignment
    only after the admin confirms via the backend UI.
    """
    logger.info(
        "Submitted for admin approval: request=%d proposed_clerk=%d",
        request_id, clerk_id,
    )
    return {
        "request_id": request_id,
        "proposed_clerk_id": clerk_id,
        "reason": reason,
        "status": "PENDING_ADMIN_APPROVAL",
    }
