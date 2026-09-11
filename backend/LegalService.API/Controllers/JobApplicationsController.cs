using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using LegalService.API.DTOs.Requests;
using LegalService.API.Interfaces;

namespace LegalService.API.Controllers;

[ApiController]
[Route("api/job-applications")]
public class JobApplicationsController : ControllerBase
{
    private readonly ICareerService _careerService;

    public JobApplicationsController(ICareerService careerService)
    {
        _careerService = careerService;
    }

    /// <summary>
    /// Get all submitted job applications (optionally filtered by career ID).
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] Guid? careerId = null)
    {
        var applications = await _careerService.GetAllApplicationsAsync(careerId);
        return Ok(applications);
    }

    /// <summary>
    /// Get a job application by ID.
    /// </summary>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var app = await _careerService.GetApplicationByIdAsync(id);
        if (app == null)
            return NotFound(new { message = $"Job application with ID '{id}' was not found." });

        return Ok(app);
    }

    /// <summary>
    /// Submit a new job application.
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateJobApplicationRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var created = await _careerService.CreateApplicationAsync(request);
        return CreatedAtAction(nameof(GetById), new { id = created.ApplicationId }, created);
    }

    /// <summary>
    /// Update the status of a job application (e.g. UnderReview, Shortlisted, Rejected, Hired).
    /// </summary>
    [HttpPut("{id:guid}/status")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateJobApplicationStatusRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var updated = await _careerService.UpdateApplicationStatusAsync(id, request.Status);
        if (updated == null)
            return NotFound(new { message = $"Job application with ID '{id}' was not found." });

        return Ok(updated);
    }
}
