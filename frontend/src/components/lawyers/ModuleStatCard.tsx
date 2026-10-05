import type { LucideIcon } from "lucide-react";

export function ModuleStatCard({ value, label, helperText, icon: Icon, loading }: {
  value?: number;
  label: string;
  helperText: string;
  icon: LucideIcon;
  loading: boolean;
}) {
  return <article aria-label={label} aria-busy={loading}
    className="min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
    <div className="mb-3 flex items-center justify-between gap-3">
      {loading ? <span aria-hidden="true" className="h-9 w-16 rounded bg-slate-100" />
        : <p className="text-3xl font-bold leading-none tabular-nums tracking-tight text-slate-900">{value ?? "—"}</p>}
      <Icon size={20} strokeWidth={1.6} aria-hidden="true" className="shrink-0 text-slate-400" />
    </div>
    <p className="text-sm font-semibold leading-snug text-slate-800">{label}</p>
    {loading ? <span aria-hidden="true" className="mt-2 block h-3 w-3/4 rounded bg-slate-100" />
      : <p className="mt-1 text-xs leading-relaxed text-slate-500">{helperText}</p>}
  </article>;
}
