using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using LegalService.API.Data;
using LegalService.API.DTOs.Requests;
using LegalService.API.Models.Entities;
using LegalService.API.Services;
using Xunit;

namespace LegalService.Tests;

public class ServiceRequestServiceTests
{
    // ─── Test infrastructure ────────────────────────────────────────────────────

    private static ApplicationDbContext CreateInMemoryDb() =>
        new(new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private static ServiceRequestService CreateService(ApplicationDbContext ctx) =>
        new(ctx, NullLogger<ServiceRequestService>.Instance);

    private static readonly Guid TestCustomerId = Guid.NewGuid();

    // ─── CREATE ─────────────────────────────────────────────────────────────────

    [Fact]
    public async Task CreateAsync_ValidRequest_ReturnsCreatedResponse()
    {
        using var ctx = CreateInMemoryDb();
        var svc = CreateService(ctx);

        var result = await svc.CreateAsync(TestCustomerId, new CreateServiceRequestRequest
        {
            Title = "Review my lease",
            Description = "I need a lawyer to review my commercial lease agreement.",
            RequestType = "Contract Review",
            Priority = "High"
        });

        Assert.NotNull(result);
        Assert.NotEqual(Guid.Empty, result.ServiceRequestId);
        Assert.Equal("Review my lease", result.Title);
        Assert.Equal("Contract Review", result.RequestType);
        Assert.Equal("High", result.Priority);
        Assert.Equal("Submitted", result.Status);
        Assert.Equal(TestCustomerId, result.CustomerId);
        Assert.True(result.IsEditable);
        Assert.True(result.IsCancellable);
    }

    [Fact]
    public async Task CreateAsync_PersistsToDatabase()
    {
        using var ctx = CreateInMemoryDb();
        var svc = CreateService(ctx);

        await svc.CreateAsync(TestCustomerId, new CreateServiceRequestRequest
        {
            Title = "My Request",
            Description = "Description of the request",
            RequestType = "Legal Advice"
        });

        Assert.Equal(1, await ctx.ServiceRequests.CountAsync());
        Assert.Equal(1, await ctx.AuditLogs.CountAsync());
    }

    // ─── GET ALL ────────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetAllAsync_NoFilter_ReturnsAllRequests()
    {
        using var ctx = CreateInMemoryDb();
        ctx.ServiceRequests.AddRange(
            new ServiceRequest { ServiceRequestId = Guid.NewGuid(), CustomerId = TestCustomerId, Title = "R1", Description = "D", RequestType = "Legal Advice", Status = ServiceRequestStatus.Submitted, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new ServiceRequest { ServiceRequestId = Guid.NewGuid(), CustomerId = Guid.NewGuid(), Title = "R2", Description = "D", RequestType = "Contract Review", Status = ServiceRequestStatus.InProgress, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow }
        );
        await ctx.SaveChangesAsync();

        var svc = CreateService(ctx);
        var results = (await svc.GetAllAsync()).ToList();

        Assert.Equal(2, results.Count);
    }

    [Fact]
    public async Task GetAllAsync_FilterByCustomerId_ReturnsOnlyCustomerRequests()
    {
        using var ctx = CreateInMemoryDb();
        var otherId = Guid.NewGuid();
        ctx.ServiceRequests.AddRange(
            new ServiceRequest { ServiceRequestId = Guid.NewGuid(), CustomerId = TestCustomerId, Title = "Mine", Description = "D", RequestType = "Legal Advice", Status = ServiceRequestStatus.Submitted, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new ServiceRequest { ServiceRequestId = Guid.NewGuid(), CustomerId = otherId, Title = "Other", Description = "D", RequestType = "Legal Advice", Status = ServiceRequestStatus.Submitted, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow }
        );
        await ctx.SaveChangesAsync();

        var svc = CreateService(ctx);
        var results = (await svc.GetAllAsync(customerId: TestCustomerId)).ToList();

        Assert.Single(results);
        Assert.Equal("Mine", results[0].Title);
    }

    [Fact]
    public async Task GetAllAsync_FilterByStatus_ReturnsOnlyMatchingRequests()
    {
        using var ctx = CreateInMemoryDb();
        ctx.ServiceRequests.AddRange(
            new ServiceRequest { ServiceRequestId = Guid.NewGuid(), CustomerId = TestCustomerId, Title = "S", Description = "D", RequestType = "Legal Advice", Status = ServiceRequestStatus.Submitted, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new ServiceRequest { ServiceRequestId = Guid.NewGuid(), CustomerId = TestCustomerId, Title = "IP", Description = "D", RequestType = "Legal Advice", Status = ServiceRequestStatus.InProgress, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow }
        );
        await ctx.SaveChangesAsync();

        var svc = CreateService(ctx);
        var results = (await svc.GetAllAsync(status: "Submitted")).ToList();

        Assert.Single(results);
        Assert.Equal("Submitted", results[0].Status);
    }

    // ─── GET BY ID ───────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetByIdAsync_ExistingId_ReturnsRequest()
    {
        using var ctx = CreateInMemoryDb();
        var id = Guid.NewGuid();
        ctx.ServiceRequests.Add(new ServiceRequest { ServiceRequestId = id, CustomerId = TestCustomerId, Title = "T", Description = "D", RequestType = "Legal Advice", Status = ServiceRequestStatus.Submitted, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow });
        await ctx.SaveChangesAsync();

        var svc = CreateService(ctx);
        var result = await svc.GetByIdAsync(id);

        Assert.NotNull(result);
        Assert.Equal(id, result!.ServiceRequestId);
    }

    [Fact]
    public async Task GetByIdAsync_NonExistingId_ReturnsNull()
    {
        using var ctx = CreateInMemoryDb();
        var svc = CreateService(ctx);
        var result = await svc.GetByIdAsync(Guid.NewGuid());
        Assert.Null(result);
    }

    // ─── UPDATE ─────────────────────────────────────────────────────────────────

    [Fact]
    public async Task UpdateAsync_SubmittedRequest_UpdatesSuccessfully()
    {
        using var ctx = CreateInMemoryDb();
        var id = Guid.NewGuid();
        ctx.ServiceRequests.Add(new ServiceRequest { ServiceRequestId = id, CustomerId = TestCustomerId, Title = "Old", Description = "Old D", RequestType = "Legal Advice", Status = ServiceRequestStatus.Submitted, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow });
        await ctx.SaveChangesAsync();

        var svc = CreateService(ctx);
        var result = await svc.UpdateAsync(id, TestCustomerId, new UpdateServiceRequestRequest { Title = "New", Description = "New D", RequestType = "Contract Review" });

        Assert.NotNull(result);
        Assert.Equal("New", result!.Title);
        Assert.Equal("Contract Review", result.RequestType);
    }

    [Fact]
    public async Task UpdateAsync_WrongCustomer_ThrowsUnauthorizedException()
    {
        using var ctx = CreateInMemoryDb();
        var id = Guid.NewGuid();
        ctx.ServiceRequests.Add(new ServiceRequest { ServiceRequestId = id, CustomerId = TestCustomerId, Title = "T", Description = "D", RequestType = "Legal Advice", Status = ServiceRequestStatus.Submitted, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow });
        await ctx.SaveChangesAsync();

        var svc = CreateService(ctx);
        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => svc.UpdateAsync(id, Guid.NewGuid(), new UpdateServiceRequestRequest { Title = "X", Description = "X", RequestType = "X" }));
    }

    [Fact]
    public async Task UpdateAsync_ApprovedRequest_ThrowsInvalidOperationException()
    {
        using var ctx = CreateInMemoryDb();
        var id = Guid.NewGuid();
        ctx.ServiceRequests.Add(new ServiceRequest { ServiceRequestId = id, CustomerId = TestCustomerId, Title = "T", Description = "D", RequestType = "Legal Advice", Status = ServiceRequestStatus.Approved, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow });
        await ctx.SaveChangesAsync();

        var svc = CreateService(ctx);
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => svc.UpdateAsync(id, TestCustomerId, new UpdateServiceRequestRequest { Title = "X", Description = "X", RequestType = "X" }));
    }

    // ─── CANCEL ─────────────────────────────────────────────────────────────────

    [Fact]
    public async Task CancelAsync_SubmittedRequest_SetsStatusCancelled()
    {
        using var ctx = CreateInMemoryDb();
        var id = Guid.NewGuid();
        ctx.ServiceRequests.Add(new ServiceRequest { ServiceRequestId = id, CustomerId = TestCustomerId, Title = "T", Description = "D", RequestType = "Legal Advice", Status = ServiceRequestStatus.Submitted, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow });
        await ctx.SaveChangesAsync();

        var svc = CreateService(ctx);
        var result = await svc.CancelAsync(id, TestCustomerId);

        Assert.NotNull(result);
        Assert.Equal("Cancelled", result!.Status);
    }

    [Fact]
    public async Task CancelAsync_ApprovedRequest_ThrowsInvalidOperationException()
    {
        using var ctx = CreateInMemoryDb();
        var id = Guid.NewGuid();
        ctx.ServiceRequests.Add(new ServiceRequest { ServiceRequestId = id, CustomerId = TestCustomerId, Title = "T", Description = "D", RequestType = "Legal Advice", Status = ServiceRequestStatus.Approved, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow });
        await ctx.SaveChangesAsync();

        var svc = CreateService(ctx);
        await Assert.ThrowsAsync<InvalidOperationException>(() => svc.CancelAsync(id, TestCustomerId));
    }

    // ─── STATUS TRANSITIONS ─────────────────────────────────────────────────────

    [Fact]
    public async Task ChangeStatusAsync_ValidTransition_UpdatesStatus()
    {
        using var ctx = CreateInMemoryDb();
        var id = Guid.NewGuid();
        ctx.ServiceRequests.Add(new ServiceRequest { ServiceRequestId = id, CustomerId = TestCustomerId, Title = "T", Description = "D", RequestType = "Legal Advice", Status = ServiceRequestStatus.Submitted, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow });
        await ctx.SaveChangesAsync();

        var svc = CreateService(ctx);
        var result = await svc.ChangeStatusAsync(id, ServiceRequestStatus.InProgress, "Assigned to team", Guid.NewGuid());

        Assert.NotNull(result);
        Assert.Equal("InProgress", result!.Status);
    }

    [Fact]
    public async Task ChangeStatusAsync_InvalidTransition_ThrowsInvalidOperationException()
    {
        using var ctx = CreateInMemoryDb();
        var id = Guid.NewGuid();
        ctx.ServiceRequests.Add(new ServiceRequest { ServiceRequestId = id, CustomerId = TestCustomerId, Title = "T", Description = "D", RequestType = "Legal Advice", Status = ServiceRequestStatus.Completed, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow });
        await ctx.SaveChangesAsync();

        var svc = CreateService(ctx);
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => svc.ChangeStatusAsync(id, ServiceRequestStatus.Submitted, null, null));
    }

    [Fact]
    public async Task ChangeStatusAsync_CreatesAuditLog()
    {
        using var ctx = CreateInMemoryDb();
        var id = Guid.NewGuid();
        ctx.ServiceRequests.Add(new ServiceRequest { ServiceRequestId = id, CustomerId = TestCustomerId, Title = "T", Description = "D", RequestType = "Legal Advice", Status = ServiceRequestStatus.Submitted, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow });
        await ctx.SaveChangesAsync();

        var svc = CreateService(ctx);
        await svc.ChangeStatusAsync(id, ServiceRequestStatus.InProgress, "Processing", Guid.NewGuid());

        Assert.Equal(1, await ctx.AuditLogs.CountAsync());
    }
}
