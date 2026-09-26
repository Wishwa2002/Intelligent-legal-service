"""
app/api/routes/scheduling_routes.py

FastAPI routes for the Lawyer Appointment & Consultation Scheduling Agent.
Matches endpoints called by the mobile client and ASP.NET Core backend.
"""

import logging
from fastapi import APIRouter, HTTPException

from app.graph.scheduling_workflow import (
    create_scheduling_session,
    get_scheduling_state,
    process_scheduling_message,
)
from app.schemas.scheduling import (
    CreateSchedulingSessionRequest,
    CreateSchedulingSessionResponse,
    SendSchedulingMessageRequest,
    SendSchedulingMessageResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/agent/scheduling", tags=["Scheduling Agent"])


def _extract_latest_agent_message(state: dict) -> tuple[str, list[str], str | None, list[dict]]:
    messages = state.get("messages", [])
    content = "How can I assist with your legal appointment today?"
    actions = []
    action_type = None
    cards = []

    for m in reversed(messages):
        if m.get("role") == "agent":
            content = m.get("content", content)
            actions = m.get("action_options", [])
            action_type = m.get("action_type")
            cards = m.get("cards", [])
            break

    return content, actions, action_type, cards


@router.post("/session", response_model=CreateSchedulingSessionResponse)
async def init_scheduling_session(req: CreateSchedulingSessionRequest):
    """
    Initialize a stateful scheduling agent session.
    """
    session_id, state = create_scheduling_session(
        customer_id=req.customer_id,
        client_name=req.client_name,
        user_role=req.user_role,
    )

    # Run first node to produce greeting and practice category action chips
    updated = await process_scheduling_message(session_id, "")
    msg, actions, _, _ = _extract_latest_agent_message(updated)

    return CreateSchedulingSessionResponse(
        session_id=session_id,
        customer_id=req.customer_id,
        status="ACTIVE",
        message=msg,
        phase=updated.get("phase"),
        action_options=actions,
        messages=updated.get("messages", []),
    )


@router.post("/{session_id}/message", response_model=SendSchedulingMessageResponse)
async def send_scheduling_message(session_id: str, req: SendSchedulingMessageRequest):
    """
    Send a message or slot/lawyer selection to the scheduling agent workflow.
    """
    state = get_scheduling_state(session_id)
    if state is None:
        session_id, state = create_scheduling_session(session_id=session_id)

    updated = await process_scheduling_message(
        session_id=session_id,
        message=req.message,
        selected_lawyer_id=req.selected_lawyer_id,
        selected_slot_id=req.selected_slot_id,
        selected_slot_time=req.selected_slot_time,
        consultation_type=req.consultation_type,
    )

    msg, actions, action_type, cards = _extract_latest_agent_message(updated)

    return SendSchedulingMessageResponse(
        session_id=session_id,
        phase=updated.get("phase", "DISCOVERY"),
        message=msg,
        action_options=actions,
        action_type=action_type,
        cards=cards,
        confirmed_booking=updated.get("confirmed_booking"),
        messages=updated.get("messages", []),
    )


@router.get("/{session_id}/status")
async def get_scheduling_status(session_id: str):
    """
    Get the current state and phase of a scheduling session.
    """
    state = get_scheduling_state(session_id)
    if state is None:
        raise HTTPException(status_code=404, detail=f"Scheduling session '{session_id}' not found.")
    return state
