using System.Security.Claims;
using LegalService.API.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.EntityFrameworkCore;
namespace LegalService.API.Infrastructure;

// Re-check current account state, including tokens issued before deactivation/password setup.
public sealed class LawyerAccessFilter(ApplicationDbContext db) : IAsyncActionFilter
{
    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var principal = context.HttpContext.User;
        if (!principal.IsInRole("Lawyer")) { await next(); return; }
        var path = context.HttpContext.Request.Path.Value ?? "";
        if (path.Equals("/api/auth/login", StringComparison.OrdinalIgnoreCase)) { await next(); return; }
        if (!int.TryParse(principal.FindFirstValue(ClaimTypes.NameIdentifier), out var userId))
        { context.Result = new UnauthorizedObjectResult(new { message = "Your session is unavailable. Sign in again." }); return; }
        var user = await db.Users.AsNoTracking().SingleOrDefaultAsync(u => u.UserId == userId);
        var lawyer = await db.Lawyers.AsNoTracking().SingleOrDefaultAsync(l => l.UserId == userId);
        if (user?.Role != "Lawyer" || lawyer == null || lawyer.Status != "Active")
        { context.Result = new ObjectResult(new { message = "Your lawyer account is unavailable or inactive. Contact the administrator." }) { StatusCode = 403 }; return; }
        if (user.MustChangePassword && !path.Equals("/api/auth/change-password", StringComparison.OrdinalIgnoreCase))
        { context.Result = new ObjectResult(new { message = "Change your initial password before accessing lawyer services.", mustChangePassword = true }) { StatusCode = 403 }; return; }
        // The historical appointment API has broad administrative actions. Lawyers use the scoped API only.
        if (path.StartsWith("/api/appointments", StringComparison.OrdinalIgnoreCase) ||
            path.StartsWith("/api/auth/user/", StringComparison.OrdinalIgnoreCase))
        { context.Result = new ObjectResult(new { message = "Use your lawyer account endpoints to access your own data." }) { StatusCode = 403 }; return; }
        await next();
    }
}
