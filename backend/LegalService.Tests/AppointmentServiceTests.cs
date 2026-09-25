using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using LegalService.API.Data;
using LegalService.API.DTOs.Appointments;
using LegalService.API.Models.Entities;
using LegalService.API.Services;
using Xunit;

namespace LegalService.Tests;

public class AppointmentServiceTests
{
    // ─── Test Infrastructure ──────────────────────────────────────────────────

    private static ApplicationDbContext CreateInMemoryDb() =>
        new(new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private static AppointmentService CreateService(ApplicationDbContext ctx) =>
        new(ctx, NullLogger<AppointmentService>.Instance);

    private static (LawyerAvailability Availability, AvailabilitySlot Slot) SeedLawyerWithSlot(
        ApplicationDbContext ctx,
        Guid lawyerId,
        DateOnly date,
        TimeOnly start,
        TimeOnly end,
        bool isBooked = false)
    {
        var lawyer = ctx.Lawyers.Find(lawyerId);
        if (lawyer == null)
        {
            lawyer = new Lawyer
            {
                LawyerId = lawyerId,
                Qualification = "Senior Advocate",
                LicenseNumber = "SL-998877",
                CreatedAt = DateTime.UtcNow
            };
            ctx.Lawyers.Add(lawyer);
        }

        var availability = ctx.LawyerAvailabilities.FirstOrDefault(a => a.LawyerId == lawyerId && a.Date == date);
        if (availability == null)
        {
            availability = new LawyerAvailability
            {
                AvailabilityId = Guid.NewGuid(),
                LawyerId = lawyerId,
                Date = date,
                StartTime = start,
                EndTime = end
            };
            ctx.LawyerAvailabilities.Add(availability);
        }

        var slot = new AvailabilitySlot
        {
            SlotId = Guid.NewGuid(),
            AvailabilityId = availability.AvailabilityId,
            LawyerAvailability = availability,
            StartTime = start,
            EndTime = end,
            IsBooked = isBooked
        };
        ctx.AvailabilitySlots.Add(slot);
        ctx.SaveChanges();

        return (availability, slot);
    }

    // ─── 1. Booking Tests ─────────────────────────────────────────────────────

    [Fact]
    public async Task BookAppointmentAsync_ValidSlot_CreatesAppointmentAndMarksSlotBooked()
    {
        using var ctx = CreateInMemoryDb();
        var svc = CreateService(ctx);

        var lawyerId = Guid.NewGuid();
        var customerId = Guid.NewGuid();
        var tomorrow = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(1));
        var (_, slot) = SeedLawyerWithSlot(ctx, lawyerId, tomorrow, new TimeOnly(10, 0), new TimeOnly(11, 0));

        var request = new BookAppointmentRequest
        {
            CustomerId = customerId,
            LawyerId = lawyerId,
            SlotId = slot.SlotId
        };

        var response = await svc.BookAppointmentAsync(request);

        Assert.NotNull(response);
        Assert.Equal("Requested", response.Status);
        Assert.Equal(customerId, response.CustomerId);
        Assert.Equal(lawyerId, response.LawyerId);
        Assert.Equal(slot.SlotId, response.SlotId);
        Assert.Equal(tomorrow, response.Date);
        Assert.Equal(new TimeOnly(10, 0), response.StartTime);
        Assert.Equal(new TimeOnly(11, 0), response.EndTime);

        // Verify slot is booked in DB
        var updatedSlot = await ctx.AvailabilitySlots.FindAsync(slot.SlotId);
        Assert.NotNull(updatedSlot);
        Assert.True(updatedSlot.IsBooked);

        // Verify audit history is logged
        var history = await ctx.AppointmentStatusHistories
            .Where(h => h.AppointmentId == response.AppointmentId)
            .ToListAsync();
        Assert.Single(history);
        Assert.Equal("None", history[0].PreviousStatus);
        Assert.Equal("Requested", history[0].NewStatus);
    }

    [Fact]
    public async Task BookAppointmentAsync_SlotAlreadyBooked_ThrowsInvalidOperationException()
    {
        using var ctx = CreateInMemoryDb();
        var svc = CreateService(ctx);

        var lawyerId = Guid.NewGuid();
        var customerId = Guid.NewGuid();
        var tomorrow = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(1));
        var (_, slot) = SeedLawyerWithSlot(ctx, lawyerId, tomorrow, new TimeOnly(10, 0), new TimeOnly(11, 0), isBooked: true);

        var request = new BookAppointmentRequest
        {
            CustomerId = customerId,
            LawyerId = lawyerId,
            SlotId = slot.SlotId
        };

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => svc.BookAppointmentAsync(request));
        Assert.Contains("already booked", ex.Message);
    }

    [Fact]
    public async Task BookAppointmentAsync_SlotNotFound_ThrowsKeyNotFoundException()
    {
        using var ctx = CreateInMemoryDb();
        var svc = CreateService(ctx);

        var request = new BookAppointmentRequest
        {
            CustomerId = Guid.NewGuid(),
            LawyerId = Guid.NewGuid(),
            SlotId = Guid.NewGuid()
        };

        await Assert.ThrowsAsync<KeyNotFoundException>(() => svc.BookAppointmentAsync(request));
    }

    [Fact]
    public async Task BookAppointmentAsync_SlotBelongsToDifferentLawyer_ThrowsInvalidOperationException()
    {
        using var ctx = CreateInMemoryDb();
        var svc = CreateService(ctx);

        var actualLawyerId = Guid.NewGuid();
        var differentLawyerId = Guid.NewGuid();
        var tomorrow = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(1));
        var (_, slot) = SeedLawyerWithSlot(ctx, actualLawyerId, tomorrow, new TimeOnly(10, 0), new TimeOnly(11, 0));

        var request = new BookAppointmentRequest
        {
            CustomerId = Guid.NewGuid(),
            LawyerId = differentLawyerId,
            SlotId = slot.SlotId
        };

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => svc.BookAppointmentAsync(request));
        Assert.Contains("does not belong to the selected lawyer", ex.Message);
    }

    [Fact]
    public async Task BookAppointmentAsync_OverlappingConflict_ThrowsInvalidOperationException()
    {
        using var ctx = CreateInMemoryDb();
        var svc = CreateService(ctx);

        var lawyerId = Guid.NewGuid();
        var tomorrow = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(1));

        // Create Slot 1 (10:00 - 11:00) and book it with an active appointment
        var (_, slot1) = SeedLawyerWithSlot(ctx, lawyerId, tomorrow, new TimeOnly(10, 0), new TimeOnly(11, 0), isBooked: true);
        var existingAppointment = new Appointment
        {
            AppointmentId = Guid.NewGuid(),
            CustomerId = Guid.NewGuid(),
            LawyerId = lawyerId,
            SlotId = slot1.SlotId,
            Status = "Confirmed",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        ctx.Appointments.Add(existingAppointment);

        // Create Slot 2 overlapping (10:30 - 11:30)
        var slot2 = new AvailabilitySlot
        {
            SlotId = Guid.NewGuid(),
            AvailabilityId = slot1.AvailabilityId,
            StartTime = new TimeOnly(10, 30),
            EndTime = new TimeOnly(11, 30),
            IsBooked = false
        };
        ctx.AvailabilitySlots.Add(slot2);
        ctx.SaveChanges();

        var request = new BookAppointmentRequest
        {
            CustomerId = Guid.NewGuid(),
            LawyerId = lawyerId,
            SlotId = slot2.SlotId
        };

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => svc.BookAppointmentAsync(request));
        Assert.Contains("Scheduling conflict detected", ex.Message);
    }

    // ─── 2. Status Transitions & History ──────────────────────────────────────

    [Fact]
    public async Task ConfirmAppointmentAsync_RequestedStatus_TransitionsToConfirmed()
    {
        using var ctx = CreateInMemoryDb();
        var svc = CreateService(ctx);

        var lawyerId = Guid.NewGuid();
        var customerId = Guid.NewGuid();
        var tomorrow = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(1));
        var (_, slot) = SeedLawyerWithSlot(ctx, lawyerId, tomorrow, new TimeOnly(14, 0), new TimeOnly(15, 0));

        var booked = await svc.BookAppointmentAsync(new BookAppointmentRequest
        {
            CustomerId = customerId,
            LawyerId = lawyerId,
            SlotId = slot.SlotId
        });

        var confirmed = await svc.ConfirmAppointmentAsync(booked.AppointmentId, "Confirmed by attorney.");

        Assert.NotNull(confirmed);
        Assert.Equal("Confirmed", confirmed.Status);
        Assert.True(confirmed.CanComplete);

        var history = await ctx.AppointmentStatusHistories
            .Where(h => h.AppointmentId == booked.AppointmentId)
            .OrderBy(h => h.ChangedDate)
            .ToListAsync();

        Assert.Equal(2, history.Count);
        Assert.Equal("None", history[0].PreviousStatus);
        Assert.Equal("Requested", history[0].NewStatus);
        Assert.Equal("Requested", history[1].PreviousStatus);
        Assert.Equal("Confirmed", history[1].NewStatus);
    }

    [Fact]
    public async Task CompleteAppointmentAsync_ConfirmedStatus_TransitionsToCompleted()
    {
        using var ctx = CreateInMemoryDb();
        var svc = CreateService(ctx);

        var lawyerId = Guid.NewGuid();
        var tomorrow = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(1));
        var (_, slot) = SeedLawyerWithSlot(ctx, lawyerId, tomorrow, new TimeOnly(14, 0), new TimeOnly(15, 0));

        var booked = await svc.BookAppointmentAsync(new BookAppointmentRequest
        {
            CustomerId = Guid.NewGuid(),
            LawyerId = lawyerId,
            SlotId = slot.SlotId
        });

        await svc.ConfirmAppointmentAsync(booked.AppointmentId, null);
        var completed = await svc.CompleteAppointmentAsync(booked.AppointmentId, null);

        Assert.NotNull(completed);
        Assert.Equal("Completed", completed.Status);
        Assert.False(completed.CanCancel);
        Assert.False(completed.CanReschedule);
    }

    [Fact]
    public async Task CompleteAppointmentAsync_FromRequested_ThrowsInvalidOperationException()
    {
        using var ctx = CreateInMemoryDb();
        var svc = CreateService(ctx);

        var lawyerId = Guid.NewGuid();
        var tomorrow = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(1));
        var (_, slot) = SeedLawyerWithSlot(ctx, lawyerId, tomorrow, new TimeOnly(14, 0), new TimeOnly(15, 0));

        var booked = await svc.BookAppointmentAsync(new BookAppointmentRequest
        {
            CustomerId = Guid.NewGuid(),
            LawyerId = lawyerId,
            SlotId = slot.SlotId
        });

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            svc.CompleteAppointmentAsync(booked.AppointmentId, null));

        Assert.Contains("Confirmed", ex.Message);
    }

    // ─── 3. Cancellation & Slot Release ───────────────────────────────────────

    [Fact]
    public async Task CancelAppointmentAsync_ReleasesAssociatedSlot()
    {
        using var ctx = CreateInMemoryDb();
        var svc = CreateService(ctx);

        var lawyerId = Guid.NewGuid();
        var tomorrow = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(1));
        var (_, slot) = SeedLawyerWithSlot(ctx, lawyerId, tomorrow, new TimeOnly(9, 0), new TimeOnly(10, 0));

        var booked = await svc.BookAppointmentAsync(new BookAppointmentRequest
        {
            CustomerId = Guid.NewGuid(),
            LawyerId = lawyerId,
            SlotId = slot.SlotId
        });

        var cancelled = await svc.CancelAppointmentAsync(booked.AppointmentId, "Client has a personal emergency.");

        Assert.NotNull(cancelled);
        Assert.Equal("Cancelled", cancelled.Status);

        // Verify slot is released (IsBooked = false)
        var releasedSlot = await ctx.AvailabilitySlots.FindAsync(slot.SlotId);
        Assert.NotNull(releasedSlot);
        Assert.False(releasedSlot.IsBooked);
    }

    [Fact]
    public async Task RejectAppointmentAsync_ReleasesAssociatedSlot()
    {
        using var ctx = CreateInMemoryDb();
        var svc = CreateService(ctx);

        var lawyerId = Guid.NewGuid();
        var tomorrow = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(1));
        var (_, slot) = SeedLawyerWithSlot(ctx, lawyerId, tomorrow, new TimeOnly(15, 0), new TimeOnly(16, 0));

        var booked = await svc.BookAppointmentAsync(new BookAppointmentRequest
        {
            CustomerId = Guid.NewGuid(),
            LawyerId = lawyerId,
            SlotId = slot.SlotId
        });

        var rejected = await svc.RejectAppointmentAsync(booked.AppointmentId, "Lawyer has court hearing during this window.");

        Assert.NotNull(rejected);
        Assert.Equal("Rejected", rejected.Status);

        var releasedSlot = await ctx.AvailabilitySlots.FindAsync(slot.SlotId);
        Assert.NotNull(releasedSlot);
        Assert.False(releasedSlot.IsBooked);
    }

    // ─── 4. Reschedule ────────────────────────────────────────────────────────

    [Fact]
    public async Task RescheduleAppointmentAsync_ReleasesOldSlotAndBooksNewSlot()
    {
        using var ctx = CreateInMemoryDb();
        var svc = CreateService(ctx);

        var lawyerId = Guid.NewGuid();
        var customerId = Guid.NewGuid();
        var tomorrow = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(1));

        // Slot 1
        var (avail, slot1) = SeedLawyerWithSlot(ctx, lawyerId, tomorrow, new TimeOnly(10, 0), new TimeOnly(11, 0));

        // Slot 2 on next day
        var dayAfter = tomorrow.AddDays(1);
        var avail2 = new LawyerAvailability
        {
            AvailabilityId = Guid.NewGuid(),
            LawyerId = lawyerId,
            Date = dayAfter,
            StartTime = new TimeOnly(14, 0),
            EndTime = new TimeOnly(15, 0)
        };
        ctx.LawyerAvailabilities.Add(avail2);
        var slot2 = new AvailabilitySlot
        {
            SlotId = Guid.NewGuid(),
            AvailabilityId = avail2.AvailabilityId,
            LawyerAvailability = avail2,
            StartTime = new TimeOnly(14, 0),
            EndTime = new TimeOnly(15, 0),
            IsBooked = false
        };
        ctx.AvailabilitySlots.Add(slot2);
        ctx.SaveChanges();

        // Book slot 1
        var booked = await svc.BookAppointmentAsync(new BookAppointmentRequest
        {
            CustomerId = customerId,
            LawyerId = lawyerId,
            SlotId = slot1.SlotId
        });

        // Reschedule to slot 2
        var rescheduled = await svc.RescheduleAppointmentAsync(booked.AppointmentId, slot2.SlotId, "Conflict with work schedule.");

        Assert.NotNull(rescheduled);
        Assert.Equal("Rescheduled", rescheduled.Status);
        Assert.Equal(slot2.SlotId, rescheduled.SlotId);
        Assert.Equal(dayAfter, rescheduled.Date);

        // Verify slot 1 is released
        var updatedSlot1 = await ctx.AvailabilitySlots.FindAsync(slot1.SlotId);
        Assert.NotNull(updatedSlot1);
        Assert.False(updatedSlot1.IsBooked);

        // Verify slot 2 is now booked
        var updatedSlot2 = await ctx.AvailabilitySlots.FindAsync(slot2.SlotId);
        Assert.NotNull(updatedSlot2);
        Assert.True(updatedSlot2.IsBooked);

        // Check history
        var history = await ctx.AppointmentStatusHistories
            .Where(h => h.AppointmentId == booked.AppointmentId)
            .OrderBy(h => h.ChangedDate)
            .ToListAsync();
        Assert.Equal(2, history.Count);
        Assert.Equal("Requested", history[1].PreviousStatus);
        Assert.Equal("Rescheduled", history[1].NewStatus);
    }

    // ─── 5. Availability Slots & Conflicts ────────────────────────────────────

    [Fact]
    public async Task GetAvailableSlotsAsync_ReturnsOnlyUnbookedSlotsForLawyer()
    {
        using var ctx = CreateInMemoryDb();
        var svc = CreateService(ctx);

        var lawyerId = Guid.NewGuid();
        var tomorrow = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(1));

        SeedLawyerWithSlot(ctx, lawyerId, tomorrow, new TimeOnly(9, 0), new TimeOnly(10, 0), isBooked: false);
        SeedLawyerWithSlot(ctx, lawyerId, tomorrow, new TimeOnly(10, 0), new TimeOnly(11, 0), isBooked: true);
        SeedLawyerWithSlot(ctx, lawyerId, tomorrow, new TimeOnly(11, 0), new TimeOnly(12, 0), isBooked: false);

        var availableSlots = (await svc.GetAvailableSlotsAsync(lawyerId, tomorrow)).ToList();

        Assert.Equal(2, availableSlots.Count);
        Assert.All(availableSlots, s => Assert.False(s.IsBooked));
        Assert.Contains(availableSlots, s => s.StartTime == new TimeOnly(9, 0));
        Assert.Contains(availableSlots, s => s.StartTime == new TimeOnly(11, 0));
        Assert.DoesNotContain(availableSlots, s => s.StartTime == new TimeOnly(10, 0));
    }

    [Fact]
    public async Task CheckConflictAsync_DetectsOverlapCorrectly()
    {
        using var ctx = CreateInMemoryDb();
        var svc = CreateService(ctx);

        var lawyerId = Guid.NewGuid();
        var tomorrow = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(1));

        var (_, slot) = SeedLawyerWithSlot(ctx, lawyerId, tomorrow, new TimeOnly(10, 0), new TimeOnly(11, 0), isBooked: true);
        var appointment = new Appointment
        {
            AppointmentId = Guid.NewGuid(),
            CustomerId = Guid.NewGuid(),
            LawyerId = lawyerId,
            SlotId = slot.SlotId,
            Status = "Confirmed",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        ctx.Appointments.Add(appointment);
        ctx.SaveChanges();

        // Check overlapping window (10:30 to 11:30)
        var conflict = await svc.CheckConflictAsync(lawyerId, tomorrow, new TimeOnly(10, 30), new TimeOnly(11, 30));
        Assert.True(conflict.HasConflict);

        // Check non-overlapping window (11:00 to 12:00)
        var noConflict = await svc.CheckConflictAsync(lawyerId, tomorrow, new TimeOnly(11, 0), new TimeOnly(12, 0));
        Assert.False(noConflict.HasConflict);
    }

    [Fact]
    public async Task GetAvailableSlotsAsync_AutoProvisionsFourAfternoonSlotsWhenNoneExist()
    {
        using var ctx = CreateInMemoryDb();
        var svc = CreateService(ctx);

        var lawyerId = Guid.NewGuid();
        ctx.Lawyers.Add(new Lawyer
        {
            LawyerId = lawyerId,
            Name = "Advocate Test",
            LicenseNumber = "TEST-1234",
            CreatedAt = DateTime.UtcNow
        });
        await ctx.SaveChangesAsync();

        var tomorrow = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(1));
        var slots = (await svc.GetAvailableSlotsAsync(lawyerId, tomorrow)).ToList();

        Assert.Equal(4, slots.Count);
        Assert.Equal(new TimeOnly(15, 0), slots[0].StartTime);
        Assert.Equal(new TimeOnly(15, 30), slots[0].EndTime);
        Assert.Equal(new TimeOnly(15, 30), slots[1].StartTime);
        Assert.Equal(new TimeOnly(16, 0), slots[1].EndTime);
        Assert.Equal(new TimeOnly(16, 0), slots[2].StartTime);
        Assert.Equal(new TimeOnly(16, 30), slots[2].EndTime);
        Assert.Equal(new TimeOnly(16, 30), slots[3].StartTime);
        Assert.Equal(new TimeOnly(17, 0), slots[3].EndTime);
        Assert.All(slots, s => Assert.False(s.IsBooked));
    }

    [Fact]
    public async Task BookAppointmentAsync_PersistsDescriptionAndConsultationType()
    {
        using var ctx = CreateInMemoryDb();
        var svc = CreateService(ctx);

        var lawyerId = Guid.NewGuid();
        var tomorrow = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(1));
        var (_, slot) = SeedLawyerWithSlot(ctx, lawyerId, tomorrow, new TimeOnly(15, 0), new TimeOnly(15, 30));

        var req = new BookAppointmentRequest
        {
            CustomerId = Guid.NewGuid(),
            LawyerId = lawyerId,
            SlotId = slot.SlotId,
            Description = "Urgent legal defense needed for commercial dispute.",
            ConsultationType = "In-Person",
            LegalServiceCategory = "Criminal Law"
        };

        var res = await svc.BookAppointmentAsync(req);

        Assert.NotNull(res);
        Assert.Equal("Requested", res.Status);
        Assert.Equal("Urgent legal defense needed for commercial dispute.", res.Description);
        Assert.Equal("In-Person", res.ConsultationType);
        Assert.Equal("Criminal Law", res.LegalServiceCategory);

        var inDb = await ctx.Appointments.FindAsync(res.AppointmentId);
        Assert.NotNull(inDb);
        Assert.Equal("Urgent legal defense needed for commercial dispute.", inDb.Description);
        Assert.Equal("In-Person", inDb.ConsultationType);
        Assert.Equal("Criminal Law", inDb.LegalServiceCategory);
    }
}
