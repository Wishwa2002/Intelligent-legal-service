using System;
using LegalService.API.Models.Entities;

namespace LegalService.API.DTOs.Responses;

/// <summary>
/// Summary representation of a service request (for list views).
/// </summary>
public class ServiceRequestResponse
{
    public Guid ServiceRequestId { get; set; }
    public Guid CustomerId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string RequestType { get; set; } = string.Empty;
    public string? Priority { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

/// <summary>
/// Full representation of a service request (for detail view).
/// </summary>
public class ServiceRequestDetailsResponse
{
    public Guid ServiceRequestId { get; set; }
    public Guid CustomerId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public string CustomerEmail { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string RequestType { get; set; } = string.Empty;
    public string? Priority { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    /// <summary>Whether this request can be edited by the customer.</summary>
    public bool IsEditable { get; set; }

    /// <summary>Whether this request can be cancelled by the customer.</summary>
    public bool IsCancellable { get; set; }
}
