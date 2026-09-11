using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using LegalService.API.Data;
using LegalService.API.DTOs.Requests;
using LegalService.API.Models.Entities;
using LegalService.API.Services;
using Xunit;

namespace LegalService.Tests;

public class DocumentationRequestServiceTests
{
    private ApplicationDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        return new ApplicationDbContext(options);
    }

    [Fact]
    public async Task CreateRequestAsync_WithValidData_CreatesDocumentationRequest()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var customerId = 101;
        var docService = new DocumentationService
        {
            ServiceId = 1,
            Name = "Power of Attorney",
            Description = "General POA drafting",
            RequiredDocuments = "[\"NIC Front/Back\", \"Witness Statement\"]",
            IsActive = true
        };

        context.DocumentationServices.Add(docService);
        await context.SaveChangesAsync();

        var service = new DocumentationRequestService(context);
        var request = new CreateDocumentationRequestRequest
        {
            ServiceId = 1,
            DocumentType = "Power of Attorney"
        };

        // Act
        var result = await service.CreateRequestAsync(customerId, request);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(customerId, result.CustomerId);
        Assert.Equal("PENDING", result.Status);
        Assert.Equal(2, result.MissingDocuments.Count);
        Assert.Contains("NIC Front/Back", result.MissingDocuments);
        Assert.Contains("Witness Statement", result.MissingDocuments);
    }

    [Fact]
    public async Task AssignClerkAsync_WithValidClerk_AssignsAndChangesStatusToAssigned()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var customerId = 102;
        var clerk = new Clerk
        {
            ClerkId = 1,
            Name = "Clerk Mark",
            Email = "mark@example.com",
            Contact = "1234567890",
            Department = "General",
            IsActive = true
        };
        var docService = new DocumentationService
        {
            ServiceId = 1,
            Name = "Affidavit",
            Description = "Sworn statement",
            IsActive = true
        };
        var docReq = new DocumentationRequest
        {
            RequestId = 1,
            CustomerId = customerId,
            ServiceId = 1,
            DocumentType = "Affidavit",
            Status = "PENDING",
            CreatedAt = DateTime.UtcNow,
            DocumentationService = docService
        };

        context.Clerks.Add(clerk);
        context.DocumentationServices.Add(docService);
        context.DocumentationRequests.Add(docReq);
        await context.SaveChangesAsync();

        var service = new DocumentationRequestService(context);

        // Act
        var result = await service.AssignClerkAsync(docReq.RequestId, clerk.ClerkId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(clerk.ClerkId, result.AssignedClerkId);
        Assert.Equal("Clerk Mark", result.AssignedClerkName);
        Assert.Equal("ASSIGNED", result.Status);
    }

    [Fact]
    public async Task UpdateRequestStatusAsync_WithValidStatus_UpdatesRequestStatus()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var customerId = 103;
        var docService = new DocumentationService
        {
            ServiceId = 1,
            Name = "Affidavit",
            Description = "Sworn statement",
            IsActive = true
        };
        var docReq = new DocumentationRequest
        {
            RequestId = 2,
            CustomerId = customerId,
            ServiceId = 1,
            DocumentType = "Affidavit",
            Status = "IN_PROGRESS",
            CreatedAt = DateTime.UtcNow,
            DocumentationService = docService
        };

        context.DocumentationServices.Add(docService);
        context.DocumentationRequests.Add(docReq);
        await context.SaveChangesAsync();

        var service = new DocumentationRequestService(context);

        // Act
        var result = await service.UpdateRequestStatusAsync(docReq.RequestId, "COMPLETED");

        // Assert
        Assert.NotNull(result);
        Assert.Equal("COMPLETED", result.Status);
    }
}
