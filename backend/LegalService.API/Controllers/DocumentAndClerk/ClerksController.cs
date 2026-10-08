using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using LegalService.API.DTOs.Requests;
using LegalService.API.Interfaces;

namespace LegalService.API.Controllers;

[ApiController]
[Route("api/clerks")]
public class ClerksController : ControllerBase
{
    private readonly IClerkService _clerkService;

    public ClerksController(IClerkService clerkService)
    {
        _clerkService = clerkService;
    }

    /// <summary>
    /// Get all registered clerks.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var clerks = await _clerkService.GetAllClerksAsync();
        return Ok(clerks);
    }

    /// <summary>
    /// Get clerk details by clerk ID.
    /// </summary>
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var clerk = await _clerkService.GetClerkByIdAsync(id);
        if (clerk == null)
            return NotFound(new { message = $"Clerk with ID '{id}' was not found." });

        return Ok(clerk);
    }

    /// <summary>
    /// Register an existing user as a clerk.
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateClerkRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var created = await _clerkService.CreateClerkAsync(request);
        return CreatedAtAction(nameof(GetById), new { id = created.ClerkId }, created);
    }

    /// <summary>
    /// Update clerk details (contact, department).
    /// </summary>
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateClerkRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var updated = await _clerkService.UpdateClerkAsync(id, request);
        if (updated == null)
            return NotFound(new { message = $"Clerk with ID '{id}' was not found." });

        return Ok(updated);
    }

    /// <summary>
    /// Deactivate a clerk.
    /// </summary>
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Deactivate(int id)
    {
        var success = await _clerkService.DeactivateClerkAsync(id);
        if (!success)
            return NotFound(new { message = $"Clerk with ID '{id}' was not found." });

        return Ok(new { message = "Clerk deactivated successfully." });
    }

    /// <summary>
    /// Get all documentation requests assigned to a clerk.
    /// </summary>
    [HttpGet("{id:int}/requests")]
    public async Task<IActionResult> GetAssignedRequests(int id)
    {
        var requests = await _clerkService.GetAssignedRequestsAsync(id);
        return Ok(requests);
    }
}
