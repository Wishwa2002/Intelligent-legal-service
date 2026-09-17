import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AdminLayout } from "../../../components/layout/AdminLayout";
import { documentationApi, type DocumentationRequest } from "../../../api/documentationApi";
import { clerksApi, type Clerk } from "../../../api/clerksApi";

const formatDocId = (id: string | number) => `DMT${String(id).padStart(3, "0")}`;
const formatClerkId = (id: string | number) => `CRK${String(id).padStart(3, "0")}`;

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Pending", className: "bg-amber-50 text-amber-700 border-amber-200" },
  UNDER_REVIEW: { label: "Under Review", className: "bg-blue-50 text-blue-700 border-blue-200" },
  ASSIGNED: { label: "Assigned", className: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  IN_PROGRESS: { label: "In Progress", className: "bg-purple-50 text-purple-700 border-purple-200" },
  REQUIRES_DOCUMENTS: { label: "Missing Docs", className: "bg-rose-50 text-rose-700 border-rose-200" },
  COMPLETED: { label: "Completed", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  REJECTED: { label: "Rejected", className: "bg-slate-100 text-slate-600 border-slate-200" },
  CANCELLED: { label: "Cancelled", className: "bg-slate-100 text-slate-500 border-slate-200" },
};

const FILTER_TABS = [
  { value: "", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "UNDER_REVIEW", label: "Under Review" },
  { value: "ASSIGNED", label: "Assigned" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "REQUIRES_DOCUMENTS", label: "Missing Docs" },
  { value: "COMPLETED", label: "Completed" },
  { value: "REJECTED", label: "Rejected" },
];

type SortKey = "requestId" | "createdAt" | "status" | "customerName";
type SortDir = "asc" | "desc";

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const cfg = STATUS_CONFIG[status] ?? { label: status, className: "bg-slate-100 text-slate-600 border-slate-200" };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${cfg.className}`}>
      {cfg.label}
    </span>
  );
};

export const DocumentationRequestsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [requests, setRequests] = useState<DocumentationRequest[]>([]);
  const [clerks, setClerks] = useState<Clerk[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const clerkFilter = searchParams.get("clerkId") || "";

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await documentationApi.getRequests();
      setRequests(data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to load requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    clerksApi.getAll().then(setClerks).catch(() => {});
  }, []);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  };

  const SortIcon: React.FC<{ col: SortKey }> = ({ col }) => {
    if (sortKey !== col) return <span className="text-slate-300 ml-1">↕</span>;
    return <span className="text-amber-500 ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>;
  };

  const filtered = useMemo(() => {
    let list = [...requests];
    if (statusFilter) list = list.filter(r => r.status === statusFilter);
    if (clerkFilter) list = list.filter(r => String(r.assignedClerkId) === clerkFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        (r.customerName || "").toLowerCase().includes(q) ||
        (r.serviceName || "").toLowerCase().includes(q) ||
        (r.documentType || "").toLowerCase().includes(q) ||
        (r.assignedClerkName || "").toLowerCase().includes(q) ||
        String(r.requestId).includes(q) ||
        formatDocId(r.requestId).toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      let valA: any, valB: any;
      if (sortKey === "requestId") { valA = Number(a.requestId); valB = Number(b.requestId); }
      else if (sortKey === "createdAt") { valA = new Date(a.createdAt).getTime(); valB = new Date(b.createdAt).getTime(); }
      else if (sortKey === "status") { valA = a.status; valB = b.status; }
      else { valA = (a.customerName || "").toLowerCase(); valB = (b.customerName || "").toLowerCase(); }
      if (valA < valB) return sortDir === "asc" ? -1 : 1;
      if (valA > valB) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [requests, statusFilter, clerkFilter, search, sortKey, sortDir]);

  return (
    <AdminLayout
      title="Documentation Requests"
      subtitle="Track customer legal service documentation filings, uploaded proofs, and clerk assignments."
    >
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-lg mb-6 text-sm flex items-center gap-2">
          <span>⚠️</span> {error}
        </div>
      )}

      {/* ── Search & Controls ── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm mb-5">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          {/* Search */}
          <div className="relative flex-1 w-full sm:max-w-md">
            <svg
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"
              className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            >
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search by client name, service, clerk, ID…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-8 py-2.5 text-xs border border-slate-300/80 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition shadow-2xs"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            )}
          </div>

          {/* Clerk Filter Dropdown & Refresh */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
            <select
              value={clerkFilter}
              onChange={e => {
                const val = e.target.value;
                setSearchParams(prev => {
                  const next = new URLSearchParams(prev);
                  if (val) next.set("clerkId", val);
                  else next.delete("clerkId");
                  return next;
                });
              }}
              className="text-xs font-semibold bg-slate-50 border border-slate-300/80 rounded-xl px-3.5 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:bg-white transition cursor-pointer shadow-2xs"
            >
              <option value="">👤 All Assigned Clerks</option>
              {clerks.map(c => (
                <option key={c.clerkId} value={String(c.clerkId)}>
                  {c.fullName} ({c.activeAssignmentsCount} tasks)
                </option>
              ))}
            </select>
            {clerkFilter && (
              <button
                onClick={() => {
                  setSearchParams(prev => {
                    const next = new URLSearchParams(prev);
                    next.delete("clerkId");
                    return next;
                  });
                }}
                className="text-xs text-rose-600 hover:text-rose-800 px-2 py-1 font-bold"
              >
                Clear
              </button>
            )}
            <button
              onClick={fetchRequests}
              disabled={loading}
              className="p-2.5 rounded-xl border border-slate-300/80 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition disabled:opacity-50 cursor-pointer shadow-2xs"
              title="Refresh requests"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}>
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Pill Filter Tabs ── */}
        <div className="flex flex-wrap gap-2 mt-3.5 pt-3.5 border-t border-slate-100">
          {FILTER_TABS.map(tab => {
            const count = tab.value === "" ? requests.length : requests.filter(r => r.status === tab.value).length;
            const isActive = statusFilter === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  isActive
                    ? "bg-slate-950 text-white border-slate-950 shadow-sm"
                    : "bg-slate-50 text-slate-600 border-slate-200/80 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <span>{tab.label}</span>
                <span className={`inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[10px] font-bold px-1.5 ${
                  isActive ? "bg-amber-400 text-slate-950" : "bg-slate-200 text-slate-700"
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Table ── */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
          <div className="inline-flex items-center gap-3 text-slate-400">
            <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-semibold text-slate-600">Loading documentation requests…</span>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5 cursor-pointer select-none hover:text-slate-800" onClick={() => toggleSort("requestId")}>
                  Doc ID <SortIcon col="requestId" />
                </th>
                <th className="px-5 py-3.5 cursor-pointer select-none hover:text-slate-800" onClick={() => toggleSort("customerName")}>
                  Customer & Service <SortIcon col="customerName" />
                </th>
                <th className="px-5 py-3.5">Assigned Clerk</th>
                <th className="px-5 py-3.5 cursor-pointer select-none hover:text-slate-800" onClick={() => toggleSort("createdAt")}>
                  Submitted <SortIcon col="createdAt" />
                </th>
                <th className="px-5 py-3.5">Documents</th>
                <th className="px-5 py-3.5 cursor-pointer select-none hover:text-slate-800" onClick={() => toggleSort("status")}>
                  Status <SortIcon col="status" />
                </th>
                <th className="px-5 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-14 text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-3xl">🔍</span>
                      <span className="text-sm font-medium text-slate-600">No requests found</span>
                      {(search || statusFilter) && (
                        <button
                          onClick={() => { setSearch(""); setStatusFilter(""); }}
                          className="text-xs text-amber-600 hover:underline mt-1 font-semibold"
                        >
                          Clear filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map(req => {
                  const missingCount = req.missingDocuments?.length ?? 0;
                  const fileCount = req.documentFiles?.length ?? 0;
                  return (
                    <tr key={req.requestId} className="hover:bg-amber-50/40 transition-colors group">
                      {/* Doc ID */}
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-slate-900 text-amber-400 border border-slate-800 shadow-2xs">
                          {formatDocId(req.requestId)}
                        </span>
                      </td>

                      {/* Customer & Service */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-400 to-amber-500 text-slate-950 font-extrabold text-xs flex items-center justify-center shadow-xs shrink-0">
                            {req.customerName ? req.customerName[0].toUpperCase() : "C"}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-xs">{req.customerName || "Customer"}</div>
                            <div className="text-[11px] text-slate-500">{req.customerEmail || "—"}</div>
                            <div className="mt-1">
                              <span className="text-[11px] text-slate-700 font-semibold bg-slate-100/90 rounded-md px-2 py-0.5 border border-slate-200/60">
                                {req.serviceName || req.documentType}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Clerk */}
                      <td className="px-5 py-4">
                        {req.assignedClerkId ? (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              {formatClerkId(req.assignedClerkId)}
                            </span>
                            {req.assignedClerkName && (
                              <span className="text-xs font-medium text-slate-700">{req.assignedClerkName}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-medium inline-block">
                            ⏳ Unassigned
                          </span>
                        )}
                      </td>

                      {/* Submitted */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="text-xs font-medium text-slate-800">
                          {req.createdAt
                            ? new Date(req.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                            : "—"}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {req.createdAt
                            ? new Date(req.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })
                            : ""}
                        </div>
                      </td>

                      {/* Documents */}
                      <td className="px-5 py-4">
                        <div className="text-xs font-semibold text-slate-700">{fileCount} uploaded</div>
                        {missingCount > 0 ? (
                          <div className="inline-flex items-center gap-1 mt-1 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-full px-2.5 py-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                            <span>{missingCount} missing</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1 mt-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>Complete</span>
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <StatusBadge status={req.status} />
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <Link
                          to={`/admin/documentation-requests/${req.requestId}`}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-amber-500 hover:text-slate-950 px-3.5 py-1.5 rounded-xl shadow-xs transition-all cursor-pointer"
                        >
                          <span>Review & AI</span>
                          <span>→</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
};
