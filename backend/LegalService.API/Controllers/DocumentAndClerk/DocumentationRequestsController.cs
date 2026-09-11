using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using LegalService.API.DTOs.Requests;
using LegalService.API.Interfaces;

namespace LegalService.API.Controllers;

[ApiController]
[Route("api/documentation-requests")]
public class DocumentationRequestsController : ControllerBase
{
    private readonly IDocumentationRequestService _requestService;

    public DocumentationRequestsController(IDocumentationRequestService requestService)
    {
        _requestService = requestService;
    }

    /// <summary>
    /// Get all documentation requests with optional filters.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int? customerId = null,
        [FromQuery] int? clerkId = null,
        [FromQuery] string? status = null)
    {
        var requests = await _requestService.GetAllRequestsAsync(customerId, clerkId, status);
        return Ok(requests);
    }

    /// <summary>
    /// Get documentation request by ID.
    /// </summary>
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var request = await _requestService.GetRequestByIdAsync(id);
        if (request == null)
            return NotFound(new { message = $"Documentation request with ID '{id}' was not found." });

        return Ok(request);
    }

    /// <summary>
    /// Create a new documentation request.
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> Create(
        [FromQuery] int customerId,
        [FromBody] CreateDocumentationRequestRequest request)
    {
        if (customerId <= 0)
            return BadRequest(new { message = "customerId query parameter is required and must be valid." });

        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var created = await _requestService.CreateRequestAsync(customerId, request);
        return CreatedAtAction(nameof(GetById), new { id = created.RequestId }, created);
    }

    /// <summary>
    /// Update documentation request status (e.g. UNDER_REVIEW, IN_PROGRESS, REQUIRES_DOCUMENTS, COMPLETED).
    /// </summary>
    [HttpPut("{id:int}/status")]
    public async Task<IActionResult> UpdateStatus(
        int id,
        [FromBody] UpdateDocumentationRequestStatusRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var updated = await _requestService.UpdateRequestStatusAsync(id, request.Status);
        if (updated == null)
            return NotFound(new { message = $"Documentation request with ID '{id}' was not found." });

        return Ok(updated);
    }

    /// <summary>
    /// Assign a clerk to a documentation request.
    /// </summary>
    [HttpPost("{id:int}/assign-clerk")]
    public async Task<IActionResult> AssignClerk(
        int id,
        [FromBody] AssignClerkRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var updated = await _requestService.AssignClerkAsync(id, request.ClerkId);
        if (updated == null)
            return NotFound(new { message = $"Documentation request with ID '{id}' was not found." });

        return Ok(updated);
    }
}
