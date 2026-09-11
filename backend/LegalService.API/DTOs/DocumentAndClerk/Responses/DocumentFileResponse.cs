using System;

namespace LegalService.API.DTOs.Responses;

public class DocumentFileResponse
{
    public int FileId { get; set; }
    public int RequestId { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long FileSize { get; set; }
    public string DocumentStatus { get; set; } = string.Empty;
    public DateTime UploadDate { get; set; }
}
