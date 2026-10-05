using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text;
using LegalService.API.Data;
using LegalService.API.DTOs.Workforce;
using LegalService.API.Infrastructure;
using LegalService.API.Interfaces;
using LegalService.API.Models.Entities;
using LegalService.API.Services;
using LegalService.API.Services.Workforce;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;
namespace LegalService.Tests;
public sealed class WorkforceDemoHttpTests
{
    [Theory] [InlineData(null, 401)] [InlineData("Customer", 403)] [InlineData("Lawyer", 403)] [InlineData("Admin", 200)]
    public async Task DevelopmentRoutesRequireAdminAndValidateScenario(string? role, int expected)
    {
        const string key = "workforce-demo-test-only-signing-key-123456789012345";
        var builder = WebApplication.CreateBuilder(new WebApplicationOptions { EnvironmentName = "Development" }); builder.Logging.ClearProviders(); builder.WebHost.UseUrls("http://127.0.0.1:0");
        // A single options instance keeps the scoped demo and analysis contexts on one store.
        var store = Guid.NewGuid().ToString(); builder.Services.AddDbContext<ApplicationDbContext>(options => options.UseInMemoryDatabase(store));
        builder.Services.AddSingleton(TimeProvider.System); builder.Services.Configure<WorkforceOptions>(_ => { });
        builder.Services.AddScoped<WorkforceSettingsService>(); builder.Services.AddScoped<WorkforceAnalysisService>(); builder.Services.AddScoped<WorkforceDemoService>(); builder.Services.AddScoped<ICareerService, CareerService>();
        builder.Services.AddExceptionHandler<ApiExceptionHandler>(); builder.Services.AddProblemDetails();
        builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(options => options.TokenValidationParameters = new() { ValidateIssuer = false, ValidateAudience = false, IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)) }); builder.Services.AddAuthorization(options => options.AddPolicy("UserOrAi", policy => policy.RequireAuthenticatedUser()));
        await using var app = builder.Build(); app.UseExceptionHandler(); app.UseAuthentication(); app.UseAuthorization(); app.MapWorkforceDemoEndpoints(); await app.StartAsync();
        using var client = new HttpClient { BaseAddress = new(app.Services.GetRequiredService<IServer>().Features.Get<IServerAddressesFeature>()!.Addresses.Single()) };
        if (role != null) { var token = new JwtSecurityToken(claims: [new(ClaimTypes.NameIdentifier, "1"), new(ClaimTypes.Role, role)], expires: DateTime.UtcNow.AddMinutes(5), signingCredentials: new(new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)), SecurityAlgorithms.HmacSha256)); client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", new JwtSecurityTokenHandler().WriteToken(token)); }
        Assert.Equal(expected, (int)(await client.GetAsync("/api/dev/workforce-demo")).StatusCode);
        if (role == "Admin")
        {
            using (var scope = app.Services.CreateScope()) { var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>(); db.Specializations.Add(new Specialization { Name = "Criminal Law" }); await db.SaveChangesAsync(); }
            Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/dev/workforce-demo/apply", new { scenario = "not-a-scenario" })).StatusCode);
            var result = await client.PostAsJsonAsync("/api/dev/workforce-demo/apply", new { scenario = "RECRUITMENT_NEEDED" }); Assert.Equal(HttpStatusCode.OK, result.StatusCode);
            var data = await result.Content.ReadFromJsonAsync<WorkforceDemoResponse>(); Assert.NotNull(data!.PracticeAreaId);
            Assert.Equal(HttpStatusCode.OK, (await client.PostAsync("/api/dev/workforce-demo/reset", null)).StatusCode);
        }
        else
        {
            Assert.Equal(expected, (int)(await client.PostAsJsonAsync("/api/dev/workforce-demo/apply", new { scenario = "RECRUITMENT_NEEDED" })).StatusCode);
            Assert.Equal(expected, (int)(await client.PostAsync("/api/dev/workforce-demo/reset", null)).StatusCode);
        }
    }
}
