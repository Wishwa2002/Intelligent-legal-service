import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { AdminLayout } from "../../components/layout/AdminLayout";
import { clientsApi, type ClientUser } from "../../api/clientsApi";

export const ClientsPage: React.FC = () => {
  const [clients, setClients] = useState<ClientUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<ClientUser | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionToast, setActionToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const fetchClients = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await clientsApi.getClients();
      setClients(data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to load clients");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const filteredClients = useMemo(() => {
    if (!search.trim()) return clients;
    const q = search.toLowerCase();
    return clients.filter(
      c =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        String(c.userId).includes(q)
    );
  }, [clients, search]);

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      setDeleting(true);
      await clientsApi.deleteClient(deleteConfirm.userId);
      setActionToast({
        type: "success",
        message: `Client '${deleteConfirm.name}' and all associated cases were deleted successfully.`,
      });
      setDeleteConfirm(null);
      await fetchClients();
    } catch (err: any) {
      setActionToast({
        type: "error",
        message: err.response?.data?.message || err.message || "Failed to delete client",
      });
      setDeleteConfirm(null);
    } finally {
      setDeleting(false);
    }
  };

  const totalClients = clients.filter(c => c.role?.toLowerCase() !== "admin").length;
  const totalRequests = clients.reduce((acc, c) => acc + (c.requestCount || 0), 0);
  const activeWithRequests = clients.filter(c => (c.requestCount || 0) > 0).length;

  return (
    <AdminLayout
      title="Client Management"
      subtitle="Monitor registered customer accounts, manage legal filing activities, and oversee client profiles."
    >
      {/* Toast Feedback */}
      {actionToast && (
        <div
          className={`mb-6 p-4 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-sm border transition-all ${
            actionToast.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white bg-current">
              {actionToast.type === "success" ? "✓" : "!"}
            </span>
            <span>{actionToast.message}</span>
          </div>
          <button
            onClick={() => setActionToast(null)}
            className="text-slate-400 hover:text-slate-700 font-bold text-base px-2 cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {/* KPI Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="group relative bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 p-4.5 shadow-xs hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-amber-600" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Registered Customers</span>
            <span className="w-7 h-7 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center text-xs font-bold border border-amber-200/60">
              👥
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono mt-2 tracking-tight">{totalClients}</div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            <span>Verified user accounts</span>
          </div>
        </div>

        <div className="group relative bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 p-4.5 shadow-xs hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-600" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Cases Filed</span>
            <span className="w-7 h-7 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center text-xs font-bold border border-indigo-200/60">
              📄
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono mt-2 tracking-tight">{totalRequests}</div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 inline-block" />
            <span>Documentation requests submitted</span>
          </div>
        </div>

        <div className="group relative bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 p-4.5 shadow-xs hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-teal-500" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Filers</span>
            <span className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center text-xs font-bold border border-emerald-200/60">
              ⚡
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono mt-2 tracking-tight">{activeWithRequests}</div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            <span>Clients with active documentation requests</span>
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search by client name, email, or ID…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate-50 focus:bg-white border border-slate-300/80 rounded-xl pl-10 pr-8 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 shadow-2xs font-medium transition"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs"
            >
              ✕
            </button>
          )}
        </div>

        <button
          onClick={fetchClients}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-300/80 rounded-xl shadow-2xs transition cursor-pointer disabled:opacity-50"
          title="Refresh clients list"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}>
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          <span>Refresh Registry</span>
        </button>
      </div>

      {/* Table Canvas */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <div className="text-xs font-medium text-slate-500">Loading client registry…</div>
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center text-xs text-rose-800 shadow-sm">
          <p className="font-bold mb-2">Unable to load clients</p>
          <p className="text-slate-600 mb-4">{error}</p>
          <button
            onClick={fetchClients}
            className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-xs transition"
          >
            Try Again
          </button>
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <div className="text-3xl mb-2">👥</div>
          <div className="text-sm font-bold text-slate-700">No clients found</div>
          <p className="text-xs text-slate-400 mt-1">Try adjusting your search criteria</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-5 py-3.5">Client Profile</th>
                <th className="px-5 py-3.5">Email Address</th>
                <th className="px-5 py-3.5">Account Role</th>
                <th className="px-5 py-3.5">Filings Count</th>
                <th className="px-5 py-3.5">Registered</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredClients.map(client => {
                const isAdmin = client.role?.toLowerCase() === "admin";
                return (
                  <tr key={client.userId} className="hover:bg-amber-50/30 transition-colors group">
                    {/* Profile */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-slate-900 to-slate-800 text-amber-400 font-extrabold flex items-center justify-center text-xs shadow-xs border border-slate-700/80 shrink-0">
                          {client.name ? client.name[0].toUpperCase() : "U"}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-xs flex items-center gap-2">
                            <span>{client.name || "Client"}</span>
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200/60">
                              #{client.userId}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 font-medium">Customer Account</div>
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="px-5 py-4">
                      <span className="font-mono text-xs text-slate-700 font-semibold">{client.email}</span>
                    </td>

                    {/* Role */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-2xs ${
                          isAdmin
                            ? "bg-amber-50 text-amber-800 border-amber-300"
                            : "bg-blue-50 text-blue-700 border-blue-200"
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isAdmin ? "bg-amber-500" : "bg-blue-500"}`} />
                        <span>{client.role || "Customer"}</span>
                      </span>
                    </td>

                    {/* Requests count */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <Link
                        to={`/admin/documentation-requests?search=${encodeURIComponent(client.name)}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100/80 hover:bg-amber-100/80 hover:border-amber-300 border border-slate-200/80 transition text-xs font-semibold text-slate-700 hover:text-amber-900 shadow-2xs"
                        title="Filter documentation requests for this client"
                      >
                        <span>📄</span>
                        <span className="font-mono font-bold">{client.requestCount || 0}</span>
                        <span>{client.requestCount === 1 ? "Case" : "Cases"}</span>
                      </Link>
                    </td>

                    {/* Registered Date */}
                    <td className="px-5 py-4 whitespace-nowrap text-slate-600 font-medium">
                      {client.createdAt
                        ? new Date(client.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "—"}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/admin/documentation-requests?search=${encodeURIComponent(client.name)}`}
                          className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 hover:text-slate-950 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs transition"
                        >
                          <span>View Cases</span>
                          <span>→</span>
                        </Link>

                        {isAdmin ? (
                          <span className="text-[11px] font-semibold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200">
                            Protected
                          </span>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(client)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 px-2.5 py-1.5 rounded-xl border border-rose-200 hover:border-rose-600 transition-all cursor-pointer shadow-2xs"
                            title="Delete client account"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                            <span>Delete</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
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
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">Delete Client Account?</h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Are you sure you want to delete <strong className="text-slate-800">{deleteConfirm.name}</strong> ({deleteConfirm.email})?
              </p>
              <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800">
                ⚠️ <strong>Warning:</strong> This will permanently delete the client account along with all{" "}
                <strong>{deleteConfirm.requestCount || 0} associated documentation requests</strong> and uploaded legal files. This action cannot be undone.
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
                  <span>Yes, Delete Client</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};
