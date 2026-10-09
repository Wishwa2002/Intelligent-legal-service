import { schedulingApi } from "./schedulingApi";
import { apiClient } from "./apiClient";

export interface WorkflowEvent {
  timestamp: string;
  step: string;
  status: string;
  summary: string;
  outputSummary?: string | null;
  error?: string | null;
}

export interface RecommendationResult {
  workflowId: string;
  clientId?: number | null; selectedLawyerId?: string | null; selectedSlotId?: string | null; bookingDate?: string | null; reviewStage?: string;
  status: string;
  userRequirement?: string | null;
  date?: string | null;
  appointmentId?: string | null;
  approvedLawyerId?: string | null;
  parsedRequirement?: { requirement?: string; categoryId?: number | null; categoryName?: string | null;
    location?: string | null; legalServiceId?: number | null; legalServiceName?: string | null;
    matterSummary?: string | null; supported?: boolean | null } | null;
  recommendations: {
    lawyerId: string;
    score: number;
    reason: string;
    fullName?: string | null;
    qualification?: string | null;
    yearsExperience?: number | null;
    practiceArea?: string | null;
  }[];
  warnings: string[];
  trace: WorkflowEvent[];
}

export interface RecommendationCustomer { customerId: string; name: string; email: string }
export interface RecommendationSlot { slotId: string; date: string; startTime: string; endTime: string; isBooked: boolean }
export interface AppointmentSummary {
  appointmentSource?: string | null; appointmentId: string; customerName: string; lawyerName: string; date: string; startTime: string; endTime: string;
}

export const recommendationsApi = {
  recommend: async (requirement: string, date: string | undefined, signal: AbortSignal | undefined, clientId: number) =>
    (await apiClient.post<RecommendationResult>("/api/lawyer-recommendations", { requirement, date: date || null, limit: 5, clientId }, { signal, timeout: 60000 })).data,
  review: async (id: string, values: { clientId: number; lawyerId: string | null; slotId: string | null; bookingDate: string | null; stage: string; confirmClientChange?: boolean }) =>
    (await apiClient.put<RecommendationResult>(`/api/lawyer-recommendations/${id}/review`, values)).data,
  get: async (id: string) => (await apiClient.get<RecommendationResult>(`/api/lawyer-recommendations/${id}`)).data,
  approve: async (id: string, lawyerId: string, customerId: string, slotId: string) =>
    (await apiClient.post<RecommendationResult>(`/api/lawyer-recommendations/${id}/approve`, { lawyerId, customerId, slotId })).data,
  customers: async (search: string) =>
    (await apiClient.get<RecommendationCustomer[]>("/api/lawyer-recommendations/customers", { params: { search } })).data,
  slots: async (lawyerId: string, date: string) =>
    schedulingApi.slots(lawyerId, date),
  appointment: async (id: string) => (await apiClient.get<AppointmentSummary>(`/api/appointments/${id}`)).data,
};
