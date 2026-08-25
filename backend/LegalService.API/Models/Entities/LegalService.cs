using System;
using System.Collections.Generic;

namespace LegalService.API.Models.Entities;

public class LegalService
{
    public int LegalServiceId { get; set; }
    public string ServiceName { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    // Navigation properties
    public ICollection<LawyerLegalService> LawyerLegalServices { get; set; } = new List<LawyerLegalService>();
}
