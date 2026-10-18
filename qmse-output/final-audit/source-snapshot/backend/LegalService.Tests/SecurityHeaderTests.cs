// AI-assisted regression: real loopback HTTP server, no database/provider requests.
using LegalService.API.Middleware;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
namespace LegalService.Tests;
public sealed class SecurityHeaderTests
{
    [Theory][InlineData("/ok",200)][InlineData("/unauthorized",401)][InlineData("/missing",404)][InlineData("/error",500)]
    public async Task NosniffIsAppliedToAllResponseKinds(string path,int status)
    {
        var builder=WebApplication.CreateBuilder();builder.Logging.ClearProviders();builder.WebHost.UseUrls("http://127.0.0.1:0");
        await using var app=builder.Build();app.UseMiddleware<SecurityHeadersMiddleware>();
        app.Use(async(context,next)=>{try{await next(context);}catch(InvalidOperationException){context.Response.StatusCode=500;await context.Response.WriteAsync("Safe synthetic error");}});
        app.MapGet("/ok",()=>"Synthetic");app.MapGet("/unauthorized",()=>Microsoft.AspNetCore.Http.Results.Unauthorized());
        app.MapGet("/error",(Microsoft.AspNetCore.Http.HttpContext c)=>{throw new InvalidOperationException("Synthetic");});
        await app.StartAsync();var url=app.Services.GetRequiredService<IServer>().Features.Get<IServerAddressesFeature>()!.Addresses.Single();
        using var client=new HttpClient();using var response=await client.GetAsync(url+path);Assert.Equal(status,(int)response.StatusCode);Assert.Equal("nosniff",Assert.Single(response.Headers.GetValues("X-Content-Type-Options")));await app.StopAsync();
    }
}
