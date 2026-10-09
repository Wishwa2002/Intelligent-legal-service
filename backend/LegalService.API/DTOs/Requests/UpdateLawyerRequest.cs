using System.ComponentModel.DataAnnotations;

namespace LegalService.API.DTOs.Requests;

public class UpdateLawyerRequest
{
    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    [MaxLength(200)]
    public string Email { get; set; } = string.Empty;

    [MaxLength(50)]
    public string PhoneNumber { get; set; } = string.Empty;

    [MaxLength(200)]
    public string Qualification { get; set; } = string.Empty;

    [Range(0, 70)]
    public int Experience { get; set; }

    [Required]
    [MaxLength(100)]
    public string LicenseNumber { get; set; } = string.Empty;

    [MaxLength(2000)]
    public string ProfileDescription { get; set; } = string.Empty;

    // Legacy clients may continue sending Category; new clients use the catalog ID.
    public int? SpecializationId { get; set; }

    public LegalService.API.DTOs.Scheduling.ScheduleRequest? WorkingSchedule { get; set; }

    public string Category { get; set; } = string.Empty;

}
