using System;
using System.Collections.Generic;

namespace LegalService.API.Models.Entities;

public class DocumentationService
{
    public int ServiceId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;

    // Soft-delete flag — deactivated services are hidden from customers
    public bool IsActive { get; set; } = true;

    // JSON list of required document labels, e.g. ["NIC","Address Proof","Business Reg Form"]
    // Stored as a plain string mapped to PostgreSQL TEXT; parsed by the application layer.
    public string RequiredDocuments { get; set; } = "[]";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    // Navigation properties
    public ICollection<DocumentationRequest> DocumentationRequests { get; set; } = new List<DocumentationRequest>();
}
