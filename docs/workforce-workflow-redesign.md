# Workforce & Hiring Intelligence UI redesign

Implemented 4 October 2026. Review route: `/admin/lawyer-services/ai-operations`.

## Scope and preserved architecture

This is a frontend refactor of the existing feature. Backend workforce rules, Python/Gemini contracts, authorization, ownership, snapshot expiry, persistence, regeneration, dismissal, duplicate protections, and transactional Careers creation were not changed. No dependencies were added. Existing unrelated working-tree changes were preserved.

The standard workflow is now Analyse → Prepare → Approve. The main page does not automatically fetch workforce analysis or display Practice Area rows. URL restoration still loads the saved workflow and current workforce data without generating content.

## Files modified

Under `frontend/src/features/lawyerServices/aiOperations/`:

- `pages/AIOperationsPage.tsx`: explicit ready/result/proposal/approval/completion flow, URL restoration, error actions, stage derivation, and transition focus management.
- `hooks/useWorkforceAnalysis.ts`: optional automatic loading; the new page runs analysis explicitly.
- `hooks/useHiringSuggestion.ts`: real in-flight action and failed-action state; controlled error messaging instead of displaying arbitrary server text.
- `components/HiringSuggestionDraft.tsx`: document-style read-only preview, focused editing, existing validation, Save Changes, and Continue to Approval. Healthy-area regeneration is hidden in the standard workflow.
- `components/CareerOpeningApprovalForm.tsx`: final review with Practice Area and source, existing editable Career fields and unlinked-posting acknowledgement, Back to Proposal, and separate request/blocked-submission states.

Tests:

- `frontend/tests/workforce-hiring.spec.ts`: replaced five old modal/list scenarios with fourteen workflow scenarios.
- `frontend/tests/member1-routes.test.mjs`: initial AI Operations assertion now expects the explicit Run Workforce Analysis action.

## Files created and component refactoring

- `components/WorkforceWorkflowProgress.tsx`: reusable SVG circle and semantic stage list, accepting stage objects with id, label, category, state, and supporting text.
- `components/WorkforceResult.tsx`: healthy aggregate summary, attention-area selection, concern details, and existing-recruitment state.
- `components/SupportingWorkforceData.tsx`: expandable metrics for all Practice Areas, including appointments, statuses, and explanations.
- This report and screenshots under `docs/evidence/workforce-workflow-redesign/`.

The old modal and all-area list are removed from the primary workflow. Their files remain available; the status-chip component is reused. No Careers UI or backend module was duplicated.

## Real state mapping

| Actual state | Visual stages |
| --- | --- |
| Ready, no workflow URL | Quiet ready panel; no analysis request |
| Analysis request pending | Demand Data active; remaining stages pending |
| Analysis response received | Demand Data, Lawyer Capacity, Coverage Assessment, Recruitment Check complete together |
| Healthy result or all concerns already recruiting | Four relevant system stages; analysis ends without AI generation |
| Concern with recruitment available | Four system stages complete; proposal, review, opening pending |
| Generate/regenerate request pending | Hiring Proposal active |
| Structured draft received/restored | Hiring Proposal complete; Administrator Review active |
| Explicit approval request pending | Administrator Review complete; Career Opening active |
| Creation response / completed workflow restored | All seven stages complete |
| Generation failure | Hiring Proposal failed; safe retry action |
| Approval failure | Career Opening failed; no success claim |
| Dismissed workflow restored | Draft remains a recorded completed stage; review/opening do not become complete |

The analysis API returns one aggregate response and exposes no intermediate progress events. Its four stages therefore complete together. There are no timers, animated counters, or simulated percentages. The ring shows completed stages divided by relevant stages. It never spins. Its restrained stroke transition respects reduced motion.

## Result and review presentation

Healthy results show one summary with real Practice Area, active-lawyer, and upcoming-slot totals. Healthy rows are available only inside Supporting Data and have no standard hiring-generation action. Existing linked recruitment is still surfaced as an operational notice.

Concern results include only Watch, Capacity Concern, and No Active Lawyers areas. Multiple concerns use a compact selection control; the selected area displays assessment demand (`max(requests, appointments)`), available slots, active lawyers, and reasons. Existing linked recruitment replaces the proposal action with its opening information and Careers link.

The proposal is initially a white document surface with title, Hiring Rationale, Role Summary, Key Responsibilities, and Practice Focus. Editing retains the original field contract and validation. Saving returns to the document. No additional employment terms or unsupported focus areas were introduced.

Final Review shows Practice Area, source, title, description, and the existing unlinked-Careers acknowledgement when needed. Only the existing Careers fields are submitted. Back to Proposal returns to the saved document. Stale approval requires refreshing analysis and regenerating before approval can resume.

Completion shows the real approved title, opening ID, View in Careers (`/admin/careers`), and Done. If a completed workflow's opening was later removed, the page states that accurately.

## Responsive design and accessibility

Desktop uses a 280px circular anchor beside the stage list. Mobile uses a 210px circle and stacked content. Documents span the available width, metrics adapt to narrow screens, and buttons wrap with 44px minimum height.

The circle is decorative SVG; a semantic ordered stage list supplies labels, categories, states, and explanatory text. Central status changes use a polite live region. Failures use alerts. Major transitions move keyboard focus to the relevant heading or current progress text. Native expandable sections retain keyboard behaviour. The main workflow no longer needs a dialog or focus trap. SVG motion respects `prefers-reduced-motion`.

## Verification

- `npm run build`: PASS (TypeScript and Vite); existing large-bundle warning remains.
- `npm run test:member1`: PASS, 18 tests.
- `npm run test:e2e -- --workers=1`: PASS, 31 browser tests, including 14 workforce scenarios.
- `npx eslint src/features/lawyerServices/aiOperations tests/workforce-hiring.spec.ts`: PASS.
- `git diff --check`: PASS.
- Desktop and phone screenshot inspection: PASS; ready, progress, proposal, final review inspected.
- Browser widths: 320, 375, 768, 1024, 1440px; no horizontal page overflow in ready/result/proposal/approval checks.

The browser scenarios cover pending API states, healthy results, attention selection, supporting data, explicit generation, read-only preview, editing/save/regeneration, human approval, in-flight creation, completed restoration, Careers navigation, existing recruitment, analysis failure/retry, empty catalog, provider failure/retry, stale approval, conflict, missing workflow, all three saved workflow statuses, dismissal, unlinked-posting acknowledgement, Admin route guard, keyboard activation, and reduced motion.

The first run found an incorrect Creating label on an approval blocked by stale facts. Request activity and submission blocking were separated, then the complete suite passed.

Playwright uses fixture API responses. The full UI interaction was exercised in Chromium, including the existing Careers dashboard, but this is not a new live Gemini/Neon approval verification. No real Career opening was created. Backend/Python tests were not rerun because neither implementation was touched.

## Review screenshots and states

Representative screenshots are saved in `docs/evidence/workforce-workflow-redesign/`:

- `ready-1440.png`, `ready-375.png`
- `progress-1440.png`, `progress-320.png`
- `proposal-1440.png`, `proposal-375.png`
- `approval-1440.png`, `approval-375.png`
- `healthy-desktop.png`, `completed-desktop.png`

At `/admin/lawyer-services/ai-operations`, inspect the ready panel and Run Workforce Analysis. Actual current healthy data should yield the compact healthy result rather than seeded concerns. For a real concern, inspect Prepare Hiring Proposal → Edit Draft → Save Changes → Continue to Approval → final review. Creation remains an explicit Admin action. Review an existing saved workflow through `?hiring=<real workflowId>`; pending, completed, and dismissed states restore directly. Open `/admin/careers` through the resulting link.

Concern, provider failure, stale, conflict, and creation states can be reviewed repeatably through the browser tests without modifying shared business data.
