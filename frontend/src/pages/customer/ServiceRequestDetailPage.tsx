import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  serviceRequestsApi,
  type ServiceRequestDetails,
  type ServiceRequestStatus,
  type UpdateServiceRequestData,
  STATUS_LABELS,
  STATUS_COLORS,
  REQUEST_TYPES,
  PRIORITIES,
} from "../../api/serviceRequestsApi";
import { customerAuth } from "./CustomerLoginPage";

const StatusBadge: React.FC<{ status: ServiceRequestStatus }> = ({ status }) => (
  <span className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold ${STATUS_COLORS[status]}`}>
    {STATUS_LABELS[status]}
  </span>
);

export const ServiceRequestDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = customerAuth.getUser();

  const [request, setRequest] = useState<ServiceRequestDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<UpdateServiceRequestData>({ title: "", description: "", requestType: "" });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Cancel state
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!customerAuth.isLoggedIn()) { navigate("/customer/login", { replace: true }); return; }
    if (!id) return;
    loadRequest();
  }, [id]);

  const loadRequest = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await serviceRequestsApi.getById(id!);
      setRequest(data);
      setEditForm({ title: data.title, description: data.description, requestType: data.requestType, priority: data.priority ?? undefined });
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load request.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user || !request) return;
    setSaveError(null);
    if (!editForm.title.trim() || !editForm.description.trim() || !editForm.requestType) {
      setSaveError("Title, description and request type are required.");
      return;
    }
    try {
      setSaving(true);
      const updated = await serviceRequestsApi.update(request.serviceRequestId, user.userId, editForm);
      setRequest(updated);
      setEditing(false);
    } catch (err: any) {
      setSaveError(err.response?.data?.message || err.message || "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    if (!user || !request) return;
    if (!confirm("Are you sure you want to cancel this request? This cannot be undone.")) return;
    try {
      setCancelling(true);
      const updated = await serviceRequestsApi.cancel(request.serviceRequestId, user.userId);
      setRequest(updated);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to cancel request.");
    } finally {
      setCancelling(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">Loading…</div>;
  if (error || !request) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <p className="text-red-600 font-medium">{error || "Request not found."}</p>
        <button onClick={() => navigate("/my-requests")} className="mt-3 text-blue-600 hover:underline text-sm">← Back to My Requests</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/my-requests")} className="text-slate-500 hover:text-slate-800">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-lg font-bold text-slate-800 truncate max-w-xs">{request.title}</h1>
          </div>
          <StatusBadge status={request.status as ServiceRequestStatus} />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {/* Meta card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
            <div>
              <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Request Type</p>
              <p className="font-semibold text-slate-800">{request.requestType}</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Priority</p>
              <p className="font-semibold text-slate-800">{request.priority ?? "—"}</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Submitted</p>
              <p className="font-semibold text-slate-800">{new Date(request.createdAt).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Last Updated</p>
              <p className="font-semibold text-slate-800">{new Date(request.updatedAt).toLocaleString()}</p>
            </div>
          </div>

          {/* Description */}
          {!editing ? (
            <div>
              <p className="text-slate-500 text-xs uppercase tracking-wide mb-2">Description</p>
              <p className="text-slate-700 text-sm whitespace-pre-wrap leading-relaxed">{request.description}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {saveError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{saveError}</div>
              )}
              <div>
                <label className="text-xs uppercase tracking-wide text-slate-500 mb-1 block font-medium">Title</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wide text-slate-500 mb-1 block font-medium">Request Type</label>
                <select
                  value={editForm.requestType}
                  onChange={e => setEditForm(p => ({ ...p, requestType: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {REQUEST_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs uppercase tracking-wide text-slate-500 mb-1 block font-medium">Priority</label>
                <div className="flex gap-2">
                  {[null, ...PRIORITIES].map(p => (
                    <button
                      key={p ?? "none"}
                      type="button"
                      onClick={() => setEditForm(prev => ({ ...prev, priority: p ?? undefined }))}
                      className={`px-3 py-1.5 text-xs rounded-lg border font-medium transition-colors ${
                        (editForm.priority ?? null) === p
                          ? "bg-slate-800 text-white border-slate-800"
                          : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                      }`}
                    >
                      {p ?? "None"}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs uppercase tracking-wide text-slate-500 mb-1 block font-medium">Description</label>
                <textarea
                  value={editForm.description}
                  onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))}
                  rows={5}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Action buttons */}
        {!editing && (request.isEditable || request.isCancellable) && (
          <div className="flex gap-3">
            {request.isEditable && (
              <button
                onClick={() => setEditing(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
              >
                Edit Request
              </button>
            )}
            {request.isCancellable && (
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="bg-white hover:bg-red-50 text-red-600 border border-red-200 hover:border-red-400 text-sm font-semibold px-5 py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                {cancelling ? "Cancelling…" : "Cancel Request"}
              </button>
            )}
          </div>
        )}

        {editing && (
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>
            <button
              onClick={() => { setEditing(false); setSaveError(null); }}
              className="text-slate-600 border border-slate-200 hover:border-slate-300 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </main>
    </div>
  );
};
