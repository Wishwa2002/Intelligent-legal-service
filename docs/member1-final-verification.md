# Member 1 final verification — Intelligent Legal Service

Reviewed and verified on 3–4 October 2026; the saved domain audit is dated 3 October. Scope: Lawyer & Legal Service Management, with necessary compatibility checks in appointments, authorization, Flutter and the Python service. Changes are targeted; existing routes, shared appointment APIs and database schema were retained.

## 1. Domain consistency

Inspected the Lawyer, Specialization, LawyerSpecialization, LegalService and LawyerLegalService entities; EF mappings and seeds; lawyer/catalog/summary controllers and DTOs; recommendation and appointment services; initialization/demo seeding; React APIs, forms, routes and components; Flutter directory/profile screens; Python schemas, Gemini interpreter and LangGraph; and existing tests. The initial implementation plan was to repair inconsistent eligibility queries first, harden AI/approval boundaries second, extract only oversized React responsibilities, polish the four screens and then verify each layer.

The logical model is one Practice Area per Lawyer and one per Legal Service. Eligibility requires an active lawyer with exactly one area matching the service's catalog area. Recommendation retrieval additionally rejects invalid recorded experience and applies requested-date availability when supplied.

**Compatibility limitation:** the physical schema still stores lawyer membership in `LawyerSpecialization` and service membership in the canonical `LegalService.Category` name. It does not have non-null `PracticeAreaId` foreign keys enforcing the proposed model directly. Member 1 create/update validates one catalog selection; update repairs old multiple links. Recommendation and eligibility queries exclude ambiguous memberships. Service writes validate the catalog, and catalog rename maintains category references. These controls do not prevent arbitrary direct SQL or another future caller from writing inconsistent records. A schema migration was deliberately avoided because it would affect shared code. This is application enforcement, not a claimed database cardinality guarantee.

Read-only audit of the currently configured project database through the API:

| Observation | Verified result |
|---|---:|
| Total lawyers | 34 |
| Active lawyers | 29 |
| Lawyers with exactly one Practice Area | 34 |
| Missing/multiple lawyer memberships | 0 |
| Practice Areas | 5 |
| Legal Services | 25 |
| Services matching a catalog area | 25 |
| Services outside the catalog | 0 |
| Family Law exists | No |

Evidence: [member1-domain-audit.json](member1-domain-audit.json). These are observed values, not hardcoded UI totals. The five names are Corporate & Commercial Law, Criminal Law, Labour & Employment Law, Real Estate & Property Law and Tax Law.

Inconsistencies repaired:

- Lawyer profile services and public service counts used legacy direct links. They now derive services/counts from Practice Area and active, single-area membership.
- Availability/directory/summary queries could count expired or non-positive-duration slots. Member 1 now uses future, unbooked, positive-duration recorded slots.
- Old initialization and demo fixtures included Family Law. Initialization safely retires only untouched bootstrap Family records with no dependent custom/history data. It does not wipe an established Admin catalog. Demo generation uses the existing five-area catalog; historical migrations remain intact.
- Visible Member 1 labels now use Practice Area(s), Eligible Lawyers or Registered Lawyers, including the relevant Flutter directory/profile screens. Backend `Specialization` names and routes remain compatible.
- Legacy entities are retained and commented. Legacy references are considered for safe deletion compatibility, but do not determine eligibility, expertise, ranking or assignment. No manual assignment UI was added.

## 2. AI guardrails

Gemini performs structured legal interpretation. It has no booking/database-write tool. Python validates its strict structured output against the supplied catalog; extra fields containing invented lawyers, customer/slot IDs or fabricated reasons are rejected. Trusted snapshot records supply all candidate IDs. LangGraph retrieves eligible active candidates, checks date availability, ranks deterministically and stops at human approval. ASP.NET independently validates the returned IDs, category/date and current database records, and rebuilds names, points and reasons from those records.

Ranking was simplified: Practice Area match and requested-date availability are hard gates, so identical category/date bonuses added no ordering value. Recommendation Points now equal recorded years of experience, validated from 0 to 70, with a stable lawyer-ID tie break. There is no legacy-link bonus, rating, success statistic, percentage, win probability or “Best Lawyer” claim.

Both controlled tests and a separate live Gemini check cover the supplied prompts:

| Requirement | Live interpretation | Result |
|---|---|---|
| I need a lawyer to review a commercial contract. | Corporate & Commercial Law | PASS |
| I have been charged with an offence and need legal representation. | Criminal Law | PASS after transient-service retry |
| My employer terminated me without proper notice. | Labour & Employment Law | PASS after transient-service retry |
| I have a dispute about ownership of my land. | Real Estate & Property Law | PASS |
| I received a tax assessment that I believe is incorrect. | Tax Law | PASS |
| I need help with divorce and child custody. | No Supported Practice Area; zero recommendations | PASS |
| banana rocket purple chair | No Supported Practice Area; zero recommendations | PASS after transient-service retry |

Live evidence: [member1-live-ai-results.json](member1-live-ai-results.json), including failed first attempts. This evaluator sends only user-supplied test sentences and area names, with synthetic catalog IDs and an empty candidate list. Supported cases therefore finish as `NO_MATCH`: it proves interpretation, not live lawyer retrieval or booking. An initial database-reading evaluator was rejected by automatic approval review; it was replaced with this static, non-personal payload before any such external call occurred.

Additional tests cover inactive/multi-area lawyers, no eligible candidates, zero available candidates, date filtering before the result limit, no-date behavior, invalid/past dates, invalid category/type output, deterministic ties and arbitrary-ID injection. Backend tests reject fabricated result IDs, duplicate IDs, inactive IDs, inconsistent categories/dates, and replace fabricated profile text/score/reason with database-derived values. Errors fail closed rather than recommending an unrelated category.

No preferred date: the UI says **Availability Not Filtered** and asks the Admin to check an actual slot before booking. Preferred date: it is persisted and locked; only lawyers with recorded valid availability on that date qualify. Changing dates requires a new recommendation. Booked slots are excluded. Member 1 uses the read-only lawyer availability API, because the shared appointment availability endpoint can generate default slots.

## 3. Human approval and persistence

Existing `LawyerRecommendationWorkflows` persist the requirement, interpreted catalog area, requested date, validated recommendations, owner, status, audit events and final appointment ID. Statuses are `RECEIVED`, `AWAITING_APPROVAL`, `UNSUPPORTED`, `NO_MATCH`, `FAILED` and `ACTION_COMPLETED`; the last is the API's existing name for Completed. The UI presents persisted stages and safe summaries, not hidden model reasoning or simulated progress.

Approval verifies workflow ownership/existence and `AWAITING_APPROVAL`, inclusion of the selected lawyer in the persisted recommendation, current active/single-area membership, existing Customer account, slot existence and ownership, future positive duration, unbooked state and the persisted preferred-date constraint. The existing AppointmentService creates the appointment inside the workflow's serializable transaction. PostgreSQL serialization/uniqueness conflicts become HTTP 409 rather than an unhandled error.

| Requested flow | Evidence and behavior |
|---|---|
| Generate then refresh | Browser test restores via GET, with no second recommendation POST. HTTP tests reload the same saved workflow. |
| Open `?workflow=<id>` | Browser and HTTP tests load the saved workflow directly. |
| Complete then refresh | Browser and HTTP tests restore `ACTION_COMPLETED` and its appointment reference. |
| Approve completed workflow again | Frontend approval controls are absent/blocked; backend returns 409. |
| Slot becomes booked | Backend rejects 409. UI clears the stale selection, reloads recorded slots and can choose another valid slot under the same date rule. |
| Lawyer becomes inactive | Backend rejects approval; no appointment is created. |
| Simultaneous approvals | Real local PostgreSQL tests cover the same workflow twice and two workflows competing for one slot: one appointment, one completed workflow, one 409. |

Browser tests use mocked API responses. HTTP/service tests use controlled fixtures; concurrency/provider tests create and remove their own local PostgreSQL database. No real project customer appointment was created during this review. A browser-to-real-project-database booking with live Gemini was not performed, so this report does not claim that full live E2E result.

## 4. React architecture against SE3090

Kept the reasonable existing organization (`src/components/lawyers`, `src/pages/admin`, `src/api`, route definitions and shared auth/client) rather than moving the whole module into a new feature tree.

- **UI/API separation:** pages and components call API service modules using the existing configured `apiClient`. No second axios instance was introduced. Importing axios in the hook only identifies Axios errors.
- **Custom hook:** extracted `useRecommendationWorkflow` for restoration, generation, customer/slot retrieval and approval state. It ignores stale async responses, debounces customer search, guards duplicate requests and refreshes persisted state after a 409. It has one domain responsibility.
- **Reusable form:** extracted `LawyerFormDialog` from the oversized Lawyers page. React Hook Form and Zod validate name, email, license, one catalog area, integer experience 0–70 and field lengths. Understandable field/server errors and submitting guards prevent accidental duplicate writes. Customer, lawyer and slot IDs are selected from API-backed controls rather than typed into UUID fields.
- **Other forms:** catalog managers retain their existing required-field/catalog checks, server error displays and guarded saves/deletes. Recommendation input validates required text/date; backend validation remains authoritative.
- **State:** existing local server-fetching patterns remain; no Redux/TanStack Query rewrite. Modal/filter/form state stays local. Saved workflow data comes from the API/URL, not a global duplicated workflow store. Coverage summary refreshes after module mutations.
- **Request states:** loading/error/retry/empty states are present for directory, catalog, summary, recommendations, restoration and slots; missing workflows have a retry action. Completed workflows do not expose approval actions.
- **Authorization:** inspected existing frontend Admin guards. Browser tests verify unauthenticated redirection and legacy-route redirects. HTTP tests verify unauthenticated/non-Admin restrictions on sensitive member endpoints. Recommendation controller requires Admin; workflow operations also enforce owner identity. Public directory/catalog reads remain intentional.
- **Performance:** existing server pagination/filtering and customer debounce retained. Build still warns about a large shared application bundle; no unrelated routing/code-splitting rewrite was made.

Browser test reliability was also repaired: Playwright discovers only `*.spec.ts`; browser and SSR tests use separate Vite caches, preventing the observed `504 Outdated Optimize Dep` blank pages when multiple servers run.

## 5. UI/UX

The shared heading remains **Lawyer & Legal Service Management**. Lawyers, Practice Areas, Legal Services and AI Recommendation retain existing URLs and a common navy/orange/light-surface operations design. Operational totals and factual coverage warnings come from the real summary endpoint.

- **Lawyers:** compact directory, search, Practice Area/status/date filters, server pagination, actual status, Add/Edit form and clear delete dependency errors. Existing history protection prevents unsafe deletion; no unrelated lifecycle was invented.
- **Practice Areas:** relational lawyer/service counts plus actual future slot coverage. Delete/save guards and dependency errors remain clear. “Assigned” terminology was removed.
- **Legal Services:** area filters, derived Eligible Lawyer counts and matching-practitioner details; no assignment controls.
- **AI Recommendation:** structured requirement form, verified AI/System/Human stages, recommended profiles, recorded experience, Recommendation Points and concise verified reasons. No-date warning, locked preferred date, explicit rerun and human approval controls are clear. Empty/unsupported/error/completed states do not fabricate results.

Reviewed screenshots of all four screens at desktop 1280px and mobile 390px. An initial mobile test missed a clipped main panel; visual inspection caught it. Member 1 now opts into a collapsible overlay sidebar and compact shared header. Other modules retain the layout's existing default behavior. The strengthened browser test checks usable main width, not just document overflow. This is responsive/semantic verification, not a complete WCAG audit.

## 6. Test results and verification commands

Commands below cover executed build/test/lint/live-evaluation checks, including failed attempts and reruns. Routine file reads/searches are inspection, not tests. Repeated runs of a command are consolidated in the result notes. Commands use repo root unless a working directory is specified. Escalated local test execution was needed for server binding, Chromium and local PostgreSQL; no project database migration/demo seed was run.

| Command | Result | Relevant observation |
|---|---|---|
| `dotnet build backend/LegalService.API/LegalService.API.csproj --no-restore` | PASS | Backend builds; NU1900 vulnerability-feed warning. |
| `dotnet test backend/LegalService.Tests/LegalService.Tests.csproj --no-restore --logger 'console;verbosity=minimal'` | Initially FAIL | 78 passed, 2 outdated seed/count expectations failed; corrected fixtures for the intended model. |
| `MEMBER1_TEST_POSTGRES='Host=127.0.0.1;Port=5432;Database=postgres;Username=jeyam' dotnet test backend/LegalService.Tests/LegalService.Tests.csproj --no-restore --logger 'console;verbosity=minimal'` | PASS | Final 109 passed, 0 failed, 0 skipped; includes real provider/concurrency tests. Earlier expanded run had 103 passing before more HTTP tests were added. |
| Same PostgreSQL command with `--filter FullyQualifiedName~Member1PostgresTests` | PASS | 2 tests; generated test databases are removed in `finally`. |
| `.venv/bin/python -m unittest discover -s tests -p 'test_recommendation*.py' -v` in `ai-service` | Initially FAIL; then PASS | Initial 2 failures were obsolete score expectations. Expanded targeted run passed 21 tests; later health coverage is included in full pytest. |
| `.venv/bin/python -m pytest tests/ -q` in `ai-service` | PASS | Final 66 passed; 9 dependency deprecation warnings. |
| `.venv/bin/python scripts/verify_member1_ai.py` in `ai-service` | Initially FAIL | 4 live cases passed; 3 returned transient `GeminiUnavailable`. |
| `.venv/bin/python scripts/verify_member1_ai.py --retry-failed` in `ai-service` | PASS | All 3 retries passed; cumulative 7/7. Safe static inputs only. |
| `npm run build` in `frontend` | PASS | TypeScript + Vite final build; approximately 770KB minified shared JS chunk warning. |
| `npm run test:member1` in `frontend` | PASS | Final 18 Node/SSR/helper tests. |
| `npx playwright test` in `frontend` | Initially FAIL; final PASS | Initial selector failures were corrected; another run exposed a catalog selector ambiguity. A sandbox run could not bind 5175. A later cache-collision run was interrupted after 12 failures/1 interrupted/2 unrun; browser console showed 504 outdated dependency. Cache isolation fixed it. Final run: 15 passed in 13.9s. |
| `npx playwright test tests/member1-guardrails.spec.ts` | PASS on targeted rerun | 7 tests at that stage; suite subsequently expanded. |
| `npx playwright test tests/member1-guardrails.spec.ts --grep 'catalog request'` | PASS | 1 loading/error/retry/empty-state test after correcting the ambiguous selector. |
| `npx playwright test tests/member1-guardrails.spec.ts --grep 'all four Admin'` | PASS | 1 responsive test, rerun after visual fix and stronger width assertions; final full run also passes it. |
| Targeted `npx eslint` command listed below | PASS | All touched Member 1 UI/API/hook/schema files and opted-in shared layout/config pass. An earlier invocation used nonexistent `LawyerRecommendationsPage.tsx`; corrected to `RecommendationsPage.tsx`. Earlier actual Member 1 lint errors were repaired. |
| `npm run lint > /private/tmp/member1-full-frontend-lint.log 2>&1` in `frontend` | FAIL | 75 errors, 2 warnings in unrelated existing frontend modules; not silently reported as a pass. |
| `/private/tmp/lab9-flutter-sdk/bin/flutter test --no-pub test/lawyer_details_test.dart` in `mobile` | PASS | 3 relevant Flutter tests. |
| `/private/tmp/lab9-flutter-sdk/bin/dart analyze lib/screens/appointments/lawyer_profile_screen.dart lib/screens/appointments/lawyers_screen.dart lib/screens/appointments/specialization_details_screen.dart test/lawyer_details_test.dart` in `mobile` | PASS | No issues in touched mobile files. |
| `git diff --check` | PASS | No whitespace errors. |
| Read-only API domain audit, Python script; local PostgreSQL version check | PASS | Audit JSON records all counts above; local PostgreSQL 18.3 used for isolated tests. |
| `node --input-type=module` with inline Playwright login smoke check in `frontend` | PASS | Running frontend at 5173 rendered its labeled login input; no uncaught browser errors. This was not an actual Admin login. |
| Local HTTP health checks | PASS at verification | Frontend 5173, API 5295, shared Python 8001 and Member 1 Python 8002 returned 200. |

Final targeted lint command, from `frontend`:

```sh
npx eslint src/api/lawyersApi.ts src/api/recommendationsApi.ts src/components/lawyers src/hooks/useRecommendationWorkflow.ts src/schemas/lawyerSchema.ts src/pages/admin/LawyersPage.tsx src/pages/admin/SpecializationsPage.tsx src/pages/admin/LegalServicesPage.tsx src/pages/admin/RecommendationsPage.tsx src/pages/admin/LawyerLegalServicesLayout.tsx src/components/layout/AdminLayout.tsx vite.config.ts playwright.config.ts
```

The .NET suite also reports the existing EF Relational 8.0.8/8.0.29 assembly warning. This review did not change package versions. Browser tests use fixtures rather than real database bookings; Python automated tests mock interpretation, supplemented by the explicitly separate live seven-case evaluator. Flutter tests cover the touched directory/details flow, not a complete mobile recommendation approval E2E.

## 7. Remaining issues

| Classification | Issue | Practical implication |
|---|---|---|
| CRITICAL | None identified in the inspected and tested Member 1 paths | This is scoped evidence, not a claim that the whole project is defect-free. |
| SHOULD FIX | Physical schema lacks direct one-area cardinality/FK enforcement | Member 1 enforces it and current records pass; future shared writers/direct SQL need equivalent validation. A coordinated migration is separate work. |
| SHOULD FIX | Full-project frontend lint: 75 errors/2 warnings elsewhere | Member 1 targeted lint passes. Other members' code still needs cleanup. |
| SHOULD FIX | Existing EF Relational package/assembly mismatch and unavailable vulnerability feed | Align versions/check package advisories in a coordinated dependency change. Builds/tests currently pass. |
| SHOULD FIX | Live Gemini transient failures | Three first attempts failed; retry succeeded. Keep the controlled 503 UX and rehearse with the actual demo network/key/model. |
| SHOULD FIX before demo | Rehearse one real Admin login → recommendation → approval → refresh in an authorized demo database | Layered tests passed, but no real-project booking was made in this review. Ensure real Customer and future slots exist. |
| OPTIONAL | Code-split large frontend bundle | Improves first load; unrelated shared architecture was preserved. |
| OPTIONAL | Shared footer wording says Clerk Management / ASP.NET Core 9 despite the backend targeting net8.0 | Cosmetic inherited layout text; left untouched outside Member 1 scope. |
| OPTIONAL | Broader accessibility/mobile workflow E2E | Current semantic labels/responsive checks and relevant Flutter tests passed; no exhaustive audit. |

## 8. Files changed and reasons

Paths are relative to the repository. Pre-existing user changes to API `appsettings.json`, `appsettings.Development.json` and `mobile/pubspec.yaml` were preserved; they are not changes made for this review.

| File | Why changed |
|---|---|
| `ai-service/lawyer_recommendation/agent.py` | Strict interpretation validation, date/active/single-area guards, filter before limit and deterministic experience-only points. |
| `ai-service/lawyer_recommendation/app.py` | Minimal safe health endpoint. |
| `ai-service/tests/test_recommendation.py` | Supported catalog fixtures and corrected score expectations. |
| `ai-service/tests/test_recommendation_snapshot.py` | Corrected points and health coverage. |
| `ai-service/tests/test_recommendation_guardrails.py` | New supported/unsupported/nonsense, invalid output, date/filter and injection tests. |
| `ai-service/scripts/verify_member1_ai.py` | Reproducible live seven-case evaluator using safe synthetic/static inputs. |
| `backend/LegalService.API/Controllers/LawyersController.cs` | Derived profile services, actual future availability, status filter and safe area terminology. |
| `backend/LegalService.API/Controllers/LegalCatalogController.cs` | Consistent derived active eligible counts and catalog errors. |
| `backend/LegalService.API/Controllers/LawyerServicesSummaryController.cs` | Single-area coverage and valid future-slot counts. |
| `backend/LegalService.API/Data/DbInitializer.cs` | Five-area bootstrap and guarded retirement of untouched Family seed. |
| `backend/LegalService.API/Data/DemoLawyerSeeder.cs` | Remove Family templates; use established supported catalog. |
| `backend/LegalService.API/Models/Entities/Lawyer.cs` | Document logical single-area compatibility mapping. |
| `backend/LegalService.API/Models/Entities/LegalService.cs` | Document canonical category compatibility storage. |
| `backend/LegalService.API/Models/Entities/LawyerLegalService.cs` | Explicit legacy-only comment and prohibited eligibility/ranking use. |
| `backend/LegalService.API/Services/Lawyers/RecommendationService.cs` | Snapshot/date/profile/points validation, approval checks and PostgreSQL concurrency-conflict handling. |
| `backend/LegalService.Tests/DemoLawyerSeederTests.cs` | Five-area/service/count expectations and preserved idempotency coverage. |
| `backend/LegalService.Tests/LawyerManagementHttpTests.cs` | Authorization, directory/catalog consistency and persistent real-service HTTP approval tests. |
| `backend/LegalService.Tests/LawyerRecommendationApprovalTests.cs` | Future slot time fixture correction. |
| `backend/LegalService.Tests/Member1RecommendationTests.cs` | Forged AI result, approval failures, ownership, persistence and duplicate coverage. |
| `backend/LegalService.Tests/Member1PostgresTests.cs` | Isolated real-provider queries and two concurrent booking scenarios. |
| `frontend/src/api/lawyersApi.ts` | Status filter and active-area count typing. |
| `frontend/src/api/recommendationsApi.ts` | Read-only recorded lawyer slot retrieval. |
| `frontend/src/hooks/useRecommendationWorkflow.ts` | Extract domain request/state/restoration/approval responsibility and guard submissions. |
| `frontend/src/schemas/lawyerSchema.ts` | Shared lawyer form validation using existing Zod. |
| `frontend/src/components/lawyers/LawyerFormDialog.tsx` | Extract reusable accessible RHF lawyer dialog with field/server errors. |
| `frontend/src/components/lawyers/LawyerRecommendations.tsx` | Presentation-focused structured workflow, date lock, no-date text and request/approval states. |
| `frontend/src/components/lawyers/recommendationWorkflow.ts` | Accurate no-date eligibility stage wording. |
| `frontend/src/components/lawyers/SpecializationManager.tsx` | Practice Area relational coverage, terminology and guarded writes. |
| `frontend/src/components/lawyers/LegalServiceManager.tsx` | Guarded writes and valid catalog selection. |
| `frontend/src/pages/admin/LawyersPage.tsx` | Extract dialog, add status filter and meaningful safe-delete feedback. |
| `frontend/src/pages/admin/SpecializationsPage.tsx` | Reuse real shared coverage in the area manager. |
| `frontend/src/pages/admin/LawyerLegalServicesLayout.tsx` | Opt this module into responsive navigation. |
| `frontend/src/components/layout/AdminLayout.tsx` | Optional mobile overlay/collapsed navigation and compact header for this module. |
| `frontend/tests/recommendation.spec.ts` | Correct points, preferred-date fixture and recorded-slot route. |
| `frontend/tests/member1-guardrails.spec.ts` | New restoration/error/date/slot/form/request-state/responsive browser checks. |
| `frontend/tests/member1-routes.test.mjs` | Isolate SSR Vite dependency cache. |
| `frontend/playwright.config.ts` | Only discover browser specs and select isolated test mode. |
| `frontend/vite.config.ts` | Separate test-server cache from normal dev server. |
| `mobile/lib/screens/appointments/lawyer_profile_screen.dart` | Practice Area and eligible-service terminology/empty state. |
| `mobile/lib/screens/appointments/lawyers_screen.dart` | Visible Practice Area terminology. |
| `mobile/lib/screens/appointments/specialization_details_screen.dart` | Visible Practice Area terminology. |
| `mobile/test/lawyer_details_test.dart` | Assert the updated visible labels. |
| `docs/lawyer-recommendations.md` | Correct catalog, ranking, demo seed and read-only slot documentation. |
| `docs/member1-management-completion.md` | Mark historical report and link final verification. |
| `docs/member1-domain-audit.json` | Non-personal read-only domain audit evidence. |
| `docs/member1-live-ai-results.json` | Live interpretation results with retry history. |
| `docs/member1-final-verification.md` | This scoped implementation, evidence, limitations and viva report. |

## 9. Viva summary

“Member 1 manages lawyers, Practice Areas and Legal Services. Each lawyer and service has one logical Practice Area. A lawyer is eligible when their single Practice Area matches the service and they are active. We retain LawyerLegalService only for older shared compatibility; it contributes no eligibility or ranking information.

“Gemini interprets the requirement into structured catalog information. Trusted application code validates that interpretation, retrieves real active practitioners, applies a requested date when present and ranks by recorded experience with a deterministic tie break. Recommendation Points are neither probabilities nor quality ratings. Without a preferred date, we explicitly state that availability has not been filtered.

“The AI stops at Awaiting Human Approval. An Admin selects a recommended lawyer, an existing Customer and a real slot. The backend rechecks the workflow, practitioner, customer, slot and date, then creates the appointment transactionally. Serializable PostgreSQL handling prevents competing approvals from creating two bookings in the tested scenarios.

“The workflow and audit events are saved in the database. Its ID stays in the URL, so refresh and direct links restore the same state, including Completed. Frontend Admin guards improve navigation; backend Admin authorization and workflow ownership checks enforce access. Our existing physical schema is retained for compatibility, with single-area membership enforced by Member 1 validation.”

Local processes were running at verification: frontend http://localhost:5173, backend http://localhost:5295, shared AI http://127.0.0.1:8001 and Member 1 AI http://127.0.0.1:8002. The Flutter app was launched on the Android emulator earlier in the session; final mobile verification used the tests above.
