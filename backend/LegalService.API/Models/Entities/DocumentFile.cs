using System;

namespace LegalService.API.Models.Entities;

public class DocumentFile
{
    public int FileId { get; set; }
    public int RequestId { get; set; }

    // Safe display name (not the raw uploaded filename)
    public string FileName { get; set; } = string.Empty;

    // Internal server storage path — never exposed to clients
    public string FilePath { get; set; } = string.Empty;

    // MIME type validated at upload time (e.g. application/pdf, image/jpeg)
    public string ContentType { get; set; } = string.Empty;

    // File size in bytes
    public long FileSize { get; set; }

    // Per-document processing status: Received | UnderReview | Accepted | Rejected
    public string DocumentStatus { get; set; } = "Received";

    public DateTime UploadDate { get; set; } = DateTime.UtcNow;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public DocumentationRequest DocumentationRequest { get; set; } = null!;
}
