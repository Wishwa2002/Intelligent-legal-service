import axios from 'axios';
import { apiClient } from './apiClient';
export interface WorkingDay { dayOfWeek: number; isWorkingDay: boolean; startTime: string; endTime: string }
export interface WorkingSchedule { appointmentDurationMinutes: number; days: WorkingDay[]; timeZone?: string; hasConfiguredSchedule?: boolean }
export interface Unavailability { id: string; startDateTime: string; endDateTime: string; reason: string; isFullDay: boolean }
export interface AppointmentConflict { appointmentId: string; date: string; startTime: string; endTime: string }
export interface DerivedAvailability { date: string; workingDay: boolean; appointmentDurationMinutes: number; reason?: string | null; timeZone: string; availableSlots: { slotId: string; start: string; end: string }[] }
export const schedulePayload = (value: WorkingSchedule): WorkingSchedule => ({ ...value, days: value.days.map(day => ({ ...day, startTime: `${day.startTime.slice(0, 5)}:00`, endTime: `${day.endTime.slice(0, 5)}:00` })) });
export const schedulingApi = {
  schedule: async (id: string, signal?: AbortSignal) => (await apiClient.get<WorkingSchedule>(`/api/lawyers/${id}/working-schedule`, { signal, timeout: 10000 })).data,
  saveSchedule: async (id: string, value: WorkingSchedule) => (await apiClient.put<WorkingSchedule>(`/api/lawyers/${id}/working-schedule`, schedulePayload(value), { timeout: 10000 })).data,
  leave: async (id: string, signal?: AbortSignal) => (await apiClient.get<Unavailability[]>(`/api/lawyers/${id}/unavailability`, { signal, timeout: 10000 })).data,
  saveLeave: async (id: string, value: Omit<Unavailability, 'id'>, leaveId?: string) => (leaveId
    ? await apiClient.put<Unavailability>(`/api/lawyers/${id}/unavailability/${leaveId}`, value)
    : await apiClient.post<Unavailability>(`/api/lawyers/${id}/unavailability`, value)).data,
  deleteLeave: async (id: string, leaveId: string) => { await apiClient.delete(`/api/lawyers/${id}/unavailability/${leaveId}`); },
  slots: async (id: string, date: string) => (await apiClient.get<DerivedAvailability>(`/api/lawyers/${id}/available-slots`, { params: { date } })).data,
};
export const defaultSchedule = (): WorkingSchedule => ({ appointmentDurationMinutes: 30, days: Array.from({ length: 7 }, (_, dayOfWeek) => ({ dayOfWeek, isWorkingDay: dayOfWeek > 0 && dayOfWeek < 6, startTime: '09:00', endTime: '17:00' })) });
export const loadedSchedule = (value: WorkingSchedule): WorkingSchedule => value.days.length ? value : ({ ...defaultSchedule(), ...value, days: defaultSchedule().days, hasConfiguredSchedule: false });
export const schedulingErrorMessage = (cause: unknown): string => {
  if (axios.isAxiosError(cause)) {
    const data = cause.response?.data;
    for (const message of [data?.detail, data?.message, data?.title]) if (typeof message === 'string' && message.trim()) return message;
    if (cause.code === 'ECONNABORTED' || cause.code === 'ETIMEDOUT') return 'The scheduling request timed out. Please retry.';
    return 'Unable to contact the scheduling service. Please retry.';
  }
  return cause instanceof Error ? cause.message : 'Unable to save scheduling changes.';
};
export const scheduleError = (value: WorkingSchedule) => value.appointmentDurationMinutes < 15 || value.appointmentDurationMinutes > 240 || !Number.isInteger(value.appointmentDurationMinutes)
  ? 'Appointment duration must be 15–240 minutes.' : value.days.some(day => day.isWorkingDay && (!day.startTime || !day.endTime || day.startTime.slice(0, 5) >= day.endTime.slice(0, 5))) ? 'Start time must be before end time for each working day.' : '';
export const availabilityReason = (reason?: string | null) => ({ NOT_WORKING_DAY: 'Lawyer does not work on this day', ON_LEAVE: 'Lawyer is unavailable on this date', FULLY_BOOKED: 'All available times are booked', PAST_TIME: 'All working times on this date have passed', INACTIVE: 'Lawyer is inactive', SCHEDULE_INCOMPLETE: 'Working schedule needs to be completed', NO_WORKING_TIME: 'Working hours are shorter than the appointment duration' }[reason ?? ''] ?? 'No available times on this date.');
// Date-only values stay as strings; leave boundaries use office wall time, with an exclusive end.
export const nextDate = (date: string, offset = 1) => { const [y, m, d] = date.split('-').map(Number); const result = new Date(Date.UTC(y, m - 1, d + offset)); return result.toISOString().slice(0, 10); };
export const officeToday = () => { const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Colombo', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()); return `${parts.find(p => p.type === 'year')?.value}-${parts.find(p => p.type === 'month')?.value}-${parts.find(p => p.type === 'day')?.value}`; };
