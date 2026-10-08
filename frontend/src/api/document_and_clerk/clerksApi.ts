import { apiClient } from "../apiClient";

export interface Clerk {
  clerkId: string | number;
  fullName: string;
  email: string;
  contact: string;
  department: string;
  isActive: boolean;
  activeAssignmentsCount: number;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateClerkData {
  name: string;
  email: string;
  password: string;
  contact: string;
  department: string;
}

export interface UpdateClerkData {
  name?: string;
  email?: string;
  password?: string;
  contact: string;
  department: string;
  isActive?: boolean;
}

export const clerksApi = {
  getAll: async (): Promise<Clerk[]> => {
    const res = await apiClient.get<Clerk[]>("/api/clerks");
    return res.data;
  },

  getById: async (id: string | number): Promise<Clerk> => {
    const res = await apiClient.get<Clerk>(`/api/clerks/${id}`);
    return res.data;
  },

  create: async (data: CreateClerkData): Promise<Clerk> => {
    const res = await apiClient.post<Clerk>("/api/clerks", data);
    return res.data;
  },

  update: async (id: string | number, data: UpdateClerkData): Promise<Clerk> => {
    const res = await apiClient.put<Clerk>(`/api/clerks/${id}`, data);
    return res.data;
  },

  deactivate: async (id: string | number): Promise<{ message: string }> => {
    const res = await apiClient.delete<{ message: string }>(`/api/clerks/${id}`);
    return res.data;
  },

  getAssignedRequests: async (id: string | number) => {
    const res = await apiClient.get(`/api/clerks/${id}/requests`);
    return res.data;
  },
};
