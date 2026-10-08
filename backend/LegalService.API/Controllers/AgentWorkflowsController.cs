using System.Text.Json;
using LegalService.API.DTOs.Agent;
using LegalService.API.Interfaces;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using LegalService.API.Infrastructure;

namespace LegalService.API.Controllers;

[ApiController]
[Route("api/agent-workflows")]
[Authorize]
public class AgentWorkflowsController : ControllerBase
{
    private readonly IPlanningCoordinatorService _coordinator;

    public AgentWorkflowsController(
        IPlanningCoordinatorService coordinator)
    {
        _coordinator = coordinator;
    }

    private int UserId =>
        int.TryParse(
            User.FindFirstValue(ClaimTypes.NameIdentifier),
            out var id)
            ? id
            : throw new ApiException(
                401,
                "A valid authenticated user is required.");

    // ---------------------------------------------------------
    // START WORKFLOW
    // POST /api/agent-workflows/start
    // ---------------------------------------------------------

    [HttpPost("start")]
    public async Task<IActionResult> StartWorkflow(
        [FromBody] StartCoordinatorWorkflowRequest request,
        CancellationToken cancellationToken)
    {
        if (request.ServiceRequestId == Guid.Empty)
        {
            return BadRequest(new
            {
                message = "ServiceRequestId is required."
            });
        }

        try
        {
            var workflow =
                await _coordinator.StartWorkflowAsync(
                    request.ServiceRequestId,
                    cancellationToken);

            var steps = workflow.AgentSteps
                .Select(step =>
                {
                    int? order = null;
                    string? action = null;

                    try
                    {
                        using var json =
                            JsonDocument.Parse(step.InputPayload);

                        if (json.RootElement.TryGetProperty(
                            "order",
                            out var orderElement))
                        {
                            order =
                                orderElement.GetInt32();
                        }

                        if (json.RootElement.TryGetProperty(
                            "action",
                            out var actionElement))
                        {
                            action =
                                actionElement.GetString();
                        }
                    }
                    catch
                    {
                        // Ignore malformed old payloads.
                    }

                    return new
                    {
                        stepId = step.StepId,
                        order,
                        agentName = step.AgentName,
                        stepName = step.StepName,
                        action,
                        status = step.Status
                    };
                })
                .OrderBy(x => x.order)
                .ToList();

            return Ok(new
            {
                workflowId = workflow.WorkflowId,
                serviceRequestId = workflow.ServiceRequestId,
                status = workflow.Status,
                createdAt = workflow.CreatedAt,
                steps
            });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new
            {
                message = ex.Message
            });
        }
    }

    // ---------------------------------------------------------
    // EXECUTE LAWYER RECOMMENDATION
    // POST /api/agent-workflows/{id}/execute-lawyer
    // ---------------------------------------------------------

    [HttpPost("{id:guid}/execute-lawyer")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> ExecuteLawyerRecommendation(
        Guid id,
        CancellationToken cancellationToken)
    {
        try
        {
            var workflow =
                await _coordinator.ExecuteLawyerRecommendationAsync(
                    id,
                    UserId,
                    cancellationToken);

            var lawyerStep = workflow.AgentSteps
                .FirstOrDefault(x =>
                    x.AgentName ==
                    "LawyerRecommendationAgent");

            return Ok(new
            {
                workflowId = workflow.WorkflowId,
                status = workflow.Status,

                lawyerStep = lawyerStep == null
                    ? null
                    : new
                    {
                        stepId = lawyerStep.StepId,
                        agentName = lawyerStep.AgentName,
                        stepName = lawyerStep.StepName,
                        status = lawyerStep.Status,
                        outputPayload = lawyerStep.OutputPayload
                    }
            });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new
            {
                message = ex.Message
            });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new
            {
                message = ex.Message
            });
        }
    }

    // ---------------------------------------------------------
    // EXECUTE ALL (orchestrated run)
    // POST /api/agent-workflows/{id}/execute-all
    // ---------------------------------------------------------

    [HttpPost("{id:guid}/execute-all")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> ExecuteAll(
        Guid id,
        CancellationToken cancellationToken)
    {
        try
        {
            var workflow =
                await _coordinator.ExecuteAllAsync(
                    id,
                    UserId,
                    cancellationToken);

            var steps = workflow.AgentSteps
                .Select(step =>
                {
                    int? order = null;
                    try
                    {
                        using var json = JsonDocument.Parse(step.InputPayload);
                        if (json.RootElement.TryGetProperty(
                            "order", out var orderEl))
                        {
                            order = orderEl.GetInt32();
                        }
                    }
                    catch { /* ignore */ }

                    return new
                    {
                        stepId        = step.StepId,
                        order,
                        agentName     = step.AgentName,
                        stepName      = step.StepName,
                        status        = step.Status,
                        outputPayload = step.OutputPayload
                    };
                })
                .OrderBy(x => x.order)
                .ToList();

            return Ok(new
            {
                workflowId  = workflow.WorkflowId,
                status      = workflow.Status,
                updatedAt   = workflow.UpdatedAt,
                steps
            });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // ---------------------------------------------------------
    // VALIDATE (coordinator validation only)
    // POST /api/agent-workflows/{id}/validate
    // ---------------------------------------------------------

    [HttpPost("{id:guid}/validate")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Validate(
        Guid id,
        CancellationToken cancellationToken)
    {
        try
        {
            var workflow =
                await _coordinator.ValidateAndTransitionAsync(
                    id,
                    UserId,
                    cancellationToken);

            var validationStep = workflow.AgentSteps
                .FirstOrDefault(x =>
                    x.AgentName == "PlanningCoordinatorAgent" &&
                    x.StepName  == "Validate delegated results");

            return Ok(new
            {
                workflowId = workflow.WorkflowId,
                status     = workflow.Status,

                validationStep = validationStep == null
                    ? null
                    : new
                    {
                        stepId        = validationStep.StepId,
                        agentName     = validationStep.AgentName,
                        stepName      = validationStep.StepName,
                        status        = validationStep.Status,
                        outputPayload = validationStep.OutputPayload
                    }
            });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // ---------------------------------------------------------
    // EXECUTE SCHEDULING AGENT
    // POST /api/agent-workflows/{id}/execute-scheduling
    // ---------------------------------------------------------

    [HttpPost("{id:guid}/execute-scheduling")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> ExecuteScheduling(
        Guid id,
        CancellationToken cancellationToken)
    {
        try
        {
            var workflow =
                await _coordinator.ExecuteSchedulingAsync(
                    id,
                    UserId,
                    cancellationToken);

            var schedulingStep = workflow.AgentSteps
                .FirstOrDefault(x =>
                    x.AgentName ==
                    "SchedulingAgent");

            return Ok(new
            {
                workflowId = workflow.WorkflowId,
                status = workflow.Status,

                schedulingStep = schedulingStep == null
                    ? null
                    : new
                    {
                        stepId = schedulingStep.StepId,
                        agentName = schedulingStep.AgentName,
                        stepName = schedulingStep.StepName,
                        status = schedulingStep.Status,
                        outputPayload =
                            schedulingStep.OutputPayload
                    }
            });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new
            {
                message = ex.Message
            });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new
            {
                message = ex.Message
            });
        }
    }

    // ---------------------------------------------------------
    // EXECUTE DOCUMENTATION AGENT
    // POST /api/agent-workflows/{id}/execute-documentation
    // ---------------------------------------------------------

    [HttpPost("{id:guid}/execute-documentation")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> ExecuteDocumentation(
        Guid id,
        CancellationToken cancellationToken)
    {
        try
        {
            var workflow =
                await _coordinator.ExecuteDocumentationAsync(
                    id,
                    UserId,
                    cancellationToken);

            var documentationStep = workflow.AgentSteps
                .FirstOrDefault(x =>
                    x.AgentName ==
                    "DocumentationClerkAgent");

            return Ok(new
            {
                workflowId = workflow.WorkflowId,
                status = workflow.Status,

                documentationStep = documentationStep == null
                    ? null
                    : new
                    {
                        stepId = documentationStep.StepId,
                        agentName = documentationStep.AgentName,
                        stepName = documentationStep.StepName,
                        status = documentationStep.Status,
                        outputPayload =
                            documentationStep.OutputPayload
                    }
            });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new
            {
                message = ex.Message
            });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new
            {
                message = ex.Message
            });
        }
    }

    // ---------------------------------------------------------
    // APPROVE LAWYER / HUMAN APPROVAL
    // POST /api/agent-workflows/{id}/approve-lawyer
    // ---------------------------------------------------------

    [HttpPost("{id:guid}/approve-lawyer")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> ApproveLawyer(
        Guid id,
        [FromBody] ApproveLawyerWorkflowRequest request,
        CancellationToken cancellationToken)
    {
        if (request.LawyerId == Guid.Empty)
        {
            return BadRequest(new
            {
                message = "LawyerId is required."
            });
        }

        if (request.SlotId == Guid.Empty)
        {
            return BadRequest(new
            {
                message = "SlotId is required."
            });
        }

        try
        {
            var workflow =
                await _coordinator.ApproveLawyerAsync(
                    id,
                    request.LawyerId,
                    request.SlotId,
                    request.BookingDate,
                    UserId,
                    request.Comments,
                    cancellationToken);

            var lawyerStep = workflow.AgentSteps
                .FirstOrDefault(x =>
                    x.AgentName ==
                    "LawyerRecommendationAgent");

            var latestApproval =
                workflow.ApprovalDecisions
                    .OrderByDescending(x => x.DecidedAt)
                    .FirstOrDefault();

            return Ok(new
            {
                workflowId = workflow.WorkflowId,
                serviceRequestId = workflow.ServiceRequestId,
                status = workflow.Status,

                lawyerStep = lawyerStep == null
                    ? null
                    : new
                    {
                        stepId = lawyerStep.StepId,
                        agentName = lawyerStep.AgentName,
                        stepName = lawyerStep.StepName,
                        status = lawyerStep.Status,
                        outputPayload =
                            lawyerStep.OutputPayload
                    },

                approval = latestApproval == null
                    ? null
                    : new
                    {
                        decisionId =
                            latestApproval.DecisionId,

                        decision =
                            latestApproval.Decision,

                        comments =
                            latestApproval.Comments,

                        decidedAt =
                            latestApproval.DecidedAt
                    },

                executionSummary =
                    workflow.ExecutionSummary
            });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new
            {
                message = ex.Message
            });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new
            {
                message = ex.Message
            });
        }
    }

    // ---------------------------------------------------------
    // GET WORKFLOW
    // GET /api/agent-workflows/{id}
    // ---------------------------------------------------------

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetWorkflow(
        Guid id,
        CancellationToken cancellationToken)
    {
        var workflow =
            await _coordinator.GetWorkflowAsync(
                id,
                cancellationToken);

        if (workflow == null)
        {
            return NotFound(new
            {
                message =
                    "Agent workflow was not found."
            });
        }

        var steps = workflow.AgentSteps
            .Select(step =>
            {
                int order = int.MaxValue;

                try
                {
                    using var json =
                        JsonDocument.Parse(
                            step.InputPayload);

                    if (json.RootElement.TryGetProperty(
                        "order",
                        out var orderElement))
                    {
                        order =
                            orderElement.GetInt32();
                    }
                }
                catch
                {
                    // Ignore malformed old payloads.
                }

                return new
                {
                    order,
                    stepId = step.StepId,
                    agentName = step.AgentName,
                    stepName = step.StepName,
                    status = step.Status,
                    inputPayload = step.InputPayload,
                    outputPayload = step.OutputPayload,
                    createdAt = step.CreatedAt
                };
            })
            .OrderBy(x => x.order)
            .ToList();

        return Ok(new
        {
            workflowId = workflow.WorkflowId,

            serviceRequestId =
                workflow.ServiceRequestId,

            status =
                workflow.Status,

            createdAt =
                workflow.CreatedAt,

            updatedAt =
                workflow.UpdatedAt,

            serviceRequest =
                workflow.ServiceRequest == null
                    ? null
                    : new
                    {
                        title =
                            workflow.ServiceRequest.Title,

                        description =
                            workflow.ServiceRequest.Description,

                        requestType =
                            workflow.ServiceRequest.RequestType,

                        priority =
                            workflow.ServiceRequest.Priority,

                        status =
                            workflow.ServiceRequest.Status
                                .ToString()
                    },

            steps,

            validationResults =
                workflow.ValidationResults,

            approvalDecisions =
                workflow.ApprovalDecisions
                    .Select(x => new
                    {
                        decisionId =
                            x.DecisionId,

                        decision =
                            x.Decision,

                        comments =
                            x.Comments,

                        decidedAt =
                            x.DecidedAt
                    }),

            executionSummary =
                workflow.ExecutionSummary
        });
    }
}