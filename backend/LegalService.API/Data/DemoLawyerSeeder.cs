using LegalService.API.Authentication.Services;
using LegalService.API.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace LegalService.API.Data;

/// <summary>Explicit, Development-only demonstration data. Never called during normal startup.</summary>
public static class DemoLawyerSeeder
{
    public const string DemoPassword = "DemoLawyer123!";
    public const string CustomerEmail = "demo.customer@example.test";

    private static readonly string[] Names =
    [
        "Nimal Perera", "Anjali Fernando", "Kavindu Silva", "Shalini Perera", "Tharshan Raj",
        "Dinuka Jayasinghe", "Ayesha Rahman", "Sivani Kumar", "Malith Gunawardena", "Nirosha Wijesinghe",
        "Arun Selvaratnam", "Hiruni de Silva", "Ruwan Jayawardene", "Meera Sivalingam", "Pasindu Ranasinghe",
        "Thilini Karunaratne", "Keshan Fernando", "Fathima Ismail", "Naveen Rajendran", "Chamara Dissanayake",
        "Dilani Wickramasinghe", "Suren Fernando", "Amaya Peiris", "Ishara Mendis", "Ramesh Thiruchelvam",
        "Sanduni Ekanayake", "Farhan Ahamed", "Kavitha Nadarajah", "Dulaj Rathnayake", "Menaka Rajan"
    ];

    private static readonly int[] Experience =
    [3, 10, 15, 7, 12, 2, 6, 11, 18, 5, 4, 9, 14, 7, 20, 2, 8, 13, 16, 5, 3, 7, 12, 17, 9, 4, 6, 11, 15, 19];

    private static readonly (string Name, string Profile)[] Categories =
    [
        ("Corporate & Commercial Law", "Corporate and commercial law practitioner handling business agreements, company matters, commercial contracts and regulatory compliance."),
        ("Real Estate & Property Law", "Property law practitioner handling title matters, land ownership disputes, leases, conveyancing and boundary disputes."),
        ("Labour & Employment Law", "Employment law practitioner handling workplace agreements, termination disputes, disciplinary matters and labour proceedings."),
        ("Criminal Law", "Criminal law practitioner handling defence, bail matters, court representation and related proceedings."),
        ("Tax Law", "Tax law practitioner advising on tax disputes, assessments, compliance matters and revenue appeals.")
    ];

    private static readonly string[] Qualifications =
    [
        "LL.B, Attorney-at-Law", "LL.B (Hons), Attorney-at-Law",
        "Attorney-at-Law", "LL.M, Attorney-at-Law"
    ];

    private static readonly Dictionary<string, (string Name, string Description)[]> ServiceTemplates = new(StringComparer.OrdinalIgnoreCase)
    {
        ["Corporate & Commercial Law"] =
        [
            ("Contract Review", "Review of commercial agreements, obligations, risk clauses and contractual terms."),
            ("Corporate Legal Consultation", "Advice on company governance, director duties and routine corporate matters."),
            ("Company Formation Advisory", "Guidance on incorporation steps, ownership structures and registration requirements."),
            ("Commercial Agreement Drafting", "Preparation of agreements for business transactions and commercial relationships."),
            ("Shareholder & Partnership Advisory", "Advice on shareholder rights, partnership terms and related business arrangements.")
        ],
        ["Criminal Law"] =
        [
            ("Criminal Defence Consultation", "Initial case review and legal advice for a criminal charge or investigation."),
            ("Bail Application Assistance", "Advice and preparation support for bail applications and related court processes."),
            ("Police Investigation Legal Advice", "Guidance on legal rights and procedure during a police investigation."),
            ("Court Representation Consultation", "Assessment of representation needs and preparation for criminal proceedings."),
            ("Criminal Appeal Consultation", "Review of judgments and advice on available criminal appeal options.")
        ],
        ["Real Estate & Property Law"] =
        [
            ("Land Ownership Dispute Consultation", "Advice on competing land claims, ownership evidence and dispute options."),
            ("Property Title Review", "Review of title documents, registry information and identified ownership risks."),
            ("Conveyancing Consultation", "Advice on legal steps and documents for a property transfer."),
            ("Lease Agreement Review", "Review of lease terms, tenant obligations and landlord rights."),
            ("Boundary Dispute Assistance", "Assessment of survey records and legal options for a boundary dispute.")
        ],
        ["Labour & Employment Law"] =
        [
            ("Employment Contract Review", "Review of employment terms, workplace obligations and contractual protections."),
            ("Wrongful Termination Consultation", "Advice on dismissal circumstances, notice requirements and available remedies."),
            ("Workplace Dispute Assistance", "Advice on workplace grievances, disciplinary processes and dispute resolution."),
            ("Labour Tribunal Consultation", "Assessment of labour tribunal claims and preparation requirements."),
            ("Employment Compliance Advisory", "Advice on employment policies, statutory duties and workplace compliance.")
        ],
        ["Tax Law"] =
        [
            ("Tax Dispute Consultation", "Assessment of a tax dispute and available administrative or legal responses."),
            ("Tax Assessment Review", "Review of tax assessments, supporting records and potential objections."),
            ("Tax Compliance Advisory", "Advice on filing obligations, records and tax compliance issues."),
            ("Revenue Appeal Consultation", "Guidance on appeal procedure and preparation of supporting tax documents."),
            ("Corporate Tax Advisory", "Advice on business tax obligations and corporate tax planning considerations.")
        ]
    };

    private static (string Name, string Description)[] ServicesFor(string category) =>
        ServiceTemplates.TryGetValue(category, out var services) ? services :
        [
            ($"{category} Consultation", $"Legal consultation on matters within {category}."),
            ($"{category} Case Assessment", $"Review of facts, documents and available legal options within {category}."),
            ($"{category} Document Review", $"Review of relevant legal documents and obligations within {category}."),
            ($"{category} Dispute Advice", $"Advice on dispute resolution and procedural steps within {category}."),
            ($"{category} Agreement Advice", $"Advice on drafting and reviewing relevant agreements within {category}.")
        ];

    private static string LawyerEmail(int number) => $"lawyer{number:00}@example.test";
    private static string LawyerLicense(int number) => $"ILS/LAW/{number:0000}";
    private static string LegacyLawyerLicense(int number) => $"DEMO/LAW/{number:0000}";

    public static async Task<SyntheticIdentityResult> NormalizeSyntheticIdentitiesAsync(
        ApplicationDbContext db, CancellationToken ct = default)
    {
        var emails = Enumerable.Range(1, Names.Length).Select(LawyerEmail).ToArray();
        var targetLicenses = Enumerable.Range(1, Names.Length).Select(LawyerLicense).ToArray();
        var lawyers = await db.Lawyers.Where(lawyer => lawyer.Email != null && emails.Contains(lawyer.Email))
            .ToListAsync(ct);
        var accounts = await db.Users.Where(user => emails.Contains(user.Email)).ToListAsync(ct);
        var licenseOwners = await db.Lawyers.AsNoTracking()
            .Where(lawyer => targetLicenses.Contains(lawyer.LicenseNumber))
            .Select(lawyer => new { lawyer.LawyerId, lawyer.LicenseNumber }).ToListAsync(ct);
        var namesChanged = 0;
        var licensesChanged = 0;
        var accountNamesChanged = 0;

        for (var number = 1; number <= Names.Length; number++)
        {
            var email = LawyerEmail(number);
            var lawyer = lawyers.SingleOrDefault(item => string.Equals(item.Email, email, StringComparison.OrdinalIgnoreCase));
            if (lawyer is null) continue;
            var account = accounts.SingleOrDefault(item => string.Equals(item.Email, email, StringComparison.OrdinalIgnoreCase));
            if (account is not null && account.Role != "Lawyer")
                throw new InvalidOperationException($"Synthetic lawyer account {number} has an unexpected role; no records were changed.");

            if (lawyer.Name.StartsWith("Demo Attorney ", StringComparison.Ordinal))
            {
                var name = lawyer.Name["Demo Attorney ".Length..].Trim();
                if (name.Length == 0)
                    throw new InvalidOperationException($"Synthetic lawyer {number} has no name after its prefix; no records were changed.");
                lawyer.Name = name;
                lawyer.UpdatedAt = DateTime.UtcNow;
                namesChanged++;
            }
            if (lawyer.LicenseNumber == LegacyLawyerLicense(number))
            {
                var replacement = LawyerLicense(number);
                if (licenseOwners.Any(owner => owner.LicenseNumber == replacement && owner.LawyerId != lawyer.LawyerId))
                    throw new InvalidOperationException($"Replacement license for synthetic lawyer {number} is already in use; no records were changed.");
                lawyer.LicenseNumber = replacement;
                lawyer.UpdatedAt = DateTime.UtcNow;
                licensesChanged++;
            }
            if (account is not null && account.Name.StartsWith("Demo Attorney ", StringComparison.Ordinal))
            {
                account.Name = lawyer.Name;
                account.UpdatedAt = DateTime.UtcNow;
                accountNamesChanged++;
            }
        }

        await db.SaveChangesAsync(ct);
        return new SyntheticIdentityResult(namesChanged, licensesChanged, accountNamesChanged);
    }

    public static async Task<DemoSeedResult> SeedAsync(ApplicationDbContext db, IPasswordService passwords,
        DateOnly today, CancellationToken ct = default)
    {
        var catalog = await db.Specializations.AsNoTracking().ToListAsync(ct);
        if (catalog.Count == 0)
            throw new InvalidOperationException("Create a Practice Area before running the demo seed.");
        var categories = Categories
            .Select(template => catalog.FirstOrDefault(area => area.Name.Equals(template.Name, StringComparison.OrdinalIgnoreCase)))
            .Where(area => area is not null).Select(area => area!)
            .Concat(catalog.Where(area => !Categories.Any(template =>
                template.Name.Equals(area.Name, StringComparison.OrdinalIgnoreCase))).OrderBy(area => area.Name))
            .ToArray();

        await using var transaction = db.Database.IsRelational() ? await db.Database.BeginTransactionAsync(ct) : null;
        await NormalizeSyntheticIdentitiesAsync(db, ct);
        var existing = await db.Lawyers
            .Include(l => l.LawyerSpecializations)
            .Where(l => l.Email != null && l.Email.EndsWith("@example.test") ||
                l.LicenseNumber.StartsWith("ILS/LAW/") || l.LicenseNumber.StartsWith("DEMO/LAW/"))
            .ToListAsync(ct);
        var users = await db.Users.Where(u => u.Email.EndsWith("@example.test")).ToListAsync(ct);
        var created = 0;
        var lawyerIds = new List<Guid>();
        var seededLawyers = new List<Lawyer>();

        for (var i = 0; i < Names.Length; i++)
        {
            var number = i + 1;
            var email = LawyerEmail(number);
            var license = LawyerLicense(number);
            var category = categories[i * categories.Length / Names.Length];
            var profile = Categories.FirstOrDefault(template =>
                template.Name.Equals(category.Name, StringComparison.OrdinalIgnoreCase)).Profile;
            var matches = existing.Where(l => string.Equals(l.Email, email, StringComparison.OrdinalIgnoreCase) ||
                string.Equals(l.LicenseNumber, license, StringComparison.OrdinalIgnoreCase) ||
                string.Equals(l.LicenseNumber, LegacyLawyerLicense(number), StringComparison.OrdinalIgnoreCase)).ToList();
            if (matches.Count > 1 || (matches.Count == 1 &&
                !string.Equals(matches[0].Email, email, StringComparison.OrdinalIgnoreCase)))
                throw new InvalidOperationException($"Demo identity {number} conflicts with an existing lawyer; no records were changed.");

            var lawyer = matches.SingleOrDefault();
            if (lawyer is null)
            {
                lawyer = new Lawyer
                {
                    LawyerId = Guid.NewGuid(), Name = Names[i], Email = email,
                    PhoneNumber = $"000-000-{number:0000}", Qualification = Qualifications[i % Qualifications.Length],
                    Experience = Experience[i], LicenseNumber = license,
                    ProfileDescription = profile ?? $"Legal practitioner handling matters within {category.Name}.",
                    Status = number == 30 ? "Inactive" : "Active",
                    CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
                };
                db.Lawyers.Add(lawyer);
                db.LawyerSpecializations.Add(new LawyerSpecialization
                {
                    LawyerId = lawyer.LawyerId,
                    SpecializationId = category.SpecializationId
                });
                existing.Add(lawyer);
                created++;
            }
            else if (lawyer.LawyerSpecializations.Count != 1)
                throw new InvalidOperationException($"Existing demo lawyer {number} has different data; no records were changed.");
            lawyerIds.Add(lawyer.LawyerId);
            seededLawyers.Add(lawyer);

            var matchingUsers = users.Where(u => string.Equals(u.Email, email, StringComparison.OrdinalIgnoreCase)).ToList();
            if (matchingUsers.Count > 1 || matchingUsers.Any(u => u.Role != "Lawyer" || u.Name != lawyer.Name))
                throw new InvalidOperationException($"Demo account {number} conflicts with an existing user; no records were changed.");
            if (matchingUsers.Count == 0)
            {
                var account = new User
                {
                    Name = lawyer.Name, Email = email, Role = "Lawyer", MustChangePassword = true,
                    PasswordHash = passwords.HashPassword(DemoPassword),
                    CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
                };
                db.Users.Add(account);
                users.Add(account);
            }
        }

        var customer = users.SingleOrDefault(u => string.Equals(u.Email, CustomerEmail, StringComparison.OrdinalIgnoreCase));
        if (customer is not null && (customer.Role != "Customer" || customer.Name != "Demo Customer"))
            throw new InvalidOperationException("The demo customer email belongs to another account; no records were changed.");
        var customerCreated = customer is null;
        if (customer is null)
        {
            customer = new User
            {
                Name = "Demo Customer", Email = CustomerEmail, Role = "Customer",
                PasswordHash = passwords.HashPassword(DemoPassword),
                CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
            };
            db.Users.Add(customer);
        }
        await db.SaveChangesAsync(ct);

        var existingServiceNames = (await db.LegalServices.AsNoTracking()
            .Select(service => service.ServiceName).ToListAsync(ct))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
        var servicesCreated = 0;
        foreach (var category in categories)
        {
            foreach (var template in ServicesFor(category.Name))
            {
                if (!existingServiceNames.Add(template.Name)) continue;
                db.LegalServices.Add(new LegalService.API.Models.Entities.LegalService
                {
                    ServiceName = template.Name, Description = template.Description,
                    Category = category.Name, CreatedAt = DateTime.UtcNow
                });
                servicesCreated++;
            }
        }
        await db.SaveChangesAsync(ct);

        var (addedAvailabilities, addedSlots) = await SeedSchedulingAsync(db, seededLawyers, customer.UserId, today, ct);
        if (transaction is not null) await transaction.CommitAsync(ct);

        // Appointment.CustomerId is a UUID even though User.UserId is an int. The existing
        // appointment service resolves a zero-prefixed UUID's final hexadecimal digits to UserId.
        var customerId = Guid.Parse($"00000000-0000-0000-0000-{customer.UserId:x12}");
        return new DemoSeedResult(created, servicesCreated, addedAvailabilities, addedSlots, customerCreated, customerId);
    }

    public static async Task<(int Windows, int Slots)> SeedExistingSchedulesAsync(ApplicationDbContext db, DateOnly today, CancellationToken ct = default)
    {
        var emails = Enumerable.Range(1, Names.Length).Select(LawyerEmail).ToArray();
        var lawyers = await db.Lawyers.Where(l => l.Email != null && emails.Contains(l.Email) && l.LicenseNumber.StartsWith("ILS/LAW/")).OrderBy(l => l.LicenseNumber).ToListAsync(ct);
        var recognized = lawyers.Where(l => Enumerable.Range(1, Names.Length).Any(n => l.Email == LawyerEmail(n) && l.LicenseNumber == LawyerLicense(n))).ToList();
        if (recognized.Count < 4) throw new InvalidOperationException("At least four recognized synthetic demo profiles are required; existing profiles were not changed.");
        var customer = await db.Users.SingleOrDefaultAsync(u => u.Email == CustomerEmail && u.Role == "Customer", ct)
            ?? throw new InvalidOperationException("A demo Customer is required; accounts were not changed.");
        await using var transaction = db.Database.IsRelational() ? await db.Database.BeginTransactionAsync(ct) : null;
        var result = await SeedSchedulingAsync(db, recognized, customer.UserId, today, ct);
        if (transaction is not null) await transaction.CommitAsync(ct);
        return result;
    }

    private static async Task<(int Windows, int Slots)> SeedSchedulingAsync(ApplicationDbContext db, IReadOnlyList<Lawyer> seededLawyers, int customerUserId, DateOnly today, CancellationToken ct)
    {
        var lawyerIds = seededLawyers.Select(l => l.LawyerId).ToArray();
        // Only untouched migration-generated rows for synthetic demo lawyers are initialized.
        // Admin-edited schedules and appointment intervals are preserved.
        var existingSchedules = await db.LawyerWorkingSchedules.Where(r => lawyerIds.Contains(r.LawyerId)).ToListAsync(ct);
        foreach (var lawyer in seededLawyers)
            foreach (var day in Enumerable.Range(0, 7)) {
                var row = existingSchedules.SingleOrDefault(r => r.LawyerId == lawyer.LawyerId && (int)r.DayOfWeek == day);
                var migratedId = Guid.Parse(Convert.ToHexString(System.Security.Cryptography.MD5.HashData(System.Text.Encoding.UTF8.GetBytes($"{lawyer.LawyerId}:working:{day}"))));
                if (row is not null && (row.Id != migratedId || row.UpdatedAt is not null)) continue;
                if (row is null) { row = new() { LawyerId = lawyer.LawyerId, DayOfWeek = (DayOfWeek)day }; db.LawyerWorkingSchedules.Add(row); }
                row.IsWorkingDay = day is >= 1 and <= 5; row.StartTime = new(9, 0); row.EndTime = new(17, 0); row.UpdatedAt = DateTime.UtcNow;
            }
        await db.SaveChangesAsync(ct);
        var demoDate = today.AddDays(3);
        while (demoDate.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday) demoDate = demoDate.AddDays(1);
        var addedAvailabilities = 0; var addedSlots = 0;
        var customerId = Guid.Parse($"00000000-0000-0000-0000-{customerUserId:x12}");
        // Recognize legacy markers, but keep new Development records free of UI metadata.
        for (var scenario = 0; scenario < 4; scenario++)
        {
            var lawyer = seededLawyers[scenario];
            await new LegalService.API.Services.Scheduling.AvailabilityService(db).LockLawyerAsync(lawyer.LawyerId, ct); var marker = $"[Scheduling demo {scenario} {demoDate:yyyy-MM-dd}]";
            if (scenario < 2) {
                var reason = scenario == 0 ? "Annual Leave" : "Court Appearance";
                var start = demoDate.ToDateTime(scenario == 0 ? TimeOnly.MinValue : new TimeOnly(9, 0));
                var end = scenario == 0 ? demoDate.AddDays(1).ToDateTime(TimeOnly.MinValue) : demoDate.ToDateTime(new(13, 0));
                if (await db.LawyerUnavailabilities.AnyAsync(r => r.LawyerId == lawyer.LawyerId &&
                    (r.Reason.StartsWith(marker) || r.Reason == reason && r.StartDateTime == start && r.EndDateTime == end), ct)) continue;
                var conflicts = await db.Appointments.Where(a => a.LawyerId == lawyer.LawyerId && a.Status != "Cancelled" && a.Status != "Rejected" && a.AvailabilitySlot.LawyerAvailability.Date == demoDate)
                    .Select(a => new { a.AvailabilitySlot.StartTime, a.AvailabilitySlot.EndTime }).ToListAsync(ct);
                if (conflicts.Any(a => LegalService.API.Services.Scheduling.AvailabilityService.Overlaps(start, end, demoDate.ToDateTime(a.StartTime), demoDate.ToDateTime(a.EndTime)))) continue;
                db.LawyerUnavailabilities.Add(new() { LawyerId = lawyer.LawyerId, StartDateTime = start, EndDateTime = end,
                    Reason = reason, IsFullDay = scenario == 0 });
            } else {
                if (await db.Appointments.AnyAsync(a => a.LawyerId == lawyer.LawyerId && (a.Description != null && a.Description.StartsWith(marker) || a.Description == null && a.AvailabilitySlot.LawyerAvailability.Date == demoDate), ct)) continue;
                var scheduling = new LegalService.API.Services.Scheduling.AvailabilityService(db);
                var available = await scheduling.GetAsync(lawyer.LawyerId, demoDate, ct);
                var candidates = scenario == 2 ? available.AvailableSlots.Take(1) : available.AvailableSlots;
                foreach (var slot in candidates) {
                    var window = new LawyerAvailability { AvailabilityId = Guid.NewGuid(), LawyerId = lawyer.LawyerId, Date = demoDate, StartTime = slot.Start, EndTime = slot.End };
                    var stored = new AvailabilitySlot { SlotId = Guid.NewGuid(), LawyerAvailability = window, StartTime = slot.Start, EndTime = slot.End, IsBooked = true };
                    db.Appointments.Add(new() { AppointmentId = Guid.NewGuid(), LawyerId = lawyer.LawyerId, CustomerId = customerId,
                        AvailabilitySlot = stored, Status = "Confirmed", Description = null, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow });
                    addedAvailabilities++; addedSlots++;
                }
            }
            await db.SaveChangesAsync(ct);
        }
        return (addedAvailabilities, addedSlots);
    }

    public static async Task<DemoDataReport> ReportAsync(ApplicationDbContext db, CancellationToken ct = default)
    {
        var catalog = await db.Specializations.AsNoTracking().OrderBy(area => area.Name).ToListAsync(ct);
        var lawyerStatuses = await db.Lawyers.AsNoTracking().Select(lawyer => lawyer.Status).ToListAsync(ct);
        var demoEmails = Enumerable.Range(1, Names.Length).Select(LawyerEmail).ToArray();
        var demoLawyers = await db.Lawyers.AsNoTracking()
            .Where(lawyer => lawyer.Email != null && demoEmails.Contains(lawyer.Email)).ToListAsync(ct);
        var links = await db.LawyerSpecializations.AsNoTracking()
            .Select(link => new { link.LawyerId, link.SpecializationId }).ToListAsync(ct);
        var services = await db.LegalServices.AsNoTracking().ToListAsync(ct);
        var availability = await db.LawyerAvailabilities.AsNoTracking()
            .Select(window => new { window.AvailabilityId, window.LawyerId, window.Date }).ToListAsync(ct);
        var slots = await db.AvailabilitySlots.AsNoTracking()
            .Select(slot => new { slot.AvailabilityId, slot.IsBooked }).ToListAsync(ct);
        var demoIds = demoLawyers.Select(lawyer => lawyer.LawyerId).ToHashSet();
        var demoWindowIds = availability.Where(window => demoIds.Contains(window.LawyerId))
            .Select(window => window.AvailabilityId).ToHashSet();
        var futureWindowIds = availability.Where(window => window.Date >= DateOnly.FromDateTime(DateTime.UtcNow))
            .Select(window => window.AvailabilityId).ToHashSet();
        var areas = catalog.Select(area => new DemoAreaReport(
            area.Name,
            links.Count(link => link.SpecializationId == area.SpecializationId),
            links.Count(link => link.SpecializationId == area.SpecializationId && demoIds.Contains(link.LawyerId)),
            services.Count(service => service.Category.Equals(area.Name, StringComparison.OrdinalIgnoreCase)),
            demoLawyers.Where(lawyer => links.Any(link => link.LawyerId == lawyer.LawyerId &&
                link.SpecializationId == area.SpecializationId)).Select(lawyer => lawyer.Name).OrderBy(name => name).ToArray(),
            services.Where(service => service.Category.Equals(area.Name, StringComparison.OrdinalIgnoreCase))
                .Select(service => service.ServiceName).OrderBy(name => name).ToArray()
        )).ToArray();
        var capacity = await new LegalService.API.Services.Scheduling.AvailabilityService(db).CapacityAsync(30, ct);
        return new DemoDataReport(
            lawyerStatuses.Count, lawyerStatuses.Count(status => status == "Active"),
            lawyerStatuses.Count(status => status == "Inactive"),
            lawyerStatuses.Count(status => status != "Active" && status != "Inactive"), demoLawyers.Count,
            demoLawyers.Count(lawyer => lawyer.Status == "Active"),
            demoLawyers.Count(lawyer => lawyer.Status != "Active"),
            services.Count, availability.Count, capacity.Values.Sum(),
            demoWindowIds.Count, demoLawyers.Sum(l => capacity.GetValueOrDefault(l.LawyerId)),
            await db.Users.CountAsync(user => user.Email == CustomerEmail && user.Role == "Customer", ct),
            await db.LawyerLegalServices.CountAsync(ct), areas);
    }
}

public record DemoSeedResult(int LawyersCreated, int ServicesCreated, int AvailabilitiesCreated,
    int SlotsCreated, bool CustomerCreated, Guid CustomerId);

public record SyntheticIdentityResult(int LawyerNamesChanged, int LicensesChanged, int AccountNamesChanged);

public record DemoAreaReport(string Name, int Lawyers, int DemoLawyers, int LegalServices,
    string[] DemoLawyerNames, string[] LegalServiceNames);

public record DemoDataReport(int TotalLawyers, int ActiveLawyers, int InactiveLawyers,
    int OtherStatusLawyers, int DemoLawyers, int ActiveDemoLawyers,
    int InactiveDemoLawyers, int TotalLegalServices, int AvailabilityWindows, int BookableSlots,
    int DemoAvailabilityWindows, int DemoBookableSlots, int DemoCustomers,
    int LawyerLegalServiceRows, DemoAreaReport[] PracticeAreas);
