using System;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using LegalService.API.Data;
using LegalService.API.DTOs.Agent;
using LegalService.API.Models.Entities;

namespace LegalService.API.AgentIntegration;

public class AgentIntegrationService : IAgentIntegrationService
{
    private readonly HttpClient _httpClient;
    private readonly ApplicationDbContext _context;
    private readonly ILogger<AgentIntegrationService> _logger;
    private readonly string _aiServiceBaseUrl;

    public AgentIntegrationService(
        HttpClient httpClient,
        ApplicationDbContext context,
        IConfiguration configuration,
        ILogger<AgentIntegrationService> logger)
    {
        _httpClient = httpClient;
        _context = context;
        _logger = logger;
        _aiServiceBaseUrl = configuration["AiService:BaseUrl"] ?? "http://localhost:8001";
    }

    private static int ParseIntId(object? val)
    {
        if (val == null) return 0;
        if (val is int i) return i;
        if (val is long l) return (int)l;
        if (val is JsonElement elem)
        {
            if (elem.ValueKind == JsonValueKind.Number && elem.TryGetInt32(out int parsedVal))
                return parsedVal;
            if (elem.ValueKind == JsonValueKind.String && int.TryParse(elem.GetString(), out int strVal))
                return strVal;
        }
        if (int.TryParse(val.ToString(), out int parsed)) return parsed;
        return 0;
    }

    public async Task<AgentAnalysisResponse> AnalyzeDocumentationRequestAsync(
        object? requestId,
        string? customerId,
        string objective)
    {
        int reqId = ParseIntId(requestId);
        DocumentationRequest? docRequest = null;
        if (reqId > 0)
        {
            docRequest = await _context.DocumentationRequests.FindAsync(reqId);
        }

        int custId = 0;
        if (!string.IsNullOrWhiteSpace(customerId) && int.TryParse(customerId, out int parsedCustId))
        {
            custId = parsedCustId;
        }
        else if (docRequest != null)
        {
            custId = docRequest.CustomerId;
        }
        if (custId <= 0) custId = 1;

        var payload = new
        {
            request_id = reqId > 0 ? reqId : 1,
            customer_id = custId,
            objective = objective,
            document_ids = Array.Empty<int>()
        };

        try
        {
            _logger.LogInformation("Invoking AI Agent analyze for RequestId={RequestId}, CustomerId={CustomerId}", reqId, custId);
            var response = await _httpClient.PostAsJsonAsync($"{_aiServiceBaseUrl}/api/agent/documentation/analyze", payload);

            if (!response.IsSuccessStatusCode)
            {
                var errorContent = await response.Content.ReadAsStringAsync();
                _logger.LogError("AI Agent returned error status {StatusCode}: {Error}", response.StatusCode, errorContent);
                return new AgentAnalysisResponse
                {
                    Status = "AI_SERVICE_ERROR",
                    Errors = new() { $"AI service returned HTTP {response.StatusCode}: {errorContent}" }
                };
            }

            var result = await response.Content.ReadFromJsonAsync<AgentAnalysisResponse>();
            return result ?? new AgentAnalysisResponse { Status = "EMPTY_RESPONSE" };
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "Failed to connect to AI service at {BaseUrl}", _aiServiceBaseUrl);
            return new AgentAnalysisResponse
            {
                Status = "AI_SERVICE_UNAVAILABLE",
                Errors = new() { $"AI service is unavailable at {_aiServiceBaseUrl}. Ensure the ai-service is running. Details: {ex.Message}" }
            };
        }
    }

    public async Task<AgentApprovalResponse> SubmitApprovalDecisionAsync(
        string workflowId,
        string decision,
        object? approverId,
        string comment)
    {
        int approvedByInt = ParseIntId(approverId);
        if (approvedByInt <= 0)
        {
            approvedByInt = 1; // Default to Admin ID 1
        }

        var payload = new
        {
            decision = decision.ToUpperInvariant(),
            approved_by = approvedByInt,
            comment = comment
        };

        try
        {
            _logger.LogInformation("Submitting human approval for WorkflowId={WorkflowId}, Decision={Decision}", workflowId, decision);
            var response = await _httpClient.PostAsJsonAsync($"{_aiServiceBaseUrl}/api/agent/workflows/{workflowId}/approve", payload);

            if (!response.IsSuccessStatusCode)
            {
                var errorContent = await response.Content.ReadAsStringAsync();
                _logger.LogError("AI Agent approval returned status {StatusCode}: {Error}", response.StatusCode, errorContent);
                return new AgentApprovalResponse
                {
                    WorkflowId = workflowId,
                    Status = "ERROR",
                    Errors = new() { $"AI service returned HTTP {response.StatusCode}: {errorContent}" }
                };
            }

            var result = await response.Content.ReadFromJsonAsync<AgentApprovalResponse>();
            return result ?? new AgentApprovalResponse { WorkflowId = workflowId, Status = "EMPTY_RESPONSE" };
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "Failed to connect to AI service for approval WorkflowId={WorkflowId}", workflowId);
            return new AgentApprovalResponse
            {
                WorkflowId = workflowId,
                Status = "AI_SERVICE_UNAVAILABLE",
                Errors = new() { $"AI service is unavailable. Details: {ex.Message}" }
            };
        }
    }

    public async Task<object?> GetWorkflowStateAsync(string workflowId)
    {
        try
        {
            var response = await _httpClient.GetAsync($"{_aiServiceBaseUrl}/api/agent/workflows/{workflowId}");
            if (!response.IsSuccessStatusCode) return null;
            return await response.Content.ReadFromJsonAsync<object>();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting workflow state {WorkflowId}", workflowId);
            return null;
        }
    }

    public async Task<object?> GetWorkflowSummaryAsync(string workflowId)
    {
        try
        {
            var response = await _httpClient.GetAsync($"{_aiServiceBaseUrl}/api/agent/workflows/{workflowId}/summary");
            if (!response.IsSuccessStatusCode) return null;
            return await response.Content.ReadFromJsonAsync<object>();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting workflow summary {WorkflowId}", workflowId);
            return null;
        }
    }

    public async Task<CreateAgentChatSessionResponse?> CreateChatSessionAsync(Guid customerId)
    {
        var payload = new { customer_id = customerId.ToString() };
        try
        {
            _logger.LogInformation("Creating AI Chat Session for CustomerId={CustomerId}", customerId);
            var response = await _httpClient.PostAsJsonAsync($"{_aiServiceBaseUrl}/api/agent/chat/session", payload);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("Failed to create AI chat session. StatusCode={StatusCode}", response.StatusCode);
                return null;
            }

            var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            return await response.Content.ReadFromJsonAsync<CreateAgentChatSessionResponse>(options);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating AI chat session for CustomerId={CustomerId}", customerId);
            return null;
        }
    }

    public async Task<SendAgentChatMessageResponse?> SendChatMessageAsync(
        string sessionId,
        string message,
        string? uploadedFileId,
        string? expectedType)
    {
        var payload = new
        {
            message = message,
            uploaded_file_id = uploadedFileId,
            uploaded_file_expected_type = expectedType
        };

        try
        {
            _logger.LogInformation("Sending message to AI Chat Session {SessionId}, HasFile={HasFile}", sessionId, !string.IsNullOrWhiteSpace(uploadedFileId));
            var response = await _httpClient.PostAsJsonAsync($"{_aiServiceBaseUrl}/api/agent/chat/{sessionId}/message", payload);
            if (!response.IsSuccessStatusCode)
            {
                var err = await response.Content.ReadAsStringAsync();
                _logger.LogError("AI Chat session message error {StatusCode}: {Error}", response.StatusCode, err);
                return new SendAgentChatMessageResponse
                {
                    Message = "I encountered an error communicating with the AI service. Please try again.",
                    Phase = "ERROR"
                };
            }

            var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            return await response.Content.ReadFromJsonAsync<SendAgentChatMessageResponse>(options);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending message to AI chat session {SessionId}", sessionId);
            return new SendAgentChatMessageResponse
            {
                Message = $"AI service is unavailable. Please ensure the AI backend is active. ({ex.Message})",
                Phase = "ERROR"
            };
        }
    }

    public async Task<AgentChatSessionStatusResponse?> GetChatSessionStatusAsync(string sessionId)
    {
        try
        {
            var response = await _httpClient.GetAsync($"{_aiServiceBaseUrl}/api/agent/chat/{sessionId}/status");
            if (!response.IsSuccessStatusCode) return null;

            var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            return await response.Content.ReadFromJsonAsync<AgentChatSessionStatusResponse>(options);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting chat session status {SessionId}", sessionId);
            return null;
        }
    }
}
