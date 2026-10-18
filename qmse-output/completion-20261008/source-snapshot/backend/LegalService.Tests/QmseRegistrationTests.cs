using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using LegalService.API.Data;
namespace LegalService.Tests;
public sealed partial class LawyerMobileHttpTests
{
    [LawyerMobilePostgresTheory] [InlineData(true)]
    public async Task Qmse_TC_C4_10_DuplicateRegistrationLeavesOneUser(bool _)
    {
        client.DefaultRequestHeaders.Authorization=null;
        var r=await client.PostAsJsonAsync("/api/auth/signup",new {fullName="Duplicate",email="A@EXAMPLE.TEST",password="SyntheticPass123!",role="Customer"});
        Assert.Equal(HttpStatusCode.BadRequest,r.StatusCode);
        using var scope=app.Services.CreateScope();var db=scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        Assert.Equal(1,await db.Users.CountAsync(u=>u.Email=="a@example.test"));
    }
}
