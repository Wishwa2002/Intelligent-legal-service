import type { RecommendationResult, WorkflowEvent } from "../../api/recommendationsApi";

export type StageState = "pending" | "completed" | "failed" | "waiting";
export interface WorkflowStage { label: string; actor: "AI" | "SYSTEM" | "HUMAN"; state: StageState; detail?: string }

export function workflowStages(result: RecommendationResult): WorkflowStage[] {
  const events = result.trace ?? [];
  const has = (step: string) => events.some((event: WorkflowEvent) => event.step === step &&
    ["completed", "action_completed", "approved"].includes(event.status.toLowerCase()));
  const count = (step: string, field: string): number | undefined => {
    const event = [...events].reverse().find(item => item.step === step && item.outputSummary);
    try {
      const value = JSON.parse(event?.outputSummary || "{}")[field];
      return typeof value === "number" && Number.isFinite(value) ? value : undefined;
    } catch { return undefined; }
  };
  const category = result.parsedRequirement?.categoryName;
  const unsupported = result.status === "UNSUPPORTED";
  const completed = result.status === "ACTION_COMPLETED";
  const waiting = result.status === "AWAITING_APPROVAL";
  const retrieved = has("search_lawyers") && !unsupported;
  const ranked = has("rank_candidates");
  const validated = has("backend_validation");
  const stage = (label: string, actor: WorkflowStage["actor"], state: StageState, detail?: string): WorkflowStage => ({ label, actor, state, detail });
  return [
    stage("Requirement Received", "SYSTEM", has("received") ? "completed" : "pending"),
    stage("Requirement Interpreted", "AI", has("parse_requirement") ? "completed" : "pending"),
    stage("Practice Area Verified", "SYSTEM", unsupported ? "failed" : has("validate_category") ? "completed" : "pending", category || (unsupported ? "No supported Practice Area" : undefined)),
    stage("Eligible Lawyers Retrieved", "SYSTEM", retrieved ? "completed" : "pending", count("search_lawyers", "candidateCount") != null ? `${count("search_lawyers", "candidateCount")} active practitioners ${result.date ? "after requested-date filtering" : "in the verified Practice Area"}` : undefined),
    stage(result.date ? "Availability Checked" : "Availability Not Filtered", "SYSTEM", retrieved ? "completed" : "pending", result.date ? `Requested date: ${result.date}` : "No preferred date supplied; check an actual slot before booking"),
    stage("Candidates Ranked", "SYSTEM", ranked ? "completed" : "pending", count("rank_candidates", "eligibleCount") != null ? `${count("rank_candidates", "eligibleCount")} candidates ranked` : undefined),
    stage("Recommendations Validated", "SYSTEM", validated && !unsupported ? "completed" : "pending", count("validate_recommendations", "validatedCount") != null ? `${count("validate_recommendations", "validatedCount")} results passed agent validation` : undefined),
    stage("Human Approval", "HUMAN", completed ? "completed" : waiting ? "waiting" : "pending"),
    stage("Appointment Created", "SYSTEM", completed && has("create_booking") ? "completed" : "pending"),
  ];
}
