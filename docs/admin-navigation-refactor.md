# Admin navigation refactor — 4 October 2026

AI Lawyer Matching is a top-level operational module directly below Lawyer & Legal Services. Workforce & Hiring remains the fourth Lawyer Management subpage. The generic AI Operations heading and both obsolete tabs are removed.

## Files and component changes

| Responsibility | File | Change |
| --- | --- | --- |
| Admin sidebar | `frontend/src/components/layout/AdminLayout.tsx` | Adds AI Lawyer Matching with an existing Lucide users icon. Active links expose `aria-current`; matching activates independently. Mobile links close the drawer and return focus to the menu button. |
| Router | `frontend/src/routes/LawyerLegalServicesRoutes.tsx` | Adds guarded canonical routes and query/hash-preserving legacy redirects. Redirects replace browser history entries. Legacy workflow routes bypass the Lawyer Management layout. |
| Route constants | `frontend/src/routes/adminWorkflowRoutes.ts` | Defines the canonical matching and workforce URLs. |
| Lawyer sub-navigation | `frontend/src/pages/admin/LawyerLegalServicesLayout.tsx` | Four tabs: Lawyers, Practice Areas, Legal Services, Workforce & Hiring. Preserves uppercase styling, orange underline, horizontal scrolling and focus styles. Updates module description. |
| Standalone matching page | `frontend/src/pages/admin/LawyerMatchingPage.tsx` | Replaces RecommendationsPage wrapper, supplies AI Lawyer Matching heading, requested description and browser title through AdminLayout. No management summary or tabs. |
| Existing matching workflow | `frontend/src/components/lawyers/LawyerRecommendations.tsx` | Reuses the existing workflow. Optional internal heading prevents duplicate page headings; Start New Analysis remains available. |
| Workforce page | `frontend/src/features/lawyerServices/aiOperations/pages/WorkforceHiringPage.tsx` | Renames AIOperationsPage without copying its implementation. Removes generic parent heading, promotes Workforce & Hiring Intelligence to h2 and sets browser title. |

Workflow hooks, API calls, ranking/calculation rules, backend authorization and shared progression components were not changed. Existing Appointment and Careers links remain intact. The remaining internal aiOperations directory holds the existing workforce components/hooks/services; there is no duplicate workflow.

## Canonical URLs

- `/admin/lawyer-matching`
- `/admin/lawyer-services/workforce-hiring`

## Compatibility redirects

| Old URL | Destination |
| --- | --- |
| `/admin/lawyer-services/recommendations` | `/admin/lawyer-matching` |
| `/admin/lawyer-services/ai-recommendation` | `/admin/lawyer-matching` |
| `/admin/lawyer-management/recommendation-test` | `/admin/lawyer-matching` |
| `/admin/lawyer-services/ai-operations` | `/admin/lawyer-services/workforce-hiring` |

Every workflow redirect preserves the complete search string and hash, including `workflow`, `hiring`, repeated parameters and encoded values. Old URLs in historical project documentation remain compatible.

## Verification

- `npm run build`: passed TypeScript and production Vite build. Vite reports its large chunk warning (approximately 854 kB JavaScript before gzip).
- `npm run test:member1`: 19/19 passed.
- Playwright relevant regression suite: 74/74 passed across admin-workflow-navigation, recommendation, recommendation-workflow, workforce-hiring, workforce-settings, lawyer-management, member1-guardrails and derived-booking.
- `git diff --check`: passed.

Added `frontend/tests/admin-workflow-navigation.spec.ts` for sidebar ordering, click destination, exclusive active state, four management tabs, focused matching page, page titles, Admin access, legacy redirects, exact query/hash preservation, restoration after reload, and mobile keyboard navigation/focus at 320px and 390px.

Updated the eight existing test files listed above plus `frontend/tests/member1-routes.test.mjs` to use the canonical routes and new labels/layout expectations. Existing suites cover requirement analysis, interpretation, ranking, unsupported/no-match outcomes, saved selection, real slot loading, stale slots, human approval, appointment creation/retry, View Appointment, workforce analysis, settings, Development demo controls, proposal editing/regeneration/approval, stale snapshots, duplicate recruitment protection and View in Careers.

Browser tests use mocked API responses; live Gemini/backend/database round trips were not repeated. Desktop and mobile screenshots were visually inspected for the standalone matching form and Workforce layout. The test suite also checks workflow states across widths from 320px to 1440px. No deployment was performed.

## Manual URLs

Use these paths on your running frontend. Replace REAL_WORKFLOW_ID and REAL_HIRING_ID with persisted IDs from your own environment.

- `/admin/lawyer-services/lawyers`
- `/admin/lawyer-services/specializations`
- `/admin/lawyer-services/legal-services`
- `/admin/lawyer-services/workforce-hiring`
- `/admin/lawyer-matching`
- `/admin/lawyer-matching?workflow=REAL_WORKFLOW_ID`
- `/admin/lawyer-services/workforce-hiring?hiring=REAL_HIRING_ID`
- `/admin/lawyer-services/recommendations?workflow=REAL_WORKFLOW_ID&context=manual#review`
- `/admin/lawyer-services/ai-recommendation?workflow=REAL_WORKFLOW_ID`
- `/admin/lawyer-management/recommendation-test?workflow=REAL_WORKFLOW_ID`
- `/admin/lawyer-services/ai-operations?hiring=REAL_HIRING_ID&context=manual#proposal`
- `/admin/appointments` (use View Appointment after completion)
- `/admin/careers` (use View in Careers after approval)

For live checks, run analysis and approval on the canonical routes, reload the persisted URLs, then visit the equivalent legacy URLs and confirm IDs survive. On mobile, open the menu with the keyboard, choose AI Lawyer Matching, verify closure/focus and reopen to inspect the active state. Check the horizontally scrolling Workforce & Hiring tab and confirm the page retains its management summary.
