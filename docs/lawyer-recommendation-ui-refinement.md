# Lawyer Recommendation UI refinement

Implemented on 4 October 2026. The recommendation journey now separates requirement analysis, verified matches, administrator review, appointment details and completion. AI interprets; the system validates and ranks; the administrator selects and approves.

The workspace contained substantial existing changes before this task. The inventory below describes files created or edited during this refinement; it does not attribute other workspace changes to this task.

## 1. Files created

Frontend shared components:

- `frontend/src/components/common/AIWorkflowProgress.tsx`
- `frontend/src/components/common/WorkflowResponsibilities.tsx`

Recommendation feature:

- `frontend/src/features/lawyerServices/recommendations/recommendationProgress.ts`
- `frontend/src/features/lawyerServices/recommendations/components/RequirementForm.tsx`
- `frontend/src/features/lawyerServices/recommendations/components/RecommendationWorkflowProgress.tsx`
- `frontend/src/features/lawyerServices/recommendations/components/InterpretationSummary.tsx`
- `frontend/src/features/lawyerServices/recommendations/components/RecommendationMatches.tsx`
- `frontend/src/features/lawyerServices/recommendations/components/LawyerReviewPanel.tsx`
- `frontend/src/features/lawyerServices/recommendations/components/AppointmentApprovalForm.tsx`
- `frontend/src/features/lawyerServices/recommendations/components/RecommendationCompletion.tsx`
- `frontend/src/features/lawyerServices/recommendations/components/RecommendationError.tsx`
- `frontend/src/features/lawyerServices/recommendations/components/WorkflowDetails.tsx`
- `frontend/src/features/lawyerServices/recommendations/components/recommendationUI.ts`

Tests and evidence:

- `frontend/tests/recommendation-workflow.spec.ts`
- `backend/LegalService.Tests/RecommendationServiceCatalogTests.cs`
- `ai-service/tests/test_recommendation_services.py`
- This report: `docs/lawyer-recommendation-ui-refinement.md`
- `docs/evidence/recommendation-refinement-catalog.json`
- Five screenshots in `docs/evidence/recommendation-refinement/`: `progress-desktop.png`, `matches-desktop.png`, `review-desktop.png`, `progress-mobile.png`, `appointment-mobile.png`.

Screenshots use synthetic API fixtures; their names, appointment details and dates are test data.

## 2. Files modified

- `frontend/src/components/lawyers/LawyerRecommendations.tsx`
- `frontend/src/components/lawyers/recommendationWorkflow.ts`
- `frontend/src/hooks/useRecommendationWorkflow.ts`
- `frontend/src/api/recommendationsApi.ts`
- `frontend/src/features/lawyerServices/aiOperations/components/WorkforceWorkflowProgress.tsx`
- `frontend/src/pages/admin/AppointmentsPage.tsx`
- `frontend/tests/recommendation.spec.ts`
- `frontend/tests/member1-guardrails.spec.ts`
- `frontend/tests/member1-routes.test.mjs`
- `ai-service/lawyer_recommendation/gemini.py`
- `ai-service/lawyer_recommendation/agent.py`
- `backend/LegalService.API/Services/Lawyers/RecommendationService.cs`

## 3. Components refactored

`LawyerRecommendations` now orchestrates feature components. Input, interpretation, matching, review, booking, success, errors and audit details have separate responsibilities. The matching module contains distinct top-card, compact candidate-row and ranking-information components. Existing API and hook locations remain compatible with the rest of the application.

## 4. Progression reuse

Extracted the workforce SVG circle and stage list into `AIWorkflowProgress`. Responsibility descriptions, outer labels, accessible region name and completion text are configurable. Workforce uses a small wrapper and retains its existing decorative animation behavior; recommendation progress does not replay staged animations.

Recommendation stages come from recorded workflow events, persisted status and actual in-flight requests. While analysis is pending, the UI shows ANALYSING and waits for confirmed stage results. It does not pretend to know which internal node is executing. Creating an appointment reflects the real approval request. The circular display contains no percentages or spinning loader. Total analysis request duration is measured with `performance.now()` and is not fabricated or reconstructed on refresh.

## 5. AI interpretation changes

The structured schema adds nullable `legalServiceId`, `legalServiceName`, `matterSummary` and `supported`. Existing category ID/name fields and keywords remain. The prompt requests an optional catalog service and a short factual matter summary, without legal advice or reasoning. Extra output fields remain rejected at Python boundaries. `supported` is derived again by the system from the validated Practice Area.

## 6. Legal Service classification

Added optional classification. A null service allows valid Practice Area matching to continue. A claimed service must have a real paired ID/name and belong to the selected Practice Area. The UI shows “Not specifically identified” when no verified service exists. Existing persisted interpretations without these fields remain readable.

This implementation is verified with structured-output stubs and isolated catalog tests. Live Gemini service classification has not been verified in this task.

## 7. Catalog validation and audit

Python validates claimed service ID, name and category against the authenticated backend snapshot. ASP.NET independently checks those facts against its database before saving the interpretation. Unknown, unpaired and cross-area services are rejected. Existing Practice Area validation remains.

Backend audit persistence now permits known public stage names and numeric counts rather than arbitrary upstream JSON. The UI renders public event descriptions and timestamps; it does not render raw output summaries, provider reasoning or stack traces.

A read-only inspection of the running local catalog is recorded separately in `recommendation-refinement-catalog.json`. No Gemini request or booking was made by that inspection.

The local catalog contains 10 Practice Areas (including five `[Demo]` entries) and 25 Legal Services. All 25 services map to exactly one catalog Practice Area by the repository's current category-name rule. Family Law is absent.

## 8. Ranking UI

One prominent Top Recommended Match card is followed by compact Other Eligible Matches rows with expandable details. Each candidate displays verified identity/profile fields, recorded experience, Recommendation Points and the backend-generated reason. No quality, win-rate, confidence or success score was added.

## 9. Eligibility versus ranking

Visible eligibility rules state active status, correct Practice Area and requested-date availability when applicable. An expandable ranking explanation states the actual rule: points equal recorded experience, ordered descending; ties use stable lawyer ID order. Practice Area and date availability remain eligibility gates. The legacy lawyer/service link does not supply expertise or ranking points.

## 10. Human review

Select Lawyer enters Administrator Review and hides the candidate list. The selected lawyer, Practice Area, optional Legal Service, points, date and verified reason appear together. Change Selection returns to candidates. Continue to Appointment opens the operational booking section. These steps do not approve or create an appointment.

## 11. Approval flow

Customer lookup and slot selection use existing APIs. No arbitrary slot or customer ID input was introduced. Preferred-date workflows keep booking tied to that date; changing it starts another analysis. Without a preferred date, the administrator chooses a date and a recorded unbooked slot.

Existing backend ownership, recommendation membership, active status, Practice Area, customer, slot ownership, slot availability, date, transaction and duplicate-approval safeguards remain. Conflict handling refreshes slots and checks persisted workflow status. Customer reads, approval failures and completed-appointment detail reads have targeted retry actions. A completed workflow remains successful if its detail read fails.

View Appointment uses `/admin/appointments?appointment=<actual-id>`; the existing Admin appointments screen now opens that appointment's details.

## 12. Restoration

URL restoration shows a resolving state before the ready form can render. Persisted awaiting-approval, unsupported, no-match and completed states retain their meaning. Selected lawyer and review/appointment step are retained in browser session storage as IDs and a view name; restored selection must still belong to that workflow's recommendations. Customer and slot are reloaded and must be selected again. Server ownership and approval status remain authoritative.

## 13. Responsive behavior

At desktop widths, the circle and full stage list sit beside one another. Below the desktop breakpoint, the circle shrinks, outer labels hide, and the stage list and forms stack. Verified no page-level horizontal overflow at 1440, 1024, 768, 375 and 320 pixels. Screenshots document desktop progression/matches/review and mobile progression/appointment fields.

## 14. Accessibility

Added labelled regions, explicit form-control labels, semantic stage lists, status announcements, alert regions, native expandable details, visible button focus states and programmatic focus on new review/result headings. Keyboard selection and continuation are tested. Recommendation SVG progress has no animation, including under reduced-motion preferences; the shared workforce component retains its reduced-motion handling.

## 15. Tests added and updated

New browser checks cover actual request progress, no staged animation, interpretation/service badges, top/alternative hierarchy, ranking explanation, unsupported/nonsense results, selection/reselection, session restoration, customer search, real slot filtering, real approval progress, completion, audit disclosure, five viewport sizes, keyboard/reduced motion, slow restoration, 422/503 retry, appointment deep links, customer retry, booking retry and detail-read recovery.

Updated existing browser and SSR expectations for Analyse Requirement, the primary visible progression, point accessibility labels and the separate review/appointment steps.

New backend tests cover valid/null/unknown/unpaired/cross-area service interpretations, persistence and safe audit output. New Python tests cover service validation, null service continuation, unchanged deterministic ranking, system-derived support and rejection of hidden-reasoning fields. Existing recommendation, HTTP authorization, ownership, eligibility and approval tests were run.

## 16. Build and frontend results

- `npm run build`: passed TypeScript and production Vite build. Existing large-bundle warning remains (main JavaScript approximately 841 kB before gzip).
- Focused ESLint checks for the new/refactored shared components, recommendation feature and workflow hook: passed. Whole-repository lint was not claimed.
- `npm run test:member1`: 18 passed.
- Final recommendation/module browser run: 32 passed, using `npx playwright test recommendation.spec.ts recommendation-workflow.spec.ts member1-guardrails.spec.ts --workers=2`.
- Shared workforce regression suite: all 19 cases passed in the broader regression run. Its component behavior remained intact.

## 17. Backend results

`dotnet test backend/LegalService.Tests/LegalService.Tests.csproj --no-restore --filter 'FullyQualifiedName~Recommendation|FullyQualifiedName~LawyerManagementHttpTests' --verbosity quiet`

80 passed; one opt-in live transport test skipped. Included HTTP authorization tests and existing validation/booking tests. Tests use isolated fixtures, including real appointment-service execution against test storage; no production appointment was created. Compilation passed. NuGet reported that vulnerability metadata could not be fetched; package restore was not requested. PostgreSQL concurrency integration and the full unrelated backend suite were not run in this task.

## 18. Python results

From `ai-service`: `.venv/bin/python -m unittest tests.test_recommendation tests.test_recommendation_services tests.test_recommendation_guardrails tests.test_recommendation_gemini tests.test_recommendation_snapshot`

29 passed. These validate graph/schema/transport behavior with controlled classification or SDK fixtures. They do not establish live model accuracy. Existing test-client resource warnings appeared without failing tests.

## 19. Routes and manual inspection

Rebuild/restart the backend and AI service to load the additive schema/catalog changes. Open `/admin/lawyer-services/recommendations` as Admin. Inspect:

| Path | Input/action | Expected state to inspect |
| --- | --- | --- |
| A | I need a lawyer to review a commercial contract. | Corporate & Commercial Law; verified eligible matches if directory permits |
| B | I have been charged with an offence and need legal representation. | Criminal Law; verified eligible matches if directory permits |
| C | My employer terminated me without proper notice. | Labour & Employment Law; optional verified catalog service |
| D | I have a dispute about ownership of my land. | Real Estate & Property Law; optional verified catalog service |
| E | I received a tax assessment that I believe is incorrect. | Tax Law; verified eligible matches if directory permits |
| F | I need help with divorce and child custody. | Unsupported when Family Law is absent; no candidates or approval |
| G | banana rocket purple chair | Unsupported; no candidates or approval |
| H | Supported issue, no preferred date | Availability Not Filtered; review; choose a future date and real slot |
| I | Supported issue with a preferred date | Candidates satisfy the date rule; appointment date stays fixed |
| J | Select Lawyer → Continue to Appointment → customer + slot → Approve | Real request progress; appointment-created details and View Appointment link |
| K | Refresh the workflow URL | Restore matches/review/appointment/completion appropriately; no ready-form flash |

Also inspect empty matches, catalog/provider errors, customer/slot read failures, stale slot rejection, retry, workflow details, and mobile layouts. Stored workflows use `/admin/lawyer-services/recommendations?workflow=<actual-workflow-id>`. View Appointment opens `/admin/appointments?appointment=<actual-appointment-id>`. Inspect `/admin/lawyer-services/ai-operations` for the shared progression regression.

A–G graph behavior was tested with a stub classifier, not evaluated live against Gemini. H–K were exercised with mocked frontend APIs and isolated backend fixtures. Real-catalog live classification and a live database appointment have not been performed.

## 20. Remaining limitations and pending approval

- The existing API returns analysis results together; there is no per-node streaming. The UI deliberately waits for confirmed events instead of simulating INTERPRETING/VALIDATING transitions.
- Selection/review-step persistence is confined to the current browser session. Server persistence records the workflow and final approved selection; it does not record each tentative selection across devices.
- No database migration or recommendation-backend rebuild was introduced. Legal Service association validation uses the repository's current catalog category mapping.
- Live Gemini classification is pending explicit approval. Automatic approval review rejected the proposed read-only check because it would send the seven supplied test requirements and actual catalog names/descriptions to the external Gemini service without payload/destination-specific authorization. No rejected request was executed or retried indirectly. The proposed check sends no customer identity, candidate profiles, slots or appointment internals, and would create no workflow or appointment.
