"""
app/retrieval/bm25.py

BM25 lexical/keyword retriever for legal requirements and document checklists.
Uses rank_bm25 with standard text normalization.
"""

import logging
import re
from typing import TypedDict

from rank_bm25 import BM25Okapi

from app.retrieval.corpus import LEGAL_KNOWLEDGE_CORPUS, LegalKnowledgeDoc

logger = logging.getLogger(__name__)


def _tokenize(text: str) -> list[str]:
    """Tokenize and normalize text into lowercase word tokens."""
    return re.findall(r"\w+", text.lower())


class BM25SearchResult(TypedDict):
    id: str
    title: str
    service_type: str
    category: str
    content: str
    required_documents: list[str]
    score: float
    rank: int


class BM25Retriever:
    """Lexical keyword retriever implementing BM25Okapi."""

    def __init__(self, corpus: list[LegalKnowledgeDoc] | None = None) -> None:
        self.corpus: list[LegalKnowledgeDoc] = corpus or LEGAL_KNOWLEDGE_CORPUS
        # Tokenize content + title + service_type for indexing
        self.tokenized_corpus: list[list[str]] = [
            _tokenize(f"{doc['title']} {doc['service_type']} {doc['content']}")
            for doc in self.corpus
        ]
        self.bm25: BM25Okapi = BM25Okapi(self.tokenized_corpus)
        logger.info("Initialized BM25Retriever with %d documents.", len(self.corpus))

    def retrieve(self, query: str, top_k: int = 5) -> list[BM25SearchResult]:
        """
        Rank corpus documents using BM25.
        Returns sorted results with 0-based rank.
        """
        tokens = _tokenize(query)
        if not tokens:
            return []

        scores = self.bm25.get_scores(tokens)
        ranked_indices = sorted(
            range(len(scores)),
            key=lambda idx: scores[idx],
            reverse=True,
        )

        results: list[BM25SearchResult] = []
        for rank, idx in enumerate(ranked_indices[:top_k]):
            doc = self.corpus[idx]
            results.append({
                "id": doc["id"],
                "title": doc["title"],
                "service_type": doc["service_type"],
                "category": doc["category"],
                "content": doc["content"],
                "required_documents": doc["required_documents"],
                "score": float(scores[idx]),
                "rank": rank,
            })

        return results


_singleton_bm25: BM25Retriever | None = None


def get_bm25_retriever() -> BM25Retriever:
    """Returns singleton BM25Retriever."""
    global _singleton_bm25
    if _singleton_bm25 is None:
        _singleton_bm25 = BM25Retriever()
    return _singleton_bm25
