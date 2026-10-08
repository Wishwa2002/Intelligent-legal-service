import logging
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.agents.coordinator import (
    build_coordinator_graph,
    final_action_node,
    audit_node,
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/agent/coordinator",
    tags=["Planning Coordinator Agent"],
)

# Compile the LangGraph once when the module loads.
coordinator_graph = build_coordinator_graph()

# ---------------------------------------------------------------------------
# In-memory workflow state store.
# Keyed by service_request_id. Persists across the two HTTP calls
# (/plan → graph pauses for approval → /approve → final_action + audit).
# A future sprint can swap this for Redis or the backend DB.
# ---------------------------------------------------------------------------
_workflow_store: dict[str, dict] = {}


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class CoordinatorPlanRequest(BaseModel):
    service_request_id: str = Field(..., min_length=1)
    title: str = Field(..., min_length=1)
    description: str = Field(..., min_length=1)
    request_type: str = ""
    priority: str = "Normal"


class ApprovalRequest(BaseModel):
    decision: Literal["Approved", "Rejected"]
    reviewed_by: str = Field(
        default="Admin",
        description="Name or ID of the admin who reviewed the workflow.",
    )
    notes: str = Field(
        default="",
        description="Optional admin notes attached to the approval decision.",
    )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/plan")
async def create_coordinator_plan(
    request: CoordinatorPlanRequest,
):
    """
    Execute the Planning/Coordinator Agent.

    The graph runs through:
      planner → [LawyerRecommendationAgent] → [SchedulingAgent]
              → [DocumentationClerkAgent] → validate → approval

    The workflow pauses at the approval node (status: AwaitingApproval)
    and the full state is stored in memory so the admin can review it.
    Call POST /approve to continue after the admin decision.
    """
    initial_state = {
        "service_request_id": request.service_request_id,
        "title": request.title,
        "description": request.description,
        "request_type": request.request_type,
        "priority": request.priority,
        "workflow_status": "Planning",
        "retry_count": 0,
        "trace": [],
    }

    try:
        result = await coordinator_graph.ainvoke(initial_state)

        # Persist state so the /approve endpoint can continue it.
        _workflow_store[request.service_request_id] = dict(result)

        logger.info(
            "Coordinator plan completed for service_request_id=%s "
            "workflow_status=%s validation_passed=%s",
            request.service_request_id,
            result.get("workflow_status"),
            result.get("validation_passed"),
        )

        return {
            "success": True,
            "workflow_status": result.get(
                "workflow_status", "AwaitingApproval"
            ),
            "workflow": result,
        }

    except Exception as exc:
        logger.exception(
            "Coordinator plan failed for service_request_id=%s",
            request.service_request_id,
        )
        raise HTTPException(
            status_code=500,
            detail=f"Coordinator workflow failed: {str(exc)}",
        )


@router.post("/{service_request_id}/approve")
async def approve_coordinator_workflow(
    service_request_id: str,
    approval: ApprovalRequest,
):
    """
    Submit the admin approval decision and complete the workflow.

    Decision = "Approved":
      → final_action_node  (summarises actions taken by each agent)
      → audit_node         (builds the audit trail, marks Completed)

    Decision = "Rejected":
      → workflow_status set to "Rejected"
      → final_outcome records the rejection reason

    The completed/rejected state is saved back to the store and returned.
    """
    state = _workflow_store.get(service_request_id)

    if state is None:
        raise HTTPException(
            status_code=404,
            detail=(
                f"No pending workflow found for "
                f"service_request_id='{service_request_id}'. "
                "Run POST /plan first."
            ),
        )

    current_status = state.get("workflow_status")
    if current_status not in ("AwaitingApproval", None):
        raise HTTPException(
            status_code=409,
            detail=(
                f"Workflow is already in status '{current_status}' "
                "and cannot be approved again."
            ),
        )

    state = dict(state)
    state["approval_status"] = approval.decision
    state.setdefault("trace", []).append({
        "event": "ADMIN_DECISION_RECEIVED",
        "decision": approval.decision,
        "reviewed_by": approval.reviewed_by,
        "notes": approval.notes,
    })

    try:
        if approval.decision == "Approved":
            # Run the post-approval pipeline
            state = await final_action_node(state)
            state = await audit_node(state)

        else:
            # Rejected — record outcome and mark done
            state["workflow_status"] = "Rejected"
            state["final_outcome"] = {
                "status": "Rejected",
                "reason": approval.notes or "Rejected by admin.",
                "reviewed_by": approval.reviewed_by,
            }
            state.setdefault("trace", []).append({
                "event": "WORKFLOW_REJECTED",
                "reviewed_by": approval.reviewed_by,
            })

        # Persist updated state
        _workflow_store[service_request_id] = state

        logger.info(
            "Coordinator workflow %s for service_request_id=%s by %s",
            approval.decision,
            service_request_id,
            approval.reviewed_by,
        )

        return {
            "success": True,
            "workflow_status": state.get("workflow_status"),
            "workflow": state,
        }

    except Exception as exc:
        logger.exception(
            "Post-approval processing failed for service_request_id=%s",
            service_request_id,
        )
        raise HTTPException(
            status_code=500,
            detail=f"Post-approval processing failed: {str(exc)}",
        )


@router.get("/{service_request_id}/status")
async def get_coordinator_status(service_request_id: str):
    """
    Retrieve the current workflow state for a given service request.

    Returns the full workflow dict so the frontend can display:
    - plan steps and their statuses
    - lawyer recommendations
    - scheduling session details
    - document requirements
    - validation results
    - execution summary and audit log (after approval)
    """
    state = _workflow_store.get(service_request_id)

    if state is None:
        raise HTTPException(
            status_code=404,
            detail=(
                f"No workflow found for "
                f"service_request_id='{service_request_id}'."
            ),
        )

    return {
        "success": True,
        "workflow_status": state.get("workflow_status"),
        "workflow": state,
    }