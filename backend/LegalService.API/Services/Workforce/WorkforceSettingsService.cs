using System.ComponentModel.DataAnnotations;
using LegalService.API.Data;
using LegalService.API.DTOs.Workforce;
using LegalService.API.Infrastructure;
using LegalService.API.Models.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
namespace LegalService.API.Services.Workforce;
public sealed class WorkforceSettingsService(ApplicationDbContext db, IOptions<WorkforceOptions> options, TimeProvider clock)
{
    public static WorkforcePlanningRules Resolve(PracticeAreaWorkforceSetting? setting, WorkforceOptions defaults) => setting is null
        ? new(0, 0, 0, defaults.MinimumDemand, defaults.WatchRatio, "DEFAULT")
        : new(setting.MinimumActiveLawyers, setting.TargetActiveLawyers, setting.MinimumFutureSlots,
            setting.HighDemandThreshold, setting.WatchCapacityRatio, "CUSTOM");
    public async Task<WorkforceSettingResponse[]> ListAsync(CancellationToken ct = default)
    {
        var areas = await db.Specializations.AsNoTracking().OrderBy(x => x.Name).ToListAsync(ct);
        var settings = await db.PracticeAreaWorkforceSettings.AsNoTracking().ToDictionaryAsync(x => x.PracticeAreaId, ct);
        return areas.Select(area => { settings.TryGetValue(area.SpecializationId, out var setting); var rules = Resolve(setting, options.Value);
            return new WorkforceSettingResponse(area.SpecializationId, area.Name, rules.MinimumActiveLawyers, rules.TargetActiveLawyers,
                rules.MinimumFutureSlots, rules.HighDemandThreshold, rules.WatchCapacityRatio, rules.Source, setting?.UpdatedAt, setting?.UpdatedBy); }).ToArray();
    }
    public async Task<WorkforceSettingResponse> GetAsync(int id, CancellationToken ct = default) =>
        (await ListAsync(ct)).SingleOrDefault(x => x.PracticeAreaId == id) ?? throw new ApiException(404, "Practice Area not found.");
    public async Task<WorkforceSettingResponse> SaveAsync(int id, WorkforceSettingRequest request, int owner, CancellationToken ct = default)
    {
        var errors = new List<System.ComponentModel.DataAnnotations.ValidationResult>();
        if (!Validator.TryValidateObject(request, new(request), errors, true)) throw new ApiException(400, errors[0].ErrorMessage!);
        if (!await db.Specializations.AnyAsync(x => x.SpecializationId == id, ct)) throw new ApiException(404, "Practice Area not found.");
        var setting = await db.PracticeAreaWorkforceSettings.SingleOrDefaultAsync(x => x.PracticeAreaId == id, ct);
        if (setting is null) { setting = new() { PracticeAreaId = id, CreatedAt = clock.GetUtcNow().UtcDateTime }; db.PracticeAreaWorkforceSettings.Add(setting); }
        setting.MinimumActiveLawyers = request.MinimumActiveLawyers; setting.TargetActiveLawyers = request.TargetActiveLawyers;
        setting.MinimumFutureSlots = request.MinimumFutureSlots; setting.HighDemandThreshold = request.HighDemandThreshold;
        setting.WatchCapacityRatio = request.WatchCapacityRatio; setting.UpdatedAt = clock.GetUtcNow().UtcDateTime; setting.UpdatedBy = owner;
        await db.SaveChangesAsync(ct); return await GetAsync(id, ct);
    }
    public async Task<WorkforceSettingResponse> ResetAsync(int id, CancellationToken ct = default)
    {
        await GetAsync(id, ct);
        var setting = await db.PracticeAreaWorkforceSettings.SingleOrDefaultAsync(x => x.PracticeAreaId == id, ct);
        if (setting is not null) { db.PracticeAreaWorkforceSettings.Remove(setting); await db.SaveChangesAsync(ct); }
        return await GetAsync(id, ct);
    }
}
