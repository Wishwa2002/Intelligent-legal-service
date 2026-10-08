using System;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using LegalService.API.Data;
using LegalService.API.Models.Entities;
using LegalService.API.Services.AgentWorkflows;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace LegalService.Tests.IT24102275;

public class PlanningCoordinatorServiceTests
{
    // ---------------------------------------------------------
    // TEST INFRASTRUCTURE
    // ---------------------------------------------------------

    private static ApplicationDbContext CreateInMemoryDb()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        return new ApplicationDbContext(options);
    }

    private static PlanningCoordinatorService CreateCoordinator(
        ApplicationDbContext context)
    {
        /*
         * StartWorkflowAsync only needs ApplicationDbContext while
         * creating the Coordinator plan.
         *
         * The specialist dependencies are not executed in these
         * planning tests, so they are not required here.
         */
        return new PlanningCoordinatorService(
            context,
            null!,
            null!,
            null!);
    }

    private static async Task<ServiceRequest> AddServiceRequestAsync(
        ApplicationDbContext context,
        string title,
        string description,
        string requestType = "Legal Advice")
    {
        var request = new ServiceRequest
        {
            ServiceRequestId = Guid.NewGuid(),
            CustomerId = 1,
            Title = title,
            Description = description,
            RequestType = requestType,
            Priority = "Medium",
            Status = ServiceRequestStatus.Submitted,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        context.ServiceRequests.Add(request);
        await context.SaveChangesAsync();

        return request;
    }


    // ---------------------------------------------------------
    // M4-TC01
    // Lawyer request -> Lawyer Recommendation Agent
    // ---------------------------------------------------------

    [Fact]
    public async Task StartWorkflow_LawyerRequest_CreatesLawyerRecommendationStep()
    {
        // Arrange
        using var context = CreateInMemoryDb();

        var request = await AddServiceRequestAsync(
            context,
            "Employment legal advice",
            "I need a lawyer for an employment dispute.");

        var coordinator = CreateCoordinator(context);


        // Act
        var workflow =
            await coordinator.StartWorkflowAsync(
                request.ServiceRequestId);


        // Assert
        Assert.NotNull(workflow);

        Assert.Equal(
            request.ServiceRequestId,
            workflow.ServiceRequestId);

        Assert.Equal(
            "Planned",
            workflow.Status);

        Assert.Contains(
            workflow.AgentSteps,
            step =>
                step.AgentName ==
                "LawyerRecommendationAgent");

        Assert.DoesNotContain(
            workflow.AgentSteps,
            step =>
                step.AgentName ==
                "SchedulingAgent");

        Assert.DoesNotContain(
            workflow.AgentSteps,
            step =>
                step.AgentName ==
                "DocumentationClerkAgent");
    }


    // ---------------------------------------------------------
    // M4-TC02
    // Consultation/appointment ->
    // Lawyer Recommendation + Scheduling
    // ---------------------------------------------------------

    [Fact]
    public async Task StartWorkflow_ConsultationRequest_CreatesLawyerAndSchedulingSteps()
    {
        // Arrange
        using var context = CreateInMemoryDb();

        var request = await AddServiceRequestAsync(
            context,
            "Book legal consultation",
            "I need a consultation appointment with a lawyer.");

        var coordinator = CreateCoordinator(context);


        // Act
        var workflow =
            await coordinator.StartWorkflowAsync(
                request.ServiceRequestId);


        // Assert
        Assert.Contains(
            workflow.AgentSteps,
            step =>
                step.AgentName ==
                "LawyerRecommendationAgent");

        Assert.Contains(
            workflow.AgentSteps,
            step =>
                step.AgentName ==
                "SchedulingAgent");

        Assert.DoesNotContain(
            workflow.AgentSteps,
            step =>
                step.AgentName ==
                "DocumentationClerkAgent");
    }


    // ---------------------------------------------------------
    // M4-TC03
    // Document request -> Documentation / Clerk Agent
    // ---------------------------------------------------------

    [Fact]
    public async Task StartWorkflow_DocumentRequest_CreatesDocumentationAgentStep()
    {
        // Arrange
        using var context = CreateInMemoryDb();

        var request = await AddServiceRequestAsync(
            context,
            "Contract preparation",
            "I need help preparing a legal contract.",
            "Documentation");

        var coordinator = CreateCoordinator(context);


        // Act
        var workflow =
            await coordinator.StartWorkflowAsync(
                request.ServiceRequestId);


        // Assert
        Assert.Contains(
            workflow.AgentSteps,
            step =>
                step.AgentName ==
                "DocumentationClerkAgent");

        Assert.DoesNotContain(
            workflow.AgentSteps,
            step =>
                step.AgentName ==
                "SchedulingAgent");
    }


    // ---------------------------------------------------------
    // M4-TC04
    // Employment keywords -> Employment category
    // ---------------------------------------------------------

    [Fact]
    public async Task StartWorkflow_EmploymentRequest_ClassifiesAsEmployment()
    {
        // Arrange
        using var context = CreateInMemoryDb();

        var request = await AddServiceRequestAsync(
            context,
            "Employment dispute",
            "My employer has not paid my salary.");

        var coordinator = CreateCoordinator(context);


        // Act
        var workflow =
            await coordinator.StartWorkflowAsync(
                request.ServiceRequestId);


        // Assert
        var firstStep =
            workflow.AgentSteps.First();

        using var payload =
            JsonDocument.Parse(
                firstStep.InputPayload);

        var category =
            payload.RootElement
                .GetProperty("legalCategory")
                .GetString();

        Assert.Equal(
            "Employment",
            category);
    }


    // ---------------------------------------------------------
    // M4-TC05
    // Unknown legal request -> Other category
    // ---------------------------------------------------------

    [Fact]
    public async Task StartWorkflow_UnknownRequest_ClassifiesAsOther()
    {
        // Arrange
        using var context = CreateInMemoryDb();

        var request = await AddServiceRequestAsync(
            context,
            "General enquiry",
            "I have a general question.",
            "General");

        var coordinator = CreateCoordinator(context);


        // Act
        var workflow =
            await coordinator.StartWorkflowAsync(
                request.ServiceRequestId);


        // Assert
        var firstStep =
            workflow.AgentSteps.First();

        using var payload =
            JsonDocument.Parse(
                firstStep.InputPayload);

        var category =
            payload.RootElement
                .GetProperty("legalCategory")
                .GetString();

        Assert.Equal(
            "Other",
            category);
    }


    // ---------------------------------------------------------
    // M4-TC06
    // Every workflow must contain Coordinator validation
    // and human approval gate.
    // ---------------------------------------------------------

    [Fact]
    public async Task StartWorkflow_ValidRequest_AlwaysCreatesHumanApprovalGate()
    {
        // Arrange
        using var context = CreateInMemoryDb();

        var request = await AddServiceRequestAsync(
            context,
            "Property legal advice",
            "I need a lawyer regarding land ownership.");

        var coordinator = CreateCoordinator(context);


        // Act
        var workflow =
            await coordinator.StartWorkflowAsync(
                request.ServiceRequestId);


        // Assert
        Assert.Contains(
            workflow.AgentSteps,
            step =>
                step.AgentName ==
                    "PlanningCoordinatorAgent" &&
                step.StepName ==
                    "Validate delegated results");

        Assert.Contains(
            workflow.AgentSteps,
            step =>
                step.AgentName ==
                    "PlanningCoordinatorAgent" &&
                step.StepName ==
                    "Request human approval");
    }


    // ---------------------------------------------------------
    // M4-TC07
    // Invalid ServiceRequest ID -> safe failure
    // ---------------------------------------------------------

    [Fact]
    public async Task StartWorkflow_InvalidServiceRequestId_ThrowsKeyNotFoundException()
    {
        // Arrange
        using var context = CreateInMemoryDb();

        var coordinator =
            CreateCoordinator(context);

        var invalidId =
            Guid.NewGuid();


        // Act + Assert
        var exception =
            await Assert.ThrowsAsync<KeyNotFoundException>(
                () =>
                    coordinator.StartWorkflowAsync(
                        invalidId));

        Assert.Equal(
            "Service request was not found.",
            exception.Message);
    }


    // ---------------------------------------------------------
    // M4-TC08
    // Starting the same request twice must be idempotent.
    // ---------------------------------------------------------

    [Fact]
    public async Task StartWorkflow_SameRequestTwice_ReturnsExistingWorkflow()
    {
        // Arrange
        using var context = CreateInMemoryDb();

        var request = await AddServiceRequestAsync(
            context,
            "Need legal advice",
            "I need a lawyer for a property issue.");

        var coordinator =
            CreateCoordinator(context);


        // Act
        var first =
            await coordinator.StartWorkflowAsync(
                request.ServiceRequestId);

        var second =
            await coordinator.StartWorkflowAsync(
                request.ServiceRequestId);


        // Assert
        Assert.Equal(
            first.WorkflowId,
            second.WorkflowId);

        Assert.Equal(
            1,
            await context.AgentWorkflows.CountAsync());
    }
}