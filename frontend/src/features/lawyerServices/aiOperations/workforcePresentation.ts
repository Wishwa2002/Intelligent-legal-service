import type { WorkforceArea } from './services/workforceApi';

export const workforcePrimary = 'inline-flex min-h-11 items-center justify-center rounded-md bg-amber-500 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-amber-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 disabled:opacity-50';
export const workforceSecondary = 'inline-flex min-h-11 items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 disabled:opacity-50';
export const workforceInput = 'mt-2 block min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50';

// Presentation order only; status and demand still come from the existing rules.
const attentionOrder = { NO_ACTIVE_LAWYERS: 0, CAPACITY_CONCERN: 1, WATCH: 2, HEALTHY: 3 };
export function sortWorkforceAreas(areas: WorkforceArea[]) {
  return [...areas].sort((a, b) => attentionOrder[a.status] - attentionOrder[b.status] || a.practiceAreaName.localeCompare(b.practiceAreaName));
}
export const workforceDemand = (area: WorkforceArea) => Math.max(area.recentDemandCount, area.recentAppointmentCount);
