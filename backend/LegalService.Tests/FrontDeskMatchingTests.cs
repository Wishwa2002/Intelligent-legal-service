using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using LegalService.API.Authentication.Services;
using LegalService.API.Data;
using LegalService.API.DTOs.Clients;
using LegalService.API.Infrastructure;
using LegalService.API.Models.Entities;
using LegalService.API.Services;
using LegalService.API.Services.Clients;
using LegalService.API.Services.Lawyers;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace LegalService.Tests;

public sealed class FrontDeskMatchingTests
{
    private sealed class CaptureHandler(object payload) : HttpMessageHandler
    {
        public JsonElement? Snapshot { get; private set; }
        public int Calls { get; private set; }
        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            Calls++; Snapshot = await request.Content!.ReadFromJsonAsync<JsonElement>(cancellationToken: ct);
            return new(HttpStatusCode.OK) { Content = JsonContent.Create(payload) };
        }
    }
    [Theory] [InlineData(null)] [InlineData(999)] [InlineData(-1)]
    public async Task ClientMustExistBeforeAnyAiRequestOrWorkflow(int? clientId)
    {
        await using var f = new Member1RecommendationTests.Fixture(); await f.Seed();
        var handler = new CaptureHandler(new { });
        Assert.Equal(400, (await Assert.ThrowsAsync<ApiException>(() => f.Service(new(handler)).RecommendAsync(new() { ClientId = clientId, Requirement = "Land ownership dispute" }, 7, default))).Status);
        Assert.Equal(0, handler.Calls); Assert.Single(f.Db.LawyerRecommendationWorkflows); Assert.Empty(f.Db.Appointments);
    }
    [Fact] public async Task AiReceivesRequirementAndCatalogWithoutClientIdentity()
    {
        await using var f = new Member1RecommendationTests.Fixture(); await f.Seed();
        var handler = new CaptureHandler(new { recommendations = new[] { new Recommendation(f.Lawyer.LawyerId, 12, "Recorded experience") }, warnings = Array.Empty<string>(), trace = Array.Empty<object>(), parsedRequirement = new ParsedLegalRequirement("Land ownership dispute", 4, "Real Estate & Property Law", null, null, []) });
        var result = await f.Service(new(handler)).RecommendAsync(new() { ClientId = 42, Requirement = "Land ownership dispute" }, 7, default);
        var snapshot = handler.Snapshot!.Value;
        Assert.False(snapshot.TryGetProperty("clientId", out _)); Assert.False(snapshot.TryGetProperty("customerId", out _));
        Assert.DoesNotContain("customer@example.test", snapshot.GetRawText()); Assert.DoesNotContain("Test Customer", snapshot.GetRawText());
        Assert.Equal(42, result.ClientId); Assert.Contains(result.Trace, e => e.GetProperty("step").GetString() == "client_selected");
    }
    [Fact] public async Task ReviewPersistsAcrossNewContextAndClientChangeNeedsConfirmation()
    {
        await using var f = new Member1RecommendationTests.Fixture(); await f.Seed();
        f.Db.Users.Add(new() { UserId = 43, Name = "Other Client", Email = "other@example.test", Role = "Customer" }); await f.Db.SaveChangesAsync();
        var error = await Assert.ThrowsAsync<ApiException>(() => f.Service().SaveReviewAsync(f.Workflow.WorkflowId, new() { ClientId = 43, LawyerId = f.Lawyer.LawyerId, Stage = "REVIEW" }, 7, default));
        Assert.Equal(409, error.Status);
        var result = await f.Service().SaveReviewAsync(f.Workflow.WorkflowId, new() { ClientId = 43, LawyerId = f.Lawyer.LawyerId, Stage = "REVIEW", ConfirmClientChange = true }, 7, default);
        Assert.Equal(43, result.ClientId); Assert.Null(result.SelectedSlotId); Assert.Equal("REVIEW", result.ReviewStage);
        f.Db.ChangeTracker.Clear(); var restored = await f.Service().GetAsync(f.Workflow.WorkflowId, 7, default);
        Assert.Equal(43, restored.ClientId); Assert.Equal(f.Lawyer.LawyerId, restored.SelectedLawyerId); Assert.Equal("REVIEW", restored.ReviewStage);
        Assert.Contains(restored.Trace, e => e.GetProperty("step").GetString() == "client_selected"); f.Booking.VerifyNoOtherCalls(); Assert.Empty(f.Db.Appointments);
    }
    [Fact] public async Task SelectedClientCannotBeSubstitutedAtFinalApproval()
    {
        await using var f = new Member1RecommendationTests.Fixture(); await f.Seed();
        f.Db.Users.Add(new() { UserId = 43, Name = "Other Client", Email = "other@example.test", Role = "Customer" }); await f.Db.SaveChangesAsync();
        var request = f.Selection; request.CustomerId = ClientService.BookingId(43);
        Assert.Equal(409, (await Assert.ThrowsAsync<ApiException>(() => f.Service().ApproveAsync(f.Workflow.WorkflowId, request, 7, default))).Status);
        f.Booking.VerifyNoOtherCalls(); Assert.Empty(f.Db.Appointments);
    }
    [Theory] [InlineData("REVIEW")] [InlineData("MATCHES")]
    public async Task AppointmentReviewIsRequiredBeforeFinalApproval(string stage)
    {
        await using var f = new Member1RecommendationTests.Fixture(); await f.Seed(); f.Workflow.ReviewStage = stage; await f.Db.SaveChangesAsync();
        Assert.Equal(409, (await Assert.ThrowsAsync<ApiException>(() => f.Service().ApproveAsync(f.Workflow.WorkflowId, f.Selection, 7, default))).Status);
        Assert.Empty(f.Db.Appointments);
    }
    [Fact] public async Task LegacyWorkflowAcceptsExplicitClientAndReviewWithoutRerunningAi()
    {
        await using var f = new Member1RecommendationTests.Fixture(); await f.Seed(); f.Workflow.ClientId = null; f.Workflow.ReviewStage = "MATCHES"; await f.Db.SaveChangesAsync();
        var restored = await f.Service().GetAsync(f.Workflow.WorkflowId, 7, default); Assert.Null(restored.ClientId);
        var review = await f.Service().SaveReviewAsync(f.Workflow.WorkflowId, new() { ClientId = 42, Stage = "REVIEW", LawyerId = f.Lawyer.LawyerId }, 7, default);
        Assert.Equal(42, review.ClientId); Assert.Equal("REVIEW", review.ReviewStage); Assert.Single(review.Recommendations); Assert.Single(f.Db.LawyerRecommendationWorkflows);
    }
    [Fact] public async Task HumanApprovalCreatesOneOrdinaryAppointmentWithSourceAndAudit()
    {
        await using var f = new Member1RecommendationTests.Fixture(); await f.Seed();
        var result = await f.Service(booking: new AppointmentService(f.Db, NullLogger<AppointmentService>.Instance)).ApproveAsync(f.Workflow.WorkflowId, f.Selection, 7, default);
        var appointment = Assert.Single(f.Db.Appointments); Assert.Equal(result.AppointmentId, appointment.AppointmentId);
        Assert.Equal(f.CustomerId, appointment.CustomerId); Assert.Equal("AI_FRONT_DESK", appointment.AppointmentSource); Assert.Equal("InPerson", appointment.ConsultationType);
        Assert.Single(f.Db.AppointmentStatusHistories); Assert.Equal("ACTION_COMPLETED", result.Status);
    }
    [Fact] public async Task QuickRegistrationUsesNormalClientStoreHashedPasswordAndDuplicateCheck()
    {
        await using var db = new ApplicationDbContext(new DbContextOptionsBuilder<ApplicationDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        db.Roles.Add(new() { Id = Guid.NewGuid(), Name = "Customer" }); db.Users.Add(new() { UserId = 10, Name = "Staff", Email = "staff@example.test", Role = "Admin" }); await db.SaveChangesAsync();
        var passwords = new PasswordService(); var service = new ClientService(db, passwords);
        var client = await service.RegisterAsync(new() { FullName = " Walk-in Client ", Email = "  New@Example.test ", Password = "test-account-password" });
        var user = await db.Users.FindAsync(client.UserId); Assert.Equal("Customer", user!.Role); Assert.Equal("new@example.test", user.Email); Assert.Equal("Walk-in Client", user.Name);
        Assert.True(passwords.VerifyPassword("test-account-password", user.PasswordHash!)); Assert.Single(db.UserRoles);
        Assert.Equal(client, (await Assert.ThrowsAsync<DuplicateClientException>(() => service.RegisterAsync(new() { Email = "NEW@example.test", Password = "another" }))).ExistingClient);
        Assert.Null((await Assert.ThrowsAsync<DuplicateClientException>(() => service.RegisterAsync(new() { Email = "staff@example.test", Password = "another" }))).ExistingClient);
        Assert.Single(await service.SearchAsync("walk-in")); Assert.Empty(await service.SearchAsync("Staff")); Assert.Equal(2, db.Users.Count());
    }
    [Theory] [InlineData("invalid", "password")] [InlineData("valid@example.test", "")]
    public async Task RegistrationValidatesRequiredFields(string email, string password)
    {
        await using var db = new ApplicationDbContext(new DbContextOptionsBuilder<ApplicationDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        Assert.Equal(400, (await Assert.ThrowsAsync<ApiException>(() => new ClientService(db, new PasswordService()).RegisterAsync(new() { Email = email, Password = password }))).Status); Assert.Empty(db.Users);
    }
}
