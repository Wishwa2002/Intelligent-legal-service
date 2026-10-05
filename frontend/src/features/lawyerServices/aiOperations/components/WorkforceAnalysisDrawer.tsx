import { useEffect, useRef, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { X } from "lucide-react";
import type { WorkforceArea, WorkforceReport } from "../services/workforceApi";
import { WorkforceStatus } from "./WorkforceAnalysisList";
import { reasonText } from "../workforceLabels";
export function WorkforceAnalysisDrawer({ area, report, busy, onClose, children }: {
  area: WorkforceArea; report?: WorkforceReport; busy: boolean; onClose: () => void; children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { const element = dialog.current; element?.showModal(); return () => { element?.close(); }; }, []);
  return <dialog ref={dialog} aria-labelledby="workforce-analysis-title" onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}
    className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-2xl overflow-y-auto rounded-lg border border-slate-200 bg-white p-0 text-slate-900 shadow-xl backdrop:bg-slate-900/50">
    <header className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4">
      <div><p className="text-xs font-semibold text-slate-500">Workforce Analysis</p><h2 id="workforce-analysis-title" className="mt-1 text-lg font-bold">{area.practiceAreaName}</h2></div>
      <button type="button" autoFocus disabled={busy} aria-label="Close workforce analysis" onClick={onClose} className="rounded-md p-1 text-slate-500 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-amber-600 disabled:opacity-50"><X size={18} aria-hidden="true" /></button>
    </header>
    <div className="space-y-4 px-5 py-4">
      <section><h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">System Data</h3>
        <p className="mt-1 text-xs text-slate-500">Recent window: {report?.recentWindowDays ?? '—'} days · Future capacity: {report?.futureWindowDays ?? '—'} days</p>
        <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">{[['Active Lawyers', area.activeLawyerCount], ['Legal Services', area.legalServiceCount], ['Recent Requests', area.recentDemandCount], ['Recent Appointments', area.recentAppointmentCount], ['Future Available Slots', area.futureAvailableSlotCount], ['Active Recruitment', area.openCareerOpeningCount]].map(([label, value]) => <div key={label}><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 text-base font-semibold tabular-nums">{value}</dd></div>)}</dl>
      </section>
      <section className="border-t border-slate-200 pt-4"><h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">System Assessment</h3><WorkforceStatus status={area.status} />
        <ul className="mt-2 space-y-1 text-sm text-slate-600">{area.reasons.map(code => <li key={code}>{reasonText[code] ?? code.replaceAll('_', ' ')}</li>)}</ul>
        {area.openings.length > 0 && <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><p className="font-semibold">Recruitment Already in Progress</p>{area.openings.map(opening => <p key={opening.careerId} className="mt-1">{opening.jobTitle} · Opening #{opening.careerId}</p>)}<Link to="/admin/careers" className="mt-2 inline-block font-semibold underline">View Career Opening</Link></div>}
      </section>
      {children}
    </div>
  </dialog>;
}
