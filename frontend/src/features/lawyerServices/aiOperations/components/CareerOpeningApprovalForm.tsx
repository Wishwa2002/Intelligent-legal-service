import { useState, type FormEvent } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { HiringDraft } from '../services/workforceApi';
import { careerApprovalSchema } from '../schemas/hiringSuggestionSchema';
import { workforceInput, workforcePrimary, workforceSecondary } from '../workforcePresentation';

export function CareerOpeningApprovalForm({ draft, busy, blocked = false, unmapped, practiceArea, onBack, onApprove }: {
  draft: HiringDraft; busy: boolean; blocked?: boolean; unmapped: number; practiceArea: string; onBack: () => void; onApprove: (title: string, description: string, reviewed: boolean) => void;
}) {
  const [title, setTitle] = useState(draft.suggestedTitle);
  const [summary, setSummary] = useState(draft.summary);
  const [responsibilities, setResponsibilities] = useState(draft.responsibilities.join('\n'));
  const [reviewed, setReviewed] = useState(false);
  const [error, setError] = useState('');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    // Keep the Careers API and description format intact; structure only the editor.
    const description = `${summary}\n\nResponsibilities\n${responsibilities.split('\n').map(text => `• ${text}`).join('\n')}\n\nFocus Areas\n${draft.focusAreas.join('\n')}`;
    const result = careerApprovalSchema.safeParse({ jobTitle: title, description });
    if (!result.success) { setError(result.error.issues[0].message); return; }
    if (unmapped > 0 && !reviewed) { setError('Review existing unlinked Careers openings before approval.'); return; }
    setError(''); onApprove(result.data.jobTitle, result.data.description, reviewed);
  };
  return <form aria-labelledby="career-approval-heading" noValidate onSubmit={submit} className="overflow-hidden rounded-lg border border-slate-200 bg-white">
    <header className="border-b border-slate-200 p-5"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">HUMAN · Administrator Review</p><h3 id="career-approval-heading" data-workflow-focus tabIndex={-1} className="mt-1 text-lg font-bold focus-visible:outline-2 focus-visible:outline-amber-600">Final Review · Career Opening</h3><p className="mt-2 text-sm text-slate-600">Review the content below. Approve &amp; Create saves the Career Opening in Careers.</p></header>
    <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div className="min-w-0 max-w-prose space-y-4">
        <label className="block text-sm font-semibold">Career Title<input required maxLength={200} disabled={busy} value={title} onChange={e => setTitle(e.target.value)} className={workforceInput} /></label>
        <label className="block text-sm font-semibold">Role Summary<textarea rows={3} maxLength={12000} disabled={busy} value={summary} onChange={e => setSummary(e.target.value)} className={workforceInput} /></label>
        <label className="block text-sm font-semibold">Responsibilities<span className="ml-1 text-xs font-normal text-slate-500">(one per line)</span><textarea aria-label="Responsibilities" rows={4} maxLength={12000} disabled={busy} value={responsibilities} onChange={e => setResponsibilities(e.target.value)} className={workforceInput} /></label>
        <div><h4 className="text-sm font-semibold">Practice Focus</h4><ul className="mt-2 flex flex-wrap gap-2">{draft.focusAreas.map((text, index) => <li key={index} className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700">{text}</li>)}</ul></div>
      </div>
      <aside aria-label="Approval context" className="min-w-0 space-y-5">
        <dl className="space-y-3 rounded-md bg-slate-50 p-4 text-sm"><div><dt className="text-xs text-slate-500">Practice Area</dt><dd className="mt-1 font-semibold">{practiceArea}</dd></div><div><dt className="text-xs text-slate-500">Source</dt><dd className="mt-1 font-semibold">AI Workforce Recommendation</dd></div></dl>
        <section aria-label="Before publishing"><h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">Before Publishing</h4>
          {unmapped > 0 ? <><div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><div className="flex items-start gap-2"><AlertTriangle size={18} aria-hidden="true" className="mt-0.5 shrink-0" /><div><h5 className="font-bold">Unlinked Career Openings</h5><p className="mt-1 text-xs leading-relaxed">{unmapped} existing opening(s) have no Practice Area link. Review these postings to confirm this proposal is not a duplicate.</p></div></div><Link to="/admin/careers" target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex min-h-11 items-center text-sm font-semibold underline focus-visible:outline-2 focus-visible:outline-amber-600">Review Careers</Link></div>
            <label className="mt-3 flex min-h-11 items-start gap-2 text-xs leading-relaxed text-slate-700"><input type="checkbox" disabled={busy} checked={reviewed} onChange={e => setReviewed(e.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-amber-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600" />I reviewed existing Careers openings and confirmed this is not a duplicate.</label></> : <p className="mt-3 text-sm leading-relaxed text-slate-600">The system will recheck existing recruitment before saving your approved opening.</p>}
        </section>
      </aside>
    </div>
    {error && <p role="alert" className="px-5 pb-4 text-sm text-red-700">{error}</p>}
    <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 p-4 sm:p-5"><button type="button" disabled={busy} onClick={onBack} className={workforceSecondary}>Back to Proposal</button><button type="submit" disabled={busy || blocked} className={workforcePrimary}>{busy ? 'Creating Career Opening...' : 'Approve & Create Career Opening'}</button></footer>
  </form>;
}
