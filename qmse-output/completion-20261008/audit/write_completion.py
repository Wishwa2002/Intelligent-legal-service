from pathlib import Path
import json,shutil,datetime
R=Path.cwd();O=R/'qmse-output';C=O/'completion-20261008';S=json.load(open(C/'test-results/summary.json'));c=S['coverage'];b=json.load(open(C/'evidence/coverage-business-lines.json'))
def write(p,text):p.write_text(text+'\n')
text=f'''# Final technical execution summary

Source commit: {S['commit']} on local docs/se3110-qmse-testing. No push, deployment or submission. All fresh executions occurred on 2026-10-08 UTC; exact start/end/exit metadata are retained in test-results/completion-20261008-*.json. Available SE3090 Version 3.0 reference was read before business-rule decisions; approval remains unconfirmed.

| Suite | Total | Passed | Failed | Skipped | Evidence |
|---|---:|---:|---:|---:|---|
| xUnit | 328 | 326 | 0 | 2 | completion-20261008/evidence/backend-final-verified.trx |
| React/Node | 19 | 19 | 0 | 0 | test-results/completion-20261008-node.log |
| Flutter unit/widget | 49 | 49 | 0 | 0 | test-results/completion-20261008-mobile.log |
| Playwright | 114 | 111 | 0 | 3 | completion-20261008/evidence/playwright-final.json |
| Python deterministic/mocked | 102 | 102 | 0 | 0 | completion-20261008/evidence/ai-completion.xml |

These are independent runner cases, not unique business requirements. Final report originals: 77 designed cases, 23 scoped VERIFIED, 3 FAILED expectation conflicts, 2 BLOCKED, 49 HISTORICAL/UNVERIFIED. Original expected outcomes were preserved. All 57 previously historical cases were reviewed; eight now have matching scoped evidence. The three conflicts are not proven application defects: query length, workforce headroom, cancellation cutoff. Fresh current-contract tests pass but do not approve the old rules.

The final xUnit runner wall time was 25.949 s, displayed test duration 22 s; exit 0. The two skips are live recommendation transport and scanner/evidence-host harness. Playwright: 15 spec files, 53.758 s tool duration; three live fixture skips. Most browser regressions intercept API traffic. Node helpers are not a React Testing Library suite. Flutter: six files; 6.648 s runner wall. Python: displayed 1.92 s; nine warnings; four added deterministic Golden Case subcriteria. Upload focused retest: 18/18 passing.

## Real integrated workflow — PASS

Actual Flutter web, ASP.NET Core Staging API, isolated PostgreSQL 18, actual FastAPI and React were used; no application API response interception. Request 12 (Affidavit & Notary) was created in Flutter; a genuine bundled NIC PDF was uploaded through Flutter multipart; two genuine sample PDFs were uploaded through the API. FastAPI retrieved actual backend clerk/workload state, ranked clerk CLK-001, and explicit admin approval assigned ClerkId 1. React clerk review changed status to COMPLETED; Flutter read and displayed the same result. SQL confirms three stored binary attachments, 7,667 bytes. Completion timestamp 2026-10-08T05:02:00.518Z.

Evidence: completion-20261008/evidence/integrated-{{http,final-http,completion-http}}.json, integrated-result.json, integrated-final-database.log, actual e2e-*.png screenshots. Creation/upload/review scripts and local-service setup logs are retained. Actual deterministic AI ranking uses defaults for unspecified skills/experience. Gemini was not part of this workflow; native mobile devices and historical Deed/checklist/Approved statuses are separate, unverified acceptance scenarios.

## Coverage

Raw Coverlet root: {float(c['line-rate'])*100:.2f}% lines ({c['lines-covered']}/{c['lines-valid']}), {float(c['branch-rate'])*100:.2f}% branches ({c['branches-covered']}/{c['branches-valid']}). Migration/designer execution dominates the raw increase. Distinct filename+line pairs excluding Migrations/: before {b['before']['percent']}%, after {b['after']['percent']}% ({b['after']['covered']}/{b['after']['valid']}). Content validator class is 97.05% lines, 90% branches in raw XML. Coverage is not correctness or an invented target.

## Security, performance and live AI

ZAP 2.17.0: 15 deliberate loopback requests; passive plus finite manual auth/injection probes; 9 Low missing nosniff instances, 1 Informational authentication identification. Header finding remains open. Earlier HTTP 500 alert is absent after schema repair; no full vulnerability guarantee or verified false positives claimed. Original native HTML/XML/JSON retained.

k6 2.3.0 actual PostgreSQL/API retest: 2 VUs, 15 s, 120 HTTP requests, error rate 0, throughput 7.803/s. Search p50/p95/avg 3.487/5.679/3.724 ms; details 2.134/3.528/2.277; appointments GET 1.500/3.585/1.694; documentation GET 15.475/20.966/15.831. Tiny synthetic read workload; not hosted/booking throughput acceptance. First failing run and raw JSON samples preserved.

One live Gemini call of authorised maximum eight; retries disabled; synthetic prompt; provider ServerError 504 after 29.326 s. No output/token usage/verified tariff, estimated cost unavailable. Stop on failure; no further live calls. GC-01–04 full live acceptance and successful-response latency remain BLOCKED. GC-03 checklist subcases and GC-04 sanitizer isolation are deterministic checks only.

## CI

Local source commit is unpushed. Read-only GitHub API check found zero workflow runs for that SHA; remote CI UNVERIFIED. Historical run screenshot and metadata remain dated evidence for the old commit only. Backend CI currently lacks dedicated PostgreSQL service setup, so relational tests may skip there until configured appropriately.
'''
write(C/'test-results/test-execution-summary.md',text)
write(C/'evidence/performance-report.md',text[text.index('k6 2.3.0'):text.index('One live Gemini')])
write(C/'evidence/security-report.md',text[text.index('ZAP 2.17.0'):text.index('k6 2.3.0')]+ '\nScope metadata and native reports: zap-postgres-metadata.json, zap-postgres.html/xml, zap-postgres-alerts.json. No production target or automated active scan.')
write(C/'evidence/ai-evaluation.md','''# AI evaluation

Dataset: ai-service/tests/qmse_golden_cases.json. Runner: test_qmse_golden_reproducible.py within the final 102-test pytest execution. Actual output records are in test-results/completion-20261008-ai.log and ai-completion.xml.

Three deterministic GC-03 fixtures compare exact missing-document/status outputs: incomplete NIC-only/survey subset, full checklist, and empty checklist. Three of three subcriteria pass, not a live accuracy percentage or original Golden Case certification. GC-04 sanitizer-wrapping characterization passes; the input remains in an isolation wrapper. This is not a safe refusal or privilege-disclaimer test. GC-01/02 expected fixtures are retained but full live evaluation was not executed successfully.

live-gemini.json records the single actual synthetic provider request: model gemini-3.8-flash, ServerError 504, 29.326 s to failure, no response/token metadata. Maximum eight authorised calls; one attempted, retries disabled; no additional calls. Estimated cost cannot be calculated without usage and a verified tariff. Provider errors are sanitized to avoid leaking credentials. Deterministic real FastAPI clerk ranking in the integrated workflow is separate from live Gemini.
''')
write(C/'audit/defect-verification.md','''# Completion defect verification

Historical DEF-01–15 details remain in qmse-output/audit/defect-verification.md and the preserved pre-completion report. Commit presence is not successful retesting.

| Defect | Finding / action | Actual evidence / final status |
|---|---|---|
| DEF-02 | Fresh schema/link tests pass; original historical reproduction not rerun | Final TRX related linkage checks; historical retest remains UNVERIFIED |
| DEF-07 | Unsubstantiated login 180 ms near 200 ms is an observation | No matching login latency run; not a proven breach |
| DEF-08 | Existing scheduling/concurrency tests pass; exact two-timezone drift not reproduced | Final TRX; historical retest UNVERIFIED |
| DEF-09 | Current Customer/Lawyer/Clerk career writes denied | Final TRX + real-api-http.json; current RBAC PASS, original pre-fix occurrence unverified |
| DEF-11 | Actual local IPv4 React login/API workflow succeeds | Actual E2E; historical IPv6 regression not reproduced |
| DEF-12 | Original spoof assertion fails before; actual byte-limit/MIME/signature/PDF-parser validation added | spoof-before.trx, upload-retest.trx 18/18 PASS, final TRX, HTTP spoof 400, real Flutter valid PDF upload 201. FIXED AND RETESTED |
| DEF-13 | Seeder unit test is idempotent at 12; actual workflow catalogue available | Final TRX + actual API/UI; original absent-seed incident remains unverified |
| DEF-15 | JWT validation/RBAC/input probes pass narrowly | Final TRX/ZAP; broad historical remediation not fully proven |
| DEF-16 (new) | Fresh migrated appointment table omitted ConsultationType/Description/LegalServiceCategory; API GET 500 | Additive migration applied only local DB; migration regression + k6 before/after. FIXED AND RETESTED |
| DEF-17 (new) | Flutter web sample upload uses unsupported Directory.systemTemp | Direct bundled byte multipart; preserved before image/log, real upload PASS + 49 unit/widgets. FIXED AND RETESTED |
| DEF-18 (new) | React compares ClerkId to user ID, hiding real assigned queue | Correct clerkId contract, 2 browser regressions + real human completion. FIXED AND RETESTED |
| ZAP header finding | Missing X-Content-Type-Options verified on real response headers | 9 Low instances, OPEN; no false positive or zero-vulnerability assertion |

Content validation is not antivirus, sanitization or full image decoding. Original failed runs, fixture-setup duplicate-PK failure, and corrected fixture successful retests are all preserved. Query/headroom/cancellation expectations remain unresolved and business rules were not changed. Real PostgreSQL caller/per-attachment rollback succeeds; an atomic multi-file HTTP operation is not established.
''')
manual='''# Remaining blockers and group manual actions

- Formal approval/version precedence of the available consolidated SE3090 reference is unconfirmed. Three old expectations remain unresolved: query length, 20% workforce narrative versus configurable rules, 24-hour cancellation notice. No business rule was silently changed.
- 49 original historical cases still lack matching exact execution, including fee/toggle APIs, exact older UI/model/status contracts, live RAG/refusal/accuracy/timezone claims. All 57 were reviewed in historical-57-review.md.
- Atomic three-file HTTP filing has no established endpoint. Existing request creation and uploads are separate legitimate operations; tested caller/per-attachment rollback does not invent that batch boundary.
- Live Gemini returned 504 on one authorised attempt. No successful live outputs, token usage, estimated cost, full Golden Case accuracy or latency acceptance. Credentials were not exposed; no further calls made.
- Native Android/iOS device, formal accessibility checks, staging-scale transactional performance and a broader authorised active security scan were not executed. Missing nosniff remains open.
- Remote CI cannot cover an unpushed local commit. Obtain explicit push permission first; then verify all applicable workflows, provision isolated PostgreSQL in CI, and retain machine logs.
- Original personal effort and ownership cannot be inferred from Git authorship or this AI-assisted work. No new tests/fixes are attributed to students.

| Member | Required confirmation/action |
|---|---|
| Jeyashankar J (IT24103900), C1 | Confirm own tests/commits and actual contribution; obtain approved query/workforce rules, resolve reference-version discrepancy, verify historical fee/toggle and live recommendation cases when feasible. |
| Buddhika P. Y. H (IT24103041), C2 | Confirm own tests/commits; establish cancellation/booking status contracts; reproduce exact historical timezone and scheduling Golden Case with approved fixtures. |
| Vithusan V (IT24100360), C3 | Confirm ownership and original upload/checklist expectations; review parser validation and intended ACID workflow boundary; distinguish current COMPLETED from old Approved, and live checklist from deterministic evaluation. |
| Wijayananda W. J. W (IT24102275), C4/team leader | Confirm ownership/AI disclosures, consultation refusal/disclaimer requirements and original RAG scoring dataset; arrange provider/model budget, authorised CI push, header remediation review and individual demonstration/submission. |

All members must inspect their evidence and explain it themselves. Approval to push, deploy or submit has not been supplied.
'''
write(C/'audit/remaining-blockers-and-member-actions.md',manual)
write(C/'audit/assignment-final-audit.md','''# SE3110 assignment completion audit

The official assignment text was reread from audit/assignment-text.txt. Existing report structure, component assignments, CLEAR disclosures, references, appendices and original thirteen figures were preserved. Same SE3090 application tested. A complete real five-component business workflow is now evidenced, using Flutter web and actual deterministic FastAPI rather than mocks. Test plan, case document, execution summary, defects, machine evidence and additional NFR discussion are present.

Mandatory security/performance testing now includes actual PostgreSQL/API runs, with explicit small local scope, remaining Low finding and no fabricated live AI numbers. Reproducible Golden Case subcriteria exist; full live evaluation remains blocked. Individual ownership/demonstration, 49 historical cases, three requirement conflicts, native/accessibility scope and CI for final unpushed commit remain disclosed. Formal submission readiness is not asserted merely because artifacts export correctly.

Automated counts are parsed from TRX/Playwright/JUnit and actual machine output. Report-case counts are separate. Final evidence path existence, original figure hashes, document image count, PDF rendering/layout and original input preservation are checked in final-quality-check.json. See remaining-blockers-and-member-actions.md for accountability without invented contribution percentages.
''')
write(O/'completion-summary.md','''# SE3110 technical completion

Four defects fixed and retested; real integrated workflow PASS. Final automated suites: xUnit 326 pass/2 skip; Node 19 pass; Flutter 49 pass; Playwright 111 pass/3 skip; Python 102 deterministic/mocked pass. No final automated failures. Original report cases: 23 verified, 3 expectation conflicts, 2 blocked, 49 historical/unverified of 77.

Final DOCX/PDF: final-report/SE3110_Testing_Report_GR42_Final.docx and .pdf. Previous 51-page report retained at completion-20261008/audit/before.docx/.pdf; original supplied report and old archives remain unchanged. Original 13 figures retained, seven genuine figures added.

Read completion-20261008/test-results/test-execution-summary.md, audit/requirements-traceability.md, historical-57-review.md, defect-verification.md, assignment-final-audit.md and remaining-blockers-and-member-actions.md. Evidence and native reports: completion-20261008/evidence. Final source commit f360e4ac21f149ae5b90a125c57bf928982a9c53 on local docs/se3110-qmse-testing, unpushed; remote CI unverified.

Live Gemini 504 after one authorised call; no successful live accuracy/latency/cost claims. Missing nosniff remains Low/open. Native/device/accessibility/staging scope and member confirmation remain incomplete. No production data modified, push, deployment or submission.
''')
# Preserve previous root summaries before making the root case link current.
prev=C/'audit/previous-root-summaries';prev.mkdir(exist_ok=True)
for name in ['case-verification.json','summary.json','test-execution-summary.md']:
 src=O/'test-results'/name
 if src.exists():shutil.copy2(src,prev/name)
 shutil.copy2(C/'test-results'/name,src)
