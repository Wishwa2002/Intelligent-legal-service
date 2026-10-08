using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using LegalService.API.Data;
using LegalService.API.DTOs.Appointments;
using LegalService.API.Infrastructure;
using LegalService.API.Interfaces;
using LegalService.API.Models.Entities;
using LegalService.API.Services;
using LegalService.API.Services.Lawyers;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace LegalService.Tests;

public class Member1RecommendationTests
{
    internal sealed class Fixture : IAsyncDisposable
    {
        public ApplicationDbContext Db { get; }
        public Lawyer Lawyer { get; } = new() { LawyerId = Guid.NewGuid(), Name = "Verified Practitioner", Email = "lawyer@example.test", LicenseNumber = "TEST-1", Status = "Active", DefaultAppointmentDurationMinutes = 60, Experience = 12 };
        public LawyerAvailability Availability { get; }
        public AvailabilitySlot Slot { get; } = new() { SlotId = Guid.NewGuid(), StartTime = new(9, 0), EndTime = new(10, 0) };
        public LawyerRecommendationWorkflow Workflow { get; }
        public Mock<IAppointmentService> Booking { get; } = new(MockBehavior.Strict);
        public Guid CustomerId => Guid.Parse("00000000-0000-0000-0000-00000000002a");
        public ApproveRecommendationRequest Selection => new() { LawyerId = Lawyer.LawyerId, CustomerId = CustomerId, SlotId = Slot.SlotId };
        public Fixture(DbContextOptions<ApplicationDbContext>? options = null)
        {
            Db = new(options ?? new DbContextOptionsBuilder<ApplicationDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
            Availability = new() { AvailabilityId = Guid.NewGuid(), LawyerId = Lawyer.LawyerId, Date = new(2030, 1, 7), StartTime = Slot.StartTime, EndTime = Slot.EndTime, AvailabilitySlots = [Slot] };
            Lawyer.LawyerAvailabilities.Add(Availability);
            Lawyer.LawyerSpecializations.Add(new() { SpecializationId = 4, LawyerId = Lawyer.LawyerId });
            Workflow = new() { WorkflowId = Guid.NewGuid(), ClientId = 42, SelectedLawyerId = Lawyer.LawyerId, SelectedSlotId = Slot.SlotId, ReviewStage = "APPOINTMENT", OwnerUserId = 7, Status = "AWAITING_APPROVAL", CategoryId = 4, RequestedDate = Availability.Date,
                UserRequirement = "I have a dispute about ownership of my land.",
                ParsedRequirementJson = JsonSerializer.Serialize(new ParsedLegalRequirement("Land ownership dispute", 4, "Real Estate & Property Law", null, null, [])),
                RecommendationsJson = JsonSerializer.Serialize(new[] { new Recommendation(Lawyer.LawyerId, 12, "Recorded experience") }) };
        }
        public async Task Seed()
        {
            if (!await Db.Specializations.AnyAsync(s => s.SpecializationId == 4))
                Db.Specializations.Add(new() { SpecializationId = 4, Name = "Real Estate & Property Law" });
            Db.Users.Add(new() { UserId = 42, Name = "Test Customer", Email = "customer@example.test", Role = "Customer" });
            Db.LawyerWorkingSchedules.Add(new() { LawyerId = Lawyer.LawyerId, DayOfWeek = Availability.Date.DayOfWeek, IsWorkingDay = true, StartTime = Slot.StartTime, EndTime = Slot.EndTime });
            Db.Lawyers.Add(Lawyer); Db.LawyerRecommendationWorkflows.Add(Workflow);
            await Db.SaveChangesAsync();
        }
        public RecommendationService Service(HttpClient? client = null, IAppointmentService? booking = null) => new(client ?? new(),
            new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?> { ["Ai:BaseUrl"] = "http://test.invalid/", ["Ai:InternalKey"] = "test-key" }).Build(), Db, booking ?? Booking.Object);
        public ValueTask DisposeAsync() => Db.DisposeAsync();
    }

    [Theory]
    [InlineData("completed", 409)] [InlineData("booked", 409)] [InlineData("inactive", 409)]
    [InlineData("wrong-date", 409)] [InlineData("wrong-lawyer", 409)] [InlineData("past-slot", 409)]
    [InlineData("invalid-duration", 409)] [InlineData("missing-customer", 400)] [InlineData("not-customer", 400)]
    [InlineData("missing-slot", 409)] [InlineData("not-recommended", 400)] [InlineData("ambiguous-area", 409)]
    public async Task ApprovalRevalidatesEveryBusinessConstraint(string scenario, int expectedStatus)
    {
        await using var f = new Fixture(); await f.Seed();
        var request = f.Selection;
        switch (scenario)
        {
            case "completed": f.Workflow.Status = "ACTION_COMPLETED"; break;
            case "booked": f.Slot.IsBooked = true; f.Db.Appointments.Add(new() { AppointmentId = Guid.NewGuid(), LawyerId = f.Lawyer.LawyerId, CustomerId = f.CustomerId, SlotId = f.Slot.SlotId, Status = "Confirmed" }); break;
            case "inactive": f.Lawyer.Status = "Inactive"; break;
            case "wrong-date": f.Availability.Date = f.Availability.Date.AddDays(1); break;
            case "wrong-lawyer": f.Availability.LawyerId = Guid.NewGuid(); break;
            case "past-slot": f.Workflow.RequestedDate = null; f.Availability.Date = new(2020, 1, 1); break;
            case "invalid-duration": f.Slot.EndTime = f.Slot.StartTime; break;
            case "missing-customer": f.Db.Users.Remove((await f.Db.Users.FindAsync(42))!); break;
            case "not-customer": (await f.Db.Users.FindAsync(42))!.Role = "Admin"; break;
            case "missing-slot": f.Db.AvailabilitySlots.Remove(f.Slot); break;
            case "not-recommended": request.LawyerId = Guid.NewGuid(); break;
            case "ambiguous-area": f.Db.Specializations.Add(new() { SpecializationId = 8, Name = "Tax Law" }); f.Lawyer.LawyerSpecializations.Add(new() { LawyerId = f.Lawyer.LawyerId, SpecializationId = 8 }); break;
        }
        await f.Db.SaveChangesAsync(); f.Db.ChangeTracker.Clear();
        var error = await Assert.ThrowsAsync<ApiException>(() => f.Service().ApproveAsync(f.Workflow.WorkflowId, request, 7, default));
        Assert.Equal(expectedStatus, error.Status); f.Booking.VerifyNoOtherCalls();
        Assert.Equal(scenario == "booked" ? 1 : 0, await f.Db.Appointments.CountAsync());
    }

    [Fact]
    public async Task WorkflowOwnershipAndMissingWorkflowAreEnforced()
    {
        await using var f = new Fixture(); await f.Seed();
        foreach (var (id, owner) in new[] { (f.Workflow.WorkflowId, 99), (Guid.NewGuid(), 7) })
        {
            Assert.Equal(404, (await Assert.ThrowsAsync<ApiException>(() => f.Service().GetAsync(id, owner, default))).Status);
            Assert.Equal(404, (await Assert.ThrowsAsync<ApiException>(() => f.Service().ApproveAsync(id, f.Selection, owner, default))).Status);
        }
        f.Booking.VerifyNoOtherCalls();
    }

    [Theory]
    [InlineData(true)] [InlineData(false)]
    public async Task RealBookingPersistsCompletedWorkflowAndCannotRunTwice(bool preferredDate)
    {
        await using var f = new Fixture(); await f.Seed();
        if (!preferredDate) { f.Workflow.RequestedDate = null; await f.Db.SaveChangesAsync(); }
        var booking = new AppointmentService(f.Db, NullLogger<AppointmentService>.Instance);
        var service = f.Service(booking: booking);
        var result = await service.ApproveAsync(f.Workflow.WorkflowId, f.Selection, 7, default);
        Assert.Equal("ACTION_COMPLETED", result.Status); Assert.NotNull(result.AppointmentId);
        f.Db.ChangeTracker.Clear();
        var restored = await service.GetAsync(f.Workflow.WorkflowId, 7, default);
        Assert.Equal(result.AppointmentId, restored.AppointmentId); Assert.Equal("ACTION_COMPLETED", restored.Status);
        Assert.Equal(409, (await Assert.ThrowsAsync<ApiException>(() => service.ApproveAsync(f.Workflow.WorkflowId, f.Selection, 7, default))).Status);
        Assert.Single(f.Db.Appointments); Assert.True((await f.Db.AvailabilitySlots.SingleAsync(s => s.Appointment != null)).IsBooked);
    }

    private sealed class ResponseHandler(object payload) : HttpMessageHandler
    {
        public JsonElement? Snapshot { get; private set; }
        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            Assert.Equal("test-key", request.Headers.GetValues("X-Internal-Key").Single());
            Snapshot = await request.Content!.ReadFromJsonAsync<JsonElement>(cancellationToken: ct);
            return new(HttpStatusCode.OK) { Content = JsonContent.Create(payload) };
        }
    }

    [Theory]
    [InlineData("forged-id", 409)] [InlineData("invalid-area", 422)] [InlineData("date-mismatch", 502)]
    [InlineData("duplicate-id", 502)] [InlineData("inactive", 409)]
    public async Task ExternalRecommendationCannotBypassBackendValidation(string scenario, int status)
    {
        await using var f = new Fixture(); await f.Seed();
        var id = scenario == "forged-id" ? Guid.NewGuid() : f.Lawyer.LawyerId;
        if (scenario == "inactive") { f.Lawyer.Status = "Inactive"; await f.Db.SaveChangesAsync(); }
        var recommendations = new List<Recommendation> { new(id, 90, "Untrusted external text") };
        if (scenario == "duplicate-id") recommendations.Add(recommendations[0]);
        var payload = new { recommendations, warnings = Array.Empty<string>(), trace = Array.Empty<object>(),
            date = scenario == "date-mismatch" ? new DateOnly(2030, 1, 8) : f.Availability.Date,
            parsedRequirement = new ParsedLegalRequirement("Land ownership dispute", scenario == "invalid-area" ? 999 : 4,
                "Real Estate & Property Law", null, null, []) };
        var error = await Assert.ThrowsAsync<ApiException>(() => f.Service(new(new ResponseHandler(payload))).RecommendAsync(
            new() { ClientId = 42, Requirement = f.Workflow.UserRequirement, Date = f.Availability.Date }, 7, default));
        Assert.Equal(status, error.Status);
        Assert.Single(f.Db.LawyerRecommendationWorkflows.Where(w => w.Status == "FAILED"));
        Assert.Empty(f.Db.Appointments);
    }

    [Fact]
    public async Task RecommendationSnapshotsIgnoreLegacyLinksAndDisplayOnlyVerifiedProfilesAndPoints()
    {
        await using var f = new Fixture(); await f.Seed();
        f.Db.LegalServices.Add(new() { LegalServiceId = 90, ServiceName = "Legacy unrelated", Category = "Tax Law" });
        f.Db.LawyerLegalServices.Add(new() { LawyerId = f.Lawyer.LawyerId, LegalServiceId = 90 });
        await f.Db.SaveChangesAsync();
        var handler = new ResponseHandler(new { recommendations = new[] { new Recommendation(f.Lawyer.LawyerId, 99, "Guaranteed win") { FullName = "Invented name" } },
            warnings = Array.Empty<string>(), trace = Array.Empty<object>(),
            parsedRequirement = new ParsedLegalRequirement("Land ownership dispute", 4, "Real Estate & Property Law", null, null, []) });
        var result = await f.Service(new(handler)).RecommendAsync(new() { ClientId = 42, Requirement = f.Workflow.UserRequirement }, 7, default);
        var candidate = Assert.Single(result.Recommendations);
        Assert.Equal(12, candidate.Score); Assert.Equal(f.Lawyer.Name, candidate.FullName);
        Assert.Contains("Availability Not Filtered", candidate.Reason); Assert.DoesNotContain("Guaranteed", candidate.Reason);
        Assert.False(handler.Snapshot!.Value.GetProperty("candidates")[0].TryGetProperty("legalServices", out _));
        Assert.Equal("AWAITING_APPROVAL", result.Status); Assert.Empty(f.Db.Appointments);
        var restored = await f.Service().GetAsync(result.WorkflowId!.Value, 7, default);
        Assert.Equal(candidate, Assert.Single(restored.Recommendations));
    }
}
