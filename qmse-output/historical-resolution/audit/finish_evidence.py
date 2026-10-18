from pathlib import Path
import json,hashlib,shutil,collections,subprocess
R=Path.cwd();O=R/'qmse-output/historical-resolution';I=json.load(open(O/'audit/49-case-inventory.json'));N={x['test_id']:x for x in json.load(open(O/'test-results/new-case-verification.json'))};S=json.load(open(O/'test-results/summary.json'))
files=['backend/LegalService.Tests/HistoricalCaseVerificationTests.cs','backend/LegalService.Tests/historical_api_replay.py','frontend/tests/historical-acceptance.spec.ts','frontend/historical.playwright.config.ts','mobile/test/historical_cases_test.dart','ai-service/tests/test_historical_acceptance.py']
manifest=[]
for f in files:
 p=O/'source-snapshot'/f;p.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(R/f,p);manifest.append({'source_path':f,'snapshot':str(p.relative_to(R)),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'authorship':'AI-assisted new local test overlay; not attributed personally, not committed/pushed.'})
(O/'audit/source-overlay.json').write_text(json.dumps(manifest,indent=2))
paths={
'C1':['backend/LegalService.API/Services/Lawyers/RecommendationService.cs','backend/LegalService.API/Services/Workforce/WorkforceAnalysisService.cs','backend/LegalService.API/Services/Workforce/HiringSuggestionService.cs','frontend/src/pages/admin/LawyersPage.tsx'],
'C2':['backend/LegalService.API/Services/AppointmentService.cs','backend/LegalService.API/Services/CareerService.cs','frontend/src/pages/admin/LawyerMatchingPage.tsx','ai-service/app/api/routes/scheduling_routes.py'],
'C3':['backend/LegalService.API/Controllers/DocumentAndClerk','backend/LegalService.API/Services/DocumentAndClerk','ai-service/app/services/document_and_clerk/document_service.py'],
'C4':['backend/LegalService.API/Authentication','frontend/src/pages/StaffLoginPage.tsx','ai-service/app/agents/supervisor.py','ai-service/app/retrieval/hybrid_service.py'],
'BK':['backend/LegalService.API/Authentication/Services/PasswordService.cs','backend/LegalService.API/Controllers','backend/LegalService.API/Services'],
'DB':['backend/LegalService.API/Data/ApplicationDbContext.cs','backend/LegalService.API/Migrations'],
'FE':['frontend/src/pages/admin/LawyersPage.tsx','frontend/src/pages/admin/LawyerMatchingPage.tsx','frontend/src/api/apiClient.ts','frontend/src/App.tsx'],
'MOB':['mobile/lib/models/lawyer.dart','mobile/lib/screens/appointments/lawyers_screen.dart','mobile/lib/auth/register_screen.dart','mobile/lib/services/api_client.dart'],
'E2E':['mobile/lib/screens/document_and_clerk/services/services_catalog_screen.dart','backend/LegalService.API/Controllers/DocumentAndClerk/DocumentationRequestsController.cs','frontend/src/pages/clerk/ClerkCasesPage.tsx','ai-service/app/api/routes/component_routes.py']}
reviewed=[]
for x in I:
 ps=paths[x['component']]
 for p in ps:assert (R/p).exists(),p
 n=N[x['test_id']];reviewed.append({**x,'reviewed_current_implementation':ps,'executed_matching_test_or_blocker':n['matching_automated_test'],'current_verification_status':n['status'],'new_evidence':n['evidence'],'full_acceptance_missing_evidence':n['observed'] if n['status']=='BLOCKED' else 'None for stated replay scope; limitations recorded in case verification JSON.'})
(O/'audit/49-case-reviewed-inventory.json').write_text(json.dumps(reviewed,indent=2));lines=['# Reviewed 49-case inventory','','The initial before-execution inventory is preserved. Paths below exist; execution evidence or exact full-acceptance blocker supersedes candidate test names. Historical member assignments are not personal authorship proof.','','| ID | Component/responsibility | Original expected result | Current implementation | Matching replay / blocker | Current status | Evidence / remaining gap |','|---|---|---|---|---|---|---|']
for x in reviewed:
 values=[x['test_id'],x['component']+'; '+x['assigned_responsibility'],x['expected'],'; '.join(x['reviewed_current_implementation']),x['executed_matching_test_or_blocker'],x['current_verification_status'],'; '.join(x['new_evidence'])+'; '+str(x['full_acceptance_missing_evidence'])]
 lines.append('| '+' | '.join(str(v).replace('|','/').replace('\n',' ') for v in values)+' |')
(O/'audit/49-case-reviewed-inventory.md').write_text('\n'.join(lines)+'\n')
allocation={
'Jeyashankar':['TC-BK-03','TC-BK-06','TC-FE-01','TC-FE-05','TC-MOB-01','TC-MOB-02'],
'Buddhika':['TC-BK-02','TC-BK-07','TC-DB-02','TC-FE-02','TC-MOB-04','TC-E2E-01','TC-E2E-07'],
'Vithusan':['TC-DB-01','TC-DB-03','TC-E2E-02','TC-E2E-03','TC-E2E-04','TC-E2E-05','TC-E2E-06'],
'Wijayananda':['TC-BK-01','TC-BK-04','TC-BK-05','TC-FE-03','TC-FE-04','TC-MOB-03','TC-MOB-05']}
assert len(set(sum(allocation.values(),[])))==27
lines=['# Proposed shared responsibility allocation','','This is a proposal for reviewing and reproducing 27 shared cases. It is not an assertion of past personal effort, Git authorship or AI test ownership. All original integrated E2E steps require cross-member collaboration.','','| Member / coordinator | Cases | Observed new status totals |','|---|---|---|']
for m,ids in allocation.items():lines.append('| '+m+' | '+', '.join(ids)+' | '+str(dict(collections.Counter(N[i]['status'] for i in ids)))+' |')
lines+=['','Jeyashankar: confirm lawyer/card/fee/current model expectations and API filtering contract.','Buddhika: confirm appointment statuses, cancellation verb, timezone input conversion and mobile workflow mapping.','Vithusan: confirm original service IDs, required bundles, approval states, migration/table claim and ACID transaction boundary.','Wijayananda: confirm password cost requirement, JWT claim naming, return URL and storage mechanism; obtain legal-expert-labelled retrieval cases with the group.','All members: inspect the AI-assisted source, confirm ownership disclosures, reproduce assigned cases, approve requirement discrepancies, and complete native-device/live-AI/individual demonstrations. No percentage is invented.']
(O/'audit/shared-responsibility-proposal.md').write_text('\n'.join(lines)+'\n')
# Existing requirement/spec and original group history reused with provenance, no content mutation.
(O/'audit/requirements-and-final-audit.md').write_text('''# Requirements and final audit

Official SE3110 specification was read in full. The same integrated SE3090 application is tested; unit/API/PG/React/Flutter/AI tools and mandatory prior security/performance evidence remain supplied. Original final 78-page report, assignment PDF and case ledger hashes are preserved in input-baseline.json.

The available SE3090 Version 3.0 consolidated report is a requirements reference, not independently proven formal approval. Query 10–1000, 20% workforce headroom and 24-hour cancellation rules remain unresolved as previously traced. No behaviour was changed. ACID/no-orphan requirements do not establish an atomic three-file HTTP operation; TC-C3-12 remains blocked.

New report-expectation mismatches include BCrypt historical cost 12 versus 11; JWT claim names; unsupported query/route names; Requested versus Confirmed; absent Price/card rating/availability controls; current service-1 checklist mapping; PENDING/ASSIGNED/COMPLETED versus historical PendingChecklist/Approved; and three-of-four completeness 75% versus 50%. These require member/reference confirmation before changing assertions or product rules. New failure counts are not confirmed product-defect counts.

Native diagnostic disclaimer assertion inspects raw retrieved corpus text, not a generated consultation. Its failure cannot establish final-answer disclaimer behaviour. Deterministic date, injection isolation and RRF passes do not complete live acceptance.

One new configured live model probe returned HTTP 503 in 7.324 seconds. Previous attempt returned 504. Cumulative authorised calls: 2/8; successful model outputs, token usage and estimated cost unavailable. No further provider calls were made.

Prior alternate Affidavit five-component workflow remains verified. Original Deed/Approved workflow is incomplete; production Neon data was never accessed. Native Flutter device, accessibility conformance, full live Golden Cases, approved legal relevance labels, individual member explanation and branch CI remain outstanding.

New sources are an uncommitted local AI-assisted overlay, delivered separately. Published original group branch remains approved SHA 05359214df52fa743b234e1d77e6671f57c14dea. No push, deployment, production mutation, source authorship rewrite or invented personal responsibility occurred.
''')
print('Source snapshots, reviewed inventory and shared allocation written.')
