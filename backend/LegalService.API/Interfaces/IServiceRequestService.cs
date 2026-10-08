using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using LegalService.API.DTOs.Requests;
using LegalService.API.DTOs.Responses;
using LegalService.API.Models.Entities;

namespace LegalService.API.Interfaces;

public interface IServiceRequestService
{
    Task<ServiceRequestDetailsResponse> CreateAsync(
        int customerId,
        CreateServiceRequestRequest request);

    Task<IEnumerable<ServiceRequestResponse>> GetAllAsync(
        int? customerId = null,
        string? status = null,
        string? requestType = null);

    Task<ServiceRequestDetailsResponse?> GetByIdAsync(Guid requestId);

    Task<ServiceRequestDetailsResponse?> UpdateAsync(
        Guid requestId,
        int customerId,
        UpdateServiceRequestRequest request);

    Task<ServiceRequestDetailsResponse?> CancelAsync(
        Guid requestId,
        int customerId);

    Task<ServiceRequestDetailsResponse?> ChangeStatusAsync(
        Guid requestId,
        ServiceRequestStatus newStatus,
        string? note,
        int? adminUserId);
}