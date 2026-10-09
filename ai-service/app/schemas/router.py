"""
app/schemas/router.py

Pydantic models for Document Router and intent classification.
"""

from typing import Literal
from pydantic import BaseModel, Field


class DocumentIntent(BaseModel):
    """Structured intent classified by Document Router."""
    intent: Literal[
        "document_upload",
        "document_analysis",
        "document_classification",
        "document_completeness",
        "missing_documents",
        "clerk_recommendation",
    ] = Field(..., description="The classified document operation intent")
    confidence: float = Field(default=1.0, ge=0.0, le=1.0, description="Classification confidence")
    reasoning: str = Field(default="", description="Brief explanation for the classified intent")
