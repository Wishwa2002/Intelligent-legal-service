using LegalService.API.DTOs.Requests;
using LegalService.API.DTOs.Workforce;
using LegalService.API.Infrastructure;
using LegalService.API.Services.Workforce;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using Moq;
namespace LegalService.Tests;
public sealed class WorkforcePlanningTests
{
    private static WorkforceSettingsService Settings(WorkforceHiringTests.Fixture f) => new(f.Db, Options.Create(new WorkforceOptions()), f.Clock);
    private static WorkforceSettingRequest Values(int minimum = 4, int target = 6, int slots = 12, int demand = 10, double ratio = .75) =>
        new() { MinimumActiveLawyers = minimum, TargetActiveLawyers = target, MinimumFutureSlots = slots, HighDemandThreshold = demand, WatchCapacityRatio = ratio };
    private static WorkforceDemoService Demo(WorkforceHiringTests.Fixture f, string environment = "Development")
    { var env = new Mock<IHostEnvironment>(); env.SetupGet(x => x.EnvironmentName).Returns(environment); return new(f.Db, Settings(f), f.Careers.Object, env.Object, f.Clock); }
    [Fact] public async Task DefaultsCustomAndResetPreserveUnconfiguredAnalysis()
    {
        await using var f = new WorkforceHiringTests.Fixture(); await f.Seed(); var service = Settings(f);
        var defaults = await service.GetAsync(70); Assert.Equal("DEFAULT", defaults.Source); Assert.Equal(0, defaults.MinimumActiveLawyers); Assert.Equal(5, defaults.HighDemandThreshold); Assert.Equal(.75, defaults.WatchCapacityRatio);
        var saved = await service.SaveAsync(70, Values(), 9); Assert.Equal("CUSTOM", saved.Source); Assert.Equal(9, saved.UpdatedBy); Assert.Equal(f.Clock.Now.UtcDateTime, saved.UpdatedAt);
        Assert.Equal(4, (await f.Analysis.AnalyzeAsync()).PracticeAreas.Single(x => x.PracticeAreaId == 70).PlanningRules!.MinimumActiveLawyers);
        Assert.Equal("DEFAULT", (await service.GetAsync(71)).Source);
        await service.SaveAsync(70, Values(5, 7), 9); Assert.Single(f.Db.PracticeAreaWorkforceSettings);
        Assert.Equal("DEFAULT", (await service.ResetAsync(70)).Source); Assert.Empty(f.Db.PracticeAreaWorkforceSettings);
        Assert.Equal("HEALTHY", (await f.Analysis.AnalyzeAsync()).PracticeAreas.Single(x => x.PracticeAreaId == 70).Status);
    }
    [Theory] [InlineData(-1, 6, 12, 10, .75)] [InlineData(4, 3, 12, 10, .75)] [InlineData(4, 6, -1, 10, .75)] [InlineData(4, 6, 12, -1, .75)] [InlineData(4, 6, 12, 10, 0)] [InlineData(4, 6, 12, 10, 1.01)] [InlineData(101, 200, 12, 10, .75)]
    public async Task InvalidSettingsRejectedByBackend(int min, int target, int slots, int demand, double ratio)
    {
        await using var f = new WorkforceHiringTests.Fixture(); await f.Seed();
        Assert.Equal(400, (await Assert.ThrowsAsync<ApiException>(() => Settings(f).SaveAsync(70, Values(min, target, slots, demand, ratio), 1))).Status); Assert.Empty(f.Db.PracticeAreaWorkforceSettings);
    }
    [Theory] [InlineData(0, 0, 30, "NO_ACTIVE_LAWYERS", "NO_ACTIVE_LAWYERS")] [InlineData(3, 0, 30, "CAPACITY_CONCERN", "BELOW_MINIMUM_LAWYERS")]
    [InlineData(4, 0, 30, "HEALTHY", "BELOW_TARGET_LAWYERS")] [InlineData(4, 10, 8, "CAPACITY_CONCERN", "LOW_FUTURE_CAPACITY")]
    [InlineData(4, 0, 8, "WATCH", "LOW_FUTURE_CAPACITY")] [InlineData(6, 10, 13, "WATCH", "DEMAND_APPROACHING_CAPACITY")]
    public void RulesExplainStaffingAndCapacityWithoutTreatingTargetsAsShortages(int active, int demand, int slots, string status, string reason)
    {
        var assessment = WorkforceAnalysisService.Assess(active, demand, 0, slots, 0, new(), new(4, 6, 12, 10, .75, "CUSTOM")); Assert.Equal(status, assessment.Status); Assert.Contains(reason, assessment.Reasons);
    }
    [Fact] public async Task VerifiedRulesSentToAiAndRuleChangesInvalidateApproval()
    {
        await using var f = new WorkforceHiringTests.Fixture(); await f.Seed(); await Settings(f).SaveAsync(70, Values(), 1);
        var service = f.Service(); var proposal = await service.GenerateAsync(new() { PracticeAreaId = 70 }, 1, default);
        Assert.Equal(4, f.Handler.Payload.GetProperty("minimumActiveLawyers").GetInt32()); Assert.Equal(6, f.Handler.Payload.GetProperty("targetActiveLawyers").GetInt32());
        Assert.Equal(12, f.Handler.Payload.GetProperty("minimumFutureSlots").GetInt32()); Assert.Equal("CUSTOM", f.Handler.Payload.GetProperty("settingsSource").GetString());
        await Settings(f).SaveAsync(70, Values(4, 7), 1);
        Assert.Equal(409, (await Assert.ThrowsAsync<ApiException>(() => service.ApproveAsync(proposal.WorkflowId, f.Approval(), 1, default))).Status); Assert.Empty(f.Db.Careers);
    }
    [Theory] [InlineData("Production")] [InlineData("Staging")]
    public async Task DemoRejectsNonDevelopment(string env)
    { await using var f = new WorkforceHiringTests.Fixture(); await f.Seed(); Assert.Equal(404, (await Assert.ThrowsAsync<ApiException>(() => Demo(f, env).ResetAsync(1))).Status); Assert.Empty(f.Db.WorkforceDemoStates); }
    [Theory] [InlineData("HEALTHY_COVERAGE", "HEALTHY")] [InlineData("RECRUITMENT_NEEDED", "CAPACITY_CONCERN")] [InlineData("NO_ACTIVE_LAWYERS", "NO_ACTIVE_LAWYERS")] [InlineData("EXISTING_RECRUITMENT", "CAPACITY_CONCERN")]
    public async Task DemoIsIsolatedRepeatableAndResetPreservesOriginalRecords(string scenario, string expected)
    {
        await using var f = new WorkforceHiringTests.Fixture(); await f.Seed(); await Settings(f).SaveAsync(70, Values(), 1);
        var originalLawyers = await f.Db.Lawyers.Select(x => new { x.LawyerId, x.Status }).ToArrayAsync(); var originalSlots = await f.Db.AvailabilitySlots.Select(x => x.SlotId).ToArrayAsync(); var requests = await f.Db.LawyerRecommendationWorkflows.CountAsync();
        var manual = await f.Careers.Object.CreateCareerAsync(new CreateCareerRequest { JobTitle = "Unrelated manual opening", Description = "Preserve this record." });
        var demo = Demo(f); var result = await demo.ApplyAsync(new() { Scenario = scenario, PracticeAreaId = 70 }, 1);
        var area = (await f.Analysis.AnalyzeAsync()).PracticeAreas.Single(x => x.PracticeAreaId == result.PracticeAreaId);
        Assert.Equal(expected, area.Status); Assert.StartsWith("[Demo] ", area.PracticeAreaName); Assert.Equal(4, area.PlanningRules!.MinimumActiveLawyers);
        if (scenario == "EXISTING_RECRUITMENT") { Assert.Single(area.Openings); Assert.Equal(409, (await Assert.ThrowsAsync<ApiException>(() => f.Service().GenerateAsync(new() { PracticeAreaId = area.PracticeAreaId }, 1, default))).Status); }
        var counts = (await f.Db.Lawyers.CountAsync(), await f.Db.AvailabilitySlots.CountAsync(), await f.Db.Careers.CountAsync(), await f.Db.Specializations.CountAsync(), await f.Db.LawyerRecommendationWorkflows.CountAsync());
        await demo.ApplyAsync(new() { Scenario = scenario, PracticeAreaId = 70 }, 1);
        Assert.Equal(counts, (await f.Db.Lawyers.CountAsync(), await f.Db.AvailabilitySlots.CountAsync(), await f.Db.Careers.CountAsync(), await f.Db.Specializations.CountAsync(), await f.Db.LawyerRecommendationWorkflows.CountAsync()));
        await demo.ResetAsync(1); var baseline = await f.Analysis.AnalyzeAsync(); Assert.All(baseline.PracticeAreas.Where(x => x.PracticeAreaName.StartsWith("[Demo] ")), x => Assert.Equal("HEALTHY", x.Status));
        Assert.Equal(requests, await f.Db.LawyerRecommendationWorkflows.CountAsync()); Assert.Single(f.Db.Careers); Assert.True(await f.Db.Careers.AnyAsync(x => x.CareerId == manual.CareerId));
        foreach (var original in originalLawyers) Assert.Equal(original.Status, (await f.Db.Lawyers.FindAsync(original.LawyerId))!.Status);
        foreach (var slot in originalSlots) Assert.NotNull(await f.Db.AvailabilitySlots.FindAsync(slot));
    }
    [Fact] public async Task ResetPreservesHumanApprovedOpeningAndUsedSlots()
    {
        await using var f = new WorkforceHiringTests.Fixture(); await f.Seed(); var demo = Demo(f);
        var result = await demo.ApplyAsync(new() { Scenario = "RECRUITMENT_NEEDED", PracticeAreaId = 70 }, 1);
        // A normal human-created Career is deliberately not owned by the seed registry.
        var career = await f.Careers.Object.CreateCareerAsync(new CreateCareerRequest { JobTitle = "Admin approved role", Description = "Human-owned.", PracticeAreaId = result.PracticeAreaId });
        await demo.ResetAsync(1); Assert.NotNull(await f.Db.Careers.FindAsync(career.CareerId));
        var lawyer = await f.Db.Lawyers.FirstAsync(x => x.LicenseNumber.StartsWith("WF-DEMO/") && x.Status == "Active");
        var day = new LegalService.API.Services.Scheduling.AvailabilityService(f.Db, f.Clock);
        var date = day.Today.AddDays(1);
        while (date.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday) date = date.AddDays(1);
        var slot = (await day.GetAsync(lawyer.LawyerId, date)).AvailableSlots.First();
        var customer = new LegalService.API.Models.Entities.User { UserId = 42, Role = "Customer", Email = "test-customer@example.test", Name = "Customer" };
        f.Db.Users.Add(customer); await f.Db.SaveChangesAsync();
        var booked = await new LegalService.API.Services.AppointmentService(f.Db, Microsoft.Extensions.Logging.Abstractions.NullLogger<LegalService.API.Services.AppointmentService>.Instance, day).BookAppointmentAsync(new() { LawyerId = lawyer.LawyerId, CustomerId = Guid.Parse("00000000-0000-0000-0000-00000000002a"), SlotId = slot.SlotId });
        Assert.Equal(409, (await Assert.ThrowsAsync<ApiException>(() => demo.ResetAsync(1))).Status);
        Assert.True(await f.Db.Appointments.AnyAsync(a => a.AppointmentId == booked.AppointmentId));
    }
    [Fact] public async Task DemoRejectsUnknownScenariosBeforeMutation()
    { await using var f = new WorkforceHiringTests.Fixture(); await f.Seed(); Assert.Equal(400, (await Assert.ThrowsAsync<ApiException>(() => Demo(f).ApplyAsync(new() { Scenario = "bad" }, 1))).Status); Assert.Empty(f.Db.WorkforceDemoStates); }
}
