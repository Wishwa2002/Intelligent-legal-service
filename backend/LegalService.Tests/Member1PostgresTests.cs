using LegalService.API.Data;
using LegalService.API.Controllers;
using LegalService.API.Authentication.Services;
using Microsoft.AspNetCore.Mvc;
using Moq;
using LegalService.API.DTOs.Appointments;
using LegalService.API.Infrastructure;
using LegalService.API.Interfaces;
using LegalService.API.Models.Entities;
using LegalService.API.Services;
using LegalService.API.Services.Lawyers;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Npgsql;

namespace LegalService.Tests;

public sealed class PostgresTheoryAttribute : TheoryAttribute
{
    public PostgresTheoryAttribute()
    {
        if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("MEMBER1_TEST_POSTGRES")))
            Skip = "Set MEMBER1_TEST_POSTGRES to a local PostgreSQL maintenance database; the test creates and removes its own database.";
    }
}

public class Member1PostgresTests
{
    [PostgresTheory]
    [InlineData(null)]
    [InlineData(42)]
    public async Task DeleteLawyerSupportsOptionalAccountsAndRemovesSchedules(int? userId)
    {
        var maintenance = new NpgsqlConnectionStringBuilder(Environment.GetEnvironmentVariable("MEMBER1_TEST_POSTGRES"));
        var database = "member1_delete_" + Guid.NewGuid().ToString("N");
        await using var connection = new NpgsqlConnection(maintenance.ConnectionString);
        await connection.OpenAsync();
        await using (var create = new NpgsqlCommand($"CREATE DATABASE \"{database}\"", connection))
            await create.ExecuteNonQueryAsync();
        var options = new DbContextOptionsBuilder<ApplicationDbContext>().UseNpgsql(
            new NpgsqlConnectionStringBuilder(maintenance.ConnectionString) { Database = database }.ConnectionString).Options;
        try
        {
            await using var db = new ApplicationDbContext(options);
            await db.Database.EnsureCreatedAsync();
            var lawyerId = Guid.NewGuid();
            db.Users.Add(new User { UserId = 42, Name = "Retained account", Email = "retained@example.test",
                Role = "Lawyer", PasswordHash = "preserve-me" });
            db.Lawyers.Add(new Lawyer { LawyerId = lawyerId, UserId = userId, Name = "Directory profile",
                LicenseNumber = "DELETE-TEST", Status = "Active",
                LawyerSpecializations = [new LawyerSpecialization { Specialization = new Specialization { Name = "Property" } }],
                LawyerLegalServices = [new LawyerLegalService { LegalService = new() { ServiceName = "Consultation", Category = "Property" } }],
                LawyerAvailabilities = [new LawyerAvailability { AvailabilityId = Guid.NewGuid(), Date = new(2030, 1, 5),
                    StartTime = new(9, 0), EndTime = new(10, 0),
                    AvailabilitySlots = [new AvailabilitySlot { SlotId = Guid.NewGuid(), StartTime = new(9, 0), EndTime = new(9, 30) }] }] });
            await db.SaveChangesAsync();
            // Force materialization through the relational provider, as in a new HTTP request.
            db.ChangeTracker.Clear();
            var controller = new LawyersController(db, new AppointmentService(db, NullLogger<AppointmentService>.Instance),
                new Mock<IPasswordService>().Object);
            Assert.IsType<OkObjectResult>(await controller.DeleteLawyer(lawyerId));
            Assert.False(await db.Lawyers.AnyAsync());
            Assert.False(await db.LawyerSpecializations.AnyAsync());
            Assert.False(await db.LawyerLegalServices.AnyAsync());
            Assert.False(await db.LawyerAvailabilities.AnyAsync());
            Assert.False(await db.AvailabilitySlots.AnyAsync());
            Assert.Equal("preserve-me", (await db.Users.SingleAsync()).PasswordHash);
        }
        finally
        {
            await using var drop = new NpgsqlCommand($"DROP DATABASE \"{database}\" WITH (FORCE)", connection);
            await drop.ExecuteNonQueryAsync();
        }
    }

    private sealed class BookingGate(IAppointmentService inner, Func<Task> wait) : IAppointmentService
    {
        public async Task<AppointmentDetailsResponse> BookAppointmentAsync(BookAppointmentRequest request)
        { await wait(); return await inner.BookAppointmentAsync(request); }
        public Task<IEnumerable<AppointmentResponse>> GetAllAppointmentsAsync(Guid? lawyerId = null, Guid? customerId = null, string? status = null, DateOnly? date = null) => inner.GetAllAppointmentsAsync(lawyerId, customerId, status, date);
        public Task<AppointmentDetailsResponse?> GetAppointmentByIdAsync(Guid id) => inner.GetAppointmentByIdAsync(id);
        public Task<AppointmentDetailsResponse?> UpdateAppointmentAsync(Guid id, UpdateAppointmentRequest request) => inner.UpdateAppointmentAsync(id, request);
        public Task<bool> DeleteAppointmentAsync(Guid id) => inner.DeleteAppointmentAsync(id);
        public Task<AppointmentDetailsResponse?> ConfirmAppointmentAsync(Guid id, string? notes) => inner.ConfirmAppointmentAsync(id, notes);
        public Task<AppointmentDetailsResponse?> RejectAppointmentAsync(Guid id, string? reason) => inner.RejectAppointmentAsync(id, reason);
        public Task<AppointmentDetailsResponse?> CancelAppointmentAsync(Guid id, string? reason) => inner.CancelAppointmentAsync(id, reason);
        public Task<AppointmentDetailsResponse?> RescheduleAppointmentAsync(Guid id, Guid newSlotId, string? reason) => inner.RescheduleAppointmentAsync(id, newSlotId, reason);
        public Task<AppointmentDetailsResponse?> CompleteAppointmentAsync(Guid id, string? notes) => inner.CompleteAppointmentAsync(id, notes);
        public Task<IEnumerable<AppointmentHistoryResponse>> GetAppointmentHistoryAsync(Guid id) => inner.GetAppointmentHistoryAsync(id);
        public Task<IEnumerable<AvailabilitySlotResponse>> GetAvailableSlotsAsync(Guid lawyerId, DateOnly date) => inner.GetAvailableSlotsAsync(lawyerId, date);
        public Task<ConflictCheckResponse> CheckConflictAsync(Guid lawyerId, DateOnly date, TimeOnly start, TimeOnly end, Guid? excludeAppointmentId = null) => inner.CheckConflictAsync(lawyerId, date, start, end, excludeAppointmentId);
    }

    [PostgresTheory]
    [InlineData(false)] [InlineData(true)]
    public async Task ConcurrentApprovalsCreateOnlyOneAppointmentAndReturnConflict(bool separateWorkflows)
    {
        var maintenance = new NpgsqlConnectionStringBuilder(Environment.GetEnvironmentVariable("MEMBER1_TEST_POSTGRES"));
        var database = "member1_verify_" + Guid.NewGuid().ToString("N");
        await using var connection = new NpgsqlConnection(maintenance.ConnectionString);
        await connection.OpenAsync();
        await using (var create = new NpgsqlCommand($"CREATE DATABASE \"{database}\"", connection)) await create.ExecuteNonQueryAsync();
        var testConnection = new NpgsqlConnectionStringBuilder(maintenance.ConnectionString) { Database = database };
        var options = new DbContextOptionsBuilder<ApplicationDbContext>().UseNpgsql(testConnection.ConnectionString).Options;
        try
        {
            await using var f = new Member1RecommendationTests.Fixture(options);
            await f.Db.Database.EnsureCreatedAsync();
            await DbInitializer.SeedCategoriesAsync(f.Db);
            Assert.Equal(5, await f.Db.Specializations.CountAsync());
            Assert.False(await f.Db.Specializations.AnyAsync(s => s.Name == "Family Law"));
            await f.Seed();
            // Execute real provider queries for the public/Admin eligibility and profile contracts.
            var catalogs = new LegalCatalogController(f.Db);
            Assert.IsType<OkObjectResult>(await catalogs.GetLegalServices());
            Assert.IsType<OkObjectResult>(await catalogs.GetAdminLegalServices());
            Assert.IsType<OkObjectResult>(await catalogs.GetLegalService(1));
            var directory = new LawyersController(f.Db, new AppointmentService(f.Db, NullLogger<AppointmentService>.Instance), new Mock<IPasswordService>().Object);
            Assert.IsType<OkObjectResult>(await directory.GetLawyerById(f.Lawyer.LawyerId));
            Assert.IsType<OkObjectResult>(await directory.GetLawyers("4", null, f.Availability.Date, 1, 10, "Active"));
            Assert.IsType<OkObjectResult>(await directory.GetAvailability(f.Lawyer.LawyerId, f.Availability.Date));
            var secondId = f.Workflow.WorkflowId;
            if (separateWorkflows)
            {
                secondId = Guid.NewGuid();
                f.Db.LawyerRecommendationWorkflows.Add(new() { WorkflowId = secondId, ClientId = 42, SelectedLawyerId = f.Lawyer.LawyerId, SelectedSlotId = f.Slot.SlotId, ReviewStage = "APPOINTMENT", OwnerUserId = 7, Status = "AWAITING_APPROVAL", CategoryId = 4,
                    RequestedDate = f.Availability.Date, UserRequirement = f.Workflow.UserRequirement,
                    RecommendationsJson = f.Workflow.RecommendationsJson, ParsedRequirementJson = f.Workflow.ParsedRequirementJson });
                await f.Db.SaveChangesAsync();
            }
            var entered = 0;
            var bothEntered = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
            async Task Gate()
            {
                if (Interlocked.Increment(ref entered) == 2) bothEntered.TrySetResult();
                await bothEntered.Task.WaitAsync(TimeSpan.FromSeconds(15));
            }
            async Task<bool> Approve(Guid id)
            {
                await using var db = new ApplicationDbContext(options);
                await Gate();
                var booking = new AppointmentService(db, NullLogger<AppointmentService>.Instance);
                var service = new RecommendationService(new(), new ConfigurationBuilder().Build(), db, booking);
                try { await service.ApproveAsync(id, f.Selection, 7, default); return true; }
                catch (ApiException error) { Assert.Equal(409, error.Status); return false; }
            }
            var results = await Task.WhenAll(Approve(f.Workflow.WorkflowId), Approve(secondId));
            Assert.Single(results, success => success);
            f.Db.ChangeTracker.Clear();
            Assert.Equal(1, await f.Db.Appointments.CountAsync());
            Assert.Equal(1, await f.Db.LawyerRecommendationWorkflows.CountAsync(w => w.Status == "ACTION_COMPLETED"));
            Assert.True((await f.Db.AvailabilitySlots.SingleAsync(s => s.Appointment != null)).IsBooked);
            var restored = await f.Service().GetAsync(f.Workflow.WorkflowId, 7, default);
            if (!separateWorkflows) Assert.Equal("ACTION_COMPLETED", restored.Status);
        }
        finally
        {
            // Only the generated test database is dropped; never use the project/Neon database here.
            await using var drop = new NpgsqlCommand($"DROP DATABASE \"{database}\" WITH (FORCE)", connection);
            await drop.ExecuteNonQueryAsync();
        }
    }
}
