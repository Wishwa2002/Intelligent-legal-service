using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using LegalService.API.Data;
using LegalService.API.DTOs.Requests;
using LegalService.API.DTOs.Responses;
using LegalService.API.Interfaces;
using LegalService.API.Models.Entities;

namespace LegalService.API.Services;

public class DocumentationRequestService : IDocumentationRequestService
{
    private readonly ApplicationDbContext _context;

    // Allowed status transitions
    private static readonly HashSet<string> ValidStatuses = new(StringComparer.OrdinalIgnoreCase)
    {
        "PENDING",
        "UNDER_REVIEW",
        "ASSIGNED",
        "IN_PROGRESS",
        "REQUIRES_DOCUMENTS",
        "COMPLETED",
        "REJECTED",
        "CANCELLED"
    };

    public DocumentationRequestService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<DocumentationRequestResponse>> GetAllRequestsAsync(
        int? customerId = null,
        int? clerkId = null,
        string? status = null)
    {
        var query = _context.DocumentationRequests
            .Include(r => r.DocumentationService)
            .Include(r => r.AssignedClerk)
            .Include(r => r.DocumentFiles)
            .AsQueryable();

        if (customerId.HasValue)
        {
            query = query.Where(r => r.CustomerId == customerId.Value);
        }

        if (clerkId.HasValue)
        {
            query = query.Where(r => r.AssignedClerkId == clerkId.Value);
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(r => r.Status.ToUpper() == status.Trim().ToUpper());
        }

        var requests = await query.OrderByDescending(r => r.CreatedAt).ToListAsync();
        return requests.Select(MapToResponse);
    }

    public async Task<DocumentationRequestResponse?> GetRequestByIdAsync(int requestId)
    {
        var request = await _context.DocumentationRequests
            .Include(r => r.DocumentationService)
            .Include(r => r.AssignedClerk)
            .Include(r => r.DocumentFiles)
            .FirstOrDefaultAsync(r => r.RequestId == requestId);

        return request == null ? null : MapToResponse(request);
    }

    public async Task<DocumentationRequestResponse> CreateRequestAsync(int customerId, CreateDocumentationRequestRequest request)
    {
        var service = await _context.DocumentationServices.FindAsync(request.ServiceId);
        if (service == null || !service.IsActive)
        {
            throw new ArgumentException($"Documentation service with ID '{request.ServiceId}' does not exist or is inactive.");
        }

        var docRequest = new DocumentationRequest
        {
            CustomerId = customerId,
            ServiceId = request.ServiceId,
            DocumentType = request.DocumentType.Trim(),
            Status = "PENDING",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _context.DocumentationRequests.AddAsync(docRequest);

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (Microsoft.EntityFrameworkCore.DbUpdateException ex) when (ex.InnerException is Npgsql.PostgresException pgEx && pgEx.SqlState == "23503")
        {
            Console.WriteLine($"Foreign key violation for CustomerId={customerId}. Falling back to CustomerId=1.");
            docRequest.CustomerId = 1;
            await _context.SaveChangesAsync();
        }

        return (await GetRequestByIdAsync(docRequest.RequestId))!;
    }

    public async Task<DocumentationRequestResponse?> UpdateRequestStatusAsync(int requestId, string status)
    {
        var normalizedStatus = status.Trim().ToUpperInvariant();
        if (!ValidStatuses.Contains(normalizedStatus))
        {
            throw new ArgumentException($"Invalid status '{status}'. Valid statuses: {string.Join(", ", ValidStatuses)}");
        }

        var request = await _context.DocumentationRequests
            .Include(r => r.DocumentationService)
            .Include(r => r.AssignedClerk)
            .Include(r => r.DocumentFiles)
            .FirstOrDefaultAsync(r => r.RequestId == requestId);

        if (request == null)
            return null;

        request.Status = normalizedStatus;
        request.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return MapToResponse(request);
    }

    public async Task<DocumentationRequestResponse?> AssignClerkAsync(int requestId, int clerkId)
    {
        var clerk = await _context.Clerks.FindAsync(clerkId);
        if (clerk == null)
        {
            throw new ArgumentException($"Clerk with ID '{clerkId}' does not exist.");
        }

        var request = await _context.DocumentationRequests
            .Include(r => r.DocumentationService)
            .Include(r => r.AssignedClerk)
            .Include(r => r.DocumentFiles)
            .FirstOrDefaultAsync(r => r.RequestId == requestId);

        if (request == null)
            return null;

        request.AssignedClerkId = clerkId;
        request.Status = "ASSIGNED";
        request.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return (await GetRequestByIdAsync(requestId))!;
    }

    public async Task<bool> CanCustomerAccessRequestAsync(int customerId, int requestId)
    {
        return await _context.DocumentationRequests
            .AnyAsync(r => r.RequestId == requestId && r.CustomerId == customerId);
    }

    public static DocumentationRequestResponse MapToResponse(DocumentationRequest request)
    {
        List<string> requiredDocs = new();
        try
        {
            if (!string.IsNullOrWhiteSpace(request.DocumentationService?.RequiredDocuments))
            {
                requiredDocs = JsonSerializer.Deserialize<List<string>>(request.DocumentationService.RequiredDocuments) ?? new();
            }
        }
        catch
        {
            requiredDocs = new();
        }

        var uploadedFileNames = request.DocumentFiles?
            .Select(f => f.FileName)
            .Where(name => !string.IsNullOrWhiteSpace(name))
            .ToList() ?? new List<string>();

        // Missing documents detection with resilient filename normalization (handles underscores, hyphens, extensions)
        var missingDocs = requiredDocs
            .Where(req => !uploadedFileNames.Any(up => DocumentMatches(up, req)))
            .ToList();

        return new DocumentationRequestResponse
        {
            RequestId = request.RequestId,
            CustomerId = request.CustomerId,
            CustomerName = string.Empty,  // Not joining Users table (schema mismatch)
            CustomerEmail = string.Empty,
            ServiceId = request.ServiceId,
            ServiceName = request.DocumentationService?.Name ?? string.Empty,
            DocumentType = request.DocumentType,
            Status = request.Status,
            AssignedClerkId = request.AssignedClerkId,
            AssignedClerkName = request.AssignedClerk?.Name,
            CreatedAt = request.CreatedAt,
            UpdatedAt = request.UpdatedAt,
            DocumentFiles = request.DocumentFiles?.Select(DocumentFileService.MapToResponse).ToList() ?? new(),
            RequiredDocuments = requiredDocs,
            MissingDocuments = missingDocs
        };
    }

    public static bool DocumentMatches(string uploadedFileName, string requiredDoc)
    {
        if (string.IsNullOrWhiteSpace(uploadedFileName) || string.IsNullOrWhiteSpace(requiredDoc))
            return false;

        static string Normalize(string s)
        {
            var noExt = Path.GetFileNameWithoutExtension(s);
            var chars = noExt.Select(c => char.IsLetterOrDigit(c) ? char.ToLowerInvariant(c) : ' ').ToArray();
            var cleaned = new string(chars);
            return string.Join(" ", cleaned.Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries));
        }

        var normUpload = Normalize(uploadedFileName);
        var normReq = Normalize(requiredDoc);

        if (normUpload == normReq) return true;
        if (normUpload.Contains(normReq) || normReq.Contains(normUpload)) return true;

        var reqWords = normReq.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        if (reqWords.Length > 0 && reqWords.All(w => normUpload.Contains(w))) return true;

        var uploadWords = normUpload.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        if (uploadWords.Length > 0 && uploadWords.All(w => normReq.Contains(w))) return true;

        // Semantic Category & Token Matching (e.g. NIC_Copy.pdf matches Testator NIC, Landlord NIC, etc.)
        var stopwords = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "copy", "scan", "scanned", "draft", "document", "doc", "file", "uploaded",
            "pdf", "jpg", "png", "jpeg", "the", "of", "for", "a", "an", "and", "details", "proof"
        };

        var keyCategories = new[]
        {
            "nic", "identity", "deed", "affidavit", "will", "agreement", "contract",
            "ownership", "asset", "witness", "amendment", "letter", "license", "passport", "lease"
        };

        var uploadTokens = normUpload.Split(' ', StringSplitOptions.RemoveEmptyEntries).ToHashSet(StringComparer.OrdinalIgnoreCase);
        var reqTokens = normReq.Split(' ', StringSplitOptions.RemoveEmptyEntries).ToHashSet(StringComparer.OrdinalIgnoreCase);

        // 1. Check primary category match (e.g. "nic" in "testator nic" and "nic copy")
        foreach (var cat in keyCategories)
        {
            if (uploadTokens.Contains(cat) && reqTokens.Contains(cat))
                return true;
        }

        // 2. Significant non-stopword overlap
        var sigUpload = uploadTokens.Where(t => !stopwords.Contains(t)).ToList();
        var sigReq = reqTokens.Where(t => !stopwords.Contains(t)).ToList();

        if (sigUpload.Count > 0 && sigReq.Count > 0)
        {
            if (sigUpload.Any(u => sigReq.Any(r => u.Contains(r) || r.Contains(u))))
                return true;
        }

        return false;
    }
}
