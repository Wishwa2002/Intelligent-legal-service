from pathlib import Path
import json,hashlib,subprocess,shutil
R=Path(__file__).resolve().parents[2];O=R/'qmse-output'
es=[]
for l in (O/'test-results/mobile-minimal.log').read_text().splitlines():
 try:
  e=json.loads(l)
  if isinstance(e,dict) and 'type' in e:es.append(e)
 except ValueError:pass
(O/'evidence/mobile/flutter-events.jsonl').write_text('\n'.join(json.dumps(e) for e in es)+'\n')
ends=[e for e in es if e.get('type')=='testDone' and not e.get('hidden')]
assert len(ends)==49 and all(e['result']=='success' and not e['skipped'] for e in ends)
sources=['backend/LegalService.Tests/QmseAppointmentTests.cs','backend/LegalService.Tests/QmseDocumentTests.cs','backend/LegalService.Tests/QmseHttpTests.cs','backend/LegalService.Tests/QmseRegistrationTests.cs','backend/LegalService.Tests/LawyerManagementHttpTests.cs','backend/LegalService.Tests/LawyerMobileHttpTests.cs','ai-service/tests/test_qmse_boundaries.py']
for f in sources:
 dest=O/'test-results/test-source'/f;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(R/f,dest)
(O/'audit/testing-changes.patch').write_text(subprocess.check_output(['git','diff','--','backend/LegalService.Tests/LawyerManagementHttpTests.cs','backend/LegalService.Tests/LawyerMobileHttpTests.cs'],text=True))
p=O/'audit/report-audit.md';s=p.read_text().replace('Six original Flutter test files exist. Mobile runtime/setup outcome is recorded separately; all historical mobile claims require exact current-case mapping.','Six original Flutter test files execute: 49 unit/widget tests pass. Official Flutter sources/resource recovery and matching cached engine artifacts enabled the runner; initial missing-resource and timeout attempts remain recorded. This does not prove a physical-device or integrated live-API workflow.');p.write_text(s)
p=O/'audit/defect-verification.md';s=p.read_text().replace('Mobile setup/test logs disclose runtime limitation; no current analyzer PASS inferred.','Flutter unit/widget tests pass (49 cases), but flutter analyze was not executed; no current analyzer PASS inferred.');p.write_text(s)
(O/'audit/contribution-verification.md').write_text('''# Group contribution verification

Original student names, IDs and component assignments are preserved in the final DOCX. These are member-declared responsibilities, not independently verified personal effort. No percentages have been invented or derived from commit authorship.

| Report member / section | Repository component and test evidence | Verification limits |
|---|---|---|
| Jeyashankar / 9.1 | LawyersController, matching/workforce/career services, lawyer_recommendation Python package; LawyerManagementHttpTests, FrontDeskMatchingTests (13), WorkforceHiringTests (24); 37 discovered cases in the two originally cited service classes | Implementation and fresh scoped execution exist. Original personal totals and ownership need confirmation; report describes the shared Career component under multiple responsibilities. |
| Buddhika / 9.2 | AppointmentsController, AppointmentService, recurring/availability/career services; AppointmentTests (15), CareerTests (3), current scheduling and relational tests | 18 cases in the two cited classes. Attribution and individual test execution cannot be inferred from repository ownership. |
| Vithusan / 9.3 | DocumentationRequestsController, DocumentFileService, documentation/clerk/services catalogue, document_validation Python package; DocumentationRequestTests (3), ClerkTests (3), ServiceRequestTests (15), current upload/seeder probes | Source and tests exist; original claimed 21 in the first two classes is unsupported (6 there; 15 separately). Live clerk/mobile filing workflow unverified. |
| Wijayananda / 9.4 | AuthController, JwtService, PasswordService, HealthController, auth UI and workflows; registration/security fixtures and browser auth tests | AuthSecurityTests.cs does not exist. Fresh JWT/signup probes verify selected controls, not personal ownership or a complete historical 42-case suite. |

All 20 commits cited by Sections 9.1–9.4 exist locally; author/time/subject records are preserved in contribution-commit-checks.json. Some duplicate-looking subjects reference separate commits. Commit existence is provenance only, not proof of effort, approved assignment or successful retest. backend-class-counts.json gives current execution counts. GitHub metadata records historical CI successes/failures, including Mobile CI success at the base HEAD; current local additions were not pushed or run in CI.

Manual action: each member must confirm component responsibilities, historical AI/tool usage, any report-specific personal test counts, and the final contribution matrix. Supply original execution artifacts for historical claims before changing H/U to VERIFIED. Assignment demonstrations and individual understanding remain a member responsibility.
''')
(O/'completion-summary.md').write_text('''# Completion summary — 2026-SE-42

The final DOCX and visually checked PDF preserve the supplied report structure, cover, student identities, headings, tables and legitimate assignment requirements. The original inputs remain unchanged. Unsupported current PASS/fix/timing/accuracy claims have been replaced with historical qualifications or actual scoped outcomes. No business logic was changed, no production database was touched, and nothing was committed, pushed, deployed or submitted.

## Executed results

| Suite | Total | Passed | Failed | Skipped |
|---|---:|---:|---:|---:|
| .NET/xUnit (including skipped evidence host) | 313 | 310 | 1 | 2 |
| React Node tests | 19 | 19 | 0 | 0 |
| Playwright (14 specification files; mostly mocked API) | 112 | 109 | 0 | 3 |
| Flutter unit/widget tests (6 files) | 49 | 49 | 0 | 0 |
| Python deterministic/mocked AI tests | 98 | 98 | 0 | 0 |

One backend assertion reproduces acceptance of inert spoofed PDF content: DEF-12 remains OPEN. Original report-case totals: 77 designed, 14 VERIFIED, 4 FAILED (three requirement conflicts plus spoofed upload), 2 BLOCKED, 57 HISTORICAL/UNVERIFIED. Machine cases and report cases are different denominators.

Passive local ZAP scanning recorded 3 Low missing-header alert instances and 1 Informational authentication-discovery alert; production configuration was not scanned. k6 ran 2 VUs for 10 seconds against an isolated InMemory/mock API fixture: 81 requests, 0 HTTP errors. All measured endpoint p95 values were below 200 ms within that small fixture only. Live Gemini latency and production/hosting performance were not measured. Separate reports and original machine artifacts are included.

## Remaining blockers and manual actions

1. Confirm approved SE3090 boundaries: recommendation length (report 10–1000 versus current 3–4000), workforce headroom rule, and 24-hour cancellation policy. Three report expectations conflict with current behavior; no application changes were made to force compliance.
2. Address spoofed file-content acceptance through a separately authorized implementation change, then rerun the failing rejection test. Current service checks supplied extension/MIME/size but not actual content signature.
3. Provide approved synthetic Golden Cases, Gemini credentials and a bounded call budget for live evaluation/disclaimer checks and live-AI latency. Current mocked results establish no live-provider quality claim.
4. Execute the full Flutter → API → PostgreSQL → AI → React clerk → Flutter workflow on an isolated environment, and clarify the absent atomic three-file rollback operation. Physical-device, complete accessibility and hosted NFR acceptance remain unverified.
5. Obtain member confirmation of responsibilities, percentages if required, historical AI disclosures, and original evidence. All 20 cited commits exist; they do not independently establish ownership or personal contribution totals.
6. Confirm intended repository/branch: checkout is chore/deployment-readiness at 8a9b8a2; requested remote docs/se3110-qmse-testing returned 404. Current test additions remain local for review. No push authorization was requested or assumed.
7. Review academic content and perform required individual demonstrations/submission manually. The report is evidence-backed and accurately qualified; remaining assessment evidence gaps prevent a claim of full requirement completion.

## Deliverables

- final-report/SE3110_Testing_Report_GR42_Final.docx and .pdf
- audit/report-audit.md; audit/defect-verification.md; audit/contribution-verification.md
- test-results/test-execution-summary.md; summary.json; case-verification.json
- evidence/security/security-report.md with passive ZAP HTML/XML/JSON
- evidence/performance/performance-report.md with k6 summaries/raw metrics
- evidence-index.md and evidence-index.json
- Reusable new test sources in the existing projects, plus portable copies under test-results/test-source and replay instructions in audit/reproduction.md

Earlier blocked/failed attempts are retained. Final successful retries supersede their suite outcome, without erasing the original logs. All dates are actual execution dates; future fixture appointment dates are explicitly synthetic inputs.
''')
(O/'audit/reproduction.md').write_text('''# Safe reproduction

Use the actual checkout and dependencies shown in snapshot.json and repository-inventory.txt. New reusable tests are in backend/LegalService.Tests/Qmse*.cs and ai-service/tests/test_qmse_boundaries.py. Two existing HTTP fixture classes are made partial and register missing documentation/clerk services; application business logic is unchanged. Portable source copies and the existing-fixture patch are retained.

Do not set the integration-test connection variables to a deployed database. Create a new disposable loopback PostgreSQL cluster and set QMSE_ISOLATED_POSTGRES to its maintenance connection string. The runner maps it to the two integration-fixture variables; fixtures create/drop unique test databases in that dedicated cluster. The original cluster used port 55442 and synthetic role qmse_test. See database startup/init logs.

- Backend: dotnet restore LegalService.sln; run the exact command in backend-final.json with isolated database variables and --collect "XPlat Code Coverage".
- Frontend: npm ci; npm run test:member1; npm test -- --reporter=json,html. Install Playwright browsers first. Three opt-in live cases are skipped unless deliberately configured against an isolated environment.
- Mobile: flutter pub get; flutter test --machine. Final execution used official Flutter 3.47.6 sources/resources and matching cached test-engine artifacts because no complete SDK was installed; mobile-minimal.json records exact paths. A fresh full SDK installation is recommended for replay. flutter-events.jsonl contains genuine machine events (49 visible testDone successes and a successful done event).
- AI: use ai-service requirements in a venv; pytest tests --junitxml=... . The runner disables real environment AI keys/dotenv and supplies an intentionally invalid synthetic key for provider construction in mocked tests. Do not count these as live Gemini calls.
- Security/load: start the opt-in Qmse_LocalEvidenceHost with QMSE_START_EVIDENCE_HOST=1 and a temporary QMSE_HOST_CONTROL path. It expires automatically. Use passive_scan.py and local-smoke.k6.js; inspect their loopback guards. ZAP 2.17.0 and k6 2.3.0 were used. No active scan/spider was run. Synthetic temporary host tokens are excluded from deliverables.

run_command.py writes timestamped logs and structured exit codes; inspect timed_out as well as exit_code because Flutter can exit 0 on SIGTERM. Initial failures and final retries are distinguished in the summaries. Public CI metadata is historical only; no new CI run/push occurred.
''')
# Preserve hashes of original inputs and verify unchanged.
original=json.load(open(O/'audit/input-hashes.json'));checks={p:{'sha256':hashlib.sha256(Path(p).read_bytes()).hexdigest(),'unchanged':hashlib.sha256(Path(p).read_bytes()).hexdigest()==h} for p,h in original.items()};assert all(x['unchanged'] for x in checks.values());(O/'audit/input-integrity-final.json').write_text(json.dumps(checks,indent=2))
