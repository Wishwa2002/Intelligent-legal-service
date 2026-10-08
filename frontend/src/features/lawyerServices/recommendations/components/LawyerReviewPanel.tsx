import { SummaryField } from "./InterpretationSummary";
import { formatDate, primaryButton, secondaryButton, surface, type RecommendationWorkflowModel } from "./recommendationUI";
export function LawyerReviewPanel({ workflow: w }: { workflow: RecommendationWorkflowModel }) {
  if (!w.selected || !w.result) return null;
  return <section aria-label="Administrator review" className={surface}>
    <p className="text-xs font-bold uppercase tracking-wider text-amber-800">Human decision</p><h3 data-recommendation-focus tabIndex={-1} className="mt-2 text-xl font-bold focus:outline-none">Administrator Review</h3>
    <p className="mt-2 text-sm text-slate-500">Review the selected lawyer before continuing to appointment details. No appointment has been created.</p>
    <dl className="mt-6 grid gap-5 sm:grid-cols-2"><SummaryField label="Client" value={w.selectedClient?.name || "Select a client before continuing"} /><SummaryField label="Selected Lawyer" value={w.selected.fullName || "Practitioner profile unavailable"} /><SummaryField label="Practice Area" value={w.selected.practiceArea || "Unrecorded"} /><SummaryField label="Legal Service" value={w.result.parsedRequirement?.legalServiceName || "Not specifically identified"} /><SummaryField label="Recommendation Points" value={String(w.selected.score)} /><SummaryField label="Preferred Date" value={formatDate(w.result.date)} /></dl>
    <div className="mt-5 border-t border-slate-100 pt-4"><p className="text-xs font-semibold text-slate-700">Reason for Recommendation</p><p className="mt-2 text-sm leading-relaxed text-slate-600">{w.selected.reason}</p></div>
    <div className="mt-6 flex flex-wrap gap-3"><button type="button" disabled={w.reviewSaving} className={secondaryButton} onClick={w.changeSelection}>Change Selection</button><button type="button" disabled={w.reviewSaving || !w.selectedClient} className={primaryButton} onClick={w.continueToAppointment}>Continue to Appointment</button></div>
  </section>;
}
