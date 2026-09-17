using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using LegalService.API.Data;
using LegalService.API.DTOs.Requests;
using LegalService.API.DTOs.Responses;
using LegalService.API.Interfaces;
using LegalService.API.Authentication.Services;
using LegalService.API.Models.Entities;
using LegalService.API.Services;
using Moq;
using Xunit;

namespace LegalService.Tests;

public class ClerkServiceTests
{
    private ApplicationDbContext CreateInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        return new ApplicationDbContext(options);
    }

    [Fact]
    public async Task GetAllClerksAsync_ReturnsAllClerksWithCalculatedCounts()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var clerk1 = new Clerk
        {
            ClerkId = 1,
            Name = "John Doe",
            Email = "john@example.com",
            Contact = "1234567890",
            Department = "Contracts",
            IsActive = true
        };

        context.Clerks.Add(clerk1);
        await context.SaveChangesAsync();

        var mockDocReqService = new Mock<IDocumentationRequestService>();
        var mockPasswordService = new Mock<IPasswordService>();
        var service = new ClerkService(context, mockDocReqService.Object, mockPasswordService.Object);

        // Act
        var result = (await service.GetAllClerksAsync()) as List<ClerkResponse>
            ?? new List<ClerkResponse>(await service.GetAllClerksAsync());

        // Assert
        Assert.Single(result);
        Assert.Equal("John Doe", result[0].FullName);
        Assert.Equal("Contracts", result[0].Department);
        Assert.Equal(0, result[0].ActiveAssignmentsCount);
    }

    [Fact]
    public async Task CreateClerkAsync_WithValidData_CreatesClerk()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var mockDocReqService = new Mock<IDocumentationRequestService>();
        var mockPasswordService = new Mock<IPasswordService>();
        mockPasswordService.Setup(p => p.HashPassword(It.IsAny<string>())).Returns("hashed_pwd");

        var service = new ClerkService(context, mockDocReqService.Object, mockPasswordService.Object);
        var request = new CreateClerkRequest
        {
            FullName = "Jane Smith",
            Email = "jane@example.com",
            Password = "password123",
            Contact = "9876543210",
            Department = "Litigation"
        };

        // Act
        var result = await service.CreateClerkAsync(request);

        // Assert
        Assert.NotNull(result);
        Assert.True(result.ClerkId > 0);
        Assert.Equal("Jane Smith", result.FullName);
        Assert.Equal("Litigation", result.Department);
    }

    [Fact]
    public async Task CreateClerkAsync_WithDuplicateEmail_ThrowsArgumentException()
    {
        // Arrange
        using var context = CreateInMemoryDbContext();
        var existingClerk = new Clerk
        {
            ClerkId = 1,
            Name = "Existing Clerk",
            Email = "duplicate@example.com",
            Contact = "1111111111",
            Department = "General"
        };
        context.Clerks.Add(existingClerk);
        await context.SaveChangesAsync();

        var mockDocReqService = new Mock<IDocumentationRequestService>();
        var mockPasswordService = new Mock<IPasswordService>();
        var service = new ClerkService(context, mockDocReqService.Object, mockPasswordService.Object);

        var request = new CreateClerkRequest
        {
            FullName = "New Clerk",
            Email = "duplicate@example.com",
            Password = "password123",
            Contact = "5555555555",
            Department = "General"
        };

        // Act & Assert
        await Assert.ThrowsAsync<ArgumentException>(() => service.CreateClerkAsync(request));
    }
}
