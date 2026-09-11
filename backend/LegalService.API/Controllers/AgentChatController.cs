using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using LegalService.API.AgentIntegration;
using LegalService.API.DTOs.Agent;

namespace LegalService.API.Controllers;

[ApiController]
[Route("api/agent/chat")]
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
        if (request.CustomerId == Guid.Empty)
        {
            return BadRequest(new { message = "CustomerId is required." });
        }

        var session = await _agentService.CreateChatSessionAsync(request.CustomerId);
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

        return Ok(status);
    }
}
