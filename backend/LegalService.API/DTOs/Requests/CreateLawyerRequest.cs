using System.ComponentModel.DataAnnotations;

namespace LegalService.API.DTOs.Requests;

public class CreateLawyerRequest
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

    [Required]
    public string Category { get; set; } = string.Empty;

    public string? Password { get; set; }
}
