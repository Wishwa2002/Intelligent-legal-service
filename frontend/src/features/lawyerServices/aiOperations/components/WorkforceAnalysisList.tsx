import { Link } from "react-router-dom";
import type { WorkforceArea } from "../services/workforceApi";
import { statusLabels, reasonText } from "../workforceLabels";
export function WorkforceStatus({ status }: { status: WorkforceArea["status"] }) {
  return <span className={`inline-block rounded-md border px-2 py-1 text-xs font-semibold ${status === "HEALTHY" ? "border-slate-200 bg-slate-50 text-slate-600" : status === "NO_ACTIVE_LAWYERS" ? "border-red-200 bg-red-50 text-red-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>{statusLabels[status]}</span>;
}
export function WorkforceAnalysisList({ areas, onView }: { areas: WorkforceArea[]; onView: (id: number) => void }) {
  if (!areas.length) return <div className="rounded-lg border border-slate-200 bg-white p-6"><h3 className="font-semibold text-slate-900">No Practice Areas</h3><p className="mt-1 text-sm text-slate-500">Configure a Practice Area before analyzing workforce capacity.</p></div>;
  return <ul aria-label="Workforce analysis" className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white">
    {areas.map(area => <li key={area.practiceAreaId} className="px-4 py-4 hover:bg-slate-50/50 sm:px-5">
      <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold text-slate-900">{area.practiceAreaName}</h3><WorkforceStatus status={area.status} /></div>
      <dl className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
        {[['Active Lawyers', area.activeLawyerCount], ['Recent Requests', area.recentDemandCount], ['Future Slots', area.futureAvailableSlotCount], ['Legal Services', area.legalServiceCount]].map(([label, value]) => <div key={label}><dt className="text-slate-500">{label}</dt><dd className="mt-1 text-base font-semibold tabular-nums text-slate-900">{value}</dd></div>)}
      </dl>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-3"><p className="max-w-2xl text-xs leading-relaxed text-slate-600">{area.reasons.map(code => reasonText[code] ?? code.replaceAll('_', ' ')).join(' ')}</p>
        <button type="button" aria-haspopup="dialog" aria-label={`View Analysis for ${area.practiceAreaName}`} onClick={() => onView(area.practiceAreaId)} className="shrink-0 rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600">View Analysis</button>
      </div>
      {area.openings.length > 0 && <p className="mt-2 text-xs text-amber-800">Recruitment already in progress: {area.openings.map(x => x.jobTitle).join(', ')}. <Link to="/admin/careers" className="font-semibold underline">View Career Opening</Link></p>}
    </li>)}
  </ul>;
}
