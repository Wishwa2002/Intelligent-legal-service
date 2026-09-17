"""
tests/test_documents.py

Unit tests for the document analyze → validate → accept/reject loop.
These tests mock Gemini and the backend so they run without real API keys.

Tests cover all the behavioral examples from the implementation plan:
- Blurry document → rejected (confidence 0.42)
- Clear document → accepted (confidence 0.96)
- Wrong document type → rejected
- 3 attempts exceeded → HUMAN_REVIEW
- Medium confidence (0.78) → accepted_with_flag
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.agents.document_validation import _apply_threshold
from app.schemas.document import DocumentAnalysis


# ============================================================
# Test _apply_threshold (the core decision function)
# These tests prove Gemini's score goes through Python logic
# ============================================================

class MockSettings:
    high_confidence_threshold = 0.90
    medium_confidence_threshold = 0.70
    max_reupload_attempts_per_document = 3


def make_analysis(
    doc_type="NIC",
    confidence=0.96,
    readable=True,
    issues=None,
):
    return DocumentAnalysis(
        document_type=doc_type,
        classification_confidence=confidence,
        readable=readable,
        extracted_fields={"name": "John Silva"},
        missing_fields=[],
        issues=issues or [],
        requires_human_review=False,
        analysis_summary="Test analysis",
    )


def test_high_confidence_readable_correct_type_is_accepted():
    analysis = make_analysis(doc_type="NIC", confidence=0.96, readable=True)
    result = _apply_threshold(analysis, expected_type="NIC", settings=MockSettings())
    assert result == "ACCEPTED"


def test_blurry_document_is_rejected():
    """Example 1: confidence 0.42, unreadable → REJECTED"""
    analysis = make_analysis(
        doc_type="NIC", confidence=0.42, readable=False,
        issues=["image too blurry to read ID number and name fields"]
    )
    result = _apply_threshold(analysis, expected_type="NIC", settings=MockSettings())
    assert result == "REJECTED"


def test_wrong_document_type_is_rejected():
    """Example 2: correct confidence but wrong type → REJECTED"""
    analysis = make_analysis(doc_type="personal_photo", confidence=0.88, readable=True)
    result = _apply_threshold(analysis, expected_type="Proof of Address", settings=MockSettings())
    assert result == "REJECTED"


def test_medium_confidence_is_accepted_with_flag():
    """Example 4: confidence 0.78 → ACCEPTED_WITH_FLAG"""
    analysis = make_analysis(
        doc_type="Agreement Details", confidence=0.78, readable=True,
        issues=["some text faded in section 3"]
    )
    result = _apply_threshold(analysis, expected_type="Agreement Details", settings=MockSettings())
    assert result == "ACCEPTED_WITH_FLAG"


def test_confidence_below_medium_is_rejected():
    """confidence 0.65 < 0.70 → REJECTED"""
    analysis = make_analysis(doc_type="NIC", confidence=0.65, readable=True)
    result = _apply_threshold(analysis, expected_type="NIC", settings=MockSettings())
    assert result == "REJECTED"


def test_unreadable_high_confidence_still_rejected():
    """Even confidence=0.95 but readable=False → REJECTED (can't read the doc)"""
    analysis = make_analysis(doc_type="NIC", confidence=0.95, readable=False)
    result = _apply_threshold(analysis, expected_type="NIC", settings=MockSettings())
    assert result == "REJECTED"


# ============================================================
# Test document_validation_node state transitions
# ============================================================

@pytest.mark.asyncio
async def test_validation_node_accept_updates_state():
    """Accepted document sets status to 'accepted' in state."""
    from app.agents.document_validation import document_validation_node

    state = _make_state_with_analysis(
        doc_type="NIC", confidence=0.96, readable=True
    )

    with patch("app.agents.document_validation.get_backend_client") as mock_backend_fn:
        mock_backend = AsyncMock()
        mock_backend.update_file_status = AsyncMock()
        mock_backend_fn.return_value = mock_backend

        with patch("app.agents.document_validation.get_gemini_service"):
            result = await document_validation_node(state)

    assert result["document_statuses"]["NIC"]["status"] == "accepted"
    assert any(m["content"].startswith("✅") for m in result["messages"])
    assert any(e["event"] == "DOCUMENT_ACCEPTED" for e in result["audit_log"])


@pytest.mark.asyncio
async def test_validation_node_reject_increments_retry():
    """Rejected document increments retry_count and adds rejection message."""
    from app.agents.document_validation import document_validation_node

    state = _make_state_with_analysis(
        doc_type="NIC", confidence=0.42, readable=False,
        issues=["image too blurry"]
    )

    with patch("app.agents.document_validation.get_backend_client") as mock_backend_fn:
        mock_backend = AsyncMock()
        mock_backend.update_file_status = AsyncMock()
        mock_backend_fn.return_value = mock_backend

        with patch("app.agents.document_validation.get_gemini_service") as mock_gemini_fn:
            mock_gemini = AsyncMock()
            mock_gemini.generate_rejection_message = AsyncMock(
                return_value="Your NIC photo is too blurry. Please re-upload a clearer photo."
            )
            mock_gemini_fn.return_value = mock_gemini

            result = await document_validation_node(state)

    assert result["document_statuses"]["NIC"]["status"] == "rejected"
    assert result["document_statuses"]["NIC"]["retry_count"] == 1
    assert any("❌" in m["content"] for m in result["messages"])
    assert any(e["event"] == "DOCUMENT_REJECTED" for e in result["audit_log"])


@pytest.mark.asyncio
async def test_max_retries_triggers_human_review():
    """Example 3: After 3 rejections, human_review_triggered is set."""
    from app.agents.document_validation import document_validation_node

    # Simulate doc already rejected twice (retry_count=2)
    state = _make_state_with_analysis(
        doc_type="Agreement Details", confidence=0.28, readable=False,
        issues=["unrecognizable format"], retry_count=2
    )

    with patch("app.agents.document_validation.get_backend_client") as mock_backend_fn:
        mock_backend = AsyncMock()
        mock_backend.update_file_status = AsyncMock()
        mock_backend_fn.return_value = mock_backend

        with patch("app.agents.document_validation.get_gemini_service"):
            result = await document_validation_node(state)

    assert result["human_review_triggered"] is True
    assert any(e["decision"] == "HUMAN_REVIEW" for e in result["audit_log"])


@pytest.mark.asyncio
async def test_medium_confidence_sets_flag():
    """Example 4: confidence 0.78 → accepted_with_flag, not rejected."""
    from app.agents.document_validation import document_validation_node

    state = _make_state_with_analysis(
        doc_type="Agreement Details", confidence=0.78, readable=True,
        issues=["some text faded in section 3"]
    )

    with patch("app.agents.document_validation.get_backend_client") as mock_backend_fn:
        mock_backend = AsyncMock()
        mock_backend.update_file_status = AsyncMock()
        mock_backend_fn.return_value = mock_backend

        with patch("app.agents.document_validation.get_gemini_service"):
            result = await document_validation_node(state)

    assert result["document_statuses"]["Agreement Details"]["status"] == "accepted_with_flag"
    assert any("⚠️" in m["content"] or "flagged" in m["content"].lower() for m in result["messages"])
    assert any(e["event"] == "DOCUMENT_ACCEPTED_FLAGGED" for e in result["audit_log"])


@pytest.mark.asyncio
async def test_validation_node_provides_missing_document_upload_buttons():
    """When documents remain, action_options contains upload buttons for missing documents."""
    from app.agents.document_validation import document_validation_node

    state = _make_state_with_analysis(
        doc_type="NIC", confidence=0.95, readable=True, issues=[]
    )
    state["required_documents"] = ["NIC", "Salary Slip"]
    state["document_statuses"]["Salary Slip"] = {
        "doc_type": "Salary Slip", "file_id": None, "status": "pending", "retry_count": 0
    }

    with patch("app.agents.document_validation.get_backend_client") as mock_backend_fn:
        mock_backend = AsyncMock()
        mock_backend.update_file_status = AsyncMock()
        mock_backend_fn.return_value = mock_backend

        result = await document_validation_node(state)

    assert result["phase"] == "WAITING_FOR_DOCUMENTS"
    assert result["pending_action_options"] == ["📄 Upload Salary Slip"]
    last_msg = result["messages"][-1]
    assert "Salary Slip" in last_msg["content"]
    assert last_msg.get("action_options") == ["📄 Upload Salary Slip"]


@pytest.mark.asyncio
async def test_clerk_recommendation_greets_and_notifies_after_admin_approval():
    """After all documents are accepted, agent greets client, directs to Requests page, and notes Admin Approval notification."""
    from app.agents.clerk_recommendation import clerk_recommendation_node
    from app.schemas.clerk import ClerkCandidate, ClerkRecommendation

    state = _make_state_with_analysis(
        doc_type="NIC", confidence=0.95, readable=True, issues=[]
    )
    state["client_name"] = "Kasun"
    state["request_id"] = 42

    candidates = [
        ClerkCandidate(
            clerk_id=7, name="Sarah Jenkins", department="Documentation",
            contact="sarah@legal.com", active_request_count=1
        )
    ]
    recommendation = ClerkRecommendation(
        recommended_clerk_id="7",
        confidence=0.95,
        reason="Has lowest workload and specializes in Rental Agreement."
    )

    with patch("app.agents.clerk_recommendation.get_eligible_clerks", return_value=candidates), \
         patch("app.agents.clerk_recommendation.get_gemini_service") as mock_gemini_fn, \
         patch("app.services.backend_client.get_backend_client") as mock_backend_fn:

        mock_gemini = AsyncMock()
        mock_gemini.recommend_clerk = AsyncMock(return_value=recommendation)
        mock_gemini_fn.return_value = mock_gemini

        mock_backend = AsyncMock()
        mock_backend.assign_clerk = AsyncMock()
        mock_backend_fn.return_value = mock_backend

        result = await clerk_recommendation_node(state)

    assert result["phase"] == "ADMIN_APPROVAL_PENDING"
    last_msg = result["messages"][-1]
    content = last_msg["content"]

    # Check greeting addressing client by name
    assert "Kasun" in content
    # Check instruction to check Requests page
    assert "Requests" in content
    # Check Admin Approval notification
    assert "Admin Approval" in content
    assert "notified" in content
    # Check clerk name
    assert "Sarah Jenkins" in content
    # Check action buttons
    assert "📋 Go to My Requests" in last_msg["action_options"]
    assert "📁 View All Services" in last_msg["action_options"]


@pytest.mark.asyncio
async def test_accepted_document_explicitly_confirms_and_shows_balance_documents():
    """Agent must state 'You uploaded ..., and it has been Accepted' and list balance documents with buttons."""
    from app.agents.document_validation import document_validation_node

    state = _make_state_with_analysis(
        doc_type="Tenancy Agreement", confidence=0.96, readable=True, issues=[]
    )
    state["required_documents"] = ["Tenancy Agreement", "Property Deed", "Utility Bill"]
    state["document_statuses"]["Property Deed"] = {
        "doc_type": "Property Deed", "file_id": None, "status": "pending", "retry_count": 0
    }
    state["document_statuses"]["Utility Bill"] = {
        "doc_type": "Utility Bill", "file_id": None, "status": "pending", "retry_count": 0
    }

    with patch("app.agents.document_validation.get_backend_client") as mock_backend_fn:
        mock_backend = AsyncMock()
        mock_backend.update_file_status = AsyncMock()
        mock_backend_fn.return_value = mock_backend

        result = await document_validation_node(state)

    assert result["phase"] == "WAITING_FOR_DOCUMENTS"
    last_msg = result["messages"][-1]
    content = last_msg["content"]

    # Check explicit confirmation of upload and acceptance
    assert "You uploaded **Tenancy Agreement**, and it has been **Accepted**!" in content
    # Check balance documents section
    assert "Balance Documents Required (2 remaining):" in content
    assert "Property Deed" in content
    assert "Utility Bill" in content
    # Check balance document buttons
    assert result["pending_action_options"] == ["📄 Upload Property Deed", "📄 Upload Utility Bill"]
    assert last_msg["action_options"] == ["📄 Upload Property Deed", "📄 Upload Utility Bill"]


@pytest.mark.asyncio
async def test_rejected_document_explicitly_confirms_not_accepted():
    """Agent must state 'You uploaded ..., and it was Not Accepted' and provide re-upload button."""
    from app.agents.document_validation import document_validation_node

    state = _make_state_with_analysis(
        doc_type="NIC", confidence=0.45, readable=False, issues=["Image too blurry"]
    )
    state["required_documents"] = ["NIC"]

    with patch("app.agents.document_validation.get_backend_client") as mock_backend_fn:
        mock_backend = AsyncMock()
        mock_backend.update_file_status = AsyncMock()
        mock_backend_fn.return_value = mock_backend

        with patch("app.agents.document_validation.get_gemini_service") as mock_gemini_fn:
            mock_gemini = AsyncMock()
            mock_gemini.generate_rejection_message = AsyncMock(
                return_value="The document photo is unreadable."
            )
            mock_gemini_fn.return_value = mock_gemini

            result = await document_validation_node(state)

    last_msg = result["messages"][-1]
    content = last_msg["content"]
    assert "You uploaded **NIC**, and it was **Not Accepted**." in content
    assert last_msg["action_options"] == ["📄 Upload NIC"]



# ============================================================
# Helpers
# ============================================================

def _make_state_with_analysis(
    doc_type: str,
    confidence: float,
    readable: bool,
    issues: list | None = None,
    retry_count: int = 0,
) -> dict:
    analysis = DocumentAnalysis(
        document_type=doc_type,
        classification_confidence=confidence,
        readable=readable,
        extracted_fields={"name": "Test User"},
        missing_fields=[],
        issues=issues or [],
        requires_human_review=confidence < 0.90,
        analysis_summary="Test",
    )
    return {
        "session_id": "test-session",
        "workflow_id": "test-workflow",
        "request_id": 1,
        "customer_id": "test-customer",
        "service_id": 1,
        "service_name": "Rental Agreement",
        "phase": "ANALYZING",
        "required_documents": [doc_type],
        "document_statuses": {
            doc_type: {
                "doc_type": doc_type,
                "file_id": 42,
                "status": "analyzing",
                "retry_count": retry_count,
                "last_analysis": analysis.model_dump(),
                "rejection_reason": None,
            }
        },
        "messages": [],
        "document_summary": None,
        "recommended_clerk_id": None,
        "recommendation_reason": None,
        "excluded_clerk_ids": [],
        "pending_approval_clerk_id": None,
        "last_admin_decision": None,
        "iteration_count": 0,
        "human_review_triggered": False,
        "human_review_reason": None,
        "audit_log": [],
    }
