using System;
using System.Collections.Generic;

namespace LegalService.API.Models.Entities;

public class AgentWorkflow
{
    public Guid WorkflowId { get; set; }
    public Guid ServiceRequestId { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    // Navigation properties
    public ServiceRequest ServiceRequest { get; set; } = null!;
    public ICollection<AgentStep> AgentSteps { get; set; } = new List<AgentStep>();
    public ICollection<ValidationResult> ValidationResults { get; set; } = new List<ValidationResult>();
    public ICollection<ApprovalDecision> ApprovalDecisions { get; set; } = new List<ApprovalDecision>();
    public ExecutionSummary? ExecutionSummary { get; set; }
}
