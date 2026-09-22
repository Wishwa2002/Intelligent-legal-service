using System;
using System.Collections.Generic;

namespace LegalService.API.DTOs.Appointments;

public class AppointmentResponse
{
    public Guid AppointmentId { get; set; }
    public Guid CustomerId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public Guid LawyerId { get; set; }
    public string LawyerName { get; set; } = string.Empty;
    public Guid SlotId { get; set; }
    public DateOnly Date { get; set; }
    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class AppointmentDetailsResponse
{
    public Guid AppointmentId { get; set; }
    public Guid CustomerId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public string CustomerEmail { get; set; } = string.Empty;
    public Guid LawyerId { get; set; }
    public string LawyerName { get; set; } = string.Empty;
    public string LawyerLicense { get; set; } = string.Empty;
    public Guid SlotId { get; set; }
    public DateOnly Date { get; set; }
    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    public bool CanConfirm { get; set; }
    public bool CanCancel { get; set; }
    public bool CanReschedule { get; set; }
    public bool CanComplete { get; set; }

    public List<AppointmentHistoryResponse> History { get; set; } = new();
}

public class AvailabilitySlotResponse
{
    public Guid SlotId { get; set; }
    public Guid AvailabilityId { get; set; }
    public DateOnly Date { get; set; }
    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }
    public bool IsBooked { get; set; }
}

public class AppointmentHistoryResponse
{
    public Guid HistoryId { get; set; }
    public Guid AppointmentId { get; set; }
    public string PreviousStatus { get; set; } = string.Empty;
    public string NewStatus { get; set; } = string.Empty;
    public DateTime ChangedDate { get; set; }
}

public class ConflictCheckResponse
{
    public bool HasConflict { get; set; }
    public string? Reason { get; set; }
    public Guid? ConflictingAppointmentId { get; set; }
}
