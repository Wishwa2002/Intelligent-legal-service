import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { Plus, X } from "lucide-react";
import { lawyersApi, type LawyerSpecialization, type SpecializationDetails, type LawyerServicesSummary } from "../../api/lawyersApi";

type Props = { items: LawyerSpecialization[]; onChanged: () => Promise<void>; coverage?: LawyerServicesSummary["coverage"] };

function apiError(error: unknown, fallback: string) {
  return axios.isAxiosError(error) ? error.response?.data?.message || fallback : fallback;
}

export function SpecializationManager({ items, onChanged, coverage }: Props) {
  const [editing, setEditing] = useState<LawyerSpecialization | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [detailsId, setDetailsId] = useState<number | null>(null);
  const [details, setDetails] = useState<SpecializationDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");
  const [deleting, setDeleting] = useState<LawyerSpecialization | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const detailRequest = useRef(0);
  const sortedItems = [...items].sort((a, b) => a.name.localeCompare(b.name));

  const closeDetails = () => {
    detailRequest.current += 1;
    setDetailsId(null);
    setDetails(null);
  };

  const openDetails = async (id: number) => {
    const request = ++detailRequest.current;
    setDetailsId(id);
    setDetails(null);
    setDetailsError("");
    setDetailsLoading(true);
    try {
      const result = await lawyersApi.getSpecialization(id);
      if (request === detailRequest.current) setDetails(result);
    } catch (cause) {
      if (request === detailRequest.current) setDetailsError(apiError(cause, "Unable to load Practice Area details."));
    } finally {
      if (request === detailRequest.current) setDetailsLoading(false);
    }
  };

  const openForm = (item: LawyerSpecialization | null) => {
    closeDetails();
    setEditing(item);
    setName(item?.name ?? "");
    setDescription(item?.description ?? "");
    setError("");
    setSuccess("");
    setFormOpen(true);
  };

  const save = async () => {
    if (busy || !name.trim()) return;
    setBusy(true);
    setError("");
    try {
      await lawyersApi.saveSpecialization({ name: name.trim(), description: description.trim() }, editing?.specializationId);
      await onChanged();
      setFormOpen(false);
      setSuccess(editing ? "Practice Area updated." : "Practice Area added.");
    } catch (cause) {
      setError(apiError(cause, "Unable to save Practice Area."));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!deleting || busy) return;
    setBusy(true);
    setError("");
    try {
      await lawyersApi.deleteSpecialization(deleting.specializationId);
      await onChanged();
      setDeleting(null);
      setSuccess("Practice Area deleted.");
    } catch (cause) {
      setError(apiError(cause, "Unable to delete Practice Area."));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!formOpen && detailsId === null && !deleting) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || busy) return;
      setFormOpen(false);
      setDeleting(null);
      closeDetails();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [formOpen, detailsId, deleting, busy]);

  return <section className="mb-6 min-w-0">
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Practice Areas</h2>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">Manage the legal practice areas used to classify lawyers, legal services and AI recommendations.</p>
      </div>
      <button type="button" onClick={() => openForm(null)} className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-amber-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600">
        <Plus size={16} aria-hidden="true" />Add Practice Area
      </button>
    </div>
    {success && <p role="status" className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{success}</p>}
    {items.length === 0 ? <div className="rounded-lg border border-slate-200 bg-white px-6 py-12 text-center">
      <h3 className="font-semibold text-slate-900">No Practice Areas configured</h3>
      <p className="mt-1 text-sm text-slate-500">Create a Practice Area before registering lawyers or configuring legal services.</p>
      <button type="button" onClick={() => openForm(null)} className="mt-4 text-sm font-semibold text-amber-700 underline focus-visible:outline-2 focus-visible:outline-amber-600">Add Practice Area</button>
    </div> : <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white shadow-sm">
      {sortedItems.map(item => <li key={item.specializationId} className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-slate-50/70 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-slate-900">{item.name}</h3>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">{item.description || "No description recorded."}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium text-slate-600">
            <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1">{item.lawyerCount === undefined ? "Lawyer usage unavailable" : `${item.lawyerCount} ${item.lawyerCount === 1 ? "Lawyer" : "Lawyers"}`}</span>
            {item.activeLawyerCount !== undefined && <span className="rounded-md border border-slate-200 px-2 py-1">{item.activeLawyerCount} Active</span>}
            {coverage?.some(row => row.practiceAreaId === item.specializationId) && <span className="rounded-md border border-slate-200 px-2 py-1">{coverage.find(row => row.practiceAreaId === item.specializationId)?.futureAvailabilityCount} Available Appointment Slots</span>}
            {item.legalServiceCount !== undefined && <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1">{item.legalServiceCount} Legal {item.legalServiceCount === 1 ? "Service" : "Services"}</span>}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1 text-sm font-semibold">
          <button type="button" onClick={() => void openDetails(item.specializationId)} className="rounded-md px-2 py-1.5 text-slate-700 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600">View</button>
          <button type="button" onClick={() => openForm(item)} className="rounded-md px-2 py-1.5 text-slate-700 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600">Edit</button>
          <button type="button" onClick={() => { setDeleting(item); setError(""); setSuccess(""); }} className="rounded-md px-2 py-1.5 text-slate-500 hover:bg-red-50 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700">Delete</button>
        </div>
      </li>)}
    </ul>}
    {detailsId !== null && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4" role="presentation">
      <section role="dialog" aria-modal="true" aria-labelledby="practice-area-details-title" className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-lg bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50 px-6 py-4">
          <h3 id="practice-area-details-title" className="text-lg font-bold text-slate-900">{details?.name ?? "Practice Area Details"}</h3>
          <button type="button" autoFocus aria-label="Close details" onClick={closeDetails} className="rounded p-1 text-slate-500 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-amber-600"><X size={18} /></button>
        </div>
        <div className="space-y-6 px-6 py-5">
          {detailsLoading && <p role="status" className="text-sm text-slate-500">Loading Practice Area details...</p>}
          {detailsError && <div role="alert" className="text-sm text-red-700">{detailsError} <button type="button" onClick={() => void openDetails(detailsId)} className="underline">Retry</button></div>}
          {details && <>
            <div><h4 className="text-xs font-bold uppercase text-slate-500">Description</h4><p className="mt-2 text-sm text-slate-700">{details.description || "No description recorded."}</p></div>
            <div className="border-t border-slate-200 pt-4"><h4 className="font-semibold text-slate-900">Registered Lawyers <span className="ml-2 text-sm font-normal text-slate-500">{details.lawyerCount}</span></h4>
              {details.lawyers.length ? <ul className="mt-2 space-y-1 text-sm text-slate-700">{details.lawyers.map(lawyer => <li key={lawyer.lawyerId}>{lawyer.name}</li>)}</ul> : <p className="mt-2 text-sm text-slate-500">No lawyers registered under this Practice Area.</p>}
            </div>
            <div className="border-t border-slate-200 pt-4"><h4 className="font-semibold text-slate-900">Legal Services <span className="ml-2 text-sm font-normal text-slate-500">{details.legalServiceCount}</span></h4>
              {details.legalServices.length ? <ul className="mt-2 space-y-1 text-sm text-slate-700">{details.legalServices.map(service => <li key={service.legalServiceId}>{service.serviceName}</li>)}</ul> : <p className="mt-2 text-sm text-slate-500">No legal services currently use this practice area.</p>}
            </div>
            <div className="flex justify-end border-t border-slate-200 pt-4"><button type="button" onClick={() => openForm(details)} className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-amber-600 focus-visible:outline-2 focus-visible:outline-amber-600">Edit Practice Area</button></div>
          </>}
        </div>
      </section>
    </div>}
    {formOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4" role="presentation">
      <section role="dialog" aria-modal="true" aria-labelledby="practice-area-form-title" className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <h3 id="practice-area-form-title" className="text-lg font-bold text-slate-900">{editing ? "Edit" : "Add"} Practice Area</h3>
          <button type="button" disabled={busy} aria-label="Close form" onClick={() => setFormOpen(false)} className="rounded p-1 text-slate-500 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-amber-600"><X size={18} /></button>
        </div>
        <form className="space-y-5 px-6 py-5" onSubmit={event => { event.preventDefault(); void save(); }}>
          <label className="block text-sm font-semibold text-slate-700">Practice Area Name <span aria-hidden="true">*</span>
            <input autoFocus required maxLength={200} value={name} onChange={event => setName(event.target.value)} className="mt-2 block w-full rounded-lg border border-slate-300 px-3 py-2 font-normal text-slate-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200" />
          </label>
          <label className="block text-sm font-semibold text-slate-700">Description
            <textarea rows={5} maxLength={2000} value={description} onChange={event => setDescription(event.target.value)} placeholder="Describe the legal matters covered by this practice area" className="mt-2 block w-full resize-y rounded-lg border border-slate-300 px-3 py-2 font-normal text-slate-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200" />
          </label>
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-4">
            <button type="button" disabled={busy} onClick={() => setFormOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-amber-600">Cancel</button>
            <button type="submit" disabled={busy || !name.trim()} className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-amber-600 focus-visible:outline-2 focus-visible:outline-amber-600 disabled:opacity-50">{busy ? "Saving..." : editing ? "Save Changes" : "Add Practice Area"}</button>
          </div>
        </form>
      </section>
    </div>}
    {deleting && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4" role="presentation">
      <section role="dialog" aria-modal="true" aria-labelledby="practice-area-delete-title" className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h3 id="practice-area-delete-title" className="text-lg font-bold text-slate-900">Delete Practice Area?</h3>
        <p className="mt-3 text-sm text-slate-700">You are about to delete <strong>{deleting.name}</strong>.</p>
        {(deleting.lawyerCount ?? 0) > 0 || (deleting.legalServiceCount ?? 0) > 0 ? <p className="mt-3 text-sm text-red-700">This Practice Area is used by {deleting.lawyerCount ?? 0} lawyers and {deleting.legalServiceCount ?? 0} legal services. Reassign or remove those relationships before deleting it.</p> : <p className="mt-3 text-sm text-slate-500">This action cannot be undone.</p>}
        {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" autoFocus disabled={busy} onClick={() => setDeleting(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-amber-600">Cancel</button>
          <button type="button" disabled={busy || (deleting.lawyerCount ?? 0) > 0 || (deleting.legalServiceCount ?? 0) > 0} onClick={() => void remove()} className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 focus-visible:outline-2 focus-visible:outline-red-700 disabled:cursor-not-allowed disabled:opacity-50">{busy ? "Deleting..." : "Delete"}</button>
        </div>
      </section>
    </div>}
  </section>;
}
