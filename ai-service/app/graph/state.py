"""
app/graph/state.py

AgentState — the single source of workflow truth.

This TypedDict is persisted between every pause/resume cycle.
Every state transition must go through this dict — no hidden state anywhere.

Workflow phases:
  UNDERSTAND_REQUEST     → identifying the service the client wants
  WAITING_FOR_DOCUMENTS  → one or more documents still missing or pending re-upload
  ANALYZING              → a document is currently being analyzed
  DOCUMENTS_COMPLETE     → all required documents accepted
  CLERK_RECOMMENDATION   → generating a clerk recommendation for admin
  ADMIN_APPROVAL_PENDING → waiting for admin to approve/reject the clerk
  IN_PROCESS             → clerk assigned, request being processed
  COMPLETED              → workflow fully complete
  HUMAN_REVIEW           → automatic processing stopped, needs manual intervention
  ERROR                  → unexpected error; workflow cannot continue automatically
"""

from __future__ import annotations
from typing import TypedDict


class DocumentStatus(TypedDict):
    """Per-document tracking entry, keyed by doc_type in AgentState.document_statuses."""

    doc_type: str                  # e.g. "NIC", "Proof of Address"
    file_id: int | None            # backend file ID once uploaded
    status: str                    # "pending" | "analyzing" | "accepted" | "accepted_with_flag" | "rejected"
    retry_count: int               # how many times this doc has been re-attempted
    last_analysis: dict | None     # last DocumentAnalysis result (serialized to dict)
    rejection_reason: str | None   # reason sent to client on rejection


class AgentState(TypedDict):
    """
    Complete workflow state.
    Serialized to dict for persistence; reloaded on resume.
    """

    # ---- Identity ----
    session_id: str           # chat session ID (from POST /api/agent/chat/session)
    workflow_id: str          # durable workflow ID (same across all pause/resume cycles)
    request_id: int | None    # backend documentation request ID (set after creation)
    customer_id: str          # customer identifier
    service_id: int | None    # backend service ID
    service_name: str         # human-readable service name

    # ---- Phase ----
    phase: str                # current workflow phase (see module docstring for values)

    # ---- Document Tracking ----
    required_documents: list[str]                    # fetched from backend service config
    document_statuses: dict[str, DocumentStatus]     # keyed by doc_type

    # ---- Conversation ----
    messages: list[dict]      # [{role: "agent"|"client", content: str, timestamp: str}]

    # ---- Document Summary ----
    document_summary: dict | None    # DocumentSummaryReport (serialized) — set at DOCUMENTS_COMPLETE

    # ---- Clerk Recommendation ----
    recommended_clerk_id: int | None
    recommendation_reason: str | None
    excluded_clerk_ids: list[int]    # grows with each admin rejection, used in re-planning

    # ---- Admin Approval ----
    pending_approval_clerk_id: int | None
    last_admin_decision: str | None   # APPROVED | REJECTED

    # ---- Safety Limits ----
    iteration_count: int
    human_review_triggered: bool
    human_review_reason: str | None

    # ---- Audit Trail ----
    audit_log: list[dict]    # [{timestamp, event, doc_type?, reason, decision}]

    # ---- Conversational Context ----
    client_name: str | None
    pending_agent_question: str | None


def initial_state(session_id: str, customer_id: str, workflow_id: str) -> AgentState:
    """Returns a blank initial AgentState for a new session."""
    return AgentState(
        session_id=session_id,
        workflow_id=workflow_id,
        request_id=None,
        customer_id=customer_id,
        service_id=None,
        service_name="",
        phase="UNDERSTAND_REQUEST",
        required_documents=[],
        document_statuses={},
        messages=[],
        document_summary=None,
        recommended_clerk_id=None,
        recommendation_reason=None,
        excluded_clerk_ids=[],
        pending_approval_clerk_id=None,
        last_admin_decision=None,
        iteration_count=0,
        human_review_triggered=False,
        human_review_reason=None,
        audit_log=[],
        client_name=None,
        pending_agent_question=None,
    )
