using System;

namespace LegalService.API.Models.Entities;

public class ToolExecution
{
    public Guid ToolId { get; set; }
    public Guid StepId { get; set; }
    public string ToolName { get; set; } = string.Empty;
    
    // Store JSON data as a string property mapped to PostgreSQL JSONB
    public string InputData { get; set; } = "{}";
    public string OutputData { get; set; } = "{}";
    
    public bool Success { get; set; }
    public DateTime ExecutedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public AgentStep AgentStep { get; set; } = null!;
}
