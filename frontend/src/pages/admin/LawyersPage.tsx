import axios from "axios";
import React, { useEffect, useState, useCallback, useRef } from "react";
import { Plus, Search } from "lucide-react";
import { LawyerFormDialog } from "../../components/lawyers/LawyerFormDialog";
import { LawyerIdentity } from "../../components/lawyers/LawyerIdentity";
import { LawyerPagination } from "../../components/lawyers/LawyerPagination";
import {
  lawyersApi,
  type Lawyer,
  type CreateLawyerPayload,
  type LawyerPageFilters,
  type PagedLawyers,
  type LawyerSpecialization,
} from "../../api/lawyersApi";
import { lastLawyerPage, resetLawyerPage } from "../../components/lawyers/lawyerPageUtils";

const errorMessage = (error: unknown, fallback: string) => {
  if (!axios.isAxiosError(error)) return fallback;
  if (error.response?.status === 401) return "Your session is no longer valid. Sign in again before saving.";
  if (error.response?.status === 403) return "An administrator account is required to manage lawyers.";
  if (!error.response) return "Unable to reach the backend. Check your connection and try again.";
  return error.response.data?.message || Object.values(error.response.data?.errors ?? {}).flat().join(" ") || fallback;
};

export const LawyersPage: React.FC = () => {
  const loadVersion = useRef(0);
  const [directory, setDirectory] = useState<PagedLawyers | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [specializations, setSpecializations] = useState<LawyerSpecialization[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const [editingLawyer, setEditingLawyer] = useState<Lawyer | null>(null);
  const [success, setSuccess] = useState("");
  const [filters, setFilters] = useState<LawyerPageFilters>({ page: 1, pageSize: 10 });
  const [searchInput, setSearchInput] = useState("");

  // Add Lawyer Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  // Delete Dialog
  const [deletingLawyer, setDeletingLawyer] = useState<Lawyer | null>(null);
  const [deleteProcessing, setDeleteProcessing] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const refreshCatalog = useCallback(async () => {
    try {
      setSpecializations(await lawyersApi.getSpecializations());
      setCatalogError("");
    } catch {
      setCatalogError("Unable to load practice categories.");
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  const fetchLawyers = useCallback(async () => {
    const version = ++loadVersion.current;
    let movingToLastPage = false;
    try {
      setLoading(true);
      setError(null);
      const data = await lawyersApi.getPagedLawyers(filters);
      if (version !== loadVersion.current) return;
      if (filters.page > lastLawyerPage(data.totalPages)) {
        movingToLastPage = true;
        setFilters(current => ({ ...current, page: lastLawyerPage(data.totalPages) }));
        return;
      }
      setDirectory(data);
    } catch (err: unknown) {
      if (version !== loadVersion.current) return;
      setError(errorMessage(err, "Unable to load lawyers."));
    } finally {
      if (version === loadVersion.current && !movingToLastPage) setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void Promise.resolve().then(fetchLawyers);
  }, [fetchLawyers]);

  useEffect(() => { void Promise.resolve().then(refreshCatalog); }, [refreshCatalog]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const search = searchInput.trim();
      setFilters(current => (current.search ?? "") === search ? current : resetLawyerPage(current, { search: search || undefined }));
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  const changeFilters = (changes: Partial<LawyerPageFilters>) => {
    setFilters(current => resetLawyerPage(current, { ...changes, search: searchInput.trim() || undefined }));
  };

  const openAddModal = () => { setEditingLawyer(null); setIsAddModalOpen(true); };
  const saveLawyer = async (payload: CreateLawyerPayload) => {
    try {
      if (editingLawyer) {
        const { password: _password, ...update } = payload;
        void _password;
        await lawyersApi.updateLawyer(editingLawyer.lawyerId, update);
      } else await lawyersApi.createLawyer(payload);
      setSuccess(editingLawyer ? "Lawyer updated successfully." : "Lawyer created successfully.");
      setIsAddModalOpen(false); setEditingLawyer(null);
      await Promise.all([fetchLawyers(), refreshCatalog()]);
    } catch (cause) { throw new Error(errorMessage(cause, "Failed to save lawyer."), { cause }); }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingLawyer || deleteProcessing) return;
    setDeleteError("");
    try {
      setDeleteProcessing(true);
      await lawyersApi.deleteLawyer(deletingLawyer.lawyerId);
      setDeletingLawyer(null);
      setSuccess("Lawyer deleted successfully.");
      await Promise.all([fetchLawyers(), refreshCatalog()]);
    } catch (err: unknown) {
      setDeleteError(errorMessage(err, "Failed to delete lawyer."));
    } finally {
      setDeleteProcessing(false);
    }
  };

  return (
    <>
      {success && <p role="status" className="mb-4 rounded-lg bg-green-50 p-3 text-green-800">{success}</p>}
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Lawyers</h2>
          <p className="mt-1 text-sm text-slate-500">Manage registered legal practitioners, profiles and availability</p>

        </div>
        <button type="button" onClick={() => openAddModal()} disabled={!specializations.length}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-bold text-slate-950 shadow-sm transition-colors hover:bg-amber-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 disabled:opacity-50">
          <Plus size={16} aria-hidden="true" />Add New Lawyer
        </button>
      </div>

      <section aria-label="Lawyer filters" className="mb-5 rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
        <h3 className="text-sm font-bold text-slate-800">Practice Areas</h3>
        {catalogLoading && <p role="status" className="mt-2 text-xs text-slate-500">Loading Practice Areas...</p>}
        {catalogError && <p role="alert" className="mt-2 text-xs text-red-700">{catalogError} <button type="button" onClick={() => void refreshCatalog()} className="underline">Retry</button></p>}
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" aria-pressed={!filters.specialization} onClick={() => changeFilters({ specialization: undefined })}
            className={`rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 ${!filters.specialization ? "border-amber-500 bg-amber-50 text-slate-900" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>
            All Practice Areas ({error ? "..." : directory?.totalLawyers ?? "..."})
          </button>
          {specializations.map(category => (
            <button key={category.specializationId} type="button" aria-pressed={filters.specialization === String(category.specializationId)}
              onClick={() => changeFilters({ specialization: String(category.specializationId) })}
              className={`rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 ${filters.specialization === String(category.specializationId) ? "border-amber-500 bg-amber-50 text-slate-900" : category.lawyerCount === 0 ? "border-slate-200 bg-white text-slate-500 hover:bg-slate-50" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>
              {category.name} ({category.lawyerCount ?? "..."})
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_auto_auto] xl:items-end">
          <label className="block min-w-0 sm:col-span-2 xl:col-span-1">
            <span className="sr-only">Search lawyers</span>
            <span className="relative block">
              <Search size={17} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="search" value={searchInput} onChange={e => setSearchInput(e.target.value)}
                placeholder="Search lawyers by name, license number, qualifications..."
                className="w-full rounded-md border border-slate-300 bg-slate-50 py-2 pl-10 pr-3 text-sm text-slate-900 focus:border-amber-500 focus:bg-white focus:outline-none" />
            </span>
          </label>
          <label className="flex items-center justify-between gap-3 text-sm font-medium text-slate-600 xl:justify-start">Status
            <select value={filters.status ?? ""} onChange={event => changeFilters({ status: event.target.value || undefined })}
              className="min-w-0 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">
              <option value="">All statuses</option><option>Active</option><option>Inactive</option><option>Pending</option>
            </select>
          </label>
          <label className="flex items-center justify-between gap-3 text-sm font-medium text-slate-600 xl:justify-start">
            Available on
            <input type="date" value={filters.date ?? ""} onChange={e => changeFilters({ date: e.target.value || undefined })}
              className="min-w-0 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-amber-500 focus:outline-none" />
          </label>
        </div>
      </section>

      {directory && !loading && !error && <p role="status" className="mb-3 text-xs font-medium text-slate-600">{directory.totalItems} {directory.totalItems === 1 ? "lawyer" : "lawyers"} found{filters.specialization ? ` in ${specializations.find(area => String(area.specializationId) === filters.specialization)?.name ?? "the selected Practice Area"}` : ""}</p>}
      {error && <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        <span>{error}</span>
        <button type="button" onClick={() => void fetchLawyers()} className="rounded-md border border-red-300 px-3 py-1.5 font-semibold hover:bg-red-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600">Retry</button>
      </div>}
      {loading && !directory ? (
        <div role="status" className="flex min-h-48 items-center justify-center gap-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-500">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" aria-hidden="true" />Loading lawyer directory...
        </div>
      ) : error ? null : directory && directory.items.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white px-6 py-12 text-center">
          {loading ? <p role="status" className="text-sm text-slate-500">Updating lawyer directory...</p> : <>
            <h3 className="text-base font-bold text-slate-800">No lawyers found</h3>
            <p className="mt-1 text-sm text-slate-500">
              {directory.totalLawyers === 0 ? "No lawyers have been registered yet." : "Try changing the search, Practice Area or availability date."}
            </p>
            {directory.totalLawyers === 0 && specializations.length > 0 && <button type="button" onClick={() => openAddModal()} className="mt-4 rounded-md bg-amber-500 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-amber-600">Add New Lawyer</button>}
          </>}
        </div>
      ) : directory ? (
        <div aria-busy={loading} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          {loading && <p role="status" className="border-b border-slate-100 px-4 py-2 text-xs text-slate-500">Updating lawyer directory...</p>}
          <p className="border-b border-slate-100 px-4 py-2 text-xs text-slate-500 md:hidden">Scroll the table horizontally to view contact information and actions.</p>
          <div role="region" aria-label="Lawyer directory table" tabIndex={0} className="overflow-x-auto focus-visible:outline-2 focus-visible:outline-amber-600">
            <table className="w-full min-w-[760px] text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-slate-500 font-semibold text-xs border-b border-slate-200 uppercase tracking-wider">
                <tr>
                  <th scope="col" className="py-3 px-4 align-middle">Counsel Details</th>
                  <th scope="col" className="py-3 px-4 align-middle">Practice Area</th>
                  <th scope="col" className="py-3 px-4 align-middle">Experience & Bar #</th>
                  <th scope="col" className="py-3 px-4 align-middle">Contact Info</th>
                  <th scope="col" className="whitespace-nowrap py-3 px-4 text-right align-middle">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {directory.items.map((lawyer) => {
                  const categoryName =
                    lawyer.specializations.length > 0
                      ? lawyer.specializations[0].name
                      : "General Counsel";

                  return (
                    <tr key={lawyer.lawyerId} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 align-middle">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-900 text-amber-400 font-bold flex items-center justify-center text-sm flex-shrink-0">
                            {lawyer.name.trim() ? lawyer.name.trim()[0] : "L"}
                          </div>
                          <div>
                            <LawyerIdentity lawyer={lawyer} />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 align-middle">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                          {categoryName}
                        </span>
                      </td>
                      <td className="py-3 px-4 align-middle">
                        <div className="text-xs font-semibold text-slate-800">
                          {lawyer.experience} yrs experience
                        </div>
                        <div className="text-xs text-slate-500 font-mono mt-0.5">
                          {lawyer.licenseNumber}
                        </div>
                      </td>
                      <td className="py-3 px-4 align-middle">
                        <div className="break-all text-xs text-slate-800 font-medium">{lawyer.email || "No email"}</div>
                        <div className="text-xs text-slate-500">{lawyer.phoneNumber || "No phone"}</div>
                      </td>
                      <td className="whitespace-nowrap py-3 px-4 text-right align-middle">
                        <button onClick={() => {
                          setEditingLawyer(lawyer);
                          setIsAddModalOpen(true);
                        }} className="rounded px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-amber-600">Edit</button>
                        <button
                          onClick={() => { setDeleteError(""); setDeletingLawyer(lawyer); }}
                          className="rounded px-2.5 py-1 text-xs font-semibold text-slate-500 transition-colors hover:bg-red-50 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-red-600"
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
          <LawyerPagination page={directory.page} pageSize={directory.pageSize} totalItems={directory.totalItems}
            totalPages={directory.totalPages} loading={loading}
            onPageChange={page => setFilters(current => ({ ...current, page }))}
            onPageSizeChange={pageSize => changeFilters({ pageSize })} />
        </div>
      ) : null}

      {isAddModalOpen && <LawyerFormDialog lawyer={editingLawyer} specializations={specializations}
        onClose={() => setIsAddModalOpen(false)} onSave={saveLawyer} />}

      {/* Delete Confirmation Modal */}
      {deletingLawyer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div role="dialog" aria-modal="true" aria-labelledby="lawyer-delete-title" className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-150">
            <h3 id="lawyer-delete-title" className="text-base font-bold text-slate-900">Remove Legal Counsel</h3>
            <p className="text-xs text-slate-600 mt-2">
              Are you sure you want to remove <strong>{deletingLawyer.name}</strong> from the system?
              Their directory profile and Practice Area assignment will be removed. Existing accounts are retained; lawyers with appointment history cannot be deleted.
            </p>
            {deleteError && <p role="alert" className="mt-3 text-sm text-red-700">{deleteError}</p>}
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
    </>
  );
};
