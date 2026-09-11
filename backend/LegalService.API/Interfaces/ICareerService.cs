using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using LegalService.API.DTOs.Requests;
using LegalService.API.DTOs.Responses;

namespace LegalService.API.Interfaces;

public interface ICareerService
{
    Task<IEnumerable<CareerResponse>> GetAllCareersAsync();
    Task<CareerResponse?> GetCareerByIdAsync(Guid careerId);
    Task<CareerResponse> CreateCareerAsync(CreateCareerRequest request);
    Task<CareerResponse?> UpdateCareerAsync(Guid careerId, UpdateCareerRequest request);
    Task<bool> DeleteCareerAsync(Guid careerId);

    Task<IEnumerable<JobApplicationResponse>> GetAllApplicationsAsync(Guid? careerId = null);
    Task<JobApplicationResponse?> GetApplicationByIdAsync(Guid applicationId);
    Task<JobApplicationResponse> CreateApplicationAsync(CreateJobApplicationRequest request);
    Task<JobApplicationResponse?> UpdateApplicationStatusAsync(Guid applicationId, string status);
}
