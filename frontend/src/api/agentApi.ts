import { apiClient } from "./apiClient";

export interface ClerkRecommendation {
  clerk_id: number;
  clerk_name: string;
  department: string;
  contact: string;
  current_workload: number;
  max_workload: number;
  matching_score: number;
  selection_reasoning: string;
}

export interface RecommendationPayload {
  service_id: number;
  service_name: string;
  required_documents: string[];
  submitted_documents: string[];
  missing_documents: string[];
  documents_complete: boolean;
  recommended_clerk: ClerkRecommendation;
  alternative_clerks: ClerkRecommendation[];
  summary: string;
  notes: string;
}

export interface AgentAnalysisResult {
  workflow_id: string;
  status: string;
  recommendation?: RecommendationPayload;
  execution_summary?: {
    workflow_id: string;
    final_status: string;
    service_identified: string;
    clerk_assigned_name: string;
    total_steps: number;
    audit_notes: string;
  };
  errors: string[];
}

export interface ChatMessage {
  role: "client" | "agent";
  content: string;
  timestamp: string;
}

export interface ChatMessagesResponse {
  session_id: string;
  phase: string;
  messages: ChatMessage[];
}

export const agentApi = {
  analyzeRequest: async (requestId: string, customerId: string, objective: string): Promise<AgentAnalysisResult> => {
    const res = await apiClient.post<AgentAnalysisResult>(
      "/api/agent/documentation/analyze",
      { requestId, objective },
      { params: { customerId } }
    );
    return res.data;
  },

  submitApproval: async (workflowId: string, decision: "APPROVE" | "REJECT" | "REQUEST_REVISION", comment = "") => {
    const res = await apiClient.post(
      `/api/agent/workflows/${workflowId}/approve`,
      { decision, comment }
    );
    return res.data;
  },

  getWorkflowState: async (workflowId: string) => {
    const res = await apiClient.get(`/api/agent/workflows/${workflowId}/state`);
    return res.data;
  },

  getWorkflowSummary: async (workflowId: string) => {
    const res = await apiClient.get(`/api/agent/workflows/${workflowId}/summary`);
    return res.data;
  },

  /** Fetch chat history through the ASP.NET API. */
  getChatMessages: async (sessionId: string): Promise<ChatMessagesResponse> => {
    const res = await apiClient.get<ChatMessagesResponse>(`/api/agent/chat/${sessionId}/messages`);
    return res.data;
  },

  /** Find a workflow/session by request ID through the ASP.NET API. */
  getRequestStatus: async (requestId: string | number) => {
    const res = await apiClient.get(`/api/agent/request/${requestId}/status`);
    return res.data as { request_id: number; phase: string; workflow_id: string; missing_documents: string[] };
  },
};
