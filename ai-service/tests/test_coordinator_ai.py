from app.agents.coordinator.router import route_next_step
import pytest

from app.agents.coordinator.planner import planner_node
from app.agents.coordinator.replanner import replanner_node
from app.agents.coordinator.validator import validator_node
from app.agents.coordinator import graph as coordinator_graph
# ---------------------------------------------------------
# M4-TC34
# Positive / multi-agent planning:
# Property request requiring lawyer, meeting, and deed
# support should create all required specialist steps.
# ---------------------------------------------------------

@pytest.mark.asyncio
async def test_coordinator_planner_creates_required_multi_agent_plan():
    # Arrange
    state = {
        "service_request_id": "test-001",
        "title": "Property legal assistance",
        "description": (
            "I have a dispute about ownership of family land. "
            "I need legal advice, want to meet a lawyer, "
            "and need help with deed documents."
        ),
        "request_type": "Legal Consultation",
        "priority": "Urgent",
        "retry_count": 0,
        "trace": [],
    }

    # Act
    result = await planner_node(state)

    # Assert
    assert (
        result["legal_category"]
        == "Real Estate & Property Law"
    )

    agents = [
        step["agent"]
        for step in result["plan"]
    ]

    assert "LawyerRecommendationAgent" in agents
    assert "SchedulingAgent" in agents
    assert "DocumentationClerkAgent" in agents

    assert agents.count(
        "PlanningCoordinatorAgent"
    ) == 2

    actions = [
        step["action"]
        for step in result["plan"]
    ]

    assert "validate_results" in actions
    assert "request_human_approval" in actions

    assert result["current_step"] == 0

    assert result["trace"][-1]["event"] == (
        "PLAN_CREATED"
    )

# ---------------------------------------------------------
# M4-TC35
# Security / safe routing:
# Unknown actions must not execute arbitrary coordinator logic.
# ---------------------------------------------------------

def test_coordinator_router_unknown_action_safely_finishes():
    state = {
        "plan": [
            {
                "order": 1,
                "agent": "UnknownAgent",
                "action": "execute_arbitrary_code",
                "status": "Pending",
            }
        ],
        "current_step": 0,
    }

    result = route_next_step(state)

    assert result == "finish"

# ---------------------------------------------------------
# M4-TC36
# Failure / recovery:
# A retryable scheduling validation failure should restart
# from the SchedulingAgent step.
# ---------------------------------------------------------

@pytest.mark.asyncio
async def test_coordinator_replanner_retries_scheduling_failure():
    state = {
        "plan": [
            {
                "order": 1,
                "agent": "LawyerRecommendationAgent",
                "action": "recommend_lawyers",
                "status": "Completed",
            },
            {
                "order": 2,
                "agent": "SchedulingAgent",
                "action": "find_available_slots",
                "status": "Failed",
            },
            {
                "order": 3,
                "agent": "PlanningCoordinatorAgent",
                "action": "validate_results",
                "status": "FailedValidation",
            },
            {
                "order": 4,
                "agent": "PlanningCoordinatorAgent",
                "action": "request_human_approval",
                "status": "Pending",
            },
        ],
        "current_step": 3,
        "retry_count": 0,
        "validation_passed": False,
        "validation_errors": [
            "Scheduling Agent failed."
        ],
        "trace": [],
    }

    result = await replanner_node(state)

    assert result["retry_count"] == 1
    assert result["current_step"] == 1

    assert result["plan"][1]["status"] == "Pending"

    validate_step = next(
        step
        for step in result["plan"]
        if step["action"] == "validate_results"
    )

    approval_step = next(
        step
        for step in result["plan"]
        if step["action"] == "request_human_approval"
    )

    assert validate_step["status"] == "Pending"
    assert approval_step["status"] == "Pending"

    assert result["validation_passed"] is False

    assert result["trace"][-1]["event"] == (
        "REPLAN_TRIGGERED"
    )

    assert result["trace"][-1]["retry_agent"] == (
        "SchedulingAgent"
    )

# ---------------------------------------------------------
# M4-TC37
# Failure boundary:
# Coordinator must stop automatic retries when the retry
# limit is reached and require human review.
# ---------------------------------------------------------

@pytest.mark.asyncio
async def test_coordinator_replanner_stops_at_retry_limit():
    state = {
        "plan": [
            {
                "order": 1,
                "agent": "SchedulingAgent",
                "action": "find_available_slots",
                "status": "Failed",
            },
            {
                "order": 2,
                "agent": "PlanningCoordinatorAgent",
                "action": "validate_results",
                "status": "FailedValidation",
            },
        ],
        "current_step": 1,
        "retry_count": 2,
        "validation_passed": False,
        "validation_errors": [
            "Scheduling Agent failed."
        ],
        "trace": [],
    }

    result = await replanner_node(state)

    assert result["retry_count"] == 2

    assert result["final_outcome"]["status"] == (
        "NeedsHumanReview"
    )

    assert result["final_outcome"]["reason"] == (
        "Coordinator retry limit reached."
    )

    assert result["trace"][-1]["event"] == (
        "REPLAN_LIMIT_REACHED"
    )


# ---------------------------------------------------------
# M4-TC38
# Negative validation:
# If the plan requires the LawyerRecommendationAgent but
# no lawyer result exists, validation must fail.
# ---------------------------------------------------------

@pytest.mark.asyncio
async def test_coordinator_validator_fails_when_lawyer_result_missing():
    state = {
        "plan": [
            {
                "order": 1,
                "agent": "LawyerRecommendationAgent",
                "action": "recommend_lawyers",
                "status": "Completed",
            },
            {
                "order": 2,
                "agent": "PlanningCoordinatorAgent",
                "action": "validate_results",
                "status": "Pending",
            },
        ],
        "current_step": 1,
        "trace": [],
    }

    result = await validator_node(state)

    assert result["validation_passed"] is False

    assert (
        "Lawyer recommendation result is missing."
        in result["validation_errors"]
    )

    assert (
        result["plan"][1]["status"]
        == "FailedValidation"
    )

    assert result["current_step"] == 2

    assert result["trace"][-1]["event"] == (
        "VALIDATION_COMPLETED"
    )


# ---------------------------------------------------------
# M4-TC39
# Positive validation:
# Valid specialist outputs should pass coordinator validation.
# ---------------------------------------------------------

@pytest.mark.asyncio
async def test_coordinator_validator_passes_with_valid_results():
    state = {
        "plan": [
            {
                "order": 1,
                "agent": "LawyerRecommendationAgent",
                "action": "recommend_lawyers",
                "status": "Completed",
            },
            {
                "order": 2,
                "agent": "SchedulingAgent",
                "action": "find_available_slots",
                "status": "Completed",
            },
            {
                "order": 3,
                "agent": "DocumentationClerkAgent",
                "action": "analyze_document_requirements",
                "status": "Completed",
            },
            {
                "order": 4,
                "agent": "PlanningCoordinatorAgent",
                "action": "validate_results",
                "status": "Pending",
            },
        ],
        "current_step": 3,

        "lawyer_result": {
            "status": "Completed",
            "recommendations": [
                {"lawyer_id": "L001"}
            ],
        },

        "scheduling_result": {
            "status": "Completed",
            "session_id": "session-001",
            "phase": "MATCHING",
            "messages": [
                {
                    "role": "agent",
                    "content": "Available attorneys were found.",
                }
            ],
        },

        "documentation_result": {
            "status": "Completed",
            "completeness": {
                "status": "COMPLETE",
                "missing_documents": [],
            },
            "clerk_recommendations": [
                {
                    "clerk_id": "C001",
                    "name": "Test Clerk",
                }
            ],
        },

        "trace": [],
    }

    result = await validator_node(state)

    assert result["validation_passed"] is True
    assert result["validation_errors"] == []

    assert result["plan"][3]["status"] == "Completed"

    assert result["current_step"] == 4

    assert result["trace"][-1]["event"] == (
        "VALIDATION_COMPLETED"
    )


# ---------------------------------------------------------
# M4-TC40
# Integration:
# Coordinator graph should plan, execute specialist steps,
# validate results, and stop at the human approval gate.
# ---------------------------------------------------------

@pytest.mark.asyncio
async def test_coordinator_graph_reaches_human_approval(
    monkeypatch,
):
    async def fake_lawyer_node(state):
        state = dict(state)
        current_step = state["current_step"]

        state["lawyer_result"] = {
            "status": "Completed",
            "recommendations": [
                {"lawyer_id": "L001"}
            ],
            "recommendation_count": 1,
        }

        state["plan"][current_step]["status"] = "Completed"
        state["current_step"] = current_step + 1

        state.setdefault("trace", []).append({
            "event": "LAWYER_AGENT_COMPLETED",
        })

        return state

    async def fake_scheduling_node(state):
        state = dict(state)
        current_step = state["current_step"]

        state["scheduling_result"] = {
            "status": "Completed",
            "session_id": "session-001",
            "phase": "MATCHING",
            "messages": [
                {
                    "role": "agent",
                    "content": "Available attorneys were found.",
                }
            ],
        }

        state["plan"][current_step]["status"] = "Completed"
        state["current_step"] = current_step + 1

        state.setdefault("trace", []).append({
            "event": "SCHEDULING_AGENT_COMPLETED",
        })

        return state

    async def fake_documentation_node(state):
        state = dict(state)
        current_step = state["current_step"]

        state["documentation_result"] = {
            "status": "Completed",
            "completeness": {
                "status": "COMPLETE",
                "missing_documents": [],
            },
            "clerk_recommendations": [
                {
                    "clerk_id": "C001",
                    "name": "Test Clerk",
                }
            ],
        }

        state["plan"][current_step]["status"] = "Completed"
        state["current_step"] = current_step + 1

        state.setdefault("trace", []).append({
            "event": "DOCUMENTATION_AGENT_COMPLETED",
        })

        return state

    monkeypatch.setattr(
        coordinator_graph,
        "lawyer_node",
        fake_lawyer_node,
    )

    monkeypatch.setattr(
        coordinator_graph,
        "scheduling_node",
        fake_scheduling_node,
    )

    monkeypatch.setattr(
        coordinator_graph,
        "documentation_node",
        fake_documentation_node,
    )

    graph = coordinator_graph.build_coordinator_graph()

    initial_state = {
        "service_request_id": "integration-001",
        "title": "Property legal assistance",
        "description": (
            "I need legal advice from a lawyer, "
            "want to meet for an appointment, "
            "and need help with deed documents."
        ),
        "request_type": "Legal Consultation",
        "priority": "Urgent",
        "retry_count": 0,
        "trace": [],
    }

    result = await graph.ainvoke(initial_state)

    assert (
        result["legal_category"]
        == "Real Estate & Property Law"
    )

    assert result["validation_passed"] is True
    assert result["validation_errors"] == []

    assert result["approval_status"] == (
        "AwaitingApproval"
    )

    assert result["workflow_status"] == (
        "AwaitingApproval"
    )

    events = [
        item["event"]
        for item in result["trace"]
    ]

    assert "PLAN_CREATED" in events
    assert "LAWYER_AGENT_COMPLETED" in events
    assert "SCHEDULING_AGENT_COMPLETED" in events
    assert "DOCUMENTATION_AGENT_COMPLETED" in events
    assert "VALIDATION_COMPLETED" in events
    assert "HUMAN_APPROVAL_REQUIRED" in events