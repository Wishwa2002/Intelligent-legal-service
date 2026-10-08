using System.Buffers.Binary;
using System.Security.Cryptography;
using LegalService.API.Data;
using LegalService.API.DTOs.Scheduling;
using LegalService.API.Infrastructure;
using LegalService.API.Models.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
namespace LegalService.API.Services.Scheduling;

public sealed class AvailabilityService(ApplicationDbContext db, TimeProvider? clock = null, IConfiguration? config = null)
{
    private readonly TimeProvider time = clock ?? TimeProvider.System;
    public string TimeZoneId => config?["Scheduling:TimeZone"] ?? "Asia/Colombo";
    public DateTime LocalNow => DateTime.SpecifyKind(TimeZoneInfo.ConvertTime(time.GetUtcNow(), TimeZoneInfo.FindSystemTimeZoneById(TimeZoneId)).DateTime, DateTimeKind.Unspecified);
    public DateOnly Today => DateOnly.FromDateTime(LocalNow);
    public static bool Blocks(string status) => status != "Cancelled" && status != "Rejected";
    public static bool Overlaps(DateTime start, DateTime end, DateTime otherStart, DateTime otherEnd) => otherStart < end && otherEnd > start;

    // Compatible opaque IDs encode a derived interval, not a stored future slot.
    // The lawyer digest detects cross-lawyer selection; all interval facts are revalidated at booking.
    public static Guid SlotId(Guid lawyerId, DateOnly date, TimeOnly start, TimeOnly end)
    {
        var bytes = SHA256.HashData(lawyerId.ToByteArray())[..16];
        BinaryPrimitives.WriteInt32LittleEndian(bytes.AsSpan(8), date.DayNumber);
        BinaryPrimitives.WriteUInt16LittleEndian(bytes.AsSpan(12), (ushort)(start.Hour * 60 + start.Minute));
        BinaryPrimitives.WriteUInt16LittleEndian(bytes.AsSpan(14), (ushort)(end.Hour * 60 + end.Minute));
        return new Guid(bytes);
    }
    public static bool TryDecode(Guid lawyerId, Guid id, out DateOnly date, out TimeOnly start, out TimeOnly end)
    {
        date = default; start = default; end = default;
        var bytes = id.ToByteArray();
        if (!bytes.AsSpan(0, 8).SequenceEqual(SHA256.HashData(lawyerId.ToByteArray()).AsSpan(0, 8))) return false;
        var day = BinaryPrimitives.ReadInt32LittleEndian(bytes.AsSpan(8));
        var from = BinaryPrimitives.ReadUInt16LittleEndian(bytes.AsSpan(12));
        var to = BinaryPrimitives.ReadUInt16LittleEndian(bytes.AsSpan(14));
        if (day < 0 || day > DateOnly.MaxValue.DayNumber || from >= to || to >= 1440) return false;
        date = DateOnly.FromDayNumber(day); start = new(from / 60, from % 60); end = new(to / 60, to % 60); return true;
    }
    public async Task<(DateOnly Date, TimeOnly Start, TimeOnly End)> ResolveSlotAsync(Guid lawyerId, Guid id, CancellationToken ct = default)
    {
        if (TryDecode(lawyerId, id, out var date, out var start, out var end)) return (date, start, end);
        var legacy = await db.AvailabilitySlots.AsNoTracking().Where(s => s.SlotId == id && s.LawyerAvailability.LawyerId == lawyerId)
            .Select(s => new { s.LawyerAvailability.Date, s.StartTime, s.EndTime }).SingleOrDefaultAsync(ct);
        if (legacy is null) throw new ApiException(409, "Selected slot is no longer available.");
        return (legacy.Date, legacy.StartTime, legacy.EndTime);
    }
    public async Task LockLawyerAsync(Guid id, CancellationToken ct = default)
    {
        if (db.Database.IsNpgsql())
            await db.Database.ExecuteSqlInterpolatedAsync($"SELECT 1 FROM \"Lawyers\" WHERE \"LawyerId\" = {id} FOR UPDATE", ct);
    }
    public async Task<IDbContextTransaction?> BeginMutationAsync(CancellationToken ct = default) =>
        db.Database.IsRelational() && db.Database.CurrentTransaction is null ? await db.Database.BeginTransactionAsync(ct) : null;

    public async Task<AvailabilitySnapshot> LoadAsync(DateOnly from, DateOnly until, IEnumerable<Guid>? lawyerIds = null, CancellationToken ct = default)
    {
        if (until == DateOnly.MaxValue || until < from || until.DayNumber - from.DayNumber > 366) throw new ApiException(400, "Scheduling window must be between one and 367 days.");
        var ids = lawyerIds?.Distinct().ToArray();
        var lawyers = await db.Lawyers.AsNoTracking().Where(l => ids == null || ids.Contains(l.LawyerId))
            .Select(l => new LawyerFacts(l.LawyerId, l.Status, l.DefaultAppointmentDurationMinutes)).ToListAsync(ct);
        var schedules = await db.LawyerWorkingSchedules.AsNoTracking().Where(s => ids == null || ids.Contains(s.LawyerId)).ToListAsync(ct);
        var start = from.ToDateTime(TimeOnly.MinValue); var end = until.AddDays(1).ToDateTime(TimeOnly.MinValue);
        var leave = await db.LawyerUnavailabilities.AsNoTracking().Where(s => (ids == null || ids.Contains(s.LawyerId)) && s.StartDateTime < end && s.EndDateTime > start).ToListAsync(ct);
        var appointments = await db.Appointments.AsNoTracking().Where(a => (ids == null || ids.Contains(a.LawyerId)) && a.Status != "Cancelled" && a.Status != "Rejected" &&
            a.AvailabilitySlot.LawyerAvailability.Date >= from && a.AvailabilitySlot.LawyerAvailability.Date <= until)
            .Select(a => new AppointmentFacts(a.AppointmentId, a.LawyerId, a.AvailabilitySlot.LawyerAvailability.Date, a.AvailabilitySlot.StartTime, a.AvailabilitySlot.EndTime)).ToListAsync(ct);
        return new(lawyers, schedules, leave, appointments, LocalNow, TimeZoneId);
    }
    public async Task<AvailableSlotsResponse> GetAsync(Guid lawyerId, DateOnly date, CancellationToken ct = default) =>
        (await LoadAsync(date, date, [lawyerId], ct)).Day(lawyerId, date);
    public async Task<Dictionary<Guid, int>> CapacityAsync(int days, CancellationToken ct = default)
    {
        if (days is < 1 or > 366) throw new ApiException(400, "Future capacity window must be between 1 and 366 days.");
        var today = Today;
        var snapshot = await LoadAsync(today, today.AddDays(days - 1), ct: ct);
        return snapshot.Lawyers.ToDictionary(l => l.Id, l => Enumerable.Range(0, days).Sum(offset => snapshot.Day(l.Id, today.AddDays(offset)).AvailableSlots.Count));
    }
}
public record LawyerFacts(Guid Id, string Status, int Duration);
public record AppointmentFacts(Guid Id, Guid LawyerId, DateOnly Date, TimeOnly Start, TimeOnly End);
public sealed class AvailabilitySnapshot
{
    public IReadOnlyList<LawyerFacts> Lawyers { get; }
    private readonly Dictionary<Guid, LawyerFacts> lawyers;
    private readonly ILookup<Guid, LawyerWorkingSchedule> schedules;
    private readonly ILookup<Guid, LawyerUnavailability> leave;
    public IReadOnlyList<AppointmentFacts> Appointments { get; }
    private readonly ILookup<Guid, AppointmentFacts> appointments;
    private readonly DateTime now;
    private readonly string zone;
    public AvailabilitySnapshot(IReadOnlyList<LawyerFacts> lawyerRows, IEnumerable<LawyerWorkingSchedule> scheduleRows, IEnumerable<LawyerUnavailability> leaveRows, IReadOnlyList<AppointmentFacts> appointmentRows, DateTime localNow, string timeZone)
    {
        Lawyers = lawyerRows; lawyers = lawyerRows.ToDictionary(l => l.Id); schedules = scheduleRows.ToLookup(s => s.LawyerId);
        leave = leaveRows.ToLookup(l => l.LawyerId); Appointments = appointmentRows; appointments = appointmentRows.ToLookup(a => a.LawyerId); now = localNow; zone = timeZone;
    }
    public AvailableSlotsResponse Day(Guid id, DateOnly date, Guid? excludeAppointment = null)
    {
        if (!lawyers.TryGetValue(id, out var lawyer)) throw new ApiException(404, "Lawyer not found.");
        var day = schedules[id].SingleOrDefault(s => s.DayOfWeek == date.DayOfWeek);
        AvailableSlotsResponse Result(IReadOnlyList<DerivedSlot> slots, string? reason) => new(id, date, day?.IsWorkingDay == true, lawyer.Duration, slots, reason, zone);
        if (lawyer.Status != "Active") return Result([], "INACTIVE");
        if (day?.IsWorkingDay != true) return Result([], "NOT_WORKING_DAY");
        if (lawyer.Duration is < 15 or > 240 || day.StartTime >= day.EndTime) return Result([], "SCHEDULE_INCOMPLETE");
        var slots = new List<DerivedSlot>(); int potential = 0, removedByLeave = 0, removedByTime = 0;
        var cursor = date.ToDateTime(day.StartTime); var finish = date.ToDateTime(day.EndTime);
        for (; cursor.AddMinutes(lawyer.Duration) <= finish; cursor = cursor.AddMinutes(lawyer.Duration))
        {
            var end = cursor.AddMinutes(lawyer.Duration); potential++;
            if (cursor <= now) { removedByTime++; continue; }
            if (leave[id].Any(l => AvailabilityService.Overlaps(cursor, end, l.StartDateTime, l.EndDateTime))) { removedByLeave++; continue; }
            if (appointments[id].Any(a => a.Id != excludeAppointment && AvailabilityService.Overlaps(cursor, end, a.Date.ToDateTime(a.Start), a.Date.ToDateTime(a.End)))) continue;
            var startTime = TimeOnly.FromDateTime(cursor); var endTime = TimeOnly.FromDateTime(end);
            slots.Add(new(AvailabilityService.SlotId(id, date, startTime, endTime), startTime, endTime));
        }
        return Result(slots, slots.Count > 0 ? null : potential == 0 ? "NO_WORKING_TIME" : removedByTime == potential ? "PAST_TIME" : removedByLeave + removedByTime == potential ? "ON_LEAVE" : "FULLY_BOOKED");
    }
}
