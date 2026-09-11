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
    Task<CreateAgentChatSessionResponse?> CreateChatSessionAsync(Guid customerId);
    Task<SendAgentChatMessageResponse?> SendChatMessageAsync(string sessionId, string message, string? uploadedFileId, string? expectedType);
    Task<AgentChatSessionStatusResponse?> GetChatSessionStatusAsync(string sessionId);
}

