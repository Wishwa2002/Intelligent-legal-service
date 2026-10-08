using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;

using LegalService.API.Authentication.Services;
using LegalService.API.Controllers;
using LegalService.API.Interfaces;
using LegalService.API.Infrastructure;
using LegalService.API.Models.Entities;

using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;

using Moq;
using Xunit;

namespace LegalService.Tests.IT24102275;

public sealed class AgentWorkflowsHttpTests : IAsyncLifetime
{
    private WebApplication _app = null!;
    private HttpClient _client = null!;

    private Mock<IPlanningCoordinatorService> _coordinatorMock = null!;

    private const string Key =
        "member4-test-signing-key-only-12345678901234567890";


    // =========================================================
    // TEST HOST SETUP
    // =========================================================

    public async Task InitializeAsync()
    {
        var builder = WebApplication.CreateBuilder();

        builder.Logging.ClearProviders();

        builder.WebHost.UseUrls(
            "http://127.0.0.1:0");


        // -----------------------------------------------------
        // Test configuration
        // -----------------------------------------------------

        builder.Configuration.AddInMemoryCollection(
            new Dictionary<string, string?>
            {
                ["Jwt:Key"] = Key,
                ["Jwt:Issuer"] = "member4-tests",
                ["Jwt:Audience"] = "member4-tests",
                ["Jwt:ExpiryMinutes"] = "10"
            });


        // -----------------------------------------------------
        // Register real controllers
        // -----------------------------------------------------

        builder.Services
            .AddControllers()
            .AddApplicationPart(
                typeof(AgentWorkflowsController).Assembly);


        // -----------------------------------------------------
        // Mock the Coordinator service
        // -----------------------------------------------------

        _coordinatorMock =
            new Mock<IPlanningCoordinatorService>();

        builder.Services.AddSingleton(
            _coordinatorMock.Object);


        // -----------------------------------------------------
        // JWT
        // -----------------------------------------------------

        builder.Services.AddScoped<JwtService>();

        builder.Services
            .AddAuthentication(
                JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.TokenValidationParameters =
                    new TokenValidationParameters
                    {
                        ValidateIssuer = true,
                        ValidIssuer = "member4-tests",

                        ValidateAudience = true,
                        ValidAudience = "member4-tests",

                        ValidateLifetime = true,

                        ValidateIssuerSigningKey = true,

                        IssuerSigningKey =
                            new SymmetricSecurityKey(
                                Encoding.UTF8.GetBytes(Key))
                    };
            });

        builder.Services.AddAuthorization();


        // -----------------------------------------------------
        // Exception support
        // -----------------------------------------------------

        builder.Services.AddExceptionHandler<ApiExceptionHandler>();
        builder.Services.AddProblemDetails();


        // -----------------------------------------------------
        // Build HTTP application
        // -----------------------------------------------------

        _app = builder.Build();

        _app.UseExceptionHandler();

        _app.UseAuthentication();

        _app.UseAuthorization();

        _app.MapControllers();


        await _app.StartAsync();


        var address =
            _app.Services
                .GetRequiredService<IServer>()
                .Features
                .Get<IServerAddressesFeature>()!
                .Addresses
                .Single();


        _client = new HttpClient
        {
            BaseAddress =
                new Uri(address)
        };
    }


    // =========================================================
    // JWT HELPER
    // =========================================================

    private void SignIn(string? role)
    {
        _client.DefaultRequestHeaders.Authorization =
            null;

        if (role == null)
        {
            return;
        }

        using var scope =
            _app.Services.CreateScope();

        var jwt =
            scope.ServiceProvider
                .GetRequiredService<JwtService>()
                .GenerateToken(
                    99,
                    "member4@test.local",
                    role);

        _client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue(
                "Bearer",
                jwt);
    }


    // =========================================================
    // M4-TC09
    // No authentication -> 401
    // =========================================================

    [Fact]
    public async Task StartWorkflow_NoAuthentication_Returns401()
    {
        // Arrange
        SignIn(null);


        // Act
        var response =
            await _client.PostAsJsonAsync(
                "/api/agent-workflows/start",
                new
                {
                    serviceRequestId =
                        Guid.NewGuid()
                });


        // Assert
        Assert.Equal(
            HttpStatusCode.Unauthorized,
            response.StatusCode);
    }


    // =========================================================
    // M4-TC10
    // Customer cannot execute admin workflow operation
    // =========================================================

    [Fact]
    public async Task ExecuteAll_CustomerRole_Returns403()
    {
        // Arrange
        SignIn("Customer");

        var workflowId =
            Guid.NewGuid();


        // Act
        var response =
            await _client.PostAsync(
                $"/api/agent-workflows/{workflowId}/execute-all",
                null);


        // Assert
        Assert.Equal(
            HttpStatusCode.Forbidden,
            response.StatusCode);
    }


    // =========================================================
    // M4-TC11
    // Lawyer cannot execute admin workflow operation
    // =========================================================

    [Fact]
    public async Task ExecuteAll_LawyerRole_Returns403()
    {
        // Arrange
        SignIn("Lawyer");

        var workflowId =
            Guid.NewGuid();


        // Act
        var response =
            await _client.PostAsync(
                $"/api/agent-workflows/{workflowId}/execute-all",
                null);


        // Assert
        Assert.Equal(
            HttpStatusCode.Forbidden,
            response.StatusCode);
    }


    // =========================================================
    // M4-TC12
    // Clerk cannot approve high-impact action
    // =========================================================

    [Fact]
    public async Task ApproveLawyer_ClerkRole_Returns403()
    {
        // Arrange
        SignIn("Clerk");

        var workflowId =
            Guid.NewGuid();


        // Act
        var response =
            await _client.PostAsJsonAsync(
                $"/api/agent-workflows/{workflowId}/approve-lawyer",
                new
                {
                    lawyerId =
                        Guid.NewGuid(),

                    slotId =
                        Guid.NewGuid(),

                    bookingDate =
                        new DateOnly(
                            2030,
                            1,
                            5)
                });


        // Assert
        Assert.Equal(
            HttpStatusCode.Forbidden,
            response.StatusCode);
    }


    // =========================================================
    // M4-TC13
    // Empty service-request ID -> 400
    // =========================================================

    [Fact]
    public async Task StartWorkflow_EmptyServiceRequestId_Returns400()
    {
        // Arrange
        SignIn("Customer");


        // Act
        var response =
            await _client.PostAsJsonAsync(
                "/api/agent-workflows/start",
                new
                {
                    serviceRequestId =
                        Guid.Empty
                });


        // Assert
        Assert.Equal(
            HttpStatusCode.BadRequest,
            response.StatusCode);
    }


    // =========================================================
    // M4-TC14
    // Unknown service-request ID -> 404
    // =========================================================

    [Fact]
    public async Task StartWorkflow_UnknownServiceRequestId_Returns404()
    {
        // Arrange
        SignIn("Customer");

        var requestId =
            Guid.NewGuid();


        _coordinatorMock
            .Setup(x =>
                x.StartWorkflowAsync(
                    requestId,
                    It.IsAny<CancellationToken>()))
            .ThrowsAsync(
                new KeyNotFoundException(
                    "Service request was not found."));


        // Act
        var response =
            await _client.PostAsJsonAsync(
                "/api/agent-workflows/start",
                new
                {
                    serviceRequestId =
                        requestId
                });


        // Assert
        Assert.Equal(
            HttpStatusCode.NotFound,
            response.StatusCode);
    }


    // =========================================================
    // M4-TC15
    // Admin passes authorization and reaches Coordinator service
    // =========================================================

    [Fact]
    public async Task ExecuteAll_AdminRole_ReachesCoordinatorService()
    {
        // Arrange
        SignIn("Admin");

        var workflowId =
            Guid.NewGuid();


        _coordinatorMock
            .Setup(x =>
                x.ExecuteAllAsync(
                    workflowId,
                    99,
                    It.IsAny<CancellationToken>()))
            .ThrowsAsync(
                new KeyNotFoundException(
                    "Agent workflow was not found."));


        // Act
        var response =
            await _client.PostAsync(
                $"/api/agent-workflows/{workflowId}/execute-all",
                null);


        // Assert
        //
        // 404 proves:
        // 1. JWT authentication passed.
        // 2. Admin role authorization passed.
        // 3. Controller reached the Coordinator service.
        //
        Assert.Equal(
            HttpStatusCode.NotFound,
            response.StatusCode);

        _coordinatorMock.Verify(
            x =>
                x.ExecuteAllAsync(
                    workflowId,
                    99,
                    It.IsAny<CancellationToken>()),
            Times.Once);
    }


    // =========================================================
    // M4-TC16
    // Empty Lawyer ID -> 400
    // =========================================================

    [Fact]
    public async Task ApproveLawyer_EmptyLawyerId_Returns400()
    {
        // Arrange
        SignIn("Admin");

        var workflowId =
            Guid.NewGuid();


        // Act
        var response =
            await _client.PostAsJsonAsync(
                $"/api/agent-workflows/{workflowId}/approve-lawyer",
                new
                {
                    lawyerId =
                        Guid.Empty,

                    slotId =
                        Guid.NewGuid(),

                    bookingDate =
                        new DateOnly(
                            2030,
                            1,
                            5)
                });


        // Assert
        Assert.Equal(
            HttpStatusCode.BadRequest,
            response.StatusCode);

        _coordinatorMock.Verify(
            x =>
                x.ApproveLawyerAsync(
                    It.IsAny<Guid>(),
                    It.IsAny<Guid>(),
                    It.IsAny<Guid>(),
                    It.IsAny<DateOnly>(),
                    It.IsAny<int>(),
                    It.IsAny<string?>(),
                    It.IsAny<CancellationToken>()),
            Times.Never);
    }


    // =========================================================
    // M4-TC17
    // Empty Slot ID -> 400
    // =========================================================

    [Fact]
    public async Task ApproveLawyer_EmptySlotId_Returns400()
    {
        // Arrange
        SignIn("Admin");

        var workflowId =
            Guid.NewGuid();


        // Act
        var response =
            await _client.PostAsJsonAsync(
                $"/api/agent-workflows/{workflowId}/approve-lawyer",
                new
                {
                    lawyerId =
                        Guid.NewGuid(),

                    slotId =
                        Guid.Empty,

                    bookingDate =
                        new DateOnly(
                            2030,
                            1,
                            5)
                });


        // Assert
        Assert.Equal(
            HttpStatusCode.BadRequest,
            response.StatusCode);

        _coordinatorMock.Verify(
            x =>
                x.ApproveLawyerAsync(
                    It.IsAny<Guid>(),
                    It.IsAny<Guid>(),
                    It.IsAny<Guid>(),
                    It.IsAny<DateOnly>(),
                    It.IsAny<int>(),
                    It.IsAny<string?>(),
                    It.IsAny<CancellationToken>()),
            Times.Never);
    }


    // =========================================================
    // CLEANUP
    // =========================================================

    public async Task DisposeAsync()
    {
        _client.Dispose();

        await _app.DisposeAsync();
    }
}