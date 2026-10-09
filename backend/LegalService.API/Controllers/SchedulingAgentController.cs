using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using LegalService.API.AgentIntegration;
using LegalService.API.DTOs.Agent;

namespace LegalService.API.Controllers;

[ApiController]
[Route("api/agent/scheduling")]
public class SchedulingAgentController : ControllerBase
{
    private readonly IAgentIntegrationService _agentService;

    public SchedulingAgentController(IAgentIntegrationService agentService)
    {
        _agentService = agentService;
    }

    /// <summary>
    /// Initialize a new stateful AI Lawyer Scheduling session.
    /// </summary>
    [HttpPost("session")]
    public async Task<IActionResult> CreateSession([FromBody] CreateSchedulingSessionRequest request)
    {
        var customerId = string.IsNullOrWhiteSpace(request?.CustomerId) ? "guest" : request.CustomerId;
        var session = await _agentService.CreateSchedulingSessionAsync(customerId, request?.ClientName, request?.UserRole);
        if (session == null)
        {
            return StatusCode(503, new { message = "Failed to initialize Scheduling AI session. Ensure the AI service is online on port 8001." });
        }
        return Ok(session);
    }

    /// <summary>
    /// Send a message, slot choice, or confirmation action to the AI Lawyer Scheduling session.
    /// </summary>
    [HttpPost("{sessionId}/message")]
    public async Task<IActionResult> SendMessage(string sessionId, [FromBody] SendSchedulingMessageRequest request)
    {
        if (string.IsNullOrWhiteSpace(sessionId))
        {
            return BadRequest(new { message = "sessionId is required in URL." });
        }

        var reply = await _agentService.SendSchedulingMessageAsync(
            sessionId,
            request.Message,
            request.SelectedLawyerId,
            request.SelectedSlotId,
            request.SelectedSlotTime,
            request.ConsultationType);

        if (reply == null)
        {
            return StatusCode(503, new { message = "AI service did not return a response." });
        }
        return Ok(reply);
    }

    /// <summary>
    /// Get the current status and phase of a scheduling workflow session.
    /// </summary>
    [HttpGet("{sessionId}/status")]
    public async Task<IActionResult> GetStatus(string sessionId)
    {
        if (string.IsNullOrWhiteSpace(sessionId))
        {
            return BadRequest(new { message = "sessionId is required." });
        }
        var status = await _agentService.GetSchedulingSessionStatusAsync(sessionId);
        if (status == null)
        {
            return NotFound(new { message = $"Scheduling session '{sessionId}' not found." });
        }
        return Ok(status);
    }
}
