using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using LegalService.API.Data;
using Microsoft.EntityFrameworkCore;

namespace LegalService.API.Authentication;

public static class RequestAccess
{
    public static int? UserId(ClaimsPrincipal user) =>
        int.TryParse(user.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;

    public static bool IsStaff(ClaimsPrincipal user) => user.IsInRole("Admin") || user.IsInRole("Clerk");

    public static bool IsInternal(HttpContext context, IConfiguration configuration)
    {
        var expected = configuration["AI_SERVICE_API_KEY"];
        var received = context.Request.Headers["X-AI-Service-Key"].ToString();
        return !string.IsNullOrEmpty(expected) && !string.IsNullOrEmpty(received) &&
            CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(expected), Encoding.UTF8.GetBytes(received));
    }

    public static async Task<bool> CanAccessDocumentationRequestAsync(
        HttpContext context, IConfiguration configuration, ApplicationDbContext db, int requestId)
    {
        if (IsInternal(context, configuration) || IsStaff(context.User)) return true;
        var userId = UserId(context.User);
        return userId is not null && await db.DocumentationRequests.AsNoTracking()
            .AnyAsync(r => r.RequestId == requestId && r.CustomerId == userId);
    }
}
