namespace LegalService.API.Models.Entities;
public class LawyerUnavailability
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid LawyerId { get; set; }
    // Office-local wall times, matching DateOnly/TimeOnly appointment semantics.
    public DateTime StartDateTime { get; set; }
    public DateTime EndDateTime { get; set; }
    public string Reason { get; set; } = "";
    public bool IsFullDay { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public Lawyer Lawyer { get; set; } = null!;
}
