import type { useRecommendationWorkflow } from "../../../../hooks/useRecommendationWorkflow";
export type RecommendationWorkflowModel = ReturnType<typeof useRecommendationWorkflow>;
export const surface = "rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6";
export const primaryButton = "min-h-11 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-amber-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 disabled:opacity-50";
export const secondaryButton = "min-h-11 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 disabled:opacity-50";
export const field = "mt-2 block w-full rounded-lg border border-slate-300 bg-white p-3 font-normal focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200 disabled:bg-slate-50";
export function formatDate(date?: string | null) {
  if (!date) return "No preferred date";
  const parsed = new Date(`${date}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? date : parsed.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
export function formatTime(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return time;
  return `${hours % 12 || 12}:${String(minutes).padStart(2, "0")} ${hours < 12 ? "AM" : "PM"}`;
}
