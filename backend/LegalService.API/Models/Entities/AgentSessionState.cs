namespace LegalService.API.Models.Entities;

public sealed class AgentSessionState
{
    public string Kind { get; set; } = string.Empty;
    public string SessionId { get; set; } = string.Empty;
    public string StateJson { get; set; } = "{}";
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
