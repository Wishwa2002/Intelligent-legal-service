"""
app/security/tool_permissions.py

Per-node tool allowlists — enforced in code, not by prompts.

Each agent node may only call tools in its allowlist.
Any attempt to call a tool outside this list raises PermissionError.
This prevents a compromised node from performing unauthorized operations.
"""

TOOL_PERMISSIONS: dict[str, list[str]] = {
    "document_analysis": [
        "download_authorized_document",
        "save_document_analysis",
        "get_uploaded_documents",
    ],
    "document_validation": [
        "update_file_status",
        "request_missing_document",
        "save_document_analysis",
    ],
    "generate_document_summary": [
        "update_request_state",
    ],
    "clerk_recommendation": [
        "get_eligible_clerks",
        "get_clerk_workload",
        "get_clerk_availability",
        "create_assignment_proposal",
        "submit_for_admin_approval",
    ],
    "supervisor": [
        "get_request",
        "update_request_state",
        "find_service_by_name",
        "get_service_requirements",
        "create_request",
    ],
    "check_document_completeness": [
        "get_uploaded_documents",
    ],
}


def check_tool_permission(node_name: str, tool_name: str) -> None:
    """
    Raises PermissionError if the node is not allowed to call the tool.
    Call this at the top of any tool function to enforce boundaries.
    """
    allowed = TOOL_PERMISSIONS.get(node_name, [])
    if tool_name not in allowed:
        raise PermissionError(
            f"Node '{node_name}' is not permitted to call tool '{tool_name}'. "
            f"Allowed tools: {allowed}"
        )
