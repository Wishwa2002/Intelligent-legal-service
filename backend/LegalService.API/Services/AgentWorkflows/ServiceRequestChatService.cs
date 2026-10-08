using LegalService.API.DTOs.Agent;
using LegalService.API.Interfaces;

namespace LegalService.API.Services.AgentWorkflows;

public class ServiceRequestChatService : IServiceRequestChatService
{
    public Task<ServiceRequestChatResponse> ProcessMessageAsync(
        ServiceRequestChatMessageRequest request,
        CancellationToken cancellationToken = default)
    {
        var sessionId = string.IsNullOrWhiteSpace(request.SessionId)
            ? Guid.NewGuid().ToString()
            : request.SessionId!;

        var text = request.Message.Trim();
        var lower = text.ToLowerInvariant();

        string? category = null;
        string? requestType = null;
        string? priority = null;

        if (lower.Contains("land") ||
            lower.Contains("property") ||
            lower.Contains("tenant") ||
            lower.Contains("landlord") ||
            lower.Contains("lease"))
        {
            category = "Property";
            requestType = "Legal Consultation";
        }
        else if (lower.Contains("police") ||
                 lower.Contains("arrest") ||
                 lower.Contains("criminal"))
        {
            category = "Criminal";
            requestType = "Legal Consultation";
        }
        else if (lower.Contains("job") ||
                 lower.Contains("employer") ||
                 lower.Contains("salary") ||
                 lower.Contains("dismiss"))
        {
            category = "Employment";
            requestType = "Legal Consultation";
        }
        else if (lower.Contains("contract") ||
                 lower.Contains("agreement") ||
                 lower.Contains("document") ||
                 lower.Contains("deed"))
        {
            category = "Documentation";
            requestType = "Documentation";
        }

        if (lower.Contains("urgent") ||
            lower.Contains("immediately") ||
            lower.Contains("today"))
        {
            priority = "Urgent";
        }
        else
        {
            priority = "Medium";
        }

        var missing = new List<string>();

        if (category == null)
            missing.Add("legal category");

        if (requestType == null)
            missing.Add("request type");

        if (text.Length < 20)
            missing.Add("more details about the legal problem");

        var ready = missing.Count == 0;

        var response = new ServiceRequestChatResponse
        {
            SessionId = sessionId,
            DetectedCategory = category,
            RequestType = requestType,
            Priority = priority,
            MissingInformation = missing,
            IsReadyToSubmit = ready,
            Draft = new ServiceRequestDraftDto
            {
                Title = category != null
                    ? $"{category} legal assistance request"
                    : "Legal assistance request",

                Description = text,
                RequestType = requestType,
                Priority = priority,
                LegalCategory = category
            }
        };

        if (ready)
        {
            response.Reply =
                "I have enough information to prepare your legal request. Please review the draft before submitting.";
        }
        else
        {
            response.Reply =
                $"I need a little more information about: {string.Join(", ", missing)}.";
        }

        return Task.FromResult(response);
    }
}