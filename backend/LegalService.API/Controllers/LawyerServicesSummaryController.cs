using LegalService.API.Services.Scheduling;
using LegalService.API.Services.Workforce;
using Microsoft.Extensions.Options;
using LegalService.API.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LegalService.API.Controllers;

[ApiController, Route("api/lawyer-services/summary"), Authorize(Roles = "Admin")]
public sealed class LawyerServicesSummaryController(ApplicationDbContext db, AvailabilityService? scheduling = null, IOptions<WorkforceOptions>? options = null) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var today = DateOnly.FromDateTime(now);
        var currentTime = TimeOnly.FromDateTime(now);
        var areas = await db.Specializations.AsNoTracking()
            .OrderBy(area => area.Name)
            .Select(area => new { area.SpecializationId, area.Name })
            .ToListAsync(ct);
        var activeLinks = await db.LawyerSpecializations.AsNoTracking()
            .Where(link => link.Lawyer.Status == "Active" && link.Lawyer.LawyerSpecializations.Count == 1)
            .Select(link => new { link.LawyerId, link.SpecializationId })
            .ToListAsync(ct);
        var serviceCategories = await db.LegalServices.AsNoTracking()
            .Select(service => service.Category).ToListAsync(ct);
        var slotsByLawyer = await (scheduling ?? new AvailabilityService(db)).CapacityAsync(options?.Value.FutureWindowDays ?? 30, ct);
        var coverage = areas.Select(area =>
        {
            var links = activeLinks.Where(link => link.SpecializationId == area.SpecializationId).ToArray();
            return new
            {
                practiceAreaId = area.SpecializationId,
                practiceAreaName = area.Name,
                activeLawyers = links.Select(link => link.LawyerId).Distinct().Count(),
                legalServices = serviceCategories.Count(category =>
                    string.Equals(category, area.Name, StringComparison.OrdinalIgnoreCase)),
                futureAvailabilityCount = links.Sum(link => slotsByLawyer.GetValueOrDefault(link.LawyerId))
            };
        }).ToArray();

        return Ok(new
        {
            activeLawyers = await db.Lawyers.CountAsync(lawyer => lawyer.Status == "Active", ct),
            totalLawyers = await db.Lawyers.CountAsync(ct),
            practiceAreas = areas.Count,
            legalServices = serviceCategories.Count,
            coverage
        });
    }
}
