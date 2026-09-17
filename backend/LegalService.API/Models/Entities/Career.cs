using System;
using System.Collections.Generic;

namespace LegalService.API.Models.Entities;

public class Career
{
    public int CareerId { get; set; }
    public string JobTitle { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public ICollection<JobApplication> JobApplications { get; set; } = new List<JobApplication>();
}
