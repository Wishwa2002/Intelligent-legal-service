import { apiClient } from "./apiClient";

// ─── Types ──────────────────────────────────────────────────────────────────

export type ServiceRequestStatus =
  | "Submitted"
  | "InProgress"
  | "AwaitingReview"
  | "Approved"
  | "Rejected"
  | "RevisionRequired"
  | "Completed"
  | "Cancelled";

export type ServiceRequestPriority = "Low" | "Medium" | "High" | "Urgent";

export interface ServiceRequest {
  serviceRequestId: string;
  customerId: number;
  customerName: string;
  title: string;
  requestType: string;
  priority: ServiceRequestPriority | null;
  status: ServiceRequestStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceRequestDetails extends ServiceRequest {
  description: string;
  customerEmail: string;
  isEditable: boolean;
  isCancellable: boolean;
}

export interface CreateServiceRequestData {
  title: string;
  description: string;
  requestType: string;
  priority?: ServiceRequestPriority | null;
}

export interface UpdateServiceRequestData {
  title: string;
  description: string;
  requestType: string;
  priority?: ServiceRequestPriority | null;
}

export interface ChangeStatusData {
  status: ServiceRequestStatus;
  note?: string;
}

export interface ServiceRequestFilters {
  customerId?: number;
  status?: ServiceRequestStatus | "ALL";
  requestType?: string;
}

// ─── API Functions ───────────────────────────────────────────────────────────

export const serviceRequestsApi = {
  /**
   * Create a new service request for a customer.
   */
  create: async (
    customerId: number,
    data: CreateServiceRequestData
  ): Promise<ServiceRequestDetails> => {
    const res = await apiClient.post<ServiceRequestDetails>(
      "/api/service-requests",
      data,
      { params: { customerId } }
    );
    return res.data;
  },

  /**
   * Get service requests.
   * - Pass customerId to filter to a single customer's requests.
   * - Omit customerId to get all (admin use).
   */
  getAll: async (filters?: ServiceRequestFilters): Promise<ServiceRequest[]> => {
    const params: Record<string, unknown> = {};
    if (filters?.customerId) params.customerId = filters.customerId;
    if (filters?.status && filters.status !== "ALL") params.status = filters.status;
    if (filters?.requestType) params.requestType = filters.requestType;

    const res = await apiClient.get<ServiceRequest[]>("/api/service-requests", { params });
    return res.data;
  },

  /**
   * Get a single service request by its ID.
   */
  getById: async (id: string): Promise<ServiceRequestDetails> => {
    const res = await apiClient.get<ServiceRequestDetails>(`/api/service-requests/${id}`);
    return res.data;
  },

  /**
   * Update an editable service request (Submitted / RevisionRequired).
   */
  update: async (
    id: string,
    customerId: number,
    data: UpdateServiceRequestData
  ): Promise<ServiceRequestDetails> => {
    const res = await apiClient.put<ServiceRequestDetails>(
      `/api/service-requests/${id}`,
      data,
      { params: { customerId } }
    );
    return res.data;
  },

  /**
   * Cancel a service request (soft delete → Cancelled status).
   */
  cancel: async (id: string, customerId: number): Promise<ServiceRequestDetails> => {
    const res = await apiClient.delete<ServiceRequestDetails>(
      `/api/service-requests/${id}`,
      { params: { customerId } }
    );
    return res.data;
  },

  /**
   * Admin: change the status of a service request.
   */
  changeStatus: async (
    id: string,
    data: ChangeStatusData,
    adminUserId?: number
  ): Promise<ServiceRequestDetails> => {
    const params: Record<string, unknown> = {};
    if (adminUserId) params.adminUserId = adminUserId;

    const res = await apiClient.patch<ServiceRequestDetails>(
      `/api/service-requests/${id}/status`,
      data,
      { params }
    );
    return res.data;
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

export const REQUEST_TYPES = [
  "Contract Review",
  "Legal Advice",
  "Document Drafting",
  "Property Transfer",
  "Court Representation",
  "Business Registration",
  "Power of Attorney",
  "Bail Application",
  "Other",
] as const;

export const PRIORITIES: ServiceRequestPriority[] = ["Low", "Medium", "High", "Urgent"];

export const STATUS_LABELS: Record<ServiceRequestStatus, string> = {
  Submitted: "Submitted",
  InProgress: "In Progress",
  AwaitingReview: "Awaiting Review",
  Approved: "Approved",
  Rejected: "Rejected",
  RevisionRequired: "Revision Required",
  Completed: "Completed",
  Cancelled: "Cancelled",
};

export const STATUS_COLORS: Record<ServiceRequestStatus, string> = {
  Submitted: "bg-amber-50 text-amber-700 border-amber-200",
  InProgress: "bg-blue-50 text-blue-700 border-blue-200",
  AwaitingReview: "bg-purple-50 text-purple-700 border-purple-200",
  Approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Rejected: "bg-red-50 text-red-700 border-red-200",
  RevisionRequired: "bg-orange-50 text-orange-700 border-orange-200",
  Completed: "bg-green-50 text-green-700 border-green-200",
  Cancelled: "bg-slate-100 text-slate-500 border-slate-200",
};
