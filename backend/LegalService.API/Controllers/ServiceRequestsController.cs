using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using LegalService.API.DTOs.Requests;
using LegalService.API.Interfaces;
using LegalService.API.Models.Entities;

namespace LegalService.API.Controllers;

/// <summary>
/// Customer Service Request management API.
/// customerId is passed as a query param (matching the pattern used by DocumentationRequestsController).
/// </summary>
[ApiController]
[Route("api/service-requests")]
public class ServiceRequestsController : ControllerBase
{
    private readonly IServiceRequestService _service;

    public ServiceRequestsController(IServiceRequestService service)
    {
        _service = service;
    }

    // POST /api/service-requests?customerId={guid}
    [HttpPost]
    public async Task<IActionResult> Create(
        [FromQuery] int customerId,
        [FromBody] CreateServiceRequestRequest dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        if (customerId <= 0)
            return BadRequest(new { message = "A valid customerId  is required." });

        var result = await _service.CreateAsync(customerId, dto);
        return CreatedAtAction(nameof(GetById), new { id = result.ServiceRequestId }, result);
    }

    // GET /api/service-requests[?customerId=&status=&requestType=]
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int? customerId,
        [FromQuery] string? status,
        [FromQuery] string? requestType)
    {
        var results = await _service.GetAllAsync(customerId, status, requestType);
        return Ok(results);
    }

    // GET /api/service-requests/{id}
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById([FromRoute] Guid id)
    {
        var result = await _service.GetByIdAsync(id);
        if (result == null)
            return NotFound(new { message = $"Service request '{id}' was not found." });
        return Ok(result);
    }

    // PUT /api/service-requests/{id}?customerId={guid}
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(
        [FromRoute] Guid id,
        [FromQuery] int customerId,
        [FromBody] UpdateServiceRequestRequest dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        if (customerId <= 0)
            return BadRequest(new { message = "A valid customerId (Guid) is required." });

        var result = await _service.UpdateAsync(id, customerId, dto);
        if (result == null)
            return NotFound(new { message = $"Service request '{id}' was not found." });
        return Ok(result);
    }

    // DELETE /api/service-requests/{id}?customerId={guid}  (soft-delete — sets Cancelled)
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Cancel(
        [FromRoute] Guid id,
        [FromQuery] int customerId)
    {
        if (customerId <= 0)
            return BadRequest(new { message = "A valid customerId (Guid) is required." });

        var result = await _service.CancelAsync(id, customerId);
        if (result == null)
            return NotFound(new { message = $"Service request '{id}' was not found." });
        return Ok(result);
    }

    // PATCH /api/service-requests/{id}/status  (admin)
    [HttpPatch("{id:guid}/status")]
    public async Task<IActionResult> ChangeStatus(
        [FromRoute] Guid id,
        [FromQuery] int? adminUserId,
        [FromBody] ChangeServiceRequestStatusRequest dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var result = await _service.ChangeStatusAsync(id, dto.Status, dto.Note, adminUserId);
        if (result == null)
            return NotFound(new { message = $"Service request '{id}' was not found." });
        return Ok(result);
    }
}
