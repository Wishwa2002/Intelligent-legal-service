from pathlib import Path
import datetime, hashlib, json, zipfile
P=Path('qmse-output/historical-resolution')
OLD=Path('qmse-output/SE3110_GR42_Completed_Evidence_Package.zip')
NEW=Path('qmse-output/SE3110_GR42_Historical_Verification_Evidence.zip')
def sha(f): return hashlib.sha256(f.read_bytes()).hexdigest()
def included(f):
 return f.is_file() and not any(x in f.parts for x in ('render','visual','__pycache__')) and f.suffix!='.pyc' and not f.name.startswith('.env') and f.name!='package-receipt.json'
cases=json.loads((P/'test-results/case-verification.json').read_text())
files=[{'path':str(f),'bytes':f.stat().st_size,'sha256':sha(f)} for f in sorted(P.rglob('*')) if included(f) and f.name not in ('evidence-index.json','evidence-index.md')]
index={'generated_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'scope':'New phase index; original native evidence preserved in combined package; archive receipt stored alongside package to avoid self-reference','case_evidence':[{'test_id':c['test_id'],'status':c['status'],'evidence':c.get('evidence',[])} for c in cases],'files':files}
(P/'evidence-index.json').write_text(json.dumps(index,indent=2))
with zipfile.ZipFile(OLD) as zin, zipfile.ZipFile(NEW,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as zout:
 names=set(); preserved=len(zin.infolist());added=[]
 for info in zin.infolist():zout.writestr(info,zin.read(info.filename));names.add(info.filename)
 for f in sorted(P.rglob('*')):
  if not included(f):continue
  n=str(f)
  assert n not in names,n
  zout.write(f,n);names.add(n);added.append(n)
with zipfile.ZipFile(OLD) as zin,zipfile.ZipFile(NEW) as zout:
 assert zout.testzip() is None
 assert all(hashlib.sha256(zin.read(n)).digest()==hashlib.sha256(zout.read(n)).digest() for n in zin.namelist())
 assert all(e in names for c in cases for e in c.get('evidence',[]))
 assert all(hashlib.sha256(zout.read(f['path'])).hexdigest()==f['sha256'] for f in files)
receipt={'created_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'zip':str(NEW),'bytes':NEW.stat().st_size,'sha256':sha(NEW),'original_entries_preserved_byte_for_byte':preserved,'new_entries':len(added),'entry_count':len(names),'all_case_evidence_in_archive':True,'indexed_hashes_match_archive':True,'zip_integrity_test':'PASS','exclusions':['private runtime controls/credentials/PostgreSQL cluster/TLS keys','dependencies and caches','PDF render PNGs and visual QA contact sheets','self-referential archive receipt (provided separately)'],'added_entries':added}
(P/'audit/package-receipt.json').write_text(json.dumps(receipt,indent=2))
print({k:v for k,v in receipt.items() if k!='added_entries'})
