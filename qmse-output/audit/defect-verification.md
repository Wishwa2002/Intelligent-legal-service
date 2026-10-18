## Publication addendum — 8 October 2026

The approved source 05359214df52fa743b234e1d77e6671f57c14dea is published to Wishwa2002/Intelligent-legal-service on se3110-qmse-testing. Main and original metadata are preserved. Zero exact-SHA CI runs observed; no CI pass. Current report/evidence and manual actions are indexed in git-publication/audit/. The following dated testing audit remains unchanged historical evidence.

# Completion addendum — 8 October 2026

Current technical findings: `qmse-output/completion-20261008/audit/defect-verification.md`. Four defects are now fixed/retested, the alternate real integrated workflow passes, and current machine suites have zero failures. Original expectation conflicts, historical cases and live provider 504 remain qualified. The first-phase audit below is preserved as dated history; it is superseded where the completion evidence establishes a new result.

---

# Defect verification — GR42

The 15 original narratives are retained as historical claims. No application fix was made during this task. A commit establishes a change, not a reproduced defect or passed retest. Final execution evidence: qmse-output/evidence/backend/backend-final.trx, qmse-output/evidence/ai/pytest-final.xml and qmse-output/evidence/e2e/playwright.json. Exact source functions and case outcomes are indexed in qmse-output/test-results/backend-cases.json.

| Defect | Implementation / history inspected | Current finding and retest | Status |
|---|---|---|---|
| DEF-01 | lawyer_recommendation/agent.py, gemini.py, test_recommendation_guardrails.py | Structured interpretation rejects invalid catalog data; deterministic tests pass. Original free-text/win-rate outputs not available; live Gemini not retested. | Historical defect UNVERIFIED; current narrow controls VERIFIED |
| DEF-02 | LawyersController; ac62bb7; AddMissingCurrentSchemaColumns migration | AdminCanCreateLawyerAndLawyerAccount passes and asserts persisted Lawyer.UserId equals the created account. DeploymentMigrationTests passes; schema tests run in isolated PostgreSQL. Original pre-fix state not reproduced. | Current link behavior VERIFIED; historical reproduction UNVERIFIED |
| DEF-03 | 5269539 and current Flutter files | Analyzer execution not established by source changes. Flutter unit/widget tests pass (49 cases), but flutter analyze was not executed; no current analyzer PASS inferred. | UNVERIFIED |
| DEF-04 | 0958d69 and mobile-ci.yml | .env preparation is in CI. Public API shows Mobile CI success for base commit 8a9b8a2; newer observed runs on different commits fail. This does not prove a retest at 0958d69 or certify local test additions. | Historical CI observation VERIFIED; original retest UNVERIFIED |
| DEF-05 | Program.cs JWT parameters, JwtService, fresh missing/invalid/expired/tampered JWT tests | Lifetime/audience validation exists; fixture requests reject tokens with 401. Fixture startup differs from production user-validation events. Missing-original-middleware story has no pre-fix evidence. | Related JWT behavior VERIFIED; original retest UNVERIFIED |
| DEF-06 | PostgreSQL opt-in attributes and live recommendation transport | Final backend run skips a live provider transport case and the scanner host harness. Relational tests executed locally; original '9 cloud-secret tests' explanation/count is inaccurate for this checkout. | Historical count superseded; remaining live test BLOCKED |
| DEF-07 | Section 7 historic p95 180 ms / 200 ms target | 180 ms is below the stated target and is an observation, not a demonstrated defect. Original measurement unsupported; fresh k6 did not measure login latency. | OBSERVATION; metric UNVERIFIED |
| DEF-08 | AppointmentService, AvailabilityService, RecurringSchedulingTests; appointment source history | Current schedule uses office-time DateOnly/TimeOnly and verified recurring overlap/occupancy rules. Original UTC-conversion patch and two-zone collision retest were not reproduced. | Original retest UNVERIFIED |
| DEF-09 | CareersController [Authorize(Roles="Admin")]; WorkforceAndCareerWritesRequireAdmin | Current unauthenticated writes receive 401 and Customer/Lawyer/Clerk writes 403 in real HTTP fixtures. Historical missing-attribute state not reproduced. | Current restriction VERIFIED |
| DEF-10 | 327bebf; auth.spec.ts; routing/UI tests | Commit exists and current mocked browser auth/navigation tests pass; the precise prior auto-redirect loop has no independent before/after reproduction. | Original retest UNVERIFIED |
| DEF-11 | 241db17; apiClient.ts; authApi.ts; launchSettings; current UI and Node tests | Token/request behavior is tested in fixtures; no real IPv6-refusal/reload test against configured deployed backend was run. Commit alone does not prove remediation. | Original retest UNVERIFIED |
| DEF-12 | DocumentFileService.UploadFileAsync; Qmse_DEF12_SpoofedPdfMustBeRejected | 32 inert ASCII bytes beginning MZ, filename sample.pdf, Content-Type application/pdf: upload succeeds; expected rejection assertion fails. No magic-byte validation exists. No executable was created/run. This reproduces the acceptance weakness at service scope, not remote code execution. | OPEN; retest FAILED; report's FIXED claim contradicted |
| DEF-13 | DbInitializer.SeedDocumentationServicesAsync; 587e892 | Qmse_DEF13_SeedsTwelveServicesIdempotently calls actual seeder twice on a fresh fixture; 12 records remain after each call. No live Document Agent workflow was executed. | Seeder behavior VERIFIED; full agent retest UNVERIFIED |
| DEF-14 | document_validation thresholds, OCR/classification mocks | Threshold tests and mocked OCR pass. Original low-resolution live Gemini classification, exact 60% fallback and confident verdict were not reproduced. | Original retest UNVERIFIED |
| DEF-15 | 9579cee; AuthController; HealthController; JWT and registration tests; ZAP login probe | Wrong credentials return 401; expired/tampered tokens denied; duplicate signup rejected in isolated PostgreSQL. These verify selected current controls, not every claim in the broad historic defect entry or production startup. | Partial current verification; overall original retest UNVERIFIED |

## Report expectation conflicts

- TC-C107: Report 10–1000 query boundary differs from current 3–4000 requirement boundary. Recorded original expectation fails; current-contract tests pass. Obtain approved SE3090 requirement before declaring application logic wrong.
- TC-C112: Tested headroom 19/20/21% maps to WATCH for all three inputs with current 0.75 ratio. No reported below-20% automatic proposal trigger exists. Current capacity tests pass; original expectation conflicts.
- TC-C2-09: 23h59m/24h/24h01m are all cancellable. Current behavior tests pass, while the report's below-24h rejection expectation fails. Requirement owner must confirm intended cancellation rule.
- TC-C2-11: Booking at 08:00/20:00 outside schedule is rejected with service 409, rather than 400. No rows inserted. Expected setup/outcome is updated to current implementation, with the status-code conflict disclosed.

There are no new defect fixes or remediation retests in this task. The historical '15 found, 13 fixed, 13 retests passed' totals are not promoted to verified facts. Four report-case failures include three expectation conflicts and the reproduced spoofed-upload weakness; this differs from the one failing assertion in the machine suite.
