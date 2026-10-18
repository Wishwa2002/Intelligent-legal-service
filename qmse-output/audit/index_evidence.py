from pathlib import Path
import json,hashlib
R=Path(__file__).resolve().parents[2];O=R/'qmse-output';cases=json.load(open(O/'test-results/case-verification.json'));refs={}
for c in cases:
 for e in c.get('evidence',[]):
  if not isinstance(e,str):continue
  refs.setdefault(e,[]).append(c['test_id'])
refs['qmse-output/evidence/security/scan-metadata.json']=['TC-SEC-05','TC-SEC-06'];refs['qmse-output/evidence/performance/k6-summary.json']=['PERF-01','PERF-05 (mock only)','PERF-LOCAL-02','PERF-LOCAL-03'];refs['qmse-output/evidence/backend/backend-final.trx']+=['TC-SEC-01','TC-SEC-03','TC-SEC-07','DEF-02','DEF-09','DEF-12','DEF-13','DEF-15 (partial)']
entries=[]
for p in sorted(O.rglob('*')):
 if not p.is_file() or any(x.startswith('render') or x=='.dotnet' or x=='__pycache__' for x in p.relative_to(O).parts) or p.name.startswith('evidence-index'):continue
 rel=str(p.relative_to(R));scope='execution/support artifact'
 if '/audit/' in rel:scope='audit/provenance; not proof of successful execution'
 if '/ci/' in rel:scope='historical public CI metadata; current local additions not covered'
 if '/e2e/' in rel:scope='browser tests, mostly mocked API; no complete integrated workflow'
 if '/mobile/' in rel:scope='Flutter unit/widget machine events; no device/live-API evidence'
 if '/performance/' in rel:scope='local InMemory/mock smoke load only'
 if '/security/' in rel:scope='passive local fixture scan/probes; no production scan'
 if '/ai/' in rel:scope='deterministic/mocked AI only; no live Gemini'
 if '/final-report/' in rel:scope='final academic artifact; qualified results'
 entries.append({'path':rel,'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'scope':scope,'test_ids':refs.get(rel,refs.get(str(p.relative_to(O)),[]))})
(O/'evidence-index.json').write_text(json.dumps(entries,indent=2))
lines=['# Evidence index','','Paths below are relative to the repository root. Machine-readable index includes file sizes, SHA-256 hashes and scopes. Original timestamps and command exit codes are in test-results/*.json. Final successful retries are identified in summary.json; failed/blocked attempts remain available.','', '## Original report case mapping','','| Test ID | Status | Evidence |','|---|---|---|']
for c in cases:
 ev=c.get('evidence',c.get('evidence_location',[]));ev=[ev] if isinstance(ev,str) else ev
 lines.append(f"| {c['test_id']} | {c['status']} | {'; '.join(ev)} |")
lines+=['','## Artifact inventory','','| Path | Scope | Bytes |','|---|---|---:|']
for e in entries:lines.append(f"| `{e['path']}` | {e['scope']} | {e['bytes']} |")
(O/'evidence-index.md').write_text('\n'.join(lines)+'\n')
