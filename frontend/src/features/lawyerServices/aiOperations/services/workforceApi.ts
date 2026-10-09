import type { PlanningRules } from './workforceSettingsApi';
import { apiClient } from "../../../../api/apiClient";
export interface RecruitmentOpening { careerId: number; jobTitle: string }
export interface WorkforceArea {
  practiceAreaId: number; practiceAreaName: string; activeLawyerCount: number; legalServiceCount: number;
  recentDemandCount: number; recentAppointmentCount: number; futureAvailableSlotCount: number;
  openCareerOpeningCount: number; status: "HEALTHY" | "WATCH" | "CAPACITY_CONCERN" | "NO_ACTIVE_LAWYERS";
  reasons: string[]; openings: RecruitmentOpening[]; planningRules?: PlanningRules;
}
export interface WorkforceReport {
  generatedAt: string; recentWindowDays: number; futureWindowDays: number; practiceAreas: WorkforceArea[];
  unmappedCareerOpeningCount: number; limitations: string[];
}
export interface HiringDraft {
  suggestedTitle: string; operationalReason: string; summary: string; responsibilities: string[]; focusAreas: string[];
}
export interface HiringWorkflow {
  workflowId: string; practiceAreaId: number | null; status: "AWAITING_APPROVAL" | "CAREER_OPENING_CREATED" | "DISMISSED";
  snapshot: WorkforceArea; draft: HiringDraft; careerOpeningId: number | null; approvedTitle: string | null;
  createdAt: string; updatedAt: string; approvedAt: string | null;
}
const root = "/api/workforce-analysis";
export const workforceApi = {
  analyze: async () => (await apiClient.get<WorkforceReport>(root)).data,
  generate: async (practiceAreaId: number, workflowId?: string) => (await apiClient.post<HiringWorkflow>(`${root}/suggestions`, { practiceAreaId, workflowId })).data,
  restore: async (id: string) => (await apiClient.get<HiringWorkflow>(`${root}/suggestions/${id}`)).data,
  saveDraft: async (id: string, draft: HiringDraft) => (await apiClient.put<HiringWorkflow>(`${root}/suggestions/${id}/draft`, draft)).data,
  dismiss: async (id: string) => (await apiClient.post<HiringWorkflow>(`${root}/suggestions/${id}/dismiss`)).data,
  approve: async (id: string, draft: HiringDraft, jobTitle: string, description: string, reviewedExistingCareers: boolean) =>
    (await apiClient.post<HiringWorkflow>(`${root}/suggestions/${id}/approve`, { draft, jobTitle, description, reviewedExistingCareers })).data,
};
