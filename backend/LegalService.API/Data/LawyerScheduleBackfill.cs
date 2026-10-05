using Microsoft.EntityFrameworkCore;

namespace LegalService.API.Data;

/// <summary>Persist defaults only for lawyers with no schedule; never repair partial/custom schedules.</summary>
public static class LawyerScheduleBackfill
{
    // Also used by the data migration. Keep this SQL immutable after deployment.
    public const string LockSql = """
        DO $$ BEGIN
          PERFORM "LawyerId" FROM "Lawyers" ORDER BY "LawyerId" FOR UPDATE;
        END $$;
        """;
    public const string DurationSql = """
        UPDATE "Lawyers" SET "DefaultAppointmentDurationMinutes" = 30
        WHERE "DefaultAppointmentDurationMinutes" IS NULL OR "DefaultAppointmentDurationMinutes" = 0;
        """;
    public const string ScheduleSql = """
        INSERT INTO "LawyerWorkingSchedules"
          ("Id", "LawyerId", "DayOfWeek", "StartTime", "EndTime", "IsWorkingDay", "CreatedAt")
        SELECT md5(l."LawyerId"::text || ':default-weekly:' || d.day)::uuid,
          l."LawyerId", d.day, TIME '09:00', TIME '17:00', d.day BETWEEN 1 AND 5, NOW()
        FROM "Lawyers" l CROSS JOIN generate_series(0, 6) AS d(day)
        WHERE NOT EXISTS (SELECT 1 FROM "LawyerWorkingSchedules" s WHERE s."LawyerId" = l."LawyerId")
        ON CONFLICT ("LawyerId", "DayOfWeek") DO NOTHING;
        """;

    public static async Task<(int Lawyers, int Durations)> RunAsync(ApplicationDbContext db, CancellationToken ct = default)
    {
        // Shared lawyer locks serialize this backfill with schedule editing/booking and other backfills.
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        await db.Database.ExecuteSqlRawAsync(LockSql, ct);
        var durations = await db.Database.ExecuteSqlRawAsync(DurationSql, ct);
        var rows = await db.Database.ExecuteSqlRawAsync(ScheduleSql, ct);
        await transaction.CommitAsync(ct);
        return (rows / 7, durations);
    }
}
