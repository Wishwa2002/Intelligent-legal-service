"""
app/tools/clerk_tools.py

Tool functions for clerk data and assignment proposals.

BOUNDARY: The AI service NEVER assigns a clerk directly.
create_assignment_proposal() only creates a recommendation record.
The actual assignment (POST /assign-clerk) is performed by the backend
only after admin approval is confirmed by the backend itself.
"""

import logging

from app.schemas.clerk import ClerkCandidate
from app.services.backend_client import get_backend_client

logger = logging.getLogger(__name__)


async def get_eligible_clerks(
    exclude_clerk_ids: list[int] | None = None,
) -> list[ClerkCandidate]:
    """
    Fetch all clerks from the backend and enrich with workload data.
    Excludes any clerk IDs in the exclude list (used during re-planning after admin rejection).

    Returns list of ClerkCandidate with active_request_count computed.
    """
    backend = get_backend_client()
    exclude = set(exclude_clerk_ids or [])

    try:
        clerks = await backend.get_all_clerks()
    except Exception as e:
        logger.error("get_eligible_clerks: failed to fetch clerks: %s", e)
        return []

    candidates: list[ClerkCandidate] = []
    for clerk in clerks:
        clerk_id = clerk.get("clerkId") or clerk.get("clerk_id")
        if clerk_id in exclude:
            logger.info("Excluding clerk_id=%d from candidates (admin rejected)", clerk_id)
            continue

        workload = await get_clerk_workload(clerk_id)
        candidates.append(
            ClerkCandidate(
                clerk_id=clerk_id,
                name=clerk.get("fullName") or clerk.get("name", ""),
                department=clerk.get("department", ""),
                contact=clerk.get("contact", ""),
                active_request_count=workload,
            )
        )

    # Sort by workload ascending (lowest workload first)
    candidates.sort(key=lambda c: c.active_request_count)
    logger.info("Eligible clerks (excluding %s): %d found", list(exclude), len(candidates))
    return candidates


async def get_clerk_workload(clerk_id: int) -> int:
    """
    Returns the number of active (IN_PROGRESS) requests assigned to a clerk.
    Approximated from GET /api/clerks/{id}/requests — count of results.
    """
    backend = get_backend_client()
    try:
        requests = await backend.get_clerk_requests(clerk_id)
        # Count only active requests (not completed)
        active = [r for r in requests if r.get("status") not in ("COMPLETED", "CANCELLED")]
        return len(active)
    except Exception as e:
        logger.warning("get_clerk_workload(%d) failed: %s — defaulting to 0", clerk_id, e)
        return 0


async def get_clerk_availability(clerk_id: int) -> dict:
    """
    Returns availability info for a clerk.
    Currently approximated from workload — a future sprint can add a
    dedicated backend endpoint for calendar availability.
    """
    workload = await get_clerk_workload(clerk_id)
    return {
        "clerk_id": clerk_id,
        "active_request_count": workload,
        "is_available": workload < 10,  # simple heuristic
    }


def create_assignment_proposal(
    request_id: int,
    clerk_id: int,
    reason: str,
) -> dict:
    """
    Creates a local assignment proposal record.
    This is NOT an actual assignment — it is a recommendation for admin review.
    The backend performs the real assignment only after admin approval.
    """
    proposal = {
        "request_id": request_id,
        "proposed_clerk_id": clerk_id,
        "reason": reason,
        "status": "PENDING_ADMIN_APPROVAL",
    }
    logger.info(
        "Assignment proposal created: request=%d clerk=%d",
        request_id, clerk_id,
    )
    return proposal
