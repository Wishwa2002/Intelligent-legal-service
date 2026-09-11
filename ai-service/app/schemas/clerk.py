"""
app/schemas/clerk.py

Pydantic models for clerk recommendation output.
"""

from __future__ import annotations
from pydantic import BaseModel, Field


class ClerkCandidate(BaseModel):
    """A clerk candidate with objective data fetched from the backend."""

    clerk_id: int
    name: str
    department: str
    contact: str
    active_request_count: int = Field(
        description="Number of currently IN_PROGRESS requests assigned to this clerk."
    )


class ClerkRecommendation(BaseModel):
    """
    Gemini's structured recommendation output.

    IMPORTANT: Gemini EXPLAINS which clerk looks best and WHY.
    It does NOT make the final decision — that belongs to the admin.
    The AI service never calls assign-clerk directly.
    """

    recommended_clerk_id: str = Field(
        description="The clerk_id (as string) of the recommended clerk."
    )
    reason: str = Field(
        description="Clear explanation of why this clerk is recommended. "
                    "Must reference objective data (workload, department). "
                    "Must NOT claim to 'assign' or 'decide' — only to 'recommend'."
    )
    confidence: float = Field(
        ge=0.0, le=1.0,
        description="How confident the recommendation is given the available data."
    )
    alternatives: list[dict] = Field(
        default_factory=list,
        description="Other viable candidates with brief rationale, in order of preference."
    )
