import { useEffect, useRef, useState } from "react";
import type { LawyerServicesSummary } from "../../../../api/lawyersApi";
import { Link, useOutletContext } from "react-router-dom";
import { WorkflowResponsibilities } from "../../../../components/common/WorkflowResponsibilities";
import { useWorkforceAnalysis } from "../hooks/useWorkforceAnalysis";
import { useHiringSuggestion } from "../hooks/useHiringSuggestion";
import { HiringSuggestionDraft } from "../components/HiringSuggestionDraft";
import { CareerOpeningApprovalForm } from "../components/CareerOpeningApprovalForm";
import { WorkforceWorkflowProgress, type WorkflowStage } from "../components/WorkforceWorkflowProgress";
import { SupportingWorkforceData } from "../components/SupportingWorkforceData";
import { AnalysisFreshness } from "../components/AnalysisFreshness";
import { WorkforceResult, ConcernDetail } from "../components/WorkforceResult";
import { WorkforceSettings } from "../components/WorkforceSettings";

import { workforcePrimary as primary, workforceSecondary as secondary } from "../workforcePresentation";
export function WorkforceHiringPage() {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Workforce & Hiring | LegalEase Admin";
    return () => { document.title = previousTitle; };
  }, []);
  const summary = useOutletContext<LawyerServicesSummary | null>();
  const { report, loading, error, durationMs, refresh } = useWorkforceAnalysis(false);
  const hiring = useHiringSuggestion(refresh);
  const [selected, setSelected] = useState<number>();
  const [continuing, setContinuing] = useState(false);
  const [started, setStarted] = useState(false);
  const page = useRef<HTMLElement>(null);
  // Restoring a saved workflow also loads current facts, without requesting AI content.
  const restoringId = hiring.id;
  useEffect(() => { if (restoringId) void refresh(); }, [restoringId, refresh]);
  const workflow = hiring.workflow;
  const areaId = selected ?? workflow?.snapshot.practiceAreaId;
  const area = report?.practiceAreas.find(item => item.practiceAreaId === areaId) ?? workflow?.snapshot;
  const pending = workflow?.status === "AWAITING_APPROVAL";
  const completed = workflow?.status === "CAREER_OPENING_CREATED";
  const dismissed = workflow?.status === "DISMISSED";
  const restoring = !!hiring.id && !workflow;
  const concerns = report?.practiceAreas.filter(item => item.status !== "HEALTHY") ?? [];
  const hasAnalysis = !!report || !!workflow;
  const analysisComplete = !!workflow || (hasAnalysis && !loading && !error);
  const extended = !!workflow || concerns.some(item => item.openCareerOpeningCount === 0);
  const allStages: WorkflowStage[] = [
    { id: 'demand', label: 'Demand Data', category: 'SYSTEM', state: 'PENDING' },
    { id: 'capacity', label: 'Lawyer Capacity', category: 'SYSTEM', state: 'PENDING' },
    { id: 'coverage', label: 'Coverage Assessment', category: 'SYSTEM', state: 'PENDING' },
    { id: 'recruitment', label: 'Recruitment Check', category: 'SYSTEM', state: 'PENDING' },
    { id: 'proposal', label: 'Hiring Proposal', category: 'AI', state: 'PENDING' },
    { id: 'review', label: 'Administrator Review', category: 'HUMAN', state: 'PENDING' },
    { id: 'career', label: 'Career Opening', category: 'SYSTEM', state: 'PENDING' },
  ];
  const stages = allStages.slice(0, loading && !workflow ? 4 : extended || hiring.errorAction === 'generate' ? 7 : 4).map((stage, index): WorkflowStage => {
    if (completed) return { ...stage, state: 'COMPLETE' };
    if (index < 4) {
      const supporting = [
        `${report?.recentWindowDays ?? 30}-day demand window loaded`,
        'Active lawyer and available slot data evaluated',
        report ? `${report.practiceAreas.length} Practice Areas compared` : 'Saved Practice Area assessment restored',
        'Existing Career openings checked',
      ];
      return { ...stage, state: analysisComplete ? 'COMPLETE' : index === 0 ? error ? 'FAILED' : loading ? 'ACTIVE' : 'PENDING' : 'PENDING', supportingText: analysisComplete ? supporting[index] : undefined };
    }
    if (index === 4) return { ...stage, state: hiring.action === 'generate' ? 'ACTIVE' : hiring.errorAction === 'generate' ? 'FAILED' : workflow ? 'COMPLETE' : 'PENDING' };
    if (index === 5) return { ...stage, state: hiring.action === 'approve' ? 'COMPLETE' : pending ? 'ACTIVE' : 'PENDING' };
    return { ...stage, state: hiring.action === 'approve' ? 'ACTIVE' : hiring.errorAction === 'approve' ? 'FAILED' : 'PENDING' };
  });
  const title = completed ? 'COMPLETE' : dismissed ? 'DISMISSED' : hiring.action === 'generate' ? 'PREPARING PROPOSAL' : hiring.action === 'approve' ? 'CREATING OPENING' : pending ? continuing ? 'AWAITING REVIEW' : 'AI PROPOSAL READY' : loading ? 'ANALYSING' : error ? 'ANALYSIS FAILED' : hiring.error ? 'ACTION REQUIRED' : 'ANALYSIS COMPLETE';
  const description = completed ? 'The approved opening is now managed in Careers.' : dismissed ? 'This suggestion was dismissed. No Career Opening was created.' : !workflow && loading ? 'Evaluating recorded demand, lawyer coverage and upcoming availability. Results appear when the analysis completes.' : hiring.action === 'generate' ? 'Generating proposal from verified workforce data...' : hiring.action === 'approve' ? 'Creating the approved opening in Careers...' : pending ? 'Review the proposal and confirm the final Careers content before approval.' : error ? 'The analysis could not be completed. Retry to load verified workforce data.' : 'The system assessment is complete. Review the findings below.';
  const run = () => { setStarted(true); setContinuing(false); void refresh(); };
  const prepare = (id: number, regenerate = false) => { setSelected(id); setContinuing(false); void hiring.generate(id, regenerate); };
  const done = () => { hiring.clear(); setSelected(undefined); setContinuing(false); setStarted(false); };
  const settingsChanged = () => { void refresh(); };
  const stale = hiring.errorAction === 'approve' && /facts changed|expired/i.test(hiring.error);
  const blocked = pending && !!area?.openCareerOpeningCount;
  const ready = !started && !hiring.id && !workflow;
  const focusState = restoring ? 'restore' : error ? 'analysis-error' : hiring.error ? 'hiring-error' : hiring.action === 'generate' || hiring.action === 'approve' ? hiring.action : loading && !workflow ? 'analysis' : workflow ? `${workflow.status}-${continuing}` : started && report ? 'result' : 'ready';
  useEffect(() => {
    if (focusState === 'ready') return;
    const target = page.current?.querySelector<HTMLElement>(focusState === 'analysis' || focusState === 'generate' || focusState === 'approve' ? '[data-workflow-progress]' : '[data-workflow-focus]');
    target?.focus();
  }, [focusState]);
  return <section ref={page} className="space-y-5 text-slate-900 [&_p]:break-words [&_li]:break-words [&_button]:motion-reduce:transition-none">
    <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h2 className="text-xl font-bold">Workforce &amp; Hiring Intelligence</h2><p className="mt-1 text-sm text-slate-600">Monitor legal-service demand, lawyer capacity and recruitment needs.</p></div><WorkforceSettings disabled={loading || hiring.busy} onChanged={settingsChanged} /></div>
    {restoring ? <section aria-live="polite" className="rounded-lg border border-slate-200 bg-white p-6"><h3 data-workflow-focus tabIndex={-1} className="font-bold focus:outline-none">{hiring.error ? 'Hiring Workflow Could Not Be Restored' : 'Restoring Hiring Workflow'}</h3><p className="mt-2 text-sm text-slate-600">{hiring.error || 'Loading the saved proposal and review status...'}</p>{hiring.error && <div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={hiring.retryRestore} className={primary}>Retry Workflow</button><button type="button" onClick={done} className={secondary}>Return to Analysis</button></div>}</section>
    : ready ? <section className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">SYSTEM · Workforce Coverage</p><h3 className="mt-2 text-lg font-bold">Workforce Coverage</h3>
      <p className="mt-2 max-w-prose text-sm leading-relaxed text-slate-600">Analyse recent demand against lawyer availability and current recruitment activity.</p>
      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div><dt className="text-xs text-slate-500">Demand Window</dt><dd className="mt-1 text-sm font-semibold">Last {report?.recentWindowDays ?? 30} days{!report && <span className="block text-xs font-normal text-slate-500">Default window</span>}</dd></div>
          <div><dt className="text-xs text-slate-500">Capacity Window</dt><dd className="mt-1 text-sm font-semibold">Next {report?.futureWindowDays ?? 30} days{!report && <span className="block text-xs font-normal text-slate-500">Default window</span>}</dd></div>
          <div><dt className="text-xs text-slate-500">Practice Areas</dt><dd className="mt-1 text-sm font-semibold">{report?.practiceAreas.length ?? summary?.practiceAreas ?? 'Unavailable'}</dd></div>
        </dl><button type="button" onClick={run} className={`${primary} justify-self-start lg:justify-self-end`}>Run Workforce Analysis</button>
      </div>
      <WorkflowResponsibilities descriptions={{ system: 'Demand, capacity & recruitment analysis', ai: 'Hiring content generation', human: 'Final decision & approval' }} />
    </section> : <>
      <WorkforceWorkflowProgress stages={stages} title={title} description={description} analysing={loading && !workflow} />
      {error && <section role="alert" className="rounded-md border border-red-200 bg-red-50 p-4"><h3 data-workflow-focus tabIndex={-1} className="font-bold focus:outline-none">Analysis Could Not Be Completed</h3><p className="mt-2 text-sm">Please retry to load current workforce data.</p><button type="button" disabled={loading || hiring.busy} onClick={run} className={`${secondary} mt-3`}>Retry Analysis</button></section>}
      {hiring.error && <section role="alert" className="rounded-md border border-red-200 bg-red-50 p-4"><h3 data-workflow-focus tabIndex={-1} className="font-bold focus:outline-none">{stale ? 'Workforce Data Changed' : hiring.errorAction === 'generate' ? 'Hiring Proposal Could Not Be Generated' : hiring.errorAction === 'approve' ? 'Career Opening Was Not Created' : 'Hiring Action Could Not Be Completed'}</h3><p className="mt-2 text-sm">{stale ? 'Run the analysis again, then regenerate the proposal before approving.' : hiring.error}</p>
        <div className="mt-3 flex flex-wrap gap-2">{hiring.errorAction === 'generate' && area && <button type="button" disabled={hiring.busy || loading || !!area.openCareerOpeningCount || area.status === 'HEALTHY'} onClick={() => prepare(area.practiceAreaId, !!workflow)} className={secondary}>Retry Proposal</button>}{hiring.errorAction === 'approve' && <button type="button" disabled={loading || hiring.busy} onClick={run} className={secondary}>{stale ? 'Refresh Analysis' : 'Review Current Recruitment'}</button>}</div>
      </section>}
      {report && !loading && !error && <AnalysisFreshness report={report} durationMs={durationMs} />}
      {!workflow && report && !loading && !error && hiring.action !== 'generate' && <WorkforceResult report={report} onPrepare={prepare} busy={hiring.busy} />}
      {pending && area && <>
        {blocked && <ConcernDetail area={area} busy={hiring.busy} onPrepare={prepare} />}
        {continuing && !blocked ? <CareerOpeningApprovalForm key={JSON.stringify(workflow.draft)} draft={workflow.draft} practiceArea={area.practiceAreaName} busy={hiring.busy} blocked={loading || !!error || stale} unmapped={report?.unmappedCareerOpeningCount ?? 0} onBack={() => setContinuing(false)} onApprove={(jobTitle, description, reviewed) => void hiring.approve(workflow.draft, jobTitle, description, reviewed)} />
          : <HiringSuggestionDraft draft={workflow.draft} snapshot={workflow.snapshot} capturedAt={workflow.createdAt} onDismiss={() => void hiring.dismiss()} busy={hiring.busy || loading} canEdit={!blocked && !error} canRegenerate={area.status !== 'HEALTHY'} onSave={draft => { setContinuing(false); return hiring.save(draft); }} onContinue={() => setContinuing(true)} onRegenerate={() => prepare(area.practiceAreaId, true)} />}

      </>}
      {completed && <section role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-6"><p className="text-xs font-semibold uppercase tracking-wider text-emerald-800">Workflow complete</p><h3 data-workflow-focus tabIndex={-1} className="mt-2 text-xl font-bold focus:outline-none">Career Opening Created</h3><p className="mt-3 font-semibold">{workflow.approvedTitle}</p><p className="mt-2 text-sm text-slate-600">{workflow.careerOpeningId ? 'The approved hiring proposal has been created in Careers & Job Applications.' : 'This opening was subsequently removed in Careers. The approval history is preserved.'}</p><p className="mt-2 text-sm">{workflow.careerOpeningId ? `Opening #${workflow.careerOpeningId}` : 'Opening removed in Careers'}</p><div className="mt-4 flex flex-wrap gap-2"><Link to="/admin/careers" className={`${primary} inline-flex items-center`}>View in Careers</Link><button type="button" onClick={done} className={secondary}>Done</button></div></section>}
      {dismissed && <section role="status" className="rounded-lg border border-slate-200 bg-white p-6"><h3 data-workflow-focus tabIndex={-1} className="text-lg font-bold focus:outline-none">Suggestion Dismissed</h3><p className="mt-2 text-sm text-slate-600">No Career Opening was created.</p><button type="button" onClick={done} className={`${secondary} mt-4`}>Done</button></section>}
      {report && !loading && !error && <SupportingWorkforceData report={report} />}
      {!workflow && report && !loading && !error && <button type="button" disabled={hiring.busy} onClick={run} className={secondary}>Run New Analysis</button>}
    </>}
    <details className="text-xs text-slate-600"><summary className="min-h-11 cursor-pointer py-3 font-semibold focus-visible:outline-2 focus-visible:outline-amber-600">How this analysis works</summary><p className="mt-2 leading-relaxed">Admin workforce rules define expected staffing and capacity; unconfigured areas use global defaults. The backend reads real lawyers, demand, available slots and recruitment, then assigns status through deterministic rules using 30-day windows by default. AI does not calculate status or set thresholds. It only drafts hiring content after a staffing concern. An Administrator reviews the proposal and must approve creation in Careers.</p>{report && <ul className="mt-3 list-disc space-y-2 pl-4">{report.limitations.map(text => <li key={text}>{text}</li>)}</ul>}</details>
  </section>;
}
