"""
app/graph/scheduling_state.py

SchedulingAgentState — State definition for the Lawyer Appointment & Consultation Scheduling Agent.
Serialized to JSON for durable session persistence.
"""

from __future__ import annotations
from typing import TypedDict, Any
from datetime import datetime, timezone


class SchedulingAgentState(TypedDict):
    """
    Complete state representation for a lawyer scheduling workflow.
    """
    # ---- Identity & Session ----
    session_id: str
    customer_id: str
    client_name: str | None
    user_role: str  # "Client" | "Lawyer"

    # ---- Phase & Intent ----
    # Phases: DISCOVERY -> LAWYER_MATCHING -> SLOT_SELECTION -> CONFIRMATION_PENDING -> BOOKED
    # Other phases: RESCHEDULING | VIEW_SCHEDULE | HUMAN_ESCALATION
    phase: str
    intent: str

    # ---- Problem Details & Classification ----
    # Must be one of the 5 canonical practice categories:
    # 1. Corporate & Commercial Law
    # 2. Criminal Law
    # 3. Real Estate & Property Law
    # 4. Labour & Employment Law
    # 5. Tax Law
    legal_category: str | None
    issue_summary: str | None
    intake_notes: str | None

    # ---- Consultation Preferences ----
    # "Phone Consultation" or "Meeting with a Lawyer"
    consultation_type: str
    target_date: str | None  # YYYY-MM-DD

    # ---- Lawyer Selection ----
    selected_lawyer_id: str | None
    selected_lawyer_name: str | None
    matched_lawyers: list[dict[str, Any]]

    # ---- Slot Selection ----
    # 30-minute availability slots
    selected_slot_id: str | None
    selected_slot_time: str | None
    available_slots: list[dict[str, Any]]

    # ---- Booking Outcome ----
    appointment_id: str | None
    confirmed_booking: dict[str, Any] | None

    # ---- Rescheduling & History ----
    reschedule_target_appointment_id: str | None

    # ---- Conversation & Safety ----
    messages: list[dict[str, Any]]
    audit_log: list[dict[str, Any]]
    iteration_count: int


def initial_scheduling_state(
    session_id: str,
    customer_id: str = "guest",
    client_name: str | None = None,
    user_role: str = "Client",
) -> SchedulingAgentState:
    """Creates a blank initial state for a new scheduling session."""
    return {
        "session_id": session_id,
        "customer_id": customer_id,
        "client_name": client_name,
        "user_role": user_role,
        "phase": "DISCOVERY",
        "intent": "BOOK_APPOINTMENT",
        "legal_category": None,
        "issue_summary": None,
        "intake_notes": None,
        "consultation_type": "Meeting with a Lawyer",
        "target_date": None,
        "selected_lawyer_id": None,
        "selected_lawyer_name": None,
        "matched_lawyers": [],
        "selected_slot_id": None,
        "selected_slot_time": None,
        "available_slots": [],
        "appointment_id": None,
        "confirmed_booking": None,
        "reschedule_target_appointment_id": None,
        "messages": [],
        "audit_log": [
            {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "event": "SESSION_INITIALIZED",
                "customer_id": customer_id,
            }
        ],
        "iteration_count": 0,
    }
