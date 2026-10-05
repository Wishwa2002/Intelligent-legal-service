import { CheckCircle2 } from "lucide-react";
import type { RecommendationResult } from "../../../../api/recommendationsApi";
import { formatDate, surface } from "./recommendationUI";
export function InterpretationSummary({ result }: { result: RecommendationResult }) {
  const parsed = result.parsedRequirement;
  const verified = result.trace.some(event => event.step === "backend_validation");
  const serviceVerified = verified && parsed?.legalServiceId != null && !!parsed.legalServiceName;
  return <section aria-label="AI interpretation" className={surface}>
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">AI Interpretation</h3><span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">AI Generated{verified ? " · System Validated" : ""}</span></div>
    <dl className="mt-5 grid gap-5 sm:grid-cols-2">
      <SummaryField label="Practice Area" value={parsed?.categoryName || "No supported Practice Area"} />
      <SummaryField label="Relevant Legal Service" value={serviceVerified ? parsed!.legalServiceName! : "Not specifically identified"} />
      <SummaryField label="Detected Matter" value={parsed?.matterSummary || "No separate matter summary recorded"} />
      <SummaryField label="Preferred Date" value={formatDate(result.date)} />
    </dl>
    {verified && <div className="mt-5 flex flex-wrap gap-3 border-t border-slate-100 pt-4 text-xs text-emerald-800" aria-label="Catalog validation"><span className="font-semibold text-slate-600">Catalog Validation</span><span className="inline-flex items-center gap-1.5"><CheckCircle2 size={14} aria-hidden="true" />Practice Area verified</span>{serviceVerified && <span className="inline-flex items-center gap-1.5"><CheckCircle2 size={14} aria-hidden="true" />Legal Service verified</span>}</div>}
    {!result.date && result.recommendations.length > 0 && <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600"><strong>Availability Not Filtered.</strong> No preferred date was supplied. A valid future slot must be selected before booking.</p>}
    {result.date && result.recommendations.length > 0 && verified && <p className="mt-4 text-xs text-slate-600">Availability verified for requested date. Slots are checked again before booking.</p>}
    {result.warnings.map((warning, index) => <p key={index} className="mt-3 text-sm text-amber-800">{warning}</p>)}
  </section>;
}
export function SummaryField({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0"><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1.5 break-words text-sm font-semibold text-slate-900">{value}</dd></div>;
}
