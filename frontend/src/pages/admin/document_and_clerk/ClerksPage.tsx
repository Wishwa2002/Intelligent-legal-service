import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AdminLayout } from "../../../components/layout/AdminLayout";
import { clerksApi, type Clerk, type CreateClerkData } from "../../../api/clerksApi";

// Format numeric clerk ID → CRK001, CRK002, …
const formatClerkId = (id: string | number) =>
  `CRK${String(id).padStart(3, "0")}`;

export const ClerksPage: React.FC = () => {
  const [clerks, setClerks] = useState<Clerk[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add Clerk Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateClerkData>({
    name: "",
    email: "",
    password: "",
    contact: "",
    department: "",
  });
  const [saving, setSaving] = useState(false);

  // Confirmation Modal State for Activate / Deactivate
  const [confirmClerk, setConfirmClerk] = useState<Clerk | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  const fetchClerks = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await clerksApi.getAll();
      setClerks(data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to load clerks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClerks();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      const created = await clerksApi.create(formData);
      setShowAddModal(false);
      setFormData({ name: "", email: "", password: "", contact: "", department: "" });
      setShowPassword(false);
      setSuccessMessage(`Clerk "${created.fullName}" registered successfully with username/email: ${created.email || formData.email}`);
      await fetchClerks();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || "Failed to create clerk");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmToggleStatus = async () => {
    if (!confirmClerk) return;
    try {
      setStatusLoading(true);
      await clerksApi.deactivate(confirmClerk.clerkId);
      const actionName = confirmClerk.isActive ? "deactivated" : "activated";
      setSuccessMessage(`Clerk "${confirmClerk.fullName}" has been ${actionName} successfully.`);
      setConfirmClerk(null);
      await fetchClerks();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || "Failed to update clerk status");
    } finally {
      setStatusLoading(false);
    }
  };

  return (
    <AdminLayout
      title="Clerk Management"
      subtitle="Monitor clerk availability, workload distribution, and documentation task assignments."
    >
      {/* Action Bar */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex space-x-3 text-sm text-slate-600">
          <span className="bg-white px-3 py-1.5 rounded-md border border-slate-200 shadow-sm font-medium">
            Total Clerks: <strong className="text-slate-900">{clerks.length}</strong>
          </span>
          <span className="bg-white px-3 py-1.5 rounded-md border border-slate-200 shadow-sm font-medium">
            Active: <strong className="text-emerald-600">{clerks.filter((c) => c.isActive).length}</strong>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchClerks()}
            disabled={loading}
            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-sm font-medium px-3 py-2 rounded-lg shadow-sm transition-colors flex items-center space-x-1.5 disabled:opacity-50"
            title="Refresh list"
          >
            <span>🔄</span>
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium px-4 py-2 rounded-lg shadow-sm transition-colors flex items-center space-x-2"
          >
            <span>➕</span>
            <span>Register New Clerk</span>
          </button>
        </div>
      </div>

      {/* Success state */}
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl mb-6 text-xs font-semibold flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 bg-emerald-600 text-white rounded-full flex items-center justify-center text-xs">✓</span>
            <span>{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-600 hover:text-emerald-950 text-base font-bold px-2"
          >
            ×
          </button>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl mb-6 text-sm flex items-center justify-between shadow-sm">
          <span>{error}</span>
          <button
            onClick={() => fetchClerks()}
            className="ml-4 px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="text-center py-16 text-slate-400">Loading clerk records...</div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-xs tracking-wider">
              <tr>
                <th className="px-6 py-3">Clerk ID</th>
                <th className="px-6 py-3">Clerk / Username</th>
                <th className="px-6 py-3">Department</th>
                <th className="px-6 py-3">Contact</th>
                <th className="px-6 py-3">Active Tasks</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {clerks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    No clerks found. Click "Register New Clerk" to add one.
                  </td>
                </tr>
              ) : (
                clerks.map((clerk) => (
                  <tr key={clerk.clerkId} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-mono font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        {formatClerkId(clerk.clerkId)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{clerk.fullName || "Unnamed Clerk"}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <span className="text-slate-400">✉</span>
                        <span className="font-mono text-[11px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60">
                          {clerk.email || "No email"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-700">{clerk.department}</td>
                    <td className="px-6 py-4 text-slate-600">{clerk.contact}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        {clerk.activeAssignmentsCount} tasks
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {clerk.isActive ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-500">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <Link
                        to={`/admin/documentation-requests?clerkId=${clerk.clerkId}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-lg transition-colors"
                      >
                        📋 View Cases ({clerk.activeAssignmentsCount})
                      </Link>
                      <button
                        type="button"
                        onClick={() => setConfirmClerk(clerk)}
                        className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition-colors ${
                          clerk.isActive
                            ? "text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border-rose-200"
                            : "text-emerald-600 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border-emerald-200"
                        }`}
                      >
                        {clerk.isActive ? "Deactivate" : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Clerk Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 animate-fade-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Register New Clerk</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Set clerk details and configure login credentials (username & password).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-lg px-2"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3.5">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Clerk Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Priyantha Silva"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Email / Username */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Username / Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. priyantha@lexintelligence.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  💡 This email serves as the username the clerk will use to log into the system.
                </p>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    placeholder="Enter password (minimum 6 characters)"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full text-xs px-3 py-2 pr-16 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  🔒 Provide this password and email to the clerk for accessing their dashboard.
                </p>
              </div>

              {/* Department */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Department <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  list="departments-list"
                  placeholder="e.g. Corporate Registration, Property, Power of Attorney"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <datalist id="departments-list">
                  <option value="Property" />
                  <option value="Corporate" />
                  <option value="Corporate Registration & Documentation" />
                  <option value="Power of Attorney" />
                  <option value="Legal Operations" />
                  <option value="Notarial & Attestation" />
                </datalist>
              </div>

              {/* Contact Phone */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Contact Phone <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. +94 77 123 4567"
                  value={formData.contact}
                  onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow transition-colors disabled:opacity-50"
                >
                  {saving ? "Registering…" : "Register Clerk & Create Credentials"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Confirmation Modal Popup for Activate / Deactivate */}
      {confirmClerk && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 animate-fade-up">
            <div className="flex items-start gap-4 mb-4">
              <div
                className={`p-3 rounded-xl shrink-0 ${
                  confirmClerk.isActive
                    ? "bg-rose-100 text-rose-600"
                    : "bg-emerald-100 text-emerald-600"
                }`}
              >
                {confirmClerk.isActive ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {confirmClerk.isActive ? "Deactivate Clerk Account?" : "Activate Clerk Account?"}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Are you sure you want to {confirmClerk.isActive ? "deactivate" : "activate"}{" "}
                  <strong className="text-slate-800">{confirmClerk.fullName}</strong> ({formatClerkId(confirmClerk.clerkId)})?
                </p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-3.5 text-xs text-slate-600 border border-slate-200 mb-4 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Department:</span>
                <span className="font-semibold text-slate-800">{confirmClerk.department}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Username / Email:</span>
                <span className="font-mono text-slate-800">{confirmClerk.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Current Status:</span>
                <span className={`font-semibold ${confirmClerk.isActive ? "text-emerald-600" : "text-slate-500"}`}>
                  {confirmClerk.isActive ? "Active" : "Inactive"}
                </span>
              </div>
            </div>

            {confirmClerk.isActive && confirmClerk.activeAssignmentsCount > 0 && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-xs text-amber-800 font-medium">
                <span>⚠️</span>
                <span>
                  This clerk currently has <strong>{confirmClerk.activeAssignmentsCount}</strong> active assigned case(s).
                </span>
              </div>
            )}

            <p className="text-xs text-slate-500 mb-5">
              {confirmClerk.isActive
                ? "Deactivating will immediately prevent this clerk from logging into the platform or receiving new case assignments."
                : "Activating will restore login privileges and allow this clerk to be assigned client documentation cases."}
            </p>

            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                disabled={statusLoading}
                onClick={() => setConfirmClerk(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors border border-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={statusLoading}
                onClick={handleConfirmToggleStatus}
                className={`px-4 py-2 text-xs font-semibold text-white rounded-xl shadow-sm transition-colors flex items-center gap-1.5 ${
                  confirmClerk.isActive
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {statusLoading ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>Updating...</span>
                  </>
                ) : (
                  <span>{confirmClerk.isActive ? "Yes, Deactivate" : "Yes, Activate"}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};
