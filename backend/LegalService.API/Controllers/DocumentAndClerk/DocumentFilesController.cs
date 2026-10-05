using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using LegalService.API.Interfaces;
using LegalService.API.Authentication;
using LegalService.API.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;

namespace LegalService.API.Controllers;

[ApiController]
[Route("api")]
[Authorize(Policy = "UserOrAi")]
public class DocumentFilesController : ControllerBase
{
    private readonly IDocumentFileService _fileService;
    private readonly ApplicationDbContext _db;
    private readonly IConfiguration _config;
    private Task<bool> CanAccess(int requestId) => RequestAccess.CanAccessDocumentationRequestAsync(HttpContext, _config, _db, requestId);
    private async Task<bool> CanAccessFile(int id)
    {
        var requestId = await _db.DocumentFiles.AsNoTracking().Where(f => f.FileId == id).Select(f => f.RequestId).FirstOrDefaultAsync();
        return requestId > 0 && await CanAccess(requestId);
    }

    public DocumentFilesController(IDocumentFileService fileService, ApplicationDbContext db, IConfiguration config)
    {
        _fileService = fileService;
        _db = db;
        _config = config;
    }

    /// <summary>
    /// Upload a document (PDF, JPG, PNG) for a documentation request.
    /// </summary>
    [HttpPost("documentation-requests/{requestId:int}/files")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> Upload(int requestId, IFormFile file)
    {
        if (!(await CanAccess(requestId))) return Forbid();

        if (file == null || file.Length == 0)
        {
            return BadRequest(new { message = "No file uploaded. Please select a valid document." });
        }

        var uploaded = await _fileService.UploadFileAsync(requestId, file);
        return CreatedAtAction(nameof(GetById), new { id = uploaded.FileId }, uploaded);
    }

    /// <summary>
    /// Get all uploaded files for a documentation request.
    /// </summary>
    [HttpGet("documentation-requests/{requestId:int}/files")]
    public async Task<IActionResult> GetByRequestId(int requestId)
    {
        if (!(await CanAccess(requestId))) return Forbid();

        var files = await _fileService.GetFilesByRequestIdAsync(requestId);
        return Ok(files);
    }

    /// <summary>
    /// Get metadata for a specific uploaded file.
    /// </summary>
    [HttpGet("document-files/{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        if (!(await CanAccessFile(id))) return Forbid();

        var file = await _fileService.GetFileByIdAsync(id);
        if (file == null)
            return NotFound(new { message = $"Document file with ID '{id}' was not found." });

        return Ok(file);
    }

    /// <summary>
    /// Securely download an uploaded document file.
    /// </summary>
    [HttpGet("document-files/{id:int}/download")]
    public async Task<IActionResult> Download(int id)
    {
        if (!(await CanAccessFile(id))) return Forbid();

        var downloadResult = await _fileService.DownloadFileAsync(id);
        if (downloadResult == null)
            return NotFound(new { message = $"Document file with ID '{id}' was not found." });

        var result = downloadResult.Value;
        return File(result.fileStream, result.contentType, result.fileName);
    }

    /// <summary>
    /// Delete an uploaded document file.
    /// </summary>
    [HttpDelete("document-files/{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        if (!(await CanAccessFile(id))) return Forbid();

        var success = await _fileService.DeleteFileAsync(id);
        if (!success)
            return NotFound(new { message = $"Document file with ID '{id}' was not found." });

        return Ok(new { message = "Document file deleted successfully." });
    }

    /// <summary>
    /// Update document verification status (e.g. Received, UnderReview, Accepted, Rejected).
    /// </summary>
    [HttpPut("document-files/{id:int}/status")]
    public async Task<IActionResult> UpdateStatus(int id, [FromQuery] string status)
    {
        if (!(RequestAccess.IsInternal(HttpContext, _config) || RequestAccess.IsStaff(User))) return Forbid();

        if (string.IsNullOrWhiteSpace(status))
            return BadRequest(new { message = "status query parameter is required." });

        var updated = await _fileService.UpdateFileStatusAsync(id, status);
        if (updated == null)
            return NotFound(new { message = $"Document file with ID '{id}' was not found." });

        return Ok(updated);
    }

    /// <summary>
    /// Upload a verified sample document (e.g. NIC_Copy.pdf, Tenancy_Agreement.pdf) to a request.
    /// </summary>
    [HttpPost("documentation-requests/{requestId:int}/sample-file")]
    public async Task<IActionResult> UploadSample(int requestId, [FromQuery] string sampleName)
    {
        if (!(await CanAccess(requestId))) return Forbid();

        if (string.IsNullOrWhiteSpace(sampleName))
        {
            return BadRequest(new { message = "sampleName query parameter is required (e.g. NIC_Copy.pdf)." });
        }

        var uploaded = await _fileService.UploadSampleFileAsync(requestId, sampleName);
        return CreatedAtAction(nameof(GetById), new { id = uploaded.FileId }, uploaded);
    }

    /// <summary>
    /// Get list of available verified sample document templates.
    /// </summary>
    [HttpGet("document-files/sample-templates")]
    [AllowAnonymous]
    public async Task<IActionResult> GetSampleTemplates()
    {
        var samples = await _fileService.GetAvailableSampleFilesAsync();
        return Ok(samples);
    }
}
