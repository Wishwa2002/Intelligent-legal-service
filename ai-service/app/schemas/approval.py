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
    decision: str           # APPROVED | REJECTED
    approved_by: int
    comment: str
    clerk_id: int | None = None   # set when decision=APPROVED
