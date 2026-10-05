import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  serviceRequestsApi,
  type ServiceRequest,
  type ServiceRequestStatus,
  STATUS_LABELS,
  STATUS_COLORS,
} from "../../api/serviceRequestsApi";
import { customerAuth } from "./CustomerLoginPage";

const StatusBadge: React.FC<{ status: ServiceRequestStatus }> = ({ status }) => (
  <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_COLORS[status]}`}>
    {STATUS_LABELS[status]}
  </span>
);

const PriorityBadge: React.FC<{ priority?: string | null }> = ({ priority }) => {
  if (!priority) return <span className="text-slate-400 text-xs">—</span>;
  const colors: Record<string, string> = {
    Low: "text-slate-600 bg-slate-100",
    Medium: "text-yellow-700 bg-yellow-50",
    High: "text-orange-700 bg-orange-50",
    Urgent: "text-red-700 bg-red-50",
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded ${colors[priority] ?? "text-slate-600 bg-slate-100"}`}>
      {priority}
    </span>
  );
};

export const MyServiceRequestsPage: React.FC = () => {
  const navigate = useNavigate();
  const user = customerAuth.getUser();

  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ServiceRequestStatus | "ALL">("ALL");

  useEffect(() => {
    if (!customerAuth.isLoggedIn()) {
      navigate("/customer/login", { replace: true });
      return;
    }
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await serviceRequestsApi.getAll({ customerId: user!.userId });
      setRequests(data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to load your requests.");
    } finally {
      setLoading(false);
    }
  };

  const filtered = statusFilter === "ALL"
    ? requests
    : requests.filter(r => r.status === statusFilter);

  const handleLogout = () => {
    customerAuth.logout();
    navigate("/customer/login");
  };

  const allStatuses: (ServiceRequestStatus | "ALL")[] = [
    "ALL",
    "Submitted",
    "InProgress",
    "AwaitingReview",
    "Approved",
    "RevisionRequired",
    "Rejected",
    "Completed",
    "Cancelled",
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800">My Legal Requests</h1>
              <p className="text-xs text-slate-500">Welcome, {user?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/my-requests/new"
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              + New Request
            </Link>
            <button
              onClick={handleLogout}
              className="text-sm text-slate-500 hover:text-slate-800 border border-slate-200 px-3 py-2 rounded-lg transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          {allStatuses.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                statusFilter === s
                  ? "bg-slate-800 text-white border-slate-800"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
              }`}
            >
              {s === "ALL" ? "All" : STATUS_LABELS[s as ServiceRequestStatus]}
              {s !== "ALL" && (
                <span className="ml-1 opacity-60">
                  ({requests.filter(r => r.status === s).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-16 text-slate-500">Loading your requests…</div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-slate-600 font-medium">No requests yet</p>
            <p className="text-slate-400 text-sm mt-1">
              {statusFilter === "ALL" ? "Submit your first legal request to get started." : `No requests with status "${statusFilter}".`}
            </p>
            {statusFilter === "ALL" && (
              <Link
                to="/my-requests/new"
                className="mt-4 inline-block bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
              >
                Create Request
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(r => (
              <Link
                key={r.serviceRequestId}
                to={`/my-requests/${r.serviceRequestId}`}
                className="block bg-white border border-slate-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <StatusBadge status={r.status} />
                      <PriorityBadge priority={r.priority} />
                    </div>
                    <h3 className="font-semibold text-slate-800 truncate">{r.title}</h3>
                    <p className="text-slate-500 text-sm mt-0.5">{r.requestType}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-slate-400">
                      {new Date(r.createdAt).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Updated {new Date(r.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
