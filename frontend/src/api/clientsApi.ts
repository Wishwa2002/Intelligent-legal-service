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

export interface ClientSummary { userId: number; name: string; email: string }
export interface RegisterClientValues { fullName: string; email: string; password: string }
export const clientIntakeApi = {
  search: async (search: string) => (await apiClient.get<ClientSummary[]>('/api/clients/search', { params: { search } })).data,
  summary: async (id: number) => (await apiClient.get<ClientSummary>(`/api/clients/${id}/summary`)).data,
  register: async (values: RegisterClientValues) => (await apiClient.post<ClientSummary>('/api/clients', values)).data,
};
export function clientBookingId(id: number) { return `00000000-0000-0000-0000-${id.toString(16).padStart(12, '0')}`; }
