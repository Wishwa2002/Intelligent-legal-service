import type { WorkflowStage } from "../../../components/common/AIWorkflowProgress";
import { workflowStages } from "../../../components/lawyers/recommendationWorkflow";
import type { RecommendationResult } from "../../../api/recommendationsApi";
import type { RecommendationView } from "../../../hooks/useRecommendationWorkflow";

const labels = ["Requirement", "Interpretation", "Catalog Validation", "Candidate Retrieval", "Availability", "Ranking", "Validation", "Administrator Review", "Appointment"];
const ids = ["requirement", "interpretation", "catalog", "candidates", "availability", "ranking", "validation", "review", "appointment"];
export function recommendationProgressStages(result?: RecommendationResult, busy = false, approving = false, view: RecommendationView = "matches"): WorkflowStage[] {
  const stages = result ? workflowStages(result) : [];
  const completed = result?.status === "ACTION_COMPLETED";
  const mapped: WorkflowStage[] = labels.map((label, index) => {
    const stage = stages[index];
    return { id: ids[index], label, category: index === 1 ? "AI" : index === 7 ? "HUMAN" : "SYSTEM",
      state: completed ? "COMPLETE" : stage?.state === "completed" ? "COMPLETE" : stage?.state === "failed" ? "FAILED" : "PENDING",
      supportingText: stage?.detail };
  });
  if (busy && (!result || result.status === "RECEIVED")) mapped[0] = { ...mapped[0], state: "ACTIVE", supportingText: "Analysis request in progress. Stage results appear when the server confirms them." };
  if (result?.status === "AWAITING_APPROVAL") {
    mapped[7].state = approving ? "COMPLETE" : "ACTIVE";
    mapped[7].supportingText = approving ? "Administrator submitted approval; booking validation is running." : view === "matches" ? "Choose an eligible lawyer to begin human review." : "Review the selected lawyer and approve a real appointment slot.";
    mapped[8].state = approving ? "ACTIVE" : "PENDING";
  }
  if (result?.status === "FAILED") {
    const eventStage: Record<string, number> = { received: 0, parse_requirement: 1, validate_category: 2,
      search_lawyers: 3, rank_candidates: 5, validate_recommendations: 6, backend_validation: 6, create_booking: 8 };
    const failure = result.trace.find(event => event.status.toUpperCase() === "FAILED" && event.step in eventStage);
    if (failure) mapped[eventStage[failure.step]].state = "FAILED";
  }
  return mapped;
}
