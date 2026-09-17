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

public class DocumentationServiceServiceTests
{
    private ApplicationDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        return new ApplicationDbContext(options);
    }

    [Fact]
    public async Task GetAllServicesAsync_ReturnsAllServicesWithParsedDocs()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var docService = new DocumentationService
        {
            ServiceId = 1,
            Name = "Affidavit Drafting",
            Description = "Sworn statement preparation",
            RequiredDocuments = "[\"Government ID\", \"Evidence Document\"]",
            IsActive = true
        };
        context.DocumentationServices.Add(docService);
        await context.SaveChangesAsync();

        var service = new DocumentationServiceService(context);

        // Act
        var result = (await service.GetAllServicesAsync()).ToList();

        // Assert
        Assert.Single(result);
        Assert.Equal("Affidavit Drafting", result[0].Name);
        Assert.Equal(2, result[0].RequiredDocuments.Count);
        Assert.Contains("Government ID", result[0].RequiredDocuments);
        Assert.Contains("Evidence Document", result[0].RequiredDocuments);
    }

    [Fact]
    public async Task CreateServiceAsync_SavesServiceAndSerializesDocs()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var service = new DocumentationServiceService(context);
        var request = new CreateDocumentationServiceRequest
        {
            Name = "Notarization",
            Description = "Document verification and notary seal",
            RequiredDocuments = new() { "Original Certificate", "Passport Copy" }
        };

        // Act
        var result = await service.CreateServiceAsync(request);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("Notarization", result.Name);
        Assert.Equal(2, result.RequiredDocuments.Count);

        var savedEntity = await context.DocumentationServices.FirstOrDefaultAsync(s => s.ServiceId == result.ServiceId);
        Assert.NotNull(savedEntity);
        Assert.Contains("Original Certificate", savedEntity.RequiredDocuments);
    }
}
