using System;

namespace LegalService.API.Models.Entities;

public class ExecutionSummary
{
    public Guid SummaryId { get; set; }
    public Guid WorkflowId { get; set; }
    public string FinalOutcome { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public AgentWorkflow AgentWorkflow { get; set; } = null!;
}
