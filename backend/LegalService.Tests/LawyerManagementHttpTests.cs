using LegalService.API.Services.Scheduling;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using LegalService.API.Authentication.Services;
using LegalService.API.Controllers;
using LegalService.API.Data;
using LegalService.API.DTOs.Requests;
using LegalService.API.Interfaces;
using LegalService.API.Models.Entities;
using LegalService.API.Services;
using LegalService.API.Services.Lawyers;
using LegalService.API.Infrastructure;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;

namespace LegalService.Tests;

// Real HTTP routing, JWT authentication, authorization and MVC validation with an isolated DB.
// This host never invokes production startup, database seeding or Gemini.
public sealed class LawyerManagementHttpTests : IAsyncLifetime
{
    private WebApplication _app = null!;
    private HttpClient _client = null!;
    private const string Key = "member1-test-signing-key-only-12345678901234567890";
    private readonly Guid _lawyerId = Guid.NewGuid();
    private readonly DateOnly _date = new(2030, 1, 5);
    private int _specId;
    private int _otherSpecId;
    private int _userId;

    public async Task InitializeAsync()
    {
        var builder = WebApplication.CreateBuilder();
        builder.Logging.ClearProviders();
        builder.WebHost.UseUrls("http://127.0.0.1:0");
        builder.Configuration.AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Ai:BaseUrl"] = "http://test.invalid/", ["Ai:InternalKey"] = "test-only-key",
            ["Jwt:Key"] = Key, ["Jwt:Issuer"] = "member1-tests", ["Jwt:Audience"] = "member1-tests", ["Jwt:ExpiryMinutes"] = "10"
        });
        builder.Services.AddControllers().AddApplicationPart(typeof(LawyersController).Assembly);
        var databaseName = Guid.NewGuid().ToString();
        builder.Services.AddDbContext<ApplicationDbContext>(o => o.UseInMemoryDatabase(databaseName));
        builder.Services.AddScoped<AvailabilityService>();
        builder.Services.AddScoped<LawyerScheduleService>();
        builder.Services.AddScoped<IAppointmentService, AppointmentService>();
        builder.Services.AddScoped<ICareerService, CareerService>();
        builder.Services.AddSingleton(TimeProvider.System);
        builder.Services.Configure<LegalService.API.Services.Workforce.WorkforceOptions>(_ => { });
        builder.Services.AddScoped<LegalService.API.Services.Workforce.WorkforceAnalysisService>();
        builder.Services.AddScoped<LegalService.API.Services.Workforce.WorkforceSettingsService>();
        builder.Services.AddHttpClient<LegalService.API.Services.Workforce.HiringSuggestionService>()
            .ConfigurePrimaryHttpMessageHandler(() => new WorkforceHttpDraft());
        builder.Services.AddScoped<IPasswordService, PasswordService>();
        builder.Services.AddScoped<JwtService>();
        builder.Services.AddExceptionHandler<ApiExceptionHandler>();
        builder.Services.AddProblemDetails();
        builder.Services.AddHttpClient<ILawyerRecommendationService, RecommendationService>()
            .ConfigurePrimaryHttpMessageHandler(() => new TestMatcher(request => new RecommendationResponse(
                [new Recommendation(_lawyerId, 25, "External interpretation fixture")], [], [],
                new ParsedLegalRequirement(request.Requirement, _specId, "Property", null, null, []), request.Date)));
        builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(o =>
            o.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true, ValidIssuer = "member1-tests", ValidateAudience = true, ValidAudience = "member1-tests",
                ValidateLifetime = true, ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(Key))
            });
        builder.Services.AddAuthorization(options => options.AddPolicy("UserOrAi", policy => policy.RequireAuthenticatedUser()));
        _app = builder.Build();
        _app.UseExceptionHandler();
        _app.UseAuthentication();
        _app.UseAuthorization();
        LegalService.API.Services.Workforce.WorkforceDemoEndpoints.MapWorkforceDemoEndpoints(_app);
        _app.MapControllers();
        await _app.StartAsync();
        var address = _app.Services.GetRequiredService<IServer>().Features.Get<IServerAddressesFeature>()!.Addresses.Single();
        _client = new HttpClient { BaseAddress = new Uri(address) };
        using var scope = _app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var spec = new Specialization { Name = "Property", Description = "Recorded property description" };
        var other = new Specialization { Name = "Employment" };
        db.Specializations.AddRange(spec, other);
        var user = new User { Name = "Original", Email = "original@example.test", Role = "Lawyer", PasswordHash = "preserve-me" };
        db.Users.Add(user);
        db.Lawyers.Add(new Lawyer
        {
            LawyerId = _lawyerId, Name = "Original", Email = user.Email, LicenseNumber = "BAR-1", Status = "Active",
            LawyerSpecializations = [new LawyerSpecialization { Specialization = spec }]
        });
        db.LawyerWorkingSchedules.Add(new() { LawyerId = _lawyerId, DayOfWeek = _date.DayOfWeek, IsWorkingDay = true, StartTime = new(9, 0), EndTime = new(9, 30) });
        db.LegalServices.Add(new() { ServiceName = "Property consultation", Category = "Property", Description = "Recorded service description" });
        db.LawyerAvailabilities.Add(new LawyerAvailability
        {
            AvailabilityId = Guid.NewGuid(), LawyerId = _lawyerId, Date = _date, StartTime = new(9, 0), EndTime = new(10, 0),
            AvailabilitySlots = [new AvailabilitySlot { SlotId = Guid.NewGuid(), StartTime = new(9, 0), EndTime = new(9, 30) },
                new AvailabilitySlot { SlotId = Guid.NewGuid(), StartTime = new(9, 30), EndTime = new(10, 0), IsBooked = true }]
        });
        await db.SaveChangesAsync();
        _specId = spec.SpecializationId; _otherSpecId = other.SpecializationId; _userId = user.UserId;
    }

    private sealed class WorkforceHttpDraft : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct) => Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
        { Content = JsonContent.Create(new { suggestedTitle = "Property Associate", operationalReason = "Recorded future capacity requires review.", summary = "Support Property matters.", responsibilities = new[] { "Assist with Property matters." }, focusAreas = new[] { "Property" } }) });
    }

    [Theory] [InlineData(null, 401)] [InlineData("Customer", 403)] [InlineData("Lawyer", 403)] [InlineData("Clerk", 403)]
    public async Task FrontDeskClientAndReviewEndpointsRequireAdmin(string? role, int status)
    {
        SignIn(role);
        Assert.Equal(status, (int)(await _client.GetAsync("/api/clients/search?search=test")).StatusCode);
        Assert.Equal(status, (int)(await _client.GetAsync("/api/clients/42/summary")).StatusCode);
        Assert.Equal(status, (int)(await _client.PostAsJsonAsync("/api/clients", new { email = "client@example.test", password = "test-password" })).StatusCode);
        Assert.Equal(status, (int)(await _client.PutAsJsonAsync($"/api/lawyer-recommendations/{Guid.NewGuid()}/review", new { clientId = 42 })).StatusCode);
    }
    [Fact] public async Task AdminQuickRegistrationIsSearchableThroughNormalClientsAndRejectsDuplicates()
    {
        SignIn("Admin");
        using (var scope = _app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            db.Roles.Add(new() { Id = Guid.NewGuid(), Name = "Customer" }); await db.SaveChangesAsync();
        }
        Assert.Equal(HttpStatusCode.BadRequest, (await _client.PostAsJsonAsync("/api/clients", new { email = "invalid", password = "" })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await _client.PostAsJsonAsync("/api/clients", new { email = "new@example.test", password = "test-password", role = "Admin" })).StatusCode);
        var response = await _client.PostAsJsonAsync("/api/clients", new { fullName = "Front Desk Client", email = "new@example.test", password = "test-password" });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var client = await response.Content.ReadFromJsonAsync<LegalService.API.DTOs.Clients.ClientSummary>();
        Assert.Equal(client, Assert.Single((await _client.GetFromJsonAsync<LegalService.API.DTOs.Clients.ClientSummary[]>("/api/clients/search?search=new@example.test"))!));
        Assert.Equal(HttpStatusCode.OK, (await _client.GetAsync($"/api/clients/{client!.UserId}")).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await _client.PostAsJsonAsync("/api/clients", new { email = "NEW@example.test", password = "test-password" })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await _client.PostAsJsonAsync("/api/lawyer-recommendations", new { requirement = "Land dispute" })).StatusCode);
    }

    [Theory] [InlineData(null, 401)] [InlineData("Customer", 403)] [InlineData("Lawyer", 403)] [InlineData("Clerk", 403)]
    public async Task WorkforceAndCareerWritesRequireAdmin(string? role, int status)
    {
        SignIn(role); var id = Guid.NewGuid();
        Assert.Equal(status, (int)(await _client.GetAsync("/api/workforce-settings")).StatusCode);
        Assert.Equal(status, (int)(await _client.PutAsJsonAsync($"/api/workforce-settings/{_specId}", new { })).StatusCode);
        Assert.Equal(status, (int)(await _client.DeleteAsync($"/api/workforce-settings/{_specId}")).StatusCode);
        Assert.Equal(status, (int)(await _client.GetAsync("/api/workforce-analysis")).StatusCode);
        Assert.Equal(status, (int)(await _client.PostAsJsonAsync("/api/workforce-analysis/suggestions", new { practiceAreaId = _specId })).StatusCode);
        Assert.Equal(status, (int)(await _client.GetAsync($"/api/workforce-analysis/suggestions/{id}")).StatusCode);
        Assert.Equal(status, (int)(await _client.PutAsJsonAsync($"/api/workforce-analysis/suggestions/{id}/draft", new { })).StatusCode);
        Assert.Equal(status, (int)(await _client.PostAsJsonAsync($"/api/workforce-analysis/suggestions/{id}/approve", new { })).StatusCode);
        Assert.Equal(status, (int)(await _client.PostAsJsonAsync($"/api/workforce-analysis/suggestions/{id}/dismiss", new { })).StatusCode);
        Assert.Equal(status, (int)(await _client.PostAsJsonAsync("/api/careers", new { jobTitle = "Role", description = "Recorded" })).StatusCode);
        Assert.Equal(status, (int)(await _client.PutAsJsonAsync("/api/careers/1", new { jobTitle = "Role", description = "Recorded" })).StatusCode);
        Assert.Equal(status, (int)(await _client.DeleteAsync("/api/careers/1")).StatusCode);
    }
    [Fact] public async Task WorkforceHttpApprovalCreatesNormalCareerAndRejectsDuplicateAndInjectedMetrics()
    {
        SignIn("Admin");
        Assert.Equal(HttpStatusCode.BadRequest, (await _client.PostAsJsonAsync("/api/workforce-analysis/suggestions", new { practiceAreaId = _specId, activeLawyerCount = 500 })).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await _client.GetAsync("/api/workforce-analysis")).StatusCode);
        var response = await _client.PostAsJsonAsync("/api/workforce-analysis/suggestions", new { practiceAreaId = _specId });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var workflow = await response.Content.ReadFromJsonAsync<LegalService.API.DTOs.Workforce.HiringWorkflowResponse>();
        Assert.Equal("AWAITING_APPROVAL", workflow!.Status);
        Assert.Empty(await _client.GetFromJsonAsync<LegalService.API.DTOs.Responses.CareerResponse[]>("/api/careers") ?? []);
        var request = new { draft = workflow.Draft, jobTitle = "Admin Reviewed Property Associate", description = "Admin reviewed duties and conditions.", reviewedExistingCareers = true };
        var approved = await _client.PostAsJsonAsync($"/api/workforce-analysis/suggestions/{workflow.WorkflowId}/approve", request);
        Assert.Equal(HttpStatusCode.OK, approved.StatusCode);
        var careers = await _client.GetFromJsonAsync<LegalService.API.DTOs.Responses.CareerResponse[]>("/api/careers");
        Assert.Equal("Admin Reviewed Property Associate", Assert.Single(careers!).JobTitle);
        Assert.Equal(HttpStatusCode.Conflict, (await _client.PostAsJsonAsync($"/api/workforce-analysis/suggestions/{workflow.WorkflowId}/approve", request)).StatusCode);
        var restored = await _client.GetFromJsonAsync<LegalService.API.DTOs.Workforce.HiringWorkflowResponse>($"/api/workforce-analysis/suggestions/{workflow.WorkflowId}");
        Assert.Equal("CAREER_OPENING_CREATED", restored!.Status);
        Assert.Equal(HttpStatusCode.Conflict, (await _client.PostAsJsonAsync("/api/careers", new { jobTitle = "Duplicate", description = "Recorded", practiceAreaId = _specId })).StatusCode);
    }

    [Fact] public async Task WorkforceSettingsHttpValidatesPersistsAndRestoresDefaults()
    {
        SignIn("Admin");
        var defaults = await _client.GetFromJsonAsync<LegalService.API.DTOs.Workforce.WorkforceSettingResponse>($"/api/workforce-settings/{_specId}"); Assert.Equal("DEFAULT", defaults!.Source);
        Assert.Equal(HttpStatusCode.BadRequest, (await _client.PutAsJsonAsync($"/api/workforce-settings/{_specId}", new { minimumActiveLawyers = 4, targetActiveLawyers = 3, minimumFutureSlots = 12, highDemandThreshold = 10, watchCapacityRatio = .75 })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await _client.PutAsJsonAsync($"/api/workforce-settings/{_specId}", new { watchCapacityRatio = .75 })).StatusCode);
        var saved = await _client.PutAsJsonAsync($"/api/workforce-settings/{_specId}", new { minimumActiveLawyers = 4, targetActiveLawyers = 6, minimumFutureSlots = 12, highDemandThreshold = 10, watchCapacityRatio = .75 }); Assert.Equal(HttpStatusCode.OK, saved.StatusCode);
        var custom = await saved.Content.ReadFromJsonAsync<LegalService.API.DTOs.Workforce.WorkforceSettingResponse>(); Assert.Equal("CUSTOM", custom!.Source); Assert.Equal(99, custom.UpdatedBy);
        Assert.Equal(HttpStatusCode.OK, (await _client.DeleteAsync($"/api/workforce-settings/{_specId}")).StatusCode);
        Assert.Equal("DEFAULT", (await _client.GetFromJsonAsync<LegalService.API.DTOs.Workforce.WorkforceSettingResponse>($"/api/workforce-settings/{_specId}"))!.Source);
    }
    [Fact] public async Task ProductionHostHasNoDemoRoutes()
    {
        SignIn("Admin");
        Assert.Equal(HttpStatusCode.NotFound, (await _client.GetAsync("/api/dev/workforce-demo")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await _client.PostAsJsonAsync("/api/dev/workforce-demo/apply", new { scenario = "RECRUITMENT_NEEDED" })).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await _client.PostAsync("/api/dev/workforce-demo/reset", null)).StatusCode);
    }
    private void SignIn(string? role)
    {
        _client.DefaultRequestHeaders.Authorization = null;
        if (role == null) return;
        using var scope = _app.Services.CreateScope();
        var jwt = scope.ServiceProvider.GetRequiredService<JwtService>().GenerateToken(99, "tester@example.test", role);
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", jwt);
    }
    private CreateLawyerRequest Payload() => new()
    {
        Name = "Updated lawyer", Email = "updated@example.test", LicenseNumber = "BAR-2", Experience = 12,
        SpecializationId = _otherSpecId, Qualification = "LLB", ProfileDescription = "Profile", PhoneNumber = "123"
    };

    [Theory]
    [InlineData(null, 401)]
    [InlineData("Customer", 403)]
    [InlineData("Lawyer", 403)]
    [InlineData("Clerk", 403)]
    public async Task NonAdminsCannotManageLawyersOrSpecializations(string? role, int status)
    {
        SignIn(role);
        Assert.Equal(status, (int)(await _client.PostAsJsonAsync("/api/lawyers", Payload())).StatusCode);
        Assert.Equal(status, (int)(await _client.PutAsJsonAsync($"/api/lawyers/{_lawyerId}", Payload())).StatusCode);
        Assert.Equal(status, (int)(await _client.DeleteAsync($"/api/lawyers/{_lawyerId}")).StatusCode);
        Assert.Equal(status, (int)(await _client.PostAsJsonAsync("/api/specializations", new { name = "New" })).StatusCode);
        Assert.Equal(status, (int)(await _client.PutAsJsonAsync($"/api/specializations/{_specId}", new { name = "New" })).StatusCode);
        Assert.Equal(status, (int)(await _client.DeleteAsync($"/api/specializations/{_specId}")).StatusCode);
        Assert.Equal(status, (int)(await _client.PostAsJsonAsync("/api/legal-services", new { serviceName = "New", category = "Property" })).StatusCode);
        Assert.Equal(status, (int)(await _client.PutAsJsonAsync("/api/legal-services/1", new { serviceName = "New", category = "Property" })).StatusCode);
        Assert.Equal(status, (int)(await _client.DeleteAsync("/api/legal-services/1")).StatusCode);
        Assert.Equal(status, (int)(await _client.GetAsync("/api/legal-services/1")).StatusCode);
        Assert.Equal(status, (int)(await _client.GetAsync("/api/legal-services/admin")).StatusCode);
    }

    [Fact]
    public async Task AdminCanCreateLawyerAndLawyerAccount()
    {
        SignIn("Admin");
        var response = await _client.PostAsJsonAsync("/api/lawyers", Payload());
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Updated lawyer", json.GetProperty("name").GetString());
        using var scope = _app.Services.CreateScope();
        var user = await scope.ServiceProvider.GetRequiredService<ApplicationDbContext>().Users.SingleAsync(u => u.Email == "updated@example.test");
        Assert.Equal("Lawyer", user.Role);
        Assert.NotEmpty(user.PasswordHash!);
        var lawyer = await scope.ServiceProvider.GetRequiredService<ApplicationDbContext>().Lawyers
            .SingleAsync(l => l.Email == user.Email);
        Assert.Equal(user.UserId, lawyer.UserId);
    }

    [Fact]
    public async Task AdminCanUpdateAndPreserveAccountSecurity()
    {
        SignIn("Admin");
        var payload = JsonSerializer.SerializeToNode(Payload())!;
        payload["Password"] = "must-not-change"; payload["Role"] = "Admin"; payload["UserId"] = 500;
        var response = await _client.PutAsJsonAsync($"/api/lawyers/{_lawyerId}", payload);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(_lawyerId, json.GetProperty("lawyerId").GetGuid());
        Assert.Equal(_otherSpecId, json.GetProperty("specializations")[0].GetProperty("specializationId").GetInt32());
        using var scope = _app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var account = await db.Users.FindAsync(_userId);
        Assert.Equal("updated@example.test", account!.Email);
        Assert.Equal("Updated lawyer", account.Name);
        Assert.Equal("Lawyer", account.Role);
        Assert.Equal("preserve-me", account.PasswordHash);
        Assert.Single(await db.LawyerSpecializations.Where(s => s.LawyerId == _lawyerId).ToListAsync());
    }

    [Fact]
    public async Task InvalidSpecializationAndMissingLawyerAreRejected()
    {
        SignIn("Admin"); var payload = Payload(); payload.SpecializationId = 99999;
        Assert.Equal(HttpStatusCode.BadRequest, (await _client.PutAsJsonAsync($"/api/lawyers/{_lawyerId}", payload)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await _client.PutAsJsonAsync($"/api/lawyers/{Guid.NewGuid()}", Payload())).StatusCode);
    }

    [Theory]
    [InlineData(-1, "Name", "BAR")]
    [InlineData(71, "Name", "BAR")]
    [InlineData(2, " ", "BAR")]
    [InlineData(2, "Name", " ")]
    public async Task InvalidFieldsReturn400(int experience, string name, string license)
    {
        SignIn("Admin"); var payload = Payload(); payload.Experience = experience; payload.Name = name; payload.LicenseNumber = license;
        Assert.Equal(HttpStatusCode.BadRequest, (await _client.PutAsJsonAsync($"/api/lawyers/{_lawyerId}", payload)).StatusCode);
    }

    [Fact]
    public async Task CannotCreateOverExistingAccountOrUseDuplicateEmailOrLicense()
    {
        SignIn("Admin");
        using var scope = _app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        db.Users.Add(new User { Name = "Customer", Email = "customer@example.test", Role = "Customer" });
        db.Lawyers.Add(new Lawyer { LawyerId = Guid.NewGuid(), Name = "Other", Email = "other@example.test", LicenseNumber = "OTHER" });
        await db.SaveChangesAsync();
        var payload = Payload(); payload.Email = "customer@example.test";
        Assert.Equal(HttpStatusCode.Conflict, (await _client.PostAsJsonAsync("/api/lawyers", payload)).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await _client.PutAsJsonAsync($"/api/lawyers/{_lawyerId}", payload)).StatusCode);
        payload.Email = "other@example.test";
        Assert.Equal(HttpStatusCode.Conflict, (await _client.PutAsJsonAsync($"/api/lawyers/{_lawyerId}", payload)).StatusCode);
        payload.Email = "unique@example.test"; payload.LicenseNumber = "other";
        Assert.Equal(HttpStatusCode.Conflict, (await _client.PutAsJsonAsync($"/api/lawyers/{_lawyerId}", payload)).StatusCode);
        Assert.Equal("Customer", (await db.Users.SingleAsync(u => u.Email == "customer@example.test")).Role);
    }

    [Fact]
    public async Task AdminCanDeleteLawyer()
    {
        SignIn("Admin");
        Assert.Equal(HttpStatusCode.OK, (await _client.DeleteAsync($"/api/lawyers/{_lawyerId}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await _client.GetAsync($"/api/lawyers/{_lawyerId}")).StatusCode);
        using var scope = _app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        Assert.False(await db.Lawyers.AnyAsync(l => l.LawyerId == _lawyerId));
        Assert.False(await db.LawyerSpecializations.AnyAsync(s => s.LawyerId == _lawyerId));
        Assert.False(await db.LawyerAvailabilities.AnyAsync(a => a.LawyerId == _lawyerId));
        Assert.False(await db.AvailabilitySlots.AnyAsync());
        Assert.NotNull(await db.Users.FindAsync(_userId));
    }

    [Fact]
    public async Task PublicRoutesSearchAndAliasesReturnRecordedData()
    {
        var oldSpecs = await _client.GetFromJsonAsync<JsonElement>("/api/lawyers/specializations");
        var newSpecs = await _client.GetFromJsonAsync<JsonElement>("/api/specializations");
        Assert.Equal(oldSpecs.GetRawText(), newSpecs.GetRawText());
        Assert.Equal(1, newSpecs[0].GetProperty("lawyerCount").GetInt32());
        Assert.Equal(1, newSpecs[0].GetProperty("legalServiceCount").GetInt32());
        var services = await _client.GetFromJsonAsync<JsonElement>("/api/legal-services");
        Assert.Equal("Property consultation", services[0].GetProperty("serviceName").GetString());
        var oldSearch = await _client.GetFromJsonAsync<JsonElement>($"/api/lawyers?specialization={_specId}&search=original&date=2030-01-05");
        var search = await _client.GetFromJsonAsync<JsonElement>($"/api/lawyers/search?specialization={_specId}&search=original&date=2030-01-05");
        Assert.Equal(oldSearch.GetRawText(), search.GetRawText());
        Assert.Equal(_lawyerId, search[0].GetProperty("lawyerId").GetGuid());
        var empty = await _client.GetFromJsonAsync<JsonElement>($"/api/lawyers/search?specialization={_otherSpecId}");
        Assert.Equal(0, empty.GetArrayLength());
        empty = await _client.GetFromJsonAsync<JsonElement>("/api/lawyers/search?date=2030-01-06");
        Assert.Equal(0, empty.GetArrayLength());
        Assert.Equal(HttpStatusCode.BadRequest, (await _client.GetAsync("/api/lawyers/search?date=invalid")).StatusCode);
    }

    [Fact]
    public async Task PagedDirectoryCombinesSearchSpecializationAndRecordedAvailability()
    {
        var ids = new List<Guid>();
        using (var scope = _app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            for (var i = 1; i <= 24; i++)
            {
                var id = Guid.NewGuid();
                ids.Add(id);
                db.Lawyers.Add(new Lawyer
                {
                    LawyerId = id,
                    Name = i <= 12 ? $"Property Lawyer {i:00}" : $"Employment Lawyer {i:00}",
                    Email = $"lawyer{i:00}@example.test",
                    LicenseNumber = $"BAR-{i + 100}",
                    Status = "Active",
                    LawyerSpecializations = [new LawyerSpecialization
                    {
                        LawyerId = id, SpecializationId = i <= 12 ? _specId : _otherSpecId
                    }]
                });
                if (i <= 6) db.LawyerWorkingSchedules.Add(new() { LawyerId = id, DayOfWeek = _date.DayOfWeek, IsWorkingDay = true, StartTime = new(11, 0), EndTime = new(11, 30) });
                if (i <= 6)
                    db.LawyerAvailabilities.Add(new LawyerAvailability
                    {
                        AvailabilityId = Guid.NewGuid(), LawyerId = id, Date = _date,
                        AvailabilitySlots = [new AvailabilitySlot
                        {
                            SlotId = Guid.NewGuid(), StartTime = new(11, 0), EndTime = new(11, 30)
                        }]
                    });
            }
            await db.SaveChangesAsync();
        }

        var first = await _client.GetFromJsonAsync<JsonElement>("/api/lawyers/search?page=1&pageSize=10");
        var second = await _client.GetFromJsonAsync<JsonElement>("/api/lawyers/search?page=2&pageSize=10");
        Assert.Equal(10, first.GetProperty("items").GetArrayLength());
        Assert.Equal(10, second.GetProperty("items").GetArrayLength());
        Assert.Equal(25, first.GetProperty("totalItems").GetInt32());
        Assert.Equal(25, first.GetProperty("totalLawyers").GetInt32());
        Assert.Equal(3, first.GetProperty("totalPages").GetInt32());
        Assert.NotEqual(first.GetProperty("items")[0].GetProperty("lawyerId").GetGuid(),
            second.GetProperty("items")[0].GetProperty("lawyerId").GetGuid());

        var search = await _client.GetFromJsonAsync<JsonElement>("/api/lawyers/search?search=Property%20Lawyer&page=2&pageSize=10");
        Assert.Equal(12, search.GetProperty("totalItems").GetInt32());
        Assert.Equal(2, search.GetProperty("items").GetArrayLength());
        var emailSearch = await _client.GetFromJsonAsync<JsonElement>("/api/lawyers/search?search=lawyer01%40example.test&page=1&pageSize=10");
        Assert.Equal(1, emailSearch.GetProperty("totalItems").GetInt32());

        var category = await _client.GetFromJsonAsync<JsonElement>($"/api/lawyers/search?specialization={_specId}&page=2&pageSize=10");
        Assert.Equal(13, category.GetProperty("totalItems").GetInt32());
        Assert.Equal(3, category.GetProperty("items").GetArrayLength());

        var available = await _client.GetFromJsonAsync<JsonElement>($"/api/lawyers/search?specialization={_specId}&search=Property%20Lawyer&date={_date:yyyy-MM-dd}&page=2&pageSize=2");
        Assert.Equal(6, available.GetProperty("totalItems").GetInt32());
        Assert.Equal(2, available.GetProperty("items").GetArrayLength());
        Assert.Equal(3, available.GetProperty("totalPages").GetInt32());

        Assert.Equal(HttpStatusCode.BadRequest, (await _client.GetAsync("/api/lawyers/search?page=0&pageSize=10")).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await _client.GetAsync("/api/lawyers/search?page=1&pageSize=101")).StatusCode);

        SignIn("Admin");
        var last = await _client.GetFromJsonAsync<JsonElement>("/api/lawyers/search?page=13&pageSize=2");
        var lastId = last.GetProperty("items")[0].GetProperty("lawyerId").GetGuid();
        Assert.Contains(lastId, ids);
        Assert.Equal(HttpStatusCode.OK, (await _client.DeleteAsync($"/api/lawyers/{lastId}")).StatusCode);
        var afterDelete = await _client.GetFromJsonAsync<JsonElement>("/api/lawyers/search?page=13&pageSize=2");
        Assert.Equal(0, afterDelete.GetProperty("items").GetArrayLength());
        Assert.Equal(12, afterDelete.GetProperty("totalPages").GetInt32());
    }

    [Fact]
    public async Task AvailabilityReturnsOnlyRecordedUnbookedSlotsWithoutCreatingDefaults()
    {
        var slots = await _client.GetFromJsonAsync<JsonElement>($"/api/lawyers/{_lawyerId}/availability?date=2030-01-05");
        Assert.Equal(1, slots.GetArrayLength());
        Assert.False(slots[0].GetProperty("isBooked").GetBoolean());
        var empty = await _client.GetFromJsonAsync<JsonElement>($"/api/lawyers/{_lawyerId}/availability?date=2030-01-06");
        Assert.Equal(0, empty.GetArrayLength());
        Assert.Equal(HttpStatusCode.NotFound, (await _client.GetAsync($"/api/lawyers/{Guid.NewGuid()}/availability")).StatusCode);
        using var scope = _app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        Assert.Equal(1, await db.LawyerAvailabilities.CountAsync());
        var lawyer = await db.Lawyers.FindAsync(_lawyerId); lawyer!.Status = "Inactive"; await db.SaveChangesAsync();
        empty = await _client.GetFromJsonAsync<JsonElement>($"/api/lawyers/{_lawyerId}/availability?date=2030-01-05");
        Assert.Equal(0, empty.GetArrayLength());
        empty = await _client.GetFromJsonAsync<JsonElement>("/api/lawyers/search?date=2030-01-05");
        Assert.Equal(0, empty.GetArrayLength());
    }

    [Fact]
    public async Task AdminManagesSpecializationsButCannotDeleteReferencedRecords()
    {
        SignIn("Admin");
        var create = await _client.PostAsJsonAsync("/api/specializations", new { name = "New field", description = "Actual description" });
        Assert.Equal(HttpStatusCode.Created, create.StatusCode);
        var id = (await create.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("specializationId").GetInt32();
        Assert.Equal(HttpStatusCode.OK, (await _client.PutAsJsonAsync($"/api/specializations/{id}", new { name = "Renamed", description = "Updated" })).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await _client.DeleteAsync($"/api/specializations/{id}")).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await _client.DeleteAsync($"/api/specializations/{_specId}")).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await _client.PostAsJsonAsync("/api/specializations", new { name = "PROPERTY" })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await _client.PostAsJsonAsync("/api/specializations", new { name = " " })).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await _client.PutAsJsonAsync($"/api/specializations/{_specId}", new { name = "Property renamed" })).StatusCode);
        var services = await _client.GetFromJsonAsync<JsonElement>("/api/legal-services");
        Assert.Equal("Property renamed", services[0].GetProperty("category").GetString());
        using var scope = _app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        await DbInitializer.SeedCategoriesAsync(db);
        Assert.Equal(2, await db.Specializations.CountAsync());
    }

    [Fact]
    public async Task PracticeAreaDetailsShowRecordedRelationshipsAndEnforceAdminAccess()
    {
        Assert.Equal(HttpStatusCode.Unauthorized, (await _client.GetAsync($"/api/specializations/{_specId}")).StatusCode);
        SignIn("Customer");
        Assert.Equal(HttpStatusCode.Forbidden, (await _client.GetAsync($"/api/specializations/{_specId}")).StatusCode);
        SignIn("Admin");
        var details = await _client.GetFromJsonAsync<JsonElement>($"/api/specializations/{_specId}");
        Assert.Equal("Property", details.GetProperty("name").GetString());
        Assert.Equal("Recorded property description", details.GetProperty("description").GetString());
        Assert.Equal(1, details.GetProperty("lawyerCount").GetInt32());
        Assert.Equal(_lawyerId, details.GetProperty("lawyers")[0].GetProperty("lawyerId").GetGuid());
        Assert.Equal("Original", details.GetProperty("lawyers")[0].GetProperty("name").GetString());
        Assert.Equal(1, details.GetProperty("legalServiceCount").GetInt32());
        Assert.Equal("Property consultation", details.GetProperty("legalServices")[0].GetProperty("serviceName").GetString());
        var empty = await _client.GetFromJsonAsync<JsonElement>($"/api/specializations/{_otherSpecId}");
        Assert.Equal(0, empty.GetProperty("lawyerCount").GetInt32());
        Assert.Equal(0, empty.GetProperty("legalServices").GetArrayLength());
        Assert.Equal(HttpStatusCode.NotFound, (await _client.GetAsync("/api/specializations/99999")).StatusCode);
    }

    [Fact]
    public async Task PracticeAreaUsageMatchesCaseInsensitiveServiceCategoryAndBlocksDeletion()
    {
        using (var scope = _app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            db.LegalServices.Add(new LegalService.API.Models.Entities.LegalService
            {
                ServiceName = "Employment advice", Category = "employment"
            });
            await db.SaveChangesAsync();
        }
        var list = await _client.GetFromJsonAsync<JsonElement>("/api/specializations");
        var employment = list.EnumerateArray().Single(s => s.GetProperty("specializationId").GetInt32() == _otherSpecId);
        Assert.Equal(1, employment.GetProperty("legalServiceCount").GetInt32());
        SignIn("Admin");
        var blocked = await _client.DeleteAsync($"/api/specializations/{_otherSpecId}");
        Assert.Equal(HttpStatusCode.Conflict, blocked.StatusCode);
        var conflict = await blocked.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(0, conflict.GetProperty("lawyerCount").GetInt32());
        Assert.Equal(1, conflict.GetProperty("legalServiceCount").GetInt32());
        Assert.Equal(HttpStatusCode.OK, (await _client.PutAsJsonAsync($"/api/specializations/{_otherSpecId}",
            new { name = "Employment Law", description = "Workplace matters" })).StatusCode);
        var services = await _client.GetFromJsonAsync<JsonElement>("/api/legal-services");
        Assert.Contains(services.EnumerateArray(), s => s.GetProperty("serviceName").GetString() == "Employment advice"
            && s.GetProperty("category").GetString() == "Employment Law");
    }

    [Fact]
    public async Task AdminManagesLegalServicesButCannotDeleteAssignedRecords()
    {
        SignIn("Admin");
        var create = await _client.PostAsJsonAsync("/api/legal-services", new
        {
            serviceName = "Title review",
            description = "Review land title records",
            category = "Property"
        });
        Assert.Equal(HttpStatusCode.Created, create.StatusCode);
        var id = (await create.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("legalServiceId").GetInt32();
        Assert.Equal(HttpStatusCode.OK, (await _client.PutAsJsonAsync($"/api/legal-services/{id}", new
        {
            serviceName = "Title review updated",
            description = "Updated",
            category = "Employment"
        })).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await _client.DeleteAsync($"/api/legal-services/{id}")).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await _client.PostAsJsonAsync("/api/legal-services", new { serviceName = "PROPERTY CONSULTATION", category = "Property" })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await _client.PostAsJsonAsync("/api/legal-services", new { serviceName = " ", category = "Property" })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await _client.PostAsJsonAsync("/api/legal-services", new { serviceName = "Unknown category service", category = "Missing" })).StatusCode);

        using var scope = _app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var assigned = await db.LegalServices.SingleAsync();
        db.LawyerLegalServices.Add(new LawyerLegalService { LawyerId = _lawyerId, LegalServiceId = assigned.LegalServiceId });
        await db.SaveChangesAsync();
        var blocked = await _client.DeleteAsync($"/api/legal-services/{assigned.LegalServiceId}");
        Assert.Equal(HttpStatusCode.Conflict, blocked.StatusCode);
        var conflict = await blocked.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(1, conflict.GetProperty("lawyerCount").GetInt32());
        Assert.Equal(1, conflict.GetProperty("legacyReferenceCount").GetInt32());
        Assert.Contains("legacy lawyer-service references", conflict.GetProperty("message").GetString());
        Assert.Contains("Property consultation", conflict.GetProperty("message").GetString());
        var services = await _client.GetFromJsonAsync<JsonElement>("/api/legal-services");
        Assert.Equal(1, services[0].GetProperty("lawyerCount").GetInt32());
    }

    [Fact]
    public async Task EligibleLawyersDoNotBlockLegalServiceDeletion()
    {
        SignIn("Admin");
        var create = await _client.PostAsJsonAsync("/api/legal-services", new
        {
            serviceName = "Property eligibility example", category = "Property", description = "Recorded service"
        });
        Assert.Equal(HttpStatusCode.Created, create.StatusCode);
        var id = (await create.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("legalServiceId").GetInt32();
        var details = await _client.GetFromJsonAsync<JsonElement>($"/api/legal-services/{id}");
        Assert.Equal(1, details.GetProperty("eligibleLawyerCount").GetInt32());
        Assert.Equal(0, details.GetProperty("legacyReferenceCount").GetInt32());
        Assert.Equal(HttpStatusCode.NoContent, (await _client.DeleteAsync($"/api/legal-services/{id}")).StatusCode);
    }

    [Fact]
    public async Task AdminLegalServiceEligibilityFollowsActivePracticeAreaWithoutAssignments()
    {
        Guid otherId = Guid.NewGuid();
        using (var scope = _app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            db.Lawyers.Add(new Lawyer
            {
                LawyerId = otherId, Name = "Employment lawyer", LicenseNumber = "BAR-EMP", Status = "Active",
                LawyerSpecializations = [new LawyerSpecialization { LawyerId = otherId, SpecializationId = _otherSpecId }]
            });
            db.Lawyers.Add(new Lawyer
            {
                LawyerId = Guid.NewGuid(), Name = "Inactive property lawyer", LicenseNumber = "BAR-INACTIVE", Status = "Inactive",
                LawyerSpecializations = [new LawyerSpecialization { SpecializationId = _specId }]
            });
            await db.SaveChangesAsync();
        }
        var publicList = await _client.GetFromJsonAsync<JsonElement>("/api/legal-services");
        Assert.Equal(JsonValueKind.Array, publicList.ValueKind);
        Assert.Equal(1, publicList[0].GetProperty("lawyerCount").GetInt32());
        Assert.False(publicList[0].TryGetProperty("eligibleLawyerCount", out _));
        var serviceId = publicList[0].GetProperty("legalServiceId").GetInt32();

        SignIn("Admin");
        var adminList = await _client.GetFromJsonAsync<JsonElement>("/api/legal-services/admin");
        Assert.Equal(1, adminList[0].GetProperty("eligibleLawyerCount").GetInt32());
        Assert.Equal(0, adminList[0].GetProperty("legacyReferenceCount").GetInt32());
        var details = await _client.GetFromJsonAsync<JsonElement>($"/api/legal-services/{serviceId}");
        Assert.Equal("Property consultation", details.GetProperty("serviceName").GetString());
        Assert.Equal(1, details.GetProperty("eligibleLawyerCount").GetInt32());
        Assert.Equal(_lawyerId, details.GetProperty("eligibleLawyers")[0].GetProperty("lawyerId").GetGuid());
        Assert.False(details.TryGetProperty("assignedLawyers", out _));
        Assert.Equal(HttpStatusCode.NotFound, (await _client.PutAsJsonAsync($"/api/legal-services/{serviceId}/lawyers",
            new { lawyerIds = new[] { _lawyerId } })).StatusCode);

        using (var scope = _app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            db.LawyerLegalServices.Add(new LawyerLegalService { LawyerId = _lawyerId, LegalServiceId = serviceId });
            await db.SaveChangesAsync();
        }
        adminList = await _client.GetFromJsonAsync<JsonElement>("/api/legal-services/admin");
        Assert.Equal(1, adminList[0].GetProperty("eligibleLawyerCount").GetInt32());
        Assert.Equal(1, adminList[0].GetProperty("legacyReferenceCount").GetInt32());
        Assert.Equal(HttpStatusCode.OK, (await _client.PutAsJsonAsync($"/api/legal-services/{serviceId}",
            new { serviceName = "Property consultation", category = "employment", description = "Changed" })).StatusCode);
        details = await _client.GetFromJsonAsync<JsonElement>($"/api/legal-services/{serviceId}");
        Assert.Equal("Employment", details.GetProperty("category").GetString());
        Assert.Equal(1, details.GetProperty("eligibleLawyerCount").GetInt32());
        Assert.Equal(otherId, details.GetProperty("eligibleLawyers")[0].GetProperty("lawyerId").GetGuid());
        Assert.Equal(1, details.GetProperty("legacyReferenceCount").GetInt32());
        var profile = await _client.GetFromJsonAsync<JsonElement>($"/api/lawyers/{_lawyerId}");
        Assert.Empty(profile.GetProperty("legalServices").EnumerateArray());

        var createArea = await _client.PostAsJsonAsync("/api/specializations",
            new { name = "Empty Practice Area", description = "No registered lawyers" });
        Assert.Equal(HttpStatusCode.Created, createArea.StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await _client.PutAsJsonAsync($"/api/legal-services/{serviceId}",
            new { serviceName = "Property consultation", category = "Empty Practice Area", description = "Changed again" })).StatusCode);
        details = await _client.GetFromJsonAsync<JsonElement>($"/api/legal-services/{serviceId}");
        Assert.Equal(0, details.GetProperty("eligibleLawyerCount").GetInt32());
        Assert.Empty(details.GetProperty("eligibleLawyers").EnumerateArray());
        adminList = await _client.GetFromJsonAsync<JsonElement>("/api/legal-services/admin");
        Assert.Equal(0, adminList[0].GetProperty("eligibleLawyerCount").GetInt32());
        Assert.Equal(HttpStatusCode.Conflict, (await _client.DeleteAsync($"/api/legal-services/{serviceId}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await _client.GetAsync("/api/legal-services/99999")).StatusCode);
    }

    [Fact]
    public async Task LegacyCategoryPayloadAndSlotsRouteRemainCompatible()
    {
        SignIn("Admin");
        var payload = Payload(); payload.SpecializationId = null; payload.Category = "Property";
        Assert.Equal(HttpStatusCode.OK, (await _client.PutAsJsonAsync($"/api/lawyers/{_lawyerId}", payload)).StatusCode);
        var profile = await _client.GetFromJsonAsync<JsonElement>($"/api/lawyers/{_lawyerId}");
        Assert.Equal(_specId, profile.GetProperty("specializations")[0].GetProperty("specializationId").GetInt32());
        var slots = await _client.GetFromJsonAsync<JsonElement>($"/api/lawyers/{_lawyerId}/slots?date=2030-01-05");
        Assert.Equal(1, slots.GetArrayLength());
        payload.Category = "";
        Assert.Equal(HttpStatusCode.BadRequest, (await _client.PutAsJsonAsync($"/api/lawyers/{_lawyerId}", payload)).StatusCode);
    }

    [Fact]
    public async Task UpdatingDirectoryOnlyLawyerDoesNotCreateAnAccount()
    {
        SignIn("Admin");
        using var scope = _app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        db.Users.Remove((await db.Users.FindAsync(_userId))!); await db.SaveChangesAsync();
        Assert.Equal(HttpStatusCode.OK, (await _client.PutAsJsonAsync($"/api/lawyers/{_lawyerId}", Payload())).StatusCode);
        Assert.Equal(0, await db.Users.CountAsync());
    }

    [Fact]
    public async Task LawyerWithAppointmentHistoryCannotBeDeleted()
    {
        SignIn("Admin");
        using var scope = _app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var slot = await db.AvailabilitySlots.FirstAsync();
        db.Appointments.Add(new Appointment { AppointmentId = Guid.NewGuid(), LawyerId = _lawyerId,
            SlotId = slot.SlotId, CustomerId = Guid.NewGuid(), Status = "Completed" });
        await db.SaveChangesAsync();
        Assert.Equal(HttpStatusCode.Conflict, (await _client.DeleteAsync($"/api/lawyers/{_lawyerId}")).StatusCode);
        Assert.Equal(1, await db.Appointments.CountAsync());
    }

    [Fact]
    public async Task ProfileServicesFollowPracticeAreaAndIgnoreUnrelatedLegacyLinks()
    {
        using var scope = _app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var service = await db.LegalServices.SingleAsync();
        var unrelated = new LegalService.API.Models.Entities.LegalService { ServiceName = "Employment consultation", Category = "Employment" };
        db.LegalServices.Add(unrelated);
        await db.SaveChangesAsync();
        db.LawyerLegalServices.Add(new LawyerLegalService { LawyerId = _lawyerId, LegalServiceId = unrelated.LegalServiceId });
        await db.SaveChangesAsync();
        var profile = await _client.GetFromJsonAsync<JsonElement>($"/api/lawyers/{_lawyerId}");
        Assert.Single(profile.GetProperty("legalServices").EnumerateArray());
        Assert.Equal(service.ServiceName, profile.GetProperty("legalServices")[0].GetProperty("serviceName").GetString());
        Assert.False(profile.TryGetProperty("passwordHash", out _));
        var catalog = await _client.GetFromJsonAsync<JsonElement>("/api/legal-services");
        Assert.Equal(1, catalog.EnumerateArray().Single(s => s.GetProperty("legalServiceId").GetInt32() == service.LegalServiceId).GetProperty("lawyerCount").GetInt32());
        Assert.Equal(0, catalog.EnumerateArray().Single(s => s.GetProperty("legalServiceId").GetInt32() == unrelated.LegalServiceId).GetProperty("lawyerCount").GetInt32());
    }

    [Theory]
    [InlineData(null, 401)]
    [InlineData("Customer", 403)]
    [InlineData("Lawyer", 403)]
    [InlineData("Clerk", 403)]
    public async Task DedicatedRecommendationsRemainAdminAssisted(string? role, int status)
    {
        SignIn(role);
        Assert.Equal(status, (int)(await _client.PostAsJsonAsync("/api/lawyer-recommendations", new { requirement = "Property dispute" })).StatusCode);
        Assert.Equal(status, (int)(await _client.GetAsync($"/api/lawyer-recommendations/{Guid.NewGuid()}")).StatusCode);
        Assert.Equal(status, (int)(await _client.PostAsJsonAsync($"/api/lawyer-recommendations/{Guid.NewGuid()}/approve", new { })).StatusCode);
        Assert.Equal(status, (int)(await _client.GetAsync("/api/lawyer-recommendations/customers")).StatusCode);
    }

    [Theory]
    [InlineData(null, 401)]
    [InlineData("Customer", 403)]
    [InlineData("Lawyer", 403)]
    public async Task OperationalSummaryRequiresAdmin(string? role, int status)
    {
        SignIn(role);
        Assert.Equal(status, (int)(await _client.GetAsync("/api/lawyer-services/summary")).StatusCode);
    }

    [Fact]
    public async Task OperationalSummaryUsesCatalogActiveLawyersAndOnlyFutureUnbookedSlots()
    {
        SignIn("Admin");
        using var scope = _app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var inactiveId = Guid.NewGuid();
        db.Lawyers.AddRange(
            new Lawyer { LawyerId = inactiveId, Name = "Inactive Property", LicenseNumber = "INACTIVE",
                Status = "Inactive", LawyerSpecializations = [new LawyerSpecialization { SpecializationId = _specId }] },
            new Lawyer { LawyerId = Guid.NewGuid(), Name = "Pending Employment", LicenseNumber = "PENDING",
                Status = "Pending", LawyerSpecializations = [new LawyerSpecialization { SpecializationId = _otherSpecId }] });
        db.LawyerAvailabilities.AddRange(
            new LawyerAvailability { AvailabilityId = Guid.NewGuid(), LawyerId = _lawyerId,
                Date = new DateOnly(2020, 1, 1), StartTime = new(9, 0), EndTime = new(10, 0),
                AvailabilitySlots = [new AvailabilitySlot { SlotId = Guid.NewGuid(), StartTime = new(9, 0), EndTime = new(9, 30) }] },
            new LawyerAvailability { AvailabilityId = Guid.NewGuid(), LawyerId = inactiveId,
                Date = _date, StartTime = new(9, 0), EndTime = new(10, 0),
                AvailabilitySlots = [new AvailabilitySlot { SlotId = Guid.NewGuid(), StartTime = new(9, 0), EndTime = new(9, 30) }] });
        await db.SaveChangesAsync();

        var summary = await _client.GetFromJsonAsync<JsonElement>("/api/lawyer-services/summary");
        Assert.Equal(1, summary.GetProperty("activeLawyers").GetInt32());
        Assert.Equal(3, summary.GetProperty("totalLawyers").GetInt32());
        Assert.Equal(2, summary.GetProperty("practiceAreas").GetInt32());
        Assert.Equal(1, summary.GetProperty("legalServices").GetInt32());
        var rows = summary.GetProperty("coverage").EnumerateArray().ToArray();
        Assert.Equal(2, rows.Length);
        var property = rows.Single(row => row.GetProperty("practiceAreaName").GetString() == "Property");
        Assert.Equal(1, property.GetProperty("activeLawyers").GetInt32());
        Assert.Equal(1, property.GetProperty("legalServices").GetInt32());
        Assert.InRange(property.GetProperty("futureAvailabilityCount").GetInt32(), 4, 5);
        var employment = rows.Single(row => row.GetProperty("practiceAreaName").GetString() == "Employment");
        Assert.Equal(0, employment.GetProperty("activeLawyers").GetInt32());
        Assert.Equal(0, employment.GetProperty("legalServices").GetInt32());
        Assert.Equal(0, employment.GetProperty("futureAvailabilityCount").GetInt32());
        Assert.DoesNotContain(rows, row => row.GetProperty("practiceAreaName").GetString() == "Family Law");
    }

    [Fact]
    public async Task FreshEfCatalogBootstrapHasOnlyFiveSupportedAreasAndPreservesLaterAdminChanges()
    {
        await using var db = new ApplicationDbContext(new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        await db.Database.EnsureCreatedAsync();
        await DbInitializer.SeedCategoriesAsync(db);
        Assert.Equal(5, await db.Specializations.CountAsync());
        Assert.True(await db.Specializations.AnyAsync(s => s.Name == "Corporate & Commercial Law"));
        Assert.False(await db.Specializations.AnyAsync(s => s.Name == "Family Law"));
        Assert.False(await db.LegalServices.AnyAsync(s => s.Category == "Family Law"));
        Assert.Equal("Corporate & Commercial Law", (await db.LegalServices.FindAsync(3))!.Category);
        var tax = await db.Specializations.SingleAsync(s => s.Name == "Tax Law");
        db.Specializations.Remove(tax);
        var property = await db.Specializations.SingleAsync(s => s.Name == "Real Estate & Property Law");
        property.Description = "Admin-authored description";
        await db.SaveChangesAsync();
        await DbInitializer.SeedCategoriesAsync(db);
        Assert.False(await db.Specializations.AnyAsync(s => s.Name == "Tax Law"));
        Assert.Equal("Admin-authored description", property.Description);
    }

    [Fact]
    public async Task StatusFilterIsValidatedAndInvalidEmailCannotBeSaved()
    {
        var active = await _client.GetFromJsonAsync<JsonElement>("/api/lawyers/search?page=1&pageSize=10&status=Active");
        Assert.Equal(1, active.GetProperty("totalItems").GetInt32());
        var inactive = await _client.GetFromJsonAsync<JsonElement>("/api/lawyers/search?page=1&pageSize=10&status=Inactive");
        Assert.Empty(inactive.GetProperty("items").EnumerateArray());
        Assert.Equal(HttpStatusCode.BadRequest, (await _client.GetAsync("/api/lawyers?status=injected")).StatusCode);
        SignIn("Admin"); var payload = Payload(); payload.Email = "not-an-email";
        Assert.Equal(HttpStatusCode.BadRequest, (await _client.PutAsJsonAsync($"/api/lawyers/{_lawyerId}", payload)).StatusCode);
    }

    [Fact]
    public async Task AmbiguousPracticeAreaRecordsCannotBecomeEligibleThroughLegacyLinks()
    {
        SignIn("Admin");
        using var scope = _app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        db.LawyerSpecializations.Add(new() { LawyerId = _lawyerId, SpecializationId = _otherSpecId });
        var service = await db.LegalServices.SingleAsync();
        db.LawyerLegalServices.Add(new() { LawyerId = _lawyerId, LegalServiceId = service.LegalServiceId });
        await db.SaveChangesAsync();
        var details = await _client.GetFromJsonAsync<JsonElement>($"/api/legal-services/{service.LegalServiceId}");
        Assert.Equal(0, details.GetProperty("eligibleLawyerCount").GetInt32());
        Assert.Empty(details.GetProperty("eligibleLawyers").EnumerateArray());
        // The ordinary Admin update repairs the legacy ambiguity to exactly one selected area.
        Assert.Equal(HttpStatusCode.OK, (await _client.PutAsJsonAsync($"/api/lawyers/{_lawyerId}", Payload())).StatusCode);
        db.ChangeTracker.Clear();
        Assert.Single(await db.LawyerSpecializations.Where(link => link.LawyerId == _lawyerId).ToListAsync());
    }

    private sealed class TestMatcher(Func<RecommendationRequest, RecommendationResponse> respond) : HttpMessageHandler
    {
        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            var input = await request.Content!.ReadFromJsonAsync<RecommendationRequest>(cancellationToken: ct);
            return new(HttpStatusCode.OK) { Content = JsonContent.Create(respond(input!)) };
        }
    }

    [Theory]
    [InlineData(true)] [InlineData(false)]
    public async Task HttpWorkflowRestoresByIdCompletesAndRejectsDuplicateApproval(bool preferredDate)
    {
        SignIn("Admin");
        using var scope = _app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        db.Users.Add(new() { UserId = 42, Name = "Test Customer", Email = "customer@example.test", Role = "Customer" });
        await db.SaveChangesAsync();
        var response = await _client.PostAsJsonAsync("/api/lawyer-recommendations", new
        {
            clientId = 42, requirement = "Land ownership dispute", date = preferredDate ? _date : (DateOnly?)null
        });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var prepared = await response.Content.ReadFromJsonAsync<RecommendationResponse>();
        Assert.Equal("AWAITING_APPROVAL", prepared!.Status);
        Assert.Empty(db.Appointments);
        var id = prepared.WorkflowId!.Value;
        for (var refresh = 0; refresh < 2; refresh++)
        {
            var restored = await _client.GetFromJsonAsync<RecommendationResponse>($"/api/lawyer-recommendations/{id}");
            Assert.Equal(id, restored!.WorkflowId); Assert.Equal("AWAITING_APPROVAL", restored.Status);
        }
        Assert.Equal(1, await db.LawyerRecommendationWorkflows.CountAsync());
        var recordedSlots = await _client.GetFromJsonAsync<List<LegalService.API.DTOs.Appointments.AvailabilitySlotResponse>>($"/api/lawyers/{_lawyerId}/availability?date={_date:yyyy-MM-dd}");
        var slot = Assert.Single(recordedSlots!);
        var selection = new { lawyerId = _lawyerId, customerId = Guid.Parse("00000000-0000-0000-0000-00000000002a"), slotId = slot.SlotId };
        Assert.Equal(HttpStatusCode.OK, (await _client.PutAsJsonAsync($"/api/lawyer-recommendations/{id}/review", new { clientId = 42, lawyerId = _lawyerId, slotId = slot.SlotId, bookingDate = _date, stage = "APPOINTMENT" })).StatusCode);
        var approval = await _client.PostAsJsonAsync($"/api/lawyer-recommendations/{id}/approve", selection);
        Assert.Equal(HttpStatusCode.OK, approval.StatusCode);
        var completed = await approval.Content.ReadFromJsonAsync<RecommendationResponse>();
        Assert.Equal("ACTION_COMPLETED", completed!.Status); Assert.NotNull(completed.AppointmentId);
        var completedRestored = await _client.GetFromJsonAsync<RecommendationResponse>($"/api/lawyer-recommendations/{id}");
        Assert.Equal(completed.AppointmentId, completedRestored!.AppointmentId);
        Assert.Equal("ACTION_COMPLETED", completedRestored.Status);
        Assert.Equal(HttpStatusCode.Conflict, (await _client.PostAsJsonAsync($"/api/lawyer-recommendations/{id}/approve", selection)).StatusCode);
        Assert.Equal(1, await db.Appointments.CountAsync());
    }

    [Theory] [InlineData(null, 401)] [InlineData("Customer", 403)] [InlineData("Lawyer", 403)] [InlineData("Clerk", 403)]
    public async Task WeeklyScheduleAndLeaveEndpointsEnforceAdminAuthorization(string? role, int status)
    {
        if (role is not null) SignIn(role);
        var path = $"/api/lawyers/{_lawyerId}";
        foreach (var response in new[] {
            await _client.GetAsync(path + "/working-schedule"),
            await _client.PutAsJsonAsync(path + "/working-schedule", new { }),
            await _client.GetAsync(path + "/unavailability"),
            await _client.PostAsJsonAsync(path + "/unavailability", new { }),
            await _client.PutAsJsonAsync(path + $"/unavailability/{Guid.NewGuid()}", new { }),
            await _client.DeleteAsync(path + $"/unavailability/{Guid.NewGuid()}") }) Assert.Equal(status, (int)response.StatusCode);
    }

    [Fact] public async Task ScheduleAndLeaveHttpCrudDerivesSlotsAndReturnsStructuredAppointmentConflict()
    {
        SignIn("Admin"); var path = $"/api/lawyers/{_lawyerId}";
        var schedule = new LegalService.API.DTOs.Scheduling.ScheduleRequest { Days = Enumerable.Range(0, 7).Select(day => new LegalService.API.DTOs.Scheduling.WorkingDayDto((DayOfWeek)day, day == (int)_date.DayOfWeek, new(9, 0), new(10, 0))).ToList() };
        Assert.Equal(HttpStatusCode.OK, (await _client.PutAsJsonAsync(path + "/working-schedule", schedule)).StatusCode);
        var first = await _client.GetFromJsonAsync<LegalService.API.DTOs.Scheduling.AvailableSlotsResponse>(path + $"/available-slots?date={_date:yyyy-MM-dd}");
        Assert.Equal(2, first!.AvailableSlots.Count);
        Assert.Equal(HttpStatusCode.BadRequest, (await _client.GetAsync(path + "/available-slots")).StatusCode);
        var payload = new LegalService.API.DTOs.Scheduling.UnavailabilityRequest { StartDateTime = _date.ToDateTime(new(9, 0)), EndDateTime = _date.ToDateTime(new(9, 30)), Reason = "Court" };
        var added = await _client.PostAsJsonAsync(path + "/unavailability", payload); Assert.Equal(HttpStatusCode.OK, added.StatusCode);
        var leave = (await added.Content.ReadFromJsonAsync<LegalService.API.DTOs.Scheduling.UnavailabilityResponse>())!;
        Assert.Single((await _client.GetFromJsonAsync<LegalService.API.DTOs.Scheduling.AvailableSlotsResponse>(path + $"/available-slots?date={_date:yyyy-MM-dd}"))!.AvailableSlots);
        payload.Reason = "Training"; Assert.Equal(HttpStatusCode.OK, (await _client.PutAsJsonAsync(path + $"/unavailability/{leave.Id}", payload)).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await _client.DeleteAsync(path + $"/unavailability/{leave.Id}")).StatusCode);
        using var scope = _app.Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        db.Users.Add(new() { UserId = 42, Name = "Customer", Email = "scheduling-customer@test.local", Role = "Customer" }); await db.SaveChangesAsync();
        var booked = await _client.PostAsJsonAsync("/api/appointments", new { lawyerId = _lawyerId, customerId = Guid.Parse("00000000-0000-0000-0000-00000000002a"), slotId = first.AvailableSlots[0].SlotId });
        Assert.Equal(HttpStatusCode.Created, booked.StatusCode);
        var conflict = await _client.PostAsJsonAsync(path + "/unavailability", payload); Assert.Equal(HttpStatusCode.Conflict, conflict.StatusCode);
        var details = await conflict.Content.ReadFromJsonAsync<JsonElement>(); Assert.Equal(1, details.GetProperty("conflicts").GetArrayLength()); Assert.Equal("2030-01-05", details.GetProperty("conflicts")[0].GetProperty("date").GetString());
        var stale = await _client.PostAsJsonAsync("/api/appointments", new { lawyerId = _lawyerId, customerId = Guid.Parse("00000000-0000-0000-0000-00000000002a"), slotId = first.AvailableSlots[0].SlotId }); Assert.Equal(HttpStatusCode.Conflict, stale.StatusCode);
    }

    public async Task DisposeAsync()
    {
        _client?.Dispose();
        if (_app != null) await _app.DisposeAsync();
    }
}
