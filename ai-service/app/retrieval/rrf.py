"""
app/retrieval/rrf.py

Reciprocal Rank Fusion (RRF) for combining lexical (BM25) and vector (Chroma) search results.

Formula:
  RRF score = Σ 1 / (60 + rank)
  where rank is 0-indexed (rank 0 is the highest ranked item).
"""

import logging
from typing import Any, TypedDict

logger = logging.getLogger(__name__)

RRF_K = 60  # Standard smoothing constant


class RankedItem(TypedDict):
    id: str
    rank: int
    data: dict[str, Any]


class RRFResult(TypedDict):
    id: str
    rrf_score: float
    bm25_rank: int | None
    chroma_rank: int | None
    title: str
    service_type: str
    category: str
    content: str
    required_documents: list[str]


def compute_rrf(
    bm25_results: list[dict[str, Any]],
    chroma_results: list[dict[str, Any]],
    k: int = RRF_K,
    top_k: int = 5,
) -> list[RRFResult]:
    """
    Combines two ranked lists using Reciprocal Rank Fusion.

    Args:
        bm25_results: Ranked list from BM25 (expects 'id', 'rank', and metadata).
        chroma_results: Ranked list from Chroma (expects 'id', 'rank', and metadata).
        k: Smoothing constant (default 60).
        top_k: Maximum number of fused results to return.

    Returns:
        List of RRFResult sorted descending by rrf_score.
    """
    scores: dict[str, float] = {}
    doc_meta: dict[str, dict[str, Any]] = {}
    bm25_ranks: dict[str, int] = {}
    chroma_ranks: dict[str, int] = {}

    # Accumulate BM25 ranks
    for rank, item in enumerate(bm25_results):
        doc_id = str(item.get("id"))
        bm25_ranks[doc_id] = rank
        scores[doc_id] = scores.get(doc_id, 0.0) + (1.0 / (k + rank))
        if doc_id not in doc_meta:
            doc_meta[doc_id] = item

    # Accumulate Chroma ranks
    for rank, item in enumerate(chroma_results):
        doc_id = str(item.get("id"))
        chroma_ranks[doc_id] = rank
        scores[doc_id] = scores.get(doc_id, 0.0) + (1.0 / (k + rank))
        if doc_id not in doc_meta:
            doc_meta[doc_id] = item

    # Sort items descending by RRF score
    sorted_ids = sorted(scores.keys(), key=lambda doc_id: scores[doc_id], reverse=True)

    fused: list[RRFResult] = []
    for doc_id in sorted_ids[:top_k]:
        meta = doc_meta[doc_id]
        fused.append({
            "id": doc_id,
            "rrf_score": round(scores[doc_id], 6),
            "bm25_rank": bm25_ranks.get(doc_id),
            "chroma_rank": chroma_ranks.get(doc_id),
            "title": meta.get("title", ""),
            "service_type": meta.get("service_type", ""),
            "category": meta.get("category", ""),
            "content": meta.get("content", ""),
            "required_documents": meta.get("required_documents", []),
        })

    logger.info("Fused %d BM25 and %d Chroma items into %d RRF results.",
                len(bm25_results), len(chroma_results), len(fused))
    return fused
