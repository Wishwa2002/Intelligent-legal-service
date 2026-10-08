using LegalService.API.Data;
using LegalService.API.Models.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LegalService.API.Controllers;

[ApiController]
[Route("api/legal-documents")]
public class LegalDocumentsController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public LegalDocumentsController(
        ApplicationDbContext context)
    {
        _context = context;
    }

    // GET: /api/legal-documents
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var documents = await _context.LegalDocuments
            .Where(x => x.IsPublished)
            .OrderByDescending(x => x.PublishedDate)
            .Select(x => new
            {
                x.Id,
                x.Title,
                x.DocumentType,
                x.ActNumber,
                x.PublishedDate,
                x.OfficialUrl,
                x.Summary,
                x.SourceName,
                x.CreatedAt
            })
            .ToListAsync();

        return Ok(documents);
    }

    // GET: /api/legal-documents/{id}
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var document = await _context.LegalDocuments
            .FirstOrDefaultAsync(x => x.Id == id);

        if (document == null)
        {
            return NotFound(new
            {
                message = "Legal document not found."
            });
        }

        return Ok(document);
    }

    // POST: /api/legal-documents
    [HttpPost]
    public async Task<IActionResult> Create(
        [FromBody] LegalDocument request)
    {
        if (string.IsNullOrWhiteSpace(request.Title))
        {
            return BadRequest(new
            {
                message = "Title is required."
            });
        }

        if (string.IsNullOrWhiteSpace(request.DocumentType))
        {
            return BadRequest(new
            {
                message = "Document type is required."
            });
        }

        if (!string.IsNullOrWhiteSpace(request.ExternalId))
        {
            var exists = await _context.LegalDocuments
                .AnyAsync(x =>
                    x.ExternalId == request.ExternalId);

            if (exists)
            {
                return Conflict(new
                {
                    message =
                        "This legal document has already been imported."
                });
            }
        }

        request.Id = Guid.NewGuid();
        request.CreatedAt = DateTime.UtcNow;

        _context.LegalDocuments.Add(request);

        await _context.SaveChangesAsync();

        return CreatedAtAction(
            nameof(GetById),
            new { id = request.Id },
            request
        );
    }
}