using System;

namespace LegalService.API.Models.Entities;

public class LawyerLegalService
{
    public Guid LawyerId { get; set; }
    public Lawyer Lawyer { get; set; } = null!;

    public int LegalServiceId { get; set; }
    public LegalService LegalService { get; set; } = null!;
}
