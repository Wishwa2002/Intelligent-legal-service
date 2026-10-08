import { Link } from 'react-router-dom';
import type { WorkforceArea, WorkforceReport } from '../services/workforceApi';
import { WorkforceStatus } from './WorkforceAnalysisList';
import { reasonText } from '../workforceLabels';
import { sortWorkforceAreas, workforceDemand, workforcePrimary } from '../workforcePresentation';

export function WorkforceResult({ report, onPrepare, busy }: {
  report: WorkforceReport; onPrepare: (id: number) => void; busy: boolean;
}) {
  const concerns = report.practiceAreas.filter(area => area.status !== 'HEALTHY');
  const recruiting = report.practiceAreas.some(area => area.openCareerOpeningCount > 0);
  const healthy = report.practiceAreas.length > 0 && concerns.length === 0;
  return <section aria-label="Workforce analysis result" className="space-y-4">
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">SYSTEM · Workforce Overview</p>
      <dl className="mt-4 grid gap-4 min-[390px]:grid-cols-3">
        {[['Practice Areas Analysed', report.practiceAreas.length], ['Active Lawyers', report.practiceAreas.reduce((sum, area) => sum + area.activeLawyerCount, 0)], ['Future Available Slots', report.practiceAreas.reduce((sum, area) => sum + area.futureAvailableSlotCount, 0)]].map(([label, count]) => <div key={label}><dd className="text-2xl font-bold tabular-nums">{count}</dd><dt className="mt-1 text-xs text-slate-600">{label}</dt></div>)}
      </dl>
      <div className="mt-5 border-t border-slate-200 pt-4">
        <h3 data-workflow-focus tabIndex={-1} className="text-lg font-bold focus-visible:outline-2 focus-visible:outline-amber-600">{healthy ? recruiting ? 'Workforce Coverage Stable' : 'Workforce Coverage Healthy' : concerns.length ? `${concerns.length} ${concerns.length === 1 ? 'area requires' : 'areas require'} review` : 'No Practice Areas'}</h3>
        <p className="mt-1 text-sm text-slate-600">{healthy ? 'No immediate staffing concerns detected under the current workforce rules.' : concerns.length ? 'Review the areas needing attention and choose the next staffing action.' : 'Configure a Practice Area before analysing workforce capacity.'}</p>
      </div>
    </section>
    {report.practiceAreas.length > 0 && <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-bold">Practice Area Coverage</h3><p className="text-xs text-slate-500">{concerns.length ? 'Areas needing attention first' : 'All areas have healthy coverage'}</p></div>
      <ul aria-label="Practice Area coverage" className="space-y-3">{sortWorkforceAreas(report.practiceAreas).map(area => <li key={area.practiceAreaId}><ConcernDetail area={area} busy={busy} onPrepare={onPrepare} /></li>)}</ul>
    </div>}
  </section>;
}

export function ConcernDetail({ area, busy, onPrepare }: { area: WorkforceArea; busy: boolean; onPrepare: (id: number) => void }) {
  const healthy = area.status === 'HEALTHY';
  const rail = healthy ? 'border-l-emerald-500' : area.status === 'NO_ACTIVE_LAWYERS' ? 'border-l-red-600' : area.status === 'CAPACITY_CONCERN' ? 'border-l-orange-600' : 'border-l-amber-500';
  return <article aria-label={`${area.practiceAreaName} coverage`} className={`rounded-lg border border-slate-200 border-l-4 ${rail} bg-white p-4 sm:p-5`}>
    <div className="flex flex-wrap items-start justify-between gap-2"><h4 className="min-w-0 text-base font-bold">{area.practiceAreaName}</h4><WorkforceStatus status={area.status} /></div>
    <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
      {[['Demand', workforceDemand(area)], ['Active Lawyers', area.activeLawyerCount], ['Legal Services', area.legalServiceCount], ['Available Slots', area.futureAvailableSlotCount]].map(([label, count]) => <div key={label}><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 text-xl font-semibold tabular-nums">{count}</dd>{label === 'Demand' && <p className="mt-1 text-xs text-slate-500">{area.recentDemandCount} requests · {area.recentAppointmentCount} appointments</p>}</div>)}
    </dl>
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
      <div className="max-w-prose text-sm leading-relaxed text-slate-600">{healthy ? <><p className="font-medium text-slate-700">Healthy capacity</p><p>No staffing action recommended.</p></> : <p>{area.reasons.filter(code => code !== 'RECRUITMENT_ALREADY_ACTIVE').map(code => reasonText[code] ?? 'Review recorded coverage.').join(' ') || 'Review demand and available capacity before deciding on recruitment.'}</p>}</div>
      {!healthy && area.openCareerOpeningCount === 0 && <button type="button" disabled={busy} onClick={() => onPrepare(area.practiceAreaId)} className={workforcePrimary}>Prepare Hiring Proposal</button>}
    </div>
    {area.openCareerOpeningCount > 0 && <section aria-label="Current recruitment" className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3">
      <h5 className="text-sm font-semibold">Recruitment already active</h5><p className="mt-1 text-xs leading-relaxed text-slate-600">A Career Opening is already addressing this staffing need. Another proposal is blocked to avoid duplicate recruitment.</p>
      {area.openings.map(opening => <p key={opening.careerId} className="mt-2 text-xs text-slate-700">{opening.jobTitle} · Career Opening #{opening.careerId}</p>)}
      <Link to="/admin/careers" className="mt-1 inline-flex min-h-11 items-center text-sm font-semibold text-slate-700 underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600">View Career Opening →</Link>
    </section>}
  </article>;
}
