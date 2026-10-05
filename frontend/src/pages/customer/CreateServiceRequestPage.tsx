import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  serviceRequestsApi,
  type CreateServiceRequestData,
  REQUEST_TYPES,
  PRIORITIES,
} from "../../api/serviceRequestsApi";
import { customerAuth } from "./CustomerLoginPage";

export const CreateServiceRequestPage: React.FC = () => {
  const navigate = useNavigate();
  const user = customerAuth.getUser();

  const [form, setForm] = useState<CreateServiceRequestData>({
    title: "",
    description: "",
    requestType: "",
    priority: null,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof CreateServiceRequestData, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const validate = (): boolean => {
    const errs: typeof errors = {};
    if (!form.title.trim()) errs.title = "Title is required.";
    else if (form.title.trim().length > 200) errs.title = "Title cannot exceed 200 characters.";
    if (!form.description.trim()) errs.description = "Description is required.";
    else if (form.description.trim().length > 2000) errs.description = "Description cannot exceed 2000 characters.";
    if (!form.requestType) errs.requestType = "Please select a request type.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    if (!validate()) return;
    if (!user) { navigate("/customer/login"); return; }

    try {
      setSubmitting(true);
      const result = await serviceRequestsApi.create(user.userId, form);
      navigate(`/my-requests/${result.serviceRequestId}`, { replace: true });
    } catch (err: any) {
      setServerError(err.response?.data?.message || err.message || "Failed to submit request.");
    } finally {
      setSubmitting(false);
    }
  };

  const field = (key: keyof CreateServiceRequestData) => ({
    value: form[key] as string ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value || null })),
  });

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-slate-500 hover:text-slate-800 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-800">New Service Request</h1>
            <p className="text-xs text-slate-500">Describe your legal need</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <div className="bg-white border border-slate-200 rounded-2xl p-8">
          {serverError && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...field("title")}
                maxLength={200}
                placeholder="e.g. Review my lease agreement"
                className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.title ? "border-red-400 bg-red-50" : "border-slate-300"
                }`}
              />
              {errors.title && <p className="text-red-600 text-xs mt-1">{errors.title}</p>}
              <p className="text-xs text-slate-400 mt-1">{form.title.length}/200 characters</p>
            </div>

            {/* Request Type */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Request Type <span className="text-red-500">*</span>
              </label>
              <select
                value={form.requestType}
                onChange={e => setForm(prev => ({ ...prev, requestType: e.target.value }))}
                className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white ${
                  errors.requestType ? "border-red-400 bg-red-50" : "border-slate-300"
                }`}
              >
                <option value="">Select a type…</option>
                {REQUEST_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              {errors.requestType && <p className="text-red-600 text-xs mt-1">{errors.requestType}</p>}
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Priority</label>
              <div className="flex gap-2 flex-wrap">
                {[null, ...PRIORITIES].map(p => (
                  <button
                    key={p ?? "none"}
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, priority: p }))}
                    className={`px-4 py-2 text-sm rounded-lg border font-medium transition-colors ${
                      form.priority === p
                        ? "bg-slate-800 text-white border-slate-800"
                        : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                    }`}
                  >
                    {p ?? "None"}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                {...field("description")}
                rows={6}
                maxLength={2000}
                placeholder="Please provide as much detail as possible about your legal matter…"
                className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
                  errors.description ? "border-red-400 bg-red-50" : "border-slate-300"
                }`}
              />
              {errors.description && <p className="text-red-600 text-xs mt-1">{errors.description}</p>}
              <p className="text-xs text-slate-400 mt-1">{form.description.length}/2000 characters</p>
            </div>

            {/* Submit */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors"
              >
                {submitting ? "Submitting…" : "Submit Request"}
              </button>
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="text-slate-600 hover:text-slate-800 px-4 py-2.5 rounded-lg border border-slate-200 hover:border-slate-300 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};
