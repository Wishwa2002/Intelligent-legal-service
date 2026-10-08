namespace LegalService.API.DTOs.Agent;

public class ServiceRequestChatMessageRequest
{
    public string? SessionId { get; set; }

    public string Message { get; set; } = string.Empty;
}