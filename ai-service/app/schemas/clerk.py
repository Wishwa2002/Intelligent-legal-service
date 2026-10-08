"""
app/schemas/clerk.py

Pydantic models for clerk candidate data and transparent clerk recommendation output.
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
    specializations: list[str] = Field(default_factory=list)
    skills: list[str] = Field(default_factory=list)
    experience_years: float = Field(default=3.0)
    availability: bool = Field(default=True)


class ClerkRecommendationItem(BaseModel):
    """Individual ranked clerk recommendation item."""
    clerk_id: str
    name: str = ""
    match_score: float = Field(..., ge=0.0, le=1.0, description="Recommendation match score (0.0 to 1.0)")
    reasons: list[str] = Field(default_factory=list, description="Specific reasons for recommendation")


class ClerkRecommendationReport(BaseModel):
    """Structured report containing ranked clerk recommendations for human approval."""
    recommendations: list[ClerkRecommendationItem] = Field(default_factory=list)
    requires_human_approval: bool = True
    service_type: str | None = None
    case_id: str | None = None


class ClerkRecommendation(BaseModel):
    """
    Gemini's structured recommendation output (backward-compatible).
    """

    recommended_clerk_id: str = Field(
        description="The clerk_id (as string) of the recommended clerk."
    )
    reason: str = Field(
        description="Clear explanation of why this clerk is recommended."
    )
    confidence: float = Field(
        ge=0.0, le=1.0,
        description="How confident the recommendation is given the available data."
    )
    alternatives: list[dict] = Field(
        default_factory=list,
        description="Other viable candidates with brief rationale, in order of preference."
    )
