using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using LegalService.API.AgentIntegration;
using LegalService.API.DTOs.Agent;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace LegalService.API.Controllers;

[ApiController]
[Route("api/agent/chat")]
[Authorize(Roles = "Admin,Clerk,Customer")]
public class AgentChatController : ControllerBase
{
    private readonly IAgentIntegrationService _agentService;

    public AgentChatController(IAgentIntegrationService agentService)
    {
        _agentService = agentService;
    }

    /// <summary>
    /// Initialize a new stateful Agentic AI chat session for a customer.
    /// </summary>
    [HttpPost("session")]
    public async Task<IActionResult> CreateSession([FromBody] CreateAgentChatSessionRequest request)
    {
        var customerId = User.IsInRole("Customer")
            ? User.FindFirstValue(ClaimTypes.NameIdentifier)!
            : request?.CustomerId;
        if (string.IsNullOrWhiteSpace(customerId)) return BadRequest(new { message = "Customer ID is required." });
        var session = await _agentService.CreateChatSessionAsync(customerId);
        if (session == null)
        {
            return StatusCode(503, new { message = "Failed to initialize AI Chat session. Ensure the AI service is online." });
        }

        return Ok(session);
    }

    /// <summary>
    /// Send a message or document upload notification to the active AI agent workflow.
    /// </summary>
    [HttpPost("{sessionId}/message")]
    public async Task<IActionResult> SendMessage(
        string sessionId,
        [FromBody] SendAgentChatMessageRequest request)
    {
        if (string.IsNullOrWhiteSpace(sessionId))
        {
            return BadRequest(new { message = "sessionId is required in URL." });
        }

        if (!await CanAccessSession(sessionId)) return Forbid();

        var reply = await _agentService.SendChatMessageAsync(
            sessionId,
            request.Message ?? string.Empty,
            request.UploadedFileId,
            request.UploadedFileExpectedType);

        if (reply == null)
        {
            return StatusCode(503, new { message = "AI service did not return a response." });
        }

        return Ok(reply);
    }

    /// <summary>
    /// Poll the current workflow phase and status for an ongoing chat session.
    /// </summary>
    [HttpGet("{sessionId}/status")]
    public async Task<IActionResult> GetStatus(string sessionId)
    {
        if (string.IsNullOrWhiteSpace(sessionId))
        {
            return BadRequest(new { message = "sessionId is required." });
        }

        var status = await _agentService.GetChatSessionStatusAsync(sessionId);
        if (status == null)
        {
            return NotFound(new { message = $"Chat session '{sessionId}' not found or unavailable." });
        }

        if (User.IsInRole("Customer") && status.CustomerId != User.FindFirstValue(ClaimTypes.NameIdentifier))
            return Forbid();

        return Ok(status);
    }

    [HttpGet("{sessionId}/messages")]
    [Authorize(Roles = "Admin,Clerk")]
    public async Task<IActionResult> GetMessages(string sessionId, CancellationToken cancellationToken)
    {
        var result = await _agentService.GetChatMessagesAsync(sessionId, cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }

    private async Task<bool> CanAccessSession(string sessionId)
    {
        if (!User.IsInRole("Customer")) return true;
        var status = await _agentService.GetChatSessionStatusAsync(sessionId);
        return status is not null && status.CustomerId == User.FindFirstValue(ClaimTypes.NameIdentifier);
    }
}
