using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using LegalService.API.Infrastructure;
using LegalService.API.Services.Lawyers;

namespace LegalService.Tests;

public class RecommendationServiceCatalogTests
{
    private sealed class Handler(object payload) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct) =>
            Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK) { Content = JsonContent.Create(payload) });
    }
    [Theory]
    [InlineData("valid")] [InlineData("null")] [InlineData("unknown-id")] [InlineData("invented-name")]
    [InlineData("wrong-area")] [InlineData("unpaired")] [InlineData("unsupported-with-service")]
    public async Task ServiceInterpretationIsRevalidatedAgainstRealCatalog(string scenario)
    {
        await using var f = new Member1RecommendationTests.Fixture(); await f.Seed();
        f.Db.LegalServices.Add(new() { LegalServiceId = 91, ServiceName = "Title review", Category = scenario == "wrong-area" ? "Tax Law" : "Real Estate & Property Law" });
        await f.Db.SaveChangesAsync();
        var parsed = new ParsedLegalRequirement("Property title review", scenario == "unsupported-with-service" ? null : 4,
            scenario == "unsupported-with-service" ? null : "Real Estate & Property Law", null, null, [])
        {
            LegalServiceId = scenario is "null" or "unpaired" ? null : scenario == "unknown-id" ? 999 : 91,
            LegalServiceName = scenario == "null" ? null : scenario == "invented-name" ? "Invented service" : "Title review",
            MatterSummary = "Review of a property title", Supported = false
        };
        var payload = new { parsedRequirement = parsed, recommendations = new[] { new Recommendation(f.Lawyer.LawyerId, 12, "External reason") },
            warnings = Array.Empty<string>(), trace = new[] { new { step = "parse_requirement", status = "completed", chainOfThought = "HIDDEN_REASONING", candidateCount = "untrusted text" } } };
        var service = f.Service(new(new Handler(payload)));
        if (scenario is "valid" or "null")
        {
            var result = await service.RecommendAsync(new() { ClientId = 42, Requirement = "Property title review" }, 7, default);
            Assert.True(result.ParsedRequirement!.Supported);
            Assert.Equal(parsed.LegalServiceId, result.ParsedRequirement.LegalServiceId);
            Assert.Equal(12, Assert.Single(result.Recommendations).Score);
            var restored = await service.GetAsync(result.WorkflowId!.Value, 7, default);
            Assert.Equal(JsonSerializer.Serialize(result.ParsedRequirement), JsonSerializer.Serialize(restored.ParsedRequirement));
            Assert.DoesNotContain("HIDDEN_REASONING", JsonSerializer.Serialize(restored.Trace));
            Assert.DoesNotContain("untrusted text", JsonSerializer.Serialize(restored.Trace));
        }
        else
            Assert.Equal(422, (await Assert.ThrowsAsync<ApiException>(() => service.RecommendAsync(new() { ClientId = 42, Requirement = "Property title review" }, 7, default))).Status);
        Assert.Empty(f.Db.Appointments); f.Booking.VerifyNoOtherCalls();
    }
}
