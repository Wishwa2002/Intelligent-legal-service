using System;

namespace LegalService.API.Models.Entities;

public class ApprovalDecision
{
    public Guid DecisionId { get; set; }
    public Guid WorkflowId { get; set; }
    public Guid ApproverId { get; set; }
    public string Decision { get; set; } = string.Empty;
    public string Comments { get; set; } = string.Empty;
    public DateTime DecidedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public AgentWorkflow AgentWorkflow { get; set; } = null!;
    public User Approver { get; set; } = null!;
}
