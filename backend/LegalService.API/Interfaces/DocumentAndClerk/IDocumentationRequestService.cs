using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using LegalService.API.DTOs.Requests;
using LegalService.API.DTOs.Responses;

namespace LegalService.API.Interfaces;

public interface IDocumentationRequestService
{
    Task<IEnumerable<DocumentationRequestResponse>> GetAllRequestsAsync(int? customerId = null, int? clerkId = null, string? status = null);
    Task<DocumentationRequestResponse?> GetRequestByIdAsync(int requestId);
    Task<DocumentationRequestResponse> CreateRequestAsync(int customerId, CreateDocumentationRequestRequest request);
    Task<DocumentationRequestResponse?> UpdateRequestStatusAsync(int requestId, string status);
    Task<DocumentationRequestResponse?> AssignClerkAsync(int requestId, int clerkId);
    Task<bool> CanCustomerAccessRequestAsync(int customerId, int requestId);
}
