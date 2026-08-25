using System;
using System.Collections.Generic;

namespace LegalService.API.Models.Entities;

public class DocumentationRequest
{
    public Guid RequestId { get; set; }
    public Guid CustomerId { get; set; }
    public int ServiceId { get; set; }
    public string DocumentType { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public Guid? AssignedClerkId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    // Navigation properties
    public User Customer { get; set; } = null!;
    public DocumentationService DocumentationService { get; set; } = null!;
    public Clerk? AssignedClerk { get; set; }
    public ICollection<DocumentFile> DocumentFiles { get; set; } = new List<DocumentFile>();
}
