"""
app/agents/completeness.py

Document Completeness and Missing Document Detection.
Compares authoritative required documents against provided/uploaded documents.
"""

import logging
import re
from typing import Any

from app.graph.state import AgentState
from app.schemas.completeness import DocumentCompletenessResult

logger = logging.getLogger(__name__)


def _normalize_name(name: str) -> str:
    """Canonicalize document names for comparison."""
    clean = re.sub(r"[\W_]+", " ", name.lower()).strip()
    synonyms = {
        "nic": "nic",
        "national identity card": "nic",
        "national id": "nic",
        "passport": "passport",
        "deed": "property deed",
        "title deed": "property deed",
        "property deed": "property deed",
        "asset ownership proof": "property deed",
        "sale agreement": "sale agreement",
        "sales agreement": "sale agreement",
        "agreement to sell": "sale agreement",
        "tenancy agreement": "contract",
        "lease agreement": "contract",
        "contract": "contract",
        "application form": "application form",
        "completed application": "application form",
        "business registration": "business registration",
        "court document": "court document",
        "affidavit": "application form",
    }
    for k, v in synonyms.items():
        if k in clean or clean in k:
            return v
    return clean


def evaluate_completeness(
    required_docs: list[str],
    provided_docs: list[str],
    case_id: str | None = None,
    service_type: str | None = None,
) -> DocumentCompletenessResult:
    """
    Compares required documents vs provided documents.
    Returns structured DocumentCompletenessResult.
    """
    norm_provided = {_normalize_name(d): d for d in provided_docs}
    missing: list[str] = []
    matched_provided: list[str] = []

    for req in required_docs:
        norm_req = _normalize_name(req)
        if norm_req in norm_provided:
            matched_provided.append(req)
        else:
            missing.append(req)

    if not missing and required_docs:
        status = "READY_FOR_ASSIGNMENT"
    elif matched_provided:
        status = "INCOMPLETE"
    else:
        status = "INCOMPLETE"

    return DocumentCompletenessResult(
        status=status,
        required_documents=required_docs,
        provided_documents=matched_provided,
        missing_documents=missing,
        case_id=case_id,
        service_type=service_type,
    )


async def missing_document_check_node(state: AgentState) -> AgentState:
    """
    LangGraph node that runs completeness check and updates state.
    """
    state = dict(state)
    required = state.get("required_documents", [])
    statuses = state.get("document_statuses", {})

    # Extract accepted documents
    accepted = [
        doc_type for doc_type, status_dict in statuses.items()
        if status_dict.get("status") in ("accepted", "accepted_with_flag")
    ]

    result = evaluate_completeness(
        required_docs=required,
        provided_docs=accepted,
        case_id=str(state.get("request_id") or state.get("workflow_id")),
        service_type=state.get("service_name"),
    )

    state["completeness_result"] = result.model_dump()
    state["missing_documents"] = result.missing_documents

    if result.status == "READY_FOR_ASSIGNMENT":
        if state.get("phase") not in ("ADMIN_APPROVAL_PENDING", "COMPLETED", "AWAITING_ADMIN_APPROVAL"):
            state["phase"] = "DOCUMENTS_COMPLETE"
    else:
        state["phase"] = "WAITING_FOR_DOCUMENTS"

    logger.info("missing_document_check_node: status=%s missing=%s", result.status, result.missing_documents)
    return state
