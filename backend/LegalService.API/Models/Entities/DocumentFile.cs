using System;

namespace LegalService.API.Models.Entities;

public class DocumentFile
{
    public Guid FileId { get; set; }
    public Guid RequestId { get; set; }
    public string FilePath { get; set; } = string.Empty;
    public DateTime UploadDate { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public DocumentationRequest DocumentationRequest { get; set; } = null!;
}
