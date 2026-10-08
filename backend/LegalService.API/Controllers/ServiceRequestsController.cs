using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using LegalService.API.DTOs.Requests;
using LegalService.API.Interfaces;
using LegalService.API.Models.Entities;

namespace LegalService.API.Controllers;

/// <summary>
/// Customer Service Request management API.
/// customerId is passed as a query param.
/// </summary>
[ApiController]
[Route("api/service-requests")]
public class ServiceRequestsController : ControllerBase
{
    private readonly IServiceRequestService _service;
    private readonly IPlanningCoordinatorService _planningCoordinator;
    private readonly ILogger<ServiceRequestsController> _logger;

    public ServiceRequestsController(
        IServiceRequestService service,
        IPlanningCoordinatorService planningCoordinator,
        ILogger<ServiceRequestsController> logger)
    {
        _service = service;
        _planningCoordinator = planningCoordinator;
        _logger = logger;
    }

    // POST /api/service-requests?customerId={id}
    [HttpPost]
    public async Task<IActionResult> Create(
        [FromQuery] int customerId,
        [FromBody] CreateServiceRequestRequest dto,
        CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        if (customerId <= 0)
        {
            return BadRequest(new
            {
                message = "A valid customerId is required."
            });
        }

        // 1. Create the service request.
        var result = await _service.CreateAsync(
            customerId,
            dto);

        // 2. Automatically start the Planning / Coordinator workflow.
        try
        {
            var workflow =
                await _planningCoordinator.StartAndExecuteAsync(
                    result.ServiceRequestId,
                    cancellationToken);

            _logger.LogInformation(
                "Planning Coordinator workflow {WorkflowId} started automatically for ServiceRequest {ServiceRequestId}",
                workflow.WorkflowId,
                result.ServiceRequestId);
        }
        catch (Exception ex)
        {
            // The customer request is already saved.
            // Workflow failure should not make the request submission fail.
            _logger.LogError(
                ex,
                "ServiceRequest {ServiceRequestId} was created, but the Planning Coordinator workflow could not be started.",
                result.ServiceRequestId);
        }

        return CreatedAtAction(
            nameof(GetById),
            new
            {
                id = result.ServiceRequestId
            },
            result);
    }

    // GET /api/service-requests[?customerId=&status=&requestType=]
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int? customerId,
        [FromQuery] string? status,
        [FromQuery] string? requestType)
    {
        var results =
            await _service.GetAllAsync(
                customerId,
                status,
                requestType);

        return Ok(results);
    }

    // GET /api/service-requests/{id}
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(
        [FromRoute] Guid id)
    {
        var result =
            await _service.GetByIdAsync(id);

        if (result == null)
        {
            return NotFound(new
            {
                message =
                    $"Service request '{id}' was not found."
            });
        }

        return Ok(result);
    }

    // PUT /api/service-requests/{id}?customerId={id}
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(
        [FromRoute] Guid id,
        [FromQuery] int customerId,
        [FromBody] UpdateServiceRequestRequest dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        if (customerId <= 0)
        {
            return BadRequest(new
            {
                message = "A valid customerId is required."
            });
        }

        var result =
            await _service.UpdateAsync(
                id,
                customerId,
                dto);

        if (result == null)
        {
            return NotFound(new
            {
                message =
                    $"Service request '{id}' was not found."
            });
        }

        return Ok(result);
    }

    // DELETE /api/service-requests/{id}?customerId={id}
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Cancel(
        [FromRoute] Guid id,
        [FromQuery] int customerId)
    {
        if (customerId <= 0)
        {
            return BadRequest(new
            {
                message = "A valid customerId is required."
            });
        }

        var result =
            await _service.CancelAsync(
                id,
                customerId);

        if (result == null)
        {
            return NotFound(new
            {
                message =
                    $"Service request '{id}' was not found."
            });
        }

        return Ok(result);
    }

    // PATCH /api/service-requests/{id}/status
    [HttpPatch("{id:guid}/status")]
    public async Task<IActionResult> ChangeStatus(
        [FromRoute] Guid id,
        [FromQuery] int? adminUserId,
        [FromBody] ChangeServiceRequestStatusRequest dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var result =
            await _service.ChangeStatusAsync(
                id,
                dto.Status,
                dto.Note,
                adminUserId);

        if (result == null)
        {
            return NotFound(new
            {
                message =
                    $"Service request '{id}' was not found."
            });
        }

        return Ok(result);
    }
}