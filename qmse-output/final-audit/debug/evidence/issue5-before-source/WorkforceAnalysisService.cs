using LegalService.API.Services.Scheduling;
using LegalService.API.Data;
using LegalService.API.DTOs.Workforce;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace LegalService.API.Services.Workforce;

public sealed class WorkforceOptions
{
    public int RecentWindowDays { get; set; } = 30;
    public int FutureWindowDays { get; set; } = 30;
    public int MinimumDemand { get; set; } = 5;
    public double WatchRatio { get; set; } = 0.75;
    public double ConcernRatio { get; set; } = 1.0;
    public int SnapshotMaxAgeHours { get; set; } = 24;
}

public sealed class WorkforceAnalysisService(ApplicationDbContext db, IOptions<WorkforceOptions> options, TimeProvider clock, AvailabilityService? scheduling = null)
{
    public WorkforceOptions Rules => options.Value;
    public static (string Status, string[] Reasons) Assess(int active, int requests, int appointments, int slots, int recruitment, WorkforceOptions rules, WorkforcePlanningRules? planning = null)
    {
        // Both signals may describe the same booking; never add them as independent cases.
        var demand = Math.Max(requests, appointments);
        planning ??= WorkforceSettingsService.Resolve(null, rules);
        var significant = demand > 0 && demand >= planning.HighDemandThreshold;
        string status;
        var reasons = new List<string>();
        if (active == 0) { status = "NO_ACTIVE_LAWYERS"; reasons.Add("NO_ACTIVE_LAWYERS"); }
        else if (active < planning.MinimumActiveLawyers)
        { status = "CAPACITY_CONCERN"; reasons.Add("BELOW_MINIMUM_LAWYERS"); }
        else if (slots < planning.MinimumFutureSlots && significant)
        { status = "CAPACITY_CONCERN"; reasons.Add("LOW_FUTURE_CAPACITY"); }
        else if (significant && (slots == 0 || demand >= slots * rules.ConcernRatio))
        { status = "CAPACITY_CONCERN"; reasons.Add("HIGH_DEMAND_LOW_AVAILABILITY"); }
        else if (slots == 0 || slots < planning.MinimumFutureSlots || (significant && demand >= slots * planning.WatchCapacityRatio))
        { status = "WATCH"; reasons.Add(slots == 0 || slots < planning.MinimumFutureSlots ? "LOW_FUTURE_CAPACITY" : "DEMAND_APPROACHING_CAPACITY"); }
        else { status = "HEALTHY"; reasons.Add("CAPACITY_WITHIN_CONFIGURED_RULES"); }
        if (active > 0 && active < planning.TargetActiveLawyers) reasons.Add("BELOW_TARGET_LAWYERS");
        if (recruitment > 0) reasons.Add("RECRUITMENT_ALREADY_ACTIVE");
        return (status, reasons.ToArray());
    }

    public async Task<WorkforceReport> AnalyzeAsync(CancellationToken ct = default)
    {
        var now = clock.GetUtcNow().UtcDateTime;
        var since = now.AddDays(-Rules.RecentWindowDays);
        var until = now.AddDays(Rules.FutureWindowDays);
        var today = DateOnly.FromDateTime(now); var time = TimeOnly.FromDateTime(now);
        var last = DateOnly.FromDateTime(until); var lastTime = TimeOnly.FromDateTime(until);
        var areas = await db.Specializations.AsNoTracking().OrderBy(x => x.Name).Select(x => new { x.SpecializationId, x.Name }).ToListAsync(ct);
        var links = await db.LawyerSpecializations.AsNoTracking().Where(x => x.Lawyer.LawyerSpecializations.Count == 1)
            .Select(x => new { x.LawyerId, x.SpecializationId, x.Lawyer.Status }).ToListAsync(ct);
        var services = await db.LegalServices.AsNoTracking().Select(x => x.Category).ToListAsync(ct);
        var demands = await db.LawyerRecommendationWorkflows.AsNoTracking()
            .Where(x => x.CreatedAt >= since && x.CreatedAt <= now && x.CategoryId != null &&
                (x.Status == "AWAITING_APPROVAL" || x.Status == "ACTION_COMPLETED" || x.Status == "NO_MATCH"))
            .GroupBy(x => x.CategoryId).Select(g => new { Id = g.Key, Count = g.Count() }).ToListAsync(ct);
        var appointments = await db.Appointments.AsNoTracking()
            .Where(x => x.CreatedAt >= since && x.CreatedAt <= now && x.Status != "Cancelled" && x.Status != "Rejected")
            .GroupBy(x => x.LawyerId).Select(g => new { Id = g.Key, Count = g.Count() }).ToListAsync(ct);
        var capacityByLawyer = await (scheduling ?? new AvailabilityService(db, clock)).CapacityAsync(Rules.FutureWindowDays, ct);
        var careers = await db.Careers.AsNoTracking().Select(x => new { x.CareerId, x.JobTitle, x.PracticeAreaId }).ToListAsync(ct);
        var settings = await db.PracticeAreaWorkforceSettings.AsNoTracking().ToDictionaryAsync(x => x.PracticeAreaId, ct);
        var result = areas.Select(area =>
        {
            var membership = links.Where(x => x.SpecializationId == area.SpecializationId).ToArray();
            var active = membership.Where(x => x.Status == "Active").Select(x => x.LawyerId).ToHashSet();
            var all = membership.Select(x => x.LawyerId).ToHashSet();
            var requestCount = demands.Where(x => x.Id == area.SpecializationId).Sum(x => x.Count);
            var appointmentCount = appointments.Where(x => all.Contains(x.Id)).Sum(x => x.Count);
            var capacity = active.Sum(id => capacityByLawyer.GetValueOrDefault(id));
            var openings = careers.Where(x => x.PracticeAreaId == area.SpecializationId).Select(x => new RecruitmentOpening(x.CareerId, x.JobTitle)).ToArray();
            settings.TryGetValue(area.SpecializationId, out var setting);
            var planning = WorkforceSettingsService.Resolve(setting, Rules);
            var assessment = Assess(active.Count, requestCount, appointmentCount, capacity, openings.Length, Rules, planning);
            return new WorkforceArea(area.SpecializationId, area.Name, active.Count,
                services.Count(x => string.Equals(x, area.Name, StringComparison.OrdinalIgnoreCase)), requestCount,
                appointmentCount, capacity, openings.Length, assessment.Status, assessment.Reasons, openings, planning);
        }).ToArray();
        return new(now, Rules.RecentWindowDays, Rules.FutureWindowDays, result, careers.Count(x => x.PracticeAreaId == null),
            ["Requests are Admin recommendation workflows, not unique customer cases. Appointments are counted by creation date; current single-area membership maps them to an area.",
             "Requests and appointments may overlap; assessment uses their maximum, not their sum. This is a capacity signal, not a forecast or proof that hiring is required.",
             "Service-specific demand cannot be reliably identified in the existing persisted data.",
             "Careers has no open/closed field: every existing Career record is treated as open. Unlinked postings require human review."]);
    }
}
