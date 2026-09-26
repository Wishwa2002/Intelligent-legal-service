"""
app/agents/scheduling/booking_executor.py

Node 4 & 5: HUMAN CONFIRMATION GATE & BOOKING EXECUTOR
Enforces human verification before committing any booking to the backend.
Calls the ASP.NET Core API to persist the consultation.
"""

import logging
from datetime import datetime, timezone

from app.graph.scheduling_state import SchedulingAgentState
from app.prompts.scheduling import INTAKE_BRIEF_PROMPT, SCHEDULING_SYSTEM_PROMPT
from app.services.gemini_service import get_gemini_service
from app.tools.scheduling_tools import book_appointment_slot

logger = logging.getLogger(__name__)


def _format_customer_guid(cust_id: object) -> str:
    """Format any customer ID (int, string, guest) into a valid 36-char GUID string."""
    if not cust_id:
        return "00000000-0000-0000-0000-000000000001"
    s = str(cust_id).strip()
    if s.lower() == "guest":
        return "00000000-0000-0000-0000-000000000001"
    if "-" in s and len(s) == 36:
        return s
    try:
        val = int(s)
        return f"00000000-0000-0000-0000-{val:012x}"
    except Exception:
        return "00000000-0000-0000-0000-000000000001"


async def prepare_confirmation_node(state: SchedulingAgentState) -> SchedulingAgentState:
    """
    Builds the booking summary and consultation brief for human confirmation.
    """
    state = dict(state)
    lawyer_name = state.get("selected_lawyer_name") or "Selected Attorney"
    date_str = state.get("target_date") or "Scheduled Date"
    slot_time = state.get("selected_slot_time") or "Selected 30-min Slot"
    mode = state.get("consultation_type") or "Meeting with a Lawyer"
    category = state.get("legal_category") or "General Law"
    client_name = state.get("client_name") or "Client"

    # Generate intake brief
    gemini = get_gemini_service()
    intake_brief = f"Consultation requested regarding {category}. Mode: {mode}."
    try:
        prompt = INTAKE_BRIEF_PROMPT.format(
            client_name=client_name,
            category=category,
            consultation_type=mode,
            slot_time=slot_time,
            date=date_str,
            user_message=state.get("issue_summary") or "Client requested consultation.",
        )
        brief_res = await gemini.call(prompt, system_instruction=SCHEDULING_SYSTEM_PROMPT)
        if brief_res and len(brief_res.strip()) > 15:
            intake_brief = brief_res.strip()
    except Exception as e:
        logger.warning("Could not generate intake brief: %s", e)

    state["intake_notes"] = intake_brief

    mode_icon = "📞" if mode == "Phone Consultation" else "🤝"

    summary_msg = (
        f"### 📋 Consultation Booking Summary\n\n"
        f"Please verify your consultation details before finalizing:\n\n"
        f"• **Attorney:** {lawyer_name}\n"
        f"• **Practice Category:** {category}\n"
        f"• **Date:** {date_str}\n"
        f"• **Time Slot:** {slot_time} *(30 minutes)*\n"
        f"• **Mode:** {mode_icon} **{mode}**\n\n"
        f"**Attorney Intake Brief:**\n"
        f"```\n{intake_brief}\n```\n\n"
        f"Tap **Confirm & Book Appointment** to reserve this slot on Attorney {lawyer_name}'s calendar."
    )

    state["messages"].append({
        "role": "agent",
        "content": summary_msg,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "action_options": ["✅ Confirm & Book Appointment", "🔄 Change Time Slot", "❌ Cancel"],
        "action_type": "BOOKING_CONFIRMATION",
    })

    return state


async def execute_booking_node(state: SchedulingAgentState) -> SchedulingAgentState:
    """
    Persists the appointment to the backend database.
    """
    state = dict(state)
    lawyer_id = state.get("selected_lawyer_id")
    slot_id = state.get("selected_slot_id")
    customer_id = _format_customer_guid(state.get("customer_id"))
    category = state.get("legal_category")
    mode = state.get("consultation_type") or "Meeting with a Lawyer"
    description = state.get("issue_summary") or "Consultation scheduled via AI Agent"
    notes = state.get("intake_notes") or ""

    if not lawyer_id or not slot_id:
        state["phase"] = "SLOT_SELECTION"
        state["messages"].append({
            "role": "agent",
            "content": "Please select a specific 30-minute time slot before confirming your booking.",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
        return state

    try:
        res = await book_appointment_slot(
            lawyer_id=lawyer_id,
            customer_id=customer_id,
            slot_id=slot_id,
            consultation_type=mode,
            description=description,
            notes=notes,
            category=category,
        )

        apt_id = str(res.get("appointmentId") or res.get("id", ""))
        state["appointment_id"] = apt_id
        state["confirmed_booking"] = res
        state["phase"] = "BOOKED"

        lawyer_name = state.get("selected_lawyer_name") or "Your Attorney"
        date_str = state.get("target_date")
        slot_time = state.get("selected_slot_time")

        confirmation_msg = (
            f"## 🎉 Appointment Successfully Booked!\n\n"
            f"Your **30-minute legal consultation** has been scheduled and added to **{lawyer_name}'s** schedule.\n\n"
            f"• **Appointment ID:** `{apt_id}`\n"
            f"• **Attorney:** {lawyer_name}\n"
            f"• **Date & Time:** {date_str} at {slot_time}\n"
            f"• **Mode:** {mode}\n"
            f"• **Status:** Confirmed / Requested\n\n"
            f"An intake brief has been delivered to Attorney {lawyer_name}. You can review or manage your consultation at any time under the **My Appointments** screen."
        )

        state["messages"].append({
            "role": "agent",
            "content": confirmation_msg,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "action_options": ["📅 View My Appointments", "➕ Schedule Another Consultation"],
            "action_type": "BOOKING_SUCCESS",
        })

        state["audit_log"].append({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "event": "APPOINTMENT_BOOKED",
            "appointment_id": apt_id,
            "lawyer_id": lawyer_id,
            "slot_id": slot_id,
        })

    except Exception as e:
        logger.error("Failed to execute appointment booking: %s", e)
        state["messages"].append({
            "role": "agent",
            "content": f"⚠️ We encountered an issue while locking in your booking: {e}. Please try another slot or contact administrative support.",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "action_options": ["🔄 Retry Slot Selection", "Choose Another Attorney"],
        })
        state["phase"] = "SLOT_SELECTION"

    return state
