using LegalService.API.DTOs.Agent;
using LegalService.API.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace LegalService.API.Controllers;

[ApiController]
[Route("api/service-request-chat")]
public class ServiceRequestChatController : ControllerBase
{
    private readonly IServiceRequestChatService _chatService;

    public ServiceRequestChatController(
        IServiceRequestChatService chatService)
    {
        _chatService = chatService;
    }

    [HttpPost("message")]
    public async Task<IActionResult> SendMessage(
        [FromBody] ServiceRequestChatMessageRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Message))
        {
            return BadRequest(new
            {
                message = "Message is required."
            });
        }

        var result = await _chatService.ProcessMessageAsync(
            request,
            cancellationToken);

        return Ok(result);
    }
}