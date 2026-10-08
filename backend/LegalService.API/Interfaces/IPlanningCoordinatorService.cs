using LegalService.API.Models.Entities;

namespace LegalService.API.Interfaces;

/// <summary>
/// Defines the contract for the Member 4 Planning / Coordinator Agent.
///
/// Responsibilities:
/// - Analyse a customer service request.
/// - Create the required multi-agent workflow.
/// - Delegate only to the specialist agents required by the request.
/// - Validate specialist outputs.
/// - Pause before high-impact actions for human approval.
/// - Maintain workflow state and audit information.
/// </summary>
public interface IPlanningCoordinatorService
{
    // -----------------------------------------------------------------
    // AUTOMATIC WORKFLOW LIFECYCLE
    // -----------------------------------------------------------------

    /// <summary>
    /// Creates the workflow and automatically executes all specialist
    /// agent steps required by the Coordinator's plan.
    ///
    /// Execution stops at the human-approval boundary.
    /// This method must never approve, book, or perform another
    /// high-impact action automatically.
    /// </summary>
    Task<AgentWorkflow> StartAndExecuteAsync(
        Guid serviceRequestId,
        CancellationToken cancellationToken = default);


    /// <summary>
    /// Classifies the service request and creates the workflow plan.
    ///
    /// Only required specialist-agent steps should be created.
    /// For example:
    ///
    /// Lawyer request:
    ///     LawyerRecommendationAgent
    ///
    /// Lawyer + appointment:
    ///     LawyerRecommendationAgent
    ///     SchedulingAgent
    ///
    /// Documentation request:
    ///     DocumentationClerkAgent
    ///
    /// Idempotent: returns the existing workflow if one already exists.
    /// </summary>
    Task<AgentWorkflow> StartWorkflowAsync(
        Guid serviceRequestId,
        CancellationToken cancellationToken = default);


    // -----------------------------------------------------------------
    // MANUAL / ADMIN ORCHESTRATION
    // -----------------------------------------------------------------

    /// <summary>
    /// Executes all Pending specialist-agent steps that exist in the
    /// workflow plan.
    ///
    /// It must NOT automatically assume that LawyerRecommendationAgent,
    /// SchedulingAgent and DocumentationClerkAgent are all required.
    ///
    /// Used mainly for admin-triggered execution, retry and testing.
    /// Stops before human approval.
    /// </summary>
    Task<AgentWorkflow> ExecuteAllAsync(
        Guid workflowId,
        int userId,
        CancellationToken cancellationToken = default);


    // -----------------------------------------------------------------
    // SPECIALIST AGENTS
    // -----------------------------------------------------------------

    /// <summary>
    /// Executes Member 1 - Lawyer Recommendation Agent.
    /// Idempotent when the step is already Completed.
    /// </summary>
    Task<AgentWorkflow> ExecuteLawyerRecommendationAsync(
        Guid workflowId,
        int userId,
        CancellationToken cancellationToken = default);


    /// <summary>
    /// Executes Member 2 - Scheduling Agent.
    /// Uses lawyer recommendations from the preceding workflow state
    /// and returns valid available appointment slots.
    /// Idempotent when already Completed.
    /// </summary>
    Task<AgentWorkflow> ExecuteSchedulingAsync(
        Guid workflowId,
        int userId,
        CancellationToken cancellationToken = default);


    /// <summary>
    /// Executes Member 3 - Documentation / Clerk Agent.
    /// Analyses the customer's documentation requirement and stores
    /// the specialist result in the workflow step.
    /// Idempotent when already Completed.
    /// </summary>
    Task<AgentWorkflow> ExecuteDocumentationAsync(
        Guid workflowId,
        int userId,
        CancellationToken cancellationToken = default);


    // -----------------------------------------------------------------
    // VALIDATION
    // -----------------------------------------------------------------

    /// <summary>
    /// Validates only the specialist-agent steps contained in this
    /// workflow's plan.
    ///
    /// On successful validation:
    ///     workflow -> AwaitingApproval / NeedsHumanReview
    ///
    /// On validation failure:
    ///     workflow -> NeedsHumanReview
    ///
    /// Must persist:
    ///     Passed
    ///     Errors
    ///     RulesChecked
    ///     CheckedAt
    ///
    /// and update the Coordinator validation AgentStep.
    /// </summary>
    Task<AgentWorkflow> ValidateAndTransitionAsync(
        Guid workflowId,
        int userId,
        CancellationToken cancellationToken = default);


    // -----------------------------------------------------------------
    // HUMAN APPROVAL
    // -----------------------------------------------------------------

    /// <summary>
    /// Admin-only high-impact action.
    ///
    /// Approves the selected lawyer/slot and performs the final booking.
    /// Must update:
    ///
    /// ApprovalDecision
    /// AgentStep
    /// ToolExecution
    /// ExecutionSummary
    /// AuditLog
    /// AgentWorkflow.Status
    /// ServiceRequest.Status
    ///
    /// Idempotent if the approved action was already completed.
    /// </summary>
    Task<AgentWorkflow> ApproveLawyerAsync(
        Guid workflowId,
        Guid lawyerId,
        Guid slotId,
        DateOnly bookingDate,
        int approverUserId,
        string? comments = null,
        CancellationToken cancellationToken = default);


    // -----------------------------------------------------------------
    // QUERY
    // -----------------------------------------------------------------

    Task<AgentWorkflow?> GetWorkflowAsync(
        Guid workflowId,
        CancellationToken cancellationToken = default);
}