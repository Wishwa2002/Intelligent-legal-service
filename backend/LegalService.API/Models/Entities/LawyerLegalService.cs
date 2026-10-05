using System;

namespace LegalService.API.Models.Entities;

// Legacy compatibility only. This relationship must not determine eligibility,
// recommendation expertise, ranking points, or Member 1 service assignment.
public class LawyerLegalService
{
    public Guid LawyerId { get; set; }
    public Lawyer Lawyer { get; set; } = null!;

    public int LegalServiceId { get; set; }
    public LegalService LegalService { get; set; } = null!;
}
