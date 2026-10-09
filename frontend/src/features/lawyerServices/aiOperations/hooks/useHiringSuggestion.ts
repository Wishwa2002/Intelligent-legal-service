import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import { workforceApi, type HiringDraft, type HiringWorkflow } from "../services/workforceApi";
export type HiringAction = "generate" | "save" | "approve" | "dismiss";
function message(error: unknown) {
  if (!axios.isAxiosError(error)) return "The operation failed. Please try again.";
  const title = error.response?.data?.title;
  if (error.response?.status === 409) {
    if (typeof title === "string" && /facts changed|expired/i.test(title)) return "Workforce facts changed or expired. Regenerate the suggestion before approval.";
    return "Recruitment or workflow status changed. Review the current analysis and Careers before continuing.";
  }
  if (error.response?.status === 422) return "The hiring content could not be validated. Review your changes or retry the proposal.";
  if (error.response?.status === 404) return "This hiring workflow is unavailable to your account.";
  return "Hiring assistance is unavailable. Please try again.";
}
export function useHiringSuggestion(onChanged: () => Promise<void>) {
  const [params, setParams] = useSearchParams();
  const id = params.get("hiring");
  const [workflow, setWorkflow] = useState<HiringWorkflow>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [action, setAction] = useState<HiringAction>();
  const [errorAction, setErrorAction] = useState<HiringAction>();
  const [restoreVersion, setRestoreVersion] = useState(0);
  const pending = useRef(false);
  const loaded = useRef<string | null>(null);
  useEffect(() => {
    let active = true;
    if (!id) {
      if (loaded.current) { loaded.current = null; void Promise.resolve().then(() => { if (active) { setWorkflow(undefined); setError(""); } }); }
      return () => { active = false; };
    }
    if (loaded.current === id) return;
    void Promise.resolve().then(async () => {
      if (!active) return;
      setBusy(true); setError(""); setWorkflow(undefined);
      try { const data = await workforceApi.restore(id); if (active) { loaded.current = id; setWorkflow(data); } }
      catch (cause) { if (active) setError(message(cause)); }
      finally { if (active) setBusy(false); }
    });
    return () => { active = false; };
  }, [id, restoreVersion]);
  const execute = async (kind: HiringAction, request: () => Promise<HiringWorkflow>, refresh = false) => {
    if (pending.current || busy) return false;
    pending.current = true; setBusy(true); setAction(kind); setErrorAction(undefined); setError("");
    try {
      const data = await request(); loaded.current = data.workflowId; setWorkflow(data);
      setParams({ hiring: data.workflowId }, { replace: true });
      if (refresh) await onChanged();
      return true;
    } catch (cause) {
      setError(message(cause)); setErrorAction(kind);
      if (axios.isAxiosError(cause) && cause.response?.status === 409) {
        await onChanged();
        if (workflow) try { setWorkflow(await workforceApi.restore(workflow.workflowId)); } catch { /* Preserve the original actionable error. */ }
      }
      return false;
    } finally { pending.current = false; setBusy(false); setAction(undefined); }
  };
  const clear = () => { if (pending.current) return; loaded.current = null; setWorkflow(undefined); setError(""); setErrorAction(undefined); setParams({}, { replace: true }); };
  return { workflow, busy, error, action, errorAction, id, clear,
    retryRestore: () => { loaded.current = null; setRestoreVersion(x => x + 1); },
    generate: (area: number, regenerate = false) => execute("generate", () => workforceApi.generate(area, regenerate ? workflow?.workflowId : undefined)),
    save: (draft: HiringDraft) => workflow ? execute("save", () => workforceApi.saveDraft(workflow.workflowId, draft)) : Promise.resolve(false),
    approve: (draft: HiringDraft, title: string, description: string, reviewed: boolean) => workflow && execute("approve", () => workforceApi.approve(workflow.workflowId, draft, title, description, reviewed), true),
    dismiss: () => workflow && execute("dismiss", () => workforceApi.dismiss(workflow.workflowId), true),
  };
}
