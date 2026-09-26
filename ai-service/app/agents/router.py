"""
app/agents/router.py

LangGraph node: DOCUMENT_ROUTER

Determines what document-related operation is required:
- document_upload
- document_analysis
- document_classification
- document_completeness
- missing_documents
- clerk_recommendation
"""

import logging
import re
from typing import Any

from app.graph.state import AgentState
from app.schemas.router import DocumentIntent
from app.services.gemini_service import get_gemini_service

logger = logging.getLogger(__name__)


def classify_document_intent_fast(user_text: str, state: AgentState | None = None) -> DocumentIntent:
    """
    Fast rule-based intent classification for instant deterministic routing.
    """
    clean = (user_text or "").lower().strip()

    # If state has uploaded/analyzing documents pending
    if state:
        phase = state.get("phase", "")
        if phase == "ANALYZING":
            return DocumentIntent(intent="document_analysis", confidence=0.98, reasoning="Document currently in analyzing phase.")
        if phase == "DOCUMENTS_COMPLETE":
            return DocumentIntent(intent="clerk_recommendation", confidence=0.98, reasoning="All documents complete, proceed to clerk.")

    if any(k in clean for k in ["clerk", "recommend clerk", "assign clerk", "recommendation"]):
        return DocumentIntent(intent="clerk_recommendation", confidence=0.95, reasoning="Client requested clerk recommendation.")

    if any(k in clean for k in ["missing", "what is missing", "balance document", "pending document"]):
        return DocumentIntent(intent="missing_documents", confidence=0.95, reasoning="Client asked for missing document check.")

    if any(k in clean for k in ["complete", "completeness", "checklist", "verify all", "check all"]):
        return DocumentIntent(intent="document_completeness", confidence=0.92, reasoning="Client requested completeness verification.")

    if any(k in clean for k in ["upload", "attach", "send file", "upload document", "uploading"]):
        return DocumentIntent(intent="document_upload", confidence=0.95, reasoning="Client wants to upload document.")

    if any(k in clean for k in ["classify", "document type", "what document is this", "is this an nic", "is this a deed"]):
        return DocumentIntent(intent="document_classification", confidence=0.90, reasoning="Client inquired about document type classification.")

    if any(k in clean for k in ["analyze", "examine", "ocr", "read document", "extract text"]):
        return DocumentIntent(intent="document_analysis", confidence=0.90, reasoning="Client requested document extraction/analysis.")

    return DocumentIntent(intent="document_completeness", confidence=0.75, reasoning="Default fallback to completeness check.")


async def document_router_node(state: AgentState) -> AgentState:
    """
    LangGraph node that routes document operations.
    """
    state = dict(state)
    latest_msg = ""
    if state.get("messages"):
        for m in reversed(state["messages"]):
            if m.get("role") == "client":
                latest_msg = m.get("content", "")
                break

    intent = classify_document_intent_fast(latest_msg, state)
    state["document_intent"] = intent.model_dump()
    logger.info("document_router_node: classified intent=%s (conf=%.2f)", intent.intent, intent.confidence)
    return state
