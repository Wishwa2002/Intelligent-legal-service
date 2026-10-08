from .state import CoordinatorState


async def validator_node(
    state: CoordinatorState
) -> CoordinatorState:
    """
    Deterministically validate outputs from specialized agents.

    This validator checks:
    - whether required agent results exist
    - whether an agent failed
    - whether lawyer integration is still missing
    - whether scheduling achieved a usable business result
    - whether documentation is complete
    - whether clerk recommendations exist when needed

    It does NOT re-run ranking or specialist-agent logic.
    """

    state = dict(state)

    errors = []
    plan = state.get("plan", [])

    used_agents = {
        step.get("agent")
        for step in plan
    }

    # ---------------------------------------------------------
    # Lawyer Recommendation Agent validation
    # ---------------------------------------------------------
    if "LawyerRecommendationAgent" in used_agents:
        lawyer_result = state.get("lawyer_result")

        if not lawyer_result:
            errors.append(
                "Lawyer recommendation result is missing."
            )

        elif lawyer_result.get("status") == "Failed":
            errors.append(
                "Lawyer Recommendation Agent failed."
            )

        elif lawyer_result.get("status") == "PendingIntegration":
            errors.append(
                "Lawyer Recommendation Agent is not integrated yet."
            )

    # ---------------------------------------------------------
    # Scheduling Agent validation
    # ---------------------------------------------------------
    if "SchedulingAgent" in used_agents:
        scheduling_result = state.get("scheduling_result")

        if not scheduling_result:
            errors.append(
                "Scheduling result is missing."
            )

        elif scheduling_result.get("status") == "Failed":
            errors.append(
                "Scheduling Agent failed."
            )

        else:
            phase = scheduling_result.get("phase")

            messages = scheduling_result.get(
                "messages",
                []
            )

            latest_agent_message = ""

            for message in reversed(messages):
                if message.get("role") == "agent":
                    latest_agent_message = (
                        message.get("content", "")
                    ).lower()
                    break

            # Only error when the agent explicitly found no lawyers at all.
            # The coordinator's role is to start the session and match lawyers;
            # the customer confirms a booking slot via the UI as the next step.
            if (
                "don't have available attorneys"
                in latest_agent_message
                or
                "no available attorneys"
                in latest_agent_message
            ):
                errors.append(
                    "Scheduling Agent could not find an available lawyer."
                )

            # A phase of DISCOVERY with no session_id means the agent
            # never started properly.
            if (
                phase == "DISCOVERY"
                and not scheduling_result.get("session_id")
            ):
                errors.append(
                    "Scheduling session could not be created."
                )

    # ---------------------------------------------------------
    # Documentation / Clerk Agent validation
    # ---------------------------------------------------------
    if "DocumentationClerkAgent" in used_agents:
        documentation_result = state.get(
            "documentation_result"
        )

        if not documentation_result:
            errors.append(
                "Documentation/Clerk result is missing."
            )

        elif documentation_result.get("status") == "Failed":
            errors.append(
                "Documentation/Clerk Agent failed."
            )

        else:
            completeness = documentation_result.get(
                "completeness",
                {}
            )

            completeness_status = completeness.get(
                "status"
            )

            if completeness_status == "INCOMPLETE":
                missing_documents = completeness.get(
                    "missing_documents",
                    []
                )

                errors.append(
                    "Required documents are incomplete: "
                    + ", ".join(missing_documents)
                )

            clerk_recommendations = (
                documentation_result.get(
                    "clerk_recommendations",
                    []
                )
            )

            if not clerk_recommendations:
                errors.append(
                    "No clerk recommendation is currently available."
                )

    # ---------------------------------------------------------
    # Final validation result
    # ---------------------------------------------------------
    state["validation_passed"] = (
        len(errors) == 0
    )

    state["validation_errors"] = errors

    current_step = state.get(
        "current_step",
        0
    )

    if current_step < len(plan):
        plan[current_step]["status"] = (
            "Completed"
            if state["validation_passed"]
            else "FailedValidation"
        )

    state["current_step"] = current_step + 1

    state.setdefault("trace", []).append({
        "event": "VALIDATION_COMPLETED",
        "passed": state["validation_passed"],
        "errors": errors,
    })

    return state