using System.ComponentModel.DataAnnotations;

namespace LegalService.API.DTOs.Requests;

public class CreateClerkRequest
{
    public string? Name { get; set; }
    public string? FullName { get; set; }
    public string? UserId { get; set; }

    [Required(ErrorMessage = "Email / Username is required.")]
    [EmailAddress(ErrorMessage = "Please enter a valid email address.")]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "Password is required.")]
    [MinLength(6, ErrorMessage = "Password must be at least 6 characters long.")]
    public string Password { get; set; } = string.Empty;

    [Required(ErrorMessage = "Contact phone or details are required.")]
    public string Contact { get; set; } = string.Empty;

    [Required(ErrorMessage = "Department is required.")]
    public string Department { get; set; } = string.Empty;

    public string GetEffectiveName()
    {
        if (!string.IsNullOrWhiteSpace(Name)) return Name.Trim();
        if (!string.IsNullOrWhiteSpace(FullName)) return FullName.Trim();
        if (!string.IsNullOrWhiteSpace(UserId)) return UserId.Trim();
        return "Clerk";
    }
}

public class UpdateClerkRequest
{
    public string? Name { get; set; }

    [EmailAddress(ErrorMessage = "Please enter a valid email address.")]
    public string? Email { get; set; }

    public string? Password { get; set; }

    [Required]
    public string Contact { get; set; } = string.Empty;

    [Required]
    public string Department { get; set; } = string.Empty;

    public bool? IsActive { get; set; }
}
