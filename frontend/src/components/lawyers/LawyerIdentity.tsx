import type { Lawyer } from "../../api/lawyersApi";

export function LawyerIdentity({ lawyer }: { lawyer: Lawyer }) {
  const statusStyle = lawyer.status === "Active"
    ? "bg-emerald-50 text-emerald-800"
    : lawyer.status === "Inactive" ? "bg-slate-100 text-slate-600" : "bg-amber-50 text-amber-800";

  return <div className="min-w-0">
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="font-bold text-slate-900">{lawyer.name}</span>
      <span className={`rounded-sm px-1.5 py-0.5 text-[10px] font-semibold ${statusStyle}`}>{lawyer.status || "Status unavailable"}</span>
    </div>
    <div className="text-xs text-slate-500">{lawyer.qualification || "No qualification recorded"}</div>
  </div>;
}
