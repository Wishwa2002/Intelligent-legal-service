using System;

namespace LegalService.API.Models.Entities;

public class LawyerSpecialization
{
    public Guid LawyerId { get; set; }
    public Lawyer Lawyer { get; set; } = null!;

    public int SpecializationId { get; set; }
    public Specialization Specialization { get; set; } = null!;
}
