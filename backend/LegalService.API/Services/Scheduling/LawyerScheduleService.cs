using LegalService.API.Data;
using LegalService.API.DTOs.Scheduling;
using LegalService.API.Infrastructure;
using LegalService.API.Models.Entities;
using Microsoft.EntityFrameworkCore;
namespace LegalService.API.Services.Scheduling;
public sealed class LawyerScheduleService(ApplicationDbContext db, AvailabilityService availability)
{
    public static void Validate(ScheduleRequest request)
    {
        if (request.AppointmentDurationMinutes is < 15 or > 240 || request.Days is null || request.Days.Count != 7 || request.Days.Select(d => d.DayOfWeek).Distinct().Count() != 7 ||
            request.Days.Any(d => (int)d.DayOfWeek is < 0 or > 6 || d.IsWorkingDay && (d.StartTime >= d.EndTime || d.StartTime.Ticks % TimeSpan.TicksPerMinute != 0 || d.EndTime.Ticks % TimeSpan.TicksPerMinute != 0)))
            throw new ApiException(400, "Use seven unique weekdays, valid working hours and an appointment duration of 15–240 minutes.");
    }
    public async Task<ScheduleResponse> GetAsync(Guid id, CancellationToken ct = default)
    {
        var lawyer = await db.Lawyers.AsNoTracking().SingleOrDefaultAsync(l => l.LawyerId == id, ct) ?? throw new ApiException(404, "Lawyer not found.");
        var rows = await db.LawyerWorkingSchedules.AsNoTracking().Where(s => s.LawyerId == id).ToListAsync(ct);
        return new(id, lawyer.DefaultAppointmentDurationMinutes == 0 ? 30 : lawyer.DefaultAppointmentDurationMinutes, Enumerable.Range(0, 7).Select(day => {
            var row = rows.SingleOrDefault(r => (int)r.DayOfWeek == day);
            return new WorkingDayDto((DayOfWeek)day, row?.IsWorkingDay ?? (rows.Count == 0 && day is >= 1 and <= 5), row?.StartTime ?? new(9, 0), row?.EndTime ?? new(17, 0));
        }).ToArray(), availability.TimeZoneId, rows.Count > 0);
    }
    public async Task<ScheduleResponse> SaveAsync(Guid id, ScheduleRequest request, CancellationToken ct = default)
    {
        Validate(request);
        await using var transaction = await availability.BeginMutationAsync(ct);
        await availability.LockLawyerAsync(id, ct);
        var lawyer = await db.Lawyers.SingleOrDefaultAsync(l => l.LawyerId == id, ct) ?? throw new ApiException(404, "Lawyer not found.");
        var future = await db.Appointments.AsNoTracking().Where(a => a.LawyerId == id && a.Status != "Cancelled" && a.Status != "Rejected" && a.AvailabilitySlot.LawyerAvailability.Date >= availability.Today)
            .Select(a => new AppointmentConflict(a.AppointmentId, a.AvailabilitySlot.LawyerAvailability.Date, a.AvailabilitySlot.StartTime, a.AvailabilitySlot.EndTime)).ToListAsync(ct);
        var conflicts = future.Where(a => { var day = request.Days.Single(d => d.DayOfWeek == a.Date.DayOfWeek); return !day.IsWorkingDay || a.StartTime < day.StartTime || a.EndTime > day.EndTime; }).ToArray();
        if (conflicts.Length > 0) throw new ApiException(409, "The schedule change conflicts with existing appointments. Resolve them first.", conflicts);
        var existing = await db.LawyerWorkingSchedules.Where(s => s.LawyerId == id).ToListAsync(ct);
        foreach (var day in request.Days)
        {
            var row = existing.SingleOrDefault(r => r.DayOfWeek == day.DayOfWeek);
            if (row is null) { row = new() { LawyerId = id, DayOfWeek = day.DayOfWeek }; db.LawyerWorkingSchedules.Add(row); }
            row.IsWorkingDay = day.IsWorkingDay; row.StartTime = day.StartTime; row.EndTime = day.EndTime; row.UpdatedAt = DateTime.UtcNow;
        }
        lawyer.DefaultAppointmentDurationMinutes = request.AppointmentDurationMinutes; lawyer.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct); if (transaction is not null) await transaction.CommitAsync(ct);
        return await GetAsync(id, ct);
    }
    public async Task<UnavailabilityResponse> SaveLeaveAsync(Guid id, Guid? leaveId, UnavailabilityRequest request, CancellationToken ct = default)
    {
        if (request.StartDateTime.Kind != DateTimeKind.Unspecified || request.EndDateTime.Kind != DateTimeKind.Unspecified || request.StartDateTime >= request.EndDateTime || string.IsNullOrWhiteSpace(request.Reason) || request.Reason.Length > 300 ||
            request.IsFullDay && (request.StartDateTime.TimeOfDay != TimeSpan.Zero || request.EndDateTime.TimeOfDay != TimeSpan.Zero))
            throw new ApiException(400, "Use office-local times with start before end. Full-day leave ends at midnight after the last day.");
        await using var transaction = await availability.BeginMutationAsync(ct); await availability.LockLawyerAsync(id, ct);
        if (!await db.Lawyers.AnyAsync(l => l.LawyerId == id, ct)) throw new ApiException(404, "Lawyer not found.");
        var from = DateOnly.FromDateTime(request.StartDateTime); var until = DateOnly.FromDateTime(request.EndDateTime);
        var appointments = await db.Appointments.AsNoTracking().Where(a => a.LawyerId == id && a.Status != "Cancelled" && a.Status != "Rejected" && a.AvailabilitySlot.LawyerAvailability.Date >= from && a.AvailabilitySlot.LawyerAvailability.Date <= until)
            .Select(a => new AppointmentConflict(a.AppointmentId, a.AvailabilitySlot.LawyerAvailability.Date, a.AvailabilitySlot.StartTime, a.AvailabilitySlot.EndTime)).ToListAsync(ct);
        var conflicts = appointments.Where(a => AvailabilityService.Overlaps(request.StartDateTime, request.EndDateTime, a.Date.ToDateTime(a.StartTime), a.Date.ToDateTime(a.EndTime))).ToArray();
        if (conflicts.Length > 0) throw new ApiException(409, $"This unavailable period conflicts with {conflicts.Length} existing appointment(s). Resolve or reschedule them first.", conflicts);
        var leave = leaveId is null ? new LawyerUnavailability { LawyerId = id } : await db.LawyerUnavailabilities.SingleOrDefaultAsync(l => l.Id == leaveId && l.LawyerId == id, ct) ?? throw new ApiException(404, "Unavailability not found.");
        leave.StartDateTime = request.StartDateTime; leave.EndDateTime = request.EndDateTime; leave.Reason = request.Reason.Trim(); leave.IsFullDay = request.IsFullDay; leave.UpdatedAt = DateTime.UtcNow;
        if (leaveId is null) db.LawyerUnavailabilities.Add(leave);
        await db.SaveChangesAsync(ct); if (transaction is not null) await transaction.CommitAsync(ct);
        return new(leave.Id, leave.StartDateTime, leave.EndDateTime, leave.Reason, leave.IsFullDay);
    }
    public async Task DeleteLeaveAsync(Guid id, Guid leaveId, CancellationToken ct = default)
    {
        await using var transaction = await availability.BeginMutationAsync(ct); await availability.LockLawyerAsync(id, ct);
        var leave = await db.LawyerUnavailabilities.SingleOrDefaultAsync(l => l.Id == leaveId && l.LawyerId == id, ct) ?? throw new ApiException(404, "Unavailability not found.");
        db.Remove(leave); await db.SaveChangesAsync(ct); if (transaction is not null) await transaction.CommitAsync(ct);
    }
}
