"""
app/agents/retrieval_agent.py

LangGraph nodes for Requirement Retrieval, Retrieval Grading, and Query Rewriting.
Implements the Self-Correction Loop:
  retrieve_requirements -> grade_requirements
    -> (relevant) -> document_completeness
    -> (not relevant & retries < 2) -> rewrite_query -> retrieve_requirements
    -> (not relevant & retries >= 2) -> human_review (INSUFFICIENT_INFORMATION)
"""

import logging
from datetime import datetime, timezone
from typing import Any

from app.graph.state import AgentState
from app.retrieval.hybrid_service import get_hybrid_retrieval_service
from app.schemas.retrieval import RetrievalGrade, QueryRewriteResult
from app.services.gemini_service import get_gemini_service

logger = logging.getLogger(__name__)

MAX_RETRIEVAL_RETRIES = 2


async def retrieve_requirements_node(state: AgentState) -> AgentState:
    """
    Executes hybrid retrieval (BM25 + Chroma + RRF) to fetch official document requirements.
    """
    state = dict(state)
    query = state.get("search_query") or state.get("service_name") or "legal service document requirements"
    service_type = state.get("service_name", "LEGAL_SERVICE")

    logger.info("retrieve_requirements_node: query=%r, service=%r", query, service_type)
    hybrid_service = get_hybrid_retrieval_service()
    fused_results = hybrid_service.search(query=query, top_k=3)

    state["retrieved_documents"] = fused_results

    # Build context string
    context_parts = []
    for doc in fused_results:
        context_parts.append(
            f"Title: {doc['title']} (RRF: {doc['rrf_score']:.4f})\n"
            f"Service: {doc['service_type']}\n"
            f"Content: {doc['content']}\n"
            f"Required Documents: {', '.join(doc.get('required_documents', []))}"
        )
    combined_context = "\n\n---\n\n".join(context_parts)
    state["retrieved_context"] = combined_context

    # Append to audit log
    state.setdefault("audit_log", []).append({
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "session_id": state.get("session_id"),
        "event": "REQUIREMENTS_RETRIEVED",
        "query": query,
        "results_count": len(fused_results),
        "top_id": fused_results[0]["id"] if fused_results else None,
        "top_rrf": fused_results[0]["rrf_score"] if fused_results else None,
    })

    return state


async def grade_requirements_node(state: AgentState) -> AgentState:
    """
    Evaluates whether the retrieved legal requirements are sufficient.
    """
    state = dict(state)
    gemini = get_gemini_service()

    query = state.get("search_query") or state.get("service_name") or ""
    context = state.get("retrieved_context", "")
    service_type = state.get("service_name", "LEGAL_SERVICE")

    grade: RetrievalGrade = await gemini.grade_retrieval(
        query=query,
        retrieved_context=context,
        service_type=service_type,
    )

    state["retrieval_grade"] = grade.model_dump()
    state.setdefault("audit_log", []).append({
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "session_id": state.get("session_id"),
        "event": "RETRIEVAL_GRADED",
        "relevant": grade.relevant,
        "confidence": grade.confidence,
        "reason": grade.reason,
    })

    return state


async def rewrite_query_node(state: AgentState) -> AgentState:
    """
    Rewrites search query when retrieval grading determines results are not relevant.
    Increments retrieval_retry_count.
    """
    state = dict(state)
    gemini = get_gemini_service()

    current_query = state.get("search_query") or state.get("service_name") or ""
    service_type = state.get("service_name", "LEGAL_SERVICE")
    grade_info = state.get("retrieval_grade", {})
    feedback = grade_info.get("reason", "")

    rewrite_res: QueryRewriteResult = await gemini.rewrite_query(
        query=current_query,
        service_type=service_type,
        feedback=feedback,
    )

    state["search_query"] = rewrite_res.rewritten_query
    state["retrieval_retry_count"] = state.get("retrieval_retry_count", 0) + 1

    state.setdefault("audit_log", []).append({
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "session_id": state.get("session_id"),
        "event": "QUERY_REWRITTEN",
        "original_query": current_query,
        "rewritten_query": rewrite_res.rewritten_query,
        "retry_count": state["retrieval_retry_count"],
    })

    logger.info("Query rewritten (attempt %d): %r", state["retrieval_retry_count"], rewrite_res.rewritten_query)
    return state


def route_after_grading(state: AgentState) -> str:
    """
    Self-correction router after grading.
    - If relevant -> proceed to document completeness check
    - If not relevant and retries < 2 -> rewrite_query
    - If not relevant and retries >= 2 -> human_review (INSUFFICIENT_INFORMATION)
    """
    grade = state.get("retrieval_grade", {})
    is_relevant = grade.get("relevant", False)
    retries = state.get("retrieval_retry_count", 0)

    if is_relevant:
        logger.info("Retrieval graded relevant. Proceeding to completeness check.")
        return "check_document_completeness"

    if retries < MAX_RETRIEVAL_RETRIES:
        logger.info("Retrieval graded not relevant (retry %d/%d). Routing to rewrite_query.",
                    retries, MAX_RETRIEVAL_RETRIES)
        return "rewrite_query"

    logger.warning("Max retrieval retries (%d) reached. Marking INSUFFICIENT_INFORMATION -> human_review.",
                   MAX_RETRIEVAL_RETRIES)
    state["workflow_status"] = "INSUFFICIENT_INFORMATION"
    state["human_review_triggered"] = True
    state["human_review_reason"] = "Could not retrieve sufficient official legal requirements checklist after query rewrites."
    return "human_review"
