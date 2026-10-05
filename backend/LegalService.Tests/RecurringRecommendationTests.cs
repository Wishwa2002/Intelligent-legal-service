using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using LegalService.API.Services.Lawyers;
using Microsoft.Extensions.Configuration;
namespace LegalService.Tests;
public sealed class RecurringRecommendationTests
{
    private sealed class Matcher(Guid id, DateOnly? interpretedDate = null) : HttpMessageHandler
    {
        public JsonElement Snapshot;
        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct) {
            Snapshot = await request.Content!.ReadFromJsonAsync<JsonElement>(cancellationToken: ct);
            var date = Snapshot.GetProperty("date").ValueKind == JsonValueKind.Null ? interpretedDate : DateOnly.Parse(Snapshot.GetProperty("date").GetString()!);
            var eligible = Snapshot.GetProperty("candidates").EnumerateArray().Any(c => c.GetProperty("lawyerId").GetGuid() == id && (date is null || c.GetProperty("availableDates").EnumerateArray().Any(d => d.GetString() == date.Value.ToString("yyyy-MM-dd"))));
            return new(HttpStatusCode.OK) { Content = JsonContent.Create(new RecommendationResponse(eligible ? [new(id, 0, "System match")] : [], [], [], new("Land ownership dispute", 1, "Property", null, interpretedDate?.ToString("yyyy-MM-dd"), []), date)) };
        }
    }
    [Theory] [InlineData("working", true)] [InlineData("leave", false)] [InlineData("booked", false)] [InlineData("off", false)] [InlineData("no-date", true)]
    public async Task RecommendationDateGateUsesDerivedAvailabilityAndNoDateMakesNoClaim(string scenario, bool expected)
    {
        await using var f = new RecurringSchedulingTests.Fixture(); await f.Seed();
        if (scenario == "leave") await f.Schedules.SaveLeaveAsync(f.Id, null, new() { StartDateTime = f.Date.ToDateTime(TimeOnly.MinValue), EndDateTime = f.Date.AddDays(1).ToDateTime(TimeOnly.MinValue), IsFullDay = true, Reason = "Annual Leave" });
        if (scenario == "booked") await f.Occupy(start: new(9, 0), end: new(12, 0));
        var handler = new Matcher(f.Id); var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?> { ["Ai:BaseUrl"] = "http://test.invalid/", ["Ai:InternalKey"] = "fixture-only" }).Build();
        var service = new RecommendationService(new(handler), config, f.Db, f.Booking(), scheduling: f.Availability);
        var result = await service.RecommendAsync(new() { ClientId = 42, Requirement = "Land ownership dispute", Date = scenario == "no-date" ? null : scenario == "off" ? f.Date.AddDays(1) : f.Date }, 1, default);
        Assert.Equal(expected ? 1 : 0, result.Recommendations.Count);
        Assert.DoesNotContain("workingSchedule", handler.Snapshot.GetRawText()); Assert.DoesNotContain("Annual Leave", handler.Snapshot.GetRawText());
        if (scenario == "no-date") { Assert.Null(result.Date); Assert.Contains("Availability Not Filtered", Assert.Single(result.Recommendations).Reason); }
        else if (expected) Assert.Contains("Availability verified for requested date", Assert.Single(result.Recommendations).Reason);
    }
    [Theory] [InlineData(false)] [InlineData(true)]
    public async Task TextInferredDateBeyondSnapshotUsesActualWorkingDayCapacity(bool booked)
    {
        await using var f = new RecurringSchedulingTests.Fixture(); await f.Seed(); var date = f.Date.AddDays(735);
        if (booked) await f.Occupy(date: date, start: new(9, 0), end: new(12, 0));
        var handler = new Matcher(f.Id, date);
        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?> { ["Ai:BaseUrl"] = "http://test.invalid/", ["Ai:InternalKey"] = "fixture-only" }).Build();
        var result = await new RecommendationService(new(handler), config, f.Db, f.Booking(), scheduling: f.Availability).RecommendAsync(new() { ClientId = 42, Requirement = $"Land ownership dispute on {date:yyyy-MM-dd}" }, 1, default);
        Assert.Equal(date, result.Date); Assert.Equal(booked ? 0 : 1, result.Recommendations.Count);
    }

}
