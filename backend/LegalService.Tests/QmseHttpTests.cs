using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using LegalService.API.Data;
using LegalService.API.Services.Workforce;
namespace LegalService.Tests;
public sealed partial class LawyerManagementHttpTests
{
    [Fact] public async Task Qmse_TC_C108_DuplicateLicenseReturns409WithoutInsertion()
    {
        SignIn("Admin"); var payload=Payload(); payload.LicenseNumber="bar-1";
        Assert.Equal(HttpStatusCode.Conflict,(await _client.PostAsJsonAsync("/api/lawyers",payload)).StatusCode);
        using var scope=_app.Services.CreateScope(); Assert.Single(await scope.ServiceProvider.GetRequiredService<ApplicationDbContext>().Lawyers.ToListAsync());
    }
    [Fact] public async Task Qmse_TC_C110_UnknownSpecializationReturns400WithoutInsertion()
    {
        SignIn("Admin"); var payload=Payload(); payload.SpecializationId=9999;
        Assert.Equal(HttpStatusCode.BadRequest,(await _client.PostAsJsonAsync("/api/lawyers",payload)).StatusCode);
        using var scope=_app.Services.CreateScope(); Assert.Single(await scope.ServiceProvider.GetRequiredService<ApplicationDbContext>().Lawyers.ToListAsync());
    }
    [Theory] [InlineData(19)] [InlineData(20)] [InlineData(21)]
    public void Qmse_TC_C112_CurrentCapacityRulesAtReportedHeadroom(int headroom)
    {
        var assessment=WorkforceAnalysisService.Assess(2,100-headroom,0,100,0,new WorkforceOptions());
        Assert.Equal("WATCH",assessment.Status); // Current 0.75 watch ratio; no 20% hiring trigger.
    }
    [Theory] [InlineData("missing")] [InlineData("invalid")] [InlineData("expired")] [InlineData("tampered")]
    public async Task Qmse_TC_C4_09_JwtAuthenticationRejectsMissingInvalidExpiredAndTampered(string kind)
    {
        SignIn(null); string? token=null;
        if(kind=="invalid") token="invalid.jwt.value";
        if(kind=="expired") token=new JwtSecurityTokenHandler().WriteToken(new JwtSecurityToken("member1-tests","member1-tests",[new Claim(ClaimTypes.Role,"Admin")],DateTime.UtcNow.AddDays(-2),DateTime.UtcNow.AddDays(-1),new SigningCredentials(new SymmetricSecurityKey(Encoding.UTF8.GetBytes(Key)),SecurityAlgorithms.HmacSha256)));
        if(kind=="tampered") { SignIn("Admin"); var real=_client.DefaultRequestHeaders.Authorization!.Parameter!; var parts=real.Split('.'); parts[2]=(parts[2][0]=='A'?'B':'A')+parts[2][1..]; token=string.Join('.',parts); }
        _client.DefaultRequestHeaders.Authorization=token==null?null:new AuthenticationHeaderValue("Bearer",token);
        var response=await _client.PostAsJsonAsync("/api/lawyers",Payload()); Assert.Equal(HttpStatusCode.Unauthorized,response.StatusCode);
        var body=await response.Content.ReadAsStringAsync(); Assert.DoesNotContain(Key,body); Assert.DoesNotContain("StackTrace",body);
    }
    [Fact] public async Task Qmse_SqlLikeSearchDoesNotReturnAllRecordsOrMutateData()
    {
        SignIn("Admin"); var response=await _client.GetAsync("/api/lawyers/search?search="+Uri.EscapeDataString("' OR 1=1; DROP TABLE Lawyers;--"));
        Assert.Equal(HttpStatusCode.OK,response.StatusCode);
        using var scope=_app.Services.CreateScope(); Assert.Single(await scope.ServiceProvider.GetRequiredService<ApplicationDbContext>().Lawyers.ToListAsync());
        // InMemory provider: this is input handling evidence, not relational SQL-injection proof.
    }
    [Fact] public async Task Qmse_TC_C3_11_CustomerCannotApproveDocumentation()
    {
        using(var scope=_app.Services.CreateScope()) { var db=scope.ServiceProvider.GetRequiredService<ApplicationDbContext>(); db.DocumentationRequests.Add(new(){RequestId=12,CustomerId=42,ServiceId=1,DocumentType="Synthetic",Status="PENDING"}); await db.SaveChangesAsync(); }
        SignIn("Customer");
        Assert.Equal(HttpStatusCode.Forbidden,(await _client.PutAsJsonAsync("/api/documentation-requests/12/status",new {status="COMPLETED"})).StatusCode);
        using(var scope=_app.Services.CreateScope()) Assert.Equal("PENDING",(await scope.ServiceProvider.GetRequiredService<ApplicationDbContext>().DocumentationRequests.FindAsync(12))!.Status);
    }
    [Fact] public async Task Qmse_TC_C4_11_CustomerCannotApproveLawyerWorkflow()
    {
        SignIn("Customer");
        Assert.Equal(HttpStatusCode.Forbidden,(await _client.PostAsJsonAsync($"/api/lawyer-recommendations/{Guid.NewGuid()}/approve",new {})).StatusCode);
    }
    [QmseHostFact] public async Task Qmse_LocalEvidenceHost()
    {
        using(var scope=_app.Services.CreateScope()) { var db=scope.ServiceProvider.GetRequiredService<ApplicationDbContext>(); db.Users.Add(new(){UserId=42,Name="Synthetic QMSE Customer",Email="qmse-customer@example.test",Role="Customer"}); await db.SaveChangesAsync(); }
        SignIn("Admin"); var directory=Environment.GetEnvironmentVariable("QMSE_HOST_CONTROL")!;
        Directory.CreateDirectory(directory); var ready=Path.Combine(directory,"ready.json");
        await File.WriteAllTextAsync(ready,JsonSerializer.Serialize(new {baseUrl=_client.BaseAddress!.ToString(),token=_client.DefaultRequestHeaders.Authorization!.Parameter}));
        var stop=Path.Combine(directory,"stop"); var until=DateTime.UtcNow.AddMinutes(6);
        while(!File.Exists(stop) && DateTime.UtcNow<until) await Task.Delay(500);
    }
}

public sealed class QmseHostFactAttribute : FactAttribute { public QmseHostFactAttribute() { if(Environment.GetEnvironmentVariable("QMSE_START_EVIDENCE_HOST")!="1") Skip="Opt-in local host for scanner/load tools; excluded from functional totals."; } }
