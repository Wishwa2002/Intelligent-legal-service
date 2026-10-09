import type { WorkforceReport } from '../services/workforceApi';
export function AnalysisFreshness({ report, durationMs }: { report: WorkforceReport; durationMs?: number }) {
  const generatedAt = new Date(report.generatedAt);
  return <div aria-label="Analysis freshness" className="flex flex-wrap gap-x-5 gap-y-2 rounded-md bg-slate-100 px-3 py-2 text-xs text-slate-600">
    {!Number.isNaN(generatedAt.getTime()) && <p>Analysis: <time dateTime={report.generatedAt} title="Asia/Colombo">{new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Colombo', hour: '2-digit', minute: '2-digit' }).format(generatedAt)}</time></p>}
    <p>Demand: Last {report.recentWindowDays} days</p><p>Capacity: Next {report.futureWindowDays} days</p>
    {durationMs !== undefined && <p>Completed in: <span className="font-semibold tabular-nums">{(durationMs / 1000).toFixed(durationMs < 100 ? 3 : 1)}s</span></p>}
  </div>;
}
