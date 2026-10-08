namespace LegalService.API.DTOs.Requests;

public class RegisterRequest
{
    // Common
    public string FullName { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string Password { get; set; } = string.Empty;

    public string Role { get; set; } = string.Empty;

    // Lawyer
    public string? PhoneNumber { get; set; }

    public string? Qualification { get; set; }

    public int Experience { get; set; }

    public string? LicenseNumber { get; set; }

    public string? ProfileDescription { get; set; }

    // Clerk
    public string? Contact { get; set; }

    public string? Department { get; set; }
}