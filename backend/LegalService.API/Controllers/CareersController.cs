using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using LegalService.API.DTOs.Requests;
using LegalService.API.Interfaces;

namespace LegalService.API.Controllers;

[ApiController]
[Route("api/careers")]
public class CareersController : ControllerBase
{
    private readonly ICareerService _careerService;

    public CareersController(ICareerService careerService)
    {
        _careerService = careerService;
    }

    /// <summary>
    /// Get all open career postings.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var careers = await _careerService.GetAllCareersAsync();
        return Ok(careers);
    }

    /// <summary>
    /// Get career posting by ID.
    /// </summary>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var career = await _careerService.GetCareerByIdAsync(id);
        if (career == null)
            return NotFound(new { message = $"Career with ID '{id}' was not found." });

        return Ok(career);
    }

    /// <summary>
    /// Create a new career opening.
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateCareerRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var created = await _careerService.CreateCareerAsync(request);
        return CreatedAtAction(nameof(GetById), new { id = created.CareerId }, created);
    }

    /// <summary>
    /// Update an existing career opening.
    /// </summary>
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateCareerRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var updated = await _careerService.UpdateCareerAsync(id, request);
        if (updated == null)
            return NotFound(new { message = $"Career with ID '{id}' was not found." });

        return Ok(updated);
    }

    /// <summary>
    /// Delete a career opening.
    /// </summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var success = await _careerService.DeleteCareerAsync(id);
        if (!success)
            return NotFound(new { message = $"Career with ID '{id}' was not found." });

        return Ok(new { message = "Career opening deleted successfully." });
    }
}
