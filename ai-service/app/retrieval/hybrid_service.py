"""
app/retrieval/hybrid_service.py

Unified Hybrid Retrieval service combining BM25 keyword search and Chroma vector search via RRF.
"""

import logging
from typing import Any

from app.retrieval.bm25 import get_bm25_retriever
from app.retrieval.chroma import get_chroma_retriever
from app.retrieval.rrf import compute_rrf, RRFResult

logger = logging.getLogger(__name__)


class HybridRetrievalService:
    """Combines BM25 and Chroma with Reciprocal Rank Fusion."""

    def __init__(self) -> None:
        self.bm25 = get_bm25_retriever()
        self.chroma = get_chroma_retriever()

    def search(
        self,
        query: str,
        top_k: int = 5,
        candidate_pool_size: int = 10,
    ) -> list[RRFResult]:
        """
        Executes hybrid search:
        1. BM25 search
        2. Chroma vector search
        3. RRF rank fusion
        """
        if not query.strip():
            return []

        logger.info("Hybrid search query: %r", query)
        bm25_results = self.bm25.retrieve(query, top_k=candidate_pool_size)
        chroma_results = self.chroma.retrieve(query, top_k=candidate_pool_size)

        fused = compute_rrf(
            bm25_results=bm25_results,
            chroma_results=chroma_results,
            top_k=top_k,
        )
        return fused


_singleton_hybrid: HybridRetrievalService | None = None


def get_hybrid_retrieval_service() -> HybridRetrievalService:
    """Returns singleton HybridRetrievalService."""
    global _singleton_hybrid
    if _singleton_hybrid is None:
        _singleton_hybrid = HybridRetrievalService()
    return _singleton_hybrid
