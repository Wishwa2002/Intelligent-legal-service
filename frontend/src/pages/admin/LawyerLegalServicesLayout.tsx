import { useCallback, useEffect, useRef, useState } from "react";
import { CalendarClock, ChevronDown, FileText, Scale, Users } from "lucide-react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { lawyerManagementChangedEvent, lawyersApi, type LawyerServicesSummary } from "../../api/lawyersApi";
import { CoverageOverview } from "../../components/lawyers/CoverageOverview";
import { AdminLayout } from "../../components/layout/AdminLayout";
import { ModuleStatCard } from "../../components/lawyers/ModuleStatCard";

const sections = [
  { label: "Lawyers", path: "lawyers" },
  { label: "Practice Areas", path: "specializations" },
  { label: "Legal Services", path: "legal-services" },
  { label: "Workforce & Hiring", path: "workforce-hiring" },
];

export function OperationalSummary({ summary, loading, error, coverageOpen, onToggle, onRetry }: {
  summary: LawyerServicesSummary | null;
  loading: boolean;
  error: string | null;
  coverageOpen: boolean;
  onToggle: () => void;
  onRetry: () => void;
}) {
  // Coverage already contains backend-filtered counts, each lawyer belongs to one area.
  const availableSlots = summary?.coverage.reduce((total, row) => total + row.futureAvailabilityCount, 0);
  const initialLoading = loading && !summary;
  return <section aria-label="Operational summary" className="mb-4" aria-live="polite">
    <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 xl:grid-cols-4">
      <ModuleStatCard value={summary?.activeLawyers} label="Active Lawyers" icon={Users} loading={initialLoading}
        helperText={summary ? `of ${summary.totalLawyers} total lawyers` : "Summary unavailable"} />
      <ModuleStatCard value={summary?.practiceAreas} label="Practice Areas" icon={Scale} loading={initialLoading}
        helperText="Current legal categories" />
      <ModuleStatCard value={summary?.legalServices} label="Legal Services" icon={FileText} loading={initialLoading}
        helperText="Services across all areas" />
      <ModuleStatCard value={availableSlots} label="Available Appointment Slots" icon={CalendarClock} loading={initialLoading}
        helperText="Future unbooked slots" />
    </div>
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
    {loading && <p role="status" className="text-slate-500">{summary ? "Updating summary..." : "Loading summary..."}</p>}
    {error && <p role="alert" className="text-amber-800">{error} <button type="button" disabled={loading} onClick={onRetry} className="font-semibold underline focus-visible:outline-2 focus-visible:outline-amber-600">Retry</button></p>}
    <button type="button" aria-expanded={coverageOpen} aria-controls="lawyer-coverage-overview"
      onClick={onToggle}
      className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-amber-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600">
      Coverage Overview <ChevronDown size={15} aria-hidden="true" className={coverageOpen ? "rotate-180" : ""} />
    </button>
    </div>
  </section>;
}

export function LawyerLegalServicesLayout() {
  const requestVersion = useRef(0);
  const navRef = useRef<HTMLElement>(null);
  const { pathname } = useLocation();
  const [summary, setSummary] = useState<LawyerServicesSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [coverageOpen, setCoverageOpen] = useState(false);

  useEffect(() => {
    const nav = navRef.current;
    const active = nav?.querySelector('[aria-current="page"]');
    if (!nav || !active) return;
    const bounds = nav.getBoundingClientRect();
    const selected = active.getBoundingClientRect();
    if (selected.right > bounds.right) nav.scrollLeft += selected.right - bounds.right;
    else if (selected.left < bounds.left) nav.scrollLeft -= bounds.left - selected.left;
  }, [pathname]);

  const refreshSummary = useCallback(async () => {
    const version = ++requestVersion.current;
    try {
      setError(null);
      setLoading(true);
      const result = await lawyersApi.getLawyerServicesSummary();
      if (version === requestVersion.current) setSummary(result);
    } catch {
      if (version === requestVersion.current) setError("Summary unavailable. Please try again.");
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const onChanged = () => { void refreshSummary(); };
    void Promise.resolve().then(refreshSummary);
    window.addEventListener(lawyerManagementChangedEvent, onChanged);
    return () => {
      requestVersion.current += 1;
      window.removeEventListener(lawyerManagementChangedEvent, onChanged);
    };
  }, [refreshSummary]);

  return (
    <AdminLayout
      title="Lawyer & Legal Service Management"
      subtitle="Manage practitioners, legal categories, services and workforce coverage"
      showStats={false}
      responsiveNavigation
    >
      <OperationalSummary summary={summary} loading={loading} error={error} coverageOpen={coverageOpen}
        onToggle={() => setCoverageOpen(open => !open)} onRetry={() => void refreshSummary()} />
      <div id="lawyer-coverage-overview" hidden={!coverageOpen}>
        <CoverageOverview rows={summary?.coverage ?? []} loading={loading} error={error} onRetry={() => void refreshSummary()} />
      </div>
      <nav ref={navRef} aria-label="Lawyer and legal service sections" className="mb-5 overflow-x-auto border-b border-slate-200">
        <div className="flex min-w-max gap-5 sm:gap-8">
          {sections.map(({ label, path }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `-mb-px whitespace-nowrap border-b-2 px-1 pb-3 pt-1 text-xs font-bold uppercase text-slate-500 transition-colors focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 ${
                  isActive
                    ? "border-amber-500 text-slate-900"
                    : "border-transparent hover:border-slate-300 hover:text-slate-800"
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
      <Outlet context={summary} />
    </AdminLayout>
  );
}
