import { apiClient } from "./apiClient";

export interface LawyerSpecialization {
  specializationId: number;
  name: string;
  description: string;
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

export interface CreateLawyerPayload {
  name: string;
  email: string;
  phoneNumber?: string;
  qualification?: string;
  experience: number;
  licenseNumber: string;
  profileDescription?: string;
  category: string;
  password?: string;
}

export const LAWYER_CATEGORIES = [
  "Corporate & Commercial Law",
  "Criminal Law",
  "Real Estate & Property Law",
  "Labour & Employment Law",
  "Tax Law",
] as const;

export const lawyersApi = {
  getLawyers: async (specialization?: string, search?: string): Promise<Lawyer[]> => {
    const params: Record<string, string> = {};
    if (specialization && specialization !== "All") params.specialization = specialization;
    if (search) params.search = search;
    const res = await apiClient.get<Lawyer[]>("/api/lawyers", { params });
    return res.data;
  },

  getSpecializations: async () => {
    const res = await apiClient.get("/api/lawyers/specializations");
    return res.data;
  },

  createLawyer: async (payload: CreateLawyerPayload): Promise<Lawyer> => {
    const res = await apiClient.post<Lawyer>("/api/lawyers", payload);
    return res.data;
  },

  deleteLawyer: async (id: string): Promise<{ message: string }> => {
    const res = await apiClient.delete<{ message: string }>(`/api/lawyers/${id}`);
    return res.data;
  },
};
