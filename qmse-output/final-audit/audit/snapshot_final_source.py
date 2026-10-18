from pathlib import Path
import subprocess,json,hashlib,shutil,datetime
R=Path.cwd();P=R/'qmse-output/final-audit';root=P/'source-snapshot';root.mkdir(exist_ok=True)
modified=subprocess.check_output(['git','diff','--name-only'],text=True).splitlines();untracked=subprocess.check_output(['git','ls-files','--others','--exclude-standard'],text=True).splitlines();files=modified+[s for s in untracked if (s.startswith(('backend/LegalService.Tests/','ai-service/tests/','frontend/tests/','mobile/test/')) or s.startswith('backend/LegalService.API/')) and not s.endswith(('.png','.zip','.pdf','.docx'))]+[s for s in untracked if s.startswith('frontend/') and 'playwright.config.ts' in s]+['ai-service/requirements-qmse-tested.lock.txt']
rows=[]
for name in sorted(set(files)):
 p=R/name
 if not p.is_file():continue
 assert '.env' not in Path(name).name and 'node_modules' not in name
 dst=root/name;dst.parent.mkdir(parents=True,exist_ok=True);shutil.copy(p,dst);rows.append({'path':name,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'bytes':p.stat().st_size,'tracked_modified':name in modified,'snapshot':str(dst.relative_to(R))})
patch=subprocess.check_output(['git','diff','--binary']);(P/'tested-source.patch').write_bytes(patch)
# This labels a local revision, not a fabricated commit SHA.
label=hashlib.sha256(json.dumps(rows,sort_keys=True).encode()+patch).hexdigest()
(P/'source-manifest.json').write_text(json.dumps({'head':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'branch':subprocess.check_output(['git','branch','--show-current'],text=True).strip(),'captured_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'overlay_sha256':label,'status':'Uncommitted, unpublished local AI-assisted source overlay','changed_source_files':rows,'patch_sha256':hashlib.sha256(patch).hexdigest(),'production_data_modified':False,'provider_calls':0},indent=2));print('Source overlay',label,'files',len(rows))
