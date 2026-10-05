namespace LegalService.API.Models.Entities;

public sealed class LawyerRecommendationWorkflow
{
    public Guid WorkflowId { get; set; }
    public int OwnerUserId { get; set; }
    public string Status { get; set; } = "RECEIVED";
    public string UserRequirement { get; set; } = string.Empty;
    public DateOnly? RequestedDate { get; set; }
    public int? CategoryId { get; set; }
    public string ParsedRequirementJson { get; set; } = "{}";
    public string RecommendationsJson { get; set; } = "[]";
    public string WarningsJson { get; set; } = "[]";
    public string AuditJson { get; set; } = "[]";
    public int? ClientId { get; set; }
    public Guid? SelectedLawyerId { get; set; }
    public Guid? SelectedSlotId { get; set; }
    public DateOnly? BookingDate { get; set; }
    public string ReviewStage { get; set; } = "MATCHES";
    public Guid? ApprovedLawyerId { get; set; }
    public Guid? AppointmentId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
