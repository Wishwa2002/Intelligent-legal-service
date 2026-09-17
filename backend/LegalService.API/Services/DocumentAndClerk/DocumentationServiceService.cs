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

public class DocumentationServiceService : IDocumentationServiceService
{
    private readonly ApplicationDbContext _context;

    public DocumentationServiceService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<DocumentationServiceResponse>> GetAllServicesAsync(bool includeInactive = false)
    {
        var query = _context.DocumentationServices.AsQueryable();

        if (!includeInactive)
        {
            query = query.Where(s => s.IsActive);
        }

        var services = await query.OrderBy(s => s.Name).ToListAsync();
        return services.Select(MapToResponse);
    }

    public async Task<DocumentationServiceResponse?> GetServiceByIdAsync(int serviceId)
    {
        var service = await _context.DocumentationServices.FindAsync(serviceId);
        return service == null ? null : MapToResponse(service);
    }

    public async Task<DocumentationServiceResponse> CreateServiceAsync(CreateDocumentationServiceRequest request)
    {
        var existing = await _context.DocumentationServices
            .FirstOrDefaultAsync(s => s.Name.ToLower() == request.Name.Trim().ToLower());

        if (existing != null)
        {
            throw new InvalidOperationException($"A documentation service with the name '{request.Name}' already exists.");
        }

        var service = new DocumentationService
        {
            Name = request.Name.Trim(),
            Description = request.Description.Trim(),
            IsActive = true,
            RequiredDocuments = JsonSerializer.Serialize(request.RequiredDocuments ?? new List<string>()),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _context.DocumentationServices.AddAsync(service);
        await _context.SaveChangesAsync();

        return MapToResponse(service);
    }

    public async Task<DocumentationServiceResponse?> UpdateServiceAsync(int serviceId, UpdateDocumentationServiceRequest request)
    {
        var service = await _context.DocumentationServices.FindAsync(serviceId);
        if (service == null)
            return null;

        var existingName = await _context.DocumentationServices
            .FirstOrDefaultAsync(s => s.Name.ToLower() == request.Name.Trim().ToLower() && s.ServiceId != serviceId);

        if (existingName != null)
        {
            throw new InvalidOperationException($"A documentation service with the name '{request.Name}' already exists.");
        }

        service.Name = request.Name.Trim();
        service.Description = request.Description.Trim();
        service.IsActive = request.IsActive;
        service.RequiredDocuments = JsonSerializer.Serialize(request.RequiredDocuments ?? new List<string>());
        service.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return MapToResponse(service);
    }

    public async Task<bool> DeactivateServiceAsync(int serviceId)
    {
        var service = await _context.DocumentationServices.FindAsync(serviceId);
        if (service == null)
            return false;

        service.IsActive = false;
        await _context.SaveChangesAsync();
        return true;
    }

    public static DocumentationServiceResponse MapToResponse(DocumentationService service)
    {
        List<string> requiredDocs = new();
        try
        {
            if (!string.IsNullOrWhiteSpace(service.RequiredDocuments))
            {
                requiredDocs = JsonSerializer.Deserialize<List<string>>(service.RequiredDocuments) ?? new();
            }
        }
        catch
        {
            requiredDocs = new();
        }

        return new DocumentationServiceResponse
        {
            ServiceId = service.ServiceId,
            Name = service.Name,
            Description = service.Description,
            IsActive = service.IsActive,
            RequiredDocuments = requiredDocs
        };
    }
}
