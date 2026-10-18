# Failure classification

Original 30 FAIL outcomes are preserved. Classification does not promote results to PASS or declare all discrepancies product defects.

Counts: {'B': 18, 'C': 10, 'UNDETERMINED': 2}. No demonstrably broken final fixtures identified in the 30-case population; earlier failed setup attempts were already corrected and retained separately.

V3 traceability correction: Component 2 endpoint table does describe 24-hour business notice. This corrects the earlier "no restriction found" statement, but does not establish formal approval or precedence over the current lifecycle.

| Case | Component | Category | Justification / recommended action |
|---|---|---|---|
| TC-BK-01 | BK | B | PasswordService uses BCrypt default cost 11; functional checks pass. V3 Section 14 explicitly states 12, but approval/version authority is unconfirmed. Confirm cost 12; if approved make work factor explicit and rerun hash/verification/security tests. |
| TC-BK-03 | BK | C | BarNumber is not a field of the current create DTO; LicenseNumber is required and its empty-field control returns 400. Retain obsolete BarNumber failure; replacement tests need acceptance of the current LicenseNumber contract. |
| TC-BK-04 | BK | B | JWT is valid with role/name/email URI claims; historical sub and plain email claim names differ from V3 Section 14. Approve compatibility claim contract before adding aliases; preserve URI claims used by authorization. |
| TC-BK-06 | BK | C | specializationId is unbound; implemented specialization accepts name/ID and control returns three. Use current query parameter only after contract acceptance; retain original ignored-query result. |
| TC-BK-07 | BK | C | Historical bridge classifier route returns 404 on both services; current scheduling is session-based. Replace route-level scenario with current agent contract; full provider response remains separately blocked. |
| TC-DB-01 | DB | UNDETERMINED | One isolated cold TLS connection took 349.529 ms. Original target was Neon connection, while NFR-01 defines API p95; root cause cannot be assigned from one different-host observation. Confirm environment and connection metric; rerun controlled cold/warm measurements after approving scope, without accessing production. |
| TC-DB-03 | DB | C | Historical fixed eleven-table schema is obsolete; current fifteen EF migrations create 33 business tables plus history. Use migration completeness and relationships as current acceptance; preserve historical table-count failure. |
| TC-FE-01 | FE | B | Current catalogue card lacks fee/book elements; V3 FR-05 describes billable tariffs but UI placement/current catalogue responsibilities are unresolved. Confirm tariff model and booking entry point before UI/business changes. |
| TC-FE-02 | FE | B | No-slot approval is disabled but historical inline error/alert is absent; final semantic rerun confirms this after correcting setup. Confirm whether guidance plus disabled approval satisfies UX contract; add explicit inline error only if required. |
| TC-FE-03 | FE | B | Unauthenticated user reaches login; historical return-URL query is absent. V3 route guarding does not establish exact redirect query. Confirm return-to-origin UX; keep authentication protection result separate. |
| TC-MOB-02 | MOB | B | Current card/model renders experience/license, not rating. Historical model differs; no approved rating field identified. Confirm rating provenance/schema before adding fabricated ratings. |
| TC-MOB-03 | MOB | B | Existing validation blocks invalid password network calls; button remains enabled and phone field is absent. Confirm required signup fields and disabled-button UX; do not fabricate a phone input. |
| TC-MOB-05 | MOB | B | Token roundtrip succeeds under SharedPreferences auth_token; V3 secure-storage narrative and historical jwt key differ. Confirm encrypted storage/platform contract; migrate only with platform regression coverage. |
| TC-E2E-02 | E2E | B | Request creation returns 201/requestId, not a separate tracking number. Whether requestId is sufficient tracking is unresolved. Confirm tracking identifier presentation, not a new invented field. |
| TC-E2E-03 | E2E | B | Actual persisted status PENDING differs from PendingChecklist; V3 workflow labels differ from current enum. Confirm canonical state mapping before migration or UI aliases. |
| TC-E2E-04 | E2E | C | Historical FastAPI checklist endpoint returns 404; current agent/session API is different. Accept current endpoint revision and design replacement invocation, preserving live-provider limits. |
| TC-E2E-06 | E2E | B | Actual clerk review/assignment works; available transitions lack literal Approve/Approved. FR-13 describes approval, so COMPLETED equivalence needs confirmation. Confirm whether COMPLETED legally represents approval and required audit identity; do not force rows. |
| TC-C103 | C103 | B | Price is ignored, absent from model/DB; V3 FR-05 and component tariff description explicitly differ. Approval remains unresolved. Obtain tariff units/duration/approval; then implement coherent model/migration/API/UI rather than just adding a response field. |
| TC-C106 | C106 | B | Historical catalogue availability switch absent. FR-03 active status exists but is not automatically appointment availability. Confirm actor/page and distinction between active status and bookable availability. |
| TC-C107 | C107 | B | Current schema 3–4000 differs from report 10–1000; V3 contains no explicit approved ten-thousand boundary. Confirm query length; preserve existing documented bounds. |
| TC-C112 | C112 | B | V3 Stage 6 says below 20% headroom, later implemented configurable WATCH/CONCERN rules differ. Confirm authoritative workforce revision; keep configurable/human-gated rules until then. |
| TC-C2-01 | C2 | B | Creation produces Requested, with later confirm transition; historical immediate Confirmed differs. Confirm pending request/approval lifecycle instead of bypassing confirmation. |
| TC-C2-03 | C2 | C | Historical PUT cancellation returns 405; actual POST cancel returns 200 and releases slot. Accept current HTTP verb for replacement regression, preserve PUT failure. |
| TC-C2-09 | C2 | B | All 1439/1440/1441-minute cancellations succeed. Earlier traceability said no rule, but V3 component endpoint table explicitly mentions 24-hour business notice. Formal authority/version conflict remains. Ask whether that V3 statement is approved; no new restriction introduced. |
| TC-C3-01 | C3 | B | Seeded service 1 is Contract Review with three prerequisites, not historical Deed/four; current request semantics are genuine. Confirm service identifiers and exact statutory fixture before asserting checklist count. |
| TC-C3-02 | C3 | C | Historical POST /api/document-files absent; current per-request upload returns 201, links real PDF. Accept current route and Created status for replacement upload/link verification. |
| TC-C3-03 | C3 | C | Old upload route returns 404; same 14 MiB on current route is 400 with no added row. Size rule is enforced. Retain old-route failure; use existing current-route size/no-mutation control after contract acceptance. |
| TC-C3-04 | C3 | C | Historical approval subroute returns 404. Current status-update endpoint exists; literal Approved workflow remains unresolved separately. Retire obsolete subroute scenario only after current contract acceptance; do not infer approval equivalence. |
| TC-C3-05 | C3 | UNDETERMINED | Current four-item bundle with three provided yields 75% and flags deed. Historical input says only without Title Deed, not full supplied set/weights. Cannot prove an arithmetic defect or invalid original fixture. Recover exact original checklist/provided documents and scoring definition before changing 50% expectation. |
| TC-C3-06 | C3 | C | Department subroute absent; PUT clerk with contact/department updates correctly. Accept current complete update DTO/route for replacement scenario. |

## TC-BK-01

Expected: Hash length >= 60; VerifyPassword returns true

Observed: Hash length 60, valid password true, wrong password false. Actual BCrypt cost is 11; explicit historical cost-12 precondition assertion fails. Cost-12 product approval has not been established. Earlier functional-only pass is preserved.

Source of expectation: SE3110 historical report case TC-BK-01; original preconditions/inputs retained in historical-resolution ledger; available SE3090 Version 3.0 is a reference with approval unconfirmed

Implementation/execution evidence: backend/LegalService.API/Authentication/Services/PasswordService.cs; qmse-output/historical-resolution/evidence/password.trx; qmse-output/historical-resolution/evidence/password-cost.trx; qmse-output/historical-resolution/evidence/password-cost.log

Assigned review responsibility: Shared: propose Wijayananda authentication/Jeyashankar lawyer APIs/Buddhika scheduling (historical assignment/proposal; personal authorship unconfirmed)

Decision: V3 Section 14 BCrypt cost 12

## TC-BK-03

Expected: HTTP 400 with field error

Observed: {'http': 201, 'body': {'lawyerId': '69356139-46a9-4719-b438-4ef11c73f32e', 'name': 'Synthetic Empty Bar', 'email': 'qmse-history-empty-bar@example.test', 'phoneNumber': '', 'qualification': 'Synthetic', 'experience': 5, 'licenseNumber': 'QMSE-BAR-CONTROL', 'profileDescription': '', 'status': 'Active', 'specializations': [{'specializationId': 3, 'name': 'Corporate & Commercial Law', 'description': 'Business registration, corporate governance, commercial contracts, and compliance.'}]}}

Source of expectation: SE3110 historical report case TC-BK-03; original preconditions/inputs retained in historical-resolution ledger; available SE3090 Version 3.0 is a reference with approval unconfirmed

Implementation/execution evidence: backend/LegalService.API/DTOs/Requests/CreateLawyerRequest.cs; qmse-output/historical-resolution/evidence/historical-http.json

Assigned review responsibility: Shared: propose Wijayananda authentication/Jeyashankar lawyer APIs/Buddhika scheduling (historical assignment/proposal; personal authorship unconfirmed)

Decision: Confirm renamed BarNumber/LicenseNumber API contract

## TC-BK-04

Expected: HTTP 200 + JWT with sub, email, role

Observed: {'http': 200, 'claim_names': ['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier', 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress', 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role', 'exp', 'iss', 'aud']}

Source of expectation: SE3110 historical report case TC-BK-04; original preconditions/inputs retained in historical-resolution ledger; available SE3090 Version 3.0 is a reference with approval unconfirmed

Implementation/execution evidence: backend/LegalService.API/Authentication/Services/JwtService.cs; qmse-output/historical-resolution/evidence/historical-http.json

Assigned review responsibility: Shared: propose Wijayananda authentication/Jeyashankar lawyer APIs/Buddhika scheduling (historical assignment/proposal; personal authorship unconfirmed)

Decision: V3 Section 14 sub/email/role claim names

## TC-BK-06

Expected: HTTP 200, array of 3

Observed: {'http': 200, 'count': 5}

Source of expectation: SE3110 historical report case TC-BK-06; original preconditions/inputs retained in historical-resolution ledger; available SE3090 Version 3.0 is a reference with approval unconfirmed

Implementation/execution evidence: backend/LegalService.API/Controllers/LawyersController.cs; qmse-output/historical-resolution/evidence/historical-http.json

Assigned review responsibility: Shared: propose Wijayananda authentication/Jeyashankar lawyer APIs/Buddhika scheduling (historical assignment/proposal; personal authorship unconfirmed)

Decision: Confirm current specialization query contract

## TC-BK-07

Expected: HTTP 200 with normalised ISO timestamps

Observed: Historical POST /api/ai/scheduling/classify returns 404 on both actual ASP.NET API and FastAPI. No normalized timestamp returned.

Source of expectation: SE3110 historical report case TC-BK-07; original preconditions/inputs retained in historical-resolution ledger; available SE3090 Version 3.0 is a reference with approval unconfirmed

Implementation/execution evidence: ai-service/app/main.py; qmse-output/historical-resolution/evidence/additional-http.json

Assigned review responsibility: Shared: propose Wijayananda authentication/Jeyashankar lawyer APIs/Buddhika scheduling (historical assignment/proposal; personal authorship unconfirmed)

Decision: Confirm current scheduling API revision

## TC-DB-01

Expected: true; connected in < 200 ms

Observed: Actual EF CanConnectAsync true with SSL Mode=Require; first connection 349.529 ms exceeds historical <200 ms target. One cold connection, not API p95/load performance.

Source of expectation: SE3110 historical report case TC-DB-01; original preconditions/inputs retained in historical-resolution ledger; available SE3090 Version 3.0 is a reference with approval unconfirmed

Implementation/execution evidence: backend/LegalService.Tests/HistoricalCaseVerificationTests.cs; qmse-output/historical-resolution/evidence/postgres-setup.trx; qmse-output/historical-resolution/evidence/postgres-setup.log

Assigned review responsibility: Shared: propose Buddhika constraints/Jeyashankar migrations/Vithusan data integrity (historical assignment/proposal; personal authorship unconfirmed)

Decision: Approve isolated-host connection threshold versus API p95

## TC-DB-03

Expected: All applied; 11 tables created

Observed: {'tables': 34, 'table_names': ['AgentSessionStates', 'AgentSteps', 'AgentWorkflows', 'AppointmentStatusHistories', 'Appointments', 'ApprovalDecisions', 'AuditLogs', 'AvailabilitySlots', 'Careers', 'Clerks', 'DocumentFiles', 'DocumentationRequests', 'DocumentationServices', 'ExecutionSummaries', 'HiringSuggestionWorkflows', 'JobApplications', 'LawyerAvailabilities', 'LawyerLegalServices', 'LawyerRecommendationWorkflows', 'LawyerSpecializations', 'LawyerUnavailabilities', 'LawyerWorkingSchedules', 'Lawyers', 'LegalServices', 'PracticeAreaWorkforceSettings', 'Roles', 'ServiceRequests', 'Specializations', 'ToolExecutions', 'UserRoles', 'Users', 'ValidationResults', 'WorkforceDemoStates', '__EFMigrationsHistory'], 'applied_migrations': ['20260922093339_InitialCreate', '20260922132300_FixAuditLogUserId', '20260927120000_AddLawyerRecommendationWorkflows', '20260929051536_SyncCurrentDatabaseSchema', '20261003065251_AddMissingCurrentSchemaColumns', '20261003090000_FixLegacyUserRoleIds', '20261003233848_AddWorkforceHiringIntelligence', '20261003235618_AllowUnlinkedLawyerProfiles', '20261004061310_AddWorkforcePlanningSettings', '20261004080145_AddRecurringLawyerScheduling', '20261004095244_BackfillMissingLawyerSchedules', '20261004151111_AddFrontDeskMatchingIntake', '20261004165105_AddLawyerInitialPasswordChange', '20261006120000_PrepareDeploymentStorage', '20261008110000_CompleteAppointmentSchema']}

Source of expectation: SE3110 historical report case TC-DB-03; original preconditions/inputs retained in historical-resolution ledger; available SE3090 Version 3.0 is a reference with approval unconfirmed

Implementation/execution evidence: backend/LegalService.API/Migrations; qmse-output/historical-resolution/evidence/migrate.log; qmse-output/historical-resolution/evidence/migration-tables.log; qmse-output/historical-resolution/evidence/migration-history.log

Assigned review responsibility: Shared: propose Buddhika constraints/Jeyashankar migrations/Vithusan data integrity (historical assignment/proposal; personal authorship unconfirmed)

Decision: Confirm current schema baseline instead of fixed eleven tables

## TC-FE-01

Expected: Name, fee and book button in DOM

Observed: {'failure': 'Error: \x1b[2mexpect(\x1b[22m\x1b[31mlocator\x1b[39m\x1b[2m).\x1b[22mtoBeVisible\x1b[2m(\x1b[22m\x1b[2m)\x1b[22m failed\n\nLocator: getByText(/25,?000/)\nExpected: visible\nTimeout: 1500ms\nError: element(s) not found\n\nCall log:\n\x1b[2m  - Expect "toBeVisible" getByText(/25,?000/) with timeout 1500ms\x1b[22m\n\x1b[2m  - waiting for getByText(/25,?000/)\x1b[22m\n', 'pageErrors': []}

Source of expectation: SE3110 historical report case TC-FE-01; original preconditions/inputs retained in historical-resolution ledger; available SE3090 Version 3.0 is a reference with approval unconfirmed

Implementation/execution evidence: frontend/tests/historical-acceptance.spec.ts; qmse-output/historical-resolution/evidence/TC-FE-01.png; qmse-output/historical-resolution/evidence/playwright-historical.json

Assigned review responsibility: Shared: propose Jeyashankar lawyer UI/Buddhika booking/Wijayananda auth (historical assignment/proposal; personal authorship unconfirmed)

Decision: FR-05 fee display and booking UI placement

## TC-FE-02

Expected: Submission blocked; inline error

Observed: {'failure': 'Error: \x1b[2mexpect(\x1b[22m\x1b[31mlocator\x1b[39m\x1b[2m).\x1b[22mtoBeVisible\x1b[2m(\x1b[22m\x1b[2m)\x1b[22m failed\n\nLocator: getByRole(\'alert\').filter({ hasText: /slot|date/i })\nExpected: visible\nTimeout: 1500ms\nError: element(s) not found\n\nCall log:\n\x1b[2m  - Expect "toBeVisible" getByRole(\'alert\').filter({ hasText: /slot|date/i }) with timeout 1500ms\x1b[22m\n\x1b[2m  - waiting for getByRole(\'alert\').filter({ hasText: /slot|date/i })\x1b[22m\n', 'pageErrors': []}

Source of expectation: SE3110 historical report case TC-FE-02; original preconditions/inputs retained in historical-resolution ledger; available SE3090 Version 3.0 is a reference with approval unconfirmed

Implementation/execution evidence: frontend/tests/historical-acceptance.spec.ts; qmse-output/historical-resolution/evidence/TC-FE-02.png; qmse-output/historical-resolution/evidence/playwright-historical.json; qmse-output/historical-resolution/evidence/playwright-no-slot.json

Assigned review responsibility: Shared: propose Jeyashankar lawyer UI/Buddhika booking/Wijayananda auth (historical assignment/proposal; personal authorship unconfirmed)

Decision: Inline validation feedback requirement

## TC-FE-03

Expected: Redirect to /login?redirect=...

Observed: {'failure': 'Error: \x1b[2mexpect(\x1b[22m\x1b[31mreceived\x1b[39m\x1b[2m).\x1b[22mtoBe\x1b[2m(\x1b[22m\x1b[32mexpected\x1b[39m\x1b[2m) // Object.is equality\x1b[22m\n\nExpected: \x1b[32mtrue\x1b[39m\nReceived: \x1b[31mfalse\x1b[39m', 'pageErrors': []}

Source of expectation: SE3110 historical report case TC-FE-03; original preconditions/inputs retained in historical-resolution ledger; available SE3090 Version 3.0 is a reference with approval unconfirmed

Implementation/execution evidence: frontend/src/routes/ProtectedRoutes.tsx; qmse-output/historical-resolution/evidence/TC-FE-03.png; qmse-output/historical-resolution/evidence/playwright-historical.json

Assigned review responsibility: Shared: propose Jeyashankar lawyer UI/Buddhika booking/Wijayananda auth (historical assignment/proposal; personal authorship unconfirmed)

Decision: Login return URL semantics

## TC-MOB-02

Expected: Name and rating found

Observed: Name renders; historical star/rating assertion fails because current model/card displays experience and license, with no rating field.

Source of expectation: SE3110 historical report case TC-MOB-02; original preconditions/inputs retained in historical-resolution ledger; available SE3090 Version 3.0 is a reference with approval unconfirmed

Implementation/execution evidence: mobile/test/historical_cases_test.dart; qmse-output/historical-resolution/evidence/flutter-historical-final.log

Assigned review responsibility: Shared: propose Jeyashankar lawyer models/UI/Wijayananda registration/storage (historical assignment/proposal; personal authorship unconfirmed)

Decision: Lawyer rating field/UI approval

## TC-MOB-03

Expected: Inline errors; button disabled

Observed: Password abc yields inline validation and no API request. Submit remains enabled; no Phone field exists for historical 123 input. Historical disabled-button/phone design differs.

Source of expectation: SE3110 historical report case TC-MOB-03; original preconditions/inputs retained in historical-resolution ledger; available SE3090 Version 3.0 is a reference with approval unconfirmed

Implementation/execution evidence: mobile/test/historical_cases_test.dart; qmse-output/historical-resolution/evidence/flutter-historical-final.log

Assigned review responsibility: Shared: propose Jeyashankar lawyer models/UI/Wijayananda registration/storage (historical assignment/proposal; personal authorship unconfirmed)

Decision: Signup phone and enabled/disabled UX

## TC-MOB-05

Expected: Token read back unchanged

Observed: Current ApiClient token roundtrip passes under auth_token in SharedPreferences; historical jwt key reads null. Secure-storage mechanism is not the implementation tested.

Source of expectation: SE3110 historical report case TC-MOB-05; original preconditions/inputs retained in historical-resolution ledger; available SE3090 Version 3.0 is a reference with approval unconfirmed

Implementation/execution evidence: mobile/lib/services/api_client.dart; qmse-output/historical-resolution/evidence/flutter-historical-final.log

Assigned review responsibility: Shared: propose Jeyashankar lawyer models/UI/Wijayananda registration/storage (historical assignment/proposal; personal authorship unconfirmed)

Decision: V3 secure token storage / key migration

## TC-E2E-02

Expected: HTTP 201 + tracking number

Observed: {'http': 201, 'response': {'requestId': 2, 'customerId': 3, 'customerName': 'Synthetic History Customer', 'customerEmail': 'qmse-history-customer@example.test', 'serviceId': 1, 'serviceName': 'Contract Review & Amendment', 'documentType': 'Deed of Transfer', 'status': 'PENDING', 'assignedClerkId': None, 'assignedClerkName': None, 'createdAt': '2026-10-08T10:46:25.407193Z', 'updatedAt': '2026-10-08T10:46:25.407193Z', 'documentFiles': [], 'requiredDocuments': ['Original Contract', 'Amendment Request Letter', 'NIC Copy'], 'missingDocuments': ['Original Contract', 'Amendment Request Letter', 'NIC Copy'], 'reuploadNote': None}}

Source of expectation: SE3110 historical report case TC-E2E-02; original preconditions/inputs retained in historical-resolution ledger; available SE3090 Version 3.0 is a reference with approval unconfirmed

Implementation/execution evidence: backend/LegalService.API/Controllers/DocumentAndClerk/DocumentationRequestsController.cs; qmse-output/historical-resolution/evidence/historical-http.json

Assigned review responsibility: Shared: propose Vithusan document workflow with all four integration roles (historical assignment/proposal; personal authorship unconfirmed)

Decision: RequestId versus tracking number acceptance

## TC-E2E-03

Expected: Row with status PendingChecklist

Observed: {'database_row': {'RequestId': 2, 'Status': 'PENDING', 'CustomerId': 3, 'ServiceId': 1}}

Source of expectation: SE3110 historical report case TC-E2E-03; original preconditions/inputs retained in historical-resolution ledger; available SE3090 Version 3.0 is a reference with approval unconfirmed

Implementation/execution evidence: backend/LegalService.API/Services/DocumentAndClerk/DocumentationRequestService.cs; qmse-output/historical-resolution/evidence/historical-http.json

Assigned review responsibility: Shared: propose Vithusan document workflow with all four integration roles (historical assignment/proposal; personal authorship unconfirmed)

Decision: Documentation status contract

## TC-E2E-04

Expected: HTTP 200 + ChecklistResult

Observed: {'http': 404, 'response': {'detail': 'Not Found'}}

Source of expectation: SE3110 historical report case TC-E2E-04; original preconditions/inputs retained in historical-resolution ledger; available SE3090 Version 3.0 is a reference with approval unconfirmed

Implementation/execution evidence: ai-service/app/main.py; qmse-output/historical-resolution/evidence/historical-http.json

Assigned review responsibility: Shared: propose Vithusan document workflow with all four integration roles (historical assignment/proposal; personal authorship unconfirmed)

Decision: Document agent API revision

## TC-E2E-06

Expected: HTTP 200; clerk ID stamped

Observed: Actual synthetic request assigned by API, uploaded 2 MiB PDF visible in real clerk review. Current transitions are ASSIGNED, UNDER_REVIEW, IN_PROGRESS, REQUIRES_DOCUMENTS, COMPLETED, REJECTED; no Approve button/Approved transition. Historical approval action could not produce HTTP 200/clerk stamp.

Source of expectation: SE3110 historical report case TC-E2E-06; original preconditions/inputs retained in historical-resolution ledger; available SE3090 Version 3.0 is a reference with approval unconfirmed

Implementation/execution evidence: backend/LegalService.API/Controllers/DocumentAndClerk/DocumentationRequestsController.cs; qmse-output/historical-resolution/evidence/real-ui-assigned-http.json; qmse-output/historical-resolution/evidence/real-ui-assigned-steps.json; qmse-output/historical-resolution/evidence/real-react-clerk-review.png

Assigned review responsibility: Shared: propose Vithusan document workflow with all four integration roles (historical assignment/proposal; personal authorship unconfirmed)

Decision: FR-13 approval/audit-state mapping

## TC-C103

Expected: HTTP 200, fee updated

Observed: {'http': 200, 'response': {'legalServiceId': 2, 'serviceName': 'Synthetic History Fee Service', 'description': 'Synthetic', 'category': 'Corporate & Commercial Law', 'lawyerCount': 4}, 'database_row': {'LegalServiceId': 2, 'ServiceName': 'Synthetic History Fee Service', 'Description': 'Synthetic', 'Category': 'Corporate & Commercial Law', 'CreatedAt': '2026-10-08T16:16:24.273695+05:30', 'UpdatedAt': '2026-10-08T16:16:24.290697+05:30'}}

Source of expectation: SE3110 historical report case TC-C103; original preconditions/inputs retained in historical-resolution ledger; available SE3090 Version 3.0 is a reference with approval unconfirmed

Implementation/execution evidence: backend/LegalService.Tests/historical_api_replay.py; qmse-output/historical-resolution/evidence/historical-http.json

Assigned review responsibility: Jeyashankar (historical assignment/proposal; personal authorship unconfirmed)

Decision: FR-05 approved fee and duration model

## TC-C106

Expected: Badge updates without reload

Observed: {'failure': 'Error: \x1b[2mexpect(\x1b[22m\x1b[31mlocator\x1b[39m\x1b[2m).\x1b[22mtoBeVisible\x1b[2m(\x1b[22m\x1b[2m)\x1b[22m failed\n\nLocator: getByRole(\'switch\')\nExpected: visible\nTimeout: 1500ms\nError: element(s) not found\n\nCall log:\n\x1b[2m  - Expect "toBeVisible" getByRole(\'switch\') with timeout 1500ms\x1b[22m\n\x1b[2m  - waiting for getByRole(\'switch\')\x1b[22m\n', 'pageErrors': []}

Source of expectation: SE3110 historical report case TC-C106; original preconditions/inputs retained in historical-resolution ledger; available SE3090 Version 3.0 is a reference with approval unconfirmed

Implementation/execution evidence: frontend/tests/historical-acceptance.spec.ts; qmse-output/historical-resolution/evidence/TC-C106.png; qmse-output/historical-resolution/evidence/playwright-historical.json

Assigned review responsibility: Jeyashankar (historical assignment/proposal; personal authorship unconfirmed)

Decision: FR-03 active status versus availability toggle

## TC-C107

Expected: 9 and 1001 rejected (HTTP 422); 10 and 1000 accepted

Observed: Current schema accepts 3–4000, including 9 and 1001; rejects 2/4001. Original reported boundary conflicts.

Source of expectation: SE3110 historical report case TC-C107; original preconditions/inputs retained in historical-resolution ledger; available SE3090 Version 3.0 is a reference with approval unconfirmed

Implementation/execution evidence: ai-service/lawyer_recommendation/app/schemas.py; qmse-output/completion-20261008/evidence/ai-completion.xml

Assigned review responsibility: Shared; confirmation pending

Decision: 3–4000 versus 10–1000 query boundary

## TC-C112

Expected: Hiring proposal drafted only below 20%

Observed: All assess WATCH; no below-20% automatic drafting trigger in current rules.

Source of expectation: SE3110 historical report case TC-C112; original preconditions/inputs retained in historical-resolution ledger; available SE3090 Version 3.0 is a reference with approval unconfirmed

Implementation/execution evidence: backend/LegalService.API/Services/Workforce/WorkforceAnalysisService.cs; qmse-output/completion-20261008/evidence/backend-final-verified.trx

Assigned review responsibility: Shared; confirmation pending

Decision: V3 Stage 6 threshold versus configurable settings

## TC-C2-01

Expected: HTTP 201 Created, status Confirmed

Observed: {'http': 201, 'appointment': {'appointmentId': '735f7f6c-4375-4b1a-8356-4442ab4159ab', 'customerId': '00000000-0000-0000-0000-000000000003', 'customerName': 'Synthetic History Customer', 'customerEmail': '', 'lawyerId': '228799cd-345b-4db8-9841-dcc076bc74e5', 'lawyerName': 'Lawyer Counsel', 'lawyerLicense': '', 'slotId': 'e9bdafe3-0e85-48df-a7b5-3d6eaf3bd3c1', 'date': '2026-10-12', 'startTime': '11:00:00', 'endTime': '12:00:00', 'status': 'Requested', 'description': None, 'appointmentSource': None, 'consultationType': 'Online', 'legalServiceCategory': None, 'createdAt': '2026-10-08T10:46:24.145194Z', 'updatedAt': '2026-10-08T10:46:24.145194Z', 'canConfirm': True, 'canCancel': True, 'canReschedule': True, 'canComplete': False, 'history': [{'historyId': 'c3b85a41-b4bf-4115-96a1-2add212955e3', 'appointmentId': '735f7f6c-4375-4b1a-8356-4442ab4159ab', 'previousStatus': 'None', 'newStatus': 'Requested', 'changedDate': '2026-10-08T10:46:24.145194Z'}]}}

Source of expectation: SE3110 historical report case TC-C2-01; original preconditions/inputs retained in historical-resolution ledger; available SE3090 Version 3.0 is a reference with approval unconfirmed

Implementation/execution evidence: backend/LegalService.API/Services/AppointmentService.cs; qmse-output/historical-resolution/evidence/historical-http.json

Assigned review responsibility: Buddhika (historical assignment/proposal; personal authorship unconfirmed)

Decision: Immediate Confirmed versus Requested/approval

## TC-C2-03

Expected: HTTP 200; status Cancelled

Observed: {'http': 405, 'body': ''}

Source of expectation: SE3110 historical report case TC-C2-03; original preconditions/inputs retained in historical-resolution ledger; available SE3090 Version 3.0 is a reference with approval unconfirmed

Implementation/execution evidence: backend/LegalService.API/Controllers/AppointmentsController.cs; qmse-output/historical-resolution/evidence/historical-http.json

Assigned review responsibility: Buddhika (historical assignment/proposal; personal authorship unconfirmed)

Decision: Cancellation verb contract

## TC-C2-09

Expected: First rejected; second accepted

Observed: All cancellations succeed, status Cancelled and slot freed. Original under-24-hour rejection expectation fails.

Source of expectation: SE3110 historical report case TC-C2-09; original preconditions/inputs retained in historical-resolution ledger; available SE3090 Version 3.0 is a reference with approval unconfirmed

Implementation/execution evidence: backend/LegalService.API/Services/AppointmentService.cs; qmse-output/completion-20261008/evidence/backend-final-verified.trx

Assigned review responsibility: Shared; confirmation pending

Decision: V3 component 2 24-hour cancellation notice

## TC-C3-01

Expected: HTTP 201 + 4 checklist items

Observed: {'http': 201, 'request': {'requestId': 1, 'customerId': 3, 'customerName': 'Synthetic History Customer', 'customerEmail': 'qmse-history-customer@example.test', 'serviceId': 1, 'serviceName': 'Contract Review & Amendment', 'documentType': 'Deed of Transfer', 'status': 'PENDING', 'assignedClerkId': None, 'assignedClerkName': None, 'createdAt': '2026-10-08T10:46:24.379627Z', 'updatedAt': '2026-10-08T10:46:24.379637Z', 'documentFiles': [], 'requiredDocuments': ['Original Contract', 'Amendment Request Letter', 'NIC Copy'], 'missingDocuments': ['Original Contract', 'Amendment Request Letter', 'NIC Copy'], 'reuploadNote': None}, 'requiredDocuments': ['Original Contract', 'Amendment Request Letter', 'NIC Copy']}

Source of expectation: SE3110 historical report case TC-C3-01; original preconditions/inputs retained in historical-resolution ledger; available SE3090 Version 3.0 is a reference with approval unconfirmed

Implementation/execution evidence: backend/LegalService.API/Data/DbInitializer.cs; qmse-output/historical-resolution/evidence/historical-http.json

Assigned review responsibility: Vithusan (historical assignment/proposal; personal authorship unconfirmed)

Decision: FR-11 service identity and bundle mapping

## TC-C3-02

Expected: HTTP 200; file linked to request

Observed: {'http': 404, 'response': ''}

Source of expectation: SE3110 historical report case TC-C3-02; original preconditions/inputs retained in historical-resolution ledger; available SE3090 Version 3.0 is a reference with approval unconfirmed

Implementation/execution evidence: backend/LegalService.API/Controllers/DocumentAndClerk/DocumentFilesController.cs; qmse-output/historical-resolution/evidence/historical-http.json

Assigned review responsibility: Vithusan (historical assignment/proposal; personal authorship unconfirmed)

Decision: Current per-request upload route and 201 contract

## TC-C3-03

Expected: HTTP 400 with size error

Observed: {'historical_http': 404, 'current_route_http': 400, 'current_response': {'statusCode': 400, 'message': 'File size (14MB) exceeds the maximum allowed limit of 10MB.', 'timestamp': '2026-10-08T10:46:24.686435Z'}}

Source of expectation: SE3110 historical report case TC-C3-03; original preconditions/inputs retained in historical-resolution ledger; available SE3090 Version 3.0 is a reference with approval unconfirmed

Implementation/execution evidence: backend/LegalService.API/Services/DocumentAndClerk/DocumentFileService.cs; qmse-output/historical-resolution/evidence/historical-http.json

Assigned review responsibility: Vithusan (historical assignment/proposal; personal authorship unconfirmed)

Decision: Current per-request upload route

## TC-C3-04

Expected: HTTP 200; status Approved

Observed: {'http': 404, 'response': ''}

Source of expectation: SE3110 historical report case TC-C3-04; original preconditions/inputs retained in historical-resolution ledger; available SE3090 Version 3.0 is a reference with approval unconfirmed

Implementation/execution evidence: backend/LegalService.API/Controllers/DocumentAndClerk/DocumentationRequestsController.cs; qmse-output/historical-resolution/evidence/historical-http.json

Assigned review responsibility: Vithusan (historical assignment/proposal; personal authorship unconfirmed)

Decision: Approve endpoint replacement; status mapping also pending

## TC-C3-05

Expected: Completeness 50%; deed flagged

Observed: Actual completeness function flags missing Prior Title Deed. With the current four-item Property Transfer checklist and the other three supplied, completeness is 75%, not historical 50%.

Source of expectation: SE3110 historical report case TC-C3-05; original preconditions/inputs retained in historical-resolution ledger; available SE3090 Version 3.0 is a reference with approval unconfirmed

Implementation/execution evidence: ai-service/app/agents/completeness.py; qmse-output/historical-resolution/evidence/ai-retrieval.xml; qmse-output/historical-resolution/evidence/ai-retrieval.log

Assigned review responsibility: Vithusan (historical assignment/proposal; personal authorship unconfirmed)

Decision: Original completeness denominator, weights and full fixture

## TC-C3-06

Expected: HTTP 200; department updated

Observed: {'http': 404, 'response': ''}

Source of expectation: SE3110 historical report case TC-C3-06; original preconditions/inputs retained in historical-resolution ledger; available SE3090 Version 3.0 is a reference with approval unconfirmed

Implementation/execution evidence: backend/LegalService.API/Controllers/DocumentAndClerk/ClerksController.cs; qmse-output/historical-resolution/evidence/historical-http.json

Assigned review responsibility: Vithusan (historical assignment/proposal; personal authorship unconfirmed)

Decision: Current clerk update route/required Contact

## Final resolution and new technical work

Original30classifications remainA0/B18/C10/D0/UNDETERMINED2. Fourteen accepted contract replacements pass;16 originaldiscrepancies remainFAIL. The separately reproduced developmentfilesystemorphan is FA-DEF-01, not proof that any of the original30 violated an independently approved requirement. Proposed notice/headroom/batch test success does not retire oldexpectations.

| Case | Final status | Retest evidence |
|---|---|---|
| TC-BK-03 | VERIFIED/PASS, acceptedrevision | qmse-output/final-audit/debug/evidence/accepted-http-extra.json |
| TC-BK-06 | VERIFIED/PASS, acceptedrevision | qmse-output/final-audit/debug/evidence/historical-http.json |
| TC-DB-03 | VERIFIED/PASS, acceptedrevision | qmse-output/final-audit/debug/evidence/historical-http.json |
| TC-C2-03 | VERIFIED/PASS, acceptedrevision | qmse-output/final-audit/debug/evidence/historical-http.json |
| TC-C3-02 | VERIFIED/PASS, acceptedrevision | qmse-output/final-audit/debug/evidence/historical-http.json |
| TC-C3-03 | VERIFIED/PASS, acceptedrevision | qmse-output/final-audit/debug/evidence/historical-http.json |
| TC-C3-06 | VERIFIED/PASS, acceptedrevision | qmse-output/final-audit/debug/evidence/historical-http.json |
| TC-E2E-02 | VERIFIED/PASS, acceptedrevision | qmse-output/final-audit/debug/evidence/historical-http.json |
| TC-FE-01 | VERIFIED/PASS, acceptedrevision | qmse-output/final-audit/debug/accepted-ui/evidence/TC-FE-01.png |
| TC-FE-03 | VERIFIED/PASS, acceptedrevision | qmse-output/final-audit/debug/accepted-ui/evidence/TC-FE-03.png |
| TC-FE-02 | VERIFIED/PASS, acceptedrevision | qmse-output/final-audit/debug/accepted-ui/evidence/TC-FE-02.png |
| TC-MOB-02 | VERIFIED/PASS, acceptedrevision | qmse-output/final-audit/debug/evidence/accepted-flutter-final.log |
| TC-MOB-03 | VERIFIED/PASS, acceptedrevision | qmse-output/final-audit/debug/evidence/accepted-flutter-final.log |
| TC-C3-05 | VERIFIED/PASS, acceptedrevision | qmse-output/final-audit/debug/evidence/accepted-ai.log |
