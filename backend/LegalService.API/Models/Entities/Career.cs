using System;
using System.Collections.Generic;

namespace LegalService.API.Models.Entities;

public class Career
{
    public Guid CareerId { get; set; }
    public string JobTitle { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;

    // Navigation properties
    public ICollection<JobApplication> JobApplications { get; set; } = new List<JobApplication>();
}
