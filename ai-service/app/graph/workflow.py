"""
app/graph/workflow.py

LangGraph StateGraph definition — the complete workflow state machine.

Graph structure:
  understand_request → check_document_completeness
  check_document_completeness →(missing)→ END (pause, wait for upload)
  check_document_completeness →(complete)→ generate_document_summary
  generate_document_summary → clerk_recommendation
  clerk_recommendation → END (pause, wait for admin decision)
  [admin decision received via /approve endpoint]
  replan → clerk_recommendation (on admin rejection)
  complete → END
  human_review → END

On every resume (new upload or admin decision):
  The caller sets the appropriate document status to "analyzing" or records the admin decision,
  then calls run_workflow() which picks up from the correct node based on state.phase.

State persistence: in-memory dict for prototype.
Swap _state_store for Redis/DB in production by replacing get_state/save_state.
"""

import logging
import uuid
from typing import Any

from langgraph.graph import StateGraph, END

from app.agents.clerk_recommendation import clerk_recommendation_node, replan_node
from app.agents.document_analysis import document_analysis_node
from app.agents.document_validation import (
    document_validation_node,
    check_document_completeness,
    generate_document_summary,
)
from app.agents.supervisor import (
    understand_request_node,
    complete_node,
    human_review_node,
)
from app.graph.routing import route_after_validation, route_after_admin_decision
from app.graph.state import AgentState, initial_state

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Persistent State Store (in-memory cache backed by disk JSON persistence)
# ---------------------------------------------------------------------------
import json
import re
from pathlib import Path

_state_store: dict[str, AgentState] = {}
_SESSIONS_DIR = Path(__file__).parent.parent.parent / "data" / "sessions"
_SESSIONS_DIR.mkdir(parents=True, exist_ok=True)


def _extract_name_from_messages(messages: list[dict]) -> str | None:
    """Fallback scanner to recover client name from message history if ever lost."""
    from app.agents.supervisor import _extract_client_name
    for m in messages:
        if m.get("role") == "client":
            name = _extract_client_name(m.get("content", ""), is_asking_name=False)
            if name:
                return name
    return None


def get_state(session_id: str) -> AgentState | None:
    state = _state_store.get(session_id)
    if state is None:
        # Check disk storage for existing session
        session_file = _SESSIONS_DIR / f"{session_id}.json"
        if session_file.exists():
            try:
                state = json.loads(session_file.read_text(encoding="utf-8"))
                _state_store[session_id] = state
                logger.info("Restored session '%s' from disk storage.", session_id)
            except Exception as e:
                logger.warning("Failed to load session file %s: %s", session_file, e)

    if state is not None and not state.get("client_name"):
        recovered = _extract_name_from_messages(state.get("messages", []))
        if recovered:
            state["client_name"] = recovered
            save_state(session_id, state)

    return state


def save_state(session_id: str, state: AgentState) -> None:
    _state_store[session_id] = state
    # Persist to disk so restarts or code reloads never lose user chat sessions
    try:
        session_file = _SESSIONS_DIR / f"{session_id}.json"
        session_file.write_text(json.dumps(state, indent=2, default=str), encoding="utf-8")
    except Exception as e:
        logger.warning("Failed to persist session '%s' to disk: %s", session_id, e)


def create_session(customer_id: str, session_id: str | None = None) -> tuple[str, AgentState]:
    """Create a new session and return (session_id, initial_state)."""
    session_id = session_id or str(uuid.uuid4())
    workflow_id = str(uuid.uuid4())
    state = initial_state(session_id=session_id, customer_id=customer_id, workflow_id=workflow_id)
    save_state(session_id, state)
    logger.info("New session created: session_id=%s workflow_id=%s", session_id, workflow_id)
    return session_id, state


# ---------------------------------------------------------------------------
# Build the LangGraph graph
# ---------------------------------------------------------------------------

def _build_graph() -> Any:
    graph = StateGraph(AgentState)

    # ---- Nodes ----
    graph.add_node("understand_request", understand_request_node)
    graph.add_node("check_document_completeness", check_document_completeness)
    graph.add_node("document_analysis", document_analysis_node)
    graph.add_node("document_validation", document_validation_node)
    graph.add_node("generate_document_summary", generate_document_summary)
    graph.add_node("clerk_recommendation", clerk_recommendation_node)
    graph.add_node("replan", replan_node)
    graph.add_node("complete", complete_node)
    graph.add_node("human_review", human_review_node)

    # ---- Entry point conditional router ----
    def _entry_router(state: AgentState) -> str:
        phase = state.get("phase", "UNDERSTAND_REQUEST")
        if phase == "ANALYZING":
            return "document_analysis"
        elif phase == "DOCUMENTS_COMPLETE":
            return "generate_document_summary"
        elif phase == "AWAITING_ADMIN_APPROVAL" and state.get("last_admin_decision"):
            return "replan"
        return "understand_request"

    graph.set_conditional_entry_point(
        _entry_router,
        {
            "document_analysis": "document_analysis",
            "generate_document_summary": "generate_document_summary",
            "replan": "replan",
            "understand_request": "understand_request",
        },
    )

    # ---- Edges ----
    graph.add_edge("understand_request", "check_document_completeness")

    # After completeness check: if missing → END (pause). If complete → summary
    graph.add_conditional_edges(
        "check_document_completeness",
        lambda s: "generate_document_summary" if s["phase"] == "DOCUMENTS_COMPLETE" else END,
        {"generate_document_summary": "generate_document_summary", END: END},
    )

    # After analysis → validation
    graph.add_edge("document_analysis", "document_validation")

    # After validation → routing (Python decision, not LLM)
    graph.add_conditional_edges(
        "document_validation",
        route_after_validation,
        {
            "request_documents": END,          # pause, wait for re-upload
            "generate_document_summary": "generate_document_summary",
            "human_review": "human_review",
        },
    )

    # After summary → clerk recommendation
    graph.add_edge("generate_document_summary", "clerk_recommendation")

    # After clerk recommendation → END (pause for admin)
    graph.add_edge("clerk_recommendation", END)

    # After admin decision
    graph.add_conditional_edges(
        "replan",
        route_after_admin_decision,
        {
            "complete": "complete",
            "replan": "replan",
            "human_review": "human_review",
        },
    )

    graph.add_edge("complete", END)
    graph.add_edge("human_review", END)

    return graph.compile()


_compiled_graph = _build_graph()


# ---------------------------------------------------------------------------
# Public API used by route handlers
# ---------------------------------------------------------------------------

async def run_workflow(session_id: str) -> AgentState:
    """
    Resume the workflow for an existing session.
    Runs until a pause point (END) is reached.
    Saves and returns the updated state.
    """
    state = get_state(session_id)
    if state is None:
        raise ValueError(f"Session '{session_id}' not found.")

    logger.info("Resuming workflow: session=%s phase=%s", session_id, state["phase"])

    result = await _compiled_graph.ainvoke(state)
    updated: AgentState = result

    save_state(session_id, updated)
    logger.info("Workflow paused: session=%s new_phase=%s", session_id, updated["phase"])
    return updated


async def start_document_analysis(session_id: str, file_id: int, expected_doc_type: str) -> AgentState:
    """
    Called when the backend notifies us a new file was uploaded.
    Marks the document as 'analyzing' and runs the analysis + validation nodes.
    """
    state = get_state(session_id)
    if state is None:
        raise ValueError(f"Session '{session_id}' not found.")

    # Find the matching required document and set its file_id + status
    doc_type_key = None
    exp_clean = expected_doc_type.lower().replace("upload", "").strip()

    for req_type in state["required_documents"]:
        req_clean = req_type.lower().strip()
        if (
            req_clean == exp_clean
            or exp_clean in req_clean
            or req_clean in exp_clean
        ):
            doc_type_key = req_type
            break

    if not doc_type_key and exp_clean:
        # Check token/keyword overlap
        exp_words = set(re.findall(r"\w+", exp_clean))
        for req_type in state["required_documents"]:
            req_words = set(re.findall(r"\w+", req_type.lower()))
            if exp_words & req_words:
                doc_type_key = req_type
                break

    if not doc_type_key:
        # Accept any pending or rejected document if type not matched exactly
        for req_type, doc_status in state["document_statuses"].items():
            if doc_status["status"] in ("pending", "rejected"):
                doc_type_key = req_type
                break

    if doc_type_key:
        state["document_statuses"][doc_type_key]["file_id"] = file_id
        state["document_statuses"][doc_type_key]["status"] = "analyzing"
        state["phase"] = "ANALYZING"
        save_state(session_id, state)

    return await run_workflow(session_id)


async def record_admin_decision_and_resume(
    session_id: str,
    decision: str,
    approved_by: int,
    comment: str,
) -> AgentState:
    """
    Called when an admin makes an approve/reject decision.
    Records the decision in state and resumes the workflow.
    """
    state = get_state(session_id)
    if state is None:
        raise ValueError(f"Session '{session_id}' not found.")

    state["last_admin_decision"] = decision.upper()

    if decision.upper() in ("APPROVED", "APPROVE"):
        state["phase"] = "IN_PROCESS"
        # Route to complete
        state = dict(state)
        from app.agents.supervisor import complete_node
        state = await complete_node(state)
    else:
        # Route to replan
        state = await replan_node(state)

    save_state(session_id, state)
    return state
