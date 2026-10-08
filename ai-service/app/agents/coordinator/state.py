from typing import TypedDict, Any


class CoordinatorState(TypedDict, total=False):
    workflow_id: str
    service_request_id: str

    objective: str
    title: str
    description: str
    request_type: str
    priority: str

    legal_category: str

    plan: list[dict]

    current_step: int

    lawyer_result: dict
    scheduling_result: dict
    documentation_result: dict

    validation_passed: bool
    validation_errors: list[str]

    approval_status: str

    retry_count: int

    trace: list[dict]

    final_outcome: dict

    # Post-approval phase
    execution_summary: dict   # actions executed after admin approval
    audit_log: dict           # full workflow audit trail
    workflow_status: str      # Planning | AwaitingApproval | Completed | Rejected