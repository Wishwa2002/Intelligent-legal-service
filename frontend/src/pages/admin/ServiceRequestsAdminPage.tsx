import React, { useEffect, useState } from "react";
import { AdminLayout } from "../../components/layout/AdminLayout";
import {
  serviceRequestsApi,
  type ServiceRequest,
  type ServiceRequestStatus,
  type ChangeStatusData,
  STATUS_LABELS,
  STATUS_COLORS,
} from "../../api/serviceRequestsApi";
import { authApi } from "../../api/authApi";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const StatusBadge: React.FC<{ status: ServiceRequestStatus }> = ({ status }) => (
  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[status]}`}>
    {STATUS_LABELS[status]}
  </span>
);

// Admin-allowed transitions per status
const ADMIN_TRANSITIONS: Partial<Record<ServiceRequestStatus, ServiceRequestStatus[]>> = {
  Submitted: ["InProgress", "Rejected", "Cancelled"],
  InProgress: ["AwaitingReview", "RevisionRequired", "Cancelled"],
  AwaitingReview: ["Approved", "Rejected", "RevisionRequired"],
  RevisionRequired: ["InProgress", "Cancelled"],
  Approved: ["Completed"],
};

const ALL_STATUSES: ServiceRequestStatus[] = [
  "Submitted", "InProgress", "AwaitingReview", "Approved",
  "Rejected", "RevisionRequired", "Completed", "Cancelled",
];

// ─── Main Component ───────────────────────────────────────────────────────────

export const AdminServiceRequestsPage: React.FC = () => {
  const admin = authApi.getCurrentAdmin();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<ServiceRequestStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");

  // Status change modal
  const [changingId, setChangingId] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState<ServiceRequestStatus>("InProgress");
  const [note, setNote] = useState("");
  const [changing, setChanging] = useState(false);
  const [changeError, setChangeError] = useState<string | null>(null);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await serviceRequestsApi.getAll();
      setRequests(data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to load requests.");
    } finally {
      setLoading(false);
    }
  };

  const filtered = requests.filter(r => {
    const matchesStatus = statusFilter === "ALL" || r.status === statusFilter;
    const matchesSearch = !search.trim() ||
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.requestType.toLowerCase().includes(search.toLowerCase()) ||
      r.customerName.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const openStatusModal = (id: string, current: ServiceRequestStatus) => {
    const opts = ADMIN_TRANSITIONS[current];
    if (!opts || opts.length === 0) return;
    setChangingId(id);
    setNewStatus(opts[0]);
    setNote("");
    setChangeError(null);
  };

  const submitStatusChange = async () => {
    if (!changingId) return;
    try {
      setChanging(true);
      setChangeError(null);
      const data: ChangeStatusData = { status: newStatus, note: note.trim() || undefined };
      await serviceRequestsApi.changeStatus(changingId, data, admin?.userId);
      await fetchAll();
      setChangingId(null);
    } catch (err: any) {
      setChangeError(err.response?.data?.message || err.message || "Failed to update status.");
    } finally {
      setChanging(false);
    }
  };

  const changingRequest = changingId ? requests.find(r => r.serviceRequestId === changingId) : null;
  const availableTransitions = changingRequest ? (ADMIN_TRANSITIONS[changingRequest.status as ServiceRequestStatus] ?? []) : [];

  return (
    <AdminLayout title="Service Requests" subtitle="Manage customer service requests">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {/* Search */}
        <div className="flex-1 min-w-[240px]">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by title, type, or customer…"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as ServiceRequestStatus | "ALL")}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="ALL">All Statuses</option>
          {ALL_STATUSES.map(s => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
        <button
          onClick={fetchAll}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {(["Submitted", "InProgress", "AwaitingReview", "Approved"] as ServiceRequestStatus[]).map(s => (
          <div key={s} className="bg-white border border-slate-200 rounded-xl p-4">
            <p className="text-2xl font-bold text-slate-800">
              {requests.filter(r => r.status === s).length}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">{STATUS_LABELS[s]}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-slate-500">Loading…</div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">{error}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-500">No requests found.</div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Title</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Customer</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Priority</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Submitted</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(r => {
                const canChange = !!(ADMIN_TRANSITIONS[r.status as ServiceRequestStatus]?.length);
                return (
                  <tr key={r.serviceRequestId} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-slate-800 truncate max-w-[200px]" title={r.title}>{r.title}</p>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">{r.customerName}</td>
                    <td className="px-4 py-3.5 text-slate-600">{r.requestType}</td>
                    <td className="px-4 py-3.5">
                      {r.priority ? (
                        <span className="text-xs font-medium text-slate-600">{r.priority}</span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={r.status as ServiceRequestStatus} />
                    </td>
                    <td className="px-4 py-3.5 text-slate-500 text-xs whitespace-nowrap">
                      {new Date(r.createdAt).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3.5">
                      {canChange && (
                        <button
                          onClick={() => openStatusModal(r.serviceRequestId, r.status as ServiceRequestStatus)}
                          className="text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                        >
                          Change Status
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Status Change Modal */}
      {changingId && changingRequest && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-1">Change Request Status</h3>
            <p className="text-sm text-slate-500 mb-5 truncate">"{changingRequest.title}"</p>

            <div className="mb-4">
              <p className="text-xs text-slate-500 mb-2">Current: <StatusBadge status={changingRequest.status as ServiceRequestStatus} /></p>
            </div>

            {changeError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{changeError}</div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">New Status</label>
              <select
                value={newStatus}
                onChange={e => setNewStatus(e.target.value as ServiceRequestStatus)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {availableTransitions.map(s => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Note (optional)</label>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                rows={3}
                placeholder="Add a note about this status change…"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={submitStatusChange}
                disabled={changing}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors"
              >
                {changing ? "Updating…" : "Update Status"}
              </button>
              <button
                onClick={() => setChangingId(null)}
                className="flex-1 border border-slate-200 hover:border-slate-300 text-slate-700 font-semibold py-2.5 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};
