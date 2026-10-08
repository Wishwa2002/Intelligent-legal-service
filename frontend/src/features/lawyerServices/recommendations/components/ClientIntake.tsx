import { useEffect, useState } from 'react';
import axios from 'axios';
import { clientIntakeApi, type ClientSummary } from '../../../../api/clientsApi';
import { field, primaryButton, secondaryButton, surface, type RecommendationWorkflowModel } from './recommendationUI';
function clientError(cause: unknown, fallback: string) {
  if (!axios.isAxiosError(cause)) return fallback;
  const data = cause.response?.data;
  const errors = Object.values(data?.errors ?? {}).flat().join(' ');
  return errors || (cause.response?.status === 400 || cause.response?.status === 409 ? data?.message || data?.title : undefined) || fallback;
}
export function ClientIntake({ workflow: w }: { workflow: RecommendationWorkflowModel }) {
  const [changing, setChanging] = useState(false); const [registering, setRegistering] = useState(false);
  const [search, setSearch] = useState(''); const [clients, setClients] = useState<ClientSummary[]>([]);
  const [loading, setLoading] = useState(false); const [saving, setSaving] = useState(false);
  const [error, setError] = useState(''); const [version, setVersion] = useState(0);
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [duplicate, setDuplicate] = useState<ClientSummary>(); const [candidate, setCandidate] = useState<ClientSummary>();
  const showSearch = !w.selectedClient || changing;
  const locked = w.busy || w.approving || w.reviewSaving || saving;
  const completed = w.result?.status === 'ACTION_COMPLETED';
  useEffect(() => {
    if (!showSearch || registering) return;
    let active = true;
    void Promise.resolve().then(async () => {
      if (!active) return;
      setLoading(true); setError('');
      try { const data = await clientIntakeApi.search(search); if (active) setClients(data); }
      catch { if (active) { setClients([]); setError('Client search could not be loaded. Please retry.'); } }
      finally { if (active) setLoading(false); }
    });
    return () => { active = false; };
  }, [search, showSearch, registering, version]);
  async function choose(client: ClientSummary, confirmed = false) {
    if (locked) return;
    if (!confirmed && w.view === 'appointment' && w.selectedClient?.userId !== client.userId) { setCandidate(client); return; }
    setSaving(true);
    try { if (await w.selectClient(client, confirmed)) { setChanging(false); setRegistering(false); setCandidate(undefined); setDuplicate(undefined); setPassword(''); setError(''); } }
    finally { setSaving(false); }
  }
  async function register(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (locked) return;
    setSaving(true); setError(''); setDuplicate(undefined);
    try {
      const existing = (await clientIntakeApi.search(email.trim())).find(client => client.email.toLowerCase() === email.trim().toLowerCase());
      if (existing) { setDuplicate(existing); return; }
      const client = await clientIntakeApi.register({ fullName: name.trim(), email: email.trim(), password });
      setPassword('');
      if (w.view === 'appointment' && w.selectedClient?.userId !== client.userId) setCandidate(client);
      else if (await w.selectClient(client)) { setRegistering(false); setChanging(false); }
    } catch (cause) {
      if (axios.isAxiosError(cause) && cause.response?.status === 409 && cause.response.data?.existingClient) setDuplicate(cause.response.data.existingClient);
      else setError(clientError(cause, 'Client registration could not be completed. Please retry.'));
    } finally { setSaving(false); }
  }
  return <section aria-label="Client intake" className={surface}>
    <div className="flex items-start gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold">01</span><div><h3 className="font-bold">Client</h3><p className="mt-1 text-xs text-slate-500">Search or register the client receiving assistance.</p></div></div>
    {w.selectedClient && <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4"><div><p className="text-xs font-semibold text-slate-500">Selected Client</p><p className="mt-1 font-semibold">{w.selectedClient.name}</p><p className="mt-1 break-all text-sm text-slate-500">{w.selectedClient.email}</p></div>{!completed && <button type="button" disabled={locked} onClick={() => { setChanging(!changing); setRegistering(false); }} className={secondaryButton}>{changing ? 'Keep Selected Client' : 'Change Client'}</button>}</div>}
    {candidate && <div className="mt-5 border-t border-slate-200 pt-4" role="group" aria-label="Confirm client change"><p className="font-semibold">Confirm Client Change</p><p className="mt-2 text-sm text-slate-600">Use {candidate.name} for this requirement? You will return to Administrator Review and must select a slot again.</p><div className="mt-3 flex flex-wrap gap-3"><button disabled={locked} type="button" onClick={() => void choose(candidate, true)} className={primaryButton}>Confirm Client Change</button><button disabled={locked} type="button" onClick={() => setCandidate(undefined)} className={secondaryButton}>Keep Current Client</button></div></div>}
    {showSearch && !candidate && !completed && <div className="mt-5 border-t border-slate-100 pt-4">
      <div className="mb-4 flex flex-wrap gap-3"><button type="button" disabled={locked} onClick={() => { setRegistering(!registering); setError(''); setDuplicate(undefined); setPassword(''); }} className={secondaryButton}>{registering ? 'Search Existing Client' : '+ Register New Client'}</button></div>
      {registering ? <form aria-label="Register new client" className="space-y-4" onSubmit={register}>
        <label className="block text-sm font-semibold">Full Name <span className="font-normal text-slate-500">(optional)</span><input maxLength={200} disabled={locked} autoComplete="name" value={name} onChange={event => setName(event.target.value)} className={field} /></label>
        <label className="block text-sm font-semibold">Email<input required type="email" maxLength={254} autoComplete="email" disabled={locked} value={email} onChange={event => setEmail(event.target.value)} className={field} /></label>
        <label className="block text-sm font-semibold">Account Password<input required type="password" maxLength={200} autoComplete="new-password" disabled={locked} value={password} onChange={event => setPassword(event.target.value)} className={field} /><span className="mt-2 block text-xs font-normal text-slate-500">Email and password are required by the existing client account registration. If no name is supplied, the account uses the email prefix.</span></label>
        <button disabled={locked} className={primaryButton}>{saving ? 'Registering Client…' : 'Register & Select Client'}</button>
      </form> : <><label className="block text-sm font-semibold">Search existing client<input aria-label="Search existing client" type="search" value={search} disabled={locked} onChange={event => setSearch(event.target.value)} placeholder="Search by name or email…" className={field} /></label>
        {loading ? <p role="status" className="mt-3 text-sm text-slate-500">Searching client records…</p> : !error && <ul className="mt-3 divide-y divide-slate-100">{clients.map(client => <li key={client.userId} className="flex flex-wrap items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="text-sm font-semibold">{client.name}</p><p className="mt-1 break-all text-xs text-slate-500">{client.email}</p></div><button type="button" disabled={locked} onClick={() => void choose(client)} className={secondaryButton} aria-label={`Select client ${client.name}`}>Select</button></li>)}</ul>}{!loading && !error && clients.length === 0 && <p className="mt-3 text-sm text-slate-500">No clients match this search. Register a new client to continue.</p>}</>}
      {duplicate && <div className="mt-4 border-t border-slate-200 pt-4"><p className="font-semibold">Possible Existing Client</p><p className="mt-2 text-sm">{duplicate.name} · {duplicate.email}</p><button type="button" disabled={locked} onClick={() => void choose(duplicate)} className={`${secondaryButton} mt-3`}>Use Existing Client</button></div>}
      {error && <div role="alert" className="mt-4 text-sm text-red-700"><p>{error}</p>{!registering && <button type="button" disabled={locked || loading} onClick={() => setVersion(value => value + 1)} className={`${secondaryButton} mt-3`}>Retry Client Search</button>}</div>}
    </div>}
  </section>;
}
