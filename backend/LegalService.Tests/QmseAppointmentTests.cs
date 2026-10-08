using LegalService.API.Infrastructure;
using Microsoft.EntityFrameworkCore;
namespace LegalService.Tests;
public sealed class QmseAppointmentTests
{
    [Theory] [InlineData(1439)] [InlineData(1440)] [InlineData(1441)]
    public async Task Qmse_TC_C2_09_CancellationOnBothSidesOf24Hours(int minutesBefore)
    {
        await using var f=new RecurringSchedulingTests.Fixture(); await f.Seed(); var a=await f.Occupy();
        // Appointment 2030-01-14 10:00 office time == 04:30 UTC; exact synthetic offsets.
        f.Time.Now=new DateTimeOffset(2030,1,14,4,30,0,TimeSpan.Zero).AddMinutes(-minutesBefore);
        var result=await f.Booking().CancelAppointmentAsync(a.AppointmentId,"QMSE boundary");
        Assert.Equal("Cancelled",result!.Status); Assert.False((await f.Db.AvailabilitySlots.SingleAsync()).IsBooked);
        // Records actual implementation: no cutoff is enforced. Requirement conflict needs member confirmation.
    }
    [Theory] [InlineData(8)] [InlineData(20)] public async Task Qmse_TC_C2_11_BookingOutsideWorkingHoursRejected(int hour)
    {
        await using var f=new RecurringSchedulingTests.Fixture(); await f.Seed();
        var e=await Assert.ThrowsAsync<ApiException>(()=>f.Booking().BookAppointmentAsync(f.Request(new(hour,0),new(hour,30))));
        Assert.Equal(409,e.Status); Assert.Empty(await f.Db.Appointments.ToListAsync());
    }
    [Fact] public async Task Qmse_TC_C2_12_DirectBookingWorksWithoutAiDependency()
    {
        await using var f=new RecurringSchedulingTests.Fixture(); await f.Seed();
        // No AI client or service is registered; keys disabled by execution harness.
        var r=await f.Booking().BookAppointmentAsync(f.Request(new(10,0),new(10,30)));
        Assert.Equal("Requested",r.Status); Assert.Single(await f.Db.Appointments.ToListAsync());
    }
}
