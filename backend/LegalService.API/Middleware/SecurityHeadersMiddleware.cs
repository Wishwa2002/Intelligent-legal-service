namespace LegalService.API.Middleware;

/// <summary>Apply a MIME-sniffing guard to success, error and authentication responses.</summary>
public sealed class SecurityHeadersMiddleware(RequestDelegate next)
{
    public Task InvokeAsync(HttpContext context)
    {
        context.Response.OnStarting(() =>
        {
            context.Response.Headers["X-Content-Type-Options"] = "nosniff";
            return Task.CompletedTask;
        });
        return next(context);
    }
}
