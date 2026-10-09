using System.Net;
using LegalService.API.Infrastructure;
using LegalService.API.Services.Lawyers;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;

namespace LegalService.Tests;
public sealed class LiveRecommendationTheoryAttribute : TheoryAttribute
{
    public LiveRecommendationTheoryAttribute()
    {
        if (string.IsNullOrEmpty(Environment.GetEnvironmentVariable("MEMBER1_TEST_AI_INTERNAL_KEY")))
            Skip = "Opt-in live 8002 test: supply its unchanged internal key in the test process environment.";
    }
}
public sealed class RecommendationLiveTransportTests
{
    private sealed class StatusHandler : DelegatingHandler
    {
        public int? UpstreamStatus;
        public StatusHandler() : base(new HttpClientHandler()) { }
        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            Assert.Equal("/lawyer-recommendations", request.RequestUri!.AbsolutePath);
            Assert.True(string.Equals(Environment.GetEnvironmentVariable("MEMBER1_TEST_AI_INTERNAL_KEY"), request.Headers.GetValues("x-internal-key").Single(), StringComparison.Ordinal), "Internal header missing or differs; values suppressed.");
            var response=await base.SendAsync(request,ct); UpstreamStatus=(int)response.StatusCode; return response;
        }
    }
    [LiveRecommendationTheory] [InlineData(true)]
    public async Task ActualAspNetRecommendationClientPasses8002AuthenticationAndPersistsOnlyIsolatedWorkflow(bool _)
    {
        await using var f=new Member1RecommendationTests.Fixture(); await f.Seed();
        var handler=new StatusHandler(); using var client=new HttpClient(handler) { Timeout=TimeSpan.FromSeconds(45) };
        var config=new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string,string?> {
            ["Ai:BaseUrl"]=Environment.GetEnvironmentVariable("MEMBER1_TEST_AI_URL") ?? "http://127.0.0.1:8002/",
            ["Ai:InternalKey"]=Environment.GetEnvironmentVariable("MEMBER1_TEST_AI_INTERNAL_KEY") }).Build();
        var service=new RecommendationService(client,config,f.Db,f.Booking.Object,NullLogger<RecommendationService>.Instance);
        try
        {
            var response=await service.RecommendAsync(new() { ClientId = 42, Requirement="issue with land document", Date=DateOnly.FromDateTime(DateTime.UtcNow), Limit=5 },7,default);
            Assert.Equal("Real Estate & Property Law",response.ParsedRequirement!.CategoryName);
            Assert.NotNull(response.WorkflowId);
        }
        catch(ApiException error)
        {
            Assert.Equal(503,error.Status); Assert.Equal(503,handler.UpstreamStatus);
        }
        Assert.NotNull(handler.UpstreamStatus); Assert.NotEqual(401,handler.UpstreamStatus); Assert.NotEqual(403,handler.UpstreamStatus); Assert.NotEqual(404,handler.UpstreamStatus);
        Assert.Empty(f.Db.Appointments); f.Booking.VerifyNoOtherCalls();
    }
}
