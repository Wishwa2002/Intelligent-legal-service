using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LegalService.API.Authentication.Services;
using LegalService.API.Data;
using LegalService.API.DTOs.Requests;
using LegalService.API.Interfaces;
using LegalService.API.Models.Entities;

namespace LegalService.API.Controllers;

[ApiController]
[Route("api/lawyers")]
public class LawyersController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IAppointmentService _appointmentService;
    private readonly IPasswordService _passwordService;

    public LawyersController(
        ApplicationDbContext context,
        IAppointmentService appointmentService,
        IPasswordService passwordService)
    {
        _context = context;
        _appointmentService = appointmentService;
        _passwordService = passwordService;
    }

    /// <summary>
    /// Get all lawyers, optionally filtered by specialization name, ID, or text search.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetLawyers([FromQuery] string? specialization, [FromQuery] string? search)
    {
        var query = _context.Lawyers
            .Include(l => l.LawyerSpecializations)
                .ThenInclude(ls => ls.Specialization)
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(specialization) && specialization != "All")
        {
            var filter = specialization.Trim().ToLowerInvariant();
            if (int.TryParse(filter, out int specId))
            {
                query = query.Where(l => l.LawyerSpecializations.Any(ls => ls.SpecializationId == specId));
            }
            else
            {
                query = query.Where(l => l.LawyerSpecializations.Any(ls => 
                    ls.Specialization.Name.ToLower() == filter || 
                    ls.Specialization.Name.ToLower().Contains(filter)));
            }
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLowerInvariant();
            query = query.Where(l =>
                l.Name.ToLower().Contains(s) ||
                l.Qualification.ToLower().Contains(s) ||
                l.ProfileDescription.ToLower().Contains(s) ||
                l.LicenseNumber.ToLower().Contains(s) ||
                l.LawyerSpecializations.Any(ls => ls.Specialization.Name.ToLower().Contains(s)));
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
    [HttpGet("{id:guid}")]
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
    /// Get lawyer by email.
    /// </summary>
    [HttpGet("by-email/{email}")]
    public async Task<IActionResult> GetLawyerByEmail(string email)
    {
        if (string.IsNullOrWhiteSpace(email))
            return BadRequest(new { message = "Email is required." });

        var normalizedEmail = email.Trim().ToLowerInvariant();
        var lawyer = await _context.Lawyers
            .Include(l => l.LawyerSpecializations)
                .ThenInclude(ls => ls.Specialization)
            .AsNoTracking()
            .FirstOrDefaultAsync(l => l.Email != null && l.Email.ToLower() == normalizedEmail);

        if (lawyer == null)
            return NotFound(new { message = $"No lawyer registered with email '{email}'." });

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
    /// Add a new lawyer with one designated specialization category and create their login account.
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> CreateLawyer([FromBody] CreateLawyerRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var normalizedLicense = request.LicenseNumber.Trim().ToUpperInvariant();

        // 1. Verify email uniqueness
        if (await _context.Lawyers.AnyAsync(l => l.Email != null && l.Email.ToLower() == normalizedEmail))
        {
            return Conflict(new { message = $"A lawyer with email '{request.Email}' already exists in the system." });
        }

        // 2. Verify license number uniqueness
        if (await _context.Lawyers.AnyAsync(l => l.LicenseNumber.ToUpper() == normalizedLicense))
        {
            return Conflict(new { message = $"A lawyer with Bar/License number '{request.LicenseNumber}' already exists." });
        }

        // 3. Resolve the single category specialization
        var requestedCategory = request.Category.Trim();
        var specialization = await _context.Specializations
            .FirstOrDefaultAsync(s => s.Name.ToLower() == requestedCategory.ToLower());

        if (specialization == null)
        {
            // Try matching allowed categories
            var matchedCategory = DbInitializer.AllowedCategories
                .FirstOrDefault(c => c.Equals(requestedCategory, StringComparison.OrdinalIgnoreCase) ||
                                     c.IndexOf(requestedCategory, StringComparison.OrdinalIgnoreCase) >= 0);

            if (matchedCategory != null)
            {
                specialization = await _context.Specializations
                    .FirstOrDefaultAsync(s => s.Name.ToLower() == matchedCategory.ToLower());

                if (specialization == null)
                {
                    specialization = new Specialization
                    {
                        Name = matchedCategory,
                        Description = $"Specialized legal counsel in {matchedCategory}."
                    };
                    _context.Specializations.Add(specialization);
                    await _context.SaveChangesAsync();
                }
            }
            else
            {
                return BadRequest(new
                {
                    message = $"Invalid category '{requestedCategory}'. Allowed categories are: {string.Join(", ", DbInitializer.AllowedCategories)}"
                });
            }
        }

        // 4. Create Lawyer record
        var lawyer = new Lawyer
        {
            LawyerId = Guid.NewGuid(),
            Name = request.Name.Trim(),
            Email = normalizedEmail,
            PhoneNumber = request.PhoneNumber?.Trim() ?? string.Empty,
            Qualification = string.IsNullOrWhiteSpace(request.Qualification) ? "LL.B Attorney-at-Law" : request.Qualification.Trim(),
            Experience = request.Experience,
            LicenseNumber = request.LicenseNumber.Trim(),
            ProfileDescription = request.ProfileDescription?.Trim() ?? string.Empty,
            Status = "Active",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Lawyers.Add(lawyer);

        // 5. Associate the single category (Many-to-Many bridge with 1 record)
        _context.LawyerSpecializations.Add(new LawyerSpecialization
        {
            LawyerId = lawyer.LawyerId,
            SpecializationId = specialization.SpecializationId
        });

        // 6. Create or update User credentials so the lawyer can log in
        var initialPassword = !string.IsNullOrWhiteSpace(request.Password) ? request.Password : "LawyerPassword123!";
        var passwordHash = _passwordService.HashPassword(initialPassword);

        var existingUser = await _context.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == normalizedEmail);
        if (existingUser == null)
        {
            var user = new User
            {
                Name = lawyer.Name,
                Email = normalizedEmail,
                Role = "Lawyer",
                PasswordHash = passwordHash,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _context.Users.Add(user);
        }
        else
        {
            existingUser.Role = "Lawyer";
            existingUser.Name = lawyer.Name;
            if (!string.IsNullOrWhiteSpace(request.Password))
            {
                existingUser.PasswordHash = passwordHash;
            }
            existingUser.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();

        var responseDto = new
        {
            lawyerId = lawyer.LawyerId,
            name = lawyer.Name,
            email = lawyer.Email,
            phoneNumber = lawyer.PhoneNumber,
            qualification = lawyer.Qualification,
            experience = lawyer.Experience,
            licenseNumber = lawyer.LicenseNumber,
            profileDescription = lawyer.ProfileDescription,
            status = lawyer.Status,
            specializations = new[]
            {
                new
                {
                    specializationId = specialization.SpecializationId,
                    name = specialization.Name,
                    description = specialization.Description
                }
            }
        };

        return CreatedAtAction(nameof(GetLawyerById), new { id = lawyer.LawyerId }, responseDto);
    }

    /// <summary>
    /// Delete a lawyer and their associated schedules and records.
    /// </summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteLawyer(Guid id)
    {
        var lawyer = await _context.Lawyers
            .Include(l => l.LawyerSpecializations)
            .Include(l => l.AvailabilitySlots)
            .Include(l => l.LawyerAvailabilities)
            .FirstOrDefaultAsync(l => l.LawyerId == id);

        if (lawyer == null)
            return NotFound(new { message = $"Lawyer with ID '{id}' not found." });

        // Check if there are active appointments
        var hasActiveAppointments = await _context.Appointments
            .AnyAsync(a => a.LawyerId == id && (a.Status == "Requested" || a.Status == "Confirmed"));

        if (hasActiveAppointments)
        {
            return BadRequest(new { message = "Cannot delete lawyer with pending or confirmed appointments. Please reassign or cancel consultations first." });
        }

        // Remove slots & availabilities
        if (lawyer.AvailabilitySlots.Any())
            _context.AvailabilitySlots.RemoveRange(lawyer.AvailabilitySlots);

        if (lawyer.LawyerAvailabilities.Any())
            _context.LawyerAvailabilities.RemoveRange(lawyer.LawyerAvailabilities);

        if (lawyer.LawyerSpecializations.Any())
            _context.LawyerSpecializations.RemoveRange(lawyer.LawyerSpecializations);

        _context.Lawyers.Remove(lawyer);
        await _context.SaveChangesAsync();

        return Ok(new { message = $"Lawyer '{lawyer.Name}' removed successfully." });
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
    [HttpGet("{id:guid}/slots")]
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
