# AI Lawyer Matching: front-desk integration report

The feature remains **AI Lawyer Matching** at `/admin/lawyer-matching`. The Admin identifies or registers a normal client before submitting the legal requirement. Human review creates a standard Appointment through the existing service; Client Management and Appointments continue to own their records and lifecycle.

## 1. Files created

| File | Purpose |
| --- | --- |
| `backend/LegalService.API/DTOs/Clients/ClientDtos.cs` | Safe client summary, validated registration request and duplicate result. |
| `backend/LegalService.API/Services/Clients/ClientService.cs` | Shared ordinary Customer registration and summary/search operations. |
| `frontend/src/features/lawyerServices/recommendations/components/ClientIntake.tsx` | Search, select, quick-register, duplicate handling and confirmed client changes. |
| `backend/LegalService.API/Migrations/20261004151111_AddFrontDeskMatchingIntake.cs` and `.Designer.cs` | Additive EF migration and metadata. |
| `docs/sql/front-desk-matching-intake.sql` | SQL generated from that single EF migration. |
| `scripts/apply-front-desk-matching-migration.py` | Development-only application/check of the reviewed migration. |
| `backend/LegalService.Tests/FrontDeskMatchingTests.cs` | Client, review, AI boundary and booking service tests. |
| `backend/LegalService.Tests/FrontDeskMatchingPostgresTests.cs` | Migration preservation and standard Appointment lifecycle against PostgreSQL. |
| `frontend/tests/frontdesk-matching.spec.ts` | Front-desk flow, registration, duplication, restoration, confirmation and responsiveness. |
| `frontend/tests/frontDeskFixture.ts` | Server review-state mock shared by existing regression tests. |
| `docs/front-desk-lawyer-matching.md` | This report. |
| `docs/evidence/front-desk-matching/` | Viewport screenshots, live success/module screenshots and verification metadata. |

## 2. Existing files modified for this refinement

Backend:

- `Controllers/AuthController.cs`, `ClientsController.cs`, `LawyerRecommendationsController.cs`.
- `DTOs/Appointments/AppointmentRequests.cs`, `AppointmentResponses.cs`.
- `Models/Entities/LawyerRecommendationWorkflow.cs`, `Appointment.cs`.
- `Data/ApplicationDbContext.cs`, `Migrations/ApplicationDbContextModelSnapshot.cs`, `Program.cs`.
- `Services/Lawyers/RecommendationService.cs`, `Services/AppointmentService.cs`.
- Tests: `LawyerManagementHttpTests.cs`, `Member1RecommendationTests.cs`, `Member1PostgresTests.cs`, `LawyerRecommendationApprovalTests.cs`, `RecommendationLiveTransportTests.cs`, `RecommendationServiceCatalogTests.cs`, `RecommendationTransportTests.cs`, `RecurringRecommendationTests.cs`.

Frontend:

- `src/api/clientsApi.ts`, `recommendationsApi.ts`, `src/hooks/useRecommendationWorkflow.ts`.
- `src/components/lawyers/LawyerRecommendations.tsx`, existing `src/pages/admin/LawyerMatchingPage.tsx`.
- Recommendation components: `RequirementForm.tsx`, `LawyerReviewPanel.tsx`, `AppointmentApprovalForm.tsx`, `RecommendationCompletion.tsx`, `RecommendationError.tsx`, `RecommendationWorkflowProgress.tsx`, `WorkflowDetails.tsx`.
- Tests: `recommendation-workflow.spec.ts`, `recommendation.spec.ts`, `member1-guardrails.spec.ts`, `derived-booking.spec.ts`.

The workspace already contained the independent matching navigation refactor, workforce page rename, configuration edits and related tests. Those existing changes were preserved. They are not additions made by this intake refinement.

## 3. Client-selection flow

Step 01 is Client; step 02 is the existing requirement form. The requirement/date inputs and Analyse Requirement action require a selected client. Backend analysis also requires a real Customer ID before creating a workflow or calling AI. Search uses the existing Users store and returns only name, email and ID for Customer accounts. Selected Client remains visible throughout review; the appointment step uses that selection without asking for a second customer search.

## 4. Quick registration

Customer signup and the Admin Client API share `ClientService.RegisterAsync`, the existing Users/UserRoles tables and the existing password hashing service. No temporary client model was introduced. The normal domain requires email and account password. Full name remains optional, using the existing email-prefix fallback. Phone search/registration is omitted because ordinary client records do not have that field.

The frontend checks for an existing email and offers **Possible Existing Client → Use Existing Client**. Backend checks duplicates and validates independently. Successful registration automatically selects the new client. Role injection is rejected by the strict request DTO; passwords and account internals are not returned.

## 5. Workflow persistence and restoration

The workflow stores nullable `ClientId`, `SelectedLawyerId`, `SelectedSlotId`, `BookingDate`, plus `ReviewStage` (`MATCHES`, `REVIEW`, `APPOINTMENT`). Client identity is referenced by ID rather than copied into personal data snapshots. `/api/lawyer-recommendations/{workflowId}/review` saves explicit Admin selections.

Refresh restores the client from Client Management and the review fields from the backend. Optional browser storage is only a compatibility fallback. Existing workflows with no client can explicitly attach one before review/approval. A deleted client clears the FK; final approval cannot silently use a replacement.

Changing the client in appointment review requires confirmation, records a public event, returns to Administrator Review and clears the slot. It does not rerun AI when the requirement is unchanged. Requirement edits and preferred-date changes use a fresh analysis.

## 6. Recommendation and progression

The nine existing progression stages remain. The requirement-only AI request has no client ID, name or email fields. AI still interprets the Practice Area, supported Legal Service and matter summary. Backend catalog/profile checks, verified experience ranking and date eligibility remain authoritative. No artificial request delays or simulated stage completion were added.

Visible ownership copy:

- **SYSTEM:** Client records, catalog, eligibility, availability, ranking and booking validation.
- **AI:** Legal requirement interpretation.
- **HUMAN:** Client intake, lawyer selection and appointment approval.

## 7. Appointment service integration

Approval calls the existing `AppointmentService.BookAppointmentAsync`. The result is one ordinary Appointment and its existing status history, linked to the selected client and lawyer. AI Lawyer Matching has no second appointment entity, list or management interface. Walk-in appointments use `InPerson` consultation type.

The success surface includes Client, Lawyer, Practice Area, Legal Service, date/time, source, workflow and Appointment ID. **View Appointment** links to the normal Admin appointment detail route. **Start New Client Intake** clears the completed intake.

## 8. Scheduling integration

The existing scheduling service remains the source of available slots: recurring schedule minus leave and occupied appointments. Preferred dates filter candidates through real availability. No-date matching retains **Availability Not Filtered**; the Admin then chooses a date and a real derived slot. Date changes reload slots and clear old selections. Non-working, leave and fully booked reasons remain visible. Restored slots are checked against the current returned list.

## 9. Conflict prevention and authorization

Client search, registration, recommendation, review and approval endpoints require Admin. Review and approval require the authenticated workflow owner. The backend checks real client existence, recommendation membership, review stage, selected lawyer/slot, lawyer eligibility, preferred-date constraints and current scheduling availability.

Existing transactions, per-lawyer locking and central booking checks prevent duplicate/conflicting bookings. Workflow status and review fields are concurrency tokens. Controlled 409 responses refresh slots; the Admin chooses another available slot. No frontend guard substitutes for backend validation.

## 10. Appointment source

Optional `AppointmentSource` was added to the ordinary Appointment model and DTOs. Accepted values are `CLIENT_PORTAL`, `FRONT_DESK`, `AI_FRONT_DESK`, `ADMIN`. AI Lawyer Matching sets `AI_FRONT_DESK`. Existing records retain null, and old booking callers may omit the field. Success copy shows **Front Desk · AI Assisted** only when the actual returned source matches. An optional badge was not added to the central Appointment list.

## 11. Migration verification

Migration: `20261004151111_AddFrontDeskMatchingIntake`.

It adds five workflow columns, one Appointment column, the client index and a nullable Users FK with `ON DELETE SET NULL`. Legacy review stages default to `MATCHES`. No existing business-row updates are included.

An isolated PostgreSQL test removed/reapplied this migration, verified preserved client/workflow/appointment history, attached a client to a legacy workflow, approved through the normal service and cancelled through that service. The single generated EF migration was then applied to the configured Development database; migration history and all six new columns were checked. No tables were changed outside the migration.

## 12. Tests added and updated

19 backend cases added, covering missing/invalid clients before AI, client identity exclusion, review restoration, confirmed client change, substituted-client rejection, required final review, legacy workflows, ordinary booking/source/history, registration hashing/validation/duplicates, Admin HTTP enforcement and PostgreSQL migration/lifecycle preservation.

12 new browser cases cover initial intake order, search/selection, quick registration and automatic selection, duplicate handling, registration failure, storage-independent restoration, confirmed changes, ordinary appointment success/reset and five viewport widths. Existing matching, booking and guardrail fixtures were updated for client-first state and persisted review.

## 13–15. Build and test results

| Check | Verified result |
| --- | --- |
| Frontend `npm run build` | Passed. |
| Backend `dotnet build backend/LegalService.API --no-restore` | Passed; 0 errors. |
| Full backend suite, isolated PostgreSQL enabled and live AI transport enabled | **259 passed, 0 failed, 0 skipped.** |
| Full frontend Playwright suite | **104 passed, 0 failed, 3 skipped.** The three skips are separately opt-in live scheduling checks. |
| Node route/component tests | **19 passed, 0 failed.** |
| ESLint on changed frontend implementation | Passed. |
| `git diff --check` | Passed. |
| Responsive visual inspection | Intake/registration and review/appointment screenshots checked at 1440, 1024, 768, 375 and 320px; no horizontal overflow in browser assertions. |
| Live existing-client workflow | Passed with Gemini and the configured Development database. |
| Live new-client workflow | Passed; normal Client Management shows the client. |
| Live concurrent-slot scenario | Existing normal booking consumed the selected slot; approval returned 409, refreshed slots and succeeded with another slot. |

Build warnings: Vite reports the existing large application chunk. NuGet vulnerability metadata could not be downloaded (`NU1900`); compilation and tests succeeded using available packages.

## 16. Exact screens and retained verification records

Open `http://127.0.0.1:5173/admin/lawyer-matching` while signed in as Admin. Existing local services were started with the repository launcher.

- Existing-client workflow: `/admin/lawyer-matching?workflow=6e5072fb-cfa4-4ce0-b15a-6644cda94c74`.
- Its ordinary appointment: `/admin/appointments?appointment=0fb61714-78ee-4990-a7d3-e51eaf6484f9` (5 October 2026).
- Newly registered normal client: ID **53**, shown in `/admin/clients` with a `[Demo] Front Desk` name.
- New-client workflow: `/admin/lawyer-matching?workflow=c542acc1-59c5-4054-8025-d602b2c74489`.
- Its ordinary appointment: `/admin/appointments?appointment=36a85b70-6aa4-4cb8-b700-6eb3b42af38b` (5 October 2026).
- Competing conflict-test appointment `50027eca-239a-45c3-a0af-98ec24b47d14` was cancelled through the normal Appointment API after verification.

The two successful demo appointments and the registered demo client remain available for inspection. They can be managed using the existing modules. Both successful appointments have `AI_FRONT_DESK` source. Verification metadata is in `docs/evidence/front-desk-matching/live-verification.json`.

## 17. Cross-member integration limits

The normal client domain requires email/password and has no phone field. This refinement keeps those constraints. The recommendation POST now requires `clientId`; any separate direct consumer of that Admin API must supply a selected normal client. Existing workflows remain readable, but a legacy pending workflow must be reviewed with a client before final approval.

Client Management retains full profile/lifecycle ownership; Appointments retains ongoing management. Existing normal booking clients can omit source. The Python classifier contract and existing workforce/hiring workflow were not changed.
