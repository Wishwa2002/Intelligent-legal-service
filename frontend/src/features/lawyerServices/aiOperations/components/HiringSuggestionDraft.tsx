import { useState } from 'react';
import type { HiringDraft, WorkforceArea } from '../services/workforceApi';
import { hiringDraftSchema } from '../schemas/hiringSuggestionSchema';
import { WorkforceStatus } from './WorkforceAnalysisList';
import { workforceDemand, workforceInput, workforcePrimary, workforceSecondary } from '../workforcePresentation';

export function HiringSuggestionDraft({ draft, snapshot, capturedAt, busy, canEdit, canRegenerate = true, onSave, onContinue, onRegenerate, onDismiss }: {
  draft: HiringDraft; snapshot: WorkforceArea; capturedAt: string; busy: boolean; canEdit: boolean; canRegenerate?: boolean;
  onSave: (draft: HiringDraft) => Promise<boolean>; onContinue: () => void; onRegenerate: () => void; onDismiss: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState(draft);
  const [error, setError] = useState('');
  const save = async () => {
    const result = hiringDraftSchema.safeParse(values);
    if (!result.success) { setError(result.error.issues[0].message); return; }
    setError(''); if (await onSave(result.data)) setEditing(false);
  };
  return <section aria-labelledby="hiring-draft-heading" className="overflow-hidden rounded-lg border border-slate-200 bg-white">
    <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 p-5">
      <div><h3 data-workflow-focus tabIndex={-1} id="hiring-draft-heading" className="text-lg font-bold focus-visible:outline-2 focus-visible:outline-amber-600">AI Hiring Proposal</h3><p className="mt-1 text-sm text-slate-600">{snapshot.practiceAreaName}</p></div>
      <p className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">AI Generated · Review Required</p>
    </header>
    <div className="grid lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div className="min-w-0 p-5 sm:p-6">
        {editing ? <div className="max-w-prose space-y-4">
          {([['suggestedTitle', 'Suggested Role'], ['operationalReason', 'Hiring Rationale'], ['summary', 'Role Summary']] as const).map(([field, label]) => <label key={field} className="block text-sm font-semibold">{label}<textarea aria-label={label} disabled={busy} rows={field === 'suggestedTitle' ? 1 : 3} value={values[field]} onChange={e => setValues(v => ({ ...v, [field]: e.target.value }))} className={workforceInput} /></label>)}
          {([['responsibilities', 'Responsibilities'], ['focusAreas', 'Practice Focus']] as const).map(([field, label]) => <label key={field} className="block text-sm font-semibold">{label}<span className="ml-1 text-xs font-normal text-slate-500">(one per line)</span><textarea aria-label={label} disabled={busy} rows={3} value={values[field].join('\n')} onChange={e => setValues(v => ({ ...v, [field]: e.target.value.split('\n') }))} className={workforceInput} /></label>)}
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <div className="flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={() => void save()} className={workforcePrimary}>Save Changes</button><button type="button" disabled={busy} onClick={() => { setEditing(false); setError(''); }} className={workforceSecondary}>Cancel</button></div>
        </div> : <div className="max-w-prose space-y-5 text-sm">
          <h4 className="text-xl font-bold leading-snug">{draft.suggestedTitle}</h4>
          <div className="rounded-md bg-slate-50 p-3"><h4 className="font-bold">Hiring Rationale</h4><p className="mt-2 whitespace-pre-wrap leading-relaxed text-slate-600">{draft.operationalReason}</p></div>
          <div><h4 className="font-bold">Role Summary</h4><p className="mt-2 whitespace-pre-wrap leading-relaxed text-slate-600">{draft.summary}</p></div>
          <div><h4 className="font-bold">Key Responsibilities</h4><ul className="mt-2 list-disc space-y-2 pl-5 leading-relaxed text-slate-600">{draft.responsibilities.map((text, i) => <li key={i}>{text}</li>)}</ul></div>
          <div><h4 className="font-bold">Practice Focus</h4><ul className="mt-2 flex flex-wrap gap-2">{draft.focusAreas.map((text, i) => <li key={i} className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700">{text}</li>)}</ul></div>
        </div>}
      </div>
      <aside aria-label="Proposal decision context" className="min-w-0 border-t border-slate-200 bg-slate-50 p-5 lg:border-l lg:border-t-0 sm:p-6">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">SYSTEM · Decision Context</h4>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2"><dt className="text-slate-600">Status</dt><dd><WorkforceStatus status={snapshot.status} /></dd></div>
          {[['Demand', workforceDemand(snapshot)], ['Active Lawyers', snapshot.activeLawyerCount], ['Available Slots', snapshot.futureAvailableSlotCount], ['Existing Opening', snapshot.openCareerOpeningCount ? 'Yes' : 'No']].map(([label, value]) => <div key={label} className="flex flex-wrap justify-between gap-2"><dt className="text-slate-600">{label}</dt><dd className="font-semibold tabular-nums">{value}</dd></div>)}
        </dl>
        <div className="mt-5 border-t border-slate-200 pt-4 text-xs leading-relaxed text-slate-600"><p className="font-bold text-slate-700">AI · Content generation</p><p className="mt-1">Drafted from the saved system assessment. Administrator approval is required to create a Career Opening.</p></div>
        <details className="mt-3 text-xs text-slate-600"><summary className="min-h-11 cursor-pointer py-3 font-semibold underline focus-visible:outline-2 focus-visible:outline-amber-600">View Proposal Analysis Details</summary>
          <p>Workflow saved: {new Date(capturedAt).toLocaleString()}</p><p className="mt-2">Demand uses the higher of {snapshot.recentDemandCount} recent requests and {snapshot.recentAppointmentCount} appointments.</p><p className="mt-2">Legal Services: {snapshot.legalServiceCount}</p><p className="mt-2">Approval rechecks snapshot freshness and existing recruitment.</p>
        </details>
      </aside>
    </div>
    <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 p-4 sm:p-5">
      <button type="button" disabled={busy} onClick={onDismiss} className="min-h-11 text-sm font-semibold text-slate-600 underline hover:text-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 disabled:opacity-50">Dismiss Suggestion</button>
      {canEdit && !editing && <div className="flex flex-wrap gap-2">{canRegenerate && <button type="button" disabled={busy} onClick={onRegenerate} className={workforceSecondary}>Regenerate</button>}<button type="button" disabled={busy} onClick={() => { setValues(draft); setEditing(true); }} className={workforceSecondary}>Edit Draft</button><button type="button" disabled={busy} onClick={onContinue} className={workforcePrimary}>Continue to Approval</button></div>}
    </footer>
  </section>;
}
