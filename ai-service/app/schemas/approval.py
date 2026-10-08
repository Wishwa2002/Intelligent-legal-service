"""
app/schemas/approval.py

Pydantic models for admin approval/rejection payloads.
"""

from __future__ import annotations
from pydantic import BaseModel, Field


class AdminDecisionPayload(BaseModel):
    """
    Payload received from the backend when an admin makes an approval decision.
    Maps to the body sent by AgentIntegrationService.cs SubmitApprovalDecisionAsync.
    """

    decision: str = Field(
        description="'APPROVED' or 'REJECTED' (uppercased by backend before sending)."
    )
    approved_by: int = Field(description="Admin user ID who made the decision.")
    comment: str = Field(default="", description="Optional admin comment/reason.")


class ApprovalDecision(BaseModel):
    """Internal representation of an admin decision stored in workflow state."""

    workflow_id: str
    decision: str           # APPROVED | REJECTED | MODIFIED
    approved_by: int
    comment: str
    clerk_id: int | None = None   # set when decision=APPROVED or MODIFIED
    assignment_source: str = "AI_RECOMMENDATION"


class ResumeAgentRequest(BaseModel):
    """
    Payload for POST /agent/resume endpoint.
    """
    thread_id: str = Field(..., description="Case ID or session thread ID to resume")
    decision: str = Field(..., description="'approve', 'modify', or 'reject'")
    selected_clerk_id: str | None = Field(default=None, description="Clerk ID chosen if modifying or approving")
    feedback: str = Field(default="", description="Manager feedback or rationale")
    user_id: int | None = Field(default=1, description="Authorized user ID making decision")


class HumanApprovalGatePayload(BaseModel):
    """
    Payload presented at the human gate before clerk assignment.
    """
    type: str = "CLERK_ASSIGNMENT_APPROVAL"
    case_id: str
    recommendation: dict = Field(default_factory=dict)
    requires_human_decision: bool = True
    available_actions: list[str] = Field(default_factory=lambda: ["APPROVE", "MODIFY", "REJECT"])

