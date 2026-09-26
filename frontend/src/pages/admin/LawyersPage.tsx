import React, { useEffect, useState, useMemo } from "react";
import { AdminLayout } from "../../components/layout/AdminLayout";
import {
  lawyersApi,
  type Lawyer,
  type CreateLawyerPayload,
  LAWYER_CATEGORIES,
} from "../../api/lawyersApi";

export const LawyersPage: React.FC = () => {
  const [lawyers, setLawyers] = useState<Lawyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [searchTerm, setSearchTerm] = useState("");

  // Add Lawyer Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateLawyerPayload>({
    name: "",
    email: "",
    phoneNumber: "",
    qualification: "LL.B Attorney-at-Law",
    experience: 5,
    licenseNumber: "",
    profileDescription: "",
    category: LAWYER_CATEGORIES[0],
    password: "LawyerPassword123!",
  });

  // Delete Dialog
  const [deletingLawyer, setDeletingLawyer] = useState<Lawyer | null>(null);
  const [deleteProcessing, setDeleteProcessing] = useState(false);

  const fetchLawyers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await lawyersApi.getLawyers();
      setLawyers(data);
    } catch (err: any) {
      console.error("Failed to load lawyers", err);
      setError(err?.response?.data?.message || "Failed to load lawyer directory.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLawyers();
  }, []);

  const filteredLawyers = useMemo(() => {
    return lawyers.filter((l) => {
      // Category filter
      if (activeCategory !== "All") {
        const matchesCategory = l.specializations.some(
          (s) => s.name.toLowerCase() === activeCategory.toLowerCase()
        );
        if (!matchesCategory) return false;
      }

      // Search term filter
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesName = l.name.toLowerCase().includes(term);
        const matchesEmail = (l.email || "").toLowerCase().includes(term);
        const matchesQual = (l.qualification || "").toLowerCase().includes(term);
        const matchesLicense = (l.licenseNumber || "").toLowerCase().includes(term);
        const matchesSpec = l.specializations.some((s) => s.name.toLowerCase().includes(term));
        if (!matchesName && !matchesEmail && !matchesQual && !matchesLicense && !matchesSpec) {
          return false;
        }
      }

      return true;
    });
  }, [lawyers, activeCategory, searchTerm]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.name.trim()) {
      setFormError("Lawyer full name is required.");
      return;
    }
    if (!formData.email.trim()) {
      setFormError("Valid email address is required.");
      return;
    }
    if (!formData.licenseNumber.trim()) {
      setFormError("Bar admission or license number is required.");
      return;
    }

    try {
      setSubmitting(true);
      await lawyersApi.createLawyer({
        ...formData,
        experience: Number(formData.experience) || 0,
      });

      setIsAddModalOpen(false);
      setFormData({
        name: "",
        email: "",
        phoneNumber: "",
        qualification: "LL.B Attorney-at-Law",
        experience: 5,
        licenseNumber: "",
        profileDescription: "",
        category: LAWYER_CATEGORIES[0],
        password: "LawyerPassword123!",
      });

      await fetchLawyers();
    } catch (err: any) {
      console.error("Create lawyer failed", err);
      setFormError(err?.response?.data?.message || "Failed to create lawyer account.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingLawyer) return;
    try {
      setDeleteProcessing(true);
      await lawyersApi.deleteLawyer(deletingLawyer.lawyerId);
      setDeletingLawyer(null);
      await fetchLawyers();
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to delete lawyer.");
    } finally {
      setDeleteProcessing(false);
    }
  };

  return (
    <AdminLayout
      title="Lawyer Management"
      subtitle="Register, assign legal categories, and manage certified counsel across practice areas"
    >
      {/* Category Pills & Actions Header */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Legal Practice Categories</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Each attorney is designated to exactly one primary legal practice category
            </p>
          </div>
          <button
            onClick={() => {
              setFormError(null);
              setIsAddModalOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-sm rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
            </svg>
            Add New Lawyer
          </button>
        </div>

        {/* Practice Categories Tabs */}
        <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-slate-100">
          <button
            onClick={() => setActiveCategory("All")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeCategory === "All"
                ? "bg-slate-900 text-white shadow"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            All Categories ({lawyers.length})
          </button>
          {LAWYER_CATEGORIES.map((cat) => {
            const count = lawyers.filter((l) =>
              l.specializations.some((s) => s.name.toLowerCase() === cat.toLowerCase())
            ).length;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeCategory === cat
                    ? "bg-amber-500 text-slate-950 shadow"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>

        {/* Search bar */}
        <div className="mt-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search lawyers by name, license number, qualifications..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all"
            />
            <svg
              className="w-4 h-4 text-slate-400 absolute left-3.5 top-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Directory Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-slate-500 mt-3 font-medium">Loading lawyer directory...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center justify-between">
          <div>{error}</div>
          <button
            onClick={fetchLawyers}
            className="px-3 py-1.5 bg-red-600 text-white rounded text-xs font-semibold hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      ) : filteredLawyers.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
          <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 mx-auto flex items-center justify-center text-xl font-bold mb-3">
            ⚖
          </div>
          <h3 className="text-base font-bold text-slate-800">No lawyers found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchTerm
              ? `No lawyers match "${searchTerm}" in category "${activeCategory}".`
              : `There are currently no lawyers assigned to "${activeCategory}".`}
          </p>
          <button
            onClick={() => {
              setFormData((prev) => ({
                ...prev,
                category: activeCategory !== "All" ? activeCategory : LAWYER_CATEGORIES[0],
              }));
              setIsAddModalOpen(true);
            }}
            className="mt-4 px-4 py-2 bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            + Add Lawyer to {activeCategory !== "All" ? activeCategory : "System"}
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-slate-500 font-semibold text-xs border-b border-slate-200 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Counsel Details</th>
                  <th className="py-3.5 px-4">Designated Category</th>
                  <th className="py-3.5 px-4">Experience & Bar #</th>
                  <th className="py-3.5 px-4">Contact Info</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLawyers.map((lawyer) => {
                  const categoryName =
                    lawyer.specializations.length > 0
                      ? lawyer.specializations[0].name
                      : "General Counsel";

                  return (
                    <tr key={lawyer.lawyerId} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-900 text-amber-400 font-bold flex items-center justify-center text-sm flex-shrink-0">
                            {lawyer.name.trim() ? lawyer.name.trim()[0] : "L"}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{lawyer.name}</div>
                            <div className="text-xs text-slate-500">{lawyer.qualification}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                          {categoryName}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-xs font-semibold text-slate-800">
                          {lawyer.experience} yrs experience
                        </div>
                        <div className="text-xs text-slate-500 font-mono mt-0.5">
                          {lawyer.licenseNumber}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-xs text-slate-800 font-medium">{lawyer.email}</div>
                        <div className="text-xs text-slate-500">{lawyer.phoneNumber || "No phone"}</div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setDeletingLawyer(lawyer)}
                          className="px-2.5 py-1 text-xs font-semibold text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors cursor-pointer"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex justify-between items-center">
            <span>Showing {filteredLawyers.length} of {lawyers.length} registered lawyers</span>
            <span className="font-semibold text-slate-700">Practice Area Distribution: 5 Authorized Categories</span>
          </div>
        </div>
      )}

      {/* Add Lawyer Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-slate-900">Add New Legal Counsel</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Assign practitioner to one legal category and create their portal credentials
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Full Name & Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Advocate Nimal Fernando"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Email Address (Login Username) *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="lawyer@legalease.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="+94 77 123 4567"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* LAWYER CATEGORY (STRICT SINGLE SELECTION) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Authorized Practice Category (One Category) *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2.5 border-2 border-amber-300 bg-amber-50/40 rounded-lg text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  {LAWYER_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Lawyer will be listed under this specialization for client searches & consultations.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Qualification
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. LL.B (Hons), Attorney-at-Law"
                    value={formData.qualification}
                    onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Years Exp.
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="70"
                    value={formData.experience}
                    onChange={(e) => setFormData({ ...formData, experience: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Bar / License Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="SC/AT/2020/1234"
                    value={formData.licenseNumber}
                    onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Initial Portal Password
                  </label>
                  <input
                    type="text"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Professional Profile Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Summary of experience, trial history, corporate advisory background..."
                  value={formData.profileDescription}
                  onChange={(e) => setFormData({ ...formData, profileDescription: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 font-semibold text-xs rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                >
                  {submitting ? "Registering..." : "Confirm & Add Lawyer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingLawyer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-slate-900">Remove Legal Counsel</h3>
            <p className="text-xs text-slate-600 mt-2">
              Are you sure you want to remove <strong>{deletingLawyer.name}</strong> from the system?
              Their login and designated category ({deletingLawyer.specializations[0]?.name || "Counsel"}) will be unlinked.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingLawyer(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 font-semibold text-xs rounded-lg hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteProcessing}
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg transition-colors"
              >
                {deleteProcessing ? "Removing..." : "Delete Lawyer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};
