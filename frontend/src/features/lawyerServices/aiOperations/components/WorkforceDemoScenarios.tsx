import { useEffect, useState } from 'react';
import { workforceDemoApi, workforceSettingsApi, workforceError, type DemoScenario, type WorkforceSetting } from '../services/workforceSettingsApi';
const scenarios: { value: DemoScenario; label: string; description: string }[] = [
  { value: 'HEALTHY_COVERAGE', label: 'Healthy Coverage', description: 'Restores adequate staffing and capacity in isolated demo areas.' },
  { value: 'RECRUITMENT_NEEDED', label: 'Recruitment Needed', description: 'Creates a deterministic capacity shortage in the selected demo area.' },
  { value: 'NO_ACTIVE_LAWYERS', label: 'No Active Lawyers', description: 'Sets the selected demo area to zero active practitioners.' },
  { value: 'EXISTING_RECRUITMENT', label: 'Existing Recruitment', description: 'Creates a staffing concern with a linked Career opening already present.' },
];
export function WorkforceDemoScenarios({ disabled, onChanged }: { disabled: boolean; onChanged: () => void }) {
  const [available, setAvailable] = useState(false); const [areas, setAreas] = useState<WorkforceSetting[]>([]);
  const [areaId, setAreaId] = useState<number>(); const [scenario, setScenario] = useState<DemoScenario>('RECRUITMENT_NEEDED');
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState(''); const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    void workforceDemoApi.available().then(async allowed => {
      if (!allowed) return;
      const data = (await workforceSettingsApi.list()).filter(area => !area.practiceAreaName.startsWith('[Demo] '));
      if (active) { setAvailable(true); setAreas(data); setAreaId((data.find(area => area.practiceAreaName.toLowerCase() === 'criminal law') ?? data[0])?.practiceAreaId); }
    }).catch(() => { /* A Production backend has no demo route. */ });
    return () => { active = false; };
  }, []);
  async function apply(reset: boolean) {
    setBusy(true); setError(''); setMessage('');
    try { const result = reset ? await workforceDemoApi.reset() : await workforceDemoApi.apply(scenario, areaId); setMessage(`${reset ? 'Demo baseline restored' : `Demo scenario applied: ${scenarios.find(item => item.value === scenario)?.label}`}. ${result.message} Run Workforce Analysis to inspect the result.`); onChanged(); }
    catch (err) { setError(workforceError(err)); } finally { setBusy(false); }
  }
  if (!available) return null;
  return <details className="border-t border-slate-200 pt-2 text-sm text-slate-600"><summary className="min-h-11 cursor-pointer py-3 font-semibold focus-visible:outline-2 focus-visible:outline-amber-600"><span className="mr-3 text-[10px] uppercase tracking-wider text-slate-500">Development only</span>Demo Scenarios</summary>
    <p className="mb-4 text-xs leading-relaxed">Scenarios use separate [Demo] Practice Areas and copy source workforce rules. Original lawyers, appointments and Admin-created openings are preserved.</p>
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
      <label className="min-w-0 text-xs font-semibold">Source Practice Area<select className="mt-2 block min-h-11 w-full max-w-full rounded-md border border-slate-300 bg-white p-2 text-sm sm:max-w-xs" disabled={disabled || busy} value={areaId ?? ''} onChange={event => setAreaId(Number(event.target.value))}>{areas.map(area => <option key={area.practiceAreaId} value={area.practiceAreaId}>{area.practiceAreaName}</option>)}</select></label>
      <label className="text-xs font-semibold">Scenario<select aria-label="Scenario" className="mt-2 block min-h-11 w-full rounded-md border border-slate-300 bg-white p-2 text-sm" disabled={disabled || busy} value={scenario} onChange={event => setScenario(event.target.value as DemoScenario)}>{scenarios.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
      <button type="button" disabled={disabled || busy || !areaId} onClick={() => void apply(false)} className="min-h-11 rounded-md border border-slate-300 px-3 font-semibold focus-visible:outline-2 focus-visible:outline-amber-600 disabled:opacity-50">Apply Demo Scenario</button>
      <button type="button" disabled={disabled || busy} onClick={() => void apply(true)} className="min-h-11 rounded-md px-3 font-semibold underline focus-visible:outline-2 focus-visible:outline-amber-600 disabled:opacity-50">Reset Demo Data</button>
    </div><p className="mt-3 text-xs">{scenarios.find(item => item.value === scenario)?.description}</p>
    {busy && <p role="status" className="mt-3 text-xs">Updating isolated demo data…</p>}{message && <p role="status" className="mt-3 text-xs leading-relaxed">{message}</p>}{error && <p role="alert" className="mt-3 text-xs text-red-700">{error}</p>}
  </details>;
}
