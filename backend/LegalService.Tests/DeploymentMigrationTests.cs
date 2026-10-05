using LegalService.API.Data;
using Microsoft.EntityFrameworkCore;

namespace LegalService.Tests;

public sealed class DeploymentMigrationTests
{
    [Fact]
    public void DeploymentStorageMigrationIsDiscoverableWithoutDatabaseConnection()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseNpgsql("Host=localhost;Database=unused;Username=unused;Password=unused")
            .Options;
        using var db = new ApplicationDbContext(options);
        Assert.Contains("20261006120000_PrepareDeploymentStorage", db.Database.GetMigrations());
    }
}
