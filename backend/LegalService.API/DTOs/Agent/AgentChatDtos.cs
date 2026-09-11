using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace LegalService.API.DTOs.Agent;

public class CreateAgentChatSessionRequest
{
    [JsonPropertyName("customerId")]
    public Guid CustomerId { get; set; }
}

public class CreateAgentChatSessionResponse
{
    [JsonPropertyName("session_id")]
    public string SessionId { get; set; } = string.Empty;

    [JsonPropertyName("customer_id")]
    public string CustomerId { get; set; } = string.Empty;

    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty;

    [JsonPropertyName("message")]
    public string? Message { get; set; }

    [JsonPropertyName("phase")]
    public string? Phase { get; set; }

    [JsonPropertyName("action_options")]
    public List<string> ActionOptions { get; set; } = new();
}

public class SendAgentChatMessageRequest
{
    [JsonPropertyName("message")]
    public string Message { get; set; } = string.Empty;

    [JsonPropertyName("uploadedFileId")]
    public string? UploadedFileId { get; set; }

    [JsonPropertyName("uploadedFileExpectedType")]
    public string? UploadedFileExpectedType { get; set; }
}

public class SendAgentChatMessageResponse
{
    [JsonPropertyName("message")]
    public string Message { get; set; } = string.Empty;

    [JsonPropertyName("phase")]
    public string Phase { get; set; } = string.Empty;

    [JsonPropertyName("awaiting_input")]
    public bool AwaitingInput { get; set; }

    [JsonPropertyName("awaiting_input_type")]
    public string AwaitingInputType { get; set; } = "TEXT";

    [JsonPropertyName("request_id")]
    public string? RequestId { get; set; }

    [JsonPropertyName("missing_documents")]
    public List<string> MissingDocuments { get; set; } = new();

    [JsonPropertyName("document_analysis")]
    public object? DocumentAnalysis { get; set; }

    [JsonPropertyName("action_options")]
    public List<string> ActionOptions { get; set; } = new();

    [JsonPropertyName("workflow_id")]
    public string? WorkflowId { get; set; }
}

public class AgentChatSessionStatusResponse
{
    [JsonPropertyName("session_id")]
    public string SessionId { get; set; } = string.Empty;

    [JsonPropertyName("customer_id")]
    public string CustomerId { get; set; } = string.Empty;

    [JsonPropertyName("phase")]
    public string Phase { get; set; } = string.Empty;

    [JsonPropertyName("request_id")]
    public string? RequestId { get; set; }

    [JsonPropertyName("workflow_id")]
    public string? WorkflowId { get; set; }

    [JsonPropertyName("service_name")]
    public string? ServiceName { get; set; }

    [JsonPropertyName("required_documents")]
    public List<string> RequiredDocuments { get; set; } = new();

    [JsonPropertyName("provided_documents")]
    public List<string> ProvidedDocuments { get; set; } = new();

    [JsonPropertyName("missing_documents")]
    public List<string> MissingDocuments { get; set; } = new();

    [JsonPropertyName("approval_status")]
    public string ApprovalStatus { get; set; } = string.Empty;

    [JsonPropertyName("last_activity")]
    public string LastActivity { get; set; } = string.Empty;
}

