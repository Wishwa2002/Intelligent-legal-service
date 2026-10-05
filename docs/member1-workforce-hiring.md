# Member 1 — Workforce & Hiring Intelligence

Implementation and verification report, 2026-10-04.

## Result and activation limits

The fifth Member 1 section is `/admin/lawyer-services/ai-operations`. It provides deterministic workforce analysis, an accessible analysis dialog, explicit AI drafting, editable persisted suggestions, human approval, and creation through the existing `ICareerService`. Careers remains the management and listing source of truth.

Verified in isolated databases, authenticated HTTP tests, and Chromium with API fixtures. **Workforce analysis is now activated and verified on the Neon Development database**, following the targeted missing-schema fix below. The earlier migration attempt had been blocked pending compatibility checks. Only the reviewed additive SQL in `docs/sql/member1-workforce-hiring.sql` was subsequently applied; unrelated pending migrations were excluded. No Career posting was created.

## Live workforce 500 fix — 4 October 2026

The signed-in `GET /api/workforce-analysis` reproduced HTTP 500. Safe backend diagnostics identified PostgreSQL `42703`: `Careers.PracticeAreaId` did not exist. Schema inspection also confirmed that `HiringSuggestionWorkflows` was absent. The application expected the existing `AddWorkforceHiringIntelligence` migration, but the current database had not applied it. This failure was independent of Gemini; workforce analysis is deterministic database logic.

Before activation, the affected tables, primary-key types, and migration history were checked. Twenty-six focused tests passed, including two real PostgreSQL migration/concurrency tests against disposable local databases. The existing feature SQL was applied in one transaction, with lock/statement timeouts and a before/after equality assertion for all pre-existing Career fields. Existing Career data was unchanged. No account, password, existing appointment, recommendation, or legal catalog record was modified, and no unrelated migration was run.

Verified after activation:

- Admin workforce GET: HTTP 200, five real Practice Areas.
- Existing Careers GET: HTTP 200, original one Career record retained and still unlinked.
- Anonymous workforce GET: HTTP 401.
- Feature migration recorded once; new hiring workflow table empty.
- Real port-5173 Admin login and `/admin/lawyer-services/ai-operations`: five workforce rows, no error banner.
- View Analysis dialog opens; browser refresh reloads the successful analysis.
- Phone width 390px: no page horizontal overflow.
- Zero hiring-generation requests during verification; no Gemini quota consumed.

Commands/checks executed for this fix:

| Check | Result |
| --- | --- |
| Normal private-source Admin login and workforce GET before fix | Reproduced HTTP 500; PostgreSQL missing-column metadata captured safely |
| Read-only schema/migration inspection | PASS — missing feature objects and compatible affected key types confirmed |
| `dotnet test backend/LegalService.Tests/LegalService.Tests.csproj --no-restore --filter 'FullyQualifiedName~WorkforcePostgresTests\|FullyQualifiedName~WorkforceHiringTests' --verbosity minimal` with private local test PostgreSQL configuration | PASS — 26 tests, zero skipped; backend build succeeded; existing NuGet vulnerability-feed connectivity warnings |
| Existing additive workforce SQL with transactional preservation checks | PASS — only feature migration applied, original Career fields unchanged |
| Authenticated workforce/Careers GET and anonymous workforce GET | PASS — 200 / 200 / 401 |
| Read-only post-migration counts | PASS — migration present once, one original Career, zero hiring workflows |
| Private launcher running `node /private/tmp/member1-workforce-ui-verify.mjs` | PASS — actual login, five rows, dialog, refresh, no phone overflow, zero AI generation calls |
| `git diff --check` | PASS after documentation update |

No application source changes or new migration were necessary for this fix. Frontend builds/full browser suites and Python tests were not rerun because their code was unchanged. Successful live AI drafting and human-approved Careers creation remain unverified and still require provider availability.

Live hiring drafting was attempted. The optional Google SDK aiohttp transport initially failed with a closed connector assertion. The new drafting client now explicitly uses the already-installed HTTPX transport and closes it after the call. A connectivity diagnostic then returned **Google HTTP 429**. The live draft did not succeed, and no draft or opening was persisted by that diagnostic. Provider failures return a controlled 503; malformed output returns 422. A successful live Gemini-to-Careers production flow is therefore not claimed.

## Deterministic SYSTEM logic

`WorkforceAnalysisService` loads the real Specialization catalog; names and counts are never hardcoded. It counts active lawyers with exactly one Practice Area membership and services matching the existing Category relation. The legacy `LawyerLegalService` join is not used.

Defaults are centralized in `WorkforceOptions` and overridable using ASP.NET configuration under `Workforce`:

- Recent window: 30 days, inclusive creation timestamps from now minus 30 days through now.
- Future window: next 30 days, exclusive start-time bounds: now < slot start < now plus 30 days.
- Minimum demand: 5; watch ratio: 0.75; concern ratio: 1.0.
- Maximum snapshot age: 24 hours.

Demand sources are persisted recommendation workflows with a catalog CategoryId and status `AWAITING_APPROVAL`, `ACTION_COMPLETED`, or `NO_MATCH`, and persisted appointments excluding Cancelled/Rejected. Appointment demand uses creation time, not appointment occurrence time, and current single-area lawyer membership. Historical appointments with now-inactive lawyers are still demand. Ambiguous memberships are excluded. Requests are Admin workflow records, not unique cases.

Capacity uses the existing slot representation: unbooked, positive-duration slots belonging through LawyerAvailability to active single-area lawyers, inside the future window. UTC Date/TimeOnly comparisons follow the existing Member 1 convention. Counts are calculated on the backend.

Assessment uses `max(recent requests, recent appointments)` because these signals can overlap:

1. Zero active lawyers → `NO_ACTIVE_LAWYERS`.
2. Demand at least 5 and zero capacity or demand/capacity at least 1.0 → `CAPACITY_CONCERN`.
3. Zero capacity, or demand at least 5 and ratio at least 0.75 → `WATCH`.
4. Otherwise → `HEALTHY`.

Reason codes explain each rule. Existing linked recruitment adds `RECRUITMENT_ALREADY_ACTIVE`; it does not create a score. A read-only aggregate audit of the current Development database found all five areas within HEALTHY rules. No demand was seeded to force concerns. These are explainable heuristics, not calibrated forecasting or proof that hiring is needed.

Service-specific demand is omitted: existing persisted relationships cannot reliably identify demand for a particular Legal Service.

## AI contract

The backend reloads aggregate facts using the Practice Area ID. Browser-supplied metrics or extra request fields are rejected. Only the area name, active-lawyer/service/request/appointment/slot counts, system status/reasons, and window lengths are sent internally to Python using the existing internal key. No lawyer/customer IDs, identities, private requirements or AI secrets are sent to Gemini.

Input: `practiceArea`, `activeLawyerCount`, `legalServiceCount`, `recentDemandCount`, `recentAppointmentCount`, `futureAvailableSlotCount`, `status`, `reasons`, `recentWindowDays`, `futureWindowDays`.

Output: `suggestedTitle`, `operationalReason`, `summary`, `responsibilities`, `focusAreas` only. Pydantic and backend validation enforce required types, length/list bounds, reject unknown fields, restrict generated focus areas to the supplied catalog name, and reject specified unprovided employment-condition terminology. The prompt forbids invented salary, location, employment conditions, experience, qualifications, benefits, hours and vacancies. Free-text content still requires Admin review; structural validation is not a guarantee of factual perfection.

LangGraph has two nodes: draft content and validate content. It ends immediately afterward and has no database, approval, publishing or Careers tools. No hidden reasoning is returned or saved. Gemini runs only on explicit Generate/Regenerate actions.

## HUMAN approval and Careers integration

The existing Careers create contract requires **JobTitle and Description** only. No salary/location/qualification fields were invented. The Admin edits the structured draft, continues, reviews the final Career title and description, and explicitly selects Approve & Create Career Opening.

Saved states are `AWAITING_APPROVAL`, `CAREER_OPENING_CREATED`, and `DISMISSED`. Intermediate detected/drafting states are not faked or persisted. Failed generation saves no malformed draft. Persistence includes aggregate snapshot, original AI draft, reviewed draft, owner, approval metadata and optional opening link. Refresh/share URLs use `?hiring=<workflowId>`. Private workflows are available only to their owning Admin.

Approval rechecks ownership, awaiting status, current area, snapshot age, all operational counts and status, linked recruitment, and required Careers fields. Draft editing does not extend snapshot freshness. Changed/expired facts require regeneration. A serializable transaction covers existing CareerService creation and workflow completion. Database uniqueness permits one linked existing opening per area and one pending suggestion per Admin/area. The Status concurrency token rejects stale updates after completion. Wrapped PostgreSQL serialization conflicts return 409. Repeated approval is rejected.

Career receives only an optional `PracticeAreaId`; the existing entity, DTOs, service, controller and dashboard are reused. Existing manual create requests remain valid without a link; existing dashboard edits preserve a link when the optional field is omitted. Career writes now require Admin authorization; public Career reads remain public.

**Existing architecture limitation:** Careers has no open/closed lifecycle field. Every existing Career record is treated as open. Older/manual unlinked openings cannot be matched reliably by title; the UI requires the Admin to review them, and the backend requires that explicit acknowledgement when any unlinked posting exists. No fuzzy matching or lifecycle redesign was introduced. Deleting an opening in Careers removes the active link while preserving completed workflow history.

## Files created

| File | Purpose |
| --- | --- |
| `backend/LegalService.API/Controllers/WorkforceAnalysisController.cs` | Admin analysis/generation/restoration/edit/dismiss/approval endpoints. |
| `backend/LegalService.API/DTOs/Workforce/WorkforceDtos.cs` | Strict aggregate, workflow, draft and request contracts. |
| `backend/LegalService.API/Models/Entities/HiringSuggestionWorkflow.cs` | Verified snapshot/draft/approval persistence. |
| `backend/LegalService.API/Services/Workforce/WorkforceAnalysisService.cs` | Central rules, real catalog/demand/capacity queries. |
| `backend/LegalService.API/Services/Workforce/HiringSuggestionService.cs` | Validated AI bridge and human approval orchestration. |
| `backend/LegalService.API/Migrations/20261003233848_AddWorkforceHiringIntelligence.cs` | Additive hiring table, nullable Career area link, foreign keys and uniqueness. |
| Same migration `.Designer.cs` | EF migration metadata. |
| `backend/LegalService.Tests/WorkforceHiringTests.cs` | 24 service/query/threshold/approval/guardrail cases. |
| `backend/LegalService.Tests/WorkforcePostgresTests.cs` | 2 real PostgreSQL migration/concurrent-approval cases. |
| `ai-service/workforce_hiring/__init__.py` | New drafting package. |
| `ai-service/workforce_hiring/drafting.py` | Strict facts/draft models, Gemini client and two-node graph. |
| `ai-service/tests/test_workforce_hiring.py` | 6 Python guardrail and endpoint tests. |
| `frontend/src/features/lawyerServices/aiOperations/services/workforceApi.ts` | Calls through the existing configured HTTP client. |
| `.../hooks/useWorkforceAnalysis.ts` | Analysis request/loading/error/refresh state. |
| `.../hooks/useHiringSuggestion.ts` | URL restoration and guarded workflow mutations. |
| `.../schemas/hiringSuggestionSchema.ts` | Zod draft and final Career field validation. |
| `.../components/WorkforceAnalysisList.tsx` | Compact real-data rows and statuses. |
| `.../components/WorkforceAnalysisDrawer.tsx` | Native dialog, system facts, assessments and recruitment links. |
| `.../components/HiringSuggestionDraft.tsx` | Review-required draft display/editing. |
| `.../components/CareerOpeningApprovalForm.tsx` | Human-owned existing Career title/description approval. |
| `.../pages/AIOperationsPage.tsx` | Feature orchestration and request/empty/completion states. |
| `.../workforceLabels.ts` | Shared factual status/reason text. |
| `frontend/tests/workforce-hiring.spec.ts` | 5 browser scenarios, including responsive widths. |
| `docs/sql/member1-workforce-hiring.sql` | Reviewable standalone feature migration, not applied remotely. |
| This report | Implementation, tests, activation limits. |

## Files modified for this feature

- `LegalService.sln`: includes the existing test project so the existing backend CI `dotnet test LegalService.sln` command actually discovers tests. Previously it returned successfully without running any tests.
- `backend/LegalService.API/Data/ApplicationDbContext.cs`: workflow mapping, JSONB, nullable links, indexes and Status concurrency token.
- `backend/LegalService.API/Migrations/ApplicationDbContextModelSnapshot.cs`: new feature model metadata.
- `backend/LegalService.API/Models/Entities/Career.cs`: optional Practice Area ID.
- `backend/LegalService.API/DTOs/Requests/CareerRequests.cs`: optional association, backward-compatible manual requests.
- `backend/LegalService.API/DTOs/Responses/CareerResponses.cs`: exposes the optional association.
- `backend/LegalService.API/Services/CareerService.cs`: validates optional area/duplicates, preserves association in existing edits.
- `backend/LegalService.API/Controllers/CareersController.cs`: Admin authorization on create/update/delete.
- `backend/LegalService.API/Infrastructure/ApiException.cs`: controlled stale-workflow conflict response.
- `backend/LegalService.API/Program.cs`: existing DI/configuration and scoped exception handling for the new API and Careers.
- `backend/LegalService.Tests/LawyerManagementHttpTests.cs`: 5 new authenticated HTTP cases covering Admin authorization, workflow creation/approval, normal Careers listing and rejection of injected metrics/duplicates.
- `ai-service/lawyer_recommendation/app.py`: internal authenticated hiring endpoint alongside the existing recommendation API.
- `frontend/src/pages/admin/LawyerLegalServicesLayout.tsx`: fifth tab in existing responsive navigation.
- `frontend/src/routes/LawyerLegalServicesRoutes.tsx`: AI Operations child route inside existing Admin guard.
- `frontend/tests/member1-routes.test.mjs`: validates the fifth route and expected navigation order.

Other pre-existing working-tree changes, including unrelated migrations/config/mobile changes, were preserved. No frontend dependency was installed. The existing Careers dashboard was not duplicated or rewritten.

## Verification

| Command / check | Result |
| --- | --- |
| `dotnet build backend/LegalService.API/LegalService.API.csproj --no-restore --verbosity minimal` | PASS, zero errors. NuGet vulnerability-feed network warning. |
| `MEMBER1_TEST_POSTGRES='Host=127.0.0.1;Port=5432;Database=postgres;Username=jeyam' dotnet test backend/LegalService.Tests/LegalService.Tests.csproj --no-restore --verbosity minimal` | PASS, 142 tests, zero skipped. |
| Same environment with `dotnet test LegalService.sln --no-restore --verbosity minimal` after adding test project | PASS, 142 tests, zero skipped; existing CI command now discovers tests. |
| `dotnet build LegalService.sln --configuration Release --no-restore --disable-build-servers /p:UseSharedCompilation=false --verbosity minimal` | PASS, zero errors. The first sandbox build stalled in its shared compiler; the independent build succeeded. |
| Same PostgreSQL test environment with `dotnet test LegalService.sln --configuration Release --no-build --no-restore --verbosity minimal` | PASS, 142 tests, zero skipped. |
| `MEMBER1_TEST_POSTGRES=... dotnet test ... --filter FullyQualifiedName~WorkforcePostgres --verbosity minimal` | PASS, 2 simultaneous-approval cases. New migration Up/Down SQL exercised against disposable local databases; manual Careers posting preserved. |
| `.venv/bin/python -m pytest -q` from `ai-service` | PASS, 72 tests including 6 new hiring tests. Existing deprecation warnings. |
| `npm run build` from `frontend` | PASS, TypeScript and Vite. Existing large-bundle warning remains. |
| `npm run test:member1` | PASS, 18 tests. |
| `npm run test:e2e -- --workers=1` | PASS, 21 Playwright tests including 5 new hiring scenarios. Browser API responses are fixtures. |
| `npx eslint src/features/lawyerServices/aiOperations src/routes/LawyerLegalServicesRoutes.tsx tests/workforce-hiring.spec.ts` | PASS, no errors/warnings. |
| `git diff --check` | PASS. |
| Read-only Development catalog/aggregate audit | PASS; real data/windows checked, all current areas assessed HEALTHY. |
| Live hiring LangGraph/Gemini check | FAIL/unavailable: provider HTTP 429 after transport correction. Controlled failure; no business action. |
| Apply feature migration to shared remote Development DB | BLOCKED by automatic approval review. Not applied. |

Initial test runs exposed an old four-route assertion, mismatched browser fixtures/labels, an omitted TypeScript type import, and wrapped PostgreSQL serialization errors. These were corrected and relevant commands rerun successfully. Sandbox initially blocked test-runner socket binding; approved local test execution succeeded. No unrelated project-wide lint cleanup was attempted.

PostgreSQL tests create and drop only generated temporary local databases. Browser cases exercise generation only after a click, review-required display, editable persistence, empty/error/retry states, existing-recruitment disablement, stale approval, completion restoration, duplicate prevention, and navigation to the real Careers dashboard component. Native dialog focus/cancel behavior and overflow assertions were exercised at 1440, 1024, 768, 390, 375 and 320 pixels; desktop/phone screenshots were visually inspected. No horizontal overflow was found. This is not a claim of live production end-to-end verification.

## Screens and next steps

### Hiring 503 follow-up — 2026-10-04 09:37 Asia/Colombo

The reported error was the controlled failure of hiring draft generation, rather than workforce analysis. The previous live hiring verification recorded provider HTTP 429. The old hiring drafter discarded provider metadata, so the specific screenshot request cannot retrospectively be tied to a provider status from its trace ID. Do not treat that inference as a confirmed diagnosis of that individual request.

Added safe diagnostics in `ai-service/workforce_hiring/drafting.py` and `ai-service/lawyer_recommendation/app.py`: provider stage/status, exception type and numeric retry delay, plus internal-authentication, draft-validation and workflow-timeout categories. Provider exception text, credentials and request content are not logged. A mocked quota test in `ai-service/tests/test_workforce_hiring.py` verifies safe metadata and exactly one provider attempt. No fallback draft or automatic retry was added.

Restarted only the recommendation/hiring service using unchanged private configuration. One real, normally signed-in browser action subsequently returned HTTP 200 from `/api/workforce-analysis/suggestions`. Workforce analysis returned HTTP 200 and displayed five areas. Neon contained one structured hiring draft in `AWAITING_APPROVAL`, with no linked Career Opening. The Careers count remained one. A separate signed-in browser check restored this draft and refreshed successfully with `AI Generated — Review Required`, making zero generation requests. No Career Opening was approved or created during this check; live Careers approval remains outside this follow-up's verification.

Commands/results:

- From `ai-service`: `.venv/bin/python -m pytest -q tests/test_workforce_hiring.py tests/test_recommendation_gemini.py` — PASS, 13 tests.
- From `ai-service`: `.venv/bin/python -m pytest -q` — PASS, 82 tests, existing deprecation warnings.
- `ai-service/.venv/bin/python /private/tmp/member1-hiring-run.py` — PASS, normal browser login, analysis 200, hiring 200, one generation action.
- `ai-service/.venv/bin/python /private/tmp/member1-workforce-after.py` — PASS, read-only Neon audit: one workflow and unchanged Careers count.
- `ai-service/.venv/bin/python /private/tmp/member1-hiring-persistence.py` — initial temporary-helper run FAIL due to SQL string quoting; corrected helper rerun PASS, structured draft awaiting approval.
- `ai-service/.venv/bin/python /private/tmp/member1-hiring-restore-run.py` — PASS, draft restoration and refresh, review-required label, zero generation actions.
- `git diff --check` — PASS.

The reported generation action is working in this live check. Provider quota/availability can still produce a safe 503 in future; diagnostics now distinguish its category. No backend, frontend, account, key or model configuration was changed for this follow-up.

Review `/admin/lawyer-services/ai-operations`, its View Analysis dialog, `?hiring=<workflowId>` restoration, and `/admin/careers` after approval.

Required before shared-environment demo: resolve the Gemini HTTP 429 condition, then perform a live authenticated generation/edit/approval/refresh/Careers check. Workforce analysis and its schema activation are verified; a successful live hiring draft and approval remain unverified.

Optional future work belongs with Careers ownership: a proper open/closed lifecycle and linking older manual postings. Service-level demand can be added only when a reliable persisted service relationship exists.
