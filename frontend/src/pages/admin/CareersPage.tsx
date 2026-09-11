import React, { useEffect, useState } from "react";
import { AdminLayout } from "../../components/layout/AdminLayout";
import { careersApi, type Career, type JobApplication } from "../../api/careersApi";

export const CareersPage: React.FC = () => {
  const [careers, setCareers] = useState<Career[]>([]);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [selectedCareerId, setSelectedCareerId] = useState<string | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modal / Form state for Career
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCareer, setEditingCareer] = useState<Career | null>(null);
  const [formJobTitle, setFormJobTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Tab State: 'careers' or 'applications'
  const [activeTab, setActiveTab] = useState<"careers" | "applications">("careers");

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [careersData, appsData] = await Promise.all([
        careersApi.getCareers(),
        careersApi.getApplications(),
      ]);
      setCareers(careersData);
      setApplications(appsData);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to load data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateModal = () => {
    setEditingCareer(null);
    setFormJobTitle("");
    setFormDescription("");
    setIsModalOpen(true);
  };

  const openEditModal = (career: Career) => {
    setEditingCareer(career);
    setFormJobTitle(career.jobTitle);
    setFormDescription(career.description);
    setIsModalOpen(true);
  };

  const handleSaveCareer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formJobTitle.trim() || !formDescription.trim()) return;

    try {
      setSubmitting(true);
      if (editingCareer) {
        await careersApi.updateCareer(editingCareer.careerId, {
          jobTitle: formJobTitle.trim(),
          description: formDescription.trim(),
        });
      } else {
        await careersApi.createCareer({
          jobTitle: formJobTitle.trim(),
          description: formDescription.trim(),
        });
      }
      setIsModalOpen(false);
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to save career opening.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCareer = async (careerId: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) return;

    try {
      await careersApi.deleteCareer(careerId);
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to delete career opening.");
    }
  };

  const handleStatusChange = async (appId: string, newStatus: string) => {
    try {
      await careersApi.updateApplicationStatus(appId, newStatus);
      setApplications((prev) =>
        prev.map((app) => (app.applicationId === appId ? { ...app, status: newStatus } : app))
      );
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to update status.");
    }
  };

  const filteredApplications = applications.filter((app) => {
    const matchCareer = selectedCareerId === "ALL" || app.careerId === selectedCareerId;
    const matchStatus = statusFilter === "ALL" || app.status.toLowerCase() === statusFilter.toLowerCase();
    return matchCareer && matchStatus;
  });

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s === "hired") return "bg-emerald-100 text-emerald-800 border-emerald-300";
    if (s === "shortlisted") return "bg-blue-100 text-blue-800 border-blue-300";
    if (s === "rejected") return "bg-rose-100 text-rose-800 border-rose-300";
    return "bg-amber-100 text-amber-800 border-amber-300"; // UnderReview or default
  };

  return (
    <AdminLayout
      title="Careers & Job Applications"
      subtitle="Manage law firm job openings, clerk vacancies, and candidate applications"
    >
      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 mb-6">
        <div className="flex space-x-6">
          <button
            onClick={() => setActiveTab("careers")}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "careers"
                ? "border-amber-600 text-amber-700 font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            💼 Career Openings ({careers.length})
          </button>
          <button
            onClick={() => setActiveTab("applications")}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "applications"
                ? "border-amber-600 text-amber-700 font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            📝 Job Applications ({applications.length})
          </button>
        </div>

        {activeTab === "careers" && (
          <button
            onClick={openCreateModal}
            className="mb-2 inline-flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium px-4 py-2 rounded-lg shadow-sm transition-colors"
          >
            <span>+</span>
            <span>Post New Opening</span>
          </button>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
          <span className="ml-3 text-slate-500 text-sm">Loading career data...</span>
        </div>
      ) : activeTab === "careers" ? (
        /* Careers List */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {careers.length === 0 ? (
            <div className="col-span-full text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
              <p className="text-slate-500">No career openings available.</p>
              <button
                onClick={openCreateModal}
                className="mt-3 text-amber-600 hover:text-amber-700 text-sm font-medium"
              >
                Create your first opening →
              </button>
            </div>
          ) : (
            careers.map((career) => (
              <div
                key={career.careerId}
                className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between hover:shadow-md transition-shadow"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <h3 className="text-lg font-serif font-semibold text-slate-900">
                      {career.jobTitle}
                    </h3>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                      {career.applicationsCount} applicants
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-slate-600 line-clamp-4 whitespace-pre-line">
                    {career.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-sm">
                  <button
                    onClick={() => {
                      setSelectedCareerId(career.careerId);
                      setActiveTab("applications");
                    }}
                    className="text-amber-600 hover:text-amber-700 font-medium"
                  >
                    View Applicants →
                  </button>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => openEditModal(career)}
                      className="text-slate-500 hover:text-slate-800"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteCareer(career.careerId, career.jobTitle)}
                      className="text-rose-500 hover:text-rose-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* Applications List */
        <div>
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6 bg-white p-4 rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Filter by Opening
              </label>
              <select
                value={selectedCareerId}
                onChange={(e) => setSelectedCareerId(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="ALL">All Openings ({applications.length})</option>
                {careers.map((c) => (
                  <option key={c.careerId} value={c.careerId}>
                    {c.jobTitle}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Filter by Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="UnderReview">Under Review</option>
                <option value="Shortlisted">Shortlisted</option>
                <option value="Rejected">Rejected</option>
                <option value="Hired">Hired</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Applicant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Applied For
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Applied Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {filteredApplications.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-slate-400 text-sm">
                      No applications found matching the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredApplications.map((app) => (
                    <tr key={app.applicationId} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-slate-900">
                          {app.applicantName}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {app.jobTitle}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {new Date(app.appliedAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(
                            app.status
                          )}`}
                        >
                          {app.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <select
                          value={app.status}
                          onChange={(e) => handleStatusChange(app.applicationId, e.target.value)}
                          className="border border-slate-300 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-amber-500 bg-white text-slate-700"
                        >
                          <option value="UnderReview">Under Review</option>
                          <option value="Shortlisted">Shortlisted</option>
                          <option value="Hired">Hired</option>
                          <option value="Rejected">Rejected</option>
                        </select>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal for Creating / Editing Career Opening */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <h2 className="text-xl font-serif font-bold text-slate-900 mb-4">
              {editingCareer ? "Edit Career Opening" : "Create Career Opening"}
            </h2>
            <form onSubmit={handleSaveCareer}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">Job Title</label>
                <input
                  type="text"
                  required
                  value={formJobTitle}
                  onChange={(e) => setFormJobTitle(e.target.value)}
                  placeholder="e.g., Senior Legal Documentation Clerk"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Job Description & Requirements
                </label>
                <textarea
                  required
                  rows={5}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Provide responsibilities, requirements, and qualifications..."
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium shadow-sm transition-colors disabled:opacity-50"
                >
                  {submitting ? "Saving..." : editingCareer ? "Update Opening" : "Create Opening"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};
