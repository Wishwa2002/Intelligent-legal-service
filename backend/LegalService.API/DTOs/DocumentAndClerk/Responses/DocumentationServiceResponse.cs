using System.Collections.Generic;

namespace LegalService.API.DTOs.Responses;

public class DocumentationServiceResponse
{
    public int ServiceId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public List<string> RequiredDocuments { get; set; } = new();
}
