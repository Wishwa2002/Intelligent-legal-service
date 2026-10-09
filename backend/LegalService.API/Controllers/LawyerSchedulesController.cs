using LegalService.API.Infrastructure;
using LegalService.API.Data;
using LegalService.API.DTOs.Scheduling;
using LegalService.API.Services.Scheduling;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
namespace LegalService.API.Controllers;
[ApiController, Route("api/lawyers/{lawyerId:guid}"), Authorize(Roles = "Admin")]
public sealed class LawyerSchedulesController(ApplicationDbContext db, LawyerScheduleService schedules, AvailabilityService availability) : ControllerBase
{
    [HttpGet("working-schedule")] public Task<ScheduleResponse> Get(Guid lawyerId, CancellationToken ct) => schedules.GetAsync(lawyerId, ct);
    [HttpPut("working-schedule")] public Task<ScheduleResponse> Save(Guid lawyerId, ScheduleRequest request, CancellationToken ct) => schedules.SaveAsync(lawyerId, request, ct);
    [HttpGet("unavailability")] public async Task<IReadOnlyList<UnavailabilityResponse>> Leave(Guid lawyerId, CancellationToken ct)
    {
        await schedules.GetAsync(lawyerId, ct);
        return await db.LawyerUnavailabilities.AsNoTracking().Where(l => l.LawyerId == lawyerId && l.EndDateTime > availability.LocalNow)
            .OrderBy(l => l.StartDateTime).Select(l => new UnavailabilityResponse(l.Id, l.StartDateTime, l.EndDateTime, l.Reason, l.IsFullDay)).ToListAsync(ct);
    }
    [HttpPost("unavailability")] public Task<UnavailabilityResponse> Add(Guid lawyerId, UnavailabilityRequest request, CancellationToken ct) => schedules.SaveLeaveAsync(lawyerId, null, request, ct);
    [HttpPut("unavailability/{id:guid}")] public Task<UnavailabilityResponse> Edit(Guid lawyerId, Guid id, UnavailabilityRequest request, CancellationToken ct) => schedules.SaveLeaveAsync(lawyerId, id, request, ct);
    [HttpDelete("unavailability/{id:guid}")] public async Task<IActionResult> Delete(Guid lawyerId, Guid id, CancellationToken ct) { await schedules.DeleteLeaveAsync(lawyerId, id, ct); return NoContent(); }
}
[ApiController, Route("api/lawyers/{lawyerId:guid}/available-slots")]
public sealed class AvailableSlotsController(AvailabilityService availability) : ControllerBase
{
    [HttpGet] public Task<AvailableSlotsResponse> Get(Guid lawyerId, [FromQuery] DateOnly? date, CancellationToken ct) => availability.GetAsync(lawyerId, date ?? throw new ApiException(400, "A date is required."), ct);
}
