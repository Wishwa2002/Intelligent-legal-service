import { useCallback, useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { lawyersApi, type LawyerSpecialization, type LawyerServicesSummary } from "../../api/lawyersApi";
import { SpecializationManager } from "../../components/lawyers/SpecializationManager";

export function SpecializationsPage() {
  const summary = useOutletContext<LawyerServicesSummary | null>();
  const [items, setItems] = useState<LawyerSpecialization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      setError("");
      setItems(await lawyersApi.getSpecializations());
    } catch {
      setError("Unable to load Practice Areas.");
      throw new Error("Unable to load Practice Areas.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void Promise.resolve().then(refresh).catch(() => {}); }, [refresh]);

  if (loading) return <div role="status" className="flex min-h-48 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm text-slate-500">Loading Practice Areas...</div>;
  if (error) return <div role="alert" className="rounded-lg border border-red-200 bg-white p-6 text-sm text-red-700">{error} <button type="button" onClick={() => void refresh().catch(() => {})} className="ml-2 underline focus-visible:outline-2 focus-visible:outline-red-700">Retry</button></div>;
  return <SpecializationManager items={items} onChanged={refresh} coverage={summary?.coverage} />;
}
