import { useCallback, useEffect, useState } from "react";
import { lawyersApi, type LawyerSpecialization, type LegalServiceCatalogItem } from "../../api/lawyersApi";
import { LegalServiceManager } from "../../components/lawyers/LegalServiceManager";

export function LegalServicesPage() {
  const [items, setItems] = useState<LegalServiceCatalogItem[]>([]);
  const [specializations, setSpecializations] = useState<LawyerSpecialization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      setError("");
      const [services, categories] = await Promise.all([lawyersApi.getAdminLegalServices(), lawyersApi.getSpecializations()]);
      setItems(services);
      setSpecializations(categories);
    } catch {
      setError("Unable to load Legal Services.");
      throw new Error("Unable to load Legal Services.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void Promise.resolve().then(refresh).catch(() => {}); }, [refresh]);

  if (loading) return <div role="status" className="flex min-h-48 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm text-slate-500">Loading Legal Services...</div>;
  if (error) return <div role="alert" className="rounded-lg border border-red-200 bg-white p-6 text-sm text-red-700">{error} <button type="button" onClick={() => void refresh().catch(() => {})} className="ml-2 underline focus-visible:outline-2 focus-visible:outline-red-700">Retry</button></div>;
  return <LegalServiceManager items={items} specializations={specializations} onChanged={refresh} />;
}
