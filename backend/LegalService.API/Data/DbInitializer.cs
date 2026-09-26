using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using LegalService.API.Models.Entities;

namespace LegalService.API.Data;

public static class DbInitializer
{
    public static readonly string[] AllowedCategories = new[]
    {
        "Corporate & Commercial Law",
        "Criminal Law",
        "Real Estate & Property Law",
        "Labour & Employment Law",
        "Tax Law"
    };

    public static async Task SeedCategoriesAsync(ApplicationDbContext context)
    {
        var targetCategories = new Dictionary<string, string>
        {
            { "Corporate & Commercial Law", "Business registration, corporate governance, commercial contracts, and compliance." },
            { "Criminal Law", "Defense and prosecutorial assistance in criminal litigation." },
            { "Real Estate & Property Law", "Land registry, real estate transactions, leases, partition actions, and title disputes." },
            { "Labour & Employment Law", "Employment contracts, workplace disputes, labour tribunal advocacy, and severance." },
            { "Tax Law", "Direct and indirect taxation, corporate tax planning, revenue appeals, and audits." }
        };

        // If "Corporate Law" exists, rename to "Corporate & Commercial Law"
        var corp = await context.Specializations.FirstOrDefaultAsync(s => s.Name == "Corporate Law");
        if (corp != null)
        {
            corp.Name = "Corporate & Commercial Law";
            corp.Description = targetCategories["Corporate & Commercial Law"];
        }

        // If "Property Law" exists, rename to "Real Estate & Property Law"
        var prop = await context.Specializations.FirstOrDefaultAsync(s => s.Name == "Property Law");
        if (prop != null)
        {
            prop.Name = "Real Estate & Property Law";
            prop.Description = targetCategories["Real Estate & Property Law"];
        }

        await context.SaveChangesAsync();

        // Insert missing categories
        foreach (var kvp in targetCategories)
        {
            var exists = await context.Specializations.AnyAsync(s => s.Name == kvp.Key);
            if (!exists)
            {
                context.Specializations.Add(new Specialization
                {
                    Name = kvp.Key,
                    Description = kvp.Value
                });
            }
        }

        await context.SaveChangesAsync();

        // Ensure lawyers without a specialization are mapped to a valid category
        var unassignedLawyers = await context.Lawyers
            .Include(l => l.LawyerSpecializations)
            .Where(l => !l.LawyerSpecializations.Any())
            .ToListAsync();

        if (unassignedLawyers.Any())
        {
            var defaultSpec = await context.Specializations.FirstOrDefaultAsync(s => s.Name == "Corporate & Commercial Law")
                           ?? await context.Specializations.FirstAsync();

            foreach (var l in unassignedLawyers)
            {
                context.LawyerSpecializations.Add(new LawyerSpecialization
                {
                    LawyerId = l.LawyerId,
                    SpecializationId = defaultSpec.SpecializationId
                });
            }
            await context.SaveChangesAsync();
        }
    }
}
