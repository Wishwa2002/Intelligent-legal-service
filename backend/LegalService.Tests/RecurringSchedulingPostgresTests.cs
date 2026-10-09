using LegalService.API.Data;
using LegalService.API.Infrastructure;
using LegalService.API.Models.Entities;
using LegalService.API.Services.Scheduling;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql;
namespace LegalService.Tests;
public sealed class RecurringSchedulingPostgresTests
{
    [PostgresTheory] [InlineData("booking")] [InlineData("leave")]
    public async Task MigrationPreservesHistoryAndConcurrentMutationHasOneWinner(string competing)
    {
        var maintenance = new NpgsqlConnectionStringBuilder(Environment.GetEnvironmentVariable("MEMBER1_TEST_POSTGRES"));
        var name = "scheduling_verify_" + Guid.NewGuid().ToString("N");
        await using var admin = new NpgsqlConnection(maintenance.ConnectionString); await admin.OpenAsync();
        await using (var create = new NpgsqlCommand($"CREATE DATABASE \"{name}\"", admin)) await create.ExecuteNonQueryAsync();
        var options = new DbContextOptionsBuilder<ApplicationDbContext>().UseNpgsql(new NpgsqlConnectionStringBuilder(maintenance.ConnectionString) { Database = name }.ConnectionString).Options;
        try {
            await using var f = new RecurringSchedulingTests.Fixture(options); await f.Db.Database.EnsureCreatedAsync(); await f.Seed();
            var original = await f.Occupy("Cancelled");
            var migration = new LegalService.API.Migrations.AddRecurringLawyerScheduling();
            var sql = f.Db.GetService<IMigrationsSqlGenerator>();
            foreach (var command in sql.Generate(migration.DownOperations)) await f.Db.Database.ExecuteSqlRawAsync(command.CommandText);
            foreach (var command in sql.Generate(migration.UpOperations)) await f.Db.Database.ExecuteSqlRawAsync(command.CommandText);
            f.Db.ChangeTracker.Clear();
            Assert.True(await f.Db.Appointments.AnyAsync(a => a.AppointmentId == original.AppointmentId && a.Status == "Cancelled"));
            Assert.Equal(7, await f.Db.LawyerWorkingSchedules.CountAsync());
            var inferred = await f.Db.LawyerWorkingSchedules.SingleAsync(s => s.DayOfWeek == DayOfWeek.Monday);
            Assert.True(inferred.IsWorkingDay); Assert.Equal(new TimeOnly(10, 0), inferred.StartTime); Assert.Equal(new TimeOnly(10, 30), inferred.EndTime);
            await f.Schedules.SaveAsync(f.Id, f.Schedule());
            // SQL uniqueness protects the domain even if a caller bypasses service validation.
            f.Db.LawyerWorkingSchedules.Add(new() { LawyerId = f.Id, DayOfWeek = DayOfWeek.Monday });
            Assert.IsType<PostgresException>((await Assert.ThrowsAsync<DbUpdateException>(() => f.Db.SaveChangesAsync())).InnerException);
            f.Db.ChangeTracker.Clear();
            var entered = 0; var gate = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
            async Task<bool> Attempt(bool leave) {
                await using var concurrent = new RecurringSchedulingTests.Fixture(options) { Id = f.Id, Date = f.Date };
                if (Interlocked.Increment(ref entered) == 2) gate.TrySetResult();
                await gate.Task.WaitAsync(TimeSpan.FromSeconds(15));
                try { if (leave) await concurrent.Schedules.SaveLeaveAsync(f.Id, null, new() { StartDateTime = f.Date.ToDateTime(new(10, 0)), EndDateTime = f.Date.ToDateTime(new(10, 30)), Reason = "Court" }); else await concurrent.Booking().BookAppointmentAsync(concurrent.Request(new(10, 0), new(10, 30))); return true; }
                catch (ApiException error) { Assert.Equal(409, error.Status); return false; }
            }
            var results = await Task.WhenAll(Attempt(false), Attempt(competing == "leave")); Assert.Single(results, result => result);
            Assert.Equal(1, await f.Db.Appointments.CountAsync(a => a.Status != "Cancelled" && a.Status != "Rejected") + await f.Db.LawyerUnavailabilities.CountAsync());
            Assert.Equal(5, (await f.Availability.GetAsync(f.Id, f.Date)).AvailableSlots.Count);
        } finally { await using var drop = new NpgsqlCommand($"DROP DATABASE \"{name}\" WITH (FORCE)", admin); await drop.ExecuteNonQueryAsync(); }
    }
}
