import asyncio
import math
import statistics
import time

import httpx
import pytest

from app.main import create_app
from app.api.routes import (
    legal_intelligence_routes as legal_routes,
)
from app.agents.coordinator import graph as coordinator_graph

# ---------------------------------------------------------
# M4-PERF01
# Performance:
# Legal Intelligence API - 20 concurrent requests.
#
# Uses one asynchronous HTTP client against the FastAPI
# ASGI application so client startup/shutdown overhead is
# not included in every individual request measurement.
# ---------------------------------------------------------

@pytest.mark.asyncio
async def test_legal_intelligence_api_performance_20_concurrent(
    monkeypatch,
):
    async def fake_run_legal_intelligence_agent(query):
        return {
            "query": query,
            "intent": "law",
            "answer": "Performance test response.",
            "laws": [],
            "cases": [],
            "updates": [],
            "citations": [],
            "confidence": 0.90,
            "requires_human_review": False,
            "validation_errors": [],
        }

    monkeypatch.setattr(
        legal_routes,
        "run_legal_intelligence_agent",
        fake_run_legal_intelligence_agent,
    )

    app = create_app()

    request_count = 20

    transport = httpx.ASGITransport(
        app=app,
    )

    async with httpx.AsyncClient(
        transport=transport,
        base_url="http://testserver",
    ) as client:

        async def send_request(index):
            started = time.perf_counter()

            response = await client.post(
                "/api/legal-intelligence/ask",
                json={
                    "query": (
                        "What law applies to cybercrime "
                        f"in Sri Lanka? Request {index}"
                    )
                },
            )

            elapsed_ms = (
                time.perf_counter() - started
            ) * 1000

            return (
                response.status_code,
                elapsed_ms,
            )

        results = await asyncio.gather(
            *[
                send_request(index)
                for index in range(request_count)
            ]
        )

    status_codes = [
        status
        for status, _ in results
    ]

    latencies = sorted(
        latency
        for _, latency in results
    )

    success_count = sum(
        1
        for status in status_codes
        if status == 200
    )

    success_rate = (
        success_count / request_count
    ) * 100

    average_latency = statistics.mean(
        latencies
    )

    p95_index = (
        math.ceil(
            0.95 * len(latencies)
        )
        - 1
    )

    p95_latency = latencies[p95_index]
    max_latency = max(latencies)

    print()
    print("===== M4-PERF01 RESULTS =====")
    print(
        f"Concurrent requests: "
        f"{request_count}"
    )
    print(
        f"Success rate: "
        f"{success_rate:.2f}%"
    )
    print(
        f"Average latency: "
        f"{average_latency:.2f} ms"
    )
    print(
        f"P95 latency: "
        f"{p95_latency:.2f} ms"
    )
    print(
        f"Max latency: "
        f"{max_latency:.2f} ms"
    )

    assert success_rate == 100.0

    # Project-wide API target:
    # p95 response latency < 200 ms.
    assert p95_latency < 200

# ---------------------------------------------------------
# M4-PERF02
# Performance:
# Planning Coordinator graph execution benchmark.
# Specialist agents are mocked so this measures coordinator
# orchestration, routing, validation and approval flow.
# ---------------------------------------------------------

@pytest.mark.asyncio
async def test_planning_coordinator_graph_performance(
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

        return state

    async def fake_scheduling_node(state):
        state = dict(state)
        current_step = state["current_step"]

        state["scheduling_result"] = {
            "status": "Completed",
            "session_id": "perf-session",
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
                    "name": "Performance Clerk",
                }
            ],
        }

        state["plan"][current_step]["status"] = "Completed"
        state["current_step"] = current_step + 1

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

    run_count = 20
    latencies = []

    for index in range(run_count):
        initial_state = {
            "service_request_id": f"perf-{index}",
            "title": "Property legal assistance",
            "description": (
                "I need legal advice from a lawyer, "
                "want to meet for an appointment, "
                "and need help with deed documents."
            ),
            "request_type": "Legal Consultation",
            "priority": "Normal",
            "retry_count": 0,
            "trace": [],
        }

        started = time.perf_counter()

        result = await graph.ainvoke(
            initial_state
        )

        elapsed_ms = (
            time.perf_counter() - started
        ) * 1000

        latencies.append(elapsed_ms)

        assert result["validation_passed"] is True
        assert (
            result["workflow_status"]
            == "AwaitingApproval"
        )

    latencies.sort()

    average_latency = statistics.mean(
        latencies
    )

    p95_index = (
        math.ceil(
            0.95 * len(latencies)
        )
        - 1
    )

    p95_latency = latencies[p95_index]
    max_latency = max(latencies)

    print()
    print("===== M4-PERF02 RESULTS =====")
    print(
        f"Workflow runs: {run_count}"
    )
    print(
        f"Average latency: "
        f"{average_latency:.2f} ms"
    )
    print(
        f"P95 latency: "
        f"{p95_latency:.2f} ms"
    )
    print(
        f"Max latency: "
        f"{max_latency:.2f} ms"
    )

    # No coordinator-specific latency threshold is defined
    # in the project report, so this benchmark records the
    # empirical result instead of inventing a requirement.