using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using LegalService.API.DTOs.Requests;
using LegalService.API.Interfaces;
using LegalService.API.Authentication;
using LegalService.API.Data;
using Microsoft.AspNetCore.Authorization;

namespace LegalService.API.Controllers;

[ApiController]
[Route("api/documentation-requests")]
[Authorize(Policy = "UserOrAi")]
public class DocumentationRequestsController : ControllerBase
{
    private readonly IDocumentationRequestService _requestService;
    private readonly ApplicationDbContext _db;
    private readonly IConfiguration _config;
    private bool IsStaffOrInternal => RequestAccess.IsStaff(User) || RequestAccess.IsInternal(HttpContext, _config);
    private Task<bool> CanAccess(int id) => RequestAccess.CanAccessDocumentationRequestAsync(HttpContext, _config, _db, id);

    public DocumentationRequestsController(IDocumentationRequestService requestService, ApplicationDbContext db, IConfiguration config)
    {
        _requestService = requestService;
        _db = db;
        _config = config;
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
        if (!IsStaffOrInternal)
        {
            customerId = RequestAccess.UserId(User);
            if (customerId is null) return Forbid();
        }
        var requests = await _requestService.GetAllRequestsAsync(customerId, clerkId, status);
        return Ok(requests);
    }

    /// <summary>
    /// Get documentation request by ID.
    /// </summary>
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        if (!await CanAccess(id)) return Forbid();
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
        if (!IsStaffOrInternal && RequestAccess.UserId(User) != customerId) return Forbid();
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
        if (!IsStaffOrInternal) return Forbid();
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
        if (!IsStaffOrInternal) return Forbid();
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var updated = await _requestService.AssignClerkAsync(id, request.ClerkId);
        if (updated == null)
            return NotFound(new { message = $"Documentation request with ID '{id}' was not found." });

        return Ok(updated);
    }

    /// <summary>
    /// Ask client to upload or re-upload a missing or incorrect document.
    /// </summary>
    [HttpPost("{id:int}/request-document")]
    public async Task<IActionResult> RequestDocument(
        int id,
        [FromBody] RequestDocumentReuploadRequest request)
    {
        if (!IsStaffOrInternal) return Forbid();
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var updated = await _requestService.RequestDocumentReuploadAsync(id, request.DocumentName, request.Note, request.FileId);
        if (updated == null)
            return NotFound(new { message = $"Documentation request with ID '{id}' was not found." });

        return Ok(updated);
    }

    /// <summary>
    /// Delete a documentation request and all associated document files.
    /// </summary>
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        if (!IsStaffOrInternal) return Forbid();
        var success = await _requestService.DeleteRequestAsync(id);
        if (!success)
            return NotFound(new { message = $"Documentation request with ID '{id}' was not found." });

        return Ok(new { message = $"Documentation request with ID '{id}' was deleted successfully." });
    }
}
