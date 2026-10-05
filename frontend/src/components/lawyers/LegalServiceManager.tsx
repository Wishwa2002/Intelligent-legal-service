import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { Plus, Search, X } from "lucide-react";
import { lawyersApi, type LawyerSpecialization, type LegalServiceCatalogItem, type LegalServiceDetails } from "../../api/lawyersApi";
import { filterLegalServices } from "./legalServiceFilters";

type Props = {
  items: LegalServiceCatalogItem[];
  specializations: LawyerSpecialization[];
  onChanged: () => Promise<void>;
};

function apiError(error: unknown, fallback: string) {
  return axios.isAxiosError(error) ? error.response?.data?.message || fallback : fallback;
}

export function EligiblePractitioners({ details }: { details: LegalServiceDetails }) {
  return <div className="border-t border-slate-200 pt-4">
    <h4 className="font-semibold text-slate-900">Eligible Lawyers <span className="ml-2 text-sm font-normal text-slate-500">{details.eligibleLawyerCount} {details.eligibleLawyerCount === 1 ? "Lawyer" : "Lawyers"}</span></h4>
    <p className="mt-1 text-xs text-slate-500">Lawyers registered under {details.category} are eligible to provide this service.</p>
    {details.eligibleLawyers.length ? <ul className="mt-2 space-y-1 text-sm text-slate-700">{details.eligibleLawyers.map(lawyer => <li key={lawyer.lawyerId}>{lawyer.name}</li>)}</ul> : <p className="mt-2 text-sm text-slate-500">No active lawyers belong to this Practice Area yet.</p>}
  </div>;
}

export function LegalServiceManager({ items, specializations, onChanged }: Props) {
  const [practiceArea, setPracticeArea] = useState("");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<LegalServiceCatalogItem | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [serviceName, setServiceName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [detailsId, setDetailsId] = useState<number | null>(null);
  const [details, setDetails] = useState<LegalServiceDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");
  const [deleting, setDeleting] = useState<LegalServiceCatalogItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const detailRequest = useRef(0);

  const visible = filterLegalServices(items, practiceArea, search);
  const areas = [...specializations].sort((a, b) => a.name.localeCompare(b.name));
  const countForArea = (area: string) => items.filter(item => item.category.toLocaleLowerCase() === area.toLocaleLowerCase()).length;

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
      const result = await lawyersApi.getLegalService(id);
      if (request === detailRequest.current) setDetails(result);
    } catch (cause) {
      if (request === detailRequest.current) setDetailsError(apiError(cause, "Unable to load Legal Service details."));
    } finally {
      if (request === detailRequest.current) setDetailsLoading(false);
    }
  };

  const openForm = (item: LegalServiceCatalogItem | null) => {
    closeDetails();
    setEditing(item);
    setServiceName(item?.serviceName ?? "");
    setCategory(item?.category ?? "");
    setDescription(item?.description ?? "");
    setError("");
    setSuccess("");
    setFormOpen(true);
  };

  const save = async () => {
    if (busy || !serviceName.trim() || !areas.some(area => area.name === category)) return;
    setBusy(true);
    setError("");
    try {
      await lawyersApi.saveLegalService({ serviceName: serviceName.trim(), category, description: description.trim() }, editing?.legalServiceId);
      await onChanged();
      setFormOpen(false);
      setSuccess(editing ? "Legal Service updated." : "Legal Service added.");
    } catch (cause) {
      setError(apiError(cause, "Unable to save Legal Service."));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!deleting || busy) return;
    setBusy(true);
    setError("");
    try {
      await lawyersApi.deleteLegalService(deleting.legalServiceId);
      await onChanged();
      setDeleting(null);
      setSuccess("Legal Service deleted.");
    } catch (cause) {
      setError(apiError(cause, "Unable to delete Legal Service."));
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
        <h2 className="text-xl font-bold text-slate-900">Legal Services</h2>
        <p className="mt-1 text-sm text-slate-500">Manage legal services available under each Practice Area.</p>

      </div>
      <button type="button" disabled={!areas.length} onClick={() => openForm(null)} className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-amber-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 disabled:opacity-50">
        <Plus size={16} aria-hidden="true" />Add Legal Service
      </button>
    </div>
    {success && <p role="status" className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{success}</p>}
    {items.length === 0 ? <div className="rounded-lg border border-slate-200 bg-white px-6 py-12 text-center">
      <h3 className="font-semibold text-slate-900">No Legal Services configured</h3>
      <p className="mt-1 text-sm text-slate-500">Create services under your Practice Areas.</p>
      <button type="button" disabled={!areas.length} onClick={() => openForm(null)} className="mt-4 text-sm font-semibold text-amber-700 underline focus-visible:outline-2 focus-visible:outline-amber-600 disabled:opacity-50">Add Legal Service</button>
    </div> : <>
      <div className="mb-4 overflow-x-auto" aria-label="Filter by Practice Area">
        <div className="flex min-w-max gap-2 pb-1">
          {[{ name: "", label: "All Practice Areas", count: items.length }, ...areas.map(area => ({ name: area.name, label: area.name, count: countForArea(area.name) }))].map(area =>
            <button key={area.name || "all"} type="button" aria-pressed={practiceArea === area.name} onClick={() => setPracticeArea(area.name)}
              className={`whitespace-nowrap rounded-md border px-3 py-1.5 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 ${practiceArea === area.name ? "border-amber-500 bg-amber-50 text-slate-900" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"} ${area.count === 0 ? "opacity-60" : ""}`}>
              {area.label} ({area.count})
            </button>)}
        </div>
      </div>
      <label className="relative mb-4 block max-w-lg">
        <span className="sr-only">Search legal services</span>
        <Search size={17} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search legal services..." className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-3 text-sm text-slate-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200" />
      </label>
      {visible.length === 0 ? <div className="rounded-lg border border-slate-200 bg-white px-6 py-12 text-center">
        <h3 className="font-semibold text-slate-900">No Legal Services match your filters.</h3>
        <p className="mt-1 text-sm text-slate-500">Try changing the search or Practice Area.</p>
      </div> : <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="hidden grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_minmax(0,1fr)_148px] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-bold uppercase text-slate-500 md:grid">
          <span>Service</span><span>Practice Area</span><span>Eligible Lawyers</span><span>Actions</span>
        </div>
        <ul className="divide-y divide-slate-200">
          {visible.map(item => <li key={item.legalServiceId} className="grid gap-3 px-5 py-4 transition-colors hover:bg-slate-50/70 md:grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_minmax(0,1fr)_148px] md:items-center md:gap-4">
            <div className="min-w-0"><h3 className="font-semibold text-slate-900">{item.serviceName}</h3><p className="mt-1 line-clamp-2 text-sm text-slate-500">{item.description || "No description recorded."}</p></div>
            <div><span className="inline-block max-w-full rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{item.category}</span></div>
            <p className={`text-sm font-medium ${item.eligibleLawyerCount === 0 ? "text-slate-400" : "text-slate-700"}`}>{item.eligibleLawyerCount} {item.eligibleLawyerCount === 1 ? "Lawyer" : "Lawyers"}</p>
            <div className="flex items-center gap-1 text-sm font-semibold">
              <button type="button" onClick={() => void openDetails(item.legalServiceId)} className="rounded-md px-2 py-1.5 text-slate-700 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600">View</button>
              <button type="button" onClick={() => openForm(item)} className="rounded-md px-2 py-1.5 text-slate-700 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600">Edit</button>
              <button type="button" onClick={() => { setDeleting(item); setError(""); setSuccess(""); }} className="rounded-md px-2 py-1.5 text-slate-500 hover:bg-red-50 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700">Delete</button>
            </div>
          </li>)}
        </ul>
      </div>}
    </>}
    {detailsId !== null && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4" role="presentation">
      <section role="dialog" aria-modal="true" aria-labelledby="service-details-title" className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-lg bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50 px-6 py-4">
          <h3 id="service-details-title" className="text-lg font-bold text-slate-900">{details?.serviceName ?? "Legal Service Details"}</h3>
          <button type="button" autoFocus aria-label="Close details" onClick={closeDetails} className="rounded p-1 text-slate-500 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-amber-600"><X size={18} /></button>
        </div>
        <div className="space-y-5 px-6 py-5">
          {detailsLoading && <p role="status" className="text-sm text-slate-500">Loading Legal Service details...</p>}
          {detailsError && <p role="alert" className="text-sm text-red-700">{detailsError} <button type="button" onClick={() => void openDetails(detailsId)} className="underline">Retry</button></p>}
          {details && <>
            <div><h4 className="text-xs font-bold uppercase text-slate-500">Practice Area</h4><p className="mt-1 text-sm font-semibold text-slate-800">{details.category}</p></div>
            <div><h4 className="text-xs font-bold uppercase text-slate-500">Description</h4><p className="mt-1 text-sm text-slate-700">{details.description || "No description recorded."}</p></div>
            <EligiblePractitioners details={details} />
            <div className="flex justify-end border-t border-slate-200 pt-4">
              <button type="button" onClick={() => openForm(details)} className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-amber-600 focus-visible:outline-2 focus-visible:outline-amber-600">Edit Legal Service</button>
            </div>
          </>}
        </div>
      </section>
    </div>}
    {formOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4" role="presentation">
      <section role="dialog" aria-modal="true" aria-labelledby="service-form-title" className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <h3 id="service-form-title" className="text-lg font-bold text-slate-900">{editing ? "Edit" : "Add"} Legal Service</h3>
          <button type="button" disabled={busy} aria-label="Close form" onClick={() => setFormOpen(false)} className="rounded p-1 text-slate-500 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-amber-600"><X size={18} /></button>
        </div>
        <form className="space-y-5 px-6 py-5" onSubmit={event => { event.preventDefault(); void save(); }}>
          <label className="block text-sm font-semibold text-slate-700">Service Name <span aria-hidden="true">*</span>
            <input autoFocus required maxLength={200} value={serviceName} onChange={event => setServiceName(event.target.value)} className="mt-2 block w-full rounded-lg border border-slate-300 px-3 py-2 font-normal text-slate-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200" />
          </label>
          <label className="block text-sm font-semibold text-slate-700">Practice Area <span aria-hidden="true">*</span>
            <select required value={category} onChange={event => setCategory(event.target.value)} className="mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal text-slate-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200">
              <option value="" disabled>Select Practice Area</option>
              {areas.map(area => <option key={area.specializationId} value={area.name}>{area.name}</option>)}
            </select>
          </label>
          <label className="block text-sm font-semibold text-slate-700">Description
            <textarea rows={5} maxLength={2000} value={description} onChange={event => setDescription(event.target.value)} placeholder="Describe what this legal service covers" className="mt-2 block w-full resize-y rounded-lg border border-slate-300 px-3 py-2 font-normal text-slate-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200" />
          </label>
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-4">
            <button type="button" disabled={busy} onClick={() => setFormOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-amber-600">Cancel</button>
            <button type="submit" disabled={busy || !serviceName.trim() || !category} className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-amber-600 focus-visible:outline-2 focus-visible:outline-amber-600 disabled:opacity-50">{busy ? "Saving..." : editing ? "Save Changes" : "Add Legal Service"}</button>
          </div>
        </form>
      </section>
    </div>}
    {deleting && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4" role="presentation">
      <section role="dialog" aria-modal="true" aria-labelledby="service-delete-title" className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h3 id="service-delete-title" className="text-lg font-bold text-slate-900">Delete Legal Service?</h3>
        <p className="mt-3 text-sm text-slate-700">You are about to delete <strong>{deleting.serviceName}</strong>.</p>
        {deleting.legacyReferenceCount > 0 ? <p className="mt-3 text-sm text-red-700">This service still has {deleting.legacyReferenceCount} legacy lawyer-service {deleting.legacyReferenceCount === 1 ? "reference" : "references"} and cannot be deleted safely.</p> : <p className="mt-3 text-sm text-slate-500">This action cannot be undone.</p>}
        {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" autoFocus disabled={busy} onClick={() => setDeleting(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-amber-600">Cancel</button>
          <button type="button" disabled={busy || deleting.legacyReferenceCount > 0} onClick={() => void remove()} className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 focus-visible:outline-2 focus-visible:outline-red-700 disabled:cursor-not-allowed disabled:opacity-50">{busy ? "Deleting..." : "Delete"}</button>
        </div>
      </section>
    </div>}
  </section>;
}
