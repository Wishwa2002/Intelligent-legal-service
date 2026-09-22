import { apiClient } from "./apiClient";

export interface ClientUser {
  userId: number;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  updatedAt?: string;
  requestCount: number;
  requests?: {
    requestId: number;
    serviceName: string;
    documentType: string;
    status: string;
    createdAt: string;
  }[];
}

export const clientsApi = {
  getClients: async (search?: string): Promise<ClientUser[]> => {
    const res = await apiClient.get<ClientUser[]>("/api/clients", {
      params: { search: search || undefined },
    });
    return res.data;
  },

  getClientById: async (id: number): Promise<ClientUser> => {
    const res = await apiClient.get<ClientUser>(`/api/clients/${id}`);
    return res.data;
  },

  deleteClient: async (id: number): Promise<{ message: string }> => {
    const res = await apiClient.delete<{ message: string }>(`/api/clients/${id}`);
    return res.data;
  },
};
