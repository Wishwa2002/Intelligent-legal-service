using Microsoft.Extensions.Configuration;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using LegalService.API.Infrastructure;
using LegalService.API.Services.Lawyers;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace LegalService.Tests;
public class RecommendationTransportTests
{
    private sealed class SafeLogger : ILogger<RecommendationService>
    {
        public List<string> Messages = [];
        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;
        public bool IsEnabled(LogLevel level) => true;
        public void Log<TState>(LogLevel level, EventId id, TState state, Exception? error, Func<TState, Exception?, string> format) => Messages.Add(format(state, error));
    }
    private sealed class Handler(HttpStatusCode status) : HttpMessageHandler
    {
        public JsonElement Payload;
        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            Assert.Equal(HttpMethod.Post, request.Method);
            Assert.Equal("/lawyer-recommendations", request.RequestUri!.AbsolutePath);
            Assert.Equal("test-key", request.Headers.GetValues("x-internal-key").Single());
            Assert.True(Guid.TryParse(request.Headers.GetValues("x-correlation-id").Single(), out _));
            Assert.Equal("application/json", request.Content!.Headers.ContentType!.MediaType);
            Payload = await request.Content.ReadFromJsonAsync<JsonElement>(cancellationToken: ct);
            return new(status) { Content = JsonContent.Create(new { detail = "untrusted upstream test-secret" }) };
        }
    }
    [Theory] [InlineData(401, 503, "internal_authentication")] [InlineData(404, 503, "route")]
    [InlineData(422, 422, "validation")] [InlineData(503, 503, "classification_unavailable")]
    public async Task DedicatedClientSendsTrustedSnapshotAndMapsFailuresWithSafeDistinctDiagnostics(int upstream, int expected, string stage)
    {
        await using var f = new Member1RecommendationTests.Fixture(); await f.Seed();
        var handler = new Handler((HttpStatusCode)upstream); var logger = new SafeLogger();
        var config = new Microsoft.Extensions.Configuration.ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string,string?> { ["Ai:BaseUrl"]="http://test.invalid/",["Ai:InternalKey"]="test-key" }).Build();
        var service = new RecommendationService(new(handler), config, f.Db, f.Booking.Object, logger);
        var error = await Assert.ThrowsAsync<ApiException>(() => service.RecommendAsync(new() { ClientId = 42, Requirement="issue with land document", Date=f.Availability.Date, Limit=5 }, 7, default));
        Assert.Equal(expected, error.Status);
        Assert.Equal("2030-01-07",handler.Payload.GetProperty("date").GetString());
        Assert.Equal(5,handler.Payload.GetProperty("limit").GetInt32());
        Assert.NotEmpty(handler.Payload.GetProperty("specializations").EnumerateArray());
        Assert.True(handler.Payload.TryGetProperty("services",out _));
        Assert.Single(handler.Payload.GetProperty("candidates").EnumerateArray());
        var logs=string.Join('\n',logger.Messages);
        Assert.Contains($"Status={upstream}", logs); Assert.Contains($"Stage={stage}", logs);
        Assert.DoesNotContain("test-key",logs); Assert.DoesNotContain("test-secret",logs); Assert.DoesNotContain("issue with land document",logs);
        Assert.DoesNotContain("test-secret",error.Message); Assert.DoesNotContain("401",error.Message);
        Assert.Equal("FAILED", (await f.Db.LawyerRecommendationWorkflows.SingleAsync(w=>w.WorkflowId!=f.Workflow.WorkflowId)).Status);
        Assert.Empty(f.Db.Appointments); f.Booking.VerifyNoOtherCalls();
    }
}
