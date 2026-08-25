using System;
using System.Collections.Generic;

namespace LegalService.API.Models.Entities;

public class AgentStep
{
    public Guid StepId { get; set; }
    public Guid WorkflowId { get; set; }
    public string AgentName { get; set; } = string.Empty;
    public string StepName { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    
    // Store JSON data as a string property mapped to PostgreSQL JSONB
    public string InputPayload { get; set; } = "{}";
    public string OutputPayload { get; set; } = "{}";
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public AgentWorkflow AgentWorkflow { get; set; } = null!;
    public ICollection<ToolExecution> ToolExecutions { get; set; } = new List<ToolExecution>();
}
