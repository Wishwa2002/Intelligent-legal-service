import { useRef, useState } from 'react';
import { workforceSettingsApi, workforceError, type WorkforceSetting, type SettingValues } from '../services/workforceSettingsApi';
const fields = [
  ['minimumActiveLawyers', 'Minimum Active Lawyers', 'Minimum practitioner coverage expected for this Practice Area.', 100],
  ['targetActiveLawyers', 'Target Active Lawyers', 'Preferred staffing level; a shortfall alone does not create a concern.', 200],
  ['minimumFutureSlots', 'Minimum Future Slots', 'Expected upcoming appointment capacity within the analysis window.', 1000],
  ['highDemandThreshold', 'High Demand Threshold', 'Demand level that activates high-demand rules.', 10000],
  ['watchCapacityRatio', 'Watch Capacity Ratio (%)', 'Percentage of capacity at which high demand enters Watch.', 100],
] as const;
const button = 'min-h-11 rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 disabled:opacity-50';
export function WorkforceSettings({ disabled, onChanged }: { disabled: boolean; onChanged: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [areas, setAreas] = useState<WorkforceSetting[]>([]);
  const [selected, setSelected] = useState<number>();
  const [values, setValues] = useState<Record<keyof SettingValues, string>>({ minimumActiveLawyers: '0', targetActiveLawyers: '0', minimumFutureSlots: '0', highDemandThreshold: '5', watchCapacityRatio: '75' });
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [message, setMessage] = useState('');
  const current = areas.find(area => area.practiceAreaId === selected);
  function loadValues(area?: WorkforceSetting) {
    if (area) setValues({ minimumActiveLawyers: String(area.minimumActiveLawyers), targetActiveLawyers: String(area.targetActiveLawyers), minimumFutureSlots: String(area.minimumFutureSlots), highDemandThreshold: String(area.highDemandThreshold), watchCapacityRatio: String(area.watchCapacityRatio * 100) });
  }
  async function open() {
    dialog.current?.showModal(); setBusy(true); setError(''); setMessage('');
    try { const data = await workforceSettingsApi.list(); setAreas(data); setSelected(data[0]?.practiceAreaId); loadValues(data[0]); }
    catch (err) { setError(workforceError(err)); setAreas([]); } finally { setBusy(false); }
  }
  async function save(reset = false) {
    if (!selected) return;
    const payload = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, Number(value)])) as unknown as SettingValues;
    payload.watchCapacityRatio /= 100;
    if (!reset && (fields.some(([key, , , max]) => values[key].trim() === '' || !Number.isFinite(Number(values[key])) || Number(values[key]) < 0 || Number(values[key]) > max || (key !== 'watchCapacityRatio' && !Number.isInteger(Number(values[key])))) || payload.watchCapacityRatio <= 0 || payload.targetActiveLawyers < payload.minimumActiveLawyers)) {
      setError('Use valid non-negative whole counts, a target at least the minimum, and a watch percentage greater than 0 and at most 100.'); return;
    }
    setBusy(true); setError(''); setMessage('');
    try { const updated = reset ? await workforceSettingsApi.reset(selected) : await workforceSettingsApi.save(selected, payload); setAreas(previous => previous.map(area => area.practiceAreaId === selected ? updated : area)); loadValues(updated); setMessage(reset ? 'Default rules restored.' : 'Workforce settings saved.'); onChanged(); }
    catch (err) { setError(workforceError(err)); } finally { setBusy(false); }
  }
  return <><button type="button" disabled={disabled} className={button} onClick={() => void open()}>Workforce Settings</button>
    <dialog ref={dialog} aria-labelledby="workforce-settings-title" className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-lg border border-slate-200 bg-white p-5 text-slate-900 shadow-xl backdrop:bg-slate-950/40 sm:p-7" onCancel={event => { if (busy) event.preventDefault(); }}>
      <div className="flex items-start justify-between gap-3"><div><h3 id="workforce-settings-title" className="text-lg font-bold">Workforce Settings</h3><p className="mt-2 text-sm text-slate-600">Configure expected staffing and capacity by Practice Area.</p></div><button aria-label="Close workforce settings" type="button" className={button} disabled={busy} onClick={() => dialog.current?.close()}>×</button></div>
      {busy && <p role="status" className="mt-4 text-sm">Loading or saving workforce rules…</p>}
      {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}{message && <p role="status" className="mt-4 text-sm text-emerald-800">{message}</p>}
      <form className="mt-5 space-y-5" onSubmit={event => { event.preventDefault(); void save(); }}>
        <label className="block text-sm font-semibold">Practice Area<select disabled={busy} value={selected ?? ''} onChange={event => { setSelected(Number(event.target.value)); loadValues(areas.find(area => area.practiceAreaId === Number(event.target.value))); setError(''); setMessage(''); }} className="mt-2 min-h-11 w-full rounded-md border border-slate-300 bg-white p-2">{areas.map(area => <option key={area.practiceAreaId} value={area.practiceAreaId}>{area.practiceAreaName}</option>)}</select></label>
        {current && <><p className="text-xs text-slate-500">Configuration: <span className="font-semibold text-slate-700">{current.source === 'CUSTOM' ? 'Custom' : 'Default'}</span> · SYSTEM rules</p>
          <div className="grid gap-5 sm:grid-cols-2">{fields.map(([key, label, helper, max]) => <label key={key} className="block text-sm font-semibold">{label}<input type="number" required min={key === 'watchCapacityRatio' ? 0.01 : 0} max={max} step={key === 'watchCapacityRatio' ? 0.01 : 1} disabled={busy} value={values[key]} aria-describedby={`rule-help-${key}`} onChange={event => setValues(previous => ({ ...previous, [key]: event.target.value }))} className="mt-2 min-h-11 w-full rounded-md border border-slate-300 p-2 focus-visible:outline-2 focus-visible:outline-amber-600" /><span id={`rule-help-${key}`} className="mt-2 block text-xs font-normal leading-relaxed text-slate-500">{helper}</span></label>)}</div>
          <div className="flex flex-wrap justify-between gap-3 border-t border-slate-200 pt-4"><button type="button" disabled={busy} className={button} onClick={() => void save(true)}>Reset to Defaults</button><button type="submit" disabled={busy} className={`${button} border-amber-500 bg-amber-500 text-slate-950`}>Save Settings</button></div>
        </>}
      </form>
    </dialog>
  </>;
}
