using System;
using System.Collections.Generic;

namespace LegalService.API.Models.Entities;

public class Appointment
{
    public Guid AppointmentId { get; set; }
    public Guid CustomerId { get; set; }
    public Guid LawyerId { get; set; }
    public Guid SlotId { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    // Navigation properties
    public User Customer { get; set; } = null!;
    public Lawyer Lawyer { get; set; } = null!;
    public AvailabilitySlot AvailabilitySlot { get; set; } = null!;
    public ICollection<AppointmentStatusHistory> AppointmentStatusHistories { get; set; } = new List<AppointmentStatusHistory>();
}
