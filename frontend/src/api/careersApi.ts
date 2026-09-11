import { apiClient } from "./apiClient";

export interface Career {
  careerId: string;
  jobTitle: string;
  description: string;
  applicationsCount: number;
}

export interface JobApplication {
  applicationId: string;
  careerId: string;
  jobTitle: string;
  applicantName: string;
  status: string;
  appliedAt: string;
}

export const careersApi = {
  getCareers: async (): Promise<Career[]> => {
    const res = await apiClient.get<Career[]>("/api/careers");
    return res.data;
  },

  getCareerById: async (id: string): Promise<Career> => {
    const res = await apiClient.get<Career>(`/api/careers/${id}`);
    return res.data;
  },

  createCareer: async (data: { jobTitle: string; description: string }) => {
    const res = await apiClient.post<Career>("/api/careers", data);
    return res.data;
  },

  updateCareer: async (id: string, data: { jobTitle: string; description: string }) => {
    const res = await apiClient.put<Career>(`/api/careers/${id}`, data);
    return res.data;
  },

  deleteCareer: async (id: string) => {
    const res = await apiClient.delete(`/api/careers/${id}`);
    return res.data;
  },

  getApplications: async (careerId?: string): Promise<JobApplication[]> => {
    const res = await apiClient.get<JobApplication[]>("/api/job-applications", {
      params: { careerId },
    });
    return res.data;
  },

  createApplication: async (data: { careerId: string; applicantName: string }) => {
    const res = await apiClient.post<JobApplication>("/api/job-applications", data);
    return res.data;
  },

  updateApplicationStatus: async (id: string, status: string) => {
    const res = await apiClient.put<JobApplication>(`/api/job-applications/${id}/status`, { status });
    return res.data;
  },
};
