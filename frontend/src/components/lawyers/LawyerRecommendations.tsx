import { useEffect, useRef } from "react";
import { WorkflowResponsibilities } from "../common/WorkflowResponsibilities";
import type { RecommendationResult } from "../../api/recommendationsApi";
import { useRecommendationWorkflow } from "../../hooks/useRecommendationWorkflow";
import { ClientIntake } from "../../features/lawyerServices/recommendations/components/ClientIntake";
import { RequirementForm } from "../../features/lawyerServices/recommendations/components/RequirementForm";
import { RecommendationWorkflowProgress } from "../../features/lawyerServices/recommendations/components/RecommendationWorkflowProgress";
import { InterpretationSummary } from "../../features/lawyerServices/recommendations/components/InterpretationSummary";
import { RecommendationMatches } from "../../features/lawyerServices/recommendations/components/RecommendationMatches";
import { LawyerReviewPanel } from "../../features/lawyerServices/recommendations/components/LawyerReviewPanel";
import { AppointmentApprovalForm } from "../../features/lawyerServices/recommendations/components/AppointmentApprovalForm";
import { RecommendationCompletion } from "../../features/lawyerServices/recommendations/components/RecommendationCompletion";
import { RecommendationError } from "../../features/lawyerServices/recommendations/components/RecommendationError";
import { WorkflowDetails } from "../../features/lawyerServices/recommendations/components/WorkflowDetails";
import { secondaryButton, surface } from "../../features/lawyerServices/recommendations/components/recommendationUI";

export function RecommendationWorkflow({ result }: { result: RecommendationResult }) {
  return <RecommendationWorkflowProgress result={result} />;
}
export function LawyerRecommendations({ showHeading = true }: { showHeading?: boolean }) {
  const w = useRecommendationWorkflow();
  const container = useRef<HTMLElement>(null);
  const focusState = w.restoring ? "restoring" : w.result ? `${w.result.status}:${w.view}` : "ready";
  const previousFocus = useRef(focusState);
  useEffect(() => {
    if (previousFocus.current !== focusState) container.current?.querySelector<HTMLElement>("[data-recommendation-focus]")?.focus({ preventScroll: true });
    previousFocus.current = focusState;
  }, [focusState]);
  const resolving = w.restoring || (!!w.workflowId && !w.result && !w.error);
  const unsupported = w.result?.status === "UNSUPPORTED";
  const noMatch = w.result?.status === "NO_MATCH";
  const failed = w.result?.status === "FAILED";
  return <section ref={container} id="lawyer-recommendations" aria-labelledby={showHeading ? "recommendation-title" : undefined} aria-label={showHeading ? undefined : "Lawyer matching workflow"} className="min-w-0 space-y-6 text-slate-900">
    {(showHeading || (w.result && w.result.status !== "ACTION_COMPLETED")) && <header className="flex flex-wrap items-start justify-between gap-3">{showHeading && <div><h2 id="recommendation-title" className="text-xl font-bold">AI Lawyer Matching</h2><p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">Assist walk-in clients by matching their legal needs with eligible lawyers and verified appointment availability.</p></div>}{w.result && w.result.status !== "ACTION_COMPLETED" && <button type="button" disabled={w.approving} onClick={() => w.clearWorkflow()} className={secondaryButton}>Start New Analysis</button>}</header>}
    {resolving ? <div role="status" className={surface}>Restoring recommendation workflow...</div> : <>
      <ClientIntake workflow={w} />
      {!w.result && !w.workflowId && <><RequirementForm workflow={w} />{!w.busy && !w.error && <WorkflowResponsibilities descriptions={{ system: "Client records, catalog, eligibility, availability, ranking and booking validation", ai: "Legal requirement interpretation", human: "Client intake, lawyer selection and appointment approval" }} />}</>}
      {(w.busy || w.result || (!!w.error && !w.workflowId)) && <RecommendationWorkflowProgress result={w.result} busy={w.busy} approving={w.approving} view={w.view} failed={!!w.error} />}
      {w.analysisSeconds != null && w.result && <p className="text-xs text-slate-500">Analysis completed in {w.analysisSeconds.toFixed(1)}s</p>}
      <RecommendationError workflow={w} />
      {w.result?.status === "ACTION_COMPLETED" ? <RecommendationCompletion workflow={w} /> : <>
        {w.result?.parsedRequirement && <InterpretationSummary result={w.result} />}
        {(unsupported || noMatch || failed) && <section className={surface}><h3 data-recommendation-focus tabIndex={-1} className="text-lg font-bold focus:outline-none">{unsupported ? "No Supported Practice Area" : noMatch ? "No Eligible Lawyers Found" : "Analysis Failed"}</h3><p className="mt-2 text-sm text-slate-600">{unsupported ? "The legal requirement does not match the currently supported Practice Area catalog. No lawyer recommendation was generated." : noMatch ? w.result?.date ? "No lawyers are available on the requested date." : "No active lawyers matched this Practice Area." : "The analysis could not be completed. Edit the requirement and try again."}</p><div className="mt-5 flex flex-wrap gap-3"><button type="button" onClick={() => w.clearWorkflow(true)} className={secondaryButton}>Edit Requirement</button>{noMatch && <button type="button" onClick={() => w.clearWorkflow(true)} className={secondaryButton}>Change Date</button>}</div></section>}
        {w.result?.status === "RECEIVED" && <div role="status" className={surface}>Workflow processing has not completed. <button type="button" className={secondaryButton} onClick={w.retryRestore}>Refresh Workflow</button></div>}
        {w.result?.status === "AWAITING_APPROVAL" && <><p role="status" className="sr-only">Recommendation prepared. Awaiting human approval.</p>{w.view === "matches" ? <RecommendationMatches result={w.result} onSelect={w.selectLawyer} /> : w.view === "review" ? <LawyerReviewPanel workflow={w} /> : <AppointmentApprovalForm workflow={w} />}</>}
      </>}
      {w.result && <WorkflowDetails result={w.result} />}
    </>}
  </section>;
}
