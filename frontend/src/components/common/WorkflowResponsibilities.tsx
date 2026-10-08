export interface WorkflowResponsibilityDescriptions { system: string; ai: string; human: string }
export function WorkflowResponsibilities({ descriptions }: { descriptions: WorkflowResponsibilityDescriptions }) {
  return <div aria-label="Workflow responsibilities" className="mt-6 grid gap-3 border-t border-slate-200 pt-4 text-xs sm:grid-cols-3 sm:gap-5">
    <p><span className="block text-[10px] font-bold tracking-wider text-slate-700">SYSTEM</span><span className="mt-1 block leading-relaxed text-slate-500">{descriptions.system}</span></p>
    <p><span className="block text-[10px] font-bold tracking-wider text-amber-800">AI</span><span className="mt-1 block leading-relaxed text-slate-500">{descriptions.ai}</span></p>
    <p><span className="block text-[10px] font-bold tracking-wider text-slate-700">HUMAN</span><span className="mt-1 block leading-relaxed text-slate-500">{descriptions.human}</span></p>
  </div>;
}
