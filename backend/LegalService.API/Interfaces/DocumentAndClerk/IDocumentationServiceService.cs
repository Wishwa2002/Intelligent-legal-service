using System.Collections.Generic;
using System.Threading.Tasks;
using LegalService.API.DTOs.Requests;
using LegalService.API.DTOs.Responses;

namespace LegalService.API.Interfaces;

public interface IDocumentationServiceService
{
    Task<IEnumerable<DocumentationServiceResponse>> GetAllServicesAsync(bool includeInactive = false);
    Task<DocumentationServiceResponse?> GetServiceByIdAsync(int serviceId);
    Task<DocumentationServiceResponse> CreateServiceAsync(CreateDocumentationServiceRequest request);
    Task<DocumentationServiceResponse?> UpdateServiceAsync(int serviceId, UpdateDocumentationServiceRequest request);
    Task<bool> DeactivateServiceAsync(int serviceId);
}
