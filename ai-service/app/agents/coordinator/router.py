from .state import CoordinatorState


ALLOWED_ACTIONS = {
    "recommend_lawyers": "lawyer",
    "find_available_slots": "scheduling",
    "analyze_document_requirements": "documentation",
    "validate_results": "validate",
    "request_human_approval": "approval",
}


def route_next_step(state: CoordinatorState) -> str:
    """
    Decide which coordinator node should run next.

    Only allow-listed actions can be routed.
    Unknown actions safely finish instead of executing arbitrary logic.
    """

    plan = state.get("plan", [])
    current_step = state.get("current_step", 0)

    if current_step >= len(plan):
        return "finish"

    step = plan[current_step]
    action = step.get("action")

    return ALLOWED_ACTIONS.get(action, "finish")