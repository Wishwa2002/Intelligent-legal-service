using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace LegalService.API.DTOs.Agent;

public class TriggerAgentAnalysisRequest
{
    [Required]
    public object? RequestId { get; set; }

    [Required]
    public string Objective { get; set; } = string.Empty;
}

public class SubmitAgentApprovalRequest
{
    [Required]
    public string Decision { get; set; } = "APPROVE"; // APPROVE | REJECT | REQUEST_REVISION

    public string Comment { get; set; } = string.Empty;
}

public class AgentAnalysisResponse
{
    [JsonPropertyName("workflow_id")]
    public string WorkflowId { get; set; } = string.Empty;

    [JsonPropertyName("workflowId")]
    public string WorkflowIdCamel => WorkflowId;

    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty;

    [JsonPropertyName("recommendation")]
    public object? Recommendation { get; set; }

    [JsonPropertyName("execution_summary")]
    public object? ExecutionSummary { get; set; }

    [JsonPropertyName("executionSummary")]
    public object? ExecutionSummaryCamel => ExecutionSummary;

    [JsonPropertyName("errors")]
    public List<string> Errors { get; set; } = new();
}

public class AgentApprovalResponse
{
    [JsonPropertyName("workflow_id")]
    public string WorkflowId { get; set; } = string.Empty;

    [JsonPropertyName("workflowId")]
    public string WorkflowIdCamel => WorkflowId;

    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty;

    [JsonPropertyName("decision")]
    public string Decision { get; set; } = string.Empty;

    [JsonPropertyName("execution_summary")]
    public object? ExecutionSummary { get; set; }

    [JsonPropertyName("executionSummary")]
    public object? ExecutionSummaryCamel => ExecutionSummary;

    [JsonPropertyName("errors")]
    public List<string> Errors { get; set; } = new();
}

