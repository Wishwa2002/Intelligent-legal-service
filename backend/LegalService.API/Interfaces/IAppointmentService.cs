using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using LegalService.API.DTOs.Appointments;

namespace LegalService.API.Interfaces;

public interface IAppointmentService
{
    Task<AppointmentDetailsResponse> BookAppointmentAsync(BookAppointmentRequest request);

    Task<IEnumerable<AppointmentResponse>> GetAllAppointmentsAsync(
        Guid? lawyerId = null,
        Guid? customerId = null,
        string? status = null,
        DateOnly? date = null);

    Task<AppointmentDetailsResponse?> GetAppointmentByIdAsync(Guid appointmentId);

    Task<AppointmentDetailsResponse?> UpdateAppointmentAsync(Guid appointmentId, UpdateAppointmentRequest request);

    Task<bool> DeleteAppointmentAsync(Guid appointmentId);

    Task<AppointmentDetailsResponse?> ConfirmAppointmentAsync(Guid appointmentId, string? notes);

    Task<AppointmentDetailsResponse?> RejectAppointmentAsync(Guid appointmentId, string? reason);

    Task<AppointmentDetailsResponse?> CancelAppointmentAsync(Guid appointmentId, string? reason);

    Task<AppointmentDetailsResponse?> RescheduleAppointmentAsync(Guid appointmentId, Guid newSlotId, string? reason);

    Task<AppointmentDetailsResponse?> CompleteAppointmentAsync(Guid appointmentId, string? notes);

    Task<IEnumerable<AppointmentHistoryResponse>> GetAppointmentHistoryAsync(Guid appointmentId);

    Task<IEnumerable<AvailabilitySlotResponse>> GetAvailableSlotsAsync(Guid lawyerId, DateOnly date);

    Task<ConflictCheckResponse> CheckConflictAsync(
        Guid lawyerId,
        DateOnly date,
        TimeOnly start,
        TimeOnly end,
        Guid? excludeAppointmentId = null);
}
