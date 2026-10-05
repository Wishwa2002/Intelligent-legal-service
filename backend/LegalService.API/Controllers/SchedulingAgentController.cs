using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using LegalService.API.AgentIntegration;
using LegalService.API.DTOs.Agent;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using System.Text.Json;

namespace LegalService.API.Controllers;

[ApiController]
[Route("api/agent/scheduling")]
[Authorize(Roles = "Customer,Admin,Clerk")]
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
        var customerId = User.IsInRole("Customer")
            ? User.FindFirstValue(ClaimTypes.NameIdentifier)!
            : request?.CustomerId;
        if (string.IsNullOrWhiteSpace(customerId)) return BadRequest(new { message = "Customer ID is required." });
        var session = await _agentService.CreateSchedulingSessionAsync(customerId, request?.ClientName, request?.UserRole);
        if (session == null)
        {
            return StatusCode(503, new { message = "Failed to initialize Scheduling AI session." });
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

        if (!await CanAccessSession(sessionId)) return Forbid();

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
        if (User.IsInRole("Customer") && !MatchesCustomer(status)) return Forbid();
        return Ok(status);
    }

    private async Task<bool> CanAccessSession(string sessionId)
    {
        if (!User.IsInRole("Customer")) return true;
        var status = await _agentService.GetSchedulingSessionStatusAsync(sessionId);
        return status is not null && MatchesCustomer(status);
    }

    private bool MatchesCustomer(object status)
    {
        if (status is not JsonElement json || !json.TryGetProperty("customer_id", out var customer)) return false;
        return customer.GetString() == User.FindFirstValue(ClaimTypes.NameIdentifier);
    }
}
