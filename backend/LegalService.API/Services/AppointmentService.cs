using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using LegalService.API.Data;
using LegalService.API.Services.Scheduling;
using LegalService.API.Infrastructure;
using LegalService.API.DTOs.Appointments;
using LegalService.API.Interfaces;
using LegalService.API.Models.Entities;

namespace LegalService.API.Services;

public class AppointmentService : IAppointmentService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<AppointmentService> _logger;
    private readonly AvailabilityService availability;

    public AppointmentService(
        ApplicationDbContext context,
        ILogger<AppointmentService> logger, AvailabilityService? scheduling = null)
    {
        _context = context;
        _logger = logger;
        availability = scheduling ?? new AvailabilityService(context);
    }

    public async Task<AppointmentDetailsResponse> BookAppointmentAsync(BookAppointmentRequest request)
    {
        _logger.LogInformation("Attempting to book appointment. LawyerId: {LawyerId}, SlotId: {SlotId}, CustomerId: {CustomerId}",
            request.LawyerId, request.SlotId, request.CustomerId);

        if (request.AppointmentSource != null && !new[] { "CLIENT_PORTAL", "FRONT_DESK", "AI_FRONT_DESK", "ADMIN" }.Contains(request.AppointmentSource))
            throw new ApiException(400, "Invalid appointment entry channel.");
        await using var transaction = await availability.BeginMutationAsync();
        await availability.LockLawyerAsync(request.LawyerId);
        await ValidateCustomerAsync(request.CustomerId);
        var slot = await CreateBookingSnapshotAsync(request.LawyerId, request.SlotId);

        var appointment = new Appointment
        {
            AppointmentId = Guid.NewGuid(),
            CustomerId = request.CustomerId,
            LawyerId = request.LawyerId,
            SlotId = slot.SlotId,
            AvailabilitySlot = slot,
            Status = "Requested",
            Description = request.Description ?? request.Notes,
            AppointmentSource = request.AppointmentSource,
            ConsultationType = string.IsNullOrWhiteSpace(request.ConsultationType) ? "Online" : request.ConsultationType,
            LegalServiceCategory = request.LegalServiceCategory,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var history = new AppointmentStatusHistory
        {
            HistoryId = Guid.NewGuid(),
            AppointmentId = appointment.AppointmentId,
            PreviousStatus = "None",
            NewStatus = "Requested",
            ChangedDate = DateTime.UtcNow
        };

        await _context.Appointments.AddAsync(appointment);
        await _context.AppointmentStatusHistories.AddAsync(history);
        await _context.SaveChangesAsync();

        if (transaction is not null) await transaction.CommitAsync();

        _logger.LogInformation("Appointment successfully booked with ID: {AppointmentId}", appointment.AppointmentId);

        return await MapToDetailsResponseAsync(appointment, slot);
    }

    public async Task<IEnumerable<AppointmentResponse>> GetAllAppointmentsAsync(
        Guid? lawyerId = null,
        Guid? customerId = null,
        string? status = null,
        DateOnly? date = null)
    {
        var query = _context.Appointments
            .Include(a => a.Lawyer)
            .Include(a => a.AvailabilitySlot)
                .ThenInclude(s => s.LawyerAvailability)
            .AsNoTracking()
            .AsQueryable();

        if (lawyerId.HasValue && lawyerId.Value != Guid.Empty)
            query = query.Where(a => a.LawyerId == lawyerId.Value);

        if (customerId.HasValue && customerId.Value != Guid.Empty)
            query = query.Where(a => a.CustomerId == customerId.Value);

        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(a => a.Status.ToLower() == status.Trim().ToLower());

        if (date.HasValue)
            query = query.Where(a => a.AvailabilitySlot.LawyerAvailability.Date == date.Value);

        var appointments = await query
            .OrderByDescending(a => a.CreatedAt)
            .ToListAsync();

        var responses = new List<AppointmentResponse>();
        foreach (var a in appointments)
        {
            var customerName = await ResolveCustomerNameAsync(a.CustomerId);
            var lawyerName = !string.IsNullOrWhiteSpace(a.Lawyer?.Name)
                ? a.Lawyer.Name
                : (a.Lawyer?.Qualification ?? "Lawyer Counsel");

            responses.Add(new AppointmentResponse
            {
                AppointmentId = a.AppointmentId,
                CustomerId = a.CustomerId,
                CustomerName = customerName,
                LawyerId = a.LawyerId,
                LawyerName = lawyerName,
                SlotId = a.SlotId,
                Date = a.AvailabilitySlot?.LawyerAvailability?.Date ?? DateOnly.MinValue,
                StartTime = a.AvailabilitySlot?.StartTime ?? TimeOnly.MinValue,
                EndTime = a.AvailabilitySlot?.EndTime ?? TimeOnly.MinValue,
                Status = a.Status,
                Description = a.Description,
                ConsultationType = a.ConsultationType,
            AppointmentSource = a.AppointmentSource,
                LegalServiceCategory = a.LegalServiceCategory,
                CreatedAt = a.CreatedAt,
                UpdatedAt = a.UpdatedAt
            });
        }

        return responses;
    }

    public async Task<AppointmentDetailsResponse?> GetAppointmentByIdAsync(Guid appointmentId)
    {
        var appointment = await _context.Appointments
            .Include(a => a.Lawyer)
            .Include(a => a.AvailabilitySlot)
                .ThenInclude(s => s.LawyerAvailability)
            .Include(a => a.AppointmentStatusHistories)
            .FirstOrDefaultAsync(a => a.AppointmentId == appointmentId);

        if (appointment == null)
            return null;

        return await MapToDetailsResponseAsync(appointment, appointment.AvailabilitySlot);
    }

    public async Task<AppointmentDetailsResponse?> UpdateAppointmentAsync(Guid appointmentId, UpdateAppointmentRequest request)
    {
        var appointment = await _context.Appointments
            .Include(a => a.AvailabilitySlot)
                .ThenInclude(s => s.LawyerAvailability)
            .FirstOrDefaultAsync(a => a.AppointmentId == appointmentId);

        if (appointment == null)
            return null;

        if (appointment.Status == "Completed" || appointment.Status == "Cancelled")
            throw new InvalidOperationException($"Cannot update an appointment in '{appointment.Status}' status.");

        appointment.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return await MapToDetailsResponseAsync(appointment, appointment.AvailabilitySlot);
    }

    public async Task<bool> DeleteAppointmentAsync(Guid appointmentId)
    {
        var appointment = await _context.Appointments
            .Include(a => a.AvailabilitySlot)
            .FirstOrDefaultAsync(a => a.AppointmentId == appointmentId);

        if (appointment == null)
            return false;

        // Release slot if still booked
        if (appointment.AvailabilitySlot != null)
        {
            appointment.AvailabilitySlot.IsBooked = false;
        }

        _context.Appointments.Remove(appointment);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<AppointmentDetailsResponse?> ConfirmAppointmentAsync(Guid appointmentId, string? notes)
    {
        var appointment = await _context.Appointments
            .Include(a => a.AvailabilitySlot)
                .ThenInclude(s => s.LawyerAvailability)
            .FirstOrDefaultAsync(a => a.AppointmentId == appointmentId);

        if (appointment == null)
            return null;

        if (appointment.Status != "Requested" && appointment.Status != "Rescheduled")
            throw new InvalidOperationException($"Cannot confirm appointment with status '{appointment.Status}'. Allowed from 'Requested' or 'Rescheduled'.");

        await ApplyStatusChangeAsync(appointment, "Confirmed");
        return await MapToDetailsResponseAsync(appointment, appointment.AvailabilitySlot);
    }

    public async Task<AppointmentDetailsResponse?> RejectAppointmentAsync(Guid appointmentId, string? reason)
    {
        var appointment = await _context.Appointments
            .Include(a => a.AvailabilitySlot)
                .ThenInclude(s => s.LawyerAvailability)
            .FirstOrDefaultAsync(a => a.AppointmentId == appointmentId);

        if (appointment == null)
            return null;

        if (appointment.Status != "Requested")
            throw new InvalidOperationException($"Only appointments in 'Requested' status can be rejected.");

        // Release the slot so it can be re-booked
        if (appointment.AvailabilitySlot != null)
        {
            appointment.AvailabilitySlot.IsBooked = false;
        }

        await ApplyStatusChangeAsync(appointment, "Rejected");
        return await MapToDetailsResponseAsync(appointment, appointment.AvailabilitySlot);
    }

    public async Task<AppointmentDetailsResponse?> CancelAppointmentAsync(Guid appointmentId, string? reason)
    {
        var appointment = await _context.Appointments
            .Include(a => a.AvailabilitySlot)
                .ThenInclude(s => s.LawyerAvailability)
            .FirstOrDefaultAsync(a => a.AppointmentId == appointmentId);

        if (appointment == null)
            return null;

        if (appointment.Status == "Completed" || appointment.Status == "Cancelled")
            throw new InvalidOperationException($"Cannot cancel an appointment that is already '{appointment.Status}'.");

        // Release slot back to available pool
        if (appointment.AvailabilitySlot != null)
        {
            appointment.AvailabilitySlot.IsBooked = false;
        }

        await ApplyStatusChangeAsync(appointment, "Cancelled");
        return await MapToDetailsResponseAsync(appointment, appointment.AvailabilitySlot);
    }

    public async Task<AppointmentDetailsResponse?> RescheduleAppointmentAsync(
        Guid appointmentId,
        Guid newSlotId,
        string? reason)
    {
        await using var transaction = await availability.BeginMutationAsync();
        var lawyerId = await _context.Appointments.Where(a => a.AppointmentId == appointmentId).Select(a => (Guid?)a.LawyerId).SingleOrDefaultAsync();
        if (lawyerId is null) return null;
        await availability.LockLawyerAsync(lawyerId.Value);
        var appointment = await _context.Appointments
            .Include(a => a.AvailabilitySlot)
                .ThenInclude(s => s.LawyerAvailability)
            .FirstOrDefaultAsync(a => a.AppointmentId == appointmentId);

        if (appointment == null)
            return null;

        if (appointment.Status == "Completed" || appointment.Status == "Cancelled" || appointment.Status == "Rejected")
            throw new InvalidOperationException($"Cannot reschedule an appointment with status '{appointment.Status}'.");

        var newSlot = await CreateBookingSnapshotAsync(appointment.LawyerId, newSlotId, appointment.AppointmentId);

        // Release old slot
        if (appointment.AvailabilitySlot != null)
        {
            appointment.AvailabilitySlot.IsBooked = false;
        }

        // Reserve new slot
        newSlot.IsBooked = true;
        appointment.SlotId = newSlot.SlotId;
        appointment.AvailabilitySlot = newSlot;

        await ApplyStatusChangeAsync(appointment, "Rescheduled");
        if (transaction is not null) await transaction.CommitAsync();
        return await MapToDetailsResponseAsync(appointment, newSlot);
    }

    public async Task<AppointmentDetailsResponse?> CompleteAppointmentAsync(Guid appointmentId, string? notes)
    {
        var appointment = await _context.Appointments
            .Include(a => a.AvailabilitySlot)
                .ThenInclude(s => s.LawyerAvailability)
            .FirstOrDefaultAsync(a => a.AppointmentId == appointmentId);

        if (appointment == null)
            return null;

        if (appointment.Status != "Confirmed")
            throw new InvalidOperationException($"Only 'Confirmed' appointments can be completed. Current status: '{appointment.Status}'.");

        await ApplyStatusChangeAsync(appointment, "Completed");
        return await MapToDetailsResponseAsync(appointment, appointment.AvailabilitySlot);
    }

    public async Task<IEnumerable<AppointmentHistoryResponse>> GetAppointmentHistoryAsync(Guid appointmentId)
    {
        var histories = await _context.AppointmentStatusHistories
            .Where(h => h.AppointmentId == appointmentId)
            .OrderByDescending(h => h.ChangedDate)
            .ToListAsync();

        return histories.Select(h => new AppointmentHistoryResponse
        {
            HistoryId = h.HistoryId,
            AppointmentId = h.AppointmentId,
            PreviousStatus = h.PreviousStatus,
            NewStatus = h.NewStatus,
            ChangedDate = h.ChangedDate
        });
    }

    public async Task<IEnumerable<AvailabilitySlotResponse>> GetAvailableSlotsAsync(Guid lawyerId, DateOnly date)
    {
        var result = await availability.GetAsync(lawyerId, date);
        return result.AvailableSlots.Select(s => new AvailabilitySlotResponse {
            SlotId = s.SlotId, Date = date, StartTime = s.Start, EndTime = s.End, IsBooked = false
        });
    }

    private async Task ValidateCustomerAsync(Guid customerId)
    {
        const string prefix = "00000000-0000-0000-0000-";
        var text = customerId.ToString();
        if (!text.StartsWith(prefix, StringComparison.Ordinal) ||
            !long.TryParse(text[prefix.Length..], System.Globalization.NumberStyles.HexNumber,
                System.Globalization.CultureInfo.InvariantCulture, out var number) || number is <= 0 or > int.MaxValue ||
            !await _context.Users.AnyAsync(u => u.UserId == (int)number && u.Role == "Customer"))
            throw new ApiException(400, "Select an existing customer account.");
    }

    private async Task<AvailabilitySlot> CreateBookingSnapshotAsync(Guid lawyerId, Guid selectedSlot, Guid? excludeAppointment = null)
    {
        var interval = await availability.ResolveSlotAsync(lawyerId, selectedSlot);
        var snapshot = await availability.LoadAsync(interval.Date, interval.Date, [lawyerId]);
        var day = snapshot.Day(lawyerId, interval.Date, excludeAppointment);
        if (!day.AvailableSlots.Any(s => s.Start == interval.Start && s.End == interval.End))
            throw new ApiException(409, "Selected slot is no longer available.");
        // Only actual appointments persist timing snapshots. These records never generate availability.
        var window = new LawyerAvailability { AvailabilityId = Guid.NewGuid(), LawyerId = lawyerId,
            Date = interval.Date, StartTime = interval.Start, EndTime = interval.End };
        var slot = new AvailabilitySlot { SlotId = Guid.NewGuid(), LawyerAvailability = window,
            AvailabilityId = window.AvailabilityId, StartTime = interval.Start, EndTime = interval.End, IsBooked = true };
        _context.AvailabilitySlots.Add(slot);
        return slot;
    }

    public async Task<ConflictCheckResponse> CheckConflictAsync(
        Guid lawyerId,
        DateOnly date,
        TimeOnly start,
        TimeOnly end,
        Guid? excludeAppointmentId = null)
    {
        if (start >= end)
        {
            return new ConflictCheckResponse
            {
                HasConflict = true,
                Reason = "Start time must be strictly before end time."
            };
        }

        var overlappingAppointment = await _context.Appointments
            .Include(a => a.AvailabilitySlot)
                .ThenInclude(s => s.LawyerAvailability)
            .Where(a => a.LawyerId == lawyerId
                     && a.Status != "Cancelled"
                     && a.Status != "Rejected"
                     && (!excludeAppointmentId.HasValue || a.AppointmentId != excludeAppointmentId.Value)
                     && a.AvailabilitySlot.LawyerAvailability.Date == date
                     && a.AvailabilitySlot.StartTime < end
                     && a.AvailabilitySlot.EndTime > start)
            .FirstOrDefaultAsync();

        if (overlappingAppointment != null)
        {
            return new ConflictCheckResponse
            {
                HasConflict = true,
                Reason = $"Lawyer has an overlapping appointment from {overlappingAppointment.AvailabilitySlot.StartTime} to {overlappingAppointment.AvailabilitySlot.EndTime} (Status: {overlappingAppointment.Status}).",
                ConflictingAppointmentId = overlappingAppointment.AppointmentId
            };
        }

        return new ConflictCheckResponse
        {
            HasConflict = false
        };
    }

    // ─── Private Helpers ─────────────────────────────────────────────────────────

    private async Task ApplyStatusChangeAsync(Appointment appointment, string newStatus)
    {
        var previousStatus = appointment.Status;
        appointment.Status = newStatus;
        appointment.UpdatedAt = DateTime.UtcNow;

        var history = new AppointmentStatusHistory
        {
            HistoryId = Guid.NewGuid(),
            AppointmentId = appointment.AppointmentId,
            PreviousStatus = previousStatus,
            NewStatus = newStatus,
            ChangedDate = DateTime.UtcNow
        };

        await _context.AppointmentStatusHistories.AddAsync(history);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Appointment {AppointmentId} status changed from {Previous} to {New}",
            appointment.AppointmentId, previousStatus, newStatus);
    }

    private async Task<AppointmentDetailsResponse> MapToDetailsResponseAsync(Appointment a, AvailabilitySlot? slot)
    {
        var histories = await _context.AppointmentStatusHistories
            .Where(h => h.AppointmentId == a.AppointmentId)
            .OrderByDescending(h => h.ChangedDate)
            .ToListAsync();

        var customerName = await ResolveCustomerNameAsync(a.CustomerId);
        var lawyerName = !string.IsNullOrWhiteSpace(a.Lawyer?.Name)
            ? a.Lawyer.Name
            : (a.Lawyer?.Qualification ?? "Lawyer Counsel");
        var lawyerLicense = a.Lawyer?.LicenseNumber ?? string.Empty;

        return new AppointmentDetailsResponse
        {
            AppointmentId = a.AppointmentId,
            CustomerId = a.CustomerId,
            CustomerName = customerName,
            CustomerEmail = string.Empty,
            LawyerId = a.LawyerId,
            LawyerName = lawyerName,
            LawyerLicense = lawyerLicense,
            SlotId = a.SlotId,
            Date = slot?.LawyerAvailability?.Date ?? DateOnly.MinValue,
            StartTime = slot?.StartTime ?? TimeOnly.MinValue,
            EndTime = slot?.EndTime ?? TimeOnly.MinValue,
            Status = a.Status,
            Description = a.Description,
            ConsultationType = a.ConsultationType,
                AppointmentSource = a.AppointmentSource,
            LegalServiceCategory = a.LegalServiceCategory,
            CreatedAt = a.CreatedAt,
            UpdatedAt = a.UpdatedAt,
            CanConfirm = a.Status == "Requested" || a.Status == "Rescheduled",
            CanCancel = a.Status != "Completed" && a.Status != "Cancelled",
            CanReschedule = a.Status == "Requested" || a.Status == "Confirmed",
            CanComplete = a.Status == "Confirmed",
            History = histories.Select(h => new AppointmentHistoryResponse
            {
                HistoryId = h.HistoryId,
                AppointmentId = h.AppointmentId,
                PreviousStatus = h.PreviousStatus,
                NewStatus = h.NewStatus,
                ChangedDate = h.ChangedDate
            }).ToList()
        };
    }

    private async Task<string> ResolveCustomerNameAsync(Guid customerId)
    {
        // 1. Direct integer check if Guid string is an int
        if (int.TryParse(customerId.ToString(), out int intId))
        {
            var user = await _context.Users.FindAsync(intId);
            if (user != null) return user.Name;
        }

        // 2. Check if customerId is formatted from user int ID (e.g. 00000000-0000-0000-0000-000000000001)
        var hexStr = customerId.ToString().Replace("-", "");
        if (long.TryParse(hexStr[^8..], System.Globalization.NumberStyles.HexNumber, null, out long parsedId) && parsedId > 0 && parsedId <= int.MaxValue)
        {
            var user = await _context.Users.FindAsync((int)parsedId);
            if (user != null) return user.Name;
        }

        return $"Client {customerId.ToString()[..8]}";
    }
}
