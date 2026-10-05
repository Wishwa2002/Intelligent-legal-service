using LegalService.API.Authentication.Services;
using LegalService.API.Data;
using LegalService.API.Models.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Moq;

namespace LegalService.Tests;

public class DevelopmentAdminSeederTests
{
    private static ApplicationDbContext Database() => new(new DbContextOptionsBuilder<ApplicationDbContext>()
        .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
    private static IConfiguration Config(string? password = "synthetic-test-password") =>
        new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        { ["SeedAccounts:AdminEmail"] = " TEST-ADMIN@example.test ", ["SeedAccounts:AdminPassword"] = password }).Build();
    private static IHostEnvironment Environment(string name = "Development")
    {
        var mock = new Mock<IHostEnvironment>(); mock.SetupGet(x => x.EnvironmentName).Returns(name); return mock.Object;
    }

    [Fact]
    public async Task CreatesNormalizedAdminWithNormalHasherAndIsIdempotentWithoutClerkConfiguration()
    {
        await using var db = Database(); var hasher = new PasswordService();
        Assert.True(await DevelopmentAdminSeeder.SeedAsync(db, hasher, Config(), Environment()));
        var user = await db.Users.SingleAsync();
        Assert.Equal("test-admin@example.test", user.Email); Assert.Equal("Admin", user.Role);
        Assert.True(hasher.VerifyPassword("synthetic-test-password", user.PasswordHash!));
        var hash = user.PasswordHash;
        Assert.False(await DevelopmentAdminSeeder.SeedAsync(db, hasher, Config("different-test-password"), Environment()));
        Assert.Equal(hash, user.PasswordHash); Assert.Single(db.Users); Assert.Empty(db.Clerks);
    }

    [Theory]
    [InlineData("Production")]
    [InlineData("Staging")]
    public async Task RefusesNonDevelopment(string environment)
    {
        await using var db = Database();
        await Assert.ThrowsAsync<InvalidOperationException>(() => DevelopmentAdminSeeder.SeedAsync(db, new PasswordService(), Config(), Environment(environment)));
        Assert.Empty(db.Users);
    }

    [Fact]
    public async Task MissingCredentialsDoNotCreateAccount()
    {
        await using var db = Database();
        await Assert.ThrowsAsync<InvalidOperationException>(() => DevelopmentAdminSeeder.SeedAsync(db, new PasswordService(), Config(null), Environment()));
        Assert.Empty(db.Users);
    }

    [Fact]
    public async Task ExistingCustomerIsNotPromotedOrReset()
    {
        await using var db = Database();
        var existing = new User { Email = "test-admin@example.test", Role = "Customer", PasswordHash = "untouched" };
        db.Users.Add(existing); await db.SaveChangesAsync();
        await Assert.ThrowsAsync<InvalidOperationException>(() => DevelopmentAdminSeeder.SeedAsync(db, new PasswordService(), Config(), Environment()));
        Assert.Equal("Customer", existing.Role); Assert.Equal("untouched", existing.PasswordHash);
    }
}
