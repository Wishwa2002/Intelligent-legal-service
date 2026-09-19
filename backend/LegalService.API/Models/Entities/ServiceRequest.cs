using System;
using System.ComponentModel.DataAnnotations;

namespace LegalService.API.Models.Entities;

/// <summary>
/// Represents a legal service request submitted by a customer.
/// </summary>
public class ServiceRequest
{
    public Guid ServiceRequestId { get; set; }

    /// <summary>
    /// ID of the customer who submitted the request.
    /// Stored as Guid to match existing DB schema (Users.Id).
    /// </summary>
    public Guid CustomerId { get; set; }

    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    [Required]
    [MaxLength(2000)]
    public string Description { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string RequestType { get; set; } = string.Empty;

    /// <summary>
    /// Optional priority: Low, Medium, High, Urgent
    /// </summary>
    [MaxLength(20)]
    public string? Priority { get; set; }

    public ServiceRequestStatus Status { get; set; } = ServiceRequestStatus.Submitted;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public User? Customer { get; set; }
    public AgentWorkflow? AgentWorkflow { get; set; }
}
