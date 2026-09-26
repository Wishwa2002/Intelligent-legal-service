"""
app/agents/scheduling/matchmaker.py

Node 2: LAWYER MATCHMAKER & RANKING
Retrieves registered attorneys matching the classified practice category,
computes a transparent multi-factor score, and generates a tailored recommendation.
"""

import json
import logging
from datetime import datetime, timezone

from app.graph.scheduling_state import SchedulingAgentState
from app.prompts.scheduling import SCHEDULING_SYSTEM_PROMPT, LAWYER_MATCH_EXPLANATION_PROMPT
from app.services.gemini_service import get_gemini_service
from app.tools.scheduling_tools import get_lawyers_for_category

logger = logging.getLogger(__name__)


def score_lawyer_candidate(lawyer: dict, category: str) -> float:
    """
    Multi-factor Transparent Matching:
      Score = 0.45 * CategoryMatch + 0.35 * Experience + 0.20 * WorkloadBalance
    """
    specs = [s.lower() for s in lawyer.get("specializations", [])]
    clean_cat = category.lower()

    # 1. Category match
    cat_score = 1.0 if any(clean_cat in s or s in clean_cat for s in specs) else 0.5

    # 2. Experience score (scaled to 15 years max)
    exp = float(lawyer.get("experience", 1))
    exp_score = min(1.0, max(0.1, exp / 12.0))

    # 3. Workload score (lower active bookings = higher availability score)
    active = float(lawyer.get("active_consultations", 0))
    workload_score = max(0.1, 1.0 - (active / 8.0))

    final_score = (0.45 * cat_score) + (0.35 * exp_score) + (0.20 * workload_score)
    return round(final_score, 2)


async def match_lawyers_node(state: SchedulingAgentState) -> SchedulingAgentState:
    """
    Matches candidate lawyers in the chosen legal category and ranks them.
    """
    state = dict(state)
    category = state.get("legal_category")
    if not category:
        state["phase"] = "DISCOVERY"
        return state

    candidates = await get_lawyers_for_category(category)
    if not candidates:
        state["messages"].append({
            "role": "agent",
            "content": f"We currently don't have available attorneys in **{category}**. Would you like to select another practice area or contact administrative support?",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "action_options": ["Real Estate & Property Law", "Corporate & Commercial Law", "Criminal Law", "Labour & Employment Law", "Tax Law"],
        })
        state["phase"] = "DISCOVERY"
        return state

    # Score and rank candidates
    scored = []
    for c in candidates:
        s = score_lawyer_candidate(c, category)
        c_copy = dict(c)
        c_copy["match_score"] = s
        scored.append((s, c_copy))

    scored.sort(key=lambda x: x[0], reverse=True)
    ranked = [x[1] for x in scored]
    state["matched_lawyers"] = ranked

    # Select top lawyer as default choice if not already chosen
    top_lawyer = ranked[0]
    if not state.get("selected_lawyer_id"):
        state["selected_lawyer_id"] = top_lawyer["lawyer_id"]
        state["selected_lawyer_name"] = top_lawyer["name"]

    # Generate LLM explanation if available
    gemini = get_gemini_service()
    explanation = (
        f"I have matched you with **{top_lawyer['name']}**, specializing in **{category}** "
        f"with **{top_lawyer['experience']} years** of practice experience ({top_lawyer['license_number']})."
    )

    try:
        candidates_brief = [
            {"name": l["name"], "experience": l["experience"], "license": l["license_number"], "specializations": l["specializations"]}
            for l in ranked[:3]
        ]
        prompt = LAWYER_MATCH_EXPLANATION_PROMPT.format(
            category=category,
            issue_summary=state.get("issue_summary") or f"Consultation regarding {category}",
            candidates_json=json.dumps(candidates_brief),
        )
        llm_exp = await gemini.call(prompt, system_instruction=SCHEDULING_SYSTEM_PROMPT)
        if llm_exp and len(llm_exp.strip()) > 20:
            explanation = llm_exp.strip()
    except Exception as e:
        logger.warning("Could not generate Gemini explanation: %s", e)

    lawyer_options = [f"Select: {l['name']}" for l in ranked[:3]]
    lawyer_options.append("📅 Proceed to Available 30-min Slots")

    msg_content = (
        f"### ⚖️ Recommended Legal Counsel\n\n"
        f"{explanation}\n\n"
        f"**Selected Attorney:** {top_lawyer['name']}\n"
        f"**Practice Area:** {category}\n"
        f"**Consultation Mode:** {state.get('consultation_type', 'Meeting with a Lawyer')}\n\n"
        f"Would you like to proceed with {top_lawyer['name']}, or view another attorney?"
    )

    state["messages"].append({
        "role": "agent",
        "content": msg_content,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "action_options": lawyer_options,
        "action_type": "LAWYER_SELECTION",
        "cards": [
            {
                "type": "lawyer_card",
                "lawyer_id": l["lawyer_id"],
                "name": l["name"],
                "experience": l["experience"],
                "license": l["license_number"],
                "qualification": l["qualification"],
                "match_score": l["match_score"],
            }
            for l in ranked[:3]
        ],
    })

    state["phase"] = "SLOT_SELECTION"
    return state
