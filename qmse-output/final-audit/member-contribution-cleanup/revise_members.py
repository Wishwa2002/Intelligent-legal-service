from pathlib import Path
from copy import deepcopy
from collections import Counter
import json,shutil,hashlib,subprocess,xml.etree.ElementTree as E
from docx import Document
from docx.table import Table
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches,Pt
R=Path.cwd();O=R/'qmse-output/final-audit/member-contribution-cleanup';F=R/'qmse-output/final-audit/final-report';name='SE3110_Testing_Report_GR42_Consolidated_Final';B=O/'report-before';B.mkdir(exist_ok=True)
for ext in ['docx','pdf']:
 if not (B/f'{name}.{ext}').exists():shutil.copy2(F/f'{name}.{ext}',B/f'{name}.{ext}')
D=Document(F/f'{name}.docx');P=list(D.paragraphs);T=list(D.tables);cases=json.loads((R/'qmse-output/final-audit/case-verification.json').read_text());commits=json.loads((R/'qmse-output/git-publication/evidence/member-commit-evidence.json').read_text());refs=set();changes=[]
def reference(path):
 assert (R/path).is_file(),path;refs.add(path);return path.removeprefix('qmse-output/')
def put(p,text):
 fmt=deepcopy(p.runs[0]._r.rPr) if p.runs and p.runs[0]._r.rPr is not None else None
 for e in list(p._p):
  if e.tag!=qn('w:pPr'):p._p.remove(e)
 r=p.add_run(text)
 if fmt is not None:r._r.insert(0,fmt)
def cell(c,text):
 put(c.paragraphs[0],text)
 for p in c.paragraphs[1:]:c._tc.remove(p._p)
def table_like(index,rows):
 el=deepcopy(T[index]._tbl);table=Table(el,D._body)
 while len(table.rows)>len(rows):table._tbl.remove(table.rows[-1]._tr)
 while len(table.rows)<len(rows):table._tbl.append(deepcopy(table.rows[-1]._tr))
 for row,values in zip(table.rows,rows):
  for c,text in zip(row.cells,values):cell(c,text)
 return el
blocks=[]
def para(text,style='Normal'):
 p=D.add_paragraph(text,style=style);p.paragraph_format.space_after=Pt(6);blocks.append(p._p);return p
def heading(text):return para(text,'Heading 3')
def clone(el):blocks.append(deepcopy(el))
shared='Automated execution is verified where native reports or recorded HTTP/database evidence exist; individual operator attribution has not been independently established. Git records establish the named account, revision and changed files, not exclusive manual authorship. Account-to-member associations follow the supplied group context. New QMSE tests, fixes, execution and documentation are Codex-assisted and are recorded separately from development history.'
para('9. Individual Testing Contributions','Heading 1');para(shared)
para('Component totals are taken unchanged from the 77-case ledger: C1 7/4/2, C2 9/2/1, C3 8/2/2 and C4 8/0/4 (PASS/FAIL/BLOCKED). Native suite counts are separate, overlapping populations. Reviewed development commits are retained in the published Wishwa testing ancestry; many feature commits are outside the preserved 14-commit main history. Original main, feature development, deployment-era additions and QMSE work remain distinct.')
clone(T[47]._tbl) # existing four-member count table
members=[
 {'name':'Jeyashankar J','id':'IT24103900','component':'C1','start':357,'tables':[48,49,50,51,52,53],'role':'Lawyer management, specializations, legal services, lawyer recommendation AI and workforce intelligence. C1 supplies catalogue and lawyer data supporting booking; shared report preparation is a group activity.',
  'development':'Recorded lawyer/catalogue development appears in 097ab397 and e77187ad; 0548fd56 adds recurring scheduling and workforce intelligence; b082f547 integrates lawyer mobile and matching refinements. The records use Jeyamdev and Jegatheeswaran Jeyashankar. Changed files include LawyersController.cs, LegalCatalogController.cs, RecommendationService.cs and lawyer_recommendation/agent.py. The later QMSE commits f360e4a/05359214 are AI-assisted testing additions, not evidence of independent student execution.',
  'sources':['backend/LegalService.API/Controllers/LawyersController.cs','backend/LegalService.API/Controllers/LegalCatalogController.cs','backend/LegalService.API/Services/Lawyers/RecommendationService.cs','backend/LegalService.API/Services/Workforce/WorkforceAnalysisService.cs','ai-service/lawyer_recommendation/agent.py'],
  'tests':['backend/LegalService.Tests/LawyerManagementHttpTests.cs','backend/LegalService.Tests/Member1RecommendationTests.cs','backend/LegalService.Tests/WorkforceHiringTests.cs','ai-service/tests/test_qmse_boundaries.py'],
  'results':'C1: 7 PASS / 4 FAIL / 2 BLOCKED. C103 service-price, C106 availability-toggle, C107 historical length and C112 headroom expectations remain FAIL. On 8 October 2026 the updated-key live recommendation and hiring-draft calls returned real Gemini 503 high-demand errors after 4.049 s and 6.697 s; C104/C105 remain BLOCKED. Isolated PostgreSQL checks verify 20 recent demand records, two active property lawyers and 16 future slots. Focused backend 29 PASS and deterministic AI 7 PASS include C113; they overlap earlier suites. No >90% legal accuracy or predictive forecast is claimed.',
  'defects':'Historical DEF-01–04 cover free-text/invented win rates, lawyer-user persistence, analyzer and mobile CI configuration. ac62bb76 records the lawyer-user/schema correction; 0958d693 records the mobile CI asset correction. Current validation/transport tests and the C113 retest are verified evidence; commit messages alone do not certify those original retests. Historical pricing, toggle and threshold discrepancies remain unchanged.',
  'tools':'xUnit controller/service tests; isolated Kestrel and PostgreSQL for routing, JWT and persistence; Playwright for React; pytest for deterministic AI schema, ranking and failure recovery. Experience ranking is 0–70 points, not legal accuracy.',
  'native':['qmse-output/final-audit/member1-live-retest/backend-results/c1-focused.trx','qmse-output/final-audit/member1-live-retest/ai-focused.xml','qmse-output/final-audit/member1-live-retest/provider-native.json','qmse-output/final-audit/member1-live-retest/workforce-calculation.json'],
  'screens':['qmse-output/git-publication/evidence/member1-lawyer-development.png'],
  'ci':'Historical successful Backend/Frontend/Mobile runs at 54aecccc: 37415146816 / 37415147442 / 37415146862. The actor is Wishwa2002, not evidence of Jeyashankar operating tests. C1-associated Mobile CI failure at 6d982e60 and success at 8a9b8a24 are retained in the shared audit; they do not certify the final QMSE revision.',
  'demo':'Qmse_TC_C108_DuplicateLicenseReturns409WithoutInsertion','explain':'Demonstrate duplicate-license rejection (409, no duplicate row); explain C113 safe timeout recovery and why the two genuine provider 503s cannot establish live acceptance. No further live calls are authorised by this guide.','count':'1 recorded PASS'},
 {'name':'Buddhika P. Y. H','id':'IT24103041','component':'C2','start':376,'tables':[54,55,56,57,58,59],'role':'Appointments, availability, scheduling, careers and scheduling AI. C2 owns component test planning for booking conflicts, cancellation and timezone handling; C1 catalogue and C4 identity controls support the workflow.',
  'development':'The yhprasad records d461a840 and 07af04ef change booking APIs, AppointmentServiceTests.cs, careers pages and mobile appointment tests. 2c0c4e5c adds scheduling-agent integration and classifier/slot-resolver paths. The original main-history record 2e2f764e, also yhprasad, adds database schema, seeds and ADRs. Recorded changes in 327bebf3/241db172 address login redirect and localhost/token handling; these are cross-component contributions, not exclusive C2 ownership.',
  'sources':['backend/LegalService.API/Controllers/AppointmentsController.cs','backend/LegalService.API/Services/AppointmentService.cs','backend/LegalService.API/Controllers/CareersController.cs','ai-service/app/agents/scheduling/classifier.py'],
  'tests':['backend/LegalService.Tests/AppointmentServiceTests.cs','backend/LegalService.Tests/QmseAppointmentTests.cs','backend/LegalService.Tests/CareerServiceTests.cs','frontend/tests/derived-booking.spec.ts','mobile/test/appointment_test.dart'],
  'results':'C2: 9 PASS / 2 FAIL / 1 BLOCKED. C2-01 immediate Confirmed and C2-09 historical cancellation notice expectations remain FAIL; C2-05 full scheduling-AI acceptance remains BLOCKED. Verified current-contract cancellation uses POST, returns Cancelled and releases the slot. Concurrent booking, working-hours rejection and AI-independent booking have execution evidence. The proposed 24-hour rule is tested but disabled by default; it is not an approved original requirement.',
  'defects':'Historical DEF-08–11 cover timezone, careers authorization, redirects and localhost/token handling. Existing HTTP/SQL evidence confirms the accepted cancellation-route replacement; timezone evidence records real Chromium/API comparisons. The AI-assisted local canCancel capability/UI correction is documented separately from yhprasad development. Historical failed expectations and before/after evidence are retained.',
  'tools':'xUnit for booking and careers; real isolated PostgreSQL for overlap/concurrency and persistence; Playwright for booking and careers UI; Flutter tests for appointment widgets. Relative-date helper tests are narrower than live scheduling-agent acceptance.',
  'native':['qmse-output/final-audit/debug/evidence/regression-backend-postgres.trx','qmse-output/final-audit/debug/evidence/accepted-api.json','qmse-output/historical-resolution/evidence/timezone-conflict.json'],
  'screens':['qmse-output/git-publication/evidence/member2-appointments.png','qmse-output/historical-resolution/evidence/TC-C2-04.png','qmse-output/historical-resolution/evidence/TC-C2-06.png'],
  'ci':'Shared successful Backend/Frontend/Mobile runs at 8a9b8a24: 37386601103 / 37386601420 / 37386601104. The actor is Jeyamdev. The yhprasad fb471202 scheduling-branch failures are preserved but excluded from the tested baseline; no successful retest of that excluded revision is inferred.',
  'demo':'QmseAppointmentTests','explain':'Demonstrate booking outside working hours and direct booking without AI; explain historical PUT cancellation versus the accepted POST contract, slot release and the disabled proposed notice rule.','count':'6 recorded PASS'},
 {'name':'Vithusan V','id':'IT24100360','component':'C3','start':395,'tables':[60,61,62,63,64,65],'role':'Documentation requests, uploads, clerks and document verification AI. C3 leads document-workflow test planning; integrated E2E remains shared across mobile, API, database, AI and React.',
  'development':'VTN02 record a566efa7 contains document validation/analysis, clerk management, document service tests and mobile/client integration. 587e8924 changes documentation-service seeding; 44f3f25a and 0fa65928 are distinct commits for manual request/checklist UI. Their matching subjects do not make them one commit. The same recorded history includes supervisor.py: consultation implementation is therefore shared/cross-component evidence, not automatically attributable to C4.',
  'sources':['backend/LegalService.API/Controllers/DocumentAndClerk/DocumentationRequestsController.cs','backend/LegalService.API/Controllers/DocumentAndClerk/ClerksController.cs','backend/LegalService.API/Services/DocumentAndClerk/DocumentFileService.cs','ai-service/app/agents/document_validation.py'],
  'tests':['backend/LegalService.Tests/DocumentationRequestServiceTests.cs','backend/LegalService.Tests/ClerkServiceTests.cs','backend/LegalService.Tests/QmseUploadRegressionTests.cs','backend/LegalService.Tests/QmseDocumentPostgresTests.cs','ai-service/tests/test_documents.py'],
  'results':'C3: 8 PASS / 2 FAIL / 2 BLOCKED. Of six historical failures, C3-02/03/05/06 have passing accepted current-contract replacements; C3-01 service/checklist identity and C3-04 Approved transition remain FAIL. C3-08 OCR and C3-12 full atomic workflow remain BLOCKED. The genuine spoofed-PDF failure and passing validation retest are preserved. Development file-orphan cleanup is fixed and retested on PostgreSQL; the proposed service batch remains disabled and has no HTTP/UI batch route.',
  'defects':'DEF-12 is supported by original spoof-before.trx and upload-retest.trx; the later parser/content validation and upload regressions are verified AI-assisted local work. Real PostgreSQL evidence supports file-orphan cleanup, not an atomic request-plus-three-upload HTTP workflow. DEF-13 seeding has source evidence at 587e8924; DEF-14 live/OCR acceptance remains qualified. These fixes are not personally attributed to Vithusan without operator evidence.',
  'tools':'xUnit for lifecycle, clerk and upload validation; isolated PostgreSQL for persistence/rollback and fault injection; real multipart HTTP and Flutter/React workflow evidence; deterministic Python completeness checks. Completeness arithmetic is not live legal/OCR accuracy.',
  'native':['qmse-output/completion-20261008/evidence/spoof-before.trx','qmse-output/completion-20261008/evidence/upload-retest.trx','qmse-output/final-audit/debug/evidence/regression-backend-postgres.trx','qmse-output/final-audit/debug/evidence/accepted-api.json'],
  'screens':['qmse-output/git-publication/evidence/member3-document-agent.png','qmse-output/historical-resolution/evidence/real-flutter-catalogue.png','qmse-output/historical-resolution/evidence/real-react-clerk-review.png'],
  'ci':'The retained shared successful runs at 54aecccc cover backend, frontend and mobile. No selected CI run independently establishes VTN02 as the individual test operator. Existing document/E2E and spoof failure/retest figures provide component evidence.',
  'demo':'QmseUploadRegressionTests','explain':'Demonstrate genuine PDF acceptance and spoof/mismatched MIME rejection without persistence. Explain the original spoof failure, parser fix and retest; distinguish per-attachment rollback from the still-blocked original multi-request atomic workflow.','count':'12 recorded PASS'},
 {'name':'Wijayananda W. J. W (Team Leader)','id':'IT24102275','component':'C4','start':414,'tables':[66,67,68,69,70,71],'role':'Authentication, JWT/RBAC, service requests, consultation AI and security test planning. C4 supports identity/permissions for the other components. Consultation responsibility does not establish exclusive authorship of shared AI code.',
  'development':'Original main record 56f4bbd4 under Wishwa adds registration/roles. 43f6345d changes JWT authentication and Admin authorization; 93092871 adds service-request pages and ServiceRequestServiceTests.cs; 9579cee6 changes authentication validation/health flow. 4dc9a150/3ff0d2a0 update frontend tests. Consultation supervisor history also records VTN02 (a566efa7/6b59d19); that code is not credited solely to Wijayananda.',
  'sources':['backend/LegalService.API/Authentication/Services/JwtService.cs','backend/LegalService.API/Controllers/AuthController.cs','backend/LegalService.API/Controllers/ServiceRequestsController.cs','ai-service/app/retrieval/hybrid_service.py'],
  'tests':['backend/LegalService.Tests/ServiceRequestServiceTests.cs','backend/LegalService.Tests/QmseHttpTests.cs','backend/LegalService.Tests/QmseRegistrationTests.cs','frontend/tests/auth.spec.ts','ai-service/tests/test_security.py'],
  'results':'C4: 8 PASS / 0 FAIL / 4 BLOCKED. JWT/RBAC, service requests, duplicate registration and browser logout have matching execution evidence. C4-04 prompt-injection refusal, C4-05 legal relevance, C4-08 ranking accuracy and C4-12 universal disclaimer remain full-acceptance blockers. Raw retrieval and deterministic sanitizer/provider-resilience tests do not prove live generated legal advice. The shared BCrypt cost-12 discrepancy remains separate from the C4 component count.',
  'defects':'Historical DEF-05/15 are linked to authentication source and present regression evidence; original personal retesting is not inferred. The local nosniff correction has four backend header regressions and same-six-path ZAP evidence (three missing-header instances to zero). Credential rotation remains unconfirmed; dependency findings and blocked live AI acceptance are unchanged. New QMSE security changes are Codex-assisted.',
  'tools':'xUnit isolated JWT/RBAC and service-request fixtures; Playwright login/logout and route guards; local passive ZAP; deterministic Python injection/schema/provider-failure checks. AuthSecurityTests.cs is an absent historical reference, so its claimed ten tests are not attributed or counted.',
  'native':['qmse-output/final-audit/debug/evidence/regression-backend-postgres.trx','qmse-output/final-audit/security/zap-after-metadata.json','qmse-output/final-audit/targeted-15-minute/focused-authentication.trx'],
  'screens':['qmse-output/git-publication/evidence/member4-authentication.png'],
  'ci':'Shared historical success at 54aecccc records actor Wishwa2002, which is workflow-trigger metadata rather than personal execution. Existing evidence records no run for published QMSE SHA 05359214: source push filters allow main/develop and no manual workflow_dispatch. Historical successes do not certify the local overlay.',
  'demo':'Qmse_TC_C4_09','explain':'Demonstrate missing, invalid, expired and tampered JWT rejection (401). Explain why the nosniff retest is a limited passive-scan result and why retrieval output cannot establish a universal generated-answer disclaimer.','count':'4 recorded PASS'}]
# Correct a compact historical shorthand only after verifying the file exists.
for m in members:
 for path in m['sources']+m['tests']+m['native']+m['screens']:reference(path)
for path in ['qmse-output/git-publication/evidence/member-commit-evidence.json','qmse-output/final-audit/historical-ci-index.json','qmse-output/final-audit/member-viva-guide.md','qmse-output/final-audit/reproduction.md']:reference(path)
for i,m in enumerate(members,1):
 a,b,c,ai,cmd,e=m['tables'];comp=m['component'];counts=Counter(x['status'].split('/')[-1] for x in cases if x['test_id'].startswith('TC-'+comp));m['counts']=dict(counts);m['test_ids']=[x['test_id'] for x in cases if x['test_id'].startswith('TC-'+comp)]
 para(f"9.{i} {m['name']} ({m['id']}), {comp}",'Heading 2')
 heading('Assigned Component and Responsibilities');para(m['role'])
 blocks.append(table_like(a,[['Area','Assigned scope and current evidence'],['API / services','; '.join(Path(p).name for p in m['sources'][:3])],['Automated tests','; '.join(Path(p).name for p in m['tests'])],['AI / UI integration',{'C1':'Gemini classification and deterministic eligibility/ranking; workforce capacity and human-approved hiring drafts.','C2':'Booking conflicts, availability, timezone, careers and scheduling-agent integration.','C3':'Document checklist, binary upload validation, clerk review and shared document E2E.','C4':'JWT/RBAC, service requests, consultation guardrails and security probes.'}[comp]],['Responsibility boundary','Component planning and explanation; repository/test evidence and individual execution are distinguished by the shared note above.']]))
 heading('Verified Development Contributions');para(m['development']);clone(T[c]._tbl)
 heading('Testing Activities and Test Cases');para('Cases '+(', '.join(m['test_ids']))+'. Designs and observed statuses are preserved in Sections 3–5; accepted current-contract replacements retain their original failure evidence.');clone(T[b]._tbl)
 heading('Tools and Testing Techniques');para(m['tools'])
 heading('Test Results');para(m['results'])
 heading('Defects, Fixes and Retesting');para(m['defects'])
 heading('Git and Execution Evidence');blocks.append(table_like(e,[['Evidence','Verified artifact / scope'],['Native execution','; '.join(reference(p) for p in m['native'])],['Screenshots','; '.join(reference(p) for p in m['screens'])+'; existing Section 6 figures retained.'],['Historical CI',m['ci']],['Commit provenance','git-publication/evidence/member-commit-evidence.json; rechecked author/date/paths in final-audit/member-contribution-cleanup/verified-commit-mapping.json.']]))
 heading('AI Assistance and Verification');para('The dated tool disclosures below are retained as historical declarations, not independently verified original executions. Current native reports establish only their recorded scope. Codex-assisted QMSE additions are disclosed separately; no new personal student execution is inferred.')
 ai_table=deepcopy(T[ai]._tbl);at=Table(ai_table,D._body)
 cell(at.rows[0].cells[3],'Historical disclosed check')
 for row in at.rows[1:]:cell(row.cells[3],row.cells[3].text.replace('Historical AI-use disclosure; verification outcome UNVERIFIED: ','Declared: '))
 blocks.append(ai_table)
 heading('Viva Demonstration Guide');para(m['explain'])
 command=f"dotnet test backend/LegalService.Tests/LegalService.Tests.csproj --filter 'FullyQualifiedName~{m['demo']}' --logger 'trx;LogFileName={comp.lower()}-member-reproduction.trx' --results-directory qmse-output/member-reproduction"
 m['reproduction_command']=command
 blocks.append(table_like(cmd,[['Purpose','Command / prerequisites'],['Focused automated demonstration',command],['Prerequisites and expected output','Repository root; current local test source; .NET 8 and restored dependencies. Use isolated fixtures and a new output directory. '+m['count']+' in debug/evidence/regression-backend-postgres.trx; do not aggregate with the case ledger. Full relational/environment setup: final-audit/reproduction.md. More questions: final-audit/member-viva-guide.md.']]))
 para('')
# Replace only Section 9's body range.
body=D._element.body;start=P[354]._p;end=P[433]._p;si=body.index(start);ei=body.index(end)
for element in list(body)[si:ei]:body.remove(element)
for element in blocks:
 if element.getparent() is not None:element.getparent().remove(element)
 body.insert(si,element);si+=1
# Section 2.6: clear planning roles with real file/evidence names.
for i,m in enumerate(members,1):
 cell(T[8].rows[i].cells[2],f"{m['component']} source/tests and matching native artifacts are indexed in Section 9.{i}; development commits are verified. Component assignment is planning responsibility, not a personal execution claim.")
# Section 10 matrix: five required columns, fixed portrait width, concise factual evidence.
t=T[72];t.add_column(Inches(1));widths=[.82,1.00,1.64,1.90,1.14]
headers=['Member','Component','Development evidence','Testing evidence','Personal verification']
for c,h in zip(t.rows[0].cells,headers):cell(c,h)
for i,m in enumerate(members,1):
 dev={'C1':'097ab397/e77187ad: lawyer/catalogue/matching; 0548fd56: workforce. Recorded Jeyamdev / Jeyashankar aliases.','C2':'d461a840/07af04ef/2c0c4e5c: booking, careers, scheduling. Recorded yhprasad; original-main schema at 2e2f764e.','C3':'a566efa7/587e8924/44f3f25a: documents, clerks, seeding and mobile request UI. Recorded VTN02.','C4':'56f4bbd4/43f6345d/93092871/9579cee6: roles, JWT, requests and authentication. Recorded Wishwa.'}[m['component']]
 test={'C1':'Ledger 7 PASS / 4 FAIL / 2 BLOCKED; focused 29 backend and 7 AI PASS. Two real Gemini 503s; no live acceptance.','C2':'Ledger 9 PASS / 2 FAIL / 1 BLOCKED; six QmseAppointmentTests PASS; real cancellation/timezone and booking evidence.','C3':'Ledger 8 PASS / 2 FAIL / 2 BLOCKED; 12 upload regressions PASS; genuine spoof failure/retest and PostgreSQL cleanup evidence.','C4':'Ledger 8 PASS / 0 FAIL / 4 BLOCKED; four JWT rejection cases PASS; service-request and passive security evidence.'}[m['component']]
 for c,text in zip(t.rows[i].cells,[m['name'].split(' ')[0],m['component'],dev,test,'No individual operator attestation supplied']):cell(c,text)
for column,width in zip(t.columns,widths):column.width=Inches(width)
for row in t.rows:
 for c,width in zip(row.cells,widths):
  c.width=Inches(width)
  for p in c.paragraphs:
   for r in p.runs:r.font.size=Pt(9)
# Ensure the added header matches original formatting.
new=t.rows[0].cells[-1];template=t.rows[0].cells[0]
new._tc.remove(new._tc.tcPr);new._tc.insert(0,deepcopy(template._tc.tcPr));new.width=Inches(widths[-1])
for r in new.paragraphs[0].runs:r.bold=True;r.font.color.rgb=__import__('docx').shared.RGBColor(255,255,255)
put(P[434],shared+' Personal verification in the matrix reports the available attestation, not a judgement of effort. No percentages are assigned.')
put(P[435],'Development provenance is linked to the original Wishwa repository and the published testing ancestry; account mappings follow the supplied group context. Original main retains 14 commits, while the published testing branch retains 97, including 83 beyond main. Commit authors/dates are preserved. Codex-assisted QMSE additions f360e4a/05359214 and subsequent uncommitted work remain separate from member development and operator attribution. See the verified commit mapping and the existing Figures 6.23–6.26.')
# Existing shared allocation paragraph stays untouched.
cell(T[74].rows[15].cells[2],'VERIFIED publication/ancestry and recorded author/date/file mappings. Sections 9–10 separate development records, native execution and operator attribution. Historical CI remains separate; the final testing SHA has no observed run.')
cell(T[74].rows[17].cells[2],'Individual operator attribution and viva understanding require member attestation. Reproducible component demonstrations and evidence are linked in Section 9 and final-audit/member-viva-guide.md; no personal confirmation is assumed.')
D.save(F/f'{name}.docx')
(O/'member-evidence-verification.json').write_text(json.dumps(members,indent=2));(O/'referenced-artifacts.json').write_text(json.dumps(sorted(refs),indent=2))
(O/'change-scope.json').write_text(json.dumps({'changed_sections':['2.6','9.1–9.4','10','Appendix A rows15/17'],'ledger_sha256_before':hashlib.sha256((R/'qmse-output/final-audit/case-verification.json').read_bytes()).hexdigest(),'no_application_changes':True,'no_new_tests':True,'original_figures':43,'historical_ai_disclosures_retained':True},indent=2))
print('Scoped report revision created; references verified:',len(refs),'figures:',len(D.inline_shapes))
