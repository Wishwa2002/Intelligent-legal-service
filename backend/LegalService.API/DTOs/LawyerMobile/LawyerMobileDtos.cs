using System.ComponentModel.DataAnnotations;
namespace LegalService.API.DTOs.LawyerMobile;
public sealed class LawyerProfileUpdateRequest
{
    [StringLength(50)] public string PhoneNumber { get; set; } = "";
    [StringLength(2000)] public string ProfileDescription { get; set; } = "";
}
public sealed class ChangePasswordRequest
{
    [Required] public string CurrentPassword { get; set; } = "";
    [Required, StringLength(72, MinimumLength = 12)] public string NewPassword { get; set; } = "";
    [Required] public string ConfirmPassword { get; set; } = "";
}
public record MyLawyerProfile(Guid LawyerId, string Name, string? Email, string PhoneNumber, string Qualification,
    string? PracticeArea, int Experience, string LicenseNumber, string ProfileDescription, string Status);
public record MyAppointment(Guid AppointmentId, string CustomerName, DateOnly Date, TimeOnly StartTime, TimeOnly EndTime,
    string Status, string? PracticeArea, string? LegalService, string? Description, string ConsultationType, bool CanConfirm, bool CanComplete);
public record DashboardCounts(int Today, int Upcoming, int Pending, int Completed);
public record MyLawyerDashboard(MyLawyerProfile Lawyer, DashboardCounts Counts, MyAppointment? NextAppointment, string TimeZone);
