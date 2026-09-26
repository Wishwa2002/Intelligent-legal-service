using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LegalService.API.Data;
using LegalService.API.DTOs.Appointments;
using LegalService.API.Interfaces;

namespace LegalService.API.Controllers;

[ApiController]
[Route("api/appointments")]
public class AppointmentsController : ControllerBase
{
    private readonly IAppointmentService _appointmentService;
    private readonly ApplicationDbContext _context;

    public AppointmentsController(IAppointmentService appointmentService, ApplicationDbContext context)
    {
        _appointmentService = appointmentService;
        _context = context;
    }

    /// <summary>
    /// Book a new appointment slot for a customer with a lawyer.
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> BookAppointment([FromBody] BookAppointmentRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        try
        {
            var appointment = await _appointmentService.BookAppointmentAsync(request);
            return CreatedAtAction(nameof(GetAppointmentById), new { id = appointment.AppointmentId }, appointment);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Get all appointments, with optional filters for lawyer, customer, status, date, or lawyer email.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetAllAppointments(
        [FromQuery] Guid? lawyerId,
        [FromQuery] Guid? customerId,
        [FromQuery] string? status,
        [FromQuery] string? date,
        [FromQuery] string? lawyerEmail)
    {
        DateOnly? parsedDate = null;
        if (!string.IsNullOrWhiteSpace(date) && DateOnly.TryParse(date, out var d))
        {
            parsedDate = d;
        }

        if (!lawyerId.HasValue && !string.IsNullOrWhiteSpace(lawyerEmail))
        {
            var l = await _context.Lawyers.FirstOrDefaultAsync(x => x.Email != null && x.Email.ToLower() == lawyerEmail.Trim().ToLower());
            if (l != null)
            {
                lawyerId = l.LawyerId;
            }
        }

        var appointments = await _appointmentService.GetAllAppointmentsAsync(lawyerId, customerId, status, parsedDate);
        return Ok(appointments);
    }

    /// <summary>
    /// Get appointment details by appointment ID.
    /// </summary>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetAppointmentById(Guid id)
    {
        var appointment = await _appointmentService.GetAppointmentByIdAsync(id);
        if (appointment == null)
            return NotFound(new { message = $"Appointment '{id}' was not found." });

        return Ok(appointment);
    }

    /// <summary>
    /// Update appointment notes or non-critical details.
    /// </summary>
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateAppointment(Guid id, [FromBody] UpdateAppointmentRequest request)
    {
        try
        {
            var updated = await _appointmentService.UpdateAppointmentAsync(id, request);
            if (updated == null)
                return NotFound(new { message = $"Appointment '{id}' was not found." });

            return Ok(updated);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Delete an appointment record.
    /// </summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteAppointment(Guid id)
    {
        var deleted = await _appointmentService.DeleteAppointmentAsync(id);
        if (!deleted)
            return NotFound(new { message = $"Appointment '{id}' was not found." });

        return NoContent();
    }

    /// <summary>
    /// Confirm a requested or rescheduled appointment.
    /// </summary>
    [HttpPost("{id:guid}/confirm")]
    public async Task<IActionResult> ConfirmAppointment(Guid id, [FromBody] AppointmentActionRequest? request = null)
    {
        try
        {
            var result = await _appointmentService.ConfirmAppointmentAsync(id, request?.Notes);
            if (result == null)
                return NotFound(new { message = $"Appointment '{id}' was not found." });

            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Reject an appointment request.
    /// </summary>
    [HttpPost("{id:guid}/reject")]
    public async Task<IActionResult> RejectAppointment(Guid id, [FromBody] AppointmentActionRequest? request = null)
    {
        try
        {
            var result = await _appointmentService.RejectAppointmentAsync(id, request?.Notes);
            if (result == null)
                return NotFound(new { message = $"Appointment '{id}' was not found." });

            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Cancel an active appointment.
    /// </summary>
    [HttpPost("{id:guid}/cancel")]
    public async Task<IActionResult> CancelAppointment(Guid id, [FromBody] CancelAppointmentRequest? request = null)
    {
        try
        {
            var result = await _appointmentService.CancelAppointmentAsync(id, request?.Reason);
            if (result == null)
                return NotFound(new { message = $"Appointment '{id}' was not found." });

            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Reschedule an appointment to a new available time slot.
    /// </summary>
    [HttpPost("{id:guid}/reschedule")]
    public async Task<IActionResult> RescheduleAppointment(Guid id, [FromBody] RescheduleAppointmentRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        try
        {
            var result = await _appointmentService.RescheduleAppointmentAsync(id, request.NewSlotId, request.Reason);
            if (result == null)
                return NotFound(new { message = $"Appointment '{id}' was not found." });

            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Mark an appointment as completed.
    /// </summary>
    [HttpPost("{id:guid}/complete")]
    public async Task<IActionResult> CompleteAppointment(Guid id, [FromBody] AppointmentActionRequest? request = null)
    {
        try
        {
            var result = await _appointmentService.CompleteAppointmentAsync(id, request?.Notes);
            if (result == null)
                return NotFound(new { message = $"Appointment '{id}' was not found." });

            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Get the complete status transition history audit log for an appointment.
    /// </summary>
    [HttpGet("{id:guid}/history")]
    public async Task<IActionResult> GetAppointmentHistory(Guid id)
    {
        var history = await _appointmentService.GetAppointmentHistoryAsync(id);
        return Ok(history);
    }

    /// <summary>
    /// Get all unbooked slots for a specific lawyer on a given date.
    /// </summary>
    [HttpGet("available-slots")]
    public async Task<IActionResult> GetAvailableSlots(
        [FromQuery] Guid lawyerId,
        [FromQuery] string date)
    {
        if (lawyerId == Guid.Empty)
            return BadRequest(new { message = "lawyerId parameter is required." });

        if (string.IsNullOrWhiteSpace(date) || !DateOnly.TryParse(date, out var parsedDate))
            return BadRequest(new { message = "Valid date parameter (YYYY-MM-DD) is required." });

        var slots = await _appointmentService.GetAvailableSlotsAsync(lawyerId, parsedDate);
        return Ok(slots);
    }

    /// <summary>
    /// Check whether a proposed appointment time conflicts with any existing booking for the lawyer.
    /// </summary>
    [HttpGet("check-conflict")]
    public async Task<IActionResult> CheckConflict(
        [FromQuery] Guid lawyerId,
        [FromQuery] string date,
        [FromQuery] string startTime,
        [FromQuery] string endTime,
        [FromQuery] Guid? excludeAppointmentId = null)
    {
        if (lawyerId == Guid.Empty)
            return BadRequest(new { message = "lawyerId parameter is required." });

        if (!DateOnly.TryParse(date, out var parsedDate))
            return BadRequest(new { message = "Valid date (YYYY-MM-DD) is required." });

        if (!TimeOnly.TryParse(startTime, out var parsedStart) || !TimeOnly.TryParse(endTime, out var parsedEnd))
            return BadRequest(new { message = "Valid startTime and endTime (HH:mm) are required." });

        var conflict = await _appointmentService.CheckConflictAsync(lawyerId, parsedDate, parsedStart, parsedEnd, excludeAppointmentId);
        return Ok(conflict);
    }
}
