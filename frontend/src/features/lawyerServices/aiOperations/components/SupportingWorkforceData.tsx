import { useState } from 'react';
import type { WorkforceReport, WorkforceArea } from '../services/workforceApi';
import { sortWorkforceAreas } from '../workforcePresentation';

function AreaRules({ area }: { area: WorkforceArea }) {
  const [expanded, setExpanded] = useState(false);
  const id = `workforce-evidence-${area.practiceAreaId}`;
  return <li className="border-t border-slate-200">
    <button type="button" aria-expanded={expanded} aria-controls={id} onClick={() => setExpanded(value => !value)} className="flex min-h-11 w-full items-center justify-between gap-3 py-3 text-left text-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600">Rules for {area.practiceAreaName}<span aria-hidden="true">{expanded ? '−' : '+'}</span></button>
    <div id={id} hidden={!expanded} className="pb-4 text-xs text-slate-600">
      <p>Recent Requests: {area.recentDemandCount} · Recent Appointments: {area.recentAppointmentCount}. These demand signals are not added together.</p>
      {area.planningRules ? <><h4 className="mt-3 font-semibold">Workforce Rules</h4><dl className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">{[['Minimum Active Lawyers', area.planningRules.minimumActiveLawyers], ['Target Active Lawyers', area.planningRules.targetActiveLawyers], ['Minimum Available Slots', area.planningRules.minimumFutureSlots], ['High Demand Threshold', area.planningRules.highDemandThreshold], ['Watch Capacity Ratio', `${area.planningRules.watchCapacityRatio * 100}%`], ['Configuration', area.planningRules.source === 'CUSTOM' ? 'Custom' : 'Default']].map(([label, value]) => <div key={label}><dt>{label}</dt><dd className="mt-1 font-semibold text-slate-900">{value}</dd></div>)}</dl></> : <p className="mt-2">Rule configuration was not included in this response.</p>}
    </div>
  </li>;
}
export function SupportingWorkforceData({ report }: { report: WorkforceReport }) {
  const [expanded, setExpanded] = useState(false);
  return <section className="rounded-lg border border-slate-200 bg-white px-4" aria-label="Analysis details">
    <button type="button" aria-expanded={expanded} aria-controls="workforce-analysis-details" onClick={() => setExpanded(value => !value)} className="flex min-h-11 w-full items-center justify-between gap-3 py-3 text-left text-sm font-semibold text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600">View Analysis Details<span aria-hidden="true">{expanded ? '−' : '+'}</span></button>
    <div id="workforce-analysis-details" hidden={!expanded} className="pb-3"><p className="mb-3 text-xs leading-relaxed text-slate-600">Snapshot: {report.generatedAt} · Last {report.recentWindowDays} days of demand · Next {report.futureWindowDays} days of capacity. Demand is the higher of requests and appointments.</p>
      <ul aria-label="Workforce rule details">{sortWorkforceAreas(report.practiceAreas).map(area => <AreaRules key={area.practiceAreaId} area={area} />)}</ul>
    </div>
  </section>;
}
