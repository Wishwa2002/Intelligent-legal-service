"""
app/agents/scheduling/classifier.py

Node 1: CLASSIFIER & INTENT ROUTER
Classifies user statements into one of the 5 canonical legal practice categories,
identifies preferred consultation mode, and extracts date/schedule hints.
"""

import json
import logging
import re
from datetime import datetime, timedelta, timezone

from app.graph.scheduling_state import SchedulingAgentState
from app.prompts.scheduling import SCHEDULING_SYSTEM_PROMPT, INTENT_EXTRACTION_PROMPT
from app.services.gemini_service import get_gemini_service
from app.tools.scheduling_tools import LEGAL_PRACTICE_CATEGORIES

logger = logging.getLogger(__name__)


def _parse_date_hint(hint: str | None) -> str | None:
    """Helper to convert date hints like 'tomorrow', 'next Monday' to YYYY-MM-DD."""
    if not hint:
        return None

    hint_clean = hint.lower().strip()
    today = datetime.now(timezone.utc).date()

    if "today" in hint_clean:
        return today.isoformat()
    if "tomorrow" in hint_clean:
        return (today + timedelta(days=1)).isoformat()

    # Look for ISO format YYYY-MM-DD
    match = re.search(r"\b(\d{4}-\d{2}-\d{2})\b", hint_clean)
    if match:
        return match.group(1)

    # Default to tomorrow if mentioned "soon" or "upcoming"
    if any(w in hint_clean for w in ["soon", "next", "upcoming", "this week"]):
        return (today + timedelta(days=1)).isoformat()

    return None


async def classify_intent_node(state: SchedulingAgentState) -> SchedulingAgentState:
    """
    Classifies the user's latest message to determine intent, category, mode, and date.
    """
    state = dict(state)
    messages = state.get("messages", [])
    if not messages:
        # Initial greeting if no messages yet
        client_name = state.get("client_name") or "there"
        greeting = (
            f"Hello {client_name}! I am your **Lawyer Scheduling Assistant**.\n\n"
            "I can help you find an experienced attorney and book a **30-minute consultation** "
            "(via **Phone Consultation** or **In-Person Meeting**) in any of our 5 practice areas:\n"
            "• **Corporate & Commercial Law**\n"
            "• **Criminal Law**\n"
            "• **Real Estate & Property Law**\n"
            "• **Labour & Employment Law**\n"
            "• **Tax Law**\n\n"
            "Please describe your legal issue or select a practice area below to begin."
        )
        state["messages"].append({
            "role": "agent",
            "content": greeting,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "action_options": LEGAL_PRACTICE_CATEGORIES,
        })
        state["phase"] = "DISCOVERY"
        return state

    last_user_msg = ""
    for m in reversed(messages):
        if m.get("role") == "client" or m.get("role") == "user":
            last_user_msg = m.get("content", "")
            break

    if not last_user_msg.strip():
        return state

    # Direct match if user tapped one of the category chips
    for cat in LEGAL_PRACTICE_CATEGORIES:
        if cat.lower() in last_user_msg.lower():
            state["legal_category"] = cat
            state["phase"] = "LAWYER_MATCHING"
            state["intent"] = "BOOK_APPOINTMENT"
            if not state.get("issue_summary"):
                state["issue_summary"] = f"Client requested consultation in {cat}."
            return state

    gemini = get_gemini_service()
    prompt = INTENT_EXTRACTION_PROMPT.format(user_message=last_user_msg)

    try:
        raw_resp = await gemini.call_json(prompt, system_instruction=SCHEDULING_SYSTEM_PROMPT)
        if isinstance(raw_resp, dict):
            extracted_cat = raw_resp.get("category")
            if extracted_cat in LEGAL_PRACTICE_CATEGORIES:
                state["legal_category"] = extracted_cat

            mode = raw_resp.get("consultation_type")
            if mode in ["Phone Consultation", "Meeting with a Lawyer"]:
                state["consultation_type"] = mode

            if raw_resp.get("issue_summary"):
                state["issue_summary"] = raw_resp["issue_summary"]

            date_hint = _parse_date_hint(raw_resp.get("date_hint"))
            if date_hint:
                state["target_date"] = date_hint

            intent = raw_resp.get("intent")
            if intent:
                state["intent"] = intent

            if intent == "OFF_TOPIC":
                state["phase"] = "OFF_TOPIC"
                state["messages"].append({
                    "role": "agent",
                    "content": (
                        "I am specialized strictly in legal consultations and appointment scheduling. "
                        "Please describe a legal matter or choose a practice category to book an appointment."
                    ),
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "action_options": LEGAL_PRACTICE_CATEGORIES,
                })
                return state
    except Exception as e:
        logger.warning("Gemini classification fallback: %s", e)

    # Default category fallback heuristics if LLM was unavailable
    text_lower = last_user_msg.lower()
    if any(k in text_lower for k in ["company", "business", "contract", "incorporat", "director", "shares"]):
        state["legal_category"] = "Corporate & Commercial Law"
    elif any(k in text_lower for k in ["police", "arrest", "criminal", "bail", "theft", "court", "assault"]):
        state["legal_category"] = "Criminal Law"
    elif any(k in text_lower for k in ["land", "property", "lease", "rent", "tenant", "deed", "evict"]):
        state["legal_category"] = "Real Estate & Property Law"
    elif any(k in text_lower for k in ["employ", "job", "dismiss", "salary", "epf", "gratuity", "workplace"]):
        state["legal_category"] = "Labour & Employment Law"
    elif any(k in text_lower for k in ["tax", "ird", "vat", "revenue", "customs", "audit"]):
        state["legal_category"] = "Tax Law"

    if state.get("legal_category"):
        state["phase"] = "LAWYER_MATCHING"
    else:
        state["phase"] = "DISCOVERY"
        state["messages"].append({
            "role": "agent",
            "content": (
                "Could you clarify which legal area your inquiry belongs to so I can match you with the right specialist attorney?"
            ),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "action_options": LEGAL_PRACTICE_CATEGORIES,
        })

    return state
