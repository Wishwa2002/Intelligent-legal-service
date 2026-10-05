"""
app/tools/scheduling_tools.py

Tool functions for Lawyer Appointments and Consultation Scheduling.
All backend interactions go through BackendClient.
"""

import logging
from typing import Any
from app.services.backend_client import get_backend_client

logger = logging.getLogger(__name__)

# The 5 canonical legal practice categories
LEGAL_PRACTICE_CATEGORIES = [
    "Corporate & Commercial Law",
    "Criminal Law",
    "Real Estate & Property Law",
    "Labour & Employment Law",
    "Tax Law",
]


async def get_lawyers_for_category(
    category: str | None = None,
    min_experience: int = 0,
) -> list[dict[str, Any]]:
    """
    Fetch lawyers matching the specified legal practice category.
    Enriches each lawyer record with active appointment workload.
    """
    backend = get_backend_client()
    try:
        raw_lawyers = await backend.get_lawyers(specialization=category)
    except Exception as e:
        logger.error("Failed to fetch lawyers for category '%s': %s", category, e)
        return []

    lawyers: list[dict[str, Any]] = []
    for l in raw_lawyers:
        lawyer_id = str(l.get("lawyerId") or l.get("id", ""))
        exp = int(l.get("experience") or 0)
        if exp < min_experience:
            continue

        # Extract specializations
        spec_list = []
        for s in l.get("specializations", []):
            name = s.get("name") if isinstance(s, dict) else str(s)
            if name:
                spec_list.append(name)

        # Get active appointments to calculate workload
        active_count = 0
        try:
            apts = await backend.get_appointments(lawyer_id=lawyer_id, status="Requested")
            active_count = len(apts) if isinstance(apts, list) else 0
        except Exception:
            pass

        lawyers.append({
            "lawyer_id": lawyer_id,
            "name": l.get("name") or "Attorney",
            "email": l.get("email", ""),
            "phone_number": l.get("phoneNumber", ""),
            "qualification": l.get("qualification", "Attorney-at-Law"),
            "experience": exp,
            "license_number": l.get("licenseNumber", ""),
            "profile_description": l.get("profileDescription", ""),
            "specializations": spec_list,
            "active_consultations": active_count,
            "status": l.get("status", "Active"),
        })

    # Sort by active workload ascending, then experience descending
    lawyers.sort(key=lambda x: (x["active_consultations"], -x["experience"]))
    logger.info("Found %d lawyers for category '%s'", len(lawyers), category)
    return lawyers


async def get_available_slots_for_lawyer(
    lawyer_id: str,
    date_str: str,
) -> list[dict[str, Any]]:
    """
    Fetch all 30-minute unbooked availability slots for a lawyer on a given date (YYYY-MM-DD).
    """
    backend = get_backend_client()
    try:
        slots = await backend.get_available_slots(lawyer_id=lawyer_id, date=date_str)
        if not isinstance(slots, list):
            return []

        result = []
        for s in slots:
            is_booked = bool(s.get("isBooked", False))
            if is_booked:
                continue

            slot_id = str(s.get("slotId") or s.get("id", ""))
            start_time = str(s.get("startTime", ""))[:5]
            end_time = str(s.get("endTime", ""))[:5]

            # Format 12-hour display
            formatted = f"{start_time} - {end_time}"
            try:
                h, m = map(int, start_time.split(":")[:2])
                ampm = "AM" if h < 12 else "PM"
                h12 = h if h <= 12 else h - 12
                h12 = 12 if h12 == 0 else h12
                formatted = f"{h12}:{m:02d} {ampm}"
            except Exception:
                pass

            result.append({
                "slot_id": slot_id,
                "date": date_str,
                "start_time": start_time,
                "end_time": end_time,
                "formatted_time": formatted,
                "duration_minutes": 30,
            })
        return result
    except Exception as e:
        logger.error("Failed to fetch slots for lawyer %s on %s: %s", lawyer_id, date_str, e)
        return []


async def book_appointment_slot(
    lawyer_id: str,
    customer_id: str,
    slot_id: str,
    consultation_type: str = "Meeting with a Lawyer",
    description: str | None = None,
    notes: str | None = None,
    category: str | None = None,
) -> dict[str, Any]:
    """
    Persist the confirmed appointment booking in the ASP.NET Core backend.
    """
    backend = get_backend_client()
    return await backend.book_appointment(
        lawyer_id=lawyer_id,
        customer_id=customer_id,
        slot_id=slot_id,
        consultation_type=consultation_type,
        description=description,
        notes=notes,
        legal_service_category=category,
    )


async def get_appointments_for_user(
    lawyer_id: str | None = None,
    customer_id: str | None = None,
    lawyer_email: str | None = None,
    status: str | None = None,
    date: str | None = None,
) -> list[dict[str, Any]]:
    """
    Fetch appointments for a lawyer or customer.
    """
    backend = get_backend_client()
    try:
        return await backend.get_appointments(
            lawyer_id=lawyer_id,
            customer_id=customer_id,
            status=status,
            date=date,
            lawyer_email=lawyer_email,
        )
    except Exception as e:
        logger.error("Failed to fetch appointments: %s", e)
        return []


async def reschedule_appointment_slot(
    appointment_id: str,
    new_slot_id: str,
    reason: str | None = None,
) -> dict[str, Any]:
    """
    Reschedule an existing appointment to a new slot.
    """
    backend = get_backend_client()
    return await backend.reschedule_appointment(
        appointment_id=appointment_id,
        new_slot_id=new_slot_id,
        reason=reason,
    )


async def cancel_appointment_slot(
    appointment_id: str,
    reason: str | None = None,
) -> dict[str, Any]:
    """
    Cancel an existing appointment.
    """
    backend = get_backend_client()
    return await backend.cancel_appointment(
        appointment_id=appointment_id,
        reason=reason,
    )
