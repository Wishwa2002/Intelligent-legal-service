"""
app/tools/notification_tools.py

Tool functions for client and clerk notifications.
"""

import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


def notify_client(state: dict, message: str, phase: str) -> dict:
    """
    Appends a message to state.messages (the client sees these in the chat).
    Also updates the current phase.
    """
    state["messages"].append({
        "role": "agent",
        "content": message,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })
    state["phase"] = phase
    logger.info("Client notified — phase=%s message_len=%d", phase, len(message))
    return state


async def notify_clerk(clerk_id: int, request_id: int, message: str) -> bool:
    """
    Placeholder for clerk notification.
    In a future sprint, this will call a backend webhook or push notification endpoint.
    Currently logs the notification intent.
    """
    logger.info(
        "CLERK NOTIFICATION (stub): clerk_id=%d request_id=%d message=%r",
        clerk_id, request_id, message[:100],
    )
    return True
