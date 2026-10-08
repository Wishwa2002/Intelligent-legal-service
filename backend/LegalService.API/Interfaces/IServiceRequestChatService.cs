using LegalService.API.DTOs.Agent;

namespace LegalService.API.Interfaces;

public interface IServiceRequestChatService
{
    Task<ServiceRequestChatResponse> ProcessMessageAsync(
        ServiceRequestChatMessageRequest request,
        CancellationToken cancellationToken = default);
}