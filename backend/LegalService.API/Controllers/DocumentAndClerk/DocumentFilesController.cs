using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using LegalService.API.Interfaces;

namespace LegalService.API.Controllers;

[ApiController]
[Route("api")]
public class DocumentFilesController : ControllerBase
{
    private readonly IDocumentFileService _fileService;

    public DocumentFilesController(IDocumentFileService fileService)
    {
        _fileService = fileService;
    }

    /// <summary>
    /// Upload a document (PDF, JPG, PNG) for a documentation request.
    /// </summary>
    [HttpPost("documentation-requests/{requestId:int}/files")]
    public async Task<IActionResult> Upload(int requestId, [FromForm] IFormFile file)
    {
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
        var files = await _fileService.GetFilesByRequestIdAsync(requestId);
        return Ok(files);
    }

    /// <summary>
    /// Get metadata for a specific uploaded file.
    /// </summary>
    [HttpGet("document-files/{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
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
        if (string.IsNullOrWhiteSpace(status))
            return BadRequest(new { message = "status query parameter is required." });

        var updated = await _fileService.UpdateFileStatusAsync(id, status);
        if (updated == null)
            return NotFound(new { message = $"Document file with ID '{id}' was not found." });

        return Ok(updated);
    }
}
