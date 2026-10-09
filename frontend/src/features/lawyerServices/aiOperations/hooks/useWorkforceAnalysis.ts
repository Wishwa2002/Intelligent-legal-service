import { useCallback, useEffect, useRef, useState } from "react";
import { workforceApi, type WorkforceReport } from "../services/workforceApi";
export function useWorkforceAnalysis(autoLoad = true) {
  const [report, setReport] = useState<WorkforceReport>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [durationMs, setDurationMs] = useState<number>();
  const version = useRef(0);
  const refresh = useCallback(async () => {
    const current = ++version.current;
    const startedAt = performance.now();
    setLoading(true); setError(""); setDurationMs(undefined);
    try { const data = await workforceApi.analyze(); if (current === version.current) { setReport(data); setDurationMs(performance.now() - startedAt); } }
    catch { if (current === version.current) setError("Unable to load workforce analysis. Please retry."); }
    finally { if (current === version.current) setLoading(false); }
  }, []);
  useEffect(() => { const requests = version; if (autoLoad) void Promise.resolve().then(refresh); return () => { requests.current++; }; }, [refresh, autoLoad]);
  return { report, loading, error, durationMs, refresh };
}
