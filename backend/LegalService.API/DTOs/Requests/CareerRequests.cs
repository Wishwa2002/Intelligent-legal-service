using System;
using System.ComponentModel.DataAnnotations;

namespace LegalService.API.DTOs.Requests;

public class CreateCareerRequest
{
    [Range(1, int.MaxValue)]
    public int? PracticeAreaId { get; set; }
    [Required]
    public string JobTitle { get; set; } = string.Empty;

    [Required]
    public string Description { get; set; } = string.Empty;
}

public class UpdateCareerRequest
{
    [Range(1, int.MaxValue)]
    public int? PracticeAreaId { get; set; }
    [Required]
    public string JobTitle { get; set; } = string.Empty;

    [Required]
    public string Description { get; set; } = string.Empty;
}

public class CreateJobApplicationRequest
{
    [Required]
    public int CareerId { get; set; }

    [Required]
    public string ApplicantName { get; set; } = string.Empty;
}

public class UpdateJobApplicationStatusRequest
{
    [Required]
    public string Status { get; set; } = string.Empty;
}
