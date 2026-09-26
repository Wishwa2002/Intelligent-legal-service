"""
app/graph/scheduling_workflow.py

LangGraph StateGraph workflow for Lawyer Appointment & Consultation Scheduling.
Handles session persistence to disk, state transitions, and node dispatching.
"""

import json
import logging
import uuid
from pathlib import Path
from typing import Any
from datetime import datetime, timezone

from langgraph.graph import StateGraph, END

from app.graph.scheduling_state import SchedulingAgentState, initial_scheduling_state
from app.agents.scheduling.classifier import classify_intent_node
from app.agents.scheduling.matchmaker import match_lawyers_node
from app.agents.scheduling.slot_resolver import resolve_slots_node
from app.agents.scheduling.booking_executor import (
    prepare_confirmation_node,
    execute_booking_node,
)
from app.tools.scheduling_tools import LEGAL_PRACTICE_CATEGORIES

logger = logging.getLogger(__name__)

# Disk persistence directory for scheduling sessions
_SCHEDULING_SESSIONS_DIR = Path(__file__).parent.parent.parent / "data" / "scheduling_sessions"
_SCHEDULING_SESSIONS_DIR.mkdir(parents=True, exist_ok=True)

_scheduling_state_store: dict[str, SchedulingAgentState] = {}


def get_scheduling_state(session_id: str) -> SchedulingAgentState | None:
    """Retrieve scheduling state from in-memory cache or disk JSON."""
    state = _scheduling_state_store.get(session_id)
    if state is None:
        file_path = _SCHEDULING_SESSIONS_DIR / f"{session_id}.json"
        if file_path.exists():
            try:
                state = json.loads(file_path.read_text(encoding="utf-8"))
                _scheduling_state_store[session_id] = state
                logger.info("Restored scheduling session '%s' from disk", session_id)
            except Exception as e:
                logger.warning("Failed to read scheduling session file: %s", e)
    return state


def save_scheduling_state(session_id: str, state: SchedulingAgentState) -> None:
    """Save state to cache and persist to disk."""
    _scheduling_state_store[session_id] = state
    try:
        file_path = _SCHEDULING_SESSIONS_DIR / f"{session_id}.json"
        file_path.write_text(json.dumps(state, indent=2, default=str), encoding="utf-8")
    except Exception as e:
        logger.warning("Failed to persist scheduling session '%s': %s", session_id, e)


def create_scheduling_session(
    customer_id: str = "guest",
    client_name: str | None = None,
    user_role: str = "Client",
    session_id: str | None = None,
) -> tuple[str, SchedulingAgentState]:
    """Create a new scheduling session and return (session_id, initial_state)."""
    session_id = session_id or str(uuid.uuid4())
    state = initial_scheduling_state(
        session_id=session_id,
        customer_id=customer_id,
        client_name=client_name,
        user_role=user_role,
    )
    save_scheduling_state(session_id, state)
    logger.info("Created scheduling session: %s (customer=%s)", session_id, customer_id)
    return session_id, state


def _build_scheduling_graph() -> Any:
    graph = StateGraph(SchedulingAgentState)

    # Add Nodes
    graph.add_node("classify_intent", classify_intent_node)
    graph.add_node("match_lawyers", match_lawyers_node)
    graph.add_node("resolve_slots", resolve_slots_node)
    graph.add_node("prepare_confirmation", prepare_confirmation_node)
    graph.add_node("execute_booking", execute_booking_node)

    # Entry point router
    def _entry_router(state: SchedulingAgentState) -> str:
        phase = state.get("phase", "DISCOVERY")
        if phase == "CONFIRMATION_PENDING" and state.get("selected_slot_id"):
            return "prepare_confirmation"
        elif phase == "SLOT_SELECTION" and state.get("selected_lawyer_id"):
            return "resolve_slots"
        elif phase == "LAWYER_MATCHING" and state.get("legal_category"):
            return "match_lawyers"
        return "classify_intent"

    graph.set_conditional_entry_point(
        _entry_router,
        {
            "classify_intent": "classify_intent",
            "match_lawyers": "match_lawyers",
            "resolve_slots": "resolve_slots",
            "prepare_confirmation": "prepare_confirmation",
        },
    )

    # Edges
    # After classification -> if category found -> match lawyers, else pause (END)
    graph.add_conditional_edges(
        "classify_intent",
        lambda s: "match_lawyers" if s.get("phase") == "LAWYER_MATCHING" else END,
        {"match_lawyers": "match_lawyers", END: END},
    )

    # After lawyer matching -> resolve slots for top lawyer
    graph.add_edge("match_lawyers", "resolve_slots")

    # After resolving slots -> pause for user selection (END)
    graph.add_edge("resolve_slots", END)

    # Prepare confirmation -> pause for human confirm button (END)
    graph.add_edge("prepare_confirmation", END)

    # Execute booking -> finish
    graph.add_edge("execute_booking", END)

    return graph.compile()


_compiled_scheduling_graph = _build_scheduling_graph()


async def process_scheduling_message(
    session_id: str,
    message: str,
    selected_lawyer_id: str | None = None,
    selected_slot_id: str | None = None,
    selected_slot_time: str | None = None,
    consultation_type: str | None = None,
) -> SchedulingAgentState:
    """
    Main entry point for handling an incoming user message or action in the scheduling agent.
    """
    state = get_scheduling_state(session_id)
    if state is None:
        session_id, state = create_scheduling_session(session_id=session_id)

    state = dict(state)
    state["iteration_count"] = state.get("iteration_count", 0) + 1

    clean_msg = message.strip()
    msg_lower = clean_msg.lower()

    # Record user message in history
    if clean_msg:
        state["messages"].append({
            "role": "client",
            "content": clean_msg,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

    # Direct selection updates
    if selected_lawyer_id:
        state["selected_lawyer_id"] = selected_lawyer_id
        for l in state.get("matched_lawyers", []):
            if l.get("lawyer_id") == selected_lawyer_id:
                state["selected_lawyer_name"] = l.get("name")
                break

    if selected_slot_id:
        state["selected_slot_id"] = selected_slot_id
    if selected_slot_time:
        state["selected_slot_time"] = selected_slot_time
    if consultation_type in ["Phone Consultation", "Meeting with a Lawyer"]:
        state["consultation_type"] = consultation_type

    # 1. Check if user clicked "Confirm & Book Appointment"
    if "confirm" in msg_lower and "book" in msg_lower:
        logger.info("Session %s: User confirmed booking. Executing...", session_id)
        updated = await execute_booking_node(state)
        save_scheduling_state(session_id, updated)
        return updated

    # 2. Check if user selected a slot from text (e.g. "Slot: 10:00 AM - 10:30 AM")
    for s in state.get("available_slots", []):
        f_time = s.get("formatted_time", "").lower()
        if f_time and f_time in msg_lower:
            state["selected_slot_id"] = s["slot_id"]
            state["selected_slot_time"] = s["formatted_time"]
            state["target_date"] = s.get("date")
            break

    if state.get("selected_slot_id") and state.get("phase") == "CONFIRMATION_PENDING":
        logger.info("Session %s: Slot chosen. Preparing confirmation proposal...", session_id)
        updated = await prepare_confirmation_node(state)
        save_scheduling_state(session_id, updated)
        return updated

    # 3. Check if user selected a lawyer from text (e.g. "Select: Attorney Perera")
    for l in state.get("matched_lawyers", []):
        l_name = l.get("name", "").lower()
        if l_name and l_name in msg_lower:
            state["selected_lawyer_id"] = l["lawyer_id"]
            state["selected_lawyer_name"] = l["name"]
            state["phase"] = "SLOT_SELECTION"
            updated = await resolve_slots_node(state)
            save_scheduling_state(session_id, updated)
            return updated

    # 4. Otherwise, run graph from appropriate node
    logger.info("Session %s: Running scheduling graph...", session_id)
    try:
        result = await _compiled_scheduling_graph.ainvoke(state)
        save_scheduling_state(session_id, result)
        return result
    except Exception as e:
        logger.error("Error executing scheduling graph: %s", e)
        # Fallback to direct classifier execution
        fallback_res = await classify_intent_node(state)
        save_scheduling_state(session_id, fallback_res)
        return fallback_res
