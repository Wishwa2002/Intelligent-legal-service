using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using LegalService.API.Data;
using LegalService.API.DTOs.Requests;
using LegalService.API.DTOs.Responses;
using LegalService.API.Interfaces;
using LegalService.API.Models.Entities;
using LegalService.API.Services;
using LegalService.API.Authentication.Services;

namespace LegalService.API.Services;

public class ClerkService : IClerkService
{
    private readonly ApplicationDbContext _context;
    private readonly IDocumentationRequestService _documentationRequestService;
    private readonly IPasswordService _passwordService;

    public ClerkService(
        ApplicationDbContext context, 
        IDocumentationRequestService documentationRequestService,
        IPasswordService passwordService)
    {
        _context = context;
        _documentationRequestService = documentationRequestService;
        _passwordService = passwordService;
    }

    public async Task<IEnumerable<ClerkResponse>> GetAllClerksAsync()
    {
        var clerks = await _context.Clerks
            .Include(c => c.DocumentationRequests)
            .OrderBy(c => c.Name)
            .ToListAsync();

        return clerks.Select(MapToResponse);
    }

    public async Task<ClerkResponse?> GetClerkByIdAsync(int clerkId)
    {
        var clerk = await _context.Clerks
            .Include(c => c.DocumentationRequests)
            .FirstOrDefaultAsync(c => c.ClerkId == clerkId);

        return clerk == null ? null : MapToResponse(clerk);
    }

    public async Task<ClerkResponse> CreateClerkAsync(CreateClerkRequest request)
    {
        var email = request.Email.Trim().ToLowerInvariant();

        // Check for duplicate clerk email/username
        var existingClerk = await _context.Clerks
            .AnyAsync(c => c.Email != null && c.Email.ToLower() == email);
        if (existingClerk)
        {
            throw new ArgumentException($"A clerk with the username/email '{request.Email}' already exists.");
        }

        // Hash the admin-provided password
        var passwordHash = _passwordService.HashPassword(request.Password);

        var clerk = new Clerk
        {
            Name = request.GetEffectiveName(),
            Email = email,
            PasswordHash = passwordHash,
            Contact = request.Contact.Trim(),
            Department = request.Department.Trim(),
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _context.Clerks.AddAsync(clerk);
        await _context.SaveChangesAsync();

        return MapToResponse(clerk);
    }

    public async Task<ClerkResponse?> UpdateClerkAsync(int clerkId, UpdateClerkRequest request)
    {
        var clerk = await _context.Clerks
            .Include(c => c.DocumentationRequests)
            .FirstOrDefaultAsync(c => c.ClerkId == clerkId);

        if (clerk == null)
            return null;

        if (!string.IsNullOrWhiteSpace(request.Name))
            clerk.Name = request.Name.Trim();

        if (!string.IsNullOrWhiteSpace(request.Email))
        {
            var newEmail = request.Email.Trim().ToLowerInvariant();
            var duplicate = await _context.Clerks
                .AnyAsync(c => c.ClerkId != clerkId && c.Email != null && c.Email.ToLower() == newEmail);
            if (duplicate)
                throw new ArgumentException($"Another clerk already has the email '{request.Email}'.");
            clerk.Email = newEmail;
        }

        if (!string.IsNullOrWhiteSpace(request.Password))
        {
            clerk.PasswordHash = _passwordService.HashPassword(request.Password);
        }

        if (request.IsActive.HasValue)
        {
            clerk.IsActive = request.IsActive.Value;
        }

        clerk.Contact = request.Contact.Trim();
        clerk.Department = request.Department.Trim();
        clerk.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return MapToResponse(clerk);
    }

    public async Task<bool> DeactivateClerkAsync(int clerkId)
    {
        var clerk = await _context.Clerks
            .FirstOrDefaultAsync(c => c.ClerkId == clerkId);

        if (clerk == null)
            return false;
        
        clerk.IsActive = !clerk.IsActive;
        clerk.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<IEnumerable<DocumentationRequestResponse>> GetAssignedRequestsAsync(int clerkId)
    {
        var requests = await _context.DocumentationRequests
            .Include(r => r.DocumentationService)
            .Include(r => r.AssignedClerk)
            .Include(r => r.DocumentFiles)
            .Where(r => r.AssignedClerkId == clerkId)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();

        return requests.Select(MapDocRequestToResponse);
    }

    private static ClerkResponse MapToResponse(Clerk clerk)
    {
        return new ClerkResponse
        {
            ClerkId = clerk.ClerkId,
            FullName = clerk.Name,
            Email = clerk.Email ?? "",
            Contact = clerk.Contact,
            Department = clerk.Department,
            IsActive = clerk.IsActive,
            ActiveAssignmentsCount = clerk.DocumentationRequests?.Count(r => r.Status != "COMPLETED" && r.Status != "REJECTED" && r.Status != "CANCELLED") ?? 0,
            CreatedAt = clerk.CreatedAt,
            UpdatedAt = clerk.UpdatedAt
        };
    }

    private static DocumentationRequestResponse MapDocRequestToResponse(DocumentationRequest request)
    {
        return new DocumentationRequestResponse
        {
            RequestId = request.RequestId,
            CustomerId = request.CustomerId,
            ServiceId = request.ServiceId,
            ServiceName = request.DocumentationService?.Name ?? string.Empty,
            DocumentType = request.DocumentType,
            Status = request.Status,
            AssignedClerkId = request.AssignedClerkId,
            AssignedClerkName = request.AssignedClerk?.Name,
            CreatedAt = request.CreatedAt,
            UpdatedAt = request.UpdatedAt,
            DocumentFiles = request.DocumentFiles.Select(f => new DocumentFileResponse
            {
                FileId = f.FileId,
                RequestId = f.RequestId,
                FileName = f.FileName,
                ContentType = f.ContentType,
                FileSize = f.FileSize,
                DocumentStatus = f.DocumentStatus,
                UploadDate = f.UploadDate
            }).ToList()
        };
    }
}
