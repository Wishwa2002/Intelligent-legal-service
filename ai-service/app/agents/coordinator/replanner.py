from .state import CoordinatorState


MAX_RETRIES = 2


async def replanner_node(
    state: CoordinatorState
) -> CoordinatorState:
    """
    Decide whether validation failures can be retried safely.

    Retryable:
    - Scheduling agent technical/business matching failure
    - Documentation agent technical failure

    Not retryable automatically:
    - Lawyer agent not integrated
    - Missing customer documents
    - No clerk recommendation available

    Non-retryable cases are stopped safely for human/customer action.
    """

    state = dict(state)

    retry_count = state.get("retry_count", 0)
    validation_errors = state.get("validation_errors", [])
    plan = state.get("plan", [])

    # ---------------------------------------------------------
    # Retry limit
    # ---------------------------------------------------------
    if retry_count >= MAX_RETRIES:
        state["final_outcome"] = {
            "status": "NeedsHumanReview",
            "reason": "Coordinator retry limit reached.",
        }

        state.setdefault("trace", []).append({
            "event": "REPLAN_LIMIT_REACHED",
            "retry_count": retry_count,
        })

        return state

    # ---------------------------------------------------------
    # Classify validation errors
    # ---------------------------------------------------------
    retry_agent = None
    non_retryable_reasons = []

    for error in validation_errors:
        error_lower = error.lower()

        # Transient lawyer service failure (HTTP/timeout) is retryable.
        if "lawyer recommendation agent failed" in error_lower:
            if retry_agent is None:
                retry_agent = "LawyerRecommendationAgent"
            continue

        # Permanent integration gap cannot be resolved by retrying.
        if "lawyer recommendation agent is not integrated" in error_lower:
            non_retryable_reasons.append(error)
            continue

        # Scheduling can be retried because availability can change
        # or another matching attempt may be possible.
        if (
            "scheduling agent" in error_lower
            or "scheduling workflow" in error_lower
            or "available lawyer" in error_lower
        ):
            if retry_agent is None:
                retry_agent = "SchedulingAgent"
            continue

        # Missing documents require customer action, not another AI run.
        if "required documents are incomplete" in error_lower:
            non_retryable_reasons.append(error)
            continue

        # No clerk candidates is not solved by repeatedly rerunning.
        if "no clerk recommendation" in error_lower:
            non_retryable_reasons.append(error)
            continue

        # Technical documentation failure may be retryable.
        if "documentation/clerk agent failed" in error_lower:
            if retry_agent is None:
                retry_agent = "DocumentationClerkAgent"
            continue

        # Unknown validation errors should not be retried blindly.
        non_retryable_reasons.append(error)

    # ---------------------------------------------------------
    # Find retryable plan step
    # ---------------------------------------------------------
    restart_index = None

    if retry_agent is not None:
        for index, step in enumerate(plan):
            if step.get("agent") == retry_agent:
                restart_index = index
                step["status"] = "Pending"
                break

    # ---------------------------------------------------------
    # Retry
    # ---------------------------------------------------------
    if restart_index is not None:
        retry_count += 1
        state["retry_count"] = retry_count
        state["current_step"] = restart_index

        # Reset later coordinator steps
        for step in plan:
            if step.get("action") == "validate_results":
                step["status"] = "Pending"

            if step.get("action") == "request_human_approval":
                step["status"] = "Pending"

        state["validation_passed"] = False

        state.setdefault("trace", []).append({
            "event": "REPLAN_TRIGGERED",
            "retry_count": retry_count,
            "retry_agent": retry_agent,
            "restart_step": restart_index,
            "validation_errors": validation_errors,
        })

        return state

    # ---------------------------------------------------------
    # Nothing can be safely retried
    # ---------------------------------------------------------
    state["final_outcome"] = {
        "status": "NeedsHumanReview",
        "reason": (
            "Validation failed and automatic retry cannot resolve "
            "the remaining issues."
        ),
        "issues": (
            non_retryable_reasons
            if non_retryable_reasons
            else validation_errors
        ),
    }

    state.setdefault("trace", []).append({
        "event": "REPLAN_STOPPED_FOR_HUMAN_REVIEW",
        "retry_count": retry_count,
        "validation_errors": validation_errors,
    })

    return state