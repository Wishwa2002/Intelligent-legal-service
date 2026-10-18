from pathlib import Path
import json,xml.etree.ElementTree as E
from docx import Document
P=Path('qmse-output/final-audit');ns={'t':'http://microsoft.com/schemas/VisualStudio/TeamTest/2010'};x=E.parse(P/'debug/evidence/issue6-backend-complete.trx').find('.//t:Counters',ns).attrib
s=json.loads((P/'execution-summary.json').read_text());s['final_regression']['backend']={'total':int(x['total']),'passed':int(x['passed']),'failed':int(x['failed']),'skipped':int(x['total'])-int(x['executed']),'evidence':str(P/'debug/evidence/issue6-backend-complete.trx'),'bootstrap':'Startup already executed separately; no repeated fixture reset','remaining_failure':'Historical BCryptcost12 versus11','tls_variability':'Final nativeTLSassertion passes; priorcold585.067msfailure retained. No code/performancefix or stablecoldtargetproof inferred.'};s['new_requirement_decision_tests']=29;(P/'execution-summary.json').write_text(json.dumps(s,indent=2))
for f in ['requirements-decision-register.md','requirements-decision-register.json','provider-diagnosis.md','security/security-review.md','security/security-review.json','reproduction.md','individual-contribution-matrix.md','member-evidence-mapping.md','member-viva-guide.md','member-confirmation-checklist.md']:
 p=P/f;t=p.read_text().replace('363cases359PASS2FAIL2SKIP','365cases362PASS1FAIL2SKIP').replace('363backend359PASS2FAIL2SKIP','365backend362PASS1FAIL2SKIP').replace('363tests359PASS2FAIL2SKIP','365tests362PASS1FAIL2SKIP').replace('363tests:359PASS,2FAIL,2SKIP','365tests:362PASS,1FAIL,2SKIP').replace('backend363cases359PASS2FAIL2SKIP','backend365cases362PASS1FAIL2SKIP');p.write_text(t)
r=json.loads((P/'requirements-decision-register.json').read_text());a=next(x for x in r['rules'] if x['id']=='TC-C112');a['rule']+=' The proposal changes DEFAULT thresholds only; explicit CUSTOM practice-area rules are preserved. Effective WatchCapacityRatio is returned in snapshot/settings so the existing UI shows the threshold actually used.';a['changes']+='; WorkforceSettingsService.Resolve';a['tests']+='; two reported/default/custom effective-ratio tests';(P/'requirements-decision-register.json').write_text(json.dumps(r,indent=2));p=P/'requirements-decision-register.md';p.write_text(p.read_text()+'\nFinal workforce consistency retest: the optional80%default is returned bysettings/snapshot and used byassessment; explicitcustom0.66 remains0.66. Both newtestsPASS in the final365-case backendrun (362PASS/1FAIL/2SKIP). The laternativeTLSassertionpasses; priorcoldfailure remains in the77caseledger without claiming aperformancefix.\n')
# Targeted final document result updates; do not modify original case counts or old executions.
path=P/'final-report/SE3110_Testing_Report_GR42_Consolidated_Final.docx';d=Document(path)
ps=list(d.paragraphs)
for tb in d.tables:
 for rr in tb.rows:
  for c in rr.cells:ps.extend(c.paragraphs)
for p in ps:
 t=p.text;v=t.replace('363','365').replace('359','362')
 v=v.replace('362 PASS/2 FAIL/2 SKIPPED','362 PASS/1 FAIL/2 SKIPPED').replace('362PASS2FAIL2SKIP','362PASS1FAIL2SKIP').replace('362 PASS2 FAIL2 SKIP','362 PASS1 FAIL2 SKIP').replace('362 PASS 2 FAIL 2 SKIP','362 PASS 1 FAIL 2 SKIP')
 if t.startswith('Latest regressions:'):v='Latest regressions: backend362 PASS/1 FAIL/2 SKIPPED (365cases), Node19PASS, Flutter60PASS, deterministicAI114PASS, baselinePlaywright111PASS/3SKIPPED. EightacceptedUI controls, eightHTTP/SQL replacements and eightUIlengthboundaries alsoPASS separately. Historical607 and23test populations are dated and overlapping. The finalnativefailure is BCrypt12versus11; the TLSassertion passes in this later run, while the prior585.067mscoldfailure remains unresolved in thecaseledger. No performancefix or p95 equivalence inferred.'
 if 'Current 77-case totals:' in t and 'backend' in t:pass
 if 'Consolidated 77-case outcome:' in t:v=v.replace('backend365total362 PASS2 FAIL2 SKIP','backend365total362 PASS1 FAIL2 SKIP').replace('backend365total362PASS2FAIL2SKIP','backend365total362PASS1FAIL2SKIP')
 if v!=t:
  for run in p.runs:
   if run.text:run.text=''
  if p.runs:p.runs[0].text=v
  else:p.add_run(v)
for tb in d.tables:
 for rr in tb.rows:
  if rr.cells[0].text=='Final backend relational regression':
   rr.cells[4].text='1';rr.cells[5].text='2 skips; bootstrap previously executed separately. Cost12versus11 failed. FinalTLSassertion passed; priorcoldfailure retained, no performancefix claimed.'
d.save(path)
print(json.dumps(s['final_regression']['backend']))
