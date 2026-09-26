using System;
using System.ComponentModel.DataAnnotations;

namespace LegalService.API.DTOs.Appointments;

public class BookAppointmentRequest
{
    [Required]
    public Guid LawyerId { get; set; }

    [Required]
    public Guid SlotId { get; set; }

    [Required]
    public Guid CustomerId { get; set; }

    [MaxLength(1000)]
    public string? Notes { get; set; }

    [MaxLength(2000)]
    public string? Description { get; set; }

    public string ConsultationType { get; set; } = "Online";

    public string? LegalServiceCategory { get; set; }
}

public class RescheduleAppointmentRequest
{
    [Required]
    public Guid NewSlotId { get; set; }

    [MaxLength(500)]
    public string? Reason { get; set; }
}

public class CancelAppointmentRequest
{
    [MaxLength(500)]
    public string? Reason { get; set; }
}

public class UpdateAppointmentRequest
{
    [MaxLength(1000)]
    public string? Notes { get; set; }
}

public class AppointmentActionRequest
{
    [MaxLength(500)]
    public string? Notes { get; set; }
}

public class CheckConflictRequest
{
    [Required]
    public Guid LawyerId { get; set; }

    [Required]
    public DateOnly Date { get; set; }

    [Required]
    public TimeOnly StartTime { get; set; }

    [Required]
    public TimeOnly EndTime { get; set; }

    public Guid? ExcludeAppointmentId { get; set; }
}
