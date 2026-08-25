using System;
using System.Collections.Generic;

namespace LegalService.API.Models.Entities;

public class Lawyer
{
    public Guid LawyerId { get; set; }
    public string PhoneNumber { get; set; } = string.Empty;
    public string Qualification { get; set; } = string.Empty;
    public int Experience { get; set; }
    public string LicenseNumber { get; set; } = string.Empty;
    public string ProfileDescription { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    // Navigation properties
    public User User { get; set; } = null!;
    public ICollection<LawyerSpecialization> LawyerSpecializations { get; set; } = new List<LawyerSpecialization>();
    public ICollection<LawyerLegalService> LawyerLegalServices { get; set; } = new List<LawyerLegalService>();
    public ICollection<LawyerAvailability> LawyerAvailabilities { get; set; } = new List<LawyerAvailability>();
    public ICollection<AvailabilitySlot> AvailabilitySlots { get; set; } = new List<AvailabilitySlot>();
    public ICollection<Appointment> Appointments { get; set; } = new List<Appointment>();
}
