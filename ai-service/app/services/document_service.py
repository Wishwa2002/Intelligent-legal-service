"""
app/services/document_service.py
Re-exports from app.services.document_and_clerk.document_service for backward compatibility.
"""

from app.services.document_and_clerk.document_service import (
    analyze_document_file,
    analyze_document_bytes,
    _extract_pdf_text,
    _get_sample_document_bytes,
    _error_analysis,
    PDF_CONTENT_TYPES,
    IMAGE_CONTENT_TYPES,
)

__all__ = [
    "analyze_document_file",
    "analyze_document_bytes",
    "_extract_pdf_text",
    "_get_sample_document_bytes",
    "_error_analysis",
    "PDF_CONTENT_TYPES",
    "IMAGE_CONTENT_TYPES",
]
