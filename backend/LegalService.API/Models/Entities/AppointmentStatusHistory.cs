using System;

namespace LegalService.API.Models.Entities;

public class AppointmentStatusHistory
{
    public Guid HistoryId { get; set; }
    public Guid AppointmentId { get; set; }
    public string PreviousStatus { get; set; } = string.Empty;
    public string NewStatus { get; set; } = string.Empty;
    public DateTime ChangedDate { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public Appointment Appointment { get; set; } = null!;
}
