from pathlib import Path
from datetime import datetime,timezone
import json,hashlib,zipfile,subprocess
R=Path.cwd();O=R/'qmse-output';G=O/'git-publication';now=datetime.now(timezone.utc).isoformat();sha='05359214df52fa743b234e1d77e6671f57c14dea'
assert subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()==sha
assert subprocess.check_output(['git','diff','--name-only','HEAD'],text=True).strip()==''
assert subprocess.check_output(['git','diff','--cached','--name-only'],text=True).strip()==''
quality=json.load(open(G/'audit/final-quality-check.json'));assert quality['all_checks_passed'] and quality['pdf_pages']==78
pagehashes={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in (O/'final-report/render-publication').glob('page-*.png')};old=json.load(open(G/'audit/pre-final-page-hashes.json'));changed=sorted([n for n,h in pagehashes.items() if old.get(n)!=h],key=lambda n:int(n.split('-')[1].split('.')[0]));assert changed==['page-54.png','page-55.png','page-59.png']
visual={'completed_utc':now,'pdf_sha256':hashlib.sha256((O/'final-report/SE3110_Testing_Report_GR42_Final.pdf').read_bytes()).hexdigest(),'pages':78,'reviewed_pages':list(range(1,79)),'method':'All 78 rendered pages inspected in numbered four-page contact sheets. Final changed pages 54,55,59 re-inspected individually; remaining 75 page PNG hashes match already reviewed export. GitHub readability pages 48–57 and reproduction page 76 inspected individually. Existing images/case tables preserved and machine checks complement visual review.','individual_detail_pages':[48,49,50,51,52,53,54,55,56,57,59,76],'page_hashes':pagehashes,'findings':'No blank pages, clipped images or overflowing tables found. Original portrait/landscape sections retained. All 54 TOC destinations/page footers validated. Genuine asynchronous loading placeholders on branch/member views are preserved; branch counter scope is explicitly qualified and settled wide/native evidence is packaged. Historical whitespace and forced component starts retained. Original image originals are available for zooming.','status':'COMPLETED'};(G/'audit/visual-review.json').write_text(json.dumps(visual,indent=2));quality['visual_review']='COMPLETED: all 78 pages inspected; see visual-review.json';quality['final_pdf_sha256']=visual['pdf_sha256'];(G/'audit/final-quality-check.json').write_text(json.dumps(quality,indent=2))
remote=json.load(open(G/'evidence/final-remote-api-verification.json'));assert remote['branch']['result']['commit']['sha']==sha;assert remote['sha-runs']['result']['total_count']==0 and remote['branch-runs']['result']['total_count']==0
(G/'audit/final-working-tree.json').write_text(json.dumps({'checked_utc':now,'head':sha,'tracked_unstaged_diff':[],'staged_diff':[],'new_delivery_artifacts':'Local untracked report/evidence only; no new code commit or publication','remote_verification':'git-publication/evidence/final-remote-api-verification.json'},indent=2))
# Preserve the native figure indexes; combine scoped references into the current index.
figs=json.load(open(O/'evidence/visual/figure-index.json'))+json.load(open(O/'completion-20261008/evidence/figure-index.json'))+json.load(open(G/'evidence/figure-index.json'));assert len(figs)==30
cases=json.load(open(O/'completion-20261008/test-results/case-verification.json'));refs={}
for c in cases:
 for e in c['evidence']:
  assert (R/e).is_file();refs.setdefault(e,[]).append(c['test_id'])
for f in figs:
 p='qmse-output/'+f['image'];assert (R/p).is_file();refs.setdefault(p,[]).append('Figure '+f['figure'])
(G/'evidence/all-figure-index.json').write_text(json.dumps({'scope':'Current report has 30 figures. Original dated indexes remain historical. Figure 6.2 is before-fix failure; 6.14 is verified retest. Figure 6.13 is deployment-history CI, not published-head CI. Current caption/provenance is authoritative for revision scope.','figures':figs},indent=2))
def include(p):
 parts=p.relative_to(O).parts
 return p.is_file() and p.suffix.lower()!='.zip' and p.name not in ['completion-package-receipt.json','.DS_Store'] and not p.name.startswith('.env') and not any(x.startswith('render') or x in ['.dotnet','__pycache__','node_modules','.venv','.git','.cache'] for x in parts)
entries=[]
for p in sorted(O.rglob('*')):
 if not include(p) or p.name.startswith('evidence-index'):continue
 rel=str(p.relative_to(R));scope='Preserved dated testing/support evidence; earlier status is historical'
 if '/git-publication/' in rel:scope='Current publication/documentation audit or genuine GitHub evidence; source scopes and times in metadata'
 if '/git-publication/backup-60-page/' in rel:scope='Preserved pre-publication input and metadata; publication status there is historical'
 if '/completion-20261008/evidence/' in rel:scope='Native technical completion execution evidence; actual date and limitations in summary'
 if '/source-snapshot/' in rel:scope='Committed source snapshot; source is not execution proof'
 if 'live-gemini' in rel:scope='Single actual provider HTTP 504 attempt; no successful live result'
 if '/final-report/' in rel:scope='Final reviewed report or preserved dated predecessor'
 if rel.endswith('/completion-summary.md'):scope='Current publication and unchanged testing status'
 entries.append({'path':rel,'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'scope':scope,'test_ids':refs.get(rel,[])})
(O/'evidence-index.json').write_text(json.dumps(entries,indent=2));lines=['# Final published-source evidence index','','Published exact source: 05359214df52fa743b234e1d77e6671f57c14dea on Wishwa2002/Intelligent-legal-service/se3110-qmse-testing. Reports/evidence are separate local submission deliverables. Paths are relative to repository root. Original logs, failed attempts, reports and dated audits are retained; earlier unpushed status is historical. Current publication proof is in git-publication/evidence/. No new technical suite execution is claimed.','','## Original report cases','','| Test ID | Current status | Evidence |','|---|---|---|']
for c in cases:lines.append(f"| {c['test_id']} | {c['status']} | {'; '.join(c['evidence'])} |")
lines+=['','## All report figures','','Native originals remain unchanged. Figures 6.1–6.13 are first-phase evidence, 6.14–6.20 completion evidence, and 6.21–6.30 publication evidence. Earlier failure/CI captions are explicitly qualified in the current report.','','| Figure | Actual recorded date | Image | Native source |','|---|---|---|---|']
for f in figs:lines.append(f"| {f['figure']} | {f['execution_date']} | qmse-output/{f['image']} | {f['source']} |")
lines+=['','## Complete artifact inventory','','| Path | Scope | Bytes |','|---|---|---:|']+[f"| {e['path']} | {e['scope']} | {e['bytes']} |" for e in entries];(O/'evidence-index.md').write_text('\n'.join(lines)+'\n')
originals={str(p.relative_to(O)):hashlib.sha256(p.read_bytes()).hexdigest() for p in [O/'SE3110_GR42_Evidence_Package.zip',O/'SE3110_GR42_Visual_Evidence_Package.zip',G/'backup-60-page/SE3110_GR42_PrePublication_Evidence_Package.zip'] if p.exists()}
archive=O/'SE3110_GR42_Completed_Evidence_Package.zip';files=[p for p in sorted(O.rglob('*')) if include(p)]
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for p in files:z.write(p,str(p.relative_to(R)))
with zipfile.ZipFile(archive) as z:
 assert z.testzip() is None
 for e in entries:assert hashlib.sha256(z.read(e['path'])).hexdigest()==e['sha256']
 for suffix in ['docx','pdf']:
  p=O/f'final-report/SE3110_Testing_Report_GR42_Final.{suffix}';assert z.read(str(p.relative_to(R)))==p.read_bytes()
 assert all(not n.endswith('.zip') and '/.dotnet/' not in n and '/node_modules/' not in n and '/.venv/' not in n for n in z.namelist())
for p,h in originals.items():assert hashlib.sha256((O/p).read_bytes()).hexdigest()==h
receipt={'created_utc':datetime.now(timezone.utc).isoformat(),'archive':str(archive.relative_to(R)),'files':len(files),'bytes':archive.stat().st_size,'sha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'zip_integrity':'PASS','all_indexed_artifact_hashes_match_zip':True,'final_reports_match_zip':True,'previous_archives_preserved':originals,'pdf_pages':78,'figures':30,'published_sha':sha,'ci':'Zero observed runs; no pass claimed','exclusions':'Other ZIPs including preserved archives, render QA intermediates, SDK/runtime caches, dependencies, .env/private controls/browser state. No secret contents copied.'};(O/'completion-package-receipt.json').write_text(json.dumps(receipt,indent=2));print(json.dumps(receipt,indent=2))
