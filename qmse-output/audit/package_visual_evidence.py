from pathlib import Path
from datetime import datetime,timezone
import json,hashlib,zipfile
R=Path(__file__).resolve().parents[2];O=R/'qmse-output';archive=O/'SE3110_GR42_Visual_Evidence_Package.zip';original=O/'SE3110_GR42_Evidence_Package.zip'
original_hash=hashlib.sha256(original.read_bytes()).hexdigest() if original.exists() else None
files=[p for p in sorted(O.rglob('*')) if p.is_file() and p.suffix!='.zip' and not any(x.startswith('render') or x in ('.dotnet','__pycache__','.DS_Store') for x in p.relative_to(O).parts)]
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for p in files:z.write(p,str(p.relative_to(R)))
with zipfile.ZipFile(archive) as z:
 assert z.testzip() is None
 for n in ('final-report/SE3110_Testing_Report_GR42_Final.docx','final-report/SE3110_Testing_Report_GR42_Final.pdf','evidence/backend/backend-final.trx','evidence/visual/figure-index.json'):assert 'qmse-output/'+n in z.namelist()
assert original_hash is None or hashlib.sha256(original.read_bytes()).hexdigest()==original_hash
info={'checked_utc':datetime.now(timezone.utc).isoformat(),'archive':str(archive.relative_to(R)),'files':len(files),'bytes':archive.stat().st_size,'sha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'zip_integrity':'PASS','original_archive_preserved_sha256':original_hash,'exclusions':'Other ZIPs, render QA intermediates, local SDK caches, __pycache__, .DS_Store. All original portable execution artifacts retained.'}
# Receipt remains alongside archive because it records the completed archive hash.
(O/'visual-package-receipt.json').write_text(json.dumps(info,indent=2));print(json.dumps(info,indent=2))
