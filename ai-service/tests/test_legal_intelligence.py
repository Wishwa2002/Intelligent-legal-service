import pytest

from fastapi.testclient import TestClient
from pydantic import ValidationError
from app.api.routes import legal_intelligence_routes as legal_routes

from app.main import create_app
from app.agents.legal_intelligence import agent as legal_agent
from app.agents.legal_intelligence.classifier import classify_query
from app.agents.legal_intelligence.models import (
    LegalIntelligenceRequest,
    LegalQueryIntent,
)

# ---------------------------------------------------------
# M4-TC21
# Positive case:
# Legislation-related query should be classified as LAW.
# ---------------------------------------------------------

def test_classify_query_law_returns_law_intent():
    # Arrange
    query = "What does the Employment Act say about salary?"

    # Act
    result = classify_query(query)

    # Assert
    assert result == LegalQueryIntent.LAW

# ---------------------------------------------------------
# M4-TC22
# Positive case:
# Court-related query should be classified as COURT_CASE.
# ---------------------------------------------------------

def test_classify_query_court_case_returns_court_case_intent():
    # Arrange
    query = "Find court cases about Article 140."

    # Act
    result = classify_query(query)

    # Assert
    assert result == LegalQueryIntent.COURT_CASE


# ---------------------------------------------------------
# M4-TC23
# Positive mixed-intent case:
# Explicit request for both laws and court cases
# should be classified as MIXED.
# ---------------------------------------------------------

def test_classify_query_explicit_laws_and_cases_returns_mixed_intent():
    # Arrange
    query = "Find laws and court cases about unfair dismissal."

    # Act
    result = classify_query(query)

    # Assert
    assert result == LegalQueryIntent.MIXED


# ---------------------------------------------------------
# M4-TC24
# Boundary / priority case:
# Court-related intent must take priority over
# legislation references inside the same query.
# ---------------------------------------------------------

def test_classify_query_case_with_article_reference_returns_court_case():
    # Arrange
    query = "Find court cases about Article 140."

    # Act
    result = classify_query(query)

    # Assert
    assert result == LegalQueryIntent.COURT_CASE


# ---------------------------------------------------------
# M4-TC25
# Negative case:
# Unrelated query should be classified as UNKNOWN.
# ---------------------------------------------------------

def test_classify_query_unrelated_text_returns_unknown():
    # Arrange
    query = "What is the weather like today?"

    # Act
    result = classify_query(query)

    # Assert
    assert result == LegalQueryIntent.UNKNOWN


# ---------------------------------------------------------
# M4-TC26
# Boundary / negative validation:
# Query shorter than 3 characters must be rejected.
# ---------------------------------------------------------

def test_legal_intelligence_request_too_short_raises_validation_error():
    # Arrange
    query = "ab"

    # Act + Assert
    try:
        LegalIntelligenceRequest(query=query)
        assert False, "Expected ValidationError for query shorter than 3 characters"
    except ValidationError as exc:
        assert "query" in str(exc)


# ---------------------------------------------------------
# M4-TC27
# Boundary / positive validation:
# Query with exactly 3 characters must be accepted.
# ---------------------------------------------------------

def test_legal_intelligence_request_minimum_length_is_accepted():
    # Arrange
    query = "law"

    # Act
    request = LegalIntelligenceRequest(query=query)

    # Assert
    assert request.query == "law"



# ---------------------------------------------------------
# M4-TC28
# Boundary / positive validation:
# Query with exactly 2000 characters must be accepted.
# ---------------------------------------------------------

def test_legal_intelligence_request_maximum_length_is_accepted():
    # Arrange
    query = "a" * 2000

    # Act
    request = LegalIntelligenceRequest(query=query)

    # Assert
    assert len(request.query) == 2000


# ---------------------------------------------------------
# M4-TC29
# Boundary / negative validation:
# Query longer than 2000 characters must be rejected.
# ---------------------------------------------------------

def test_legal_intelligence_request_over_maximum_length_raises_validation_error():
    # Arrange
    query = "a" * 2001

    # Act + Assert
    try:
        LegalIntelligenceRequest(query=query)
        assert False, "Expected ValidationError for query longer than 2000 characters"
    except ValidationError as exc:
        assert "query" in str(exc)


# ---------------------------------------------------------
# M4-TC30
# Failure / recovery:
# A transient retrieval failure should fail the current
# request, but a later retry must still complete normally.
# ---------------------------------------------------------

@pytest.mark.asyncio
async def test_legal_intelligence_agent_recovers_after_transient_retrieval_failure(
    monkeypatch,
):
    # Arrange
    call_count = 0

    async def fake_execute_research_task(task):
        nonlocal call_count
        call_count += 1

        # First retrieval attempt fails.
        if call_count == 1:
            raise RuntimeError(
                "Temporary retrieval service failure"
            )

        # Retry succeeds with no retrieved evidence.
        return []

    async def fake_generate_legal_summary(
        query,
        sources,
    ):
        return "Legal research completed successfully."

    def fake_validate_legal_response(
        sources,
        citations,
        answer,
    ):
        return (
            0.75,   # confidence
            [],     # validation errors
            False,  # human review
        )

    monkeypatch.setattr(
        legal_agent,
        "execute_research_task",
        fake_execute_research_task,
    )

    monkeypatch.setattr(
        legal_agent,
        "generate_legal_summary",
        fake_generate_legal_summary,
    )

    monkeypatch.setattr(
        legal_agent,
        "validate_legal_response",
        fake_validate_legal_response,
    )

    query = "What does the Employment Act say?"

    # Act + Assert - first attempt fails safely
    with pytest.raises(
        RuntimeError,
        match="Temporary retrieval service failure",
    ):
        await legal_agent.run_legal_intelligence_agent(
            query
        )

    # Act - retry after temporary failure
    response = (
        await legal_agent.run_legal_intelligence_agent(
            query
        )
    )

    # Assert - later request still succeeds
    assert response.query == query
    assert response.intent == LegalQueryIntent.LAW

    assert (
        response.answer
        == "Legal research completed successfully."
    )

    assert response.confidence == 0.75
    assert response.validation_errors == []
    assert response.requires_human_review is False

# ---------------------------------------------------------
# M4-TC31
# Integration:
# FastAPI route -> Legal Intelligence Agent -> HTTP response
# ---------------------------------------------------------

def test_legal_intelligence_api_integration_returns_valid_response(
    monkeypatch,
):
    async def fake_execute_research_task(task):
        return []

    async def fake_generate_legal_summary(
        query,
        sources,
    ):
        return "Integrated legal research response."

    def fake_validate_legal_response(
        sources,
        citations,
        answer,
    ):
        return (
            0.80,
            [],
            False,
        )

    monkeypatch.setattr(
        legal_agent,
        "execute_research_task",
        fake_execute_research_task,
    )

    monkeypatch.setattr(
        legal_agent,
        "generate_legal_summary",
        fake_generate_legal_summary,
    )

    monkeypatch.setattr(
        legal_agent,
        "validate_legal_response",
        fake_validate_legal_response,
    )

    app = create_app()

    with TestClient(app) as client:
        response = client.post(
            "/api/legal-intelligence/ask",
            json={
                "query":
                    "What law applies to cybercrime in Sri Lanka?"
            },
        )

    assert response.status_code == 200

    data = response.json()

    assert data["query"] == (
        "What law applies to cybercrime in Sri Lanka?"
    )

    assert data["intent"] == "law"

    assert (
        data["answer"]
        == "Integrated legal research response."
    )

    assert data["confidence"] == 0.80
    assert data["requires_human_review"] is False
    assert data["validation_errors"] == []



# ---------------------------------------------------------
# M4-TC32
# Security:
# Invalid admin key must not allow Parliament ingestion.
# ---------------------------------------------------------

def test_parliament_ingestion_invalid_admin_key_returns_403(
    monkeypatch,
):
    # Arrange
    monkeypatch.setenv(
        "LEGAL_INGESTION_ADMIN_KEY",
        "correct-test-key",
    )

    ingestion_calls = 0

    async def fake_ingest_parliament_acts():
        nonlocal ingestion_calls
        ingestion_calls += 1

        return {
            "discovered": 1,
            "saved": 1,
            "rejected": 0,
            "output_file": "test.json",
            "rejected_documents": [],
            "database_saved": 1,
            "database_failed": 0,
            "database_errors": [],
        }

    monkeypatch.setattr(
        legal_routes,
        "ingest_parliament_acts",
        fake_ingest_parliament_acts,
    )

    app = create_app()

    # Act
    with TestClient(app) as client:
        response = client.post(
            "/api/legal-intelligence/ingest/parliament-acts",
            headers={
                "x-internal-admin-key":
                    "wrong-test-key",
            },
        )

    # Assert
    assert response.status_code == 403

    assert response.json()["detail"] == (
        "Admin access required."
    )

    # Unauthorized request must never reach ingestion logic.
    assert ingestion_calls == 0


# ---------------------------------------------------------
# M4-TC33
# Security / configuration failure:
# Ingestion must be unavailable when the security key
# is not configured on the server.
# ---------------------------------------------------------

def test_parliament_ingestion_without_configured_key_returns_503(
    monkeypatch,
):
    # Arrange
    monkeypatch.delenv(
        "LEGAL_INGESTION_ADMIN_KEY",
        raising=False,
    )

    ingestion_calls = 0

    async def fake_ingest_parliament_acts():
        nonlocal ingestion_calls
        ingestion_calls += 1

        return {
            "discovered": 1,
            "saved": 1,
            "rejected": 0,
            "output_file": "test.json",
            "rejected_documents": [],
            "database_saved": 1,
            "database_failed": 0,
            "database_errors": [],
        }

    monkeypatch.setattr(
        legal_routes,
        "ingest_parliament_acts",
        fake_ingest_parliament_acts,
    )

    app = create_app()

    # Act
    with TestClient(app) as client:
        response = client.post(
            "/api/legal-intelligence/ingest/parliament-acts",
        )

    # Assert
    assert response.status_code == 503

    assert response.json()["detail"] == (
        "Legal ingestion security key is not configured."
    )

    # Ingestion must not run without security configuration.
    assert ingestion_calls == 0
