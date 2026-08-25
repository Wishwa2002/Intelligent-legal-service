using System;

namespace LegalService.API.Models.Entities;

public class ServiceRequest
{
    public Guid ServiceRequestId { get; set; }
    public Guid CustomerId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateOnly PreferredDeadline { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    // Navigation properties
    public User Customer { get; set; } = null!;
    public AgentWorkflow? AgentWorkflow { get; set; }
}
