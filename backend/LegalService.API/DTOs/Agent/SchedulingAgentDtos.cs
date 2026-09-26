using System;

namespace LegalService.API.DTOs.Agent;

public class CreateSchedulingSessionRequest
{
    public string? CustomerId { get; set; }
    public string? ClientName { get; set; }
    public string? UserRole { get; set; } = "Client";
}

public class SendSchedulingMessageRequest
{
    public string Message { get; set; } = string.Empty;
    public string? SelectedLawyerId { get; set; }
    public string? SelectedSlotId { get; set; }
    public string? SelectedSlotTime { get; set; }
    public string? ConsultationType { get; set; }
}
