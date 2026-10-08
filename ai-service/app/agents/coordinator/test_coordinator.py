import asyncio
import json

from .graph import build_coordinator_graph


async def main():
    graph = build_coordinator_graph()

    initial_state = {
        "service_request_id": "test-001",
        "title": "Property legal assistance",
        "description": (
            "I have a dispute about ownership of our family land. "
            "I need legal advice, want to meet a lawyer, "
            "and need help with the deed documents."
        ),
        "request_type": "Legal Consultation",
        "priority": "Urgent",
        "retry_count": 0,
        "trace": [],
    }

    result = await graph.ainvoke(initial_state)

    print("\n===== COORDINATOR RESULT =====\n")
    print(json.dumps(result, indent=2, default=str))


if __name__ == "__main__":
    asyncio.run(main())