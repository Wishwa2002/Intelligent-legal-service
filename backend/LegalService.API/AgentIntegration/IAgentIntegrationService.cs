using System;
using System.Threading.Tasks;
using LegalService.API.DTOs.Agent;

namespace LegalService.API.AgentIntegration;

public interface IAgentIntegrationService
{
    Task<AgentAnalysisResponse> AnalyzeDocumentationRequestAsync(object? requestId, string? customerId, string objective);
    Task<AgentApprovalResponse> SubmitApprovalDecisionAsync(string workflowId, string decision, object? approverId, string comment);
    Task<object?> GetWorkflowStateAsync(string workflowId);
    Task<object?> GetWorkflowSummaryAsync(string workflowId);

    // Conversational Agent Sessions
    Task<CreateAgentChatSessionResponse?> CreateChatSessionAsync(string customerId);
    Task<SendAgentChatMessageResponse?> SendChatMessageAsync(string sessionId, string message, string? uploadedFileId, string? expectedType);
    Task<AgentChatSessionStatusResponse?> GetChatSessionStatusAsync(string sessionId);
    Task<Dictionary<int, string>> GetChatClientNamesAsync();

    // Scheduling Agent Sessions
    Task<object?> CreateSchedulingSessionAsync(string customerId, string? clientName, string? userRole);
    Task<object?> SendSchedulingMessageAsync(string sessionId, string message, string? selectedLawyerId, string? selectedSlotId, string? selectedSlotTime, string? consultationType);
    Task<object?> GetSchedulingSessionStatusAsync(string sessionId);
}

