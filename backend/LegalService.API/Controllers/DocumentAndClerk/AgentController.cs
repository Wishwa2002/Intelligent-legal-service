using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using LegalService.API.AgentIntegration;
using LegalService.API.DTOs.Agent;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace LegalService.API.Controllers;

[ApiController]
[Route("api/agent")]
[Authorize(Roles = "Admin,Clerk")]
public class AgentController : ControllerBase
{
    private readonly IAgentIntegrationService _agentService;

    public AgentController(IAgentIntegrationService agentService)
    {
        _agentService = agentService;
    }

    /// <summary>
    /// Trigger the Agentic AI workflow for documentation analysis and clerk recommendation.
    /// </summary>
    [HttpPost("documentation/analyze")]
    public async Task<IActionResult> Analyze(
        [FromQuery] string? customerId,
        [FromBody] TriggerAgentAnalysisRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var result = await _agentService.AnalyzeDocumentationRequestAsync(
            request.RequestId,
            customerId,
            request.Objective);

        return Ok(result);
    }

    /// <summary>
    /// Submit human-in-the-loop approval decision (Admin only).
    /// </summary>
    [HttpPost("workflows/{workflowId}/approve")]
    public async Task<IActionResult> Approve(
        string workflowId,
        [FromBody] SubmitAgentApprovalRequest request)
    {
        if (string.IsNullOrWhiteSpace(workflowId))
            return BadRequest(new { message = "workflowId is required in URL." });

        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var result = await _agentService.SubmitApprovalDecisionAsync(
            workflowId,
            request.Decision,
            User.FindFirstValue(ClaimTypes.NameIdentifier),
            request.Comment);

        return Ok(result);
    }

    [HttpGet("request/{requestId:int}/status")]
    public async Task<IActionResult> GetRequestStatus(int requestId, CancellationToken cancellationToken)
    {
        var result = await _agentService.GetRequestStatusAsync(requestId, cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }

    /// <summary>
    /// Get the current state of an AI agent workflow.
    /// </summary>
    [HttpGet("workflows/{workflowId}/state")]
    public async Task<IActionResult> GetState(string workflowId)
    {
        var state = await _agentService.GetWorkflowStateAsync(workflowId);
        if (state == null)
            return NotFound(new { message = $"Workflow '{workflowId}' was not found or is unavailable." });

        return Ok(state);
    }

    /// <summary>
    /// Get the execution summary of a completed AI agent workflow.
    /// </summary>
    [HttpGet("workflows/{workflowId}/summary")]
    public async Task<IActionResult> GetSummary(string workflowId)
    {
        var summary = await _agentService.GetWorkflowSummaryAsync(workflowId);
        if (summary == null)
            return NotFound(new { message = $"Summary for workflow '{workflowId}' is not yet available or not found." });

        return Ok(summary);
    }
}
