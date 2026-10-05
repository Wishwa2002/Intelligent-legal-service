using LegalService.API.DTOs.Requests;
using LegalService.API.Data;
using LegalService.API.Models.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LegalService.API.Controllers;

[ApiController]
public sealed class LegalCatalogController(ApplicationDbContext db) : ControllerBase
{
    [HttpGet("api/legal-services")]
    public async Task<IActionResult> GetLegalServices() => Ok(await db.LegalServices.AsNoTracking()
        .OrderBy(s => s.ServiceName).Select(s => new
        {
            s.LegalServiceId, s.ServiceName, s.Description, s.Category,
            // Retain the public response key; its value now consistently means eligible active lawyers.
            lawyerCount = db.LawyerSpecializations.Count(link => link.Lawyer.Status == "Active" &&
                link.Lawyer.LawyerSpecializations.Count == 1 && link.Specialization.Name.ToLower() == s.Category.ToLower())
        }).ToListAsync());

    [Authorize(Roles = "Admin"), HttpGet("api/legal-services/admin")]
    public async Task<IActionResult> GetAdminLegalServices()
    {
        var services = await db.LegalServices.AsNoTracking()
            .OrderBy(service => service.ServiceName)
            .Select(service => new
            {
                service.LegalServiceId, service.ServiceName, service.Description, service.Category,
                legacyReferenceCount = service.LawyerLegalServices.Count
            }).ToListAsync();
        var areaCounts = await db.Specializations.AsNoTracking()
            .Select(area => new
            {
                area.Name,
                count = area.LawyerSpecializations.Count(link => link.Lawyer.Status == "Active" && link.Lawyer.LawyerSpecializations.Count == 1)
            }).ToListAsync();
        var eligibleCounts = areaCounts.ToDictionary(area => area.Name.ToLowerInvariant(), area => area.count);
        return Ok(services.Select(service => new
        {
            service.LegalServiceId, service.ServiceName, service.Description, service.Category,
            eligibleLawyerCount = eligibleCounts.GetValueOrDefault(service.Category.ToLowerInvariant()),
            service.legacyReferenceCount
        }));
    }

    [Authorize(Roles = "Admin"), HttpGet("api/legal-services/{id:int}")]
    public async Task<IActionResult> GetLegalService(int id)
    {
        var service = await db.LegalServices.AsNoTracking()
            .Where(s => s.LegalServiceId == id)
            .Select(s => new { s.LegalServiceId, s.ServiceName, s.Description, s.Category })
            .SingleOrDefaultAsync();
        if (service == null) return NotFound();

        var category = service.Category.ToLower();
        var eligibleLawyers = await db.LawyerSpecializations.AsNoTracking()
            .Where(link => link.Lawyer.Status == "Active" && link.Lawyer.LawyerSpecializations.Count == 1 && link.Specialization.Name.ToLower() == category)
            .OrderBy(link => link.Lawyer.Name)
            .Select(link => new { link.Lawyer.LawyerId, link.Lawyer.Name })
            .ToListAsync();
        var legacyReferenceCount = await db.LawyerLegalServices.CountAsync(link => link.LegalServiceId == id);
        return Ok(new
        {
            service.LegalServiceId, service.ServiceName, service.Description, service.Category,
            eligibleLawyerCount = eligibleLawyers.Count, eligibleLawyers, legacyReferenceCount
        });
    }

    [Authorize(Roles = "Admin"), HttpPost("api/legal-services")]
    public async Task<IActionResult> CreateLegalService(LegalServiceRequest request)
    {
        var serviceName = request.ServiceName.Trim();
        var category = request.Category.Trim();
        if (string.IsNullOrWhiteSpace(serviceName) || string.IsNullOrWhiteSpace(category))
            return BadRequest(new { message = "Service name and category are required." });
        if (await db.LegalServices.AnyAsync(s => s.ServiceName.ToLower() == serviceName.ToLower()))
            return Conflict(new { message = "A legal service with this name already exists." });
        var practiceArea = await db.Specializations.AsNoTracking()
            .Where(s => s.Name.ToLower() == category.ToLower()).Select(s => s.Name).FirstOrDefaultAsync();
        if (practiceArea == null)
            return BadRequest(new { message = "Select an existing Practice Area." });

        var item = new LegalService.API.Models.Entities.LegalService
        {
            ServiceName = serviceName,
            Description = request.Description?.Trim() ?? "",
            Category = practiceArea,
            CreatedAt = DateTime.UtcNow
        };
        db.LegalServices.Add(item);
        await db.SaveChangesAsync();
        return Created("/api/legal-services", new
        {
            item.LegalServiceId, item.ServiceName, item.Description, item.Category,
            lawyerCount = await db.LawyerSpecializations.CountAsync(link => link.Lawyer.Status == "Active" &&
                link.Lawyer.LawyerSpecializations.Count == 1 && link.Specialization.Name.ToLower() == item.Category.ToLower())
        });
    }

    [Authorize(Roles = "Admin"), HttpPut("api/legal-services/{id:int}")]
    public async Task<IActionResult> UpdateLegalService(int id, LegalServiceRequest request)
    {
        var item = await db.LegalServices.FindAsync(id);
        if (item == null) return NotFound();
        var serviceName = request.ServiceName.Trim();
        var category = request.Category.Trim();
        if (string.IsNullOrWhiteSpace(serviceName) || string.IsNullOrWhiteSpace(category))
            return BadRequest(new { message = "Service name and category are required." });
        if (await db.LegalServices.AnyAsync(s => s.LegalServiceId != id && s.ServiceName.ToLower() == serviceName.ToLower()))
            return Conflict(new { message = "A legal service with this name already exists." });
        var practiceArea = await db.Specializations.AsNoTracking()
            .Where(s => s.Name.ToLower() == category.ToLower()).Select(s => s.Name).FirstOrDefaultAsync();
        if (practiceArea == null)
            return BadRequest(new { message = "Select an existing Practice Area." });

        item.ServiceName = serviceName;
        item.Description = request.Description?.Trim() ?? "";
        item.Category = practiceArea;
        item.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        var lawyerCount = await db.LawyerSpecializations.CountAsync(link => link.Lawyer.Status == "Active" &&
            link.Lawyer.LawyerSpecializations.Count == 1 && link.Specialization.Name.ToLower() == item.Category.ToLower());
        return Ok(new { item.LegalServiceId, item.ServiceName, item.Description, item.Category, lawyerCount });
    }

    [Authorize(Roles = "Admin"), HttpDelete("api/legal-services/{id:int}")]
    public async Task<IActionResult> DeleteLegalService(int id)
    {
        var item = await db.LegalServices.FindAsync(id);
        if (item == null) return NotFound();
        var lawyerCount = await db.LawyerLegalServices.CountAsync(s => s.LegalServiceId == id);
        if (lawyerCount > 0)
            return Conflict(new
            {
                message = $"Cannot delete '{item.ServiceName}'. This service still has {lawyerCount} legacy lawyer-service references and cannot be deleted safely.",
                lawyerCount, legacyReferenceCount = lawyerCount
            });
        db.LegalServices.Remove(item);
        await db.SaveChangesAsync();
        return NoContent();
    }

    [Authorize(Roles = "Admin"), HttpPost("api/specializations")]
    public async Task<IActionResult> CreateSpecialization(SpecializationRequest request)
    {
        var name = request.Name.Trim();
        if (await db.Specializations.AnyAsync(s => s.Name.ToLower() == name.ToLower()))
            return Conflict(new { message = "A Practice Area with this name already exists." });
        var item = new Specialization { Name = name, Description = request.Description?.Trim() ?? "" };
        db.Specializations.Add(item);
        await db.SaveChangesAsync();
        return Created("/api/specializations", new { item.SpecializationId, item.Name, item.Description });
    }

    [Authorize(Roles = "Admin"), HttpGet("api/specializations/{id:int}")]
    public async Task<IActionResult> GetSpecialization(int id)
    {
        var item = await db.Specializations.AsNoTracking()
            .Where(s => s.SpecializationId == id)
            .Select(s => new { s.SpecializationId, s.Name, s.Description })
            .SingleOrDefaultAsync();
        if (item == null) return NotFound();

        var lawyers = await db.LawyerSpecializations.AsNoTracking()
            .Where(link => link.SpecializationId == id)
            .OrderBy(link => link.Lawyer.Name)
            .Select(link => new { link.Lawyer.LawyerId, link.Lawyer.Name })
            .ToListAsync();
        var services = await db.LegalServices.AsNoTracking()
            .Where(service => service.Category.ToLower() == item.Name.ToLower())
            .OrderBy(service => service.ServiceName)
            .Select(service => new { service.LegalServiceId, service.ServiceName })
            .ToListAsync();
        return Ok(new
        {
            item.SpecializationId, item.Name, item.Description,
            lawyerCount = lawyers.Count, legalServiceCount = services.Count,
            lawyers, legalServices = services
        });
    }

    [Authorize(Roles = "Admin"), HttpPut("api/specializations/{id:int}")]
    public async Task<IActionResult> UpdateSpecialization(int id, SpecializationRequest request)
    {
        var item = await db.Specializations.FindAsync(id);
        if (item == null) return NotFound();
        var name = request.Name.Trim();
        if (await db.Specializations.AnyAsync(s => s.SpecializationId != id && s.Name.ToLower() == name.ToLower()))
            return Conflict(new { message = "A Practice Area with this name already exists." });
        // The existing service catalog relates categories by name. Keep that link intact on rename.
        var services = await db.LegalServices.Where(s => s.Category.ToLower() == item.Name.ToLower()).ToListAsync();
        foreach (var service in services) service.Category = name;
        item.Name = name;
        item.Description = request.Description?.Trim() ?? "";
        await db.SaveChangesAsync();
        return Ok(new { item.SpecializationId, item.Name, item.Description });
    }

    [Authorize(Roles = "Admin"), HttpDelete("api/specializations/{id:int}")]
    public async Task<IActionResult> DeleteSpecialization(int id)
    {
        var item = await db.Specializations.FindAsync(id);
        if (item == null) return NotFound();
        var lawyerCount = await db.LawyerSpecializations.CountAsync(s => s.SpecializationId == id);
        var legalServiceCount = await db.LegalServices.CountAsync(s => s.Category.ToLower() == item.Name.ToLower());
        var hasRecommendationHistory = await db.LawyerRecommendationWorkflows.AnyAsync(w => w.CategoryId == id);
        if (lawyerCount > 0 || legalServiceCount > 0 || hasRecommendationHistory)
            return Conflict(new
            {
                message = $"Cannot delete '{item.Name}'. Reassign or remove its relationships first."
                    + (hasRecommendationHistory ? " It is also used by recommendation history." : ""),
                lawyerCount, legalServiceCount, hasRecommendationHistory
            });
        db.Specializations.Remove(item);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
