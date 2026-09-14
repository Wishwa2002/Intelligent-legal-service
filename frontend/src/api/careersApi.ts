import { apiClient } from "./apiClient";

export interface Career {
  careerId: number | string;
  jobTitle: string;
  description: string;
  applicationsCount: number;
}

export interface JobApplication {
  applicationId: number | string;
  careerId: number | string;
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

  getCareerById: async (id: number | string): Promise<Career> => {
    const res = await apiClient.get<Career>(`/api/careers/${id}`);
    return res.data;
  },

  createCareer: async (data: { jobTitle: string; description: string }) => {
    const res = await apiClient.post<Career>("/api/careers", data);
    return res.data;
  },

  updateCareer: async (id: number | string, data: { jobTitle: string; description: string }) => {
    const res = await apiClient.put<Career>(`/api/careers/${id}`, data);
    return res.data;
  },

  deleteCareer: async (id: number | string) => {
    const res = await apiClient.delete(`/api/careers/${id}`);
    return res.data;
  },

  getApplications: async (careerId?: number | string): Promise<JobApplication[]> => {
    const res = await apiClient.get<JobApplication[]>("/api/job-applications", {
      params: { careerId: careerId === "ALL" ? undefined : careerId },
    });
    return res.data;
  },

  createApplication: async (data: { careerId: number; applicantName: string }) => {
    const res = await apiClient.post<JobApplication>("/api/job-applications", data);
    return res.data;
  },

  updateApplicationStatus: async (id: number | string, status: string) => {
    const res = await apiClient.put<JobApplication>(`/api/job-applications/${id}/status`, { status });
    return res.data;
  },
};
