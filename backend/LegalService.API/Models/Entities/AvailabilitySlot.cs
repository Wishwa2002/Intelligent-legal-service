using System;

namespace LegalService.API.Models.Entities;

public class AvailabilitySlot
{
    public Guid SlotId { get; set; }
    public Guid AvailabilityId { get; set; }
    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }
    public bool IsBooked { get; set; }

    // Navigation properties
    public LawyerAvailability LawyerAvailability { get; set; } = null!;
    public Appointment? Appointment { get; set; }
}
