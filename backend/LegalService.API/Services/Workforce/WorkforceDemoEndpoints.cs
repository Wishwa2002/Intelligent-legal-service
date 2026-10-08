using LegalService.API.DTOs.Workforce;
using System.Security.Claims;
namespace LegalService.API.Services.Workforce;
public static class WorkforceDemoEndpoints
{
    public static void MapWorkforceDemoEndpoints(this WebApplication app)
    {
        if (!app.Environment.IsDevelopment()) return;
        var demo = app.MapGroup("/api/dev/workforce-demo").RequireAuthorization(policy => policy.RequireRole("Admin"));
        demo.MapGet("", () => Results.Ok(new { available = true, scenarios = WorkforceDemoService.Scenarios }));
        demo.MapPost("/apply", async (WorkforceDemoRequest request, WorkforceDemoService service, ClaimsPrincipal user, CancellationToken ct) =>
            Results.Ok(await service.ApplyAsync(request, WorkforceDemoService.AdminId(user), ct)));
        demo.MapPost("/reset", async (WorkforceDemoService service, ClaimsPrincipal user, CancellationToken ct) =>
            Results.Ok(await service.ResetAsync(WorkforceDemoService.AdminId(user), ct)));
    }
}
