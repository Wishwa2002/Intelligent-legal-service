using System.Collections.Generic;

namespace LegalService.API.Models.Entities;

public class DocumentationService
{
    public int ServiceId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;

    // Navigation properties
    public ICollection<DocumentationRequest> DocumentationRequests { get; set; } = new List<DocumentationRequest>();
}
