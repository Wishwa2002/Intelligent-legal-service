import { apiClient } from "../apiClient";

export interface DocumentationService {
  serviceId: number;
  name: string;
  description: string;
  isActive: boolean;
  requiredDocuments: string[];
}

export interface DocumentFile {
  fileId: string;
  requestId: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  documentStatus: string;
  uploadDate: string;
}

export interface DocumentationRequest {
  requestId: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  serviceId: number;
  serviceName: string;
  documentType: string;
  status: string;
  assignedClerkId?: string;
  assignedClerkName?: string;
  createdAt: string;
  updatedAt?: string;
  documentFiles: DocumentFile[];
  requiredDocuments: string[];
  missingDocuments: string[];
}

export const documentationApi = {
  // Services
  getServices: async (includeInactive = false): Promise<DocumentationService[]> => {
    const res = await apiClient.get<DocumentationService[]>("/api/documentation-services", {
      params: { includeInactive },
    });
    return res.data;
  },

  getServiceById: async (id: number): Promise<DocumentationService> => {
    const res = await apiClient.get<DocumentationService>(`/api/documentation-services/${id}`);
    return res.data;
  },

  createService: async (data: { name: string; description: string; requiredDocuments: string[] }) => {
    const res = await apiClient.post<DocumentationService>("/api/documentation-services", data);
    return res.data;
  },

  updateService: async (id: number, data: { name: string; description: string; isActive: boolean; requiredDocuments: string[] }) => {
    const res = await apiClient.put<DocumentationService>(`/api/documentation-services/${id}`, data);
    return res.data;
  },

  deactivateService: async (id: number) => {
    const res = await apiClient.delete(`/api/documentation-services/${id}`);
    return res.data;
  },

  // Requests
  getRequests: async (params?: { customerId?: string; clerkId?: string; status?: string }): Promise<DocumentationRequest[]> => {
    const res = await apiClient.get<DocumentationRequest[]>("/api/documentation-requests", { params });
    return res.data;
  },

  getRequestById: async (id: string): Promise<DocumentationRequest> => {
    const res = await apiClient.get<DocumentationRequest>(`/api/documentation-requests/${id}`);
    return res.data;
  },

  createRequest: async (customerId: string, data: { serviceId: number; documentType: string }) => {
    const res = await apiClient.post<DocumentationRequest>("/api/documentation-requests", data, {
      params: { customerId },
    });
    return res.data;
  },

  updateStatus: async (id: string, status: string): Promise<DocumentationRequest> => {
    const res = await apiClient.put<DocumentationRequest>(`/api/documentation-requests/${id}/status`, { status });
    return res.data;
  },

  assignClerk: async (requestId: string | number, clerkId: string | number): Promise<DocumentationRequest> => {
    const res = await apiClient.post<DocumentationRequest>(`/api/documentation-requests/${requestId}/assign-clerk`, {
      clerkId: Number(clerkId),
    });
    return res.data;
  },

  // Files
  uploadFile: async (requestId: string, file: File): Promise<DocumentFile> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await apiClient.post<DocumentFile>(`/api/documentation-requests/${requestId}/files`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  getFiles: async (requestId: string): Promise<DocumentFile[]> => {
    const res = await apiClient.get<DocumentFile[]>(`/api/documentation-requests/${requestId}/files`);
    return res.data;
  },

  getDownloadUrl: (fileId: string) => {
    return `${apiClient.defaults.baseURL || "http://localhost:5000"}/api/document-files/${fileId}/download`;
  },

  updateFileStatus: async (fileId: string, status: string): Promise<DocumentFile> => {
    const res = await apiClient.put<DocumentFile>(`/api/document-files/${fileId}/status`, null, {
      params: { status },
    });
    return res.data;
  },

  deleteFile: async (fileId: string) => {
    const res = await apiClient.delete(`/api/document-files/${fileId}`);
    return res.data;
  },
};
