import { useState } from 'react';
import { AIWorkflowProgress, type WorkflowStage } from '../../../../components/common/AIWorkflowProgress';
export type { WorkflowStage, WorkflowStageState } from '../../../../components/common/AIWorkflowProgress';
const responsibilities = { system: 'Demand, capacity and recruitment analysis', ai: 'Hiring proposal generation only', human: 'Final review and approval' };

export function WorkforceWorkflowProgress({ stages, title, description, analysing }: {
  stages: WorkflowStage[]; title: string; description: string; analysing: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const complete = stages.filter(stage => stage.state === 'COMPLETE').length;
  const completion = stages.length === 4 && complete === 4 ? '4 system checks completed' : `${complete} of ${stages.length} stages complete`;
  const full = <AIWorkflowProgress stages={stages} title={title} description={description}
    ariaLabel="Workforce workflow detail" completionText={completion} responsibilities={responsibilities}
    shortLabels={{ demand: 'Demand', capacity: 'Capacity', coverage: 'Coverage', recruitment: 'Recruitment', proposal: 'AI Draft', review: 'Review', career: 'Career' }} />;
  return <section aria-label="Workforce workflow progress" className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
    {analysing ? full : <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div aria-live="polite"><p data-workflow-progress tabIndex={-1} className="text-xs font-bold tracking-wide focus-visible:outline-2 focus-visible:outline-amber-600">{title}</p><p className="mt-1 text-xs text-slate-500">{completion}</p></div>
        <button type="button" aria-expanded={expanded} aria-controls="workforce-workflow-detail" onClick={() => setExpanded(value => !value)} className="min-h-11 text-sm font-semibold text-slate-700 underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600">{expanded ? 'Hide Workflow' : 'View Workflow'}</button>
      </div>
      {!expanded && <ol className="mt-3 flex flex-wrap gap-x-5 gap-y-3 border-t border-slate-100 pt-3">{stages.map(stage => <li key={stage.id} data-state={stage.state} className="flex items-start gap-2 text-xs">
        <span aria-hidden="true" className={stage.state === 'FAILED' ? 'text-red-700' : stage.state === 'COMPLETE' ? 'text-emerald-700' : 'text-slate-500'}>{stage.state === 'COMPLETE' ? '✓' : stage.state === 'ACTIVE' ? '●' : stage.state === 'FAILED' ? '!' : '○'}</span>
        <div><span className="block font-semibold">{stage.label}</span><span className="mt-1 block text-[10px] text-slate-500">{stage.category} · {stage.state.toLowerCase()}</span></div>
      </li>)}</ol>}
      <div id="workforce-workflow-detail">{expanded && full}</div>
      {stages.some(stage => stage.state === 'ACTIVE' || stage.state === 'FAILED') && <p className="mt-3 text-xs leading-relaxed text-slate-600">{description}</p>}
    </>}
  </section>;
}
