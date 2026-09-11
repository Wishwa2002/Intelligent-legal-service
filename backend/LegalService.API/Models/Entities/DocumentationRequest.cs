using System;
using System.Collections.Generic;

namespace LegalService.API.Models.Entities;

public class DocumentationRequest
{
    public int RequestId { get; set; }
    public int CustomerId { get; set; }
    public int ServiceId { get; set; }
    public string DocumentType { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public int? AssignedClerkId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    // Navigation properties
    public DocumentationService DocumentationService { get; set; } = null!;
    public Clerk? AssignedClerk { get; set; }
    public ICollection<DocumentFile> DocumentFiles { get; set; } = new List<DocumentFile>();
}
