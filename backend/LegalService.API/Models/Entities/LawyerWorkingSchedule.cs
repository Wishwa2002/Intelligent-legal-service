namespace LegalService.API.Models.Entities;
public class LawyerWorkingSchedule
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid LawyerId { get; set; }
    public DayOfWeek DayOfWeek { get; set; }
    public TimeOnly StartTime { get; set; } = new(9, 0);
    public TimeOnly EndTime { get; set; } = new(17, 0);
    public bool IsWorkingDay { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public Lawyer Lawyer { get; set; } = null!;
}
