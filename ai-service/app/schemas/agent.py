"""
app/schemas/agent.py

Pydantic request/response models for the FastAPI routes.
These must match the DTOs in the ASP.NET backend's AgentChatDtos.cs and AgentDtos.cs
so the existing AgentIntegrationService.cs works without modification.
"""

from __future__ import annotations
from typing import Any, Literal
from pydantic import BaseModel, Field


# ============================================================
# Chat Session — matches CreateAgentChatSessionResponse DTO
# ============================================================

class CreateChatSessionRequest(BaseModel):
    customer_id: str = Field(description="Customer GUID from the backend.")


class CreateChatSessionResponse(BaseModel):
    session_id: str
    customer_id: str
    status: str
    message: str | None = None
    phase: str | None = None
    action_options: list[str] = Field(default_factory=list)
    messages: list[dict] = Field(default_factory=list)


# ============================================================
# Chat Message — matches SendAgentChatMessageRequest/Response DTOs
# ============================================================

class SendChatMessageRequest(BaseModel):
    message: str = Field(default="")
    uploaded_file_id: str | None = Field(
        default=None,
        description="Backend file ID (as string/GUID) if a document was just uploaded."
    )
    uploaded_file_expected_type: str | None = Field(
        default=None,
        description="The document type the workflow currently expects for this upload."
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "message": "Hello, I need help with a legal service."
            }
        }
    }


class SendChatMessageResponse(BaseModel):
    message: str
    phase: str
    awaiting_input: bool = True
    awaiting_input_type: str = "TEXT"       # TEXT | FILE
    request_id: str | None = None
    missing_documents: list[str] = Field(default_factory=list)
    document_analysis: Any | None = None    # DocumentAnalysis if a doc was just processed
    workflow_id: str | None = None
    client_name: str | None = None
    action_options: list[str] = Field(default_factory=list)
    messages: list[dict] = Field(default_factory=list)


# ============================================================
# Chat Session Status — matches AgentChatSessionStatusResponse DTO
# ============================================================

class ChatSessionStatusResponse(BaseModel):
    session_id: str
    customer_id: str
    phase: str
    request_id: str | None = None
    workflow_id: str | None = None
    client_name: str | None = None
    service_name: str | None = None
    required_documents: list[str] = Field(default_factory=list)
    provided_documents: list[str] = Field(default_factory=list)
    missing_documents: list[str] = Field(default_factory=list)
    approval_status: str | None = None
    recommended_clerk_id: int | None = None
    recommended_clerk_name: str | None = None
    last_activity: str | None = None
    messages: list[dict] = Field(default_factory=list)


# ============================================================
# Documentation Analyze — matches TriggerAgentAnalysisRequest DTO
# ============================================================

class TriggerAnalysisRequest(BaseModel):
    request_id: int
    customer_id: int | str
    objective: str
    document_ids: list[int] = Field(default_factory=list)


class AgentAnalysisResponse(BaseModel):
    status: str
    workflow_id: str | None = None
    message: str | None = None
    phase: str | None = None
    recommendation: dict | None = None
    execution_summary: dict | None = None
    errors: list[str] = Field(default_factory=list)


# ============================================================
# Admin Approval — matches SubmitAgentApprovalRequest DTO
# ============================================================

class SubmitApprovalRequest(BaseModel):
    decision: str   # APPROVED | REJECTED | APPROVE | REJECT
    approved_by: int | str
    comment: str = ""


class AgentApprovalResponse(BaseModel):
    workflow_id: str
    status: str
    message: str | None = None
    errors: list[str] = Field(default_factory=list)


# ============================================================
# Routing Decision (internal — never returned to clients)
# ============================================================

class RouteDecision(BaseModel):
    """
    Deterministic routing decision produced by Python routing logic.
    Gemini NEVER produces this — routing is always Python code.
    """

    next_agent: Literal[
        "document_analysis",
        "document_validation",
        "clerk_recommendation",
        "request_documents",
        "admin_approval",
        "replan",
        "complete",
        "human_review",
    ]
    reason: str
    task: str
