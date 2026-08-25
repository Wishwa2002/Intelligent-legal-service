using System;
using System.Collections.Generic;

namespace LegalService.API.Models.Entities;

public class Clerk
{
    public Guid ClerkId { get; set; }
    public string Contact { get; set; } = string.Empty;
    public string Department { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    // Navigation properties
    public User User { get; set; } = null!;
    public ICollection<DocumentationRequest> DocumentationRequests { get; set; } = new List<DocumentationRequest>();
}
