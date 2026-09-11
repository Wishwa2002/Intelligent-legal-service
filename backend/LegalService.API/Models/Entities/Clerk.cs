using System;
using System.Collections.Generic;

namespace LegalService.API.Models.Entities;

public class Clerk
{
    public int ClerkId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Email { get; set; } = string.Empty;
    public string? PasswordHash { get; set; } = string.Empty;
    public string Contact { get; set; } = string.Empty;
    public string Department { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    // Navigation properties
    public ICollection<DocumentationRequest> DocumentationRequests { get; set; } = new List<DocumentationRequest>();
}
