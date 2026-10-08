import { apiClient } from "./apiClient";

export const lawyerManagementChangedEvent = "lawyer-management-changed";
const notifyLawyerManagementChanged = () => {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(lawyerManagementChangedEvent));
};

export interface LawyerServicesSummary {
  activeLawyers: number;
  totalLawyers: number;
  practiceAreas: number;
  legalServices: number;
  coverage: {
    practiceAreaId: number;
    practiceAreaName: string;
    activeLawyers: number;
    legalServices: number;
    futureAvailabilityCount: number;
  }[];
}

export interface LawyerSpecialization {
  specializationId: number;
  name: string;
  description: string;
  lawyerCount?: number;
  activeLawyerCount?: number;
  legalServiceCount?: number;
}

export interface SpecializationDetails extends LawyerSpecialization {
  lawyerCount: number;
  legalServiceCount: number;
  lawyers: { lawyerId: string; name: string }[];
  legalServices: { legalServiceId: number; serviceName: string }[];
}

export interface LegalServiceCatalogItem {
  legalServiceId: number;
  serviceName: string;
  description: string;
  category: string;
  eligibleLawyerCount: number;
  legacyReferenceCount: number;
}

export interface LegalServiceDetails extends LegalServiceCatalogItem {
  eligibleLawyers: { lawyerId: string; name: string }[];
}

export interface PublicLegalServiceCatalogItem {
  legalServiceId: number;
  serviceName: string;
  description: string;
  category: string;
  lawyerCount: number;
}

export interface Lawyer {
  lawyerId: string;
  name: string;
  email: string;
  phoneNumber: string;
  qualification: string;
  experience: number;
  licenseNumber: string;
  profileDescription: string;
  status: string;
  specializations: LawyerSpecialization[];
}

export interface PagedLawyers {
  items: Lawyer[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  totalLawyers: number;
}

export interface LawyerPageFilters {
  page: number;
  pageSize: number;
  specialization?: string;
  search?: string;
  date?: string;
  status?: string;
}

export interface CreateLawyerPayload {
  workingSchedule?: import("./schedulingApi").WorkingSchedule;
  name: string;
  email: string;
  phoneNumber?: string;
  qualification?: string;
  experience: number;
  licenseNumber: string;
  profileDescription?: string;
  category: string;
  specializationId?: number;
  password?: string;
}

export type UpdateLawyerPayload = Omit<CreateLawyerPayload, "password">;

export const lawyersApi = {
  getLawyerServicesSummary: async (): Promise<LawyerServicesSummary> => {
    const res = await apiClient.get<LawyerServicesSummary>("/api/lawyer-services/summary");
    return res.data;
  },
  getLawyers: async (specialization?: string, search?: string, date?: string): Promise<Lawyer[]> => {
    const params: Record<string, string> = {};
    if (specialization && specialization !== "All") params.specialization = specialization;
    if (search) params.search = search;
    if (date) params.date = date;
    const res = await apiClient.get<Lawyer[]>("/api/lawyers", { params });
    return res.data;
  },

  getPagedLawyers: async ({ page, pageSize, specialization, search, date, status }: LawyerPageFilters): Promise<PagedLawyers> => {
    const params: Record<string, string | number> = { page, pageSize };
    if (specialization && specialization !== "All") params.specialization = specialization;
    if (search?.trim()) params.search = search.trim();
    if (date) params.date = date;
    if (status) params.status = status;
    const res = await apiClient.get<PagedLawyers>("/api/lawyers/search", { params });
    return res.data;
  },

  getSpecializations: async () => {
    const res = await apiClient.get<LawyerSpecialization[]>("/api/specializations");
    return res.data;
  },

  getSpecialization: async (id: number): Promise<SpecializationDetails> => {
    const res = await apiClient.get<SpecializationDetails>(`/api/specializations/${id}`);
    return res.data;
  },

  getLegalServices: async () => {
    const res = await apiClient.get<PublicLegalServiceCatalogItem[]>("/api/legal-services");
    return res.data;
  },

  getAdminLegalServices: async () => {
    const res = await apiClient.get<LegalServiceCatalogItem[]>("/api/legal-services/admin");
    return res.data;
  },

  getLegalService: async (id: number): Promise<LegalServiceDetails> => {
    const res = await apiClient.get<LegalServiceDetails>(`/api/legal-services/${id}`);
    return res.data;
  },

  createLawyer: async (payload: CreateLawyerPayload): Promise<Lawyer> => {
    const res = await apiClient.post<Lawyer>("/api/lawyers", payload);
    notifyLawyerManagementChanged();
    return res.data;
  },

  updateLawyer: async (id: string, payload: UpdateLawyerPayload): Promise<Lawyer> => {
    const res = await apiClient.put<Lawyer>(`/api/lawyers/${id}`, payload);
    notifyLawyerManagementChanged();
    return res.data;
  },

  saveSpecialization: async (payload: { name: string; description: string }, id?: number) => {
    if (id) await apiClient.put(`/api/specializations/${id}`, payload);
    else await apiClient.post("/api/specializations", payload);
    notifyLawyerManagementChanged();
  },
  deleteSpecialization: async (id: number) => {
    await apiClient.delete(`/api/specializations/${id}`);
    notifyLawyerManagementChanged();
  },

  saveLegalService: async (payload: { serviceName: string; description: string; category: string }, id?: number) => {
    if (id) await apiClient.put(`/api/legal-services/${id}`, payload);
    else await apiClient.post("/api/legal-services", payload);
    notifyLawyerManagementChanged();
  },
  deleteLegalService: async (id: number) => {
    await apiClient.delete(`/api/legal-services/${id}`);
    notifyLawyerManagementChanged();
  },

  deleteLawyer: async (id: string): Promise<{ message: string }> => {
    const res = await apiClient.delete<{ message: string }>(`/api/lawyers/${id}`);
    notifyLawyerManagementChanged();
    return res.data;
  },
};
