using System;
using System.ComponentModel.DataAnnotations;

namespace LegalService.API.DTOs.Requests;

public class CreateCareerRequest
{
    [Required]
    public string JobTitle { get; set; } = string.Empty;

    [Required]
    public string Description { get; set; } = string.Empty;
}

public class UpdateCareerRequest
{
    [Required]
    public string JobTitle { get; set; } = string.Empty;

    [Required]
    public string Description { get; set; } = string.Empty;
}

public class CreateJobApplicationRequest
{
    [Required]
    public Guid CareerId { get; set; }

    [Required]
    public string ApplicantName { get; set; } = string.Empty;
}

public class UpdateJobApplicationStatusRequest
{
    [Required]
    public string Status { get; set; } = string.Empty;
}
