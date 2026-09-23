using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LegalService.API.Data;
using LegalService.API.Interfaces;

namespace LegalService.API.Controllers;

[ApiController]
[Route("api/lawyers")]
public class LawyersController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IAppointmentService _appointmentService;

    public LawyersController(ApplicationDbContext context, IAppointmentService appointmentService)
    {
        _context = context;
        _appointmentService = appointmentService;
    }

    /// <summary>
    /// Get all lawyers, optionally filtered by specialization name or ID.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetLawyers([FromQuery] string? specialization)
    {
        var query = _context.Lawyers
            .Include(l => l.LawyerSpecializations)
                .ThenInclude(ls => ls.Specialization)
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(specialization))
        {
            var filter = specialization.Trim().ToLowerInvariant();
            if (int.TryParse(filter, out int specId))
            {
                query = query.Where(l => l.LawyerSpecializations.Any(ls => ls.SpecializationId == specId));
            }
            else
            {
                query = query.Where(l => l.LawyerSpecializations.Any(ls => ls.Specialization.Name.ToLower() == filter || ls.Specialization.Name.ToLower().Contains(filter)));
            }
        }

        var lawyers = await query
            .OrderBy(l => l.Name)
            .Select(l => new
            {
                lawyerId = l.LawyerId,
                name = string.IsNullOrWhiteSpace(l.Name) ? l.Qualification : l.Name,
                email = l.Email,
                phoneNumber = l.PhoneNumber,
                qualification = l.Qualification,
                experience = l.Experience,
                licenseNumber = l.LicenseNumber,
                profileDescription = l.ProfileDescription,
                status = l.Status,
                specializations = l.LawyerSpecializations.Select(ls => new
                {
                    specializationId = ls.SpecializationId,
                    name = ls.Specialization.Name,
                    description = ls.Specialization.Description
                }).ToList()
            })
            .ToListAsync();

        return Ok(lawyers);
    }

    /// <summary>
    /// Get lawyer by ID.
    /// </summary>
    [HttpGet("{id}")]
    public async Task<IActionResult> GetLawyerById(Guid id)
    {
        var lawyer = await _context.Lawyers
            .Include(l => l.LawyerSpecializations)
                .ThenInclude(ls => ls.Specialization)
            .AsNoTracking()
            .FirstOrDefaultAsync(l => l.LawyerId == id);

        if (lawyer == null)
            return NotFound(new { message = $"Lawyer with ID '{id}' not found." });

        return Ok(new
        {
            lawyerId = lawyer.LawyerId,
            name = string.IsNullOrWhiteSpace(lawyer.Name) ? lawyer.Qualification : lawyer.Name,
            email = lawyer.Email,
            phoneNumber = lawyer.PhoneNumber,
            qualification = lawyer.Qualification,
            experience = lawyer.Experience,
            licenseNumber = lawyer.LicenseNumber,
            profileDescription = lawyer.ProfileDescription,
            status = lawyer.Status,
            specializations = lawyer.LawyerSpecializations.Select(ls => new
            {
                specializationId = ls.SpecializationId,
                name = ls.Specialization.Name,
                description = ls.Specialization.Description
            }).ToList()
        });
    }

    /// <summary>
    /// Get all law specializations with lawyer counts.
    /// </summary>
    [HttpGet("specializations")]
    public async Task<IActionResult> GetSpecializations()
    {
        var specializations = await _context.Specializations
            .Include(s => s.LawyerSpecializations)
            .AsNoTracking()
            .OrderBy(s => s.SpecializationId)
            .Select(s => new
            {
                specializationId = s.SpecializationId,
                name = s.Name,
                description = s.Description,
                lawyerCount = s.LawyerSpecializations.Count
            })
            .ToListAsync();

        return Ok(specializations);
    }

    /// <summary>
    /// Get available appointment slots for a lawyer on a given date.
    /// </summary>
    [HttpGet("{id}/slots")]
    public async Task<IActionResult> GetLawyerSlots(Guid id, [FromQuery] string? date)
    {
        DateOnly queryDate;
        if (!string.IsNullOrWhiteSpace(date) && DateOnly.TryParse(date, out var parsedDate))
        {
            queryDate = parsedDate;
        }
        else
        {
            queryDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(1));
        }

        var slots = await _appointmentService.GetAvailableSlotsAsync(id, queryDate);
        return Ok(slots);
    }
}
