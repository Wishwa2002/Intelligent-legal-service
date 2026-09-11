using System;
using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using LegalService.API.DTOs.Responses;

namespace LegalService.API.Interfaces;

public interface IDocumentFileService
{
    Task<DocumentFileResponse> UploadFileAsync(int requestId, IFormFile file);
    Task<IEnumerable<DocumentFileResponse>> GetFilesByRequestIdAsync(int requestId);
    Task<DocumentFileResponse?> GetFileByIdAsync(int fileId);
    Task<(Stream fileStream, string contentType, string fileName)?> DownloadFileAsync(int fileId);
    Task<bool> DeleteFileAsync(int fileId);
    Task<DocumentFileResponse?> UpdateFileStatusAsync(int fileId, string status);
}
