using System;
using System.Collections.Generic;

namespace LegalService.API.Models.Entities;

public class LawyerAvailability
{
    public Guid AvailabilityId { get; set; }
    public Guid LawyerId { get; set; }
    public DateOnly Date { get; set; }
    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }

    // Navigation properties
    public Lawyer Lawyer { get; set; } = null!;
    public ICollection<AvailabilitySlot> AvailabilitySlots { get; set; } = new List<AvailabilitySlot>();
}
