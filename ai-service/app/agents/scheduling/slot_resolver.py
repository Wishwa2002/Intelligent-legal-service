"""
app/agents/scheduling/slot_resolver.py

Node 3: SLOT RESOLVER & AVAILABILITY
Fetches available 30-minute consultation slots for the chosen attorney and date,
handles alternatives when a chosen date has zero availability.
"""

import logging
from datetime import datetime, timedelta, timezone

from app.graph.scheduling_state import SchedulingAgentState
from app.tools.scheduling_tools import get_available_slots_for_lawyer

logger = logging.getLogger(__name__)


async def resolve_slots_node(state: SchedulingAgentState) -> SchedulingAgentState:
    """
    Fetches available 30-minute slots for the selected lawyer.
    """
    state = dict(state)
    lawyer_id = state.get("selected_lawyer_id")
    lawyer_name = state.get("selected_lawyer_name") or "the selected attorney"

    if not lawyer_id:
        state["phase"] = "LAWYER_MATCHING"
        return state

    # Ensure target_date is set (defaults to tomorrow if None)
    target_date = state.get("target_date")
    today = datetime.now(timezone.utc).date()
    if not target_date:
        target_date = (today + timedelta(days=1)).isoformat()
        state["target_date"] = target_date

    # Fetch slots for target_date
    slots = await get_available_slots_for_lawyer(lawyer_id, target_date)

    # If no slots on target_date, search next 3 business days for open slots
    active_date = target_date
    if not slots:
        logger.info("No slots on %s for lawyer %s. Checking upcoming days...", target_date, lawyer_id)
        for offset in range(1, 5):
            check_date = (today + timedelta(days=offset)).isoformat()
            if check_date == target_date:
                continue
            alt_slots = await get_available_slots_for_lawyer(lawyer_id, check_date)
            if alt_slots:
                slots = alt_slots
                active_date = check_date
                state["target_date"] = active_date
                break

    state["available_slots"] = slots

    if not slots:
        state["messages"].append({
            "role": "agent",
            "content": (
                f"Attorney **{lawyer_name}** currently has no available 30-minute consultation slots "
                f"for the selected dates. Would you like to check next week or switch to another attorney?"
            ),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "action_options": ["Check Next Week", "Choose Another Attorney", "Switch to Phone Consultation"],
        })
        state["phase"] = "DISCOVERY"
        return state

    # Format slot chips
    slot_options = [f"Slot: {s['formatted_time']}" for s in slots[:6]]
    slot_options.append("📅 Pick Another Date")

    state["messages"].append({
        "role": "agent",
        "content": (
            f"### ⏱ Available 30-Minute Consultation Slots\n\n"
            f"**Attorney:** {lawyer_name}\n"
            f"**Date:** {active_date}\n"
            f"**Mode:** {state.get('consultation_type', 'Meeting with a Lawyer')}\n"
            f"**Duration:** 30 minutes\n\n"
            f"Please tap an available time slot below to lock in your consultation:"
        ),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "action_options": slot_options,
        "action_type": "SLOT_SELECTION",
        "cards": [
            {
                "type": "slot_card",
                "slot_id": s["slot_id"],
                "formatted_time": s["formatted_time"],
                "start_time": s["start_time"],
                "end_time": s["end_time"],
                "date": s["date"],
            }
            for s in slots[:8]
        ],
    })

    state["phase"] = "CONFIRMATION_PENDING"
    return state
