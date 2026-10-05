namespace LegalService.API.Models.Entities;

public sealed class HiringSuggestionWorkflow
{
    public Guid WorkflowId { get; set; }
    public int OwnerUserId { get; set; }
    public int? PracticeAreaId { get; set; }
    public string Status { get; set; } = "AWAITING_APPROVAL";
    public string SystemSnapshotJson { get; set; } = "{}";
    public string AiDraftJson { get; set; } = "{}";
    public string ReviewedDraftJson { get; set; } = "{}";
    public int? CareerOpeningId { get; set; }
    public string? ApprovedTitle { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ApprovedAt { get; set; }
    public int? ApprovedBy { get; set; }
}
