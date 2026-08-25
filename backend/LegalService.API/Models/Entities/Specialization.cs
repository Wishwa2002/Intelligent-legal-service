using System.Collections.Generic;

namespace LegalService.API.Models.Entities;

public class Specialization
{
    public int SpecializationId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;

    // Navigation properties
    public ICollection<LawyerSpecialization> LawyerSpecializations { get; set; } = new List<LawyerSpecialization>();
}
