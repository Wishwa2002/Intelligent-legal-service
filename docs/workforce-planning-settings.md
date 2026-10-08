# Workforce Planning Settings and Development Scenarios

Implementation extends the existing Workforce & Hiring Intelligence feature. The analysis, saved hiring workflow, two-node AI drafting graph, human approval and Careers module remain in place.

## Responsibility

| Owner | Responsibility |
| --- | --- |
| SYSTEM | Reads persisted workforce settings and actual records; applies thresholds, computes `max(requests, appointments)`, assigns status and revalidates snapshots. |
| AI | Drafts hiring proposal content from verified facts after a concern. Cannot configure rules, approve hiring or create Careers. |
| HUMAN | Configures per-area rules, reviews proposal content and approves the final Career Opening. |

## Schema and defaults

`PracticeAreaWorkforceSettings` has an integer identity key, integer Practice Area foreign key, a unique index allowing one setting per area, five numeric rules, UTC CreatedAt/UpdatedAt and the updating Admin's integer UpdatedBy. Database checks and backend validation enforce count bounds and target >= minimum. Counts allow: minimum 0–100, target 0–200, slots 0–1000, demand threshold 0–10000. Watch ratio must be 0.0001–1; the frontend edits it as a percentage.

`WorkforceDemoStates` stores one exact-ID ownership registry in JSONB with UpdatedAt and optimistic concurrency checking. The scenario service also uses a serializable transaction on PostgreSQL.

An unconfigured area reports DEFAULT: minimum lawyers 0, target 0, minimum slots 0, high-demand threshold from the existing global MinimumDemand (5 by default), watch ratio from existing WatchRatio (0.75 by default). Zero staffing/slot floors preserve the original behavior rather than introducing new shortages. A saved setting reports CUSTOM. Reset to Defaults deletes only that area's custom setting; it does not change lawyers or appointments.

Migration: `20261004061310_AddWorkforcePlanningSettings`. Its Up adds only the two tables, constraints and index. Its Down removes only those tables. Unrelated generated seed timestamp updates were removed. EF-generated SQL is in `docs/sql/workforce-planning-settings.sql`.

## Deterministic rules

In order:

1. Zero active lawyers → NO_ACTIVE_LAWYERS.
2. Below configured minimum lawyers → CAPACITY_CONCERN / BELOW_MINIMUM_LAWYERS.
3. Below minimum slots with significant demand → CAPACITY_CONCERN / LOW_FUTURE_CAPACITY.
4. Significant demand and zero slots, or demand at/above the global concern ratio of slots → CAPACITY_CONCERN / HIGH_DEMAND_LOW_AVAILABILITY.
5. No slots, below the slot floor without significant demand, or significant demand at/above the configured watch ratio → WATCH.
6. Otherwise → HEALTHY.

Significant demand is positive and at least the configured high-demand threshold. Assessment demand remains `max(recent requests, recent appointments)`. A target-lawyer shortfall adds BELOW_TARGET_LAWYERS as information; it does not independently change status. Existing recruitment adds operational context and blocks duplicate drafting. Existing 30-day windows, concern ratio and 24-hour snapshot validity remain unchanged.

## Admin API and UI

Admin-only `GET /api/workforce-settings`, `GET /api/workforce-settings/{practiceAreaId}`, `PUT /api/workforce-settings/{practiceAreaId}` and `DELETE /api/workforce-settings/{practiceAreaId}`. DELETE restores fallback defaults. PUT requires all five fields, rejects extra fields, enforces backend validation and records the authenticated Admin identity. Responses are DTOs with Practice Area identity/name, numeric rules, CUSTOM/DEFAULT and optional audit metadata.

UI route: `/admin/lawyer-services/ai-operations`. Workforce Settings is a secondary button. Its native modal has a Practice Area selector, real persisted values, five fields, helper text, source label, save and default-reset actions. The main analysis CTA and existing circle remain. Expanded evidence rows show all configured rules without adding charts or primary metric cards. “How this analysis works” explains settings, deterministic assessment, AI drafting and human approval.

Successful setting/demo mutations refresh current analysis without generating an AI proposal. Setting changes are checked again during approval; even if status/counts remain unchanged, a changed rule snapshot requires regeneration. Old snapshots without settings remain compatible with unchanged fallback defaults.

## Verified AI context

The backend appends minimumActiveLawyers, targetActiveLawyers, minimumFutureSlots, highDemandThreshold, watchCapacityRatio and settingsSource to the existing aggregate context. Python validates numeric bounds, source and target/minimum relationship. The Gemini prompt treats these as immutable Admin facts and explicitly says a target shortfall alone is not a staffing shortage. No personal identifiers or raw request text are added.

## Development scenarios and reset

Routes are mapped only when the backend environment is Development. The service separately refuses non-Development execution. All routes require Admin:

- `GET /api/dev/workforce-demo`: capability confirmation.
- `POST /api/dev/workforce-demo/apply`: exact scenario string and optional original Practice Area ID.
- `POST /api/dev/workforce-demo/reset`: restore healthy demo baseline.

Frontend controls require both `import.meta.env.DEV` and successful backend capability confirmation. Production build removes the component, controls and demo API paths. A small expandable Development Only section contains source-area/scenario selectors, descriptions, Apply and Reset actions.

Scenarios use dedicated `[Demo]` Practice Area copies of the real catalog, with source IDs chosen dynamically. Source rules are copied; original rules, lawyers, appointments, demand and Careers remain untouched. Demo practitioners are unlinked development profiles with WF-DEMO licenses. Real availability slots and recommendation-workflow demand records provide inputs to the ordinary analysis service. All owned IDs are recorded in the registry; no arbitrary users/records are deleted.

| Scenario | Isolated demo result |
| --- | --- |
| HEALTHY_COVERAGE | Adequate active coverage and upcoming slots, with no seeded demand. |
| RECRUITMENT_NEEDED | Selected area has low staffing/capacity and significant seeded demand; defaults receive a demo-only floor of 4 and target 6. |
| NO_ACTIVE_LAWYERS | Selected area has zero active demo lawyers. |
| EXISTING_RECRUITMENT | Selected area has a concern and a linked ordinary Career created through the existing Career service; duplicate drafting is blocked. |

Repeated Apply reuses catalog and practitioner identities and replaces tracked signals, without accumulating duplicates. Reset removes only tracked scenario requests/availability and an unchanged scenario-owned Career, then refreshes staffing/settings/capacity into the healthy demo baseline. The demo catalog and practitioner pool remain for reuse. Admin-created/approved Careers are not owned by the scenario registry and survive reset. Used/booked slots, manually extended availability, used demand records, or edited/applied-to seed Careers cause a safe 409 instead of destructive cleanup.

If an Admin-approved opening already exists in the selected demo area, Recruitment Needed returns 409; use Existing Recruitment, select another source area, or review that opening in Careers. Healthy Coverage guarantees the isolated demo areas where practical; original areas still reflect their real facts. Demo areas have no cloned legal services, and correctly report zero demo service records. They are labelled and visible in the normal Development catalog rather than silently overriding original metrics.

## Verification

- Frontend production build: PASS (existing large-bundle warning).
- Feature ESLint: PASS.
- Frontend browser regression suite: 41 passed; final focused settings/demo suite: 6 passed, including protected-mutation error copy.
- Frontend Member 1 route checks: 18 passed.
- Backend full suite with disposable PostgreSQL databases: 181 passed, 1 skipped (opt-in live transport test).
- Python full suite: 83 passed (dependency deprecation warnings).
- Focused Workforce/backend suite: 61 passed.
- Real-provider migration: EF Database.MigrateAsync applied the new migration in an isolated reconstructed prior schema, and recorded its history.
- Real PostgreSQL scenario-to-Careers test: concern, verified settings payload, proposal, human approval, existing recruitment, safe reset and unrelated-record preservation passed. This test uses a mocked drafting transport, not live Gemini.
- Settings/demo screenshots and overflow checks at 1440, 1024, 768, 375 and 320px; desktop and 320px images visually inspected. Native dialog traps focus, Escape closes it, focus returns to the trigger, fields have semantic labels/helper descriptions and error/status announcements.
- Production compiled JS checked: Demo Scenarios, Apply Demo Scenario and `/api/dev/workforce-demo` absent.
- Only the reviewed EF-generated planning migration was applied to the configured Development database, without applying unrelated pending migrations or changing existing business records. `scripts/apply-workforce-planning-migration.py` provides an environment-gated check/apply helper with private credentials and SQLSTATE-only error diagnostics.

## Manual demo

1. Start/restart the normal Development backend and AI service to load the changes.
2. Open `/admin/lawyer-services/ai-operations` → Workforce Settings.
3. Choose Criminal Law (or another real source area); minimum 4, target 6; Save Settings.
4. Open Development Only → Demo Scenarios; select that source, Recruitment Needed → Apply.
5. Run Workforce Analysis. Inspect `[Demo] Criminal Law`, CAPACITY_CONCERN and BELOW_MINIMUM_LAWYERS; expanded details show the copied rules.
6. Prepare Hiring Proposal; review the document, continue to approval and approve. Check the ordinary `/admin/careers` page.
7. Apply Existing Recruitment to the same source and analyse; the existing opening is shown and duplicate proposal creation is blocked.
8. Reset Demo Data and analyse. The demo baseline is healthy/stable, while the Admin-approved opening and original records remain.
9. Also inspect Healthy Coverage and No Active Lawyers, source DEFAULT/CUSTOM, invalid target/ratio, keyboard form behavior, and mobile scrolling.

Live Admin verification results and screenshots are stored in `docs/evidence/workforce-planning-live/`. The real Development Admin UI flow passed: settings saved (minimum 4, target 6), Recruitment Needed produced BELOW_MINIMUM_LAWYERS, one Gemini request returned HTTP 200, the proposal was reviewed and approved into ordinary Career Opening #3, Existing Recruitment blocked duplicate drafting, and reset preserved unrelated records and the approved opening. The original Criminal Law settings were restored, then demo rules/capacity were reset to match them. The real Careers UI displays Opening #3, the baseline UI shows Workforce Coverage Stable, and the live 375px screen has no horizontal overflow. No fake delays or additional Gemini requests were used.

## File inventory for this extension

Created:

- `backend/LegalService.API/Models/Entities/PracticeAreaWorkforceSetting.cs`
- `backend/LegalService.API/DTOs/Workforce/WorkforceSettingsDtos.cs`
- `backend/LegalService.API/Controllers/WorkforceSettingsController.cs`
- `backend/LegalService.API/Services/Workforce/WorkforceSettingsService.cs`
- `backend/LegalService.API/Services/Workforce/WorkforceDemoService.cs`
- `backend/LegalService.API/Services/Workforce/WorkforceDemoEndpoints.cs`
- `backend/LegalService.API/Migrations/20261004061310_AddWorkforcePlanningSettings.cs` and `.Designer.cs`
- `backend/LegalService.Tests/WorkforcePlanningTests.cs`
- `backend/LegalService.Tests/WorkforcePlanningPostgresTests.cs`
- `backend/LegalService.Tests/WorkforceDemoHttpTests.cs`
- `frontend/src/features/lawyerServices/aiOperations/services/workforceSettingsApi.ts`
- `frontend/src/features/lawyerServices/aiOperations/components/WorkforceSettings.tsx`
- `frontend/src/features/lawyerServices/aiOperations/components/WorkforceDemoScenarios.tsx`
- `frontend/tests/workforce-settings.spec.ts`
- `scripts/apply-workforce-planning-migration.py`
- `docs/sql/workforce-planning-settings.sql`
- `docs/workforce-planning-settings.md` and verification evidence under `docs/evidence/workforce-planning-live/`.

Modified existing feature files:

- `backend/LegalService.API/Data/ApplicationDbContext.cs`: DbSets, relationships, uniqueness and checks.
- `backend/LegalService.API/Migrations/ApplicationDbContextModelSnapshot.cs`: new model metadata.
- `backend/LegalService.API/DTOs/Workforce/WorkforceDtos.cs`: optional planning-rules snapshot.
- `backend/LegalService.API/Services/Workforce/WorkforceAnalysisService.cs`: configured deterministic assessment.
- `backend/LegalService.API/Services/Workforce/HiringSuggestionService.cs`: verified AI facts and approval snapshot checks.
- `backend/LegalService.API/Program.cs`: registrations, exception handling and Development-only mapping.
- `backend/LegalService.Tests/LawyerManagementHttpTests.cs`: Admin permissions, settings API and Production route-absence checks.
- `ai-service/workforce_hiring/drafting.py`: structured settings and prompt restrictions.
- `ai-service/tests/test_workforce_hiring.py`: settings validation and Gemini input assertions.
- `frontend/src/features/lawyerServices/aiOperations/services/workforceApi.ts`: planning-rules type.
- `frontend/src/features/lawyerServices/aiOperations/pages/AIOperationsPage.tsx`: secondary controls, refetch and explanation.
- `frontend/src/features/lawyerServices/aiOperations/components/SupportingWorkforceData.tsx`: expanded rules evidence.
- `frontend/src/features/lawyerServices/aiOperations/workforceLabels.ts`: factual staffing reasons and capacity copy.

Other pre-existing workspace changes are not part of this extension. No dependency, new Careers model/service, navigation tab, appointment engine or AI graph action was added.

## Normal-app loading fix — 4 October 2026

The Workforce Settings dialog failed in the normal port-5173 app because the existing port-5295 backend process predated the new endpoints. It returned 404 for `/api/workforce-settings`, while `/api/workforce-analysis` remained mapped. The planning migration history and both new tables were already present.

Rebuilt the API successfully and gracefully restarted the existing local service supervisors on their original ports with unchanged private configuration. The frontend, backend and both AI services now run current code. No settings, demo data, accounts or Career records were changed by this fix.

Real Admin verification on `http://127.0.0.1:5173/admin/lawyer-services/ai-operations`: settings GET 200, all 10 current Practice Area options loaded, all rule fields displayed, no error alert. No AI requests or data mutations were made. Evidence: `docs/evidence/workforce-settings-load-fix/results.json` and `settings-1440.png`.
