"""
app/tools/document_tools.py

Tool functions for document file operations.
Agent nodes call these; they never import backend_client directly.
"""

import logging

from app.services.backend_client import get_backend_client

logger = logging.getLogger(__name__)


async def get_uploaded_documents(request_id: int) -> list[dict]:
    """Fetch all uploaded files for a documentation request."""
    backend = get_backend_client()
    try:
        return await backend.get_document_files(request_id)
    except Exception as e:
        logger.error("get_uploaded_documents(%d) failed: %s", request_id, e)
        return []


async def download_authorized_document(file_id: int) -> bytes | None:
    """Download a document file's raw bytes from the backend."""
    backend = get_backend_client()
    try:
        return await backend.download_document_file(file_id)
    except Exception as e:
        logger.error("download_authorized_document(%d) failed: %s", file_id, e)
        return None


async def save_document_analysis(file_id: int, status: str) -> bool:
    """
    Update a document file's status after analysis.
    status: Received | UnderReview | Accepted | Rejected
    """
    backend = get_backend_client()
    try:
        await backend.update_file_status(file_id, status)
        logger.info("Updated file %d status → %s", file_id, status)
        return True
    except Exception as e:
        logger.error("save_document_analysis(%d, %r) failed: %s", file_id, status, e)
        return False


def request_missing_document(doc_type: str, existing_reason: str = "") -> str:
    """
    Generate the client-facing message asking for a missing document.
    Returns the message string (caller adds it to state.messages).
    """
    base = f"Please upload your {doc_type}."
    if existing_reason:
        return f"{existing_reason} {base}"
    return base


def request_additional_document(doc_type: str, clerk_reason: str) -> str:
    """
    Generate the client-facing message asking for an additional document
    requested by the clerk after initial verification.
    """
    return (
        f"Your assigned clerk has requested an additional document: **{doc_type}**.\n"
        f"Reason: {clerk_reason}\n"
        f"Please upload this document to continue processing your request."
    )
