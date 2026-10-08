namespace LegalService.API.DTOs.Agent;

public class ServiceRequestChatResponse
{
    public string SessionId { get; set; } = string.Empty;

    public string Reply { get; set; } = string.Empty;

    public bool IsReadyToSubmit { get; set; }

    public string? DetectedCategory { get; set; }

    public string? RequestType { get; set; }

    public string? Priority { get; set; }

    public List<string> MissingInformation { get; set; } = new();

    public ServiceRequestDraftDto Draft { get; set; } = new();
}

public class ServiceRequestDraftDto
{
    public string? Title { get; set; }

    public string? Description { get; set; }

    public string? RequestType { get; set; }

    public string? Priority { get; set; }

    public string? LegalCategory { get; set; }
}