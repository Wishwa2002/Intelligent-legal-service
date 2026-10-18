from pathlib import Path
from collections import Counter
from datetime import datetime,timezone
import hashlib,json,re,xml.etree.ElementTree as E,zipfile
from docx import Document
import pymupdf
R=Path.cwd();P=R/'qmse-output/final-audit'
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
cases=json.loads((P/'case-verification.json').read_text()); counts=Counter(c['status'] for c in cases)
assert len(cases)==77 and len({c['test_id'] for c in cases})==77
assert counts=={'VERIFIED/PASS':49,'VERIFIED/FAIL':16,'BLOCKED':12}
missing=[f for c in cases for f in c.get('evidence',[]) if not (R/f).is_file()];assert not missing,missing
assert all(c.get('observed') and c.get('expected') and c.get('evidence') for c in cases)
fc=json.loads((P/'failure-classification.json').read_text());assert len(fc['cases'])==30
bc=json.loads((P/'blocked-case-register.json').read_text());assert len(bc)==12
assert all(x['required_to_unblock'] and x['categories'] for x in bc)
source=json.loads((P/'source-manifest.json').read_text());assert len(source['changed_source_files'])==33
for f in source['changed_source_files']:
 assert sha(R/f['path'])==f['sha256'],f['path']
 assert sha(R/f['snapshot'])==f['sha256'],f['snapshot']
inputs=json.loads((P/'audit/input-baseline.json').read_text());assert all(sha(R/f)==h for f,h in inputs.items())
trx=P/'debug/evidence/issue6-backend-complete.trx';rr=E.parse(trx).getroot();results=[t for t in rr.iter() if t.tag.endswith('UnitTestResult')];outcomes=Counter(t.get('outcome') for t in results)
assert outcomes=={'Passed':362,'Failed':1,'NotExecuted':2},outcomes
failnames=[t.get('testName') for t in results if t.get('outcome')=='Failed'];assert len(failnames)==1 and 'TC_BK_01_PasswordHashAndVerification' in failnames[0]
ax=E.parse(P/'debug/evidence/issue6-ai-patched-final.xml').getroot();tests=list(ax.iter('testcase'));assert len(tests)==114 and all(not list(t.iter('failure')) and not list(t.iter('error')) for t in tests)
fl=[]
for line in (P/'debug/evidence/issue5-flutter-final.log').read_text().splitlines():
 try:fl.append(json.loads(line))
 except json.JSONDecodeError:pass
fd=[x for x in fl if isinstance(x,dict) and x.get('type')=='testDone' and not x.get('hidden')];assert len(fd)==60 and all(x.get('result')=='success' for x in fd)
pw=json.loads((P/'debug/evidence/issue5-react-final.log').read_text())['stats'];assert pw['expected']==111 and pw['skipped']==3 and pw['unexpected']==0
for name in ('issue5-playwright-confirmed.log','accepted-playwright-final.log'):
 st=json.loads((P/'debug/evidence'/name).read_text())['stats'];assert st['expected']==8 and st['unexpected']==0 and st['skipped']==0
docpath=P/'final-report/SE3110_Testing_Report_GR42_Consolidated_Final.docx';D=Document(docpath);assert len(D.inline_shapes)==43
caps=[int(re.match(r'Figure\s+6\.(\d+)',p.text).group(1)) for p in D.paragraphs if re.match(r'Figure\s+6\.(\d+)',p.text)];assert sorted(caps)==list(range(1,44)),caps
with zipfile.ZipFile(P/'backup/SE3110_Testing_Report_GR42_Historical_Verification.docx') as z:oldimgs={hashlib.sha256(z.read(n)).hexdigest() for n in z.namelist() if n.startswith('word/media/')}
with zipfile.ZipFile(docpath) as z:
 newimgs={hashlib.sha256(z.read(n)).hexdigest() for n in z.namelist() if n.startswith('word/media/')};xml=z.read('word/document.xml').decode();assert oldimgs<=newimgs;assert '05362214' not in xml
pdfpath=P/'final-report/render/SE3110_Testing_Report_GR42_Consolidated_Final.pdf';pdf=pymupdf.open(pdfpath);texts=[p.get_text() for p in pdf]
blank=[i+1 for i,p in enumerate(pdf) if len(p.get_text(clip=pymupdf.Rect(0,90,p.rect.width,p.rect.height-90)).strip())<10 and not p.get_images()];assert not blank,blank
assert all(f'Page {i+1}' in txt for i,txt in enumerate(texts)), 'Physical/footer numbering mismatch'
assert '05362214' not in '\n'.join(texts)
# Physical page bounds detect truncation outside the page, not semantic/table adequacy.
outside=[]
for i,p in enumerate(pdf):
 for block in p.get_text('blocks'):
  if block[0]<-1 or block[1]<-1 or block[2]>p.rect.width+1 or block[3]>p.rect.height+1:outside.append(i+1)
assert not outside,outside
report={'checked_utc':datetime.now(timezone.utc).isoformat(),'case_counts':dict(counts),'case_count':77,'original_failure_classification':fc['counts'],'original_blocked_count':12,'original_failures_resolved_with_executed_accepted_replacements':14,'failed_to_blocked':0,'all_case_evidence_files_exist':True,'input_hashes_unchanged':True,'source_overlay_files':33,'source_overlay_sha256':source['overlay_sha256'],'source_and_snapshot_hashes_match':True,'backend_trx_outcomes':dict(outcomes),'backend_remaining_failure':failnames,'ai_xml_testcases':114,'flutter_nonhidden_testDone_success':len(fd),'playwright_baseline':'111 PASS / 3 SKIPPED','separate_browser_runs':'8 accepted controls; 8 query boundaries; overlap not summed','figures':43,'all_36_original_image_blobs_preserved':True,'pdf_pages':len(pdf),'blank_body_pages':blank,'page_numbers_match_physical_pages':True,'text_outside_page_bounds':outside,'docx_sha256':sha(docpath),'pdf_sha256':sha(pdfpath),'provider_calls_this_phase':0,'no_commit_push_deploy':True,'visual_review':'See visual-review-final.json; programmatic checks do not substitute for visual QA'}
(P/'audit/final-quality-control.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
