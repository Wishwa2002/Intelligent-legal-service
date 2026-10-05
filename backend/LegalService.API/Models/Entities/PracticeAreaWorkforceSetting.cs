namespace LegalService.API.Models.Entities;
public sealed class PracticeAreaWorkforceSetting
{
    public int Id { get; set; }
    public int PracticeAreaId { get; set; }
    public int MinimumActiveLawyers { get; set; }
    public int TargetActiveLawyers { get; set; }
    public int MinimumFutureSlots { get; set; }
    public int HighDemandThreshold { get; set; }
    public double WatchCapacityRatio { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public int UpdatedBy { get; set; }
}
// Only exact IDs recorded here belong to the Development scenario service.
public sealed class WorkforceDemoState
{
    public int Id { get; set; } = 1;
    public string ArtifactsJson { get; set; } = "[]";
    public DateTime UpdatedAt { get; set; }
}
