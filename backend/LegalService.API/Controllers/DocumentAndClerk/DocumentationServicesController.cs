using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using LegalService.API.DTOs.Requests;
using LegalService.API.Interfaces;

namespace LegalService.API.Controllers;

[ApiController]
[Route("api/documentation-services")]
public class DocumentationServicesController : ControllerBase
{
    private readonly IDocumentationServiceService _serviceManager;

    public DocumentationServicesController(IDocumentationServiceService serviceManager)
    {
        _serviceManager = serviceManager;
    }

    /// <summary>
    /// Get all available documentation services.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] bool includeInactive = false)
    {
        var services = await _serviceManager.GetAllServicesAsync(includeInactive);
        return Ok(services);
    }

    /// <summary>
    /// Get documentation service by ID.
    /// </summary>
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var service = await _serviceManager.GetServiceByIdAsync(id);
        if (service == null)
            return NotFound(new { message = $"Documentation service with ID '{id}' was not found." });

        return Ok(service);
    }

    /// <summary>
    /// Create a new documentation service.
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateDocumentationServiceRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var created = await _serviceManager.CreateServiceAsync(request);
        return CreatedAtAction(nameof(GetById), new { id = created.ServiceId }, created);
    }

    /// <summary>
    /// Update an existing documentation service.
    /// </summary>
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateDocumentationServiceRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var updated = await _serviceManager.UpdateServiceAsync(id, request);
        if (updated == null)
            return NotFound(new { message = $"Documentation service with ID '{id}' was not found." });

        return Ok(updated);
    }

    /// <summary>
    /// Deactivate/soft-delete a documentation service.
    /// </summary>
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Deactivate(int id)
    {
        var success = await _serviceManager.DeactivateServiceAsync(id);
        if (!success)
            return NotFound(new { message = $"Documentation service with ID '{id}' was not found." });

        return Ok(new { message = "Documentation service deactivated successfully." });
    }
}
