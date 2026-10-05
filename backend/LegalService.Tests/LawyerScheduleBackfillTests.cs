using LegalService.API.Data;
using LegalService.API.Migrations;
using LegalService.API.Models.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql;

namespace LegalService.Tests;
public sealed class LawyerScheduleBackfillTests
{
    [Fact]
    public async Task MissingScheduleReturnsExplicitEditableDefaultsWithoutWriting()
    {
        await using var f = new RecurringSchedulingTests.Fixture(); await f.Seed();
        f.Db.LawyerWorkingSchedules.RemoveRange(f.Db.LawyerWorkingSchedules); await f.Db.SaveChangesAsync();
        var result = await f.Schedules.GetAsync(f.Id);
        Assert.False(result.HasConfiguredSchedule); Assert.Equal(7, result.Days.Count);
        Assert.Equal(5, result.Days.Count(d => d.IsWorkingDay)); Assert.Equal(30, result.AppointmentDurationMinutes);
        Assert.Empty(f.Db.LawyerWorkingSchedules);
        Assert.Empty((await f.Availability.GetAsync(f.Id, f.Date)).AvailableSlots);
        await f.Schedules.SaveAsync(f.Id, new() { Days = result.Days.ToList() });
        Assert.True((await f.Schedules.GetAsync(f.Id)).HasConfiguredSchedule);
        Assert.Equal(16, (await f.Availability.GetAsync(f.Id, f.Date)).AvailableSlots.Count);
    }

    [PostgresTheory] [InlineData(false)] [InlineData(true)]
    public async Task DataMigrationAndRepeatedBackfillPreserveCustomSchedulesAndSupportEditing(bool nullDuration)
    {
        var maintenance = new NpgsqlConnectionStringBuilder(Environment.GetEnvironmentVariable("MEMBER1_TEST_POSTGRES"));
        var name = "backfill_verify_" + Guid.NewGuid().ToString("N");
        await using var admin = new NpgsqlConnection(maintenance.ConnectionString); await admin.OpenAsync();
        await using (var create = new NpgsqlCommand($"CREATE DATABASE \"{name}\"", admin)) await create.ExecuteNonQueryAsync();
        var options = new DbContextOptionsBuilder<ApplicationDbContext>().UseNpgsql(new NpgsqlConnectionStringBuilder(maintenance.ConnectionString) { Database = name }.ConnectionString).Options;
        try
        {
            await using var f = new RecurringSchedulingTests.Fixture(options); await f.Db.Database.EnsureCreatedAsync(); await f.Seed();
            var originalId = f.Id;
            if (nullDuration) (await f.Db.LawyerWorkingSchedules.SingleAsync()).IsWorkingDay = false;
            (await f.Db.Lawyers.FindAsync(originalId))!.DefaultAppointmentDurationMinutes = 60;
            var missing = Guid.NewGuid();
            var configured = Guid.NewGuid();
            f.Db.Lawyers.AddRange(new Lawyer { LawyerId = missing, Name = "Missing", Status = "Active", LicenseNumber = "TEST-MISSING" },
                new Lawyer { LawyerId = configured, Name = "Configured duration", Status = "Active", LicenseNumber = "TEST-CONFIGURED", DefaultAppointmentDurationMinutes = 45 });
            await f.Db.SaveChangesAsync();
            var custom = await f.Db.LawyerWorkingSchedules.AsNoTracking().SingleAsync();
            // Reproduce historical unset data only in this disposable DB; production constraints stay intact.
            await f.Db.Database.ExecuteSqlRawAsync("ALTER TABLE \"Lawyers\" DROP CONSTRAINT \"CK_Lawyer_Duration\"; ALTER TABLE \"Lawyers\" ALTER COLUMN \"DefaultAppointmentDurationMinutes\" DROP NOT NULL;");
            await f.Db.Database.ExecuteSqlInterpolatedAsync($"UPDATE \"Lawyers\" SET \"DefaultAppointmentDurationMinutes\" = {(nullDuration ? (int?)null : 0)} WHERE \"LawyerId\" = {missing};");
            var generator = f.Db.GetService<IMigrationsSqlGenerator>();
            await using (var tx = await f.Db.Database.BeginTransactionAsync())
            {
                foreach (var command in generator.Generate(new BackfillMissingLawyerSchedules().UpOperations)) await f.Db.Database.ExecuteSqlRawAsync(command.CommandText);
                await tx.CommitAsync();
            }
            f.Db.ChangeTracker.Clear();
            Assert.Equal(30, (await f.Db.Lawyers.FindAsync(missing))!.DefaultAppointmentDurationMinutes);
            Assert.Equal(45, (await f.Db.Lawyers.FindAsync(configured))!.DefaultAppointmentDurationMinutes);
            Assert.Equal(60, (await f.Db.Lawyers.FindAsync(originalId))!.DefaultAppointmentDurationMinutes);
            var retained = await f.Db.LawyerWorkingSchedules.AsNoTracking().SingleAsync(s => s.LawyerId == originalId);
            Assert.Equal(custom.Id, retained.Id); Assert.Equal(custom.StartTime, retained.StartTime); Assert.Equal(custom.EndTime, retained.EndTime);
            Assert.Equal(custom.IsWorkingDay, retained.IsWorkingDay); Assert.Equal(custom.CreatedAt, retained.CreatedAt); Assert.Equal(custom.UpdatedAt, retained.UpdatedAt);
            Assert.Equal(1, await f.Db.LawyerWorkingSchedules.CountAsync(s => s.LawyerId == originalId)); // Partial schedule also preserved.
            var defaults = await f.Db.LawyerWorkingSchedules.Where(s => s.LawyerId == missing).ToListAsync();
            Assert.Equal(7, defaults.Count);
            Assert.All(defaults, d => { Assert.Equal(new TimeOnly(9, 0), d.StartTime); Assert.Equal(new TimeOnly(17, 0), d.EndTime); Assert.Equal((int)d.DayOfWeek is >= 1 and <= 5, d.IsWorkingDay); });
            Assert.Equal((0, 0), await LawyerScheduleBackfill.RunAsync(f.Db));
            Assert.Equal((0, 0), await LawyerScheduleBackfill.RunAsync(f.Db));
            Assert.Equal(15, await f.Db.LawyerWorkingSchedules.CountAsync());
            // A lawyer created after migration is caught by the same Development initialization backfill.
            var later = Guid.NewGuid();
            f.Db.Lawyers.Add(new() { LawyerId = later, Name = "Later", Status = "Inactive", LicenseNumber = "TEST-LATER" }); await f.Db.SaveChangesAsync();
            Assert.Equal((1, 0), await LawyerScheduleBackfill.RunAsync(f.Db));
            Assert.Equal((0, 0), await LawyerScheduleBackfill.RunAsync(f.Db));
            Assert.Equal(7, await f.Db.LawyerWorkingSchedules.CountAsync(s => s.LawyerId == later));
            f.Id = missing;
            Assert.Equal(16, (await f.Availability.GetAsync(missing, f.Date)).AvailableSlots.Count);
            var schedule = await f.Schedules.GetAsync(missing);
            var edited = schedule.Days.Select(d => d.DayOfWeek == DayOfWeek.Monday ? d with { EndTime = new(16, 0) } : d).ToList();
            await f.Schedules.SaveAsync(missing, new() { Days = edited });
            Assert.Equal(new TimeOnly(16, 0), (await f.Schedules.GetAsync(missing)).Days.Single(d => d.DayOfWeek == DayOfWeek.Monday).EndTime);
            Assert.Equal(7, await f.Db.LawyerWorkingSchedules.CountAsync(s => s.LawyerId == missing));
            await f.Occupy(start: new(9, 0), end: new(9, 30));
            var leave = await f.Schedules.SaveLeaveAsync(missing, null, new() { StartDateTime = f.Date.ToDateTime(new(13, 0)), EndDateTime = f.Date.ToDateTime(new(14, 0)), Reason = "Training" });
            Assert.Equal(11, (await f.Availability.GetAsync(missing, f.Date)).AvailableSlots.Count);
            await f.Schedules.DeleteLeaveAsync(missing, leave.Id);
            Assert.Equal(13, (await f.Availability.GetAsync(missing, f.Date)).AvailableSlots.Count);
        }
        finally { await using var drop = new NpgsqlCommand($"DROP DATABASE \"{name}\" WITH (FORCE)", admin); await drop.ExecuteNonQueryAsync(); }
    }
}
