import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { authApi } from "../../api/authApi";
import { apiClient } from "../../api/apiClient";

// Shared account setup: keeps the existing web login usable after mobile password enforcement.
export function LawyerPasswordPage() {
  const navigate = useNavigate();
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNew] = useState("");
  const [confirmPassword, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  return <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
    <form className="w-full max-w-md bg-white border rounded-xl p-6 space-y-4" onSubmit={async event => {
      event.preventDefault(); setSaving(true); setError("");
      try {
        await apiClient.post("/api/auth/change-password", { currentPassword, newPassword, confirmPassword });
        const user = authApi.getCurrentLawyer();
        if (user) authApi.setCurrentLawyer({ ...user, mustChangePassword: false });
        navigate("/lawyer/dashboard", { replace: true });
      } catch (cause) {
        const data = axios.isAxiosError<{ message?: string; title?: string }>(cause) ? cause.response?.data : undefined;
        setError(data?.message ?? data?.title ?? "Unable to change password. Please try again.");
      } finally { setSaving(false); }
    }}>
      <h1 className="text-xl font-bold">Change Your Initial Password</h1>
      <p>Set a personal password before accessing lawyer services. Use at least 12 characters with letters and numbers.</p>
      {error && <p role="alert" className="text-red-700">{error}</p>}
      <label className="block">Current password<input required autoComplete="current-password" type="password" value={currentPassword} onChange={e => setCurrent(e.target.value)} className="block w-full border rounded p-2" /></label>
      <label className="block">New password<input required minLength={12} maxLength={72} autoComplete="new-password" type="password" value={newPassword} onChange={e => setNew(e.target.value)} className="block w-full border rounded p-2" /></label>
      <label className="block">Confirm new password<input required autoComplete="new-password" type="password" value={confirmPassword} onChange={e => setConfirm(e.target.value)} className="block w-full border rounded p-2" /></label>
      <button disabled={saving} className="w-full rounded bg-slate-900 text-white p-2">{saving ? "Saving…" : "Change Password"}</button>
      <button disabled={saving} type="button" onClick={() => { authApi.logoutAll(); navigate("/login", { replace: true }); }} className="w-full p-2">Sign Out</button>
    </form>
  </main>;
}
