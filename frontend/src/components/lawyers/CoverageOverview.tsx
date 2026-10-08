import { CalendarClock, Check, FileText, TriangleAlert, Users, type LucideIcon } from "lucide-react";
import type { LawyerServicesSummary } from "../../api/lawyersApi";
import { coverageWarnings } from "./coverageWarnings";

type CoverageRow = LawyerServicesSummary["coverage"][number];
const columns = "xl:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))_minmax(0,1.35fr)]";

function CoverageMetric({ icon: Icon, value, label }: { icon: LucideIcon; value: number; label: string }) {
  return <dl className="flex min-w-0 flex-col">
    <dt className="mt-1 text-[11px] leading-snug text-slate-500">{label}</dt>
    <dd className="order-first flex items-center gap-1.5 text-lg font-semibold leading-none tabular-nums text-slate-900">
      <Icon size={15} strokeWidth={1.6} aria-hidden="true" className="shrink-0 text-slate-400" />{value}
    </dd>
  </dl>;
}

function CoverageStatus({ warnings, noCoverage }: { warnings: string[]; noCoverage: boolean }) {
  if (!warnings.length) return <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-800">
    <Check size={13} aria-hidden="true" />Operational
  </span>;
  return <ul aria-label="Coverage warnings" className="flex flex-wrap gap-1.5 xl:flex-col xl:items-start">
    {warnings.map(warning => <li key={warning} className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium ${noCoverage ? "border-red-200 bg-red-50 text-red-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
      <TriangleAlert size={13} aria-hidden="true" className="shrink-0" />{warning}
    </li>)}
  </ul>;
}

export function CoverageOverview({ rows, loading = false, error = null, onRetry }: {
  rows: CoverageRow[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}) {
  return <section aria-label="Coverage Overview" aria-busy={loading}
    className="mb-5 overflow-hidden rounded-lg border border-slate-200 bg-white">
    <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3 sm:px-5">
      <div>
        <h2 className="text-sm font-bold text-slate-900">Coverage Health Matrix</h2>
        <p className="mt-0.5 text-xs text-slate-500">Practice-area resource and appointment coverage.</p>
      </div>
      {!loading && !error && <span className="text-xs font-medium text-slate-500">{rows.length} Practice {rows.length === 1 ? "Area" : "Areas"}</span>}
    </header>
    {loading ? <div className="divide-y divide-slate-100">
      <p role="status" className="sr-only">Loading coverage information...</p>
      {[0, 1, 2].map(index => <div key={index} aria-hidden="true" className={`grid gap-3 px-4 py-4 sm:px-5 ${columns} xl:gap-4`}>
        <span className="h-4 w-3/4 rounded bg-slate-100" />
        <div className="grid grid-cols-3 gap-3 xl:contents">{[0, 1, 2].map(metric => <span key={metric} className="h-8 w-16 rounded bg-slate-100" />)}</div>
        <span className="h-5 w-24 rounded bg-slate-100" />
      </div>)}
    </div> : error ? <div role="alert" className="flex flex-wrap items-center justify-between gap-3 px-4 py-5 text-sm text-slate-600 sm:px-5">
      <p>Unable to load coverage information.</p>
      {onRetry && <button type="button" onClick={onRetry} className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600">Retry</button>}
    </div> : !rows.length ? <p className="px-4 py-5 text-sm text-slate-500 sm:px-5">No Practice Area coverage available.</p> : <>
      <div aria-hidden="true" className={`hidden gap-4 border-b border-slate-200 bg-slate-50 px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 xl:grid ${columns}`}>
        <span>Practice Area</span><span>Active Lawyers</span><span>Legal Services</span><span>Available Slots</span><span>Status</span>
      </div>
      <ul aria-label="Practice Area coverage" className="divide-y divide-slate-100">
        {rows.map(row => {
          const warnings = coverageWarnings(row);
          const noCoverage = row.activeLawyers === 0 && row.legalServices === 0 && row.futureAvailabilityCount === 0;
          const rail = noCoverage ? "bg-red-400" : warnings.length ? "bg-amber-400" : "bg-emerald-400";
          return <li key={row.practiceAreaId} className={`relative grid min-w-0 gap-y-3 px-4 py-4 transition-colors hover:bg-slate-50/70 sm:px-5 ${columns} xl:items-center xl:gap-x-4`}>
            <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-[3px] ${rail}`} />
            <h3 className="min-w-0 break-words text-sm font-semibold leading-snug text-slate-900">{row.practiceAreaName}</h3>
            <div className="grid grid-cols-2 gap-x-3 gap-y-3 min-[360px]:grid-cols-3 xl:contents">
              <CoverageMetric icon={Users} value={row.activeLawyers} label="Active Lawyers" />
              <CoverageMetric icon={FileText} value={row.legalServices} label="Legal Services" />
              <CoverageMetric icon={CalendarClock} value={row.futureAvailabilityCount} label="Available Slots" />
            </div>
            <div className="min-w-0"><CoverageStatus warnings={warnings} noCoverage={noCoverage} /></div>
          </li>;
        })}
      </ul>
    </>}
  </section>;
}
