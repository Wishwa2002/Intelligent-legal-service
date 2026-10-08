using System.Security.Claims;
using LegalService.API.Data;
using LegalService.API.DTOs.LawyerMobile;
using LegalService.API.DTOs.Scheduling;
using LegalService.API.Infrastructure;
using LegalService.API.Interfaces;
using LegalService.API.Models.Entities;
using LegalService.API.Services.Scheduling;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
namespace LegalService.API.Controllers;

[ApiController, Route("api/lawyer/me"), Authorize(Roles = "Lawyer")]
public sealed class LawyerMeController(ApplicationDbContext db, AvailabilityService availability,
    LawyerScheduleService schedules, IAppointmentService appointments) : ControllerBase
{
    private async Task<Lawyer> Me(CancellationToken ct)
    {
        if (!int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var id)) throw new ApiException(401, "Sign in again.");
        var account = await db.Users.AsNoTracking().SingleOrDefaultAsync(u => u.UserId == id, ct);
        var lawyer = await db.Lawyers.Include(l => l.LawyerSpecializations).ThenInclude(s => s.Specialization)
            .SingleOrDefaultAsync(l => l.UserId == id, ct);
        if (account?.Role != "Lawyer" || lawyer == null) throw new ApiException(403, "A linked lawyer account is required.");
        if (lawyer.Status != "Active") throw new ApiException(403, "Your lawyer account is inactive or pending approval. Contact the administrator.");
        if (account.MustChangePassword) throw new ApiException(403, "Change your initial password before accessing lawyer services.");
        return lawyer;
    }
    private static MyLawyerProfile Profile(Lawyer l) => new(l.LawyerId, l.Name, l.Email, l.PhoneNumber, l.Qualification,
        l.LawyerSpecializations.Count == 1 ? l.LawyerSpecializations.Single().Specialization.Name : null,
        l.Experience, l.LicenseNumber, l.ProfileDescription, l.Status);
    private IQueryable<Appointment> Own(Guid id) => db.Appointments.AsNoTracking().Where(a => a.LawyerId == id);
    private static IQueryable<MyAppointment> Project(IQueryable<Appointment> query) => query.Select(a => new MyAppointment(
        a.AppointmentId, "Client", a.AvailabilitySlot.LawyerAvailability.Date, a.AvailabilitySlot.StartTime,
        a.AvailabilitySlot.EndTime, a.Status, a.LegalServiceCategory, null, a.Description, a.ConsultationType,
        a.Status == "Requested" || a.Status == "Rescheduled", a.Status == "Confirmed"));
    private IQueryable<Appointment> Upcoming(IQueryable<Appointment> query) => query.Where(a =>
        (a.Status == "Requested" || a.Status == "Confirmed" || a.Status == "Rescheduled") &&
        (a.AvailabilitySlot.LawyerAvailability.Date > availability.Today ||
        a.AvailabilitySlot.LawyerAvailability.Date == availability.Today && a.AvailabilitySlot.StartTime >= TimeOnly.FromDateTime(availability.LocalNow)));
    [HttpGet, HttpGet("profile")]
    public async Task<MyLawyerProfile> GetProfile(CancellationToken ct) => Profile(await Me(ct));
    [HttpPut("profile")]
    public async Task<MyLawyerProfile> UpdateProfile(LawyerProfileUpdateRequest request, CancellationToken ct)
    {
        var lawyer = await Me(ct);
        lawyer.PhoneNumber = (request.PhoneNumber ?? "").Trim();
        lawyer.ProfileDescription = (request.ProfileDescription ?? "").Trim();
        lawyer.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        return Profile(lawyer);
    }
    [HttpGet("dashboard")]
    public async Task<MyLawyerDashboard> Dashboard(CancellationToken ct)
    {
        var lawyer = await Me(ct); var own = Own(lawyer.LawyerId);
        var counts = new DashboardCounts(
            await own.CountAsync(a => a.AvailabilitySlot.LawyerAvailability.Date == availability.Today && a.Status != "Cancelled" && a.Status != "Rejected", ct),
            await Upcoming(own).CountAsync(ct),
            await own.CountAsync(a => a.Status == "Requested" || a.Status == "Rescheduled", ct),
            await own.CountAsync(a => a.Status == "Completed", ct));
        var next = await Project(Upcoming(own).OrderBy(a => a.AvailabilitySlot.LawyerAvailability.Date)
            .ThenBy(a => a.AvailabilitySlot.StartTime).ThenBy(a => a.AppointmentId)).FirstOrDefaultAsync(ct);
        if (next != null) next = await Appointment(lawyer.LawyerId, next.AppointmentId, ct);
        return new(Profile(lawyer), counts, next, availability.TimeZoneId);
    }
    [HttpGet("appointments")]
    public async Task<IReadOnlyList<MyAppointment>> GetAppointments([FromQuery] string? filter, CancellationToken ct)
    {
        var lawyer = await Me(ct); var query = Own(lawyer.LawyerId);
        query = filter?.ToLowerInvariant() switch {
            null or "" or "all" => query,
            "today" => query.Where(a => a.AvailabilitySlot.LawyerAvailability.Date == availability.Today && a.Status != "Cancelled" && a.Status != "Rejected"),
            "upcoming" => Upcoming(query),
            "pending" => query.Where(a => a.Status == "Requested" || a.Status == "Rescheduled"),
            "completed" => query.Where(a => a.Status == "Completed"),
            "cancelled" => query.Where(a => a.Status == "Cancelled" || a.Status == "Rejected"),
            _ => throw new ApiException(400, "Choose Today, Upcoming, Pending, Completed, Cancelled or All.")
        };
        var ids = await query.Select(a => a.AppointmentId).ToListAsync(ct);
        var allowed = ids.ToHashSet();
        var rows = await appointments.GetAllAppointmentsAsync(lawyerId: lawyer.LawyerId);
        return rows.Where(a => allowed.Contains(a.AppointmentId)).OrderBy(a => a.Date).ThenBy(a => a.StartTime).ThenBy(a => a.AppointmentId)
            .Select(a => new MyAppointment(a.AppointmentId, a.CustomerName, a.Date, a.StartTime, a.EndTime,
                a.Status, a.LegalServiceCategory ?? Profile(lawyer).PracticeArea, null, a.Description, a.ConsultationType,
                a.Status is "Requested" or "Rescheduled", a.Status == "Confirmed")).ToArray();
    }
    private async Task<MyAppointment> Appointment(Guid lawyerId, Guid id, CancellationToken ct)
    {
        if (!await Own(lawyerId).AnyAsync(a => a.AppointmentId == id, ct)) throw new ApiException(404, "Appointment not found.");
        var a = await appointments.GetAppointmentByIdAsync(id) ?? throw new ApiException(404, "Appointment not found.");
        var area = await db.LawyerSpecializations.Where(s => s.LawyerId == lawyerId).Select(s => s.Specialization.Name).FirstOrDefaultAsync(ct);
        return new(a.AppointmentId, a.CustomerName, a.Date, a.StartTime, a.EndTime, a.Status,
            a.LegalServiceCategory ?? area, null, a.Description, a.ConsultationType, a.CanConfirm, a.CanComplete);
    }
    [HttpGet("appointments/{id:guid}")]
    public async Task<MyAppointment> GetAppointment(Guid id, CancellationToken ct) => await Appointment((await Me(ct)).LawyerId, id, ct);
    [HttpPost("appointments/{id:guid}/confirm")]
    public Task<MyAppointment> Confirm(Guid id, CancellationToken ct) => Act(id, false, ct);
    [HttpPost("appointments/{id:guid}/complete")]
    public Task<MyAppointment> Complete(Guid id, CancellationToken ct) => Act(id, true, ct);
    private async Task<MyAppointment> Act(Guid id, bool complete, CancellationToken ct)
    {
        var lawyer = await Me(ct);
        await using var transaction = await availability.BeginMutationAsync(ct);
        await availability.LockLawyerAsync(lawyer.LawyerId, ct);
        await Appointment(lawyer.LawyerId, id, ct);
        try {
            if (complete) await appointments.CompleteAppointmentAsync(id, null);
            else await appointments.ConfirmAppointmentAsync(id, null);
        } catch (InvalidOperationException error) { throw new ApiException(409, error.Message); }
        if (transaction != null) await transaction.CommitAsync(ct);
        return await Appointment(lawyer.LawyerId, id, ct);
    }
    [HttpGet("schedule")]
    public async Task<ScheduleResponse> Schedule(CancellationToken ct) => await schedules.GetAsync((await Me(ct)).LawyerId, ct);
    [HttpPut("schedule")]
    public async Task<ScheduleResponse> SaveSchedule(ScheduleRequest request, CancellationToken ct) => await schedules.SaveAsync((await Me(ct)).LawyerId, request, ct);
    [HttpGet("unavailability")]
    public async Task<IReadOnlyList<UnavailabilityResponse>> Leave(CancellationToken ct)
    {
        var id = (await Me(ct)).LawyerId;
        return await db.LawyerUnavailabilities.AsNoTracking().Where(l => l.LawyerId == id && l.EndDateTime > availability.LocalNow)
            .OrderBy(l => l.StartDateTime).Select(l => new UnavailabilityResponse(l.Id, l.StartDateTime, l.EndDateTime, l.Reason, l.IsFullDay)).ToListAsync(ct);
    }
    [HttpPost("unavailability")]
    public async Task<UnavailabilityResponse> AddLeave(UnavailabilityRequest request, CancellationToken ct) => await schedules.SaveLeaveAsync((await Me(ct)).LawyerId, null, request, ct);
    [HttpPut("unavailability/{id:guid}")]
    public async Task<UnavailabilityResponse> EditLeave(Guid id, UnavailabilityRequest request, CancellationToken ct) => await schedules.SaveLeaveAsync((await Me(ct)).LawyerId, id, request, ct);
    [HttpDelete("unavailability/{id:guid}")]
    public async Task<IActionResult> DeleteLeave(Guid id, CancellationToken ct)
    { await schedules.DeleteLeaveAsync((await Me(ct)).LawyerId, id, ct); return NoContent(); }
}
