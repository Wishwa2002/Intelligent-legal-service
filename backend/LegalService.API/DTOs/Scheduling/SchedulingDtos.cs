using System.ComponentModel.DataAnnotations;
namespace LegalService.API.DTOs.Scheduling;
public record WorkingDayDto(DayOfWeek DayOfWeek, bool IsWorkingDay, TimeOnly StartTime, TimeOnly EndTime);
public class ScheduleRequest
{
    [Range(15, 240)] public int AppointmentDurationMinutes { get; set; } = 30;
    [Required, MinLength(7), MaxLength(7)] public List<WorkingDayDto> Days { get; set; } = [];
}
public record ScheduleResponse(Guid LawyerId, int AppointmentDurationMinutes, IReadOnlyList<WorkingDayDto> Days, string TimeZone, bool HasConfiguredSchedule = true);
public class UnavailabilityRequest
{
    public DateTime StartDateTime { get; set; }
    public DateTime EndDateTime { get; set; }
    [Required, StringLength(300)] public string Reason { get; set; } = "";
    public bool IsFullDay { get; set; }
}
public record UnavailabilityResponse(Guid Id, DateTime StartDateTime, DateTime EndDateTime, string Reason, bool IsFullDay);
public record AppointmentConflict(Guid AppointmentId, DateOnly Date, TimeOnly StartTime, TimeOnly EndTime);
public record DerivedSlot(Guid SlotId, TimeOnly Start, TimeOnly End);
public record AvailableSlotsResponse(Guid LawyerId, DateOnly Date, bool WorkingDay, int AppointmentDurationMinutes,
    IReadOnlyList<DerivedSlot> AvailableSlots, string? Reason, string TimeZone);
