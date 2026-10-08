import { AIWorkflowProgress } from "../../../../components/common/AIWorkflowProgress";
import type { RecommendationResult } from "../../../../api/recommendationsApi";
import type { RecommendationView } from "../../../../hooks/useRecommendationWorkflow";

import { recommendationProgressStages } from "../recommendationProgress";
export function RecommendationWorkflowProgress({ result, busy = false, approving = false, view = "matches", failed = false }: {
  result?: RecommendationResult; busy?: boolean; approving?: boolean; view?: RecommendationView; failed?: boolean;
}) {
  // A confirmed response takes precedence over a request flag during response/navigation updates.
  const analysing = busy && (!result || result.status === "RECEIVED");
  const stages = recommendationProgressStages(result, analysing, approving, view);
  const title = result?.status === "ACTION_COMPLETED" ? "COMPLETE" : approving ? "CREATING APPOINTMENT" : analysing ? "ANALYSING" :
    result?.status === "AWAITING_APPROVAL" ? view === "matches" ? "MATCHES READY" : "ADMIN REVIEW" : result?.status === "UNSUPPORTED" ? "UNSUPPORTED" : result?.status === "NO_MATCH" ? "NO MATCHES" : failed || result?.status === "FAILED" ? "ANALYSIS STOPPED" : "AWAITING RESULTS";
  return <AIWorkflowProgress ariaLabel="Recommendation workflow progress" stages={stages} title={title}
    description={analysing ? "Analysing the requirement against the supported catalog. Confirmed interpretation, eligibility and ranking will appear together when analysis finishes." : "AI interprets the requirement. The system validates and ranks eligible lawyers. An administrator selects the lawyer and approves the appointment."}
    shortLabels={{ requirement: "Requirement", interpretation: "AI", catalog: "Catalog", candidates: "Candidates", availability: "Availability", ranking: "Ranking", validation: "Validation", review: "Review", appointment: "Appointment" }}
    responsibilities={{ system: "Client records, catalog, eligibility, availability, ranking and booking validation", ai: "Legal requirement interpretation", human: "Client intake, lawyer selection and appointment approval" }} />;
}
