using LegalService.API.Data;
using LegalService.API.Migrations;
using LegalService.API.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.Extensions.Logging.Abstractions;
using Npgsql;
namespace LegalService.Tests;
public sealed class FrontDeskMatchingPostgresTests
{
    [PostgresTheory] [InlineData(true)]
    public async Task AdditiveMigrationPreservesOldRecordsAndNormalAppointmentLifecycle(bool _)
    {
        var maintenance = new NpgsqlConnectionStringBuilder(Environment.GetEnvironmentVariable("MEMBER1_TEST_POSTGRES"));
        var name = "frontdesk_verify_" + Guid.NewGuid().ToString("N");
        await using var admin = new NpgsqlConnection(maintenance.ConnectionString); await admin.OpenAsync();
        await using (var create = new NpgsqlCommand($"CREATE DATABASE \"{name}\"", admin)) await create.ExecuteNonQueryAsync();
        var options = new DbContextOptionsBuilder<ApplicationDbContext>().UseNpgsql(new NpgsqlConnectionStringBuilder(maintenance.ConnectionString) { Database = name }.ConnectionString).Options;
        try
        {
            await using var f = new Member1RecommendationTests.Fixture(options); await f.Db.Database.EnsureCreatedAsync(); await f.Seed();
            var booking = new AppointmentService(f.Db, NullLogger<AppointmentService>.Instance);
            var old = await booking.BookAppointmentAsync(new() { LawyerId = f.Lawyer.LawyerId, CustomerId = f.CustomerId, SlotId = f.Slot.SlotId });
            await booking.CancelAppointmentAsync(old.AppointmentId, "Preserved migration fixture");
            var migration = new AddFrontDeskMatchingIntake(); var generator = f.Db.GetService<IMigrationsSqlGenerator>();
            foreach (var command in generator.Generate(migration.DownOperations)) await f.Db.Database.ExecuteSqlRawAsync(command.CommandText);
            foreach (var command in generator.Generate(migration.UpOperations)) await f.Db.Database.ExecuteSqlRawAsync(command.CommandText);
            f.Db.ChangeTracker.Clear();
            var legacy = await f.Db.LawyerRecommendationWorkflows.SingleAsync(); Assert.Null(legacy.ClientId); Assert.Equal("MATCHES", legacy.ReviewStage);
            Assert.Equal("Cancelled", (await f.Db.Appointments.FindAsync(old.AppointmentId))!.Status); Assert.Null((await f.Db.Appointments.FindAsync(old.AppointmentId))!.AppointmentSource);
            Assert.Equal("Test Customer", (await f.Db.Users.FindAsync(42))!.Name);
            await f.Service().SaveReviewAsync(legacy.WorkflowId, new() { ClientId = 42, LawyerId = f.Lawyer.LawyerId, BookingDate = f.Availability.Date, Stage = "REVIEW" }, 7, default);
            await f.Service().SaveReviewAsync(legacy.WorkflowId, new() { ClientId = 42, LawyerId = f.Lawyer.LawyerId, SlotId = f.Slot.SlotId, BookingDate = f.Availability.Date, Stage = "APPOINTMENT" }, 7, default);
            var approved = await f.Service(booking: booking).ApproveAsync(legacy.WorkflowId, f.Selection, 7, default);
            var normal = await booking.GetAppointmentByIdAsync(approved.AppointmentId!.Value); Assert.Equal("AI_FRONT_DESK", normal!.AppointmentSource); Assert.Equal(f.CustomerId, normal.CustomerId);
            Assert.Contains(await booking.GetAllAppointmentsAsync(), x => x.AppointmentId == approved.AppointmentId);
            await booking.CancelAppointmentAsync(normal.AppointmentId, "Normal Appointment module cancellation");
            Assert.Equal("Cancelled", (await booking.GetAppointmentByIdAsync(normal.AppointmentId))!.Status); Assert.Equal(2, await f.Db.Appointments.CountAsync());
        }
        finally { await using var drop = new NpgsqlCommand($"DROP DATABASE \"{name}\" WITH (FORCE)", admin); await drop.ExecuteNonQueryAsync(); }
    }
}
