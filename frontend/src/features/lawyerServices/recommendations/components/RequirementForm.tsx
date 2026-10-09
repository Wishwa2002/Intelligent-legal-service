import { officeToday } from "../../../../api/schedulingApi";
import { CalendarDays, ArrowRight } from "lucide-react";
import { field, primaryButton, surface, type RecommendationWorkflowModel } from "./recommendationUI";
export function RequirementForm({ workflow: w }: { workflow: RecommendationWorkflowModel }) {
  const locked = w.busy || !!w.result || !w.selectedClient;
  return <form id="requirement-analysis" onSubmit={w.submit} className={surface} aria-label="Requirement analysis">
    <div className="mb-5 flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-bold">02</span><div><h3 className="font-bold">Describe the legal requirement</h3><p className="mt-1 text-xs text-slate-500">Start with the issue the client needs help with.</p></div></div>
    <label className="block text-sm font-semibold">Legal requirement
      <textarea required minLength={3} maxLength={4000} rows={5} disabled={locked} value={w.requirement} onChange={event => w.setRequirement(event.target.value)} placeholder="Describe the client's legal requirement..." className={`${field} resize-y`} />
    </label>
    <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
      <label className="block text-sm font-semibold"><span className="flex items-center gap-2"><CalendarDays size={15} aria-hidden="true" />Preferred date <span className="font-normal text-slate-500">(optional)</span></span>
        <input type="date" min={officeToday()} disabled={locked} value={w.date} onChange={event => w.setDate(event.target.value)} className={`${field} max-w-full`} />
      </label>
      <button disabled={locked} className={`${primaryButton} inline-flex items-center justify-center gap-2`}>{w.busy ? "Analysing Requirement..." : "Analyse Requirement"}<ArrowRight size={16} aria-hidden="true" /></button>
    </div>
  </form>;
}
