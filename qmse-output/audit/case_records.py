from pathlib import Path
import json
from docx import Document
R=Path(__file__).resolve().parents[2];O=R/'qmse-output';doc=Document('/Users/jeyam/Downloads/SE3110_Testing_Report_GR42.docx');records=[]
for table in doc.tables:
 h=[c.text for c in table.rows[0].cells]
 if h[:2]!=['Test ID','Feature / Type']:continue
 for row in table.rows[1:]:
  c=[x.text for x in row.cells];records.append(dict(test_id=c[0],feature=c[1],environment='Historical original environment; current execution not independently mapped',preconditions=c[2],exact_inputs=c[3],steps=c[3],expected=c[4],observed='Historical claim (unverified): '+c[5],status='HISTORICAL/UNVERIFIED' if c[6]=='PASS' else 'BLOCKED',evidence=['qmse-output/audit/original-report-text.txt'],limitations='Original source/file reference is not execution evidence.'))
M={
'TC-C107':('FAILED','requirement strings x repeated 2,3,9,10,1000,1001,4000,4001 characters','Current schema accepts 3–4000, including 9 and 1001; rejects 2/4001. Original reported boundary conflicts.','ai','test_TC_C107_current_requirement_length','No approved SE3090 boundary supplied; current-contract tests pass.'),
'TC-C108':('VERIFIED','Admin JWT; unique email updated@example.test; license bar-1; existing license BAR-1','HTTP 409; one lawyer remains. Input field corrected to LicenseNumber.','backend','Qmse_TC_C108_DuplicateLicenseReturns409WithoutInsertion','EF InMemory HTTP fixture; relational unique index separately reviewed.'),
'TC-C109':('VERIFIED','Customer synthetic JWT; POST /api/lawyers using valid fixture Payload()','HTTP 403; current NonAdminsCannotManageLawyersOrSpecializations Customer case passes.','backend','NonAdminsCannotManageLawyersOrSpecializations','Isolated actual controller routing/JWT validation; fixture startup is not production Program.cs.'),
'TC-C110':('VERIFIED','Admin JWT; SpecializationId=9999; otherwise valid Payload()','HTTP 400; lawyer count remains one.','backend','Qmse_TC_C110_UnknownSpecializationReturns400WithoutInsertion','InMemory HTTP fixture; no actual invalid FK inserted.'),
'TC-C111':('VERIFIED','Property candidate recorded experience [-1,0,70,71,100]; Active, one Practice Area','Only experience 70 and 0 returned; scores [70,0], inside [0,100]. Current score is experience, not weighted formula.','ai','test_TC_C111_current_experience_score_boundaries','Classifier stub; no live model; extremes refer to current implementation.'),
'TC-C112':('FAILED','active=2, slots=100, demand=81/80/79, default rules (headroom 19/20/21%)','All assess WATCH; no below-20% automatic drafting trigger in current rules.','backend','Qmse_TC_C112_CurrentCapacityRulesAtReportedHeadroom','Current-contract assertions pass; reported expectation is unsupported; no live drafting call.'),
'TC-C113':('VERIFIED','POST /lawyer-recommendations; requirement=Property dispute; mocked graph raises TimeoutError','HTTP 503 with generic error, no private synthetic detail; subsequent /health returns 200. Independent direct booking test passes without AI.','ai','test_TC_C113_mock_timeout_returns_safe_503_then_health_recovers','Mocked timeout, not actual 10-second Gemini wait; no simultaneous full-platform recovery experiment.'),
'TC-C2-09':('FAILED','Fixed appointment 2030-01-14 10:00 Asia/Colombo; synthetic clock T-1439/T-1440/T-1441 minutes','All cancellations succeed, status Cancelled and slot freed. Original under-24-hour rejection expectation fails.','backend','Qmse_TC_C2_09_CancellationOnBothSidesOf24Hours','Service fixture uses fixed test clock; no approved notice rule available.'),
'TC-C2-10':('VERIFIED','Two Task.WhenAll attempts for same 2030-01-14 10:00–10:30 slot; isolated PostgreSQL','One succeeds; one raises 409 conflict; one persisted occupancy.','backend','MigrationPreservesHistoryAndConcurrentMutationHasOneWinner','Actual service/database concurrency, not two external HTTP POSTs; returned success is not asserted as HTTP 201.'),
'TC-C2-11':('VERIFIED','Working schedule 09:00–12:00; try derived slot 08:00–08:30 and 20:00–20:30','Service ApiException 409; no appointment row. Report expected 400 differs; rejection requirement is satisfied at service scope.','backend','Qmse_TC_C2_11_BookingOutsideWorkingHoursRejected','Fixture service calls; report working-hours setup corrected to current source fixture.'),
'TC-C2-12':('VERIFIED','No AI client/service registered; keys synthetic; derived slot 2030-01-14 10:00–10:30','Direct AppointmentService booking succeeds with Requested status; one appointment persists.','backend','Qmse_TC_C2_12_DirectBookingWorksWithoutAiDependency','Service decoupling evidence; no full running-platform outage experiment.'),
'TC-C3-09':('VERIFIED','Synthetic PDF-header bytes sized 10,485,760 and 10,485,761; request 1','10 MiB accepted; 10 MiB+1 byte ArgumentException, zero file rows.','backend','Qmse_TC_C3_09_ExactTenMiBBoundary','Service/in-memory fixture; exact binary MiB boundary; dummy padded content is not a realistic 10 MiB document.'),
'TC-C3-10':('VERIFIED','CreateRequestAsync customerId=42, ServiceId=9999, DocumentType=Test','ArgumentException before insertion; no DocumentationRequest rows.','backend','Qmse_TC_C3_10_UnknownServiceRejectedBeforeInsert','Service validation evidence, not external HTTP 400/404 response.'),
'TC-C3-11':('VERIFIED','Synthetic request 12 PENDING; Customer JWT; PUT /api/documentation-requests/12/status with COMPLETED','HTTP 403 and request status remains PENDING. Correct current status route replaces nonexistent /clerks/requests/approve.','backend','Qmse_TC_C3_11_CustomerCannotApproveDocumentation','Isolated actual HTTP controller; no live human-clerk workflow.'),
'TC-C3-12':('BLOCKED','Three-file attach failure after request creation','No application-level atomic multi-file filing/rollback operation established; no transaction workflow executed.','audit','report-audit.md','Create-request and upload are separate operations; InMemory cannot prove relational rollback.'),
'TC-C4-09':('VERIFIED','Protected lawyer POST with expired token (T-2 days issued, T-1 day expired); also missing/invalid/tampered controls','All four produce HTTP 401; key and stack trace absent in response.','backend','Qmse_TC_C4_09_JwtAuthenticationRejectsMissingInvalidExpiredAndTampered','Fixture token lifetime validation; current expiry is configuration-driven, not universally 24 hours.'),
'TC-C4-10':('VERIFIED','POST /api/auth/signup fullName=Duplicate,email=A@EXAMPLE.TEST,password=SyntheticPass123!,role=Customer; a@example.test exists','HTTP 400; exactly one existing matching User row on temporary PostgreSQL.','backend','Qmse_TC_C4_10_DuplicateRegistrationLeavesOneUser','Synthetic accounts only; current signup route corrected from /register.'),
'TC-C4-11':('VERIFIED','Customer JWT; POST /api/lawyer-recommendations/{synthetic GUID}/approve','HTTP 403 before service action. Current route replaces nonexistent /agent-workflows/approve-lawyer.','backend','Qmse_TC_C4_11_CustomerCannotApproveLawyerWorkflow','Authorization precedes nonexistent-workflow lookup; not a fully seeded awaiting-approval workflow experiment.'),
'TC-C4-12':('BLOCKED','Ten varied legal questions with expected non-privilege disclaimer','Live consultation responses not executed; no ConsultationResponse.disclaimer schema found.','audit','report-audit.md','Requires approved live input, provider configuration and confirmed disclaimer contract.'),
'TC-C3-07':('FAILED','32 inert ASCII bytes: MZ inert synthetic non-PDF bytes; sample.pdf; application/pdf; synthetic request 1','Upload accepted; expected ArgumentException not thrown. Fresh rejection test fails.','backend','Qmse_DEF12_SpoofedPdfMustBeRejected','Service-level spoof acceptance, not code execution; no actual malware used.')}
P={
'TC-C107':'Pydantic request schema instantiated locally; no provider call',
'TC-C108':'Admin HTTP fixture; one existing lawyer with LicenseNumber BAR-1',
'TC-C109':'Seeded isolated HTTP fixture; authenticated Customer role',
'TC-C110':'Admin HTTP fixture; SpecializationId 9999 absent',
'TC-C111':'Python matching node; catalog and classifier stubbed',
'TC-C112':'Workforce service; default configuration; synthetic capacity/demand',
'TC-C113':'FastAPI TestClient; recommendation graph mocked to raise TimeoutError',
'TC-C2-09':'AppointmentService; fixed test clock; existing appointment and slot',
'TC-C2-10':'Dedicated PostgreSQL; existing recurring schedule; two concurrent service calls',
'TC-C2-11':'AppointmentService fixture; working schedule 09:00–12:00',
'TC-C2-12':'AppointmentService constructed without any AI client/service',
'TC-C3-07':'DocumentFileService; seeded request 1; extension/MIME/size checks; no magic-byte check',
'TC-C3-09':'DocumentFileService; seeded request 1; independent database per size input',
'TC-C3-10':'DocumentationRequestService; service 9999 absent',
'TC-C3-11':'Actual HTTP fixture; request 12 PENDING; Customer role',
'TC-C3-12':'Required atomic multi-file operation/transaction not established; no execution',
'TC-C4-09':'Actual HTTP fixture; protected lawyer write; synthetic JWT configuration',
'TC-C4-10':'Dedicated PostgreSQL HTTP fixture; existing user a@example.test',
'TC-C4-11':'Actual HTTP fixture; Customer role; synthetic nonexistent workflow GUID',
'TC-C4-12':'Live provider/input/disclaimer contract unavailable; no execution'}
for r in records:
 if r['test_id'] not in M:continue
 status,inputs,observed,layer,case,limit=M[r['test_id']];r['preconditions']=P[r['test_id']];r.update(status=status,environment='macOS ARM64 isolated fixtures; EF InMemory unless PostgreSQL explicitly stated; synthetic/mocked AI',exact_inputs=inputs,steps='Execute '+case+' using command in corresponding test-results execution JSON.',observed=observed,limitations=limit,evidence=[f'qmse-output/evidence/backend/backend-final.trx' if layer=='backend' else 'qmse-output/evidence/ai/pytest-final.xml' if layer=='ai' else 'qmse-output/audit/report-audit.md'],automation_case=case)
(O/'test-results/case-verification.json').write_text(json.dumps(records,indent=2));print(collections.Counter(r['status'] for r in records) if False else {s:sum(r['status']==s for r in records) for s in ['VERIFIED','FAILED','BLOCKED','HISTORICAL/UNVERIFIED']})
