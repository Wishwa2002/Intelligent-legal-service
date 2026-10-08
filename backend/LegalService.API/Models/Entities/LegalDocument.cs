using System.ComponentModel.DataAnnotations;

namespace LegalService.API.Models.Entities;

public class LegalDocument
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [MaxLength(500)]
    public string Title { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string DocumentType { get; set; } = string.Empty;
    // Act, Constitutional Amendment, Gazette, Regulation

    [MaxLength(100)]
    public string? ActNumber { get; set; }

    public DateTime? PublishedDate { get; set; }

    [MaxLength(1000)]
    public string? OfficialUrl { get; set; }

    public string FullText { get; set; } = string.Empty;

    public string? Summary { get; set; }

    [MaxLength(100)]
    public string SourceName { get; set; } = "Government of Sri Lanka";

    [MaxLength(300)]
    public string? ExternalId { get; set; }

    public bool IsPublished { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }
}