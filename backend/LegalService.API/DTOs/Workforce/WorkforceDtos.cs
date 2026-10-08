using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace LegalService.API.DTOs.Workforce;

public sealed record RecruitmentOpening(int CareerId, string JobTitle);
public sealed record WorkforceArea(int PracticeAreaId, string PracticeAreaName, int ActiveLawyerCount,
    int LegalServiceCount, int RecentDemandCount, int RecentAppointmentCount, int FutureAvailableSlotCount,
    int OpenCareerOpeningCount, string Status, string[] Reasons, RecruitmentOpening[] Openings, WorkforcePlanningRules? PlanningRules = null);
public sealed record WorkforceReport(DateTime GeneratedAt, int RecentWindowDays, int FutureWindowDays,
    WorkforceArea[] PracticeAreas, int UnmappedCareerOpeningCount, string[] Limitations);

[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed class HiringDraft
{
    [Required, StringLength(200, MinimumLength = 3)] public string SuggestedTitle { get; set; } = "";
    [Required, StringLength(1500, MinimumLength = 3)] public string OperationalReason { get; set; } = "";
    [Required, StringLength(3000, MinimumLength = 3)] public string Summary { get; set; } = "";
    [Required, MinLength(1), MaxLength(8)] public string[] Responsibilities { get; set; } = [];
    [Required, MinLength(1), MaxLength(8)] public string[] FocusAreas { get; set; } = [];
}
public sealed record HiringWorkflowResponse(Guid WorkflowId, int? PracticeAreaId, string Status,
    WorkforceArea Snapshot, HiringDraft Draft, int? CareerOpeningId, string? ApprovedTitle,
    DateTime CreatedAt, DateTime UpdatedAt, DateTime? ApprovedAt);
[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed class GenerateHiringRequest
{
    [Range(1, int.MaxValue)] public int PracticeAreaId { get; set; }
    public Guid? WorkflowId { get; set; }
}
[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed class ApproveHiringRequest
{
    [Required] public HiringDraft Draft { get; set; } = new();
    // These are the existing Careers create fields, edited/confirmed by the Admin.
    [Required, StringLength(200, MinimumLength = 3)] public string JobTitle { get; set; } = "";
    [Required, StringLength(12000, MinimumLength = 3)] public string Description { get; set; } = "";
    public bool ReviewedExistingCareers { get; set; }
}
