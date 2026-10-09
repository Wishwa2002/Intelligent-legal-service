using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using LegalService.API.Data;
using LegalService.API.DTOs.Requests;
using LegalService.API.DTOs.Workforce;
using LegalService.API.Infrastructure;
using LegalService.API.Interfaces;
using LegalService.API.Models.Entities;
using LegalService.API.Services;
using LegalService.API.Services.Workforce;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Options;
using Moq;

namespace LegalService.Tests;
public sealed class WorkforceHiringTests
{
    internal sealed class FixedClock : TimeProvider { public DateTimeOffset Now = new(2026, 10, 4, 8, 0, 0, TimeSpan.Zero); public override DateTimeOffset GetUtcNow() => Now; }
    internal sealed class DraftHandler(object? result = null) : HttpMessageHandler
    {
        public int Calls; public JsonElement Payload;
        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            Calls++; Assert.Equal("test-only", request.Headers.GetValues("X-Internal-Key").Single());
            Payload = await request.Content!.ReadFromJsonAsync<JsonElement>(cancellationToken: ct);
            return new(HttpStatusCode.OK) { Content = JsonContent.Create(result ?? Draft()) };
        }
    }
    internal static HiringDraft Draft() => new() { SuggestedTitle = "Recorded Area Associate", OperationalReason = "Recorded demand exceeds future capacity.",
        Summary = "Support legal matters in the recorded area.", Responsibilities = ["Assist with matters in the recorded practice."], FocusAreas = ["Recorded Area"] };
    internal sealed class Fixture : IAsyncDisposable
    {
        public ApplicationDbContext Db;
        public FixedClock Clock = new(); public DraftHandler Handler;
        public Mock<ICareerService> Careers = new(MockBehavior.Strict);
        public WorkforceAnalysisService Analysis;
        public Fixture(DbContextOptions<ApplicationDbContext>? options = null, object? response = null)
        {
            Db = new(options ?? new DbContextOptionsBuilder<ApplicationDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
            Handler = new(response); Analysis = new(Db, Options.Create(new WorkforceOptions()), Clock);
            Careers.Setup(x => x.CreateCareerAsync(It.IsAny<CreateCareerRequest>())).Returns<CreateCareerRequest>(request => new CareerService(Db).CreateCareerAsync(request));
        }
        public HiringSuggestionService Service() => new(new(Handler), new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
            { ["Ai:BaseUrl"] = "http://test.invalid/", ["Ai:InternalKey"] = "test-only" }).Build(), Db, Analysis, Careers.Object, Clock);
        public async Task Seed()
        {
            Db.Specializations.AddRange(new Specialization { SpecializationId = 70, Name = "Recorded Area" }, new Specialization { SpecializationId = 71, Name = "Other Area" });
            var active = new Lawyer { LawyerId = Guid.NewGuid(), Name = "Active", LicenseNumber = "WF-A", Status = "Active", LawyerSpecializations = [new() { SpecializationId = 70 }] };
            var inactive = new Lawyer { LawyerId = Guid.NewGuid(), Name = "Inactive", LicenseNumber = "WF-I", Status = "Inactive", LawyerSpecializations = [new() { SpecializationId = 70 }] };
            var ambiguous = new Lawyer { LawyerId = Guid.NewGuid(), Name = "Ambiguous", LicenseNumber = "WF-M", Status = "Active", LawyerSpecializations = [new() { SpecializationId = 70 }, new() { SpecializationId = 71 }] };
            Db.Lawyers.AddRange(active, inactive, ambiguous);
            Db.LegalServices.AddRange(new API.Models.Entities.LegalService { LegalServiceId = 70, Category = "Recorded Area", ServiceName = "Recorded service" }, new API.Models.Entities.LegalService { LegalServiceId = 71, Category = "Other Area", ServiceName = "Legacy unrelated" });
            Db.LawyerLegalServices.Add(new() { LawyerId = active.LawyerId, LegalServiceId = 71 });
            void Availability(Lawyer lawyer, int days, bool booked = false, bool invalid = false)
            {
                Db.LawyerAvailabilities.Add(new() { AvailabilityId = Guid.NewGuid(), LawyerId = lawyer.LawyerId, Date = DateOnly.FromDateTime(Clock.Now.UtcDateTime.AddDays(days)),
                    StartTime = new(9, 0), EndTime = new(10, 0), AvailabilitySlots = [new() { SlotId = Guid.NewGuid(), StartTime = new(9, 0), EndTime = invalid ? new(8, 0) : new(10, 0), IsBooked = booked }] });
            }
            Db.LawyerWorkingSchedules.Add(new() { LawyerId = active.LawyerId, DayOfWeek = DayOfWeek.Monday, IsWorkingDay = true, StartTime = new(9, 0), EndTime = new(10, 0) });
            Availability(active, 1); Availability(active, 2); Availability(active, -1); Availability(active, 31); Availability(active, 1, true); Availability(active, 1, invalid: true); Availability(inactive, 1); Availability(ambiguous, 1);
            for (var i = 0; i < 7; i++) Db.LawyerRecommendationWorkflows.Add(new() { WorkflowId = Guid.NewGuid(), OwnerUserId = 1, CategoryId = 70, Status = "NO_MATCH", CreatedAt = Clock.Now.UtcDateTime.AddDays(-i) });
            foreach (var state in new[] { "FAILED", "RECEIVED", "UNSUPPORTED" }) Db.LawyerRecommendationWorkflows.Add(new() { WorkflowId = Guid.NewGuid(), CategoryId = 70, Status = state, CreatedAt = Clock.Now.UtcDateTime });
            Db.LawyerRecommendationWorkflows.Add(new() { WorkflowId = Guid.NewGuid(), CategoryId = 70, Status = "AWAITING_APPROVAL", CreatedAt = Clock.Now.UtcDateTime.AddDays(-31) });
            await Db.SaveChangesAsync();
        }
        public ApproveHiringRequest Approval() => new() { Draft = Draft(), JobTitle = "Reviewed Area Associate", Description = "Reviewed responsibilities approved by the Admin.", ReviewedExistingCareers = true };
        public ValueTask DisposeAsync() => Db.DisposeAsync();
    }

    [Fact] public async Task AnalysisUsesRealAreasSingleMembershipAndValidBoundedCapacityNotLegacyLinks()
    {
        await using var f = new Fixture(); await f.Seed(); var report = await f.Analysis.AnalyzeAsync();
        Assert.Equal(2, report.PracticeAreas.Length);
        var area = report.PracticeAreas.Single(x => x.PracticeAreaId == 70);
        Assert.Equal(1, area.ActiveLawyerCount); Assert.Equal(1, area.LegalServiceCount); Assert.Equal(7, area.RecentDemandCount);
        Assert.Equal(10, area.FutureAvailableSlotCount); Assert.Equal("HEALTHY", area.Status);
        Assert.Equal("NO_ACTIVE_LAWYERS", report.PracticeAreas.Single(x => x.PracticeAreaId == 71).Status);
    }
    [Fact] public async Task AppointmentDemandUsesPersistedCreationWindowAndExcludesCancelledRejectedAndAmbiguousMembership()
    {
        await using var f = new Fixture(); await f.Seed();
        var active = await f.Db.Lawyers.SingleAsync(x => x.Name == "Active");
        var inactive = await f.Db.Lawyers.SingleAsync(x => x.Name == "Inactive");
        var ambiguous = await f.Db.Lawyers.SingleAsync(x => x.Name == "Ambiguous");
        foreach (var entry in new[] { (active, "Confirmed", -1), (inactive, "Completed", -2), (active, "Cancelled", -1), (active, "Rejected", -1), (active, "Requested", -31), (active, "Requested", 1), (ambiguous, "Confirmed", -1) })
            f.Db.Appointments.Add(new() { AppointmentId = Guid.NewGuid(), LawyerId = entry.Item1.LawyerId, Status = entry.Item2, CreatedAt = f.Clock.Now.UtcDateTime.AddDays(entry.Item3) });
        await f.Db.SaveChangesAsync();
        Assert.Equal(2, (await f.Analysis.AnalyzeAsync()).PracticeAreas.Single(x => x.PracticeAreaId == 70).RecentAppointmentCount);
    }

    [Theory]
    [InlineData(0, 0, 0, 0, "NO_ACTIVE_LAWYERS")]
    [InlineData(1, 0, 0, 0, "WATCH")]
    [InlineData(1, 5, 0, 4, "CAPACITY_CONCERN")]
    [InlineData(1, 6, 0, 8, "WATCH")]
    [InlineData(1, 4, 0, 20, "HEALTHY")]
    [InlineData(1, 3, 3, 4, "HEALTHY")]
    [InlineData(1, 0, 7, 2, "CAPACITY_CONCERN")]
    public void ThresholdsAreDeterministicAndDoNotDoubleCountDemand(int active, int requests, int appointments, int slots, string expected)
        => Assert.Equal(expected, WorkforceAnalysisService.Assess(active, requests, appointments, slots, 0, new()).Status);

    [Fact] public async Task GenerationPersistsRestoresAndNeverCallsCareersBeforeApproval()
    {
        await using var f = new Fixture(); await f.Seed(); var service = f.Service();
        var result = await service.GenerateAsync(new() { PracticeAreaId = 70 }, 1, default);
        Assert.Equal("AWAITING_APPROVAL", result.Status); Assert.Empty(f.Db.Careers);
        Assert.False(f.Handler.Payload.TryGetProperty("lawyerId", out _)); Assert.False(f.Handler.Payload.TryGetProperty("customer", out _));
        Assert.Equal(7, f.Handler.Payload.GetProperty("recentDemandCount").GetInt32());
        var restored = await service.GetAsync(result.WorkflowId, 1, default); Assert.Equal(result.WorkflowId, restored.WorkflowId);
        var repeated = await service.GenerateAsync(new() { PracticeAreaId = 70 }, 1, default); Assert.Equal(result.WorkflowId, repeated.WorkflowId); Assert.Equal(1, f.Handler.Calls);
        var edit = Draft(); edit.Summary = "Admin edited summary that persists.";
        await service.SaveDraftAsync(result.WorkflowId, edit, 1, default);
        Assert.Equal(edit.Summary, (await service.GetAsync(result.WorkflowId, 1, default)).Draft.Summary);
        f.Careers.Verify(x => x.CreateCareerAsync(It.IsAny<CreateCareerRequest>()), Times.Never);
    }
    [Fact] public async Task ApprovalUsesExistingCareerServiceExactlyOnceAndRestoresCompletion()
    {
        await using var f = new Fixture(); await f.Seed(); var service = f.Service();
        var workflow = await service.GenerateAsync(new() { PracticeAreaId = 70 }, 1, default);
        var approved = await service.ApproveAsync(workflow.WorkflowId, f.Approval(), 1, default);
        Assert.Equal("CAREER_OPENING_CREATED", approved.Status); Assert.NotNull(approved.CareerOpeningId);
        var career = Assert.Single(await new CareerService(f.Db).GetAllCareersAsync()); Assert.Equal(approved.CareerOpeningId, career.CareerId); Assert.Equal(70, career.PracticeAreaId);
        Assert.Equal(approved.CareerOpeningId, (await service.GetAsync(workflow.WorkflowId, 1, default)).CareerOpeningId);
        var edited = await new CareerService(f.Db).UpdateCareerAsync(career.CareerId, new() { JobTitle = "Updated in existing Careers", Description = "Updated normal manual description." });
        Assert.Equal(70, edited!.PracticeAreaId); // Existing dashboard edits preserve the optional area association.
        Assert.Equal(409, (await Assert.ThrowsAsync<ApiException>(() => service.ApproveAsync(workflow.WorkflowId, f.Approval(), 1, default))).Status);
        f.Careers.Verify(x => x.CreateCareerAsync(It.IsAny<CreateCareerRequest>()), Times.Once);
    }
    [Theory] [InlineData("stale", 409)] [InlineData("changed", 409)] [InlineData("recruitment", 409)] [InlineData("owner", 404)] [InlineData("dismissed", 409)] [InlineData("invalid", 400)] [InlineData("unmapped", 400)] [InlineData("deleted", 409)]
    public async Task ApprovalRevalidatesAndRejectsUnsafeSelections(string scenario, int expected)
    {
        await using var f = new Fixture(); await f.Seed(); var service = f.Service();
        var workflow = await service.GenerateAsync(new() { PracticeAreaId = 70 }, 1, default); var request = f.Approval();
        if (scenario == "stale") f.Clock.Now = f.Clock.Now.AddHours(25);
        if (scenario == "changed") (await f.Db.Lawyers.SingleAsync(x => x.Name == "Active")).Status = "Inactive";
        if (scenario == "recruitment") f.Db.Careers.Add(new() { JobTitle = "Existing", Description = "Recorded", PracticeAreaId = 70 });
        if (scenario == "dismissed") await service.DismissAsync(workflow.WorkflowId, 1, default);
        if (scenario == "invalid") request.JobTitle = " ";
        if (scenario == "unmapped") { f.Db.Careers.Add(new() { JobTitle = "Unlinked", Description = "Recorded" }); request.ReviewedExistingCareers = false; }
        if (scenario == "deleted") f.Db.Specializations.Remove(await f.Db.Specializations.SingleAsync(x => x.SpecializationId == 70));
        await f.Db.SaveChangesAsync();
        Assert.Equal(expected, (await Assert.ThrowsAsync<ApiException>(() => service.ApproveAsync(workflow.WorkflowId, request, scenario == "owner" ? 2 : 1, default))).Status);
        f.Careers.Verify(x => x.CreateCareerAsync(It.IsAny<CreateCareerRequest>()), Times.Never);
    }
    [Fact] public async Task ExistingLinkedRecruitmentBlocksGenerationAndReportsOpening()
    {
        await using var f = new Fixture(); await f.Seed(); f.Db.Careers.Add(new() { JobTitle = "Existing associate", Description = "Recorded", PracticeAreaId = 70 }); await f.Db.SaveChangesAsync();
        var area = (await f.Analysis.AnalyzeAsync()).PracticeAreas.Single(x => x.PracticeAreaId == 70);
        Assert.Equal(1, area.OpenCareerOpeningCount); Assert.Contains("RECRUITMENT_ALREADY_ACTIVE", area.Reasons);
        Assert.Equal(409, (await Assert.ThrowsAsync<ApiException>(() => f.Service().GenerateAsync(new() { PracticeAreaId = 70 }, 1, default))).Status); Assert.Equal(0, f.Handler.Calls);
    }
    [Theory] [InlineData("extra")] [InlineData("prose")] [InlineData("focus")] [InlineData("blank")]
    public async Task InvalidAiDraftIsNeverPersisted(string scenario)
    {
        object draft = scenario == "extra" ? new { suggestedTitle = "Role", operationalReason = "Recorded", summary = "Recorded", responsibilities = new[] { "Assist" }, focusAreas = new[] { "Recorded Area" }, salary = "invented" } : Draft();
        if (draft is HiringDraft d) { if (scenario == "prose") d.Summary = "Salary and benefits are provided."; if (scenario == "focus") d.FocusAreas = ["Invented Area"]; if (scenario == "blank") d.Responsibilities = [" "]; }
        await using var f = new Fixture(response: draft); await f.Seed();
        Assert.Equal(422, (await Assert.ThrowsAsync<ApiException>(() => f.Service().GenerateAsync(new() { PracticeAreaId = 70 }, 1, default))).Status);
        Assert.Empty(f.Db.HiringSuggestionWorkflows); Assert.Empty(f.Db.Careers);
    }
}
