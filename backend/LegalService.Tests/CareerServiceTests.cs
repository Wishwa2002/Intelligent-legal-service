using System;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using LegalService.API.Data;
using LegalService.API.DTOs.Requests;
using LegalService.API.Models.Entities;
using LegalService.API.Services;
using Xunit;

namespace LegalService.Tests;

public class CareerServiceTests
{
    private ApplicationDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        return new ApplicationDbContext(options);
    }

    [Fact]
    public async Task CreateCareerAsync_AddsCareerAndReturnsDto()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var service = new CareerService(context);
        var request = new CreateCareerRequest
        {
            JobTitle = "Legal Researcher",
            Description = "Conduct in-depth case law research."
        };

        // Act
        var result = await service.CreateCareerAsync(request);

        // Assert
        Assert.NotNull(result);
        Assert.NotEqual(Guid.Empty, result.CareerId);
        Assert.Equal("Legal Researcher", result.JobTitle);
        Assert.Equal("Conduct in-depth case law research.", result.Description);
        Assert.Equal(0, result.ApplicationsCount);
    }

    [Fact]
    public async Task CreateApplicationAsync_AddsJobApplication()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var career = new Career
        {
            CareerId = Guid.NewGuid(),
            JobTitle = "Documentation Specialist",
            Description = "Process and draft documents."
        };
        context.Careers.Add(career);
        await context.SaveChangesAsync();

        var service = new CareerService(context);
        var request = new CreateJobApplicationRequest
        {
            CareerId = career.CareerId,
            ApplicantName = "Sarah Connor"
        };

        // Act
        var result = await service.CreateApplicationAsync(request);

        // Assert
        Assert.NotNull(result);
        Assert.NotEqual(Guid.Empty, result.ApplicationId);
        Assert.Equal(career.CareerId, result.CareerId);
        Assert.Equal("Sarah Connor", result.ApplicantName);
        Assert.Equal("Submitted", result.Status);
    }

    [Fact]
    public async Task UpdateApplicationStatusAsync_UpdatesStatusSuccessfully()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var career = new Career
        {
            CareerId = Guid.NewGuid(),
            JobTitle = "Documentation Specialist",
            Description = "Process and draft documents."
        };
        var app = new JobApplication
        {
            ApplicationId = Guid.NewGuid(),
            CareerId = career.CareerId,
            ApplicantName = "Sarah Connor",
            Status = "UnderReview",
            AppliedAt = DateTime.UtcNow,
            Career = career
        };
        context.Careers.Add(career);
        context.JobApplications.Add(app);
        await context.SaveChangesAsync();

        var service = new CareerService(context);

        // Act
        var result = await service.UpdateApplicationStatusAsync(app.ApplicationId, "Shortlisted");

        // Assert
        Assert.NotNull(result);
        Assert.Equal("Shortlisted", result.Status);
    }
}
