using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using LegalService.API.DTOs.Requests;
using LegalService.API.DTOs.Responses;

namespace LegalService.API.Interfaces;

public interface ICareerService
{
    Task<IEnumerable<CareerResponse>> GetAllCareersAsync();
    Task<CareerResponse?> GetCareerByIdAsync(int careerId);
    Task<CareerResponse> CreateCareerAsync(CreateCareerRequest request);
    Task<CareerResponse?> UpdateCareerAsync(int careerId, UpdateCareerRequest request);
    Task<bool> DeleteCareerAsync(int careerId);

    Task<IEnumerable<JobApplicationResponse>> GetAllApplicationsAsync(int? careerId = null);
    Task<JobApplicationResponse?> GetApplicationByIdAsync(int applicationId);
    Task<JobApplicationResponse> CreateApplicationAsync(CreateJobApplicationRequest request);
    Task<JobApplicationResponse?> UpdateApplicationStatusAsync(int applicationId, string status);
}
