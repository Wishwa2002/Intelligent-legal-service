using System.ComponentModel.DataAnnotations;
using LegalService.API.Models.Entities;

namespace LegalService.API.DTOs.Requests;

/// <summary>
/// Payload for creating a new service request.
/// </summary>
public class CreateServiceRequestRequest
{
    [Required(ErrorMessage = "Title is required.")]
    [StringLength(200, ErrorMessage = "Title cannot exceed 200 characters.")]
    public string Title { get; set; } = string.Empty;

    [Required(ErrorMessage = "Description is required.")]
    [StringLength(2000, ErrorMessage = "Description cannot exceed 2000 characters.")]
    public string Description { get; set; } = string.Empty;

    [Required(ErrorMessage = "Request type is required.")]
    [StringLength(100, ErrorMessage = "Request type cannot exceed 100 characters.")]
    public string RequestType { get; set; } = string.Empty;

    [RegularExpression("^(Low|Medium|High|Urgent)$",
        ErrorMessage = "Priority must be one of: Low, Medium, High, Urgent.")]
    public string? Priority { get; set; }
}

/// <summary>
/// Payload for updating an existing service request (customer-editable fields only).
/// Allowed only when status is Submitted or RevisionRequired.
/// </summary>
public class UpdateServiceRequestRequest
{
    [Required(ErrorMessage = "Title is required.")]
    [StringLength(200, ErrorMessage = "Title cannot exceed 200 characters.")]
    public string Title { get; set; } = string.Empty;

    [Required(ErrorMessage = "Description is required.")]
    [StringLength(2000, ErrorMessage = "Description cannot exceed 2000 characters.")]
    public string Description { get; set; } = string.Empty;

    [Required(ErrorMessage = "Request type is required.")]
    [StringLength(100, ErrorMessage = "Request type cannot exceed 100 characters.")]
    public string RequestType { get; set; } = string.Empty;

    [RegularExpression("^(Low|Medium|High|Urgent)$",
        ErrorMessage = "Priority must be one of: Low, Medium, High, Urgent.")]
    public string? Priority { get; set; }
}

/// <summary>
/// Admin-only payload to change the status of a service request.
/// </summary>
public class ChangeServiceRequestStatusRequest
{
    [Required(ErrorMessage = "Status is required.")]
    public ServiceRequestStatus Status { get; set; }

    [StringLength(500)]
    public string? Note { get; set; }
}
