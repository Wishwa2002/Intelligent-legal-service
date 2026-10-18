from pathlib import Path
import json,hashlib,zipfile,shutil,re
from datetime import datetime,timezone
from docx import Document
R=Path.cwd();P=R/'qmse-output/final-audit'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
D=Document(P/'final-report/SE3110_Testing_Report_GR42_Consolidated_Final.docx')
captions=[p.text for p in D.paragraphs if re.match(r'Figure 6\.\d+',p.text)]
cases=json.loads((P/'case-verification.json').read_text())
refs=sorted({f for c in cases for f in c['evidence']})
rows=[{'path':f,'bytes':(R/f).stat().st_size,'sha256':sha(R/f)} for f in refs]
(P/'evidence-index.json').write_text(json.dumps({'cases':[{'test_id':c['test_id'],'status':c['status'],'evidence':c['evidence']} for c in cases],'referenced_artifacts':rows,'figure_captions':captions,'population_accounting':json.loads((P/'execution-summary.json').read_text())},indent=2))
(P/'evidence-index.md').write_text('# Final evidence index\n\nAll paths are relative to the repository root. The original ledger, dated suites and new regression populations remain separate. Original failures are preserved alongside accepted replacement/retest evidence.\n\n| Case | Final status | Evidence |\n|---|---|---|\n'+'\n'.join('| '+c['test_id']+' | '+c['status']+' | '+'; '.join(c['evidence'])+' |' for c in cases)+'\n\n## Genuine figures\n\n'+'\n\n'.join(captions)+'\n')
shutil.copy2(P/'final-report/render/SE3110_Testing_Report_GR42_Consolidated_Final.pdf',P/'final-report/SE3110_Testing_Report_GR42_Consolidated_Final.pdf')
original=R/'qmse-output/SE3110_GR42_Historical_Verification_Evidence.zip';out=P/'SE3110_GR42_Consolidated_Final_Evidence.zip'
excluded=[];added=[]
with zipfile.ZipFile(original) as old,zipfile.ZipFile(out,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6,allowZip64=True) as new:
 names=set(old.namelist())
 for info in old.infolist():new.writestr(info,old.read(info.filename))
 for path in sorted(P.rglob('*')):
  if not path.is_file():continue
  rel=path.relative_to(P);name=str(path.relative_to(R))
  if path==out or 'render' in rel.parts or any(x in rel.parts for x in ('node_modules','__pycache__','.venv','runtime','db-control')) or path.name.startswith('.env') or path.suffix in ('.pyc',):excluded.append(name);continue
  if name not in names:new.write(path,name);names.add(name);added.append(name)
 for f in refs:
  if f not in names:new.write(R/f,f);names.add(f);added.append(f)
with zipfile.ZipFile(original) as old,zipfile.ZipFile(out) as new:
 assert new.testzip() is None
 assert all(old.read(n)==new.read(n) for n in old.namelist())
 assert all(f in new.namelist() for f in refs)
receipt={'created_utc':datetime.now(timezone.utc).isoformat(),'archive':str(out.relative_to(R)),'sha256':sha(out),'bytes':out.stat().st_size,'preserved_original_entries':len(old.namelist()),'added_entries':len(added),'original_entry_bytes_unchanged':True,'all_case_references_in_archive':True,'zip_crc_pass':True,'excluded_new_files':excluded,'scope':'Existing historical archive preserved byte-for-byte by entry; final-audit artifacts, source snapshots and final DOCX/PDF added. No dependencies, local environment files or render caches added.'}
(P/'audit/package-receipt.json').write_text(json.dumps(receipt,indent=2));print(json.dumps({k:v for k,v in receipt.items() if k!='excluded_new_files'},indent=2))
