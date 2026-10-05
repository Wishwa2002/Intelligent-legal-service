# Member 1 Workforce & Hiring UI refinement

## 1. Summary

Refined **Admin Console → Lawyer & Legal Service Management → Workforce & Hiring** into an operations workspace. The existing module header, KPI cards, tabs, APIs and human approval workflow remain in place.

The page now prioritises current coverage, areas needing attention, the reason for each finding, and the next available action. No backend, database, recommendation, Gemini or LangGraph code was changed for this refinement.

## 2. UI problems addressed

- Replaced the spacious introductory checklist with one compact launch card.
- Removed development scenario controls from the standard Admin page.
- Removed the permanent large circle and its completion replay from the Workforce workflow.
- Made every Practice Area visible in coverage cards instead of hiding healthy areas behind spreadsheet-like evidence rows.
- Reduced proposal text width and placed system decision facts alongside AI content.
- Replaced the large Career Description editor with separate summary and responsibility fields.
- Clarified recruitment blocking, review ownership, and the action that saves an opening.

## 3. New information architecture

1. Existing module header, operational KPIs and section tabs.
2. Workforce & Hiring title with secondary Workforce Settings action.
3. Initial Workforce Coverage card: demand/capacity windows, actual Practice Area count from the shared summary, and Run Workforce Analysis.
4. Request-driven circular system workflow during active analysis; compact workflow summary afterward.
5. Compact analysis timestamp, windows and measured request duration.
6. Workforce Overview with real totals and overall assessment.
7. Practice Area coverage cards ordered by attention.
8. AI Hiring Proposal workspace with saved system decision context.
9. Structured human approval workspace and explicit Approve & Create Career Opening action.
10. Collapsed analysis rules and methodology for secondary evidence.

The initial card includes a compact SYSTEM → AI → HUMAN responsibility strip. The workflow stage labels and proposal/approval panels reinforce this ownership later.

## 4. Removed Development Only / Demo Scenarios UI

Removed the page import, mounted accordion, mutation callback and all reserved layout for `WorkforceDemoScenarios`. The standard Admin page does not request `/api/dev/workforce-demo`, even in a development frontend against a development backend.

Existing development utilities and backend scenario support remain outside the normal page. Browser tests now assert absence of the labels/buttons and zero development scenario requests or mutations. Settings validation and normal workflow protection tests remain.

## 5. Progress visualization changes

The prominent circle is shown during the real analysis request and contains only the four SYSTEM checks: Demand Data, Lawyer Capacity, Coverage Assessment and Recruitment Check.

The existing endpoint returns one aggregate response, without stage-by-stage telemetry. While awaiting that response, Demand Data is active and the remaining checks are pending. All four are confirmed together when the response arrives. No timers, simulated transitions, pauses or completion replay are used.

After completion, a compact list displays confirmed/pending/active/failed states with text and symbols. **View Workflow** expands the original circular visual on demand. Appropriate workflows add Hiring Proposal (AI), Administrator Review (HUMAN) and Career Opening. Opening creation completes only after the approval response confirms persistence.

Request duration uses the existing `performance.now()` measurement. Sub-0.1-second responses display milliseconds expressed as seconds rather than a fabricated minimum delay.

## 6. Coverage card redesign

Every Practice Area has a white card with a restrained status rail and named status badge. Cards present:

- **Demand = max(recent requests, recent appointments)** as the primary demand metric.
- Requests and appointments as small supporting metadata.
- Active Lawyers, Legal Services and Available Slots.
- The backend assessment reason and eligible next action.

Presentation order is No Active Lawyers → Capacity Concern → Watch → Healthy, with alphabetical ordering within each status. Sorting copies the response array and does not modify its data or business status.

Healthy cards say **Healthy capacity / No staffing action recommended** and have no hiring CTA. Areas with an existing opening explain that recruitment already addresses the staffing need, list returned Career Opening IDs/titles, and link to Careers. These cards cannot prepare a duplicate proposal.

The overview totals are calculated from returned Practice Area values for healthy and concern results alike. There are no invented scores, percentages, coverage charts or metrics. Collapsed analysis details now focus on snapshot timestamps, raw demand signals and returned workforce rules rather than repeating the primary cards.

## 7. AI proposal workspace redesign

At desktop widths, the proposal uses a two-thirds content / one-third decision-context layout. The content column has readable line lengths, a concise rationale block, role summary, compact responsibility list and Practice Focus tags.

The context panel shows the **saved workflow snapshot**, including system status, Demand, Active Lawyers, Available Slots and existing recruitment. It does not silently substitute a later report for the facts used by the saved proposal. Separate analysis details expose the current report, and existing approval logic continues to recheck freshness and recruitment.

The badge remains **AI Generated · Review Required**. Continue to Approval is primary, Edit Draft and Regenerate are secondary, and Dismiss Suggestion is a quiet tertiary action. Draft edits use the existing schema and save endpoint. No placeholder AI content or automatic publication was introduced.

## 8. Final review redesign

The approval workspace has editable Career Title, Role Summary and Responsibilities, plus Practice Focus tags and a context panel identifying Practice Area and AI Workforce Recommendation source.

The structured editor serializes into the same existing Careers description format:

```text
[summary]

Responsibilities
• [responsibility]

Focus Areas
[focus]
```

The existing combined description/title validation and approval request shape remain intact. The warning for unlinked Career Openings now has an icon, title, count, explanation, Review Careers link and the required human acknowledgement. Back to Proposal is secondary; **Approve & Create Career Opening** is the strongest action and explicitly saves the opening.

Duplicate protection, 24-hour snapshot freshness and human approval remain enforced by the existing backend. No database relationship or approval rule changed.

## 9. Responsive behavior

Verified at 1440, 1024, 768, 390 and 320 pixels:

- Coverage metrics use four columns when space permits and two on small screens.
- The launch card gives metrics their own row on small screens; the button no longer squeezes window values.
- Proposal and approval context panels stack below content below the desktop breakpoint.
- Buttons wrap, and long content has bounded readable widths.
- The compact workflow list wraps while retaining explicit labels and state text.
- Coverage data needs no horizontal table scrolling. Existing module-tab scrolling is preserved.
- Settings remains keyboard accessible, including Escape dismissal and focus restoration.
- Expanders expose `aria-expanded`/`aria-controls`; proposal and approval workspaces have labelled landmarks. Focus indicators and named status badges avoid reliance on color alone.

Screenshots cover initial, analysis-complete/healthy, Watch, Capacity Concern, No Active Lawyers, existing recruitment, AI proposal and final approval states. Proposal and approval element screenshots include their complete workspaces, including the unlinked-opening warning. Browser screenshots use controlled API fixtures; production values always come from the existing responses.

## 10. Files changed

All application changes for this refinement are frontend-only:

- `frontend/src/features/lawyerServices/aiOperations/pages/WorkforceHiringPage.tsx`
- `frontend/src/features/lawyerServices/aiOperations/components/AnalysisFreshness.tsx`
- `frontend/src/features/lawyerServices/aiOperations/components/WorkforceWorkflowProgress.tsx`
- `frontend/src/features/lawyerServices/aiOperations/components/WorkforceResult.tsx`
- `frontend/src/features/lawyerServices/aiOperations/components/SupportingWorkforceData.tsx`
- `frontend/src/features/lawyerServices/aiOperations/components/HiringSuggestionDraft.tsx`
- `frontend/src/features/lawyerServices/aiOperations/components/CareerOpeningApprovalForm.tsx`
- `frontend/src/features/lawyerServices/aiOperations/workforcePresentation.ts`
- `frontend/tests/workforce-hiring.spec.ts`
- `frontend/tests/workforce-settings.spec.ts`
- This report and screenshot evidence under `docs/evidence/member1-workforce-ui-refinement/`.

The repository contained other modifications before this task; they were preserved and are not part of this UI refinement.

## 11. Tests run

- `npm run build` — passed; Vite retains its existing large-bundle advisory.
- `npm run test:member1` — 19 passed.
- Targeted ESLint for the eight changed application files and two updated browser test files — passed.
- `npx playwright test tests/workforce-hiring.spec.ts tests/workforce-settings.spec.ts tests/admin-workflow-navigation.spec.ts tests/member1-guardrails.spec.ts --workers=2 --reporter=line` — **46 passed**. Includes the final responsive adjustment, saved/current snapshot distinction and recruitment-blocking checks.
- `git diff --check` — passed after removing an extra blank line in a test file.

Screenshots were visually reviewed at 1440, 1024, 768 and 390 pixels; 320-pixel screenshots and overflow checks also passed. The review caught and corrected narrow initial-window columns on mobile. Evidence is retained in [the screenshot directory](evidence/member1-workforce-ui-refinement/). Examples: [desktop proposal](evidence/member1-workforce-ui-refinement/refined-proposal-workspace-1440.png), [mobile approval](evidence/member1-workforce-ui-refinement/refined-review-workspace-390.png).

Browser checks preserve validation, approval gating, stale-data recovery, duplicate recruitment protection, no hiring action for healthy areas, safe AI failure/retry, URL restoration, dismissal and Careers integration. Additional assertions cover maximum demand rather than summed signals, severity ordering, totals in concern states, structured description serialization, saved versus current facts, and zero demo requests.

## 12. Remaining limitations

- The existing analysis API provides aggregate completion, so finer intermediate SYSTEM-stage progress cannot be claimed without backend telemetry. This UI intentionally uses only confirmed request states.
- Before the first analysis, window values are explicitly labelled **Default window** (30 days, matching existing defaults). Returned report windows replace these labels after analysis. No new configuration endpoint was added.
- View Career Opening uses the existing Careers listing route; no per-opening route was introduced.
- The automated screenshot matrix uses representative controlled responses, not live Gemini generation or database writes. Backend rules, prompts and relationships were not changed or retested by modifying production data.
- Long genuine AI content or many Practice Areas naturally require vertical scrolling; secondary detail and the full circle remain collapsed by default.
