import { apiClient } from "./apiClient";

export interface AppointmentItem {
  appointmentId: string;
  customerId: string;
  customerName: string;
  lawyerId: string;
  lawyerName: string;
  slotId: string;
  date: string;
  startTime: string;
  endTime: string;
  status: "Requested" | "Confirmed" | "Completed" | "Cancelled" | "Rejected" | "Rescheduled" | string;
  description?: string;
  consultationType: "Online" | "In-Person" | string;
  legalServiceCategory?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AppointmentHistoryItem {
  historyId: string;
  appointmentId: string;
  previousStatus: string;
  newStatus: string;
  changedDate: string;
}

export interface AppointmentDetails extends AppointmentItem {
  customerEmail?: string;
  lawyerLicense: string;
  canConfirm: boolean;
  canCancel: boolean;
  canReschedule: boolean;
  canComplete: boolean;
  history: AppointmentHistoryItem[];
}

export interface LawyerSpecialization {
  specializationId: number;
  name: string;
  description: string;
}

export interface LawyerItem {
  lawyerId: string;
  name: string;
  email?: string;
  phoneNumber: string;
  qualification: string;
  experience: number;
  licenseNumber: string;
  profileDescription: string;
  status: string;
  specializations: LawyerSpecialization[];
}

export interface AvailabilitySlotItem {
  slotId: string;
  availabilityId: string;
  date: string;
  startTime: string;
  endTime: string;
  isBooked: boolean;
}

export interface BookAppointmentPayload {
  lawyerId: string;
  slotId: string;
  customerId: string;
  description?: string;
  consultationType?: string;
  legalServiceCategory?: string;
  notes?: string;
}

export const appointmentsApi = {
  async getAllAppointments(filters?: {
    lawyerId?: string;
    customerId?: string;
    status?: string;
    date?: string;
  }): Promise<AppointmentItem[]> {
    const params = new URLSearchParams();
    if (filters?.lawyerId) params.append("lawyerId", filters.lawyerId);
    if (filters?.customerId) params.append("customerId", filters.customerId);
    if (filters?.status && filters.status !== "All") params.append("status", filters.status);
    if (filters?.date) params.append("date", filters.date);

    const res = await apiClient.get<AppointmentItem[]>(`/api/appointments?${params.toString()}`);
    return res.data;
  },

  async getAppointmentById(id: string): Promise<AppointmentDetails> {
    const res = await apiClient.get<AppointmentDetails>(`/api/appointments/${id}`);
    return res.data;
  },

  async bookAppointment(payload: BookAppointmentPayload): Promise<AppointmentDetails> {
    const res = await apiClient.post<AppointmentDetails>("/api/appointments", payload);
    return res.data;
  },

  async confirmAppointment(id: string, notes?: string): Promise<AppointmentDetails> {
    const res = await apiClient.post<AppointmentDetails>(`/api/appointments/${id}/confirm`, { notes });
    return res.data;
  },

  async rejectAppointment(id: string, reason?: string): Promise<AppointmentDetails> {
    const res = await apiClient.post<AppointmentDetails>(`/api/appointments/${id}/reject`, { reason });
    return res.data;
  },

  async rescheduleAppointment(id: string, newSlotId: string, reason?: string): Promise<AppointmentDetails> {
    const res = await apiClient.post<AppointmentDetails>(`/api/appointments/${id}/reschedule`, {
      newSlotId,
      reason,
    });
    return res.data;
  },

  async completeAppointment(id: string, notes?: string): Promise<AppointmentDetails> {
    const res = await apiClient.post<AppointmentDetails>(`/api/appointments/${id}/complete`, { notes });
    return res.data;
  },

  async cancelAppointment(id: string, reason?: string): Promise<AppointmentDetails> {
    const res = await apiClient.post<AppointmentDetails>(`/api/appointments/${id}/cancel`, { reason });
    return res.data;
  },

  async getAppointmentHistory(id: string): Promise<AppointmentHistoryItem[]> {
    const res = await apiClient.get<AppointmentHistoryItem[]>(`/api/appointments/${id}/history`);
    return res.data;
  },

  async getLawyers(specialization?: string): Promise<LawyerItem[]> {
    const params = new URLSearchParams();
    if (specialization) params.append("specialization", specialization);
    const res = await apiClient.get<LawyerItem[]>(`/api/lawyers?${params.toString()}`);
    return res.data;
  },

  async getLawyerSlots(lawyerId: string, date: string): Promise<AvailabilitySlotItem[]> {
    const res = await apiClient.get<AvailabilitySlotItem[]>(`/api/lawyers/${lawyerId}/slots?date=${date}`);
    return res.data;
  },
};
