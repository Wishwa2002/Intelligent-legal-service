using System;

namespace LegalService.API.DTOs.Responses;

public class CareerResponse
{
    public Guid CareerId { get; set; }
    public string JobTitle { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int ApplicationsCount { get; set; }
}

public class JobApplicationResponse
{
    public Guid ApplicationId { get; set; }
    public Guid CareerId { get; set; }
    public string JobTitle { get; set; } = string.Empty;
    public string ApplicantName { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime AppliedAt { get; set; }
}
