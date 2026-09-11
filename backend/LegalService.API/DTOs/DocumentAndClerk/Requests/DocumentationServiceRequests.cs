using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace LegalService.API.DTOs.Requests;

public class CreateDocumentationServiceRequest
{
    [Required]
    [StringLength(200, MinimumLength = 3)]
    public string Name { get; set; } = string.Empty;

    [Required]
    public string Description { get; set; } = string.Empty;

    public List<string> RequiredDocuments { get; set; } = new();
}

public class UpdateDocumentationServiceRequest
{
    [Required]
    [StringLength(200, MinimumLength = 3)]
    public string Name { get; set; } = string.Empty;

    [Required]
    public string Description { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;

    public List<string> RequiredDocuments { get; set; } = new();
}
