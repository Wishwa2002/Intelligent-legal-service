using System;

namespace LegalService.API.Models.Entities;

public class JobApplication
{
    public int ApplicationId { get; set; }
    public int CareerId { get; set; }
    public string ApplicantName { get; set; } = string.Empty;
    public string Status { get; set; } = "Submitted";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public Career Career { get; set; } = null!;
}
