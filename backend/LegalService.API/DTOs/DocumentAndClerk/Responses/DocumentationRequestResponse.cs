using System;
using System.Collections.Generic;

namespace LegalService.API.DTOs.Responses;

public class DocumentationRequestResponse
{
    public int RequestId { get; set; }
    public int CustomerId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public string CustomerEmail { get; set; } = string.Empty;
    public int ServiceId { get; set; }
    public string ServiceName { get; set; } = string.Empty;
    public string DocumentType { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public int? AssignedClerkId { get; set; }
    public string? AssignedClerkName { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public List<DocumentFileResponse> DocumentFiles { get; set; } = new();
    public List<string> RequiredDocuments { get; set; } = new();
    public List<string> MissingDocuments { get; set; } = new();
}
