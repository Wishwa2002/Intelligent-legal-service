using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using LegalService.API.Models.Entities;
using LegalService.API.Authentication.Services;

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

    // =========================================================
    // SEED SPECIALIZATIONS
    // =========================================================

    public static async Task SeedCategoriesAsync(
        ApplicationDbContext context)
    {
        var targetCategories = new Dictionary<string, string>
        {
            {
                "Corporate & Commercial Law",
                "Business registration, corporate governance, commercial contracts, and compliance."
            },
            {
                "Criminal Law",
                "Defense and prosecutorial assistance in criminal litigation."
            },
            {
                "Real Estate & Property Law",
                "Land registry, real estate transactions, leases, partition actions, and title disputes."
            },
            {
                "Labour & Employment Law",
                "Employment contracts, workplace disputes, labour tribunal advocacy, and severance."
            },
            {
                "Tax Law",
                "Direct and indirect taxation, corporate tax planning, revenue appeals, and audits."
            }
        };

        // Bootstrap only an empty catalog or the untouched
        // four EF seed records.
        //
        // Once initialized, Admin owns the catalog:
        // startup must not undo Admin CRUD changes.

        var catalog = await context.Specializations.ToListAsync();

        var initialNames = new Dictionary<int, string>
        {
            [1] = "Criminal Law",
            [2] = "Family Law",
            [3] = "Corporate Law",
            [4] = "Property Law"
        };
        var pristineEfCatalog = catalog.Count == 4 &&
            catalog.All(s => initialNames.TryGetValue(s.SpecializationId, out var name) && name == s.Name) &&
            !await context.Lawyers.AnyAsync() &&
            !await context.LawyerRecommendationWorkflows.AnyAsync() &&
            !await context.LegalServices.AnyAsync(s => s.Category == "Family Law" &&
                (s.LegalServiceId != 2 || s.ServiceName != "Divorce & Custody Filing"));

        if (catalog.Count != 0 && !pristineEfCatalog) return;

        if (pristineEfCatalog)
        {
            foreach (var (oldName, newName) in new[]
            {
                (
                    "Corporate Law",
                    "Corporate & Commercial Law"
                ),
                (
                    "Property Law",
                    "Real Estate & Property Law"
                )
            })
            {
                var category =
                    catalog.Single(s => s.Name == oldName);

                category.Name = newName;

                category.Description =
                    targetCategories[newName];

                // Existing service categories are name-based,
                // so preserve those associations.

                var services = await context.LegalServices
                    .Where(s => s.Category == oldName)
                    .ToListAsync();

                foreach (var service in services)
                {
                    service.Category = newName;
                }
            }
        }

        if (pristineEfCatalog)
{
            // Retire only untouched bootstrap data. Never remove an Admin-managed area
            // or rewrite existing practitioners, services, or recommendation history.
            var familyServices = await context.LegalServices
                .Where(s => s.Category == "Family Law")
                .ToListAsync();

            context.LegalServices.RemoveRange(familyServices);

            context.Specializations.Remove(
                catalog.Single(s => s.Name == "Family Law")
            );
        }

       
        foreach (var (name, description) in targetCategories)
        {
            if (!catalog.Any(s => s.Name == name))
            {
                context.Specializations.Add(
                    new Specialization
                    {
                        Name = name,
                        Description = description
                    }
                );
            }
        }

        await context.SaveChangesAsync();
    }

    // =========================================================
    // SEED DOCUMENTATION SERVICES
    // =========================================================

    public static async Task SeedDocumentationServicesAsync(
        ApplicationDbContext context)
    {
        var services =
            new List<(string Name, string Description, string RequiredDocs)>
            {
                (
                    "Property Transfer",
                    "Land registry deed conveyance, title verification, and official ownership transfer.",
                    "[\"NIC Copy\",\"Prior Title Deed Copy\",\"Survey Plan\",\"Sale Agreement Draft\"]"
                ),

                (
                    "Rental & Lease Agreement",
                    "Residential and commercial tenancy agreements, covenant clauses, and stamp duty calculation.",
                    "[\"NIC Copy\",\"Title Deed / Ownership Proof\",\"Tenancy Agreement Draft\"]"
                ),

                (
                    "Business & Corporate Registration",
                    "Company incorporation (Pvt Ltd), sole proprietorship, and partnership registration with ROC.",
                    "[\"NIC Copy\",\"Form 1 / Form 18\",\"Articles of Association\",\"Address Proof\"]"
                ),

                (
                    "Power of Attorney",
                    "General and Special Power of Attorney drafting, principal authorization, and notarial execution.",
                    "[\"NIC of Grantor\",\"NIC of Grantee\",\"Scope of Authority Document\",\"Deed / Asset Proof\"]"
                ),

                (
                    "Last Will and Testament",
                    "Estate planning, testamentary dispositions, executor appointment, and notarial attestation.",
                    "[\"NIC of Testator\",\"Schedule of Assets & Deeds\",\"Draft Will Agreement\",\"Beneficiary Details\"]"
                ),

                (
                    "Bail Application & Criminal Representation",
                    "Magistrate & High Court bail filings, police B-report review, and surety documentation.",
                    "[\"NIC of Accused\",\"Police B Report\",\"Affidavit of Sureties\",\"Surety Asset Proof\"]"
                ),

                (
                    "Title Search & Pedigree Due Diligence",
                    "Comprehensive 40-year land registry search, encumbrance verification, and title report issuance.",
                    "[\"Prior Title Deed Copy\",\"Survey Plan\",\"Land Registry Extract Request\",\"NIC Copy\"]"
                ),

                (
                    "Contract Vetting & Corporate NDA Drafting",
                    "Commercial contracts, confidentiality agreements, dispute indemnity, and termination clauses.",
                    "[\"Commercial Agreement Draft\",\"Business Registration\",\"NIC Copy\"]"
                ),

                (
                    "Testamentary & Probate Court Application",
                    "Probate petitioning, letters of administration, estate accounting, and court representation.",
                    "[\"Death Certificate\",\"Original Last Will\",\"Estate Asset Inventory\",\"NIC of Applicant\"]"
                ),

                (
                    "Mutual Divorce & Custody Settlement",
                    "Divorce by mutual consent, maintenance agreements, custody orders, and asset dissolution.",
                    "[\"Marriage Certificate\",\"Custody & Settlement Agreement\",\"NIC of Parties\",\"Child Birth Certificates\"]"
                ),

                (
                    "Commercial Lease Agreement",
                    "Office and industrial property leases, rent review mechanisms, and fit-out covenants.",
                    "[\"Title Deed Copy\",\"Local Council Assessment Receipt\",\"Draft Commercial Lease\",\"NIC Copy\"]"
                ),

                (
                    "Affidavit & Notary Services",
                    "Sworn affidavits of fact, missing documents declarations, and attestation before a JP or Notary.",
                    "[\"NIC of Deponent\",\"Completed Affidavit Draft\",\"Supporting Fact Documents\"]"
                )
            };

        foreach (var svc in services)
        {
            var existing =
                await context.DocumentationServices
                    .FirstOrDefaultAsync(
                        s => s.Name == svc.Name
                    );

            if (existing == null)
            {
                context.DocumentationServices.Add(
                    new DocumentationService
                    {
                        Name = svc.Name,
                        Description = svc.Description,
                        IsActive = true,
                        RequiredDocuments = svc.RequiredDocs,
                        CreatedAt = DateTime.UtcNow
                    }
                );
            }
        }

        await context.SaveChangesAsync();
    }

    // =========================================================
    // SEED ADMIN ACCOUNT
    // =========================================================

    public static async Task SeedStaffAccountsAsync(
        ApplicationDbContext context,
        IPasswordService passwordService,
        IConfiguration configuration)
    {
        // -----------------------------------------------------
        // Read Admin credentials from configuration/User Secrets
        // -----------------------------------------------------

        var adminEmail =
            configuration["SeedAccounts:AdminEmail"];

        var adminPassword =
            configuration["SeedAccounts:AdminPassword"];

        // -----------------------------------------------------
        // Do nothing if Admin credentials are not configured
        // -----------------------------------------------------

        if (string.IsNullOrWhiteSpace(adminEmail) ||
            string.IsNullOrWhiteSpace(adminPassword))
        {
            return;
        }

        adminEmail =
            adminEmail.Trim().ToLowerInvariant();

        // -----------------------------------------------------
        // Find Admin role
        // -----------------------------------------------------

        var adminRole = await context.Roles
            .FirstOrDefaultAsync(r =>
                r.Name.ToLower() == "admin");

        if (adminRole == null)
        {
            throw new InvalidOperationException(
                "Admin role was not found in the Roles table."
            );
        }

        // -----------------------------------------------------
        // Find existing Admin user
        // -----------------------------------------------------

        var adminUser = await context.Users
            .FirstOrDefaultAsync(u =>
                u.Email.ToLower() == adminEmail);

        // -----------------------------------------------------
        // Create Admin if missing
        // -----------------------------------------------------

        if (adminUser == null)
        {
            adminUser = new User
            {
                Name = "System Administrator",

                Email = adminEmail,

                Role = "Admin",

                PasswordHash =
                    passwordService.HashPassword(
                        adminPassword
                    ),

                CreatedAt = DateTime.UtcNow,

                UpdatedAt = DateTime.UtcNow
            };

            context.Users.Add(adminUser);

            // Save first so UserId gets generated.
            await context.SaveChangesAsync();
        }
        else
        {
            // Make sure existing account remains Admin.
            adminUser.Role = "Admin";

            // Keep password synchronized with configured
            // development Admin password.
            adminUser.PasswordHash =
                passwordService.HashPassword(
                    adminPassword
                );

            adminUser.UpdatedAt =
                DateTime.UtcNow;

            await context.SaveChangesAsync();
        }

        // -----------------------------------------------------
        // Ensure Admin UserRole mapping exists
        // -----------------------------------------------------

        var adminUserRoleExists =
            await context.UserRoles.AnyAsync(ur =>
                ur.UserId == adminUser.UserId &&
                ur.RoleId == adminRole.Id
            );

        if (!adminUserRoleExists)
        {
            var adminUserRole =
                new UserRole
                {
                    UserId = adminUser.UserId,
                    RoleId = adminRole.Id
                };

            context.UserRoles.Add(
                adminUserRole
            );

            await context.SaveChangesAsync();
        }

        Console.WriteLine(
            $"Admin seed account ready: {adminEmail}"
        );
    }
}