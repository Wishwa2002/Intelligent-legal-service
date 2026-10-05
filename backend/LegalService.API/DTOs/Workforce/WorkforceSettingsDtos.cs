using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
namespace LegalService.API.DTOs.Workforce;
public sealed record WorkforcePlanningRules(int MinimumActiveLawyers, int TargetActiveLawyers,
    int MinimumFutureSlots, int HighDemandThreshold, double WatchCapacityRatio, string Source);
public sealed record WorkforceSettingResponse(int PracticeAreaId, string PracticeAreaName,
    int MinimumActiveLawyers, int TargetActiveLawyers, int MinimumFutureSlots, int HighDemandThreshold,
    double WatchCapacityRatio, string Source, DateTime? UpdatedAt = null, int? UpdatedBy = null);
[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed class WorkforceSettingRequest : IValidatableObject
{
    [JsonRequired, Range(0, 100)] public int MinimumActiveLawyers { get; set; }
    [JsonRequired, Range(0, 200)] public int TargetActiveLawyers { get; set; }
    [JsonRequired, Range(0, 1000)] public int MinimumFutureSlots { get; set; }
    [JsonRequired, Range(0, 10000)] public int HighDemandThreshold { get; set; }
    [JsonRequired, Range(0.0001, 1)] public double WatchCapacityRatio { get; set; }
    public IEnumerable<ValidationResult> Validate(ValidationContext context)
    {
        if (TargetActiveLawyers < MinimumActiveLawyers)
            yield return new("Target lawyers must be at least the minimum.", [nameof(TargetActiveLawyers)]);
    }
}
[JsonUnmappedMemberHandling(JsonUnmappedMemberHandling.Disallow)]
public sealed class WorkforceDemoRequest
{
    [Required] public string Scenario { get; set; } = "";
    public int? PracticeAreaId { get; set; }
}
public sealed record WorkforceDemoResponse(string Scenario, int? PracticeAreaId, string Message);
