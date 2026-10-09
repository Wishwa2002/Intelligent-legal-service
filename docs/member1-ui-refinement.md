# Member 1 Admin UI refinement — 4 October 2026

## 1. UI problems found

Inspected the shared `LawyerLegalServicesLayout`, summary API/controller, all four screens, API services, recommendation hook, reusable forms/identity/pagination/coverage components, responsive layout and existing Node/Playwright tests before editing. The layout had a small inline summary, repeated global counts inside three tabs, and Coverage Overview below navigation. Practice Area metadata was a plain sentence. Legal Service header/row action widths differed. Tablet filters could squeeze the search field into an unusable width.

The plan was to reuse the existing summary data for one card section, move collapsible coverage above navigation, remove duplicate totals, refine rows/filters/actions and run the existing checks. This task changed frontend presentation and tests only; backend, Flutter, AI services, form submissions and approval logic were not rewritten.

## 2. Duplicated statistics removed

- Lawyers: removed Active Lawyers / Total Records / Practice Areas below the section description.
- Practice Areas: removed the repeated total-area line.
- Legal Services: removed the repeated total-services / total-areas line.
- AI Recommendation: retained its workflow-specific information; added no global totals inside the tab.

Directory filter counts, filtered result counts, per-area coverage and recommendation counts remain because they explain the current context rather than repeat the module-wide summary.

## 3. New KPI layout

One summary now appears between the module header and Coverage Overview. White cards have subtle borders/shadows, navy numbers, muted helper text and existing Lucide icons. Active count is dominant, followed by **Active Lawyers** and **of N total lawyers**. No percentages, animated counters or analytics were introduced.

The order is Header → KPI cards → optional Coverage Overview → navigation → active section. The existing main title, description and Admin console identity remain.

## 4–5. Four cards and why

Used four cards: Active Lawyers, Practice Areas, Legal Services and Available Appointment Slots. The fourth is supported cleanly by existing backend-derived `coverage[].futureAvailabilityCount`; it needs no new endpoint, request, migration or client-side slot filtering.

## 6. Exact data sources and slot calculation

All four cards use the existing Admin-only `GET /api/lawyer-services/summary`, via `lawyersApi.getLawyerServicesSummary()` and the existing configured HTTP client.

| KPI | Source/calculation |
|---|---|
| Active Lawyers | `summary.activeLawyers`; backend counts Lawyers with `Status == "Active"`. |
| Total context | `summary.totalLawyers`; backend counts all Lawyer records. |
| Practice Areas | `summary.practiceAreas`; backend counts the Specialization catalog. |
| Legal Services | `summary.legalServices`; backend counts LegalService records. |
| Available Appointment Slots | Sum of `summary.coverage[].futureAvailabilityCount`. |

The inspected existing backend slot query requires `!slot.IsBooked`, `slot.StartTime < slot.EndTime`, and an active lawyer. The parent `LawyerAvailability.Date` must be after today UTC, or today with slot start after the current UTC time. Coverage assigns those counts through active, exactly-one-area lawyer memberships. Each eligible lawyer contributes to one coverage row, so summing those rows does not double count slots. Inactive or ambiguous/missing-area lawyer records do not contribute to this module's bookable total. The inspected availability model has no separate archive flag; none was invented. There is no duplicate time/date filtering in React.

Values are fetched, not fixed at 29/34/5/25/174. The existing summary test now verifies different active/total values (31/35) and a 7 + 4 slot sum, demonstrating the rendering follows supplied data. Test fixture values are not production statistics. No authenticated live database count was fetched during this UI task.

Initial loading shows four skeleton placeholders plus a status message, without misleading zero values. Failed requests show em dashes and a compact retry message; tab content remains available independently. Refresh preserves previously loaded values while announcing an update. Mutation notifications and existing summary refresh behavior remain in place.

## 7. Lawyers improvements

Removed duplicate totals and retained Add/Edit/Delete behavior. Filter chips use a consistent orange outline/light selected surface, neutral inactive surface, wrapping and `aria-pressed`. Added a contextual count from `directory.totalItems`, including the selected Practice Area when applicable. Search/status/date controls stack on phones, use two rows at tablet widths, and one row when sufficiently wide.

The desktop table remains a table. Rows have compact aligned padding, readable contact text, column scopes and secondary actions. Existing Active/Inactive text badges remain. Mobile/tablet users can scroll a labeled, keyboard-focusable table region; a phone hint explains where contact details/actions are. This task does not claim a new stacked mobile lawyer-card implementation.

## 8. Practice Areas improvements

Section heading is now Practice Areas. Each area retains one compact list row, a strong title, readable description and metadata pills for total lawyers, active lawyers, available slots and Legal Services when those fields are supplied. Counts come from the existing catalog/coverage data. Added subtle row hover and compact View/Edit/Delete treatments. Existing forms, dependency errors and safe deletion behavior remain.

## 9. Legal Services improvements

Section heading is now Legal Services with a consistent description. Removed repeated global totals, aligned desktop header/row columns with a shared action width, and added subtle row hover/compact actions. Existing responsive stacked rows remain. Both list and details use Eligible Lawyers. Filtering, forms and catalog-derived eligibility behavior remain unchanged.

## 10. AI Recommendation visual improvements

The requirement form is a white bordered surface consistent with the module. Recommendation cards use the same border/radius/shadow treatment. Workflow actor pills distinguish AI (muted orange), SYSTEM (neutral) and HUMAN (navy), always with visible text. The initial state explains that no recommendation has been generated yet.

Stages still come from the existing persisted workflow helper. No chatbot interface, fabricated progress, hidden reasoning, score percentages or autonomous actions were added. Human approval, date locking, workflow restoration and verified Recommendation Points are preserved.

## 11. Responsive improvements

- Four KPI columns at desktop widths ≥1280px; two at widths ≥360px; one on narrower phones.
- Compact wrapping labels/helper text and consistent heights within each grid row.
- Lawyers filter layout adapts to available space instead of collapsing its search input at tablet widths.
- Tabs retain horizontal scrolling; direct navigation scrolls the active tab horizontally into view without scrolling the page vertically.
- Existing mobile header/sidebar behavior retained; other modules' layout was not changed.
- Coverage remains collapsible and uses a horizontally scrollable table when necessary.

The existing responsive browser test now covers all four routes at 1440, 768 and 390px, checks one summary/four cards, verifies coverage precedes tabs, checks page overflow and usable phone main width, and saves screenshots. Manually reviewed screenshots of all four screens at desktop/phone widths, tablet Lawyers, expanded coverage and expanded recommendation stages. Browser data was mocked; these are UI checks, not a real database booking session.

## 12. Accessibility improvements

Cards are named articles within a named summary section; labels do not compete with page headings. Skeletons/icons are decorative and loading is announced through a status message and `aria-busy`. Tabs remain native keyboard-accessible NavLinks with `aria-current` and visible focus styling. Coverage retains `aria-expanded`/`aria-controls`. Table scroll regions are labeled/focusable and lawyer headers have `scope="col"`. Actor/status meaning is visible in text rather than color alone. Existing labeled forms and validation remain. No exhaustive screen-reader/WCAG audit is claimed.

## 13. Files changed in this UI task

The workspace also contains changes from the previous full Member 1 review. This inventory lists only this task's edits.

| File | Purpose |
|---|---|
| `frontend/src/components/lawyers/ModuleStatCard.tsx` | New small reusable presentation component for value/label/helper/icon/loading. |
| `frontend/src/pages/admin/LawyerLegalServicesLayout.tsx` | Four data-backed cards, coverage-before-tabs, summary request UX and active-tab visibility. |
| `frontend/src/pages/admin/LawyersPage.tsx` | Remove repeated counts; contextual results, consistent filters and responsive table/control refinements. |
| `frontend/src/components/lawyers/CoverageOverview.tsx` | Consistent slot/warning labels, neutral no-warning state and accessible scroll region. |
| `frontend/src/components/lawyers/coverageWarnings.ts` | Factual “No Available Appointment Slots” terminology. |
| `frontend/src/components/lawyers/SpecializationManager.tsx` | Remove global total, compact metadata pills, rows and actions. |
| `frontend/src/components/lawyers/LegalServiceManager.tsx` | Remove global totals, aligned rows, consistent actions and Eligible Lawyers terminology. |
| `frontend/src/components/lawyers/LawyerRecommendations.tsx` | Form/card styling, actor badges and initial empty-state guidance. |
| `frontend/tests/member1-routes.test.mjs` | Adapt existing assertions to cards/labels; verify dynamic totals, slot sum and request states. |
| `frontend/tests/lawyer-management.spec.ts` | Adapt existing selectors to section headings and KPI articles. |
| `frontend/tests/member1-guardrails.spec.ts` | Expand existing responsive checks to tablet/KPIs/hierarchy and capture coverage/workflow states. |
| `docs/member1-ui-refinement.md` | This report. |

## 14–15. Commands executed and results

Frontend commands run from `frontend`; repeated runs are consolidated. Only relevant existing tests were used. No packages were installed, and unrelated full-project lint was not rerun or cleaned up.

| Command | Final result | Notes |
|---|---|---|
| `npm run build` | PASS | TypeScript and Vite build. Initial run failed because removal of the repeated total left `catalogLoading` unused; it now drives a useful catalog loading message. Existing large application chunk warning remains (~774KB minified JS). |
| `npm run test:member1` | PASS — 18/18 | Initial 17/18 result had an obsolete “Eligible Practitioners” assertion; updated to the requested Eligible Lawyers wording. Dynamic cards, loading/error state and slot sum pass. |
| `npx playwright test` | PASS — 15/15 | Final run: 18.0s. Earlier 14/15 run exposed an ambiguous heading selector; KPI labels now use semantic article text instead of duplicate section headings. Subsequent full runs passed. Includes guards, forms, filters, restoration/completion, stale-slot recovery, date rules and all-screen responsive checks. |
| Targeted ESLint command below | PASS | Initial unused `catalogLoading` error corrected. Final command completed with exit code 0. |
| `git diff --check` from repo root | PASS | No whitespace errors. |

```sh
npx eslint src/pages/admin/LawyerLegalServicesLayout.tsx src/pages/admin/LawyersPage.tsx src/components/lawyers/ModuleStatCard.tsx src/components/lawyers/CoverageOverview.tsx src/components/lawyers/coverageWarnings.ts src/components/lawyers/SpecializationManager.tsx src/components/lawyers/LegalServiceManager.tsx src/components/lawyers/LawyerRecommendations.tsx tests/member1-guardrails.spec.ts tests/lawyer-management.spec.ts
```

Backend/Python/Flutter tests were not rerun for this presentation-only task. Results from the earlier full review are documented separately; they are not new test results here.

## 16. Routes to inspect manually

Sign in as Admin, then inspect:

1. `/admin/lawyer-services/lawyers`
2. `/admin/lawyer-services/specializations`
3. `/admin/lawyer-services/legal-services`
4. `/admin/lawyer-services/recommendations`

Check real KPI values, expand Coverage Overview, filter/search the directory, inspect catalog metadata/actions and restore an existing recommendation URL. Repeat at tablet/phone widths; scroll tables/tabs to reach secondary columns/actions. Browser fixture testing did not mutate the configured project database.

## 17. Remaining optional improvements

- Code-split the large shared frontend bundle in a separate performance task.
- Consider stacked phone lawyer rows only if user testing finds horizontal table scrolling awkward.
- Perform a broader keyboard/screen-reader audit of existing modal focus management.
- The inherited shared header wraps some utility text at tablet width; the main module remains readable. Refining that shared chrome should be a separately scoped change.
- Availability counts are a snapshot of the current summary request. Booking always revalidates the real slot; no polling/WebSocket feature was introduced.
