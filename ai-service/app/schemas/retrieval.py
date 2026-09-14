"""
app/schemas/retrieval.py

Pydantic schemas for Hybrid Retrieval, Retrieval Grading, and Query Rewriting.
"""

from pydantic import BaseModel, Field


class RetrievalGrade(BaseModel):
    """Evaluation of whether retrieved legal requirements are sufficient."""
    relevant: bool = Field(..., description="Whether the retrieved documents contain the required checklist")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score between 0.0 and 1.0")
    reason: str = Field(..., description="Explanation of why the retrieval was graded as relevant or not")


class HybridSearchResult(BaseModel):
    """Result item from hybrid BM25 + Chroma + RRF search."""
    id: str
    title: str
    service_type: str
    category: str
    content: str
    required_documents: list[str] = Field(default_factory=list)
    rrf_score: float
    bm25_rank: int | None = None
    chroma_rank: int | None = None


class QueryRewriteResult(BaseModel):
    """Result of rewriting a vague query for legal requirement retrieval."""
    original_query: str
    rewritten_query: str
    rationale: str
