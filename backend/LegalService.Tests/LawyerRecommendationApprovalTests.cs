using System.Text.Json;
using LegalService.API.Data;
using LegalService.API.Infrastructure;
using LegalService.API.Interfaces;
using LegalService.API.Models.Entities;
using LegalService.API.Services.Lawyers;
using LegalService.API.DTOs.Appointments;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Moq;

namespace LegalService.Tests;

public class LawyerRecommendationApprovalTests
{
    [Fact]
    public async Task RecommendedLawyerApprovalUsesExistingBookingServiceAndRecordsResult()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options;
        await using var db = new ApplicationDbContext(options);
        var lawyerId = Guid.NewGuid();
        var slotId = Guid.NewGuid();
        var customerId = Guid.Parse("00000000-0000-0000-0000-00000000002a");
        var appointmentId = Guid.NewGuid();
        var date = new DateOnly(2030, 1, 7);
        var workflow = new LawyerRecommendationWorkflow
        {
            WorkflowId = Guid.NewGuid(), ClientId = 42, SelectedLawyerId = lawyerId, SelectedSlotId = slotId, ReviewStage = "APPOINTMENT", OwnerUserId = 7, Status = "AWAITING_APPROVAL",
            UserRequirement = "Synthetic property dispute", CategoryId = 3, RequestedDate = date,
            ParsedRequirementJson = JsonSerializer.Serialize(new ParsedLegalRequirement("Synthetic property dispute", 3, "Property Law", null, null, [])),
            RecommendationsJson = JsonSerializer.Serialize(new[] { new Recommendation(lawyerId, 55, "Recorded category match") })
        };
        db.LawyerRecommendationWorkflows.Add(workflow);
        db.Users.Add(new User { UserId = 42, Name = "Synthetic Customer", Email = "customer@example.test", Role = "Customer" });
        db.Specializations.Add(new Specialization { SpecializationId = 3, Name = "Property Law" });
        db.Lawyers.Add(new Lawyer { LawyerId = lawyerId, Name = "Synthetic Lawyer", Status = "Active", DefaultAppointmentDurationMinutes = 60,
            LawyerSpecializations = new List<LawyerSpecialization> { new() { LawyerId = lawyerId, SpecializationId = 3 } },
            LawyerAvailabilities = new List<LawyerAvailability> { new()
            {
                AvailabilityId = Guid.NewGuid(), LawyerId = lawyerId, Date = date,
                AvailabilitySlots = new List<AvailabilitySlot> { new() { SlotId = slotId, IsBooked = false, StartTime = new(9, 0), EndTime = new(10, 0) } }
            } }
        });
        await db.SaveChangesAsync();
        db.LawyerWorkingSchedules.Add(new() { LawyerId = lawyerId, DayOfWeek = date.DayOfWeek, IsWorkingDay = true, StartTime = new(9, 0), EndTime = new(10, 0) });
        await db.SaveChangesAsync();
        var appointments = new Mock<IAppointmentService>(MockBehavior.Strict);
        appointments.Setup(x => x.BookAppointmentAsync(It.Is<BookAppointmentRequest>(r =>
                r.LawyerId == lawyerId && r.CustomerId == customerId && r.SlotId == slotId)))
            .ReturnsAsync(new AppointmentDetailsResponse { AppointmentId = appointmentId });
        var service = new RecommendationService(new HttpClient(), new ConfigurationBuilder().Build(), db, appointments.Object);

        var result = await service.ApproveAsync(workflow.WorkflowId,
            new ApproveRecommendationRequest { LawyerId = lawyerId, CustomerId = customerId, SlotId = slotId }, 7,
            CancellationToken.None);

        Assert.Equal("ACTION_COMPLETED", result.Status);
        Assert.Equal(appointmentId, result.AppointmentId);
        Assert.Equal(appointmentId, (await db.LawyerRecommendationWorkflows.FindAsync(workflow.WorkflowId))!.AppointmentId);
        appointments.VerifyAll();
    }

    [Fact]
    public async Task CannotApproveLawyerOutsideSavedRecommendationSet()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options;
        await using var db = new ApplicationDbContext(options);
        var recommended = Guid.NewGuid();
        var workflow = new LawyerRecommendationWorkflow
        {
            WorkflowId = Guid.NewGuid(), OwnerUserId = 7, Status = "AWAITING_APPROVAL",
            UserRequirement = "Synthetic property dispute",
            RecommendationsJson = JsonSerializer.Serialize(new[] { new Recommendation(recommended, 50, "Recorded specialization match") })
        };
        db.LawyerRecommendationWorkflows.Add(workflow);
        await db.SaveChangesAsync();
        var appointments = new Mock<IAppointmentService>(MockBehavior.Strict);
        var service = new RecommendationService(new HttpClient(), new ConfigurationBuilder().Build(), db, appointments.Object);

        var error = await Assert.ThrowsAsync<ApiException>(() => service.ApproveAsync(workflow.WorkflowId,
            new ApproveRecommendationRequest { LawyerId = Guid.NewGuid(), CustomerId = Guid.NewGuid(), SlotId = Guid.NewGuid() }, 7,
            CancellationToken.None));

        Assert.Equal(400, error.Status);
        appointments.VerifyNoOtherCalls();
    }
}
