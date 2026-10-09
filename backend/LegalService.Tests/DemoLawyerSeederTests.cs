using LegalService.API.Authentication.Services;
using LegalService.API.Data;
using LegalService.API.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace LegalService.Tests;

public class DemoLawyerSeederTests
{
    private static readonly string[] CategoryNames =
    [
        "Corporate & Commercial Law", "Real Estate & Property Law", "Labour & Employment Law",
        "Criminal Law", "Tax Law"
    ];

    [Fact]
    public async Task SeedsThirtyLawyersWithRecurringSchedulesAndAppointmentSnapshotsWithoutDuplicates()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options;
        await using var db = new ApplicationDbContext(options);
        db.Specializations.AddRange(CategoryNames.Select((name, index) => new Specialization
        {
            SpecializationId = index + 1, Name = name
        }));
        db.Lawyers.Add(new Lawyer { LawyerId = Guid.NewGuid(), Name = "Existing Lawyer",
            Email = "existing@example.org", LicenseNumber = "EXISTING", Status = "Active" });
        await db.SaveChangesAsync();
        var today = new DateOnly(2030, 5, 1);
        var passwords = new TestPasswords();

        var first = await DemoLawyerSeeder.SeedAsync(db, passwords, today);
        var second = await DemoLawyerSeeder.SeedAsync(db, passwords, today);
        var demo = await db.Lawyers.Where(l => l.LicenseNumber.StartsWith("ILS/LAW/"))
            .Include(l => l.LawyerSpecializations).ToListAsync();

        Assert.Equal(30, first.LawyersCreated);
        Assert.Equal(25, first.ServicesCreated);
        Assert.Equal(17, first.AvailabilitiesCreated);
        Assert.Equal(17, first.SlotsCreated);
        Assert.True(first.CustomerCreated);
        Assert.Equal(0, second.LawyersCreated);
        Assert.Equal(0, second.ServicesCreated);
        Assert.Equal(0, second.AvailabilitiesCreated);
        Assert.Equal(0, second.SlotsCreated);
        Assert.False(second.CustomerCreated);
        Assert.Equal(30, demo.Count);
        Assert.Equal(31, await db.Lawyers.CountAsync());
        Assert.Equal(30, demo.Select(l => l.Email).Distinct().Count());
        Assert.Equal(30, demo.Select(l => l.LicenseNumber).Distinct().Count());
        Assert.All(demo, lawyer => Assert.DoesNotContain("Demo", lawyer.Name));
        Assert.All(demo, lawyer => Assert.DoesNotContain("DEMO", lawyer.LicenseNumber));
        Assert.All(demo, l => Assert.Single(l.LawyerSpecializations));
        Assert.All(demo.SelectMany(l => l.LawyerSpecializations), link =>
            Assert.Contains(link.SpecializationId, db.Specializations.Select(s => s.SpecializationId)));
        var categoryIds = db.Specializations.ToDictionary(s => s.Name, s => s.SpecializationId);
        Assert.All(CategoryNames, name => Assert.Equal(6, demo.Count(l =>
            l.LawyerSpecializations.Single().SpecializationId == categoryIds[name])));
        Assert.Equal(29, demo.Count(l => l.Status == "Active"));
        Assert.Equal(6, demo.Count(l => l.Status == "Active" && l.LawyerSpecializations.Single().SpecializationId == 1));
        Assert.Equal(5, demo.Count(l => l.Status == "Active" && l.LawyerSpecializations.Single().SpecializationId == 5));
        Assert.Equal(17, await db.LawyerAvailabilities.CountAsync());
        Assert.Equal(210, await db.LawyerWorkingSchedules.CountAsync());
        Assert.Equal(2, await db.LawyerUnavailabilities.CountAsync());
        Assert.All(db.LawyerUnavailabilities, leave => Assert.DoesNotContain("Scheduling demo", leave.Reason));
        Assert.All(db.Appointments, appointment => Assert.Null(appointment.Description));
        Assert.Equal(17, await db.Appointments.CountAsync());
        Assert.Equal(17, await db.AvailabilitySlots.CountAsync());
        Assert.Equal(25, await db.LegalServices.CountAsync());
        Assert.Equal(0, await db.LawyerLegalServices.CountAsync());
        Assert.All(db.LegalServices, service =>
        {
            Assert.NotEmpty(service.Description);
            Assert.Contains(service.Category, CategoryNames);
        });
        Assert.All(CategoryNames, name => Assert.Equal(5, db.LegalServices.Count(service => service.Category == name)));
        Assert.Equal(25, db.LegalServices.Select(service => service.ServiceName).Distinct().Count());
        Assert.All(db.LawyerAvailabilities, a => Assert.Contains(a.LawyerId, demo.Select(l => l.LawyerId)));
        Assert.All(db.AvailabilitySlots, s => Assert.Contains(s.AvailabilityId,
            db.LawyerAvailabilities.Select(a => a.AvailabilityId)));
        Assert.All(db.LawyerAvailabilities, a => Assert.True(a.Date > today));
        Assert.True(db.LawyerAvailabilities.Select(a => a.StartTime).Distinct().Count() > 1);
        Assert.Equal(first.CustomerId, second.CustomerId);
        Assert.Equal("demo.customer@example.test", db.Users.Single(u => u.Role == "Customer").Email);
        Assert.All(db.Users, u => Assert.StartsWith("hashed:", u.PasswordHash));
    }

    [Fact]
    public async Task NormalizesOnlyLegacySyntheticIdentityTextAndPreservesManualEdits()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options;
        await using var db = new ApplicationDbContext(options);
        db.Specializations.Add(new Specialization { Name = "Criminal Law" });
        await db.SaveChangesAsync();
        var today = new DateOnly(2030, 5, 1);
        await DemoLawyerSeeder.SeedAsync(db, new TestPasswords(), today);
        var lawyers = await db.Lawyers.ToDictionaryAsync(lawyer => lawyer.Email!);
        var accounts = await db.Users.Where(user => user.Role == "Lawyer")
            .ToDictionaryAsync(user => user.Email);
        var first = lawyers["lawyer01@example.test"];
        var editedName = lawyers["lawyer02@example.test"];
        var editedLicense = lawyers["lawyer10@example.test"];
        var firstId = first.LawyerId;
        first.Name = "Demo Attorney Nimal Perera";
        first.LicenseNumber = "DEMO/LAW/0001";
        accounts[first.Email!].Name = first.Name;
        editedName.Name = "Anjali Fernando";
        editedName.LicenseNumber = "DEMO/LAW/0002";
        accounts[editedName.Email!].Name = "Demo Attorney Anjali Fernando";
        editedLicense.Name = "Demo Attorney Nirosha Wijesinghe";
        editedLicense.LicenseNumber = "/LAW/0010";
        accounts[editedLicense.Email!].Name = editedLicense.Name;
        await db.SaveChangesAsync();

        var result = await DemoLawyerSeeder.NormalizeSyntheticIdentitiesAsync(db);
        var again = await DemoLawyerSeeder.NormalizeSyntheticIdentitiesAsync(db);
        Assert.Equal(new SyntheticIdentityResult(2, 2, 3), result);
        Assert.Equal(new SyntheticIdentityResult(0, 0, 0), again);
        Assert.Equal(firstId, first.LawyerId);
        Assert.Equal("Nimal Perera", first.Name);
        Assert.Equal("ILS/LAW/0001", first.LicenseNumber);
        Assert.Equal("Anjali Fernando", editedName.Name);
        Assert.Equal("ILS/LAW/0002", editedName.LicenseNumber);
        Assert.Equal("Nirosha Wijesinghe", editedLicense.Name);
        Assert.Equal("/LAW/0010", editedLicense.LicenseNumber);
        Assert.Equal("Nirosha Wijesinghe", accounts[editedLicense.Email!].Name);
        Assert.Equal(30, await db.Lawyers.CountAsync());
        Assert.Equal(30, await db.LawyerSpecializations.CountAsync());
        Assert.Equal(0, (await DemoLawyerSeeder.SeedAsync(db, new TestPasswords(), today)).LawyersCreated);
    }

    [Fact]
    public async Task UsesOnlyExistingPracticeAreasAndPreservesAdminServiceData()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options;
        await using var db = new ApplicationDbContext(options);
        var available = CategoryNames;
        db.Specializations.AddRange(available.Select((name, index) =>
            new Specialization { SpecializationId = index + 1, Name = name }));
        db.LegalServices.Add(new LegalService.API.Models.Entities.LegalService
        {
            ServiceName = "Contract Review", Description = "Admin-authored description",
            Category = "Corporate & Commercial Law"
        });
        await db.SaveChangesAsync();
        var today = new DateOnly(2030, 5, 1);
        var first = await DemoLawyerSeeder.SeedAsync(db, new TestPasswords(), today);
        var second = await DemoLawyerSeeder.SeedAsync(db, new TestPasswords(), today);
        Assert.Equal(30, first.LawyersCreated);
        Assert.Equal(24, first.ServicesCreated);
        Assert.Equal(0, second.LawyersCreated);
        Assert.Equal(0, second.ServicesCreated);
        Assert.Equal(5, await db.Specializations.CountAsync());
        Assert.Equal(25, await db.LegalServices.CountAsync());
        Assert.Equal("Admin-authored description",
            (await db.LegalServices.SingleAsync(service => service.ServiceName == "Contract Review")).Description);
        var links = await db.LawyerSpecializations.ToListAsync();
        Assert.All(db.Specializations, area => Assert.Equal(6,
            links.Count(link => link.SpecializationId == area.SpecializationId)));
        Assert.Equal(0, await db.LawyerLegalServices.CountAsync());
        var report = await DemoLawyerSeeder.ReportAsync(db);
        Assert.Equal(30, report.DemoLawyers);
        Assert.Equal(29, report.ActiveDemoLawyers);
        Assert.Equal(25, report.TotalLegalServices);
        Assert.Equal(17, report.DemoAvailabilityWindows);
        Assert.True(report.DemoBookableSlots > 174);
        var corporateId = db.Specializations.Single(area => area.Name == "Corporate & Commercial Law").SpecializationId;
        var corporateCandidates = await db.Lawyers.Where(lawyer => lawyer.Status == "Active" &&
            lawyer.LawyerSpecializations.Any(link => link.SpecializationId == corporateId)).ToListAsync();
        var date = today.AddDays(3);
        while (date.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday) date = date.AddDays(1);
        var snapshot = await new LegalService.API.Services.Scheduling.AvailabilityService(db).LoadAsync(date, date);
        Assert.Equal(6, corporateCandidates.Count);
        Assert.Equal(4, corporateCandidates.Count(l => snapshot.Day(l.LawyerId, date).AvailableSlots.Count > 0));
    }

    [Fact]
    public async Task RequiresAnExistingPracticeArea()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options;
        await using var db = new ApplicationDbContext(options);
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            DemoLawyerSeeder.SeedAsync(db, new TestPasswords(), new DateOnly(2030, 5, 1)));
        Assert.Empty(db.Lawyers);
    }

    [Fact] public async Task SchedulingOnlySeedPreservesEditedProfilesSchedulesAndIsIdempotent()
    {
        await using var db = new ApplicationDbContext(new DbContextOptionsBuilder<ApplicationDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        db.Specializations.AddRange(CategoryNames.Select((name, index) => new Specialization { SpecializationId = index + 1, Name = name })); await db.SaveChangesAsync();
        var date = new DateOnly(2030, 5, 1); await DemoLawyerSeeder.SeedAsync(db, new TestPasswords(), date);
        var profile = await db.Lawyers.SingleAsync(l => l.LicenseNumber == "ILS/LAW/0023");
        profile.Name = "Admin edited profile"; profile.LicenseNumber = "ADMIN/23";
        var row = await db.LawyerWorkingSchedules.FirstAsync(r => r.IsWorkingDay); row.EndTime = new(19, 0); row.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        var result = await DemoLawyerSeeder.SeedExistingSchedulesAsync(db, date);
        Assert.Equal(0, result.Windows); Assert.Equal(0, result.Slots);
        Assert.Equal("Admin edited profile", profile.Name); Assert.Equal("ADMIN/23", profile.LicenseNumber); Assert.Equal(new TimeOnly(19, 0), row.EndTime);
        Assert.Equal(17, await db.Appointments.CountAsync()); Assert.Equal(2, await db.LawyerUnavailabilities.CountAsync());
    }

    [Fact]
    public async Task SchedulingSeedRecognizesLegacyMarkersWithoutRewritingStoredRecords()
    {
        await using var db = new ApplicationDbContext(new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        db.Specializations.AddRange(CategoryNames.Select((name, index) => new Specialization { SpecializationId = index + 1, Name = name }));
        await db.SaveChangesAsync();
        var today = new DateOnly(2030, 5, 1);
        await DemoLawyerSeeder.SeedAsync(db, new TestPasswords(), today);
        var leave = await db.LawyerUnavailabilities.SingleAsync(l => l.IsFullDay);
        var day = DateOnly.FromDateTime(leave.StartDateTime);
        leave.Reason = $"[Scheduling demo 0 {day:yyyy-MM-dd}] Annual Leave";
        var appointments = await db.Appointments.Include(a => a.Lawyer).ToListAsync();
        foreach (var appointment in appointments)
            appointment.Description = $"[Scheduling demo {(appointment.Lawyer.Email == "lawyer03@example.test" ? 2 : 3)} {day:yyyy-MM-dd}] Development scheduling demonstration";
        await db.SaveChangesAsync();
        var result = await DemoLawyerSeeder.SeedExistingSchedulesAsync(db, today);
        Assert.Equal(0, result.Windows); Assert.Equal(0, result.Slots);
        Assert.StartsWith("[Scheduling demo 0", leave.Reason);
        Assert.Equal(2, await db.LawyerUnavailabilities.CountAsync());
        Assert.Equal(17, await db.Appointments.CountAsync());
    }

    private sealed class TestPasswords : IPasswordService
    {
        public string HashPassword(string password) => "hashed:" + password;
        public bool VerifyPassword(string password, string passwordHash) => passwordHash == HashPassword(password);
    }
}
