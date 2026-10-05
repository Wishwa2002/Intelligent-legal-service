using System.Data;
using System.Text.Json;
using LegalService.API.Data;
using LegalService.API.DTOs.Requests;
using LegalService.API.DTOs.Workforce;
using LegalService.API.Infrastructure;
using LegalService.API.Interfaces;
using LegalService.API.Models.Entities;
using Microsoft.EntityFrameworkCore;
using Npgsql;
namespace LegalService.API.Services.Workforce;

public sealed class WorkforceDemoService(ApplicationDbContext db, WorkforceSettingsService settings,
    ICareerService careers, IHostEnvironment environment, TimeProvider clock)
{
    public static int AdminId(System.Security.Claims.ClaimsPrincipal user) => int.TryParse(user.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value, out var id) && id > 0 ? id : throw new ApiException(401, "Valid Admin identity required.");
    public static readonly string[] Scenarios = ["HEALTHY_COVERAGE", "RECRUITMENT_NEEDED", "NO_ACTIVE_LAWYERS", "EXISTING_RECRUITMENT"];
    public void RequireDevelopment() { if (!environment.IsDevelopment()) throw new ApiException(404, "Not found."); }
    public sealed class DemoArtifacts
    {
        public int SourceAreaId { get; set; }
        public int DemoAreaId { get; set; }
        public List<Guid> Lawyers { get; set; } = [];
        public List<Guid> Availability { get; set; } = [];
        public List<Guid> Slots { get; set; } = [];
        public List<Guid> Requests { get; set; } = [];
        public int? CareerId { get; set; }
        public string? CareerTitle { get; set; }
    }
    public async Task<WorkforceDemoResponse> ApplyAsync(WorkforceDemoRequest request, int owner, CancellationToken ct = default)
    {
        RequireDevelopment();
        if (!Scenarios.Contains(request.Scenario)) throw new ApiException(400, "Choose a supported demo scenario.");
        try { return await ApplyCore(request, owner, ct); }
        catch (Exception ex) when (ex is DbUpdateConcurrencyException || ex is PostgresException { SqlState: "40001" } || ex is DbUpdateException { InnerException: PostgresException { SqlState: "23505" or "40001" } })
        { throw new ApiException(409, "Demo data changed concurrently. Retry the scenario."); }
    }
    public Task<WorkforceDemoResponse> ResetAsync(int owner, CancellationToken ct = default) => ApplyAsync(new() { Scenario = "HEALTHY_COVERAGE" }, owner, ct);
    private async Task<WorkforceDemoResponse> ApplyCore(WorkforceDemoRequest request, int owner, CancellationToken ct)
    {
        await using var transaction = db.Database.IsRelational() ? await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, ct) : null;
        var state = await db.WorkforceDemoStates.SingleOrDefaultAsync(x => x.Id == 1, ct);
        var artifacts = state is null ? new List<DemoArtifacts>() : JsonSerializer.Deserialize<List<DemoArtifacts>>(state.ArtifactsJson)!;
        var demoIds = artifacts.Select(x => x.DemoAreaId).ToArray();
        var sources = await db.Specializations.AsNoTracking().Where(x => !demoIds.Contains(x.SpecializationId)).OrderBy(x => x.Name).ToListAsync(ct);
        if (sources.Count == 0) throw new ApiException(400, "Create a Practice Area before applying a demo.");
        var chosen = request.PracticeAreaId.HasValue ? sources.SingleOrDefault(x => x.SpecializationId == request.PracticeAreaId) : sources.FirstOrDefault(x => x.Name.Equals("Criminal Law", StringComparison.OrdinalIgnoreCase)) ?? sources[0];
        if (chosen is null) throw new ApiException(400, "Choose an existing non-demo Practice Area.");
        // Validate all tracked artifacts before deleting anything. Bookings, applications,
        // manually added slots and edited demo careers are never removed by reset.
        foreach (var item in artifacts)
        {
            if (await db.Appointments.AnyAsync(a => item.Lawyers.Contains(a.LawyerId) && a.Status != "Cancelled" && a.Status != "Rejected", ct))
                throw new ApiException(409, "Resolve demo appointments before resetting their working schedules.");
            var availability = await db.LawyerAvailabilities.Include(x => x.AvailabilitySlots).ThenInclude(x => x.Appointment).Where(x => item.Availability.Contains(x.AvailabilityId)).ToListAsync(ct);
            if (availability.SelectMany(x => x.AvailabilitySlots).Any(x => x.IsBooked || x.Appointment != null || !item.Slots.Contains(x.SlotId)))
                throw new ApiException(409, "A demo slot has been used or extended. Resolve it before resetting demo capacity.");
            var demands = await db.LawyerRecommendationWorkflows.Where(x => item.Requests.Contains(x.WorkflowId)).ToListAsync(ct);
            if (demands.Any(x => x.Status != "NO_MATCH" || x.AppointmentId != null || x.ApprovedLawyerId != null))
                throw new ApiException(409, "A demo demand record has been used. It will not be removed.");
            if (item.CareerId.HasValue)
            {
                var career = await db.Careers.Include(x => x.JobApplications).SingleOrDefaultAsync(x => x.CareerId == item.CareerId, ct);
                if (career is not null && (career.JobApplications.Count > 0 || career.JobTitle != item.CareerTitle || career.Description != "Development workforce scenario only." || career.PracticeAreaId != item.DemoAreaId))
                    throw new ApiException(409, "A scenario opening has been edited or received applications. Review it in Careers before reset.");
                if (career is not null) db.Careers.Remove(career);
                item.CareerId = null; item.CareerTitle = null;
            }
            db.LawyerAvailabilities.RemoveRange(availability);
            db.LawyerRecommendationWorkflows.RemoveRange(demands);
            item.Availability.Clear(); item.Slots.Clear(); item.Requests.Clear();
        }
        await db.SaveChangesAsync(ct);
        foreach (var source in sources)
        {
            var item = artifacts.SingleOrDefault(x => x.SourceAreaId == source.SpecializationId);
            if (item is null)
            {
                var area = new Specialization { Name = "[Demo] " + source.Name[..Math.Min(source.Name.Length, 180)], Description = "Isolated Development workforce scenario. Source catalog: " + source.Name };
                db.Specializations.Add(area); await db.SaveChangesAsync(ct);
                item = new() { SourceAreaId = source.SpecializationId, DemoAreaId = area.SpecializationId }; artifacts.Add(item);
            }
            var sourceRules = await settings.GetAsync(source.SpecializationId, ct);
            var selected = source.SpecializationId == chosen.SpecializationId && request.Scenario != "HEALTHY_COVERAGE";
            var minimum = sourceRules.MinimumActiveLawyers;
            var target = sourceRules.TargetActiveLawyers;
            // Defaults have no staffing floor. A scenario-specific floor is created only
            // on the isolated copy so Recruitment Needed remains reproducible.
            if (selected && request.Scenario != "NO_ACTIVE_LAWYERS" && sourceRules.Source == "DEFAULT") { minimum = 4; target = Math.Max(target, 6); }
            if (sourceRules.Source == "CUSTOM" || minimum != sourceRules.MinimumActiveLawyers)
                await settings.SaveAsync(item.DemoAreaId, new() { MinimumActiveLawyers = minimum, TargetActiveLawyers = target, MinimumFutureSlots = sourceRules.MinimumFutureSlots, HighDemandThreshold = sourceRules.HighDemandThreshold, WatchCapacityRatio = sourceRules.WatchCapacityRatio }, owner, ct);
            else await settings.ResetAsync(item.DemoAreaId, ct);
            var healthyCount = Math.Max(1, Math.Max(minimum, target));
            while (item.Lawyers.Count < healthyCount)
            {
                var id = Guid.NewGuid(); item.Lawyers.Add(id);
                db.Lawyers.Add(new() { LawyerId = id, Name = $"Demo practitioner {item.Lawyers.Count}", LicenseNumber = "WF-DEMO/" + id.ToString("N"), Status = "Active", Qualification = "Development demonstration profile", LawyerSpecializations = [new() { SpecializationId = item.DemoAreaId }] });
            }
            var activeCount = selected ? request.Scenario == "NO_ACTIVE_LAWYERS" ? 0 : minimum > 2 ? 2 : 1 : healthyCount;
            var lawyers = await db.Lawyers.Where(x => item.Lawyers.Contains(x.LawyerId)).ToListAsync(ct);
            // Newly added lawyers are not in the database yet.
            lawyers = lawyers.Concat(db.Lawyers.Local.Where(x => item.Lawyers.Contains(x.LawyerId) && !lawyers.Contains(x))).OrderBy(x => item.Lawyers.IndexOf(x.LawyerId)).ToList();
            for (var index = 0; index < lawyers.Count; index++) lawyers[index].Status = index < activeCount ? "Active" : "Inactive";
            await db.SaveChangesAsync(ct);
            // Demo capacity follows the same recurring model as production capacity.
            var existingSchedules = await db.LawyerWorkingSchedules.Where(x => item.Lawyers.Contains(x.LawyerId)).ToListAsync(ct);
            foreach (var lawyer in lawyers)
                foreach (var day in Enumerable.Range(0, 7)) {
                    var row = existingSchedules.SingleOrDefault(x => x.LawyerId == lawyer.LawyerId && (int)x.DayOfWeek == day);
                    if (row is null) { row = new() { LawyerId = lawyer.LawyerId, DayOfWeek = (DayOfWeek)day }; db.LawyerWorkingSchedules.Add(row); }
                    row.IsWorkingDay = !selected && day is >= 1 and <= 5;
                    row.StartTime = new(9, 0); row.EndTime = new(17, 0);
                }
            if (selected && request.Scenario != "NO_ACTIVE_LAWYERS")
                for (var index = 0; index < Math.Max(12, sourceRules.HighDemandThreshold); index++)
                { var id = Guid.NewGuid(); item.Requests.Add(id); db.LawyerRecommendationWorkflows.Add(new() { WorkflowId = id, OwnerUserId = owner, CategoryId = item.DemoAreaId, Status = "NO_MATCH", UserRequirement = "Development workforce demonstration demand.", CreatedAt = clock.GetUtcNow().UtcDateTime, UpdatedAt = clock.GetUtcNow().UtcDateTime }); }
            await db.SaveChangesAsync(ct);
            if (selected && request.Scenario == "RECRUITMENT_NEEDED" && await db.Careers.AnyAsync(x => x.PracticeAreaId == item.DemoAreaId, ct))
                throw new ApiException(409, "An Admin-created opening already exists in this demo area. Review Careers before demonstrating new recruitment.");
            if (selected && request.Scenario == "EXISTING_RECRUITMENT" && !await db.Careers.AnyAsync(x => x.PracticeAreaId == item.DemoAreaId, ct))
            {
                var title = "[Demo] " + source.Name[..Math.Min(source.Name.Length, 175)] + " Practitioner";
                var career = await careers.CreateCareerAsync(new CreateCareerRequest { PracticeAreaId = item.DemoAreaId, JobTitle = title, Description = "Development workforce scenario only." });
                item.CareerId = career.CareerId; item.CareerTitle = title;
            }
        }
        state ??= new(); state.ArtifactsJson = JsonSerializer.Serialize(artifacts); state.UpdatedAt = clock.GetUtcNow().UtcDateTime;
        if (db.Entry(state).State == EntityState.Detached) db.WorkforceDemoStates.Add(state);
        await db.SaveChangesAsync(ct); if (transaction != null) await transaction.CommitAsync(ct);
        return new(request.Scenario, artifacts.Single(x => x.SourceAreaId == chosen.SpecializationId).DemoAreaId,
            "Demo scenario applied to [Demo] catalog copies. Original records and Admin-created openings are preserved; reset restores healthy demo capacity.");
    }
}
