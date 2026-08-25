using System;

namespace LegalService.API.Models.Entities;

public class ValidationResult
{
    public Guid ValidationId { get; set; }
    public Guid WorkflowId { get; set; }
    
    // Store JSON data as a string property mapped to PostgreSQL JSONB
    public string RulesChecked { get; set; } = "[]";
    public bool Passed { get; set; }
    public string Errors { get; set; } = "[]";
    
    public DateTime CheckedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public AgentWorkflow AgentWorkflow { get; set; } = null!;
}
