using System;
using System.ComponentModel.DataAnnotations;

namespace LegalService.API.DTOs.Requests;

public class CreateDocumentationRequestRequest
{
    [Required]
    public int ServiceId { get; set; }

    [Required]
    public string DocumentType { get; set; } = string.Empty;
}

public class UpdateDocumentationRequestStatusRequest
{
    [Required]
    public string Status { get; set; } = string.Empty;
}

public class AssignClerkRequest
{
    [Required]
    public int ClerkId { get; set; }
}
