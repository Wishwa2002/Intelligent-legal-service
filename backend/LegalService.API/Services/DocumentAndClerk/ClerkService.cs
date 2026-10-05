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
    private readonly IEmailNotificationService? _emailService;

    public ClerkService(
        ApplicationDbContext context, 
        IDocumentationRequestService documentationRequestService,
        IPasswordService passwordService,
        IEmailNotificationService? emailService = null)
    {
        _context = context;
        _documentationRequestService = documentationRequestService;
        _passwordService = passwordService;
        _emailService = emailService;
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

    // Check duplicate email in Users
    var existingUser = await _context.Users
        .AnyAsync(u => u.Email.ToLower() == email);

    if (existingUser)
    {
        throw new ArgumentException(
            $"A user with the email '{request.Email}' already exists."
        );
    }

    // Check duplicate Clerk profile
    var existingClerk = await _context.Clerks
        .AnyAsync(c =>
            c.Email != null &&
            c.Email.ToLower() == email);

    if (existingClerk)
    {
        throw new ArgumentException(
            $"A clerk with the username/email '{request.Email}' already exists."
        );
    }

    // Find Clerk role
    var clerkRole = await _context.Roles
        .FirstOrDefaultAsync(r =>
            r.Name.ToLower() == "clerk");

    if (clerkRole == null)
    {
        throw new InvalidOperationException(
            "Clerk role does not exist in the Roles table."
        );
    }

    await using var transaction =
        await _context.Database.BeginTransactionAsync();

    try
    {
        // Create User account
        var user = new User
        {
            Name = request.GetEffectiveName(),
            Email = email,
            PasswordHash = _passwordService.HashPassword(request.Password),
            Role = "Clerk",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _context.Users.AddAsync(user);

        // Save first to get UserId
        await _context.SaveChangesAsync();

        // Create UserRole
        var userRole = new UserRole
        {
            UserId = user.UserId,
            RoleId = clerkRole.Id
        };

        await _context.UserRoles.AddAsync(userRole);

        // Create Clerk profile
        var clerk = new Clerk
        {
            UserId = user.UserId,
            Name = user.Name,
            Email = user.Email,
            Contact = request.Contact.Trim(),
            Department = request.Department.Trim(),
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _context.Clerks.AddAsync(clerk);

        await _context.SaveChangesAsync();

        await transaction.CommitAsync();

        NotifyClerkAccountCreated(clerk, request.Password);

        return MapToResponse(clerk);
    }
    catch
    {
        await transaction.RollbackAsync();
        throw;
    }
}

    private void NotifyClerkAccountCreated(Clerk clerk, string rawPassword)
    {
        if (_emailService == null) return;

        try
        {
            var recipientEmail = clerk.Email;
            var clerkName = clerk.Name;
            var username = clerk.Email ?? string.Empty;
            var department = clerk.Department;
            var contact = clerk.Contact;
            var createdAt = clerk.CreatedAt;

            _ = Task.Run(async () =>
            {
                try
                {
                    await _emailService.SendClerkWelcomeEmailAsync(
                        recipientEmail: recipientEmail,
                        clerkName: clerkName,
                        username: username,
                        password: rawPassword,
                        department: department,
                        contact: contact,
                        createdAt: createdAt
                    );
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[EmailNotification] Failed sending clerk welcome email: {ex.Message}");
                }
            });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[EmailNotification] Failed to prepare clerk welcome email: {ex.Message}");
        }
    }

    public async Task<ClerkResponse?> UpdateClerkAsync(
    int clerkId,
    UpdateClerkRequest request)
{
    var clerk = await _context.Clerks
        .Include(c => c.DocumentationRequests)
        .FirstOrDefaultAsync(c => c.ClerkId == clerkId);

    if (clerk == null)
        return null;

    User? user = null;

    if (clerk.UserId.HasValue)
    {
        user = await _context.Users
            .FirstOrDefaultAsync(u =>
                u.UserId == clerk.UserId.Value);
    }

    // Update name
    if (!string.IsNullOrWhiteSpace(request.Name))
    {
        var newName = request.Name.Trim();

        clerk.Name = newName;

        if (user != null)
        {
            user.Name = newName;
        }
    }

    // Update email
    if (!string.IsNullOrWhiteSpace(request.Email))
    {
        var newEmail =
            request.Email.Trim().ToLowerInvariant();

        var duplicateUser = await _context.Users
            .AnyAsync(u =>
                u.UserId != clerk.UserId &&
                u.Email.ToLower() == newEmail);

        if (duplicateUser)
        {
            throw new ArgumentException(
                $"Another account already has the email '{request.Email}'."
            );
        }

        var duplicateClerk = await _context.Clerks
            .AnyAsync(c =>
                c.ClerkId != clerkId &&
                c.Email != null &&
                c.Email.ToLower() == newEmail);

        if (duplicateClerk)
        {
            throw new ArgumentException(
                $"Another clerk already has the email '{request.Email}'."
            );
        }

        clerk.Email = newEmail;

        if (user != null)
        {
            user.Email = newEmail;
        }
    }

    // Update password in Users table
    if (!string.IsNullOrWhiteSpace(request.Password))
    {
        if (user == null)
        {
            throw new InvalidOperationException(
                "This Clerk does not have a linked User account."
            );
        }

        user.PasswordHash =
            _passwordService.HashPassword(request.Password);
    }

    // Update active state
    if (request.IsActive.HasValue)
    {
        clerk.IsActive = request.IsActive.Value;
    }

    // Update profile fields
    clerk.Contact = request.Contact.Trim();
    clerk.Department = request.Department.Trim();
    clerk.UpdatedAt = DateTime.UtcNow;

    if (user != null)
    {
        user.UpdatedAt = DateTime.UtcNow;
    }

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
