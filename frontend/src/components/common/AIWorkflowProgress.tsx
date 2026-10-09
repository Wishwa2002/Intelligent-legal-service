import { useEffect, useRef } from "react";
import { WorkflowResponsibilities } from "./WorkflowResponsibilities";
export type WorkflowStageState = "PENDING" | "ACTIVE" | "COMPLETE" | "FAILED";
export interface WorkflowStage {
  id: string;
  label: string;
  category: "SYSTEM" | "AI" | "HUMAN";
  state: WorkflowStageState;
  supportingText?: string;
}
export function AIWorkflowProgress({ stages, title, description, ariaLabel, shortLabels = {},
  completionText: suppliedCompletionText, responsibilities, replayConfirmedStages = false }: {
  stages: WorkflowStage[]; title: string; description: string; ariaLabel: string;
  shortLabels?: Record<string, string>; completionText?: string;
  responsibilities: { system: string; ai: string; human: string };
  replayConfirmedStages?: boolean;
}) {
  const complete = stages.filter(stage => stage.state === "COMPLETE").length;
  const completionText = suppliedCompletionText ?? `${complete} of ${stages.length} stages complete`;
  const circumference = 2 * Math.PI * 104;
  const ratio = stages.length ? complete / stages.length : 0;
  const ring = useRef<SVGCircleElement>(null);
  const previousRatio = useRef(ratio);
  useEffect(() => {
    const from = previousRatio.current;
    previousRatio.current = ratio;
    const element = ring.current;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!replayConfirmedStages || !element || reducedMotion.matches || ratio <= from || typeof element.animate !== 'function') return;

    // Replay only newly confirmed completion. Results and actions remain available
    // immediately; the decorative ring pauses at each checkpoint independently.
    const steps = Math.max(1, Math.round((ratio - from) * stages.length));
    const travelMs = 300;
    const pauseMs = 220;
    const duration = steps * (travelMs + pauseMs);
    const frames: Keyframe[] = [{ strokeDashoffset: circumference * (1 - from), offset: 0, easing: 'ease-in-out' }];
    for (let step = 1; step <= steps; step++) {
      const position = from + (ratio - from) * step / steps;
      const strokeDashoffset = circumference * (1 - position);
      frames.push({ strokeDashoffset, offset: ((step - 1) * (travelMs + pauseMs) + travelMs) / duration });
      frames.push({ strokeDashoffset, offset: step * (travelMs + pauseMs) / duration, easing: 'ease-in-out' });
    }
    const animation = element.animate(frames, { duration, fill: 'none' });
    const stopForReducedMotion = () => { if (reducedMotion.matches) animation.cancel(); };
    reducedMotion.addEventListener('change', stopForReducedMotion);
    return () => { animation.cancel(); reducedMotion.removeEventListener('change', stopForReducedMotion); };
  }, [ratio, stages.length, circumference, replayConfirmedStages]);
  return <section aria-label={ariaLabel} className="border-y border-slate-200 py-7">
    <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)] lg:items-center lg:gap-7">
    <div className="relative mx-auto h-[210px] w-[210px] shrink-0 lg:h-[340px] lg:w-[340px]">
      <div className="absolute inset-0 lg:inset-[30px]">
      <svg viewBox="0 0 240 240" aria-hidden="true" className="h-full w-full -rotate-90">
        <circle cx="120" cy="120" r="104" fill="none" stroke="#e2e8f0" strokeWidth="6" />
        <circle ref={ring} cx="120" cy="120" r="104" fill="none" stroke="#d97706" strokeWidth="6" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={circumference * (1 - ratio)} />
        {stages.map((stage, index) => {
          const angle = index * 2 * Math.PI / stages.length;
          return <circle key={stage.id} cx={120 + 104 * Math.cos(angle)} cy={120 + 104 * Math.sin(angle)} r="5" stroke="white" strokeWidth="2"
            fill={stage.state === "FAILED" ? '#b91c1c' : stage.state === "COMPLETE" ? '#d97706' : stage.state === "ACTIVE" ? '#0f172a' : '#cbd5e1'} />;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center" aria-live="polite" aria-atomic="true">
        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">Analyse · Prepare · Approve</p>
        <p data-workflow-progress tabIndex={-1} className="mt-3 focus:outline-none text-lg font-bold text-slate-900 md:text-xl">{title}</p>
        <p className="mt-2 text-xs text-slate-500">{completionText}</p>
      </div>
      </div>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 hidden lg:block">{stages.map((stage, index) => {
        const angle = index * 2 * Math.PI / stages.length;
        return <span key={stage.id} className="absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-[10px] font-semibold text-slate-600" style={{ left: `${50 + 46 * Math.sin(angle)}%`, top: `${50 - 46 * Math.cos(angle)}%` }}>{shortLabels[stage.id] ?? stage.label}</span>;
      })}</div>
    </div>
    <div><p className="mb-4 text-sm leading-relaxed text-slate-600">{description}</p>
      <ol className="space-y-3">{stages.map(stage => <li key={stage.id} data-state={stage.state} className="flex items-start gap-3">
        <span aria-hidden="true" className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${stage.state === 'COMPLETE' ? 'border-amber-600 bg-amber-50 text-amber-800' : stage.state === 'FAILED' ? 'border-red-600 text-red-700' : stage.state === 'ACTIVE' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 text-slate-400'}`}>{stage.state === 'COMPLETE' ? '✓' : stage.state === 'FAILED' ? '!' : stage.state === 'ACTIVE' ? '●' : '○'}</span>
        <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-x-2"><p className={`text-sm font-semibold ${stage.state === 'PENDING' ? 'text-slate-500' : 'text-slate-900'}`}>{stage.label}</p><span className={`text-[10px] font-semibold tracking-wide ${stage.category === 'AI' ? 'text-amber-800' : 'text-slate-500'}`}>{stage.category}</span><span className="sr-only">{stage.state.toLowerCase()}</span></div>
          {stage.supportingText && <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{stage.supportingText}</p>}
        </div>
      </li>)}</ol>
    </div>
    </div>
    <WorkflowResponsibilities descriptions={responsibilities} />
  </section>;
}
