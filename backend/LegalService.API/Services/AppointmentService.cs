using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using LegalService.API.Data;
using LegalService.API.DTOs.Appointments;
using LegalService.API.Interfaces;
using LegalService.API.Models.Entities;

namespace LegalService.API.Services;

public class AppointmentService : IAppointmentService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<AppointmentService> _logger;

    public AppointmentService(
        ApplicationDbContext context,
        ILogger<AppointmentService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<AppointmentDetailsResponse> BookAppointmentAsync(BookAppointmentRequest request)
    {
        _logger.LogInformation("Attempting to book appointment. LawyerId: {LawyerId}, SlotId: {SlotId}, CustomerId: {CustomerId}",
            request.LawyerId, request.SlotId, request.CustomerId);

        var slot = await _context.AvailabilitySlots
            .Include(s => s.LawyerAvailability)
            .FirstOrDefaultAsync(s => s.SlotId == request.SlotId);

        if (slot == null)
            throw new KeyNotFoundException($"Availability slot '{request.SlotId}' was not found.");

        if (slot.LawyerAvailability.LawyerId != request.LawyerId)
            throw new InvalidOperationException("The requested slot does not belong to the selected lawyer.");

        if (slot.IsBooked)
            throw new InvalidOperationException("The selected time slot is already booked. Please select an available slot.");

        // Check if there is an active appointment already attached to this slot
        var activeExistingAppointment = await _context.Appointments
            .AnyAsync(a => a.SlotId == slot.SlotId && a.Status != "Cancelled" && a.Status != "Rejected");

        if (activeExistingAppointment)
            throw new InvalidOperationException("An active appointment is already scheduled for this slot.");

        // Check for conflicting overlapping appointments for the lawyer on the same date
        var conflict = await CheckConflictAsync(
            request.LawyerId,
            slot.LawyerAvailability.Date,
            slot.StartTime,
            slot.EndTime);

        if (conflict.HasConflict)
            throw new InvalidOperationException($"Scheduling conflict detected: {conflict.Reason}");

        // Reserve the slot atomically
        slot.IsBooked = true;

        var appointment = new Appointment
        {
            AppointmentId = Guid.NewGuid(),
            CustomerId = request.CustomerId,
            LawyerId = request.LawyerId,
            SlotId = request.SlotId,
            Status = "Requested",
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
            var lawyerName = a.Lawyer?.Qualification ?? "Lawyer Counsel";

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
        var appointment = await _context.Appointments
            .Include(a => a.AvailabilitySlot)
                .ThenInclude(s => s.LawyerAvailability)
            .FirstOrDefaultAsync(a => a.AppointmentId == appointmentId);

        if (appointment == null)
            return null;

        if (appointment.Status == "Completed" || appointment.Status == "Cancelled" || appointment.Status == "Rejected")
            throw new InvalidOperationException($"Cannot reschedule an appointment with status '{appointment.Status}'.");

        var newSlot = await _context.AvailabilitySlots
            .Include(s => s.LawyerAvailability)
            .FirstOrDefaultAsync(s => s.SlotId == newSlotId);

        if (newSlot == null)
            throw new KeyNotFoundException($"New availability slot '{newSlotId}' was not found.");

        if (newSlot.LawyerAvailability.LawyerId != appointment.LawyerId)
            throw new InvalidOperationException("The requested slot does not belong to the appointment's lawyer.");

        if (newSlot.IsBooked && newSlot.SlotId != appointment.SlotId)
            throw new InvalidOperationException("The selected new slot is already booked.");

        // Check conflicts excluding the current appointment
        var conflict = await CheckConflictAsync(
            appointment.LawyerId,
            newSlot.LawyerAvailability.Date,
            newSlot.StartTime,
            newSlot.EndTime,
            excludeAppointmentId: appointment.AppointmentId);

        if (conflict.HasConflict)
            throw new InvalidOperationException($"Conflict on new slot: {conflict.Reason}");

        // Release old slot
        if (appointment.AvailabilitySlot != null)
        {
            appointment.AvailabilitySlot.IsBooked = false;
        }

        // Reserve new slot
        newSlot.IsBooked = true;
        appointment.SlotId = newSlotId;
        appointment.AvailabilitySlot = newSlot;

        await ApplyStatusChangeAsync(appointment, "Rescheduled");
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
        var slots = await _context.AvailabilitySlots
            .Include(s => s.LawyerAvailability)
            .Where(s => s.LawyerAvailability.LawyerId == lawyerId
                     && s.LawyerAvailability.Date == date
                     && !s.IsBooked)
            .OrderBy(s => s.StartTime)
            .ToListAsync();

        return slots.Select(s => new AvailabilitySlotResponse
        {
            SlotId = s.SlotId,
            AvailabilityId = s.AvailabilityId,
            Date = s.LawyerAvailability.Date,
            StartTime = s.StartTime,
            EndTime = s.EndTime,
            IsBooked = s.IsBooked
        });
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
        var lawyerName = a.Lawyer?.Qualification ?? "Lawyer Counsel";
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
        // Try matching UserId as integer or Guid
        if (int.TryParse(customerId.ToString(), out int intId))
        {
            var user = await _context.Users.FindAsync(intId);
            if (user != null) return user.Name;
        }

        return $"Client {customerId.ToString()[..8]}";
    }
}
