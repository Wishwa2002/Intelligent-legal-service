using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using LegalService.API.DTOs.Requests;
using LegalService.API.DTOs.Responses;
using LegalService.API.Models.Entities;

namespace LegalService.API.Interfaces;

public interface IServiceRequestService
{
    Task<ServiceRequestDetailsResponse> CreateAsync(Guid customerId, CreateServiceRequestRequest request);

    Task<IEnumerable<ServiceRequestResponse>> GetAllAsync(
        Guid? customerId = null,
        string? status = null,
        string? requestType = null);

    Task<ServiceRequestDetailsResponse?> GetByIdAsync(Guid requestId);

    Task<ServiceRequestDetailsResponse?> UpdateAsync(Guid requestId, Guid customerId, UpdateServiceRequestRequest request);

    Task<ServiceRequestDetailsResponse?> CancelAsync(Guid requestId, Guid customerId);

    Task<ServiceRequestDetailsResponse?> ChangeStatusAsync(Guid requestId, ServiceRequestStatus newStatus, string? note, Guid? adminUserId);
}
