import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AdminLayout } from "../../../components/layout/AdminLayout";
import { documentationApi, type DocumentationRequest } from "../../../api/documentationApi";
import { clerksApi, type Clerk } from "../../../api/clerksApi";

const formatDocId = (id: string | number) => `DMT${String(id).padStart(3, "0")}`;
const formatClerkId = (id: string | number) => `CRK${String(id).padStart(3, "0")}`;

const STATUS_CONFIG: Record<string, { label: string; bg: string; dot: string }> = {
  PENDING: { label: "Pending", bg: "bg-amber-500/10 text-amber-800 border-amber-300/80", dot: "bg-amber-500 animate-pulse" },
  UNDER_REVIEW: { label: "Under Review", bg: "bg-blue-500/10 text-blue-800 border-blue-300/80", dot: "bg-blue-500 animate-pulse" },
  ASSIGNED: { label: "Assigned", bg: "bg-indigo-500/10 text-indigo-800 border-indigo-300/80", dot: "bg-indigo-500" },
  IN_PROGRESS: { label: "In Progress", bg: "bg-purple-500/10 text-purple-800 border-purple-300/80", dot: "bg-purple-500 animate-pulse" },
  REQUIRES_DOCUMENTS: { label: "Missing Docs", bg: "bg-rose-500/10 text-rose-800 border-rose-300/80", dot: "bg-rose-500 animate-pulse" },
  COMPLETED: { label: "Completed", bg: "bg-emerald-500/10 text-emerald-800 border-emerald-300/80", dot: "bg-emerald-500" },
  REJECTED: { label: "Rejected", bg: "bg-slate-500/10 text-slate-700 border-slate-300/80", dot: "bg-slate-400" },
  CANCELLED: { label: "Cancelled", bg: "bg-slate-500/10 text-slate-700 border-slate-300/80", dot: "bg-slate-400" },
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
  const cfg = STATUS_CONFIG[status] ?? {
    label: status.replace(/_/g, " "),
    bg: "bg-slate-100 text-slate-700 border-slate-200",
    dot: "bg-slate-400",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide border shadow-2xs ${cfg.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      <span>{cfg.label}</span>
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
  const [deleteConfirm, setDeleteConfirm] = useState<DocumentationRequest | null>(null);
  const [deleting, setDeleting] = useState(false);

  const clerkFilter = searchParams.get("clerkId") || "";

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      setDeleting(true);
      await documentationApi.deleteRequest(deleteConfirm.requestId);
      setDeleteConfirm(null);
      await fetchRequests();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || "Failed to delete request");
    } finally {
      setDeleting(false);
    }
  };

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
            <thead className="bg-slate-50/75 border-b border-slate-200/80 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5 cursor-pointer select-none hover:text-slate-800 transition-colors" onClick={() => toggleSort("requestId")}>
                  Doc ID <SortIcon col="requestId" />
                </th>
                <th className="px-5 py-3.5 cursor-pointer select-none hover:text-slate-800 transition-colors" onClick={() => toggleSort("customerName")}>
                  Customer & Service <SortIcon col="customerName" />
                </th>
                <th className="px-5 py-3.5">Assigned Clerk</th>
                <th className="px-5 py-3.5 cursor-pointer select-none hover:text-slate-800 transition-colors" onClick={() => toggleSort("createdAt")}>
                  Submitted <SortIcon col="createdAt" />
                </th>
                <th className="px-5 py-3.5">Documents</th>
                <th className="px-5 py-3.5 cursor-pointer select-none hover:text-slate-800 transition-colors" onClick={() => toggleSort("status")}>
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
                      <span className="text-sm font-semibold text-slate-700">No requests match criteria</span>
                      {(search || statusFilter) && (
                        <button
                          onClick={() => { setSearch(""); setStatusFilter(""); }}
                          className="text-xs text-amber-600 hover:text-amber-800 mt-1 font-bold cursor-pointer"
                        >
                          Clear all filters
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
                    <tr key={req.requestId} className="hover:bg-amber-50/30 transition-colors group">
                      {/* Doc ID */}
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-slate-900 text-amber-400 border border-slate-800 shadow-2xs group-hover:border-amber-500/40 transition-colors">
                          {formatDocId(req.requestId)}
                        </span>
                      </td>

                      {/* Customer & Service */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-400 to-amber-500 text-slate-950 font-extrabold text-xs flex items-center justify-center shadow-xs shrink-0 border border-amber-300">
                            {req.customerName ? req.customerName[0].toUpperCase() : "C"}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-xs">{req.customerName || "Customer"}</div>
                            <div className="text-[11px] text-slate-500">{req.customerEmail || "—"}</div>
                            <div className="mt-1">
                              <span className="text-[10px] font-semibold text-slate-700 bg-slate-100/90 rounded-md px-2 py-0.5 border border-slate-200/60 inline-block">
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
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-50 text-amber-900 border border-amber-200">
                              {formatClerkId(req.assignedClerkId)}
                            </span>
                            {req.assignedClerkName && (
                              <span className="text-xs font-semibold text-slate-800">{req.assignedClerkName}</span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50/80 border border-amber-200/90 px-2.5 py-0.5 rounded-full font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            <span>Unassigned</span>
                          </span>
                        )}
                      </td>

                      {/* Submitted */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="text-xs font-semibold text-slate-800">
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
                          <div className="inline-flex items-center gap-1.5 mt-1 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-full px-2.5 py-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                            <span>{missingCount} missing</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 mt-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5">
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
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            to={`/admin/documentation-requests/${req.requestId}`}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-amber-400 hover:text-slate-950 px-3.5 py-1.5 rounded-xl shadow-xs transition-all duration-200 cursor-pointer"
                          >
                            <span>Review & AI</span>
                            <span>→</span>
                          </Link>
                          <button
                            onClick={() => setDeleteConfirm(req)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 px-2.5 py-1.5 rounded-xl border border-rose-200 hover:border-rose-600 transition-all cursor-pointer shadow-2xs"
                            title="Delete this request"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                            <span className="hidden sm:inline">Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden transform scale-100 transition-all">
            <div className="p-6">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl mb-4 bg-rose-50 text-rose-600 border border-rose-200 shadow-inner">
                🗑️
              </div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">Delete Documentation Request?</h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Are you sure you want to permanently delete <strong className="text-slate-800">Request #{deleteConfirm.requestId}</strong> ({deleteConfirm.customerName || "Customer"} — {deleteConfirm.serviceName || deleteConfirm.documentType})?
              </p>
              <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800">
                ⚠️ <strong>Warning:</strong> All uploaded proof files, agent analysis notes, and re-upload audits associated with this request will be permanently removed.
              </div>
            </div>
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200/80 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={deleting}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 shadow-2xs transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Deleting…</span>
                  </>
                ) : (
                  <span>Yes, Delete Request</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};
