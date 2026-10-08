using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
namespace LegalService.API.Data;
/// <summary>Generate migrations without starting the application or running development seeds.</summary>
public sealed class ApplicationDbContextFactory : IDesignTimeDbContextFactory<ApplicationDbContext>
{
    public ApplicationDbContext CreateDbContext(string[] args)
    {
        var directory = Directory.GetCurrentDirectory();
        if (!File.Exists(Path.Combine(directory, "appsettings.json")) && Directory.Exists(Path.Combine(directory, "backend/LegalService.API")))
            directory = Path.Combine(directory, "backend/LegalService.API");
        var environment = Environment.GetEnvironmentVariable("DOTNET_ENVIRONMENT") ?? Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Development";
        var config = new ConfigurationBuilder().SetBasePath(directory)
            .AddJsonFile("appsettings.json", optional: true)
            .AddJsonFile($"appsettings.{environment}.json", optional: true).AddEnvironmentVariables().Build();
        return new(new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseNpgsql(config.GetConnectionString("DefaultConnection") ?? "Host=localhost;Database=legal_design;Username=postgres")
            .Options);
    }
}
