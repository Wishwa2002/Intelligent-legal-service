using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using LegalService.API.Data;
using LegalService.API.DTOs.Responses;
using LegalService.API.Interfaces;
using LegalService.API.Models.Entities;

namespace LegalService.API.Services;

public class DocumentFileService : IDocumentFileService
{
    private readonly ApplicationDbContext _context;
    private readonly IWebHostEnvironment _environment;

    private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".pdf",
        ".jpg",
        ".jpeg",
        ".png"
    };

    private static readonly HashSet<string> AllowedMimeTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "application/pdf",
        "image/jpeg",
        "image/jpg",
        "image/png"
    };

    private const long MaxFileSizeBytes = 10 * 1024 * 1024; // 10 MB

    public DocumentFileService(ApplicationDbContext context, IWebHostEnvironment environment)
    {
        _context = context;
        _environment = environment;
    }

    public async Task<DocumentFileResponse> UploadFileAsync(int requestId, IFormFile file)
    {
        if (file == null || file.Length == 0)
        {
            throw new ArgumentException("No file was provided for upload.");
        }

        if (file.Length > MaxFileSizeBytes)
        {
            throw new ArgumentException($"File size ({file.Length / (1024 * 1024)}MB) exceeds the maximum allowed limit of 10MB.");
        }

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!AllowedExtensions.Contains(extension))
        {
            throw new ArgumentException($"File extension '{extension}' is not supported. Allowed extensions: {string.Join(", ", AllowedExtensions)}");
        }

        var contentType = file.ContentType;
        if (string.IsNullOrWhiteSpace(contentType) || contentType.Equals("application/octet-stream", StringComparison.OrdinalIgnoreCase))
        {
            contentType = extension switch
            {
                ".pdf" => "application/pdf",
                ".png" => "image/png",
                ".jpg" or ".jpeg" => "image/jpeg",
                _ => "application/octet-stream"
            };
        }

        if (!AllowedMimeTypes.Contains(contentType))
        {
            throw new ArgumentException($"MIME type '{file.ContentType}' is not allowed.");
        }

        var request = await _context.DocumentationRequests.FindAsync(requestId);
        if (request == null)
        {
            throw new ArgumentException($"Documentation request with ID '{requestId}' was not found.");
        }

        // Secure storage path
        var uploadsFolder = Path.Combine(_environment.ContentRootPath, "Storage", "Uploads", "Documentation", requestId.ToString());
        Directory.CreateDirectory(uploadsFolder);

        var tempFileId = Guid.NewGuid();
        var safeFileName = Path.GetFileName(file.FileName); // Strip any path traversal components
        var storedFileName = $"{tempFileId}{extension}";
        var physicalPath = Path.Combine(uploadsFolder, storedFileName);

        await using (var stream = new FileStream(physicalPath, FileMode.Create, FileAccess.Write, FileShare.None))
        {
            await file.CopyToAsync(stream);
        }

        var documentFile = new DocumentFile
        {
            RequestId = requestId,
            FileName = safeFileName,
            FilePath = physicalPath,
            ContentType = contentType,
            FileSize = file.Length,
            DocumentStatus = "Received",
            UploadDate = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _context.DocumentFiles.AddAsync(documentFile);

        // Update request status to UNDER_REVIEW if it was PENDING or REQUIRES_DOCUMENTS
        if (request.Status == "PENDING" || request.Status == "REQUIRES_DOCUMENTS")
        {
            request.Status = "UNDER_REVIEW";
            request.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();

        return MapToResponse(documentFile);
    }

    public async Task<IEnumerable<DocumentFileResponse>> GetFilesByRequestIdAsync(int requestId)
    {
        var files = await _context.DocumentFiles
            .Where(f => f.RequestId == requestId)
            .OrderByDescending(f => f.UploadDate)
            .ToListAsync();

        return files.Select(MapToResponse);
    }

    public async Task<DocumentFileResponse?> GetFileByIdAsync(int fileId)
    {
        var file = await _context.DocumentFiles.FindAsync(fileId);
        return file == null ? null : MapToResponse(file);
    }

    public async Task<(Stream fileStream, string contentType, string fileName)?> DownloadFileAsync(int fileId)
    {
        var file = await _context.DocumentFiles.FindAsync(fileId);
        if (file == null || !File.Exists(file.FilePath))
        {
            return null;
        }

        var stream = new FileStream(file.FilePath, FileMode.Open, FileAccess.Read, FileShare.Read);
        return (stream, file.ContentType, file.FileName);
    }

    public async Task<bool> DeleteFileAsync(int fileId)
    {
        var file = await _context.DocumentFiles.FindAsync(fileId);
        if (file == null)
            return false;

        try
        {
            if (File.Exists(file.FilePath))
            {
                File.Delete(file.FilePath);
            }
        }
        catch
        {
            // Log warning, continue DB removal
        }

        _context.DocumentFiles.Remove(file);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<DocumentFileResponse?> UpdateFileStatusAsync(int fileId, string status)
    {
        var file = await _context.DocumentFiles.FindAsync(fileId);
        if (file == null)
            return null;

        file.DocumentStatus = status;
        await _context.SaveChangesAsync();
        return MapToResponse(file);
    }

    public static DocumentFileResponse MapToResponse(DocumentFile file)
    {
        return new DocumentFileResponse
        {
            FileId = file.FileId,
            RequestId = file.RequestId,
            FileName = file.FileName,
            ContentType = file.ContentType,
            FileSize = file.FileSize,
            DocumentStatus = file.DocumentStatus,
            UploadDate = file.UploadDate
        };
    }
}
