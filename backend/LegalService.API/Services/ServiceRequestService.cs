using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using LegalService.API.Data;
using LegalService.API.DTOs.Requests;
using LegalService.API.DTOs.Responses;
using LegalService.API.Interfaces;
using LegalService.API.Models.Entities;

namespace LegalService.API.Services;

public class ServiceRequestService : IServiceRequestService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<ServiceRequestService> _logger;

    private static readonly HashSet<ServiceRequestStatus> EditableStatuses =
    [
        ServiceRequestStatus.Submitted,
        ServiceRequestStatus.RevisionRequired
    ];

    private static readonly HashSet<ServiceRequestStatus> CancellableStatuses =
    [
        ServiceRequestStatus.Submitted,
        ServiceRequestStatus.InProgress,
        ServiceRequestStatus.RevisionRequired
    ];

    private static readonly Dictionary<ServiceRequestStatus, HashSet<ServiceRequestStatus>> AllowedTransitions = new()
    {
        [ServiceRequestStatus.Submitted]        = [ServiceRequestStatus.InProgress, ServiceRequestStatus.Cancelled, ServiceRequestStatus.Rejected],
        [ServiceRequestStatus.InProgress]       = [ServiceRequestStatus.AwaitingReview, ServiceRequestStatus.RevisionRequired, ServiceRequestStatus.Cancelled],
        [ServiceRequestStatus.AwaitingReview]   = [ServiceRequestStatus.Approved, ServiceRequestStatus.Rejected, ServiceRequestStatus.RevisionRequired],
        [ServiceRequestStatus.RevisionRequired] = [ServiceRequestStatus.InProgress, ServiceRequestStatus.Cancelled],
        [ServiceRequestStatus.Approved]         = [ServiceRequestStatus.Completed],
        [ServiceRequestStatus.Rejected]         = [],
        [ServiceRequestStatus.Completed]        = [],
        [ServiceRequestStatus.Cancelled]        = []
    };

    public ServiceRequestService(ApplicationDbContext context, ILogger<ServiceRequestService> logger)
    {
        _context = context;
        _logger = logger;
    }

    // ── CREATE ────────────────────────────────────────────────────────────────

    public async Task<ServiceRequestDetailsResponse> CreateAsync(int customerId, CreateServiceRequestRequest request)
    {
        var entity = new ServiceRequest
        {
            ServiceRequestId = Guid.NewGuid(),
            CustomerId       = customerId,
            Title            = request.Title.Trim(),
            Description      = request.Description.Trim(),
            RequestType      = request.RequestType.Trim(),
            Priority         = request.Priority?.Trim(),
            Status           = ServiceRequestStatus.Submitted,
            CreatedAt        = DateTime.UtcNow,
            UpdatedAt        = DateTime.UtcNow
        };

        await _context.ServiceRequests.AddAsync(entity);

        await AddAuditLogAsync(
            customerId,
            "ServiceRequestCreated",
            $"ServiceRequest|{entity.ServiceRequestId}",
            null,
            $"Status=Submitted, Type={entity.RequestType}");

        await _context.SaveChangesAsync();
        _logger.LogInformation("ServiceRequest {Id} created by customer {CustomerId}", entity.ServiceRequestId, customerId);

        // Note: User table uses int UserId in code but uuid Id in DB — we look up by UserId (int) via auth
        // For now, CustomerName is resolved from context if available
        var customer = await _context.Users
            .FirstOrDefaultAsync(u => u.UserId == customerId);

        return MapToDetails(entity, customer);
    }

    // ── READ ──────────────────────────────────────────────────────────────────

    public async Task<IEnumerable<ServiceRequestResponse>> GetAllAsync(
        int? customerId = null,
        string? status = null,
        string? requestType = null)
        {
        var query = _context.ServiceRequests.AsQueryable();

        if (customerId.HasValue)
            query = query.Where(sr => sr.CustomerId == customerId.Value);

        if (!string.IsNullOrWhiteSpace(status) &&
            Enum.TryParse<ServiceRequestStatus>(status, ignoreCase: true, out var parsedStatus))
        {
            query = query.Where(sr => sr.Status == parsedStatus);
        }

        if (!string.IsNullOrWhiteSpace(requestType))
        {
            query = query.Where(sr =>
                sr.RequestType.ToLower().Contains(requestType.ToLower()));
        }

        var requests = await query
            .OrderByDescending(sr => sr.CreatedAt)
            .ToListAsync();

        var response = new List<ServiceRequestResponse>();

        foreach (var sr in requests)
        {
            var customer = await _context.Users
                .FirstOrDefaultAsync(u => u.UserId == sr.CustomerId);

            response.Add(MapToSummary(sr, customer));
        }

        return response;
    }

    public async Task<ServiceRequestDetailsResponse?> GetByIdAsync(Guid requestId)
{
        var entity = await _context.ServiceRequests
            .FirstOrDefaultAsync(sr => sr.ServiceRequestId == requestId);

        if (entity == null)
            return null;

        var customer = await _context.Users
            .FirstOrDefaultAsync(u => u.UserId == entity.CustomerId);

        return MapToDetails(entity, customer);
    }

    // ── UPDATE ────────────────────────────────────────────────────────────────

    public async Task<ServiceRequestDetailsResponse?> UpdateAsync(
        Guid requestId, int customerId, UpdateServiceRequestRequest request)
    {
        var entity = await _context.ServiceRequests
            .FirstOrDefaultAsync(sr => sr.ServiceRequestId == requestId);

        if (entity == null) return null;

        if (entity.CustomerId != customerId)
            throw new UnauthorizedAccessException("You are not authorised to edit this request.");

        if (!EditableStatuses.Contains(entity.Status))
            throw new InvalidOperationException(
                $"Service requests with status '{entity.Status}' cannot be edited. " +
                "Only Submitted or RevisionRequired requests may be modified.");

        var prev = $"Title={entity.Title}, Type={entity.RequestType}, Priority={entity.Priority}";
        entity.Title       = request.Title.Trim();
        entity.Description = request.Description.Trim();
        entity.RequestType = request.RequestType.Trim();
        entity.Priority    = request.Priority?.Trim();
        entity.UpdatedAt   = DateTime.UtcNow;

        await AddAuditLogAsync(customerId, "ServiceRequestUpdated",
            $"ServiceRequest|{entity.ServiceRequestId}", prev,
            $"Title={entity.Title}, Type={entity.RequestType}, Priority={entity.Priority}");

        await _context.SaveChangesAsync();
        _logger.LogInformation("ServiceRequest {Id} updated by customer {CustomerId}", requestId, customerId);
        return MapToDetails(entity, null);
    }

    // ── CANCEL ────────────────────────────────────────────────────────────────

    public async Task<ServiceRequestDetailsResponse?> CancelAsync(Guid requestId, int customerId)
    {
        var entity = await _context.ServiceRequests
            .FirstOrDefaultAsync(sr => sr.ServiceRequestId == requestId);

        if (entity == null) return null;

        if (entity.CustomerId != customerId)
            throw new UnauthorizedAccessException("You are not authorised to cancel this request.");

        if (!CancellableStatuses.Contains(entity.Status))
            throw new InvalidOperationException(
                $"Service requests with status '{entity.Status}' cannot be cancelled.");

        var prev = entity.Status.ToString();
        entity.Status    = ServiceRequestStatus.Cancelled;
        entity.UpdatedAt = DateTime.UtcNow;

        await AddAuditLogAsync(customerId, "ServiceRequestCancelled",
            $"ServiceRequest|{entity.ServiceRequestId}", prev,
            ServiceRequestStatus.Cancelled.ToString());

        await _context.SaveChangesAsync();
        _logger.LogInformation("ServiceRequest {Id} cancelled by customer {CustomerId}", requestId, customerId);
        return MapToDetails(entity, null);
    }

    // ── ADMIN STATUS CHANGE ───────────────────────────────────────────────────

    public async Task<ServiceRequestDetailsResponse?> ChangeStatusAsync(
        Guid requestId, ServiceRequestStatus newStatus, string? note, int? adminUserId)
    {
        var entity = await _context.ServiceRequests
            .FirstOrDefaultAsync(sr => sr.ServiceRequestId == requestId);

        if (entity == null) return null;

        if (!AllowedTransitions.TryGetValue(entity.Status, out var allowed) || !allowed.Contains(newStatus))
            throw new InvalidOperationException(
                $"Invalid status transition from '{entity.Status}' to '{newStatus}'. " +
                $"Allowed: {string.Join(", ", AllowedTransitions[entity.Status].Select(s => s.ToString()))}");

        var prev = entity.Status.ToString();
        entity.Status    = newStatus;
        entity.UpdatedAt = DateTime.UtcNow;

        var details = string.IsNullOrWhiteSpace(note)
            ? $"{prev} → {newStatus}"
            : $"{prev} → {newStatus} | Note: {note}";

        await AddAuditLogAsync(adminUserId, "ServiceRequestStatusChanged",
            $"ServiceRequest|{entity.ServiceRequestId}", prev, details);

        await _context.SaveChangesAsync();
        _logger.LogInformation("ServiceRequest {Id} status changed {Prev}→{New} by admin {AdminId}",
            requestId, prev, newStatus, adminUserId);

        return MapToDetails(entity, null);
    }

    // ── HELPERS ───────────────────────────────────────────────────────────────

    private async Task AddAuditLogAsync(
        int? userId, string action, string entityRef, string? prev, string? next)
    {
        var log = new AuditLog
        {
            AuditLogId = Guid.NewGuid(),
            UserId     = userId,
            Action     = action,
            Details    = $"Entity: {entityRef} | Prev: {prev ?? "—"} | New: {next ?? "—"}",
            Timestamp  = DateTime.UtcNow
        };
        await _context.AuditLogs.AddAsync(log);
    }

    private static ServiceRequestResponse MapToSummary(ServiceRequest sr, User? customer) =>
        new()
        {
            ServiceRequestId = sr.ServiceRequestId,
            CustomerId       = sr.CustomerId,
            CustomerName     = customer?.Name ?? string.Empty,
            Title            = sr.Title,
            RequestType      = sr.RequestType,
            Priority         = sr.Priority,
            Status           = sr.Status.ToString(),
            CreatedAt        = sr.CreatedAt,
            UpdatedAt        = sr.UpdatedAt
        };

    private static ServiceRequestDetailsResponse MapToDetails(ServiceRequest sr, User? customer) =>
        new()
        {
            ServiceRequestId = sr.ServiceRequestId,
            CustomerId       = sr.CustomerId,
            CustomerName     = customer?.Name ?? string.Empty,
            CustomerEmail    = customer?.Email ?? string.Empty,
            Title            = sr.Title,
            Description      = sr.Description,
            RequestType      = sr.RequestType,
            Priority         = sr.Priority,
            Status           = sr.Status.ToString(),
            CreatedAt        = sr.CreatedAt,
            UpdatedAt        = sr.UpdatedAt,
            IsEditable       = EditableStatuses.Contains(sr.Status),
            IsCancellable    = CancellableStatuses.Contains(sr.Status)
        };
}
