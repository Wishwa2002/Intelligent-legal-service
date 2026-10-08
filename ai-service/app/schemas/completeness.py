"""
app/schemas/completeness.py

Pydantic models for Document Completeness and Missing Document Checking.
"""

from typing import Literal
from pydantic import BaseModel, Field


class DocumentCompletenessResult(BaseModel):
    """Structured report comparing required documents with uploaded documents."""
    status: Literal["INCOMPLETE", "READY_FOR_CLERK_REVIEW", "READY_FOR_ASSIGNMENT"] = Field(
        ..., description="Overall case completeness status"
    )
    required_documents: list[str] = Field(default_factory=list, description="Official requirements")
    provided_documents: list[str] = Field(default_factory=list, description="Verified uploaded documents")
    missing_documents: list[str] = Field(default_factory=list, description="Pending or unverified documents")
    case_id: str | None = None
    service_type: str | None = None
