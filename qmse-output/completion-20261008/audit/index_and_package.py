from pathlib import Path
from datetime import datetime,timezone
import hashlib,json,zipfile,subprocess,shutil
R=Path.cwd();O=R/'qmse-output';C=O/'completion-20261008';snapshot=C/'source-snapshot';snapshot.mkdir(exist_ok=True)
paths=subprocess.check_output(['git','diff','--name-only','8a9b8a24f5a567460f90e60b3b6675ed02230062','HEAD'],text=True).splitlines()
for name in paths:
 p=R/name
 if p.is_file():out=snapshot/name;out.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,out)
(C/'audit/tested-source.patch').write_bytes(subprocess.check_output(['git','diff','--binary','8a9b8a24f5a567460f90e60b3b6675ed02230062','HEAD']))
(C/'audit/commit-provenance.json').write_text(json.dumps({'base':'8a9b8a24f5a567460f90e60b3b6675ed02230062','tested_application_fix_commit':'f360e4ac21f149ae5b90a125c57bf928982a9c53','final_script_commit':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'source_paths':paths,'application_changes_since_fix_commit':subprocess.check_output(['git','diff','--name-only','f360e4a','HEAD','--','backend','frontend','mobile','ai-service'],text=True).splitlines(),'push':'NOT PERFORMED'},indent=2))
cs=json.load(open(C/'test-results/case-verification.json'));refs={}
for c in cs:
 for e in c['evidence']:refs.setdefault(e,[]).append(c['test_id'])
for f in json.load(open(O/'evidence/visual/figure-index.json'))+json.load(open(C/'evidence/figure-index.json')):refs.setdefault('qmse-output/'+f['image'],[]).append('Figure '+f['figure'])
old=C/'audit/previous-root-summaries'
for name in ['evidence-index.json','evidence-index.md']:
 if (O/name).exists() and not (old/name).exists():shutil.copy2(O/name,old/name)
entries=[]
for p in sorted(O.rglob('*')):
 if not p.is_file() or p.suffix=='.zip' or p.name=='completion-package-receipt.json' or p.name.startswith('evidence-index') or any(x.startswith('render') or x in ['.dotnet','__pycache__','.DS_Store'] for x in p.relative_to(O).parts):continue
 rel=str(p.relative_to(R));scope='Original earlier-phase evidence/support artifact; consult dated scope'
 if '/completion-20261008/evidence/' in rel:scope='Current genuine execution artifact; scope/date in summaries and source metadata'
 if 'e2e-' in rel and '/completion-20261008/evidence/' in rel:scope='Actual local application screenshot; filename/step log establishes completed or preserved failed attempt'
 if 'live-gemini' in rel:scope='Single actual provider 504 attempt; no successful live output'
 if '/source-snapshot/' in rel:scope='Committed source snapshot, not execution proof'
 if '/audit/' in rel:scope='Audit/provenance; not standalone execution success'
 if '/final-report/' in rel:scope='Final report or preserved historical report; dates/scope explicit'
 entries.append({'path':rel,'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'scope':scope,'test_ids':refs.get(rel,[])})
(O/'evidence-index.json').write_text(json.dumps(entries,indent=2));lines=['# Current evidence index','','Paths are relative to repository root. Original artifacts, failures and prior reports are preserved. Current results are in completion-20261008/test-results/summary.json. The real alternate workflow is separate from the historical seven-case Deed scenario. Full artifact hashes/sizes/scopes are in evidence-index.json.','','| Original case | Current status | Evidence |','|---|---|---|']
for c in cs:lines.append(f"| {c['test_id']} | {c['status']} | {'; '.join(c['evidence'])} |")
lines += ['','## Current figures','','| Figure | Date | Image | Source |','|---|---|---|---|']
for f in json.load(open(C/'evidence/figure-index.json')):lines.append(f"| {f['figure']} | {f['execution_date']} | qmse-output/{f['image']} | {f['source']} |")
lines += ['','## Complete artifact inventory','','| File | Scope | Bytes |','|---|---|---:|']+[f"| {e['path']} | {e['scope']} | {e['bytes']} |" for e in entries];(O/'evidence-index.md').write_text('\n'.join(lines)+'\n')
archive=O/'SE3110_GR42_Completed_Evidence_Package.zip';originals={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in [O/'SE3110_GR42_Evidence_Package.zip',O/'SE3110_GR42_Visual_Evidence_Package.zip'] if p.exists()}
files=[p for p in sorted(O.rglob('*')) if p.is_file() and p.suffix!='.zip' and p.name!='completion-package-receipt.json' and not any(x.startswith('render') or x in ['.dotnet','__pycache__','.DS_Store'] for x in p.relative_to(O).parts)]
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for p in files:z.write(p,str(p.relative_to(R)))
with zipfile.ZipFile(archive) as z:assert z.testzip() is None;assert 'qmse-output/final-report/SE3110_Testing_Report_GR42_Final.pdf' in z.namelist()
for name,h in originals.items():assert hashlib.sha256((O/name).read_bytes()).hexdigest()==h
info={'created_utc':datetime.now(timezone.utc).isoformat(),'archive':str(archive.relative_to(R)),'files':len(files),'bytes':archive.stat().st_size,'sha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'zip_integrity':'PASS','previous_archives_preserved':originals,'exclusions':'Other ZIPs, render QA intermediates, SDK/runtime caches, __pycache__, .DS_Store. Private credentials/browser state never included.'};(O/'completion-package-receipt.json').write_text(json.dumps(info,indent=2));print(json.dumps(info,indent=2))
