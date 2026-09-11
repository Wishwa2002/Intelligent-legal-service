using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using LegalService.API.Data;
using LegalService.API.DTOs.Requests;
using LegalService.API.DTOs.Responses;
using LegalService.API.Interfaces;
using LegalService.API.Models.Entities;

namespace LegalService.API.Services;

public class CareerService : ICareerService
{
    private readonly ApplicationDbContext _context;

    public CareerService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<CareerResponse>> GetAllCareersAsync()
    {
        var careers = await _context.Careers
            .Include(c => c.JobApplications)
            .OrderBy(c => c.JobTitle)
            .ToListAsync();

        return careers.Select(MapToResponse);
    }

    public async Task<CareerResponse?> GetCareerByIdAsync(Guid careerId)
    {
        var career = await _context.Careers
            .Include(c => c.JobApplications)
            .FirstOrDefaultAsync(c => c.CareerId == careerId);

        return career == null ? null : MapToResponse(career);
    }

    public async Task<CareerResponse> CreateCareerAsync(CreateCareerRequest request)
    {
        var career = new Career
        {
            CareerId = Guid.NewGuid(),
            JobTitle = request.JobTitle.Trim(),
            Description = request.Description.Trim()
        };

        await _context.Careers.AddAsync(career);
        await _context.SaveChangesAsync();

        return MapToResponse(career);
    }

    public async Task<CareerResponse?> UpdateCareerAsync(Guid careerId, UpdateCareerRequest request)
    {
        var career = await _context.Careers
            .Include(c => c.JobApplications)
            .FirstOrDefaultAsync(c => c.CareerId == careerId);

        if (career == null)
            return null;

        career.JobTitle = request.JobTitle.Trim();
        career.Description = request.Description.Trim();

        await _context.SaveChangesAsync();
        return MapToResponse(career);
    }

    public async Task<bool> DeleteCareerAsync(Guid careerId)
    {
        var career = await _context.Careers
            .Include(c => c.JobApplications)
            .FirstOrDefaultAsync(c => c.CareerId == careerId);

        if (career == null)
            return false;

        _context.Careers.Remove(career);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<IEnumerable<JobApplicationResponse>> GetAllApplicationsAsync(Guid? careerId = null)
    {
        var query = _context.JobApplications
            .Include(ja => ja.Career)
            .AsQueryable();

        if (careerId.HasValue)
        {
            query = query.Where(ja => ja.CareerId == careerId.Value);
        }

        var apps = await query.OrderByDescending(ja => ja.AppliedAt).ToListAsync();
        return apps.Select(MapToResponse);
    }

    public async Task<JobApplicationResponse?> GetApplicationByIdAsync(Guid applicationId)
    {
        var app = await _context.JobApplications
            .Include(ja => ja.Career)
            .FirstOrDefaultAsync(ja => ja.ApplicationId == applicationId);

        return app == null ? null : MapToResponse(app);
    }

    public async Task<JobApplicationResponse> CreateApplicationAsync(CreateJobApplicationRequest request)
    {
        var career = await _context.Careers.FindAsync(request.CareerId);
        if (career == null)
        {
            throw new ArgumentException($"Career with ID '{request.CareerId}' was not found.");
        }

        var app = new JobApplication
        {
            ApplicationId = Guid.NewGuid(),
            CareerId = request.CareerId,
            ApplicantName = request.ApplicantName.Trim(),
            Status = "Submitted",
            AppliedAt = DateTime.UtcNow
        };

        await _context.JobApplications.AddAsync(app);
        await _context.SaveChangesAsync();

        return (await GetApplicationByIdAsync(app.ApplicationId))!;
    }

    public async Task<JobApplicationResponse?> UpdateApplicationStatusAsync(Guid applicationId, string status)
    {
        var app = await _context.JobApplications
            .Include(ja => ja.Career)
            .FirstOrDefaultAsync(ja => ja.ApplicationId == applicationId);

        if (app == null)
            return null;

        app.Status = status.Trim();
        await _context.SaveChangesAsync();
        return MapToResponse(app);
    }

    private static CareerResponse MapToResponse(Career career)
    {
        return new CareerResponse
        {
            CareerId = career.CareerId,
            JobTitle = career.JobTitle,
            Description = career.Description,
            ApplicationsCount = career.JobApplications?.Count ?? 0
        };
    }

    private static JobApplicationResponse MapToResponse(JobApplication app)
    {
        return new JobApplicationResponse
        {
            ApplicationId = app.ApplicationId,
            CareerId = app.CareerId,
            JobTitle = app.Career?.JobTitle ?? string.Empty,
            ApplicantName = app.ApplicantName,
            Status = app.Status,
            AppliedAt = app.AppliedAt
        };
    }
}
