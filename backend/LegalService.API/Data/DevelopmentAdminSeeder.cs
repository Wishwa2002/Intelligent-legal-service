using LegalService.API.Authentication.Services;
using LegalService.API.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace LegalService.API.Data;

// Explicit local setup command only; never resets credentials or promotes an existing user.
public static class DevelopmentAdminSeeder
{
    public static async Task<bool> SeedAsync(ApplicationDbContext db, IPasswordService passwords,
        IConfiguration configuration, IHostEnvironment environment)
    {
        if (!environment.IsDevelopment())
            throw new InvalidOperationException("Admin development setup requires Development.");
        var email = configuration["SeedAccounts:AdminEmail"]?.Trim().ToLowerInvariant();
        var password = configuration["SeedAccounts:AdminPassword"];
        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
            throw new InvalidOperationException("Private development Admin configuration is required.");
        var existing = await db.Users.SingleOrDefaultAsync(u => u.Email.ToLower() == email);
        if (existing is not null)
        {
            if (existing.Role != "Admin")
                throw new InvalidOperationException("Existing account is not an Admin; setup will not change its role.");
            return false;
        }
        db.Users.Add(new User
        {
            Name = "Development Administrator", Email = email, Role = "Admin",
            PasswordHash = passwords.HashPassword(password)
        });
        await db.SaveChangesAsync();
        return true;
    }
}
