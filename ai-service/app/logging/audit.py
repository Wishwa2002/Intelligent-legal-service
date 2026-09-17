"""
app/logging/audit.py

Structured audit log writer module.
Emits structured log entries that can be picked up by log aggregators in production.
"""

import json
import logging
from datetime import datetime, timezone

logger = logging.getLogger("audit")


def write_audit_entry(entry: dict) -> None:
    """
    Emit a structured audit log entry.
    Rules: no document content, no secrets, always include timestamp + event.
    """
    safe_entry = {
        "timestamp": entry.get("timestamp", datetime.now(timezone.utc).isoformat()),
        "session_id": entry.get("session_id"),
        "workflow_id": entry.get("workflow_id"),
        "request_id": entry.get("request_id"),
        "event": entry.get("event"),
        "doc_type": entry.get("doc_type"),
        "decision": entry.get("decision"),
        "reason": str(entry.get("reason", ""))[:200],  # truncate long reasons
    }
    logger.info("AUDIT: %s", json.dumps(safe_entry))
