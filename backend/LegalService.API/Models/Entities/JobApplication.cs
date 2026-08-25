using System;

namespace LegalService.API.Models.Entities;

public class JobApplication
{
    public Guid ApplicationId { get; set; }
    public Guid CareerId { get; set; }
    public string ApplicantName { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime AppliedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public Career Career { get; set; } = null!;
}
