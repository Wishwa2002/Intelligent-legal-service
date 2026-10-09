import { apiClient } from '../../../../api/apiClient';
export interface PlanningRules {
  minimumActiveLawyers: number; targetActiveLawyers: number; minimumFutureSlots: number;
  highDemandThreshold: number; watchCapacityRatio: number; source: 'CUSTOM' | 'DEFAULT';
}
export interface WorkforceSetting extends PlanningRules { practiceAreaId: number; practiceAreaName: string; updatedAt?: string; updatedBy?: number }
export type SettingValues = Omit<PlanningRules, 'source'>;
export type DemoScenario = 'HEALTHY_COVERAGE' | 'RECRUITMENT_NEEDED' | 'NO_ACTIVE_LAWYERS' | 'EXISTING_RECRUITMENT';
export interface DemoResult { scenario: DemoScenario; practiceAreaId: number; message: string }
const root = '/api/workforce-settings';
export const workforceSettingsApi = {
  list: async () => (await apiClient.get<WorkforceSetting[]>(root)).data,
  save: async (id: number, values: SettingValues) => (await apiClient.put<WorkforceSetting>(`${root}/${id}`, values)).data,
  reset: async (id: number) => (await apiClient.delete<WorkforceSetting>(`${root}/${id}`)).data,
};
export const workforceDemoApi = {
  available: async () => (await apiClient.get<{ available: boolean }>('/api/dev/workforce-demo')).data.available,
  apply: async (scenario: DemoScenario, practiceAreaId?: number) => (await apiClient.post<DemoResult>('/api/dev/workforce-demo/apply', { scenario, practiceAreaId })).data,
  reset: async () => (await apiClient.post<DemoResult>('/api/dev/workforce-demo/reset')).data,
};
export function workforceError(error: unknown): string {
  const response = (error as { response?: { status?: number; data?: { message?: string; title?: string; errors?: Record<string, string[]> } } })?.response;
  const validation = Object.values(response?.data?.errors ?? {}).flat().join(' ');
  if (validation) return validation;
  if ((response?.status === 400 || response?.status === 409) && typeof response.data?.title === 'string') return response.data.title;
  return response?.data?.message || 'The request could not be completed. Please retry.';
}
