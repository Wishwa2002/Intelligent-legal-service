"""
app/tools/audit_tools.py
app/logging/audit.py

Structured audit log utilities.
Every accept/reject decision, state change, and clerk recommendation
is logged here so the workflow is fully auditable and explainable.

Rules:
- Never log full document content (privacy).
- Never log API keys or secrets.
- Always include: timestamp, session_id, workflow_id, event, reason, decision.
"""

import json
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


def record_agent_event(
    state: dict,
    event_type: str,
    details: str,
    decision: str,
    doc_type: str | None = None,
) -> None:
    """
    Appends a structured audit entry to state['audit_log'].
    Called after every significant agent action.
    """
    entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "session_id": state.get("session_id"),
        "workflow_id": state.get("workflow_id"),
        "request_id": state.get("request_id"),
        "event": event_type,
        "doc_type": doc_type,
        "details": details,
        "decision": decision,
    }
    state["audit_log"].append(entry)

    # Also emit to Python logging (picked up by log aggregators in production)
    logger.info(
        "AUDIT | event=%s doc=%s decision=%s details=%s",
        event_type, doc_type, decision, details[:120],
    )


def record_workflow_event(
    workflow_id: str,
    event_type: str,
    details: str,
) -> None:
    """
    Emits a workflow-level audit event to Python logging.
    (No state access needed — called from route handlers.)
    """
    logger.info(
        "WORKFLOW_AUDIT | workflow=%s event=%s details=%s",
        workflow_id, event_type, details[:120],
    )


def format_audit_log(audit_log: list[dict]) -> str:
    """Returns a human-readable formatted audit log string."""
    lines = []
    for entry in audit_log:
        ts = entry.get("timestamp", "")
        event = entry.get("event", "")
        doc = entry.get("doc_type", "")
        decision = entry.get("decision", "")
        details = entry.get("details", "")
        doc_str = f" [{doc}]" if doc else ""
        lines.append(f"[{ts}] {event}{doc_str} → {decision} | {details}")
    return "\n".join(lines)
