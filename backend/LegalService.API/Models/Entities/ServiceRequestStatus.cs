namespace LegalService.API.Models.Entities;

/// <summary>
/// Lifecycle states for a customer service request.
/// </summary>
public enum ServiceRequestStatus
{
    /// <summary>Initial state — request has been submitted by the customer.</summary>
    Submitted = 0,

    /// <summary>An admin or staff member has started processing the request.</summary>
    InProgress = 1,

    /// <summary>Processing is complete; awaiting final admin review/decision.</summary>
    AwaitingReview = 2,

    /// <summary>The request has been approved by admin.</summary>
    Approved = 3,

    /// <summary>The request has been rejected by admin.</summary>
    Rejected = 4,

    /// <summary>Admin has requested the customer revise and re-submit.</summary>
    RevisionRequired = 5,

    /// <summary>The request has been fully completed.</summary>
    Completed = 6,

    /// <summary>The request was cancelled (by customer or admin).</summary>
    Cancelled = 7
}
