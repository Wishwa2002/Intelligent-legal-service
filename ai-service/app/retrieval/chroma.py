"""
app/retrieval/chroma.py

Chroma vector/semantic retriever for legal document requirements and checklists.
Initializes an in-memory collection populated from the legal knowledge corpus.
Uses a zero-download fast deterministic embedding function for instant offline performance.
"""

import hashlib
import json
import logging
import math
from typing import TypedDict

import chromadb
from chromadb.api.models.Collection import Collection
from chromadb.api.types import Documents, EmbeddingFunction, Embeddings

from app.retrieval.corpus import LEGAL_KNOWLEDGE_CORPUS, LegalKnowledgeDoc

logger = logging.getLogger(__name__)


class FastDeterministicEmbeddingFunction(EmbeddingFunction[Documents]):
    """
    Fast, deterministic 128-dimensional embedding function based on term-frequency
    and md5 feature hashing with L2-normalization.
    Zero external model downloads, instant initialization, 100% offline-ready.
    """

    def __init__(self, dim: int = 128) -> None:
        self.dim = dim

    def name(self) -> str:
        return "fast_deterministic_hash"

    def __call__(self, input: Documents) -> Embeddings:

        embeddings: Embeddings = []
        for text in input:
            words = text.lower().split()
            vec = [0.0] * self.dim
            for w in words:
                h = int(hashlib.md5(w.encode("utf-8")).hexdigest(), 16) % self.dim
                vec[h] += 1.0
            norm = math.sqrt(sum(x * x for x in vec))
            if norm > 0:
                vec = [x / norm for x in vec]
            embeddings.append(vec)
        return embeddings


class ChromaSearchResult(TypedDict):
    id: str
    title: str
    service_type: str
    category: str
    content: str
    required_documents: list[str]
    distance: float
    rank: int


class ChromaRetriever:
    """Semantic vector retriever using ChromaDB."""

    def __init__(self, corpus: list[LegalKnowledgeDoc] | None = None) -> None:
        self.corpus: list[LegalKnowledgeDoc] = corpus or LEGAL_KNOWLEDGE_CORPUS
        self.client = chromadb.Client()
        self.embedding_fn = FastDeterministicEmbeddingFunction(dim=128)
        self.collection_name = "legal_requirements"

        # Reset or create collection
        try:
            self.client.delete_collection(name=self.collection_name)
        except Exception:
            pass

        self.collection: Collection = self.client.create_collection(
            name=self.collection_name,
            embedding_function=self.embedding_fn,
            metadata={"description": "Official legal service requirements and checklists"},
        )
        self._index_corpus()
        logger.info("Initialized ChromaRetriever with %d indexed items.", len(self.corpus))

    def _index_corpus(self) -> None:
        ids = [doc["id"] for doc in self.corpus]
        documents = [
            f"{doc['title']}. Category: {doc['category']}. Service: {doc['service_type']}. {doc['content']}"
            for doc in self.corpus
        ]
        metadatas = [
            {
                "title": doc["title"],
                "service_type": doc["service_type"],
                "category": doc["category"],
                "required_documents_json": json.dumps(doc["required_documents"]),
            }
            for doc in self.corpus
        ]
        self.collection.add(
            ids=ids,
            documents=documents,
            metadatas=metadatas,
        )

    def retrieve(self, query: str, top_k: int = 5) -> list[ChromaSearchResult]:
        """
        Query ChromaDB for semantically similar documents.
        Returns sorted results with 0-based rank.
        """
        if not query.strip():
            return []

        limit = min(top_k, len(self.corpus))
        res = self.collection.query(
            query_texts=[query],
            n_results=limit,
        )

        results: list[ChromaSearchResult] = []
        if not res or not res.get("ids") or not res["ids"][0]:
            return results

        ids = res["ids"][0]
        distances = res["distances"][0] if res.get("distances") else [0.0] * len(ids)
        documents = res["documents"][0] if res.get("documents") else [""] * len(ids)
        metadatas = res["metadatas"][0] if res.get("metadatas") else [{}] * len(ids)

        for rank, doc_id in enumerate(ids):
            meta = metadatas[rank] or {}
            raw_req = meta.get("required_documents_json", "[]")
            try:
                req_docs = json.loads(raw_req)
            except Exception:
                req_docs = []

            results.append({
                "id": doc_id,
                "title": meta.get("title", ""),
                "service_type": meta.get("service_type", ""),
                "category": meta.get("category", ""),
                "content": documents[rank],
                "required_documents": req_docs,
                "distance": float(distances[rank]),
                "rank": rank,
            })

        return results


_singleton_chroma: ChromaRetriever | None = None


def get_chroma_retriever() -> ChromaRetriever:
    """Returns singleton ChromaRetriever."""
    global _singleton_chroma
    if _singleton_chroma is None:
        _singleton_chroma = ChromaRetriever()
    return _singleton_chroma
