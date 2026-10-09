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
    Fetches available 30-minute slots across candidate lawyers, applies time window filtering,
    and returns ranked multi-option recommendations (Primary Mode + Fallback Mode).
    """
    state = dict(state)
    matched = state.get("matched_lawyers") or []
    top_lawyer_id = state.get("selected_lawyer_id")
    top_lawyer_name = state.get("selected_lawyer_name") or "Attorney"

    # Build lawyer candidate pool
    candidate_lawyers = []
    if matched:
        candidate_lawyers = list(matched)
    elif top_lawyer_id:
        candidate_lawyers = [{"lawyer_id": top_lawyer_id, "name": top_lawyer_name, "match_score": 95}]

    if not candidate_lawyers:
        state["phase"] = "LAWYER_MATCHING"
        return state

    # Ensure target_date is set (defaults to tomorrow if None)
    target_date = state.get("target_date")
    today = datetime.now(timezone.utc).date()
    if not target_date:
        target_date = (today + timedelta(days=1)).isoformat()
        state["target_date"] = target_date

    tw_start = state.get("time_window_start")
    tw_end = state.get("time_window_end")
    pref_mode = state.get("consultation_type") or "Phone Consultation"
    fallback_mode = state.get("fallback_consultation_type") or (
        "Meeting with a Lawyer" if pref_mode == "Phone Consultation" else "Phone Consultation"
    )

    # Collect available slots for candidate lawyers
    all_options = []
    used_fallback_window = False

    for idx, lawyer in enumerate(candidate_lawyers[:3]):
        l_id = lawyer["lawyer_id"]
        l_name = lawyer.get("name") or f"Lawyer {chr(65+idx)}"
        l_score = lawyer.get("match_score", 90 - (idx * 5))

        slots = await get_available_slots_for_lawyer(l_id, target_date)

        # Filter by time window if specified e.g. 17:00 to 20:00
        window_slots = []
        if tw_start and tw_end:
            for s in slots:
                if tw_start <= s["start_time"] < tw_end:
                    window_slots.append(s)

        # Strict window slots if available; otherwise retain slots for daytime fallback
        target_slots = window_slots if (tw_start and tw_end and window_slots) else slots
        if tw_start and tw_end and not window_slots and slots:
            used_fallback_window = True

        lawyer_modes = lawyer.get("supported_modes") or [pref_mode, fallback_mode]

        for s in target_slots[:2]:
            # Add Primary Mode option if supported
            if pref_mode in lawyer_modes:
                all_options.append({
                    "lawyer_id": l_id,
                    "lawyer_name": l_name,
                    "match_score": l_score,
                    "is_best_match": (idx == 0),
                    "date": target_date,
                    "formatted_time": s["formatted_time"],
                    "start_time": s["start_time"],
                    "end_time": s["end_time"],
                    "slot_id": s["slot_id"],
                    "mode": pref_mode,
                    "mode_priority": 1,
                })

            # Add Fallback Mode option if lawyer only supports fallback or if fallback requested
            if fallback_mode in lawyer_modes and (pref_mode not in lawyer_modes or state.get("fallback_consultation_type")):
                all_options.append({
                    "lawyer_id": l_id,
                    "lawyer_name": l_name,
                    "match_score": l_score,
                    "is_best_match": False,
                    "date": target_date,
                    "formatted_time": s["formatted_time"],
                    "start_time": s["start_time"],
                    "end_time": s["end_time"],
                    "slot_id": s["slot_id"],
                    "mode": fallback_mode,
                    "mode_priority": 2 if pref_mode in lawyer_modes else 1.5,
                })

    # Deduplicate and sort options: Primary mode first, then by match score descending
    all_options.sort(key=lambda x: (x["mode_priority"], -x["match_score"], x["start_time"]))

    # Pick top distinct best options (aim for up to 3 distinct lawyer/mode combinations)
    seen_combos = set()
    best_options = []
    for opt in all_options:
        key = (opt["lawyer_id"], opt["mode"], opt["start_time"])
        if key not in seen_combos:
            seen_combos.add(key)
            best_options.append(opt)
        if len(best_options) >= 4:
            break

    state["available_slots"] = best_options

    if not best_options:
        state["messages"].append({
            "role": "agent",
            "content": (
                f"We currently have no available consultation slots matching your requested date ({target_date}) "
                f"or time window. Would you like to check upcoming days or adjust your preferences?"
            ),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "action_options": ["Check Next Week", "Choose Another Attorney", "View All Open Slots"],
        })
        state["phase"] = "DISCOVERY"
        return state

    # Format Markdown message
    category_label = state.get("legal_category") or "Legal"
    if used_fallback_window:
        window_notice = f"*Note: No open slots in requested window ({tw_start}–{tw_end}). Displaying closest available slots for {category_label} on {target_date}:*\n"
    elif tw_start and tw_end:
        window_notice = f"*Filtered for {category_label} between {tw_start} and {tw_end}*\n"
    else:
        window_notice = f"*Filtered for {category_label}*\n"

    msg_lines = [
        f"### ⚖️ Best Consultation Options for {target_date}",
        window_notice,
    ]

    slot_chips = []
    cards = []
    for i, opt in enumerate(best_options[:3], 1):
        badge = " ★ Best match" if opt["is_best_match"] else ""
        msg_lines.append(
            f"**{i}. {opt['lawyer_name']}**{badge}\n"
            f"   • **Time:** {opt['formatted_time']}\n"
            f"   • **Mode:** {opt['mode']}\n"
        )
        chip = f"Option {i}: {opt['lawyer_name']} ({opt['formatted_time']} {opt['mode']})"
        slot_chips.append(chip)
        cards.append({
            "type": "slot_card",
            "option_index": i,
            "lawyer_id": opt["lawyer_id"],
            "lawyer_name": opt["lawyer_name"],
            "slot_id": opt["slot_id"],
            "formatted_time": opt["formatted_time"],
            "date": opt["date"],
            "mode": opt["mode"],
            "is_best_match": opt["is_best_match"],
        })

    slot_chips.append("📅 Pick Another Date")
    msg_lines.append("Please select your preferred option to proceed with booking.")

    state["messages"].append({
        "role": "agent",
        "content": "\n".join(msg_lines),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "action_options": slot_chips,
        "action_type": "SLOT_SELECTION",
        "cards": cards,
    })

    # Keep selected_slot_id None until user explicitly chooses an option chip
    state["selected_slot_id"] = None
    state["selected_slot_time"] = None
    state["phase"] = "SLOT_SELECTION"
    return state

