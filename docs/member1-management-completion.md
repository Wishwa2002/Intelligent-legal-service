# Member 1 management implementation report

> Historical implementation report. The [3 October 2026 final verification report](member1-final-verification.md) supersedes its catalog, profile-service, ranking, architecture, and test-result descriptions.

Branch: `feature/member1-lawyer-management`. Changes are uncommitted. No database reset, live database migration, live Gemini call, or seed command was run during this task.

## Existing implementation reused

- `LawyersController` already owned lawyer creation, listing, detail, deletion, specialization listing, and the Member 2 slot-service adapter.
- `Lawyer`, `LegalService`, `Specialization`, `LawyerSpecialization`, `LawyerLegalService`, `LawyerAvailability`, and `AvailabilitySlot` already existed with EF mappings. No new tables or entity fields were needed.
- JWT uses the existing `Admin`, `Customer`, `Lawyer`, and `Clerk` roles. The existing JWT service is used by the new HTTP tests.
- The EF mapping ignores `Lawyer.User`: the existing account association is by email. Updates follow that association rather than inventing a foreign key.
- React's existing Add Lawyer modal, API client, Admin layout, and recommendation component were reused.
- Flutter's existing lawyer/specialization/slot models, API client, and booking navigation were reused.
- `avvoinspired.md` explicitly lists POST/PUT/DELETE specialization APIs, establishing that specialization management includes CRUD, not only assignment.

## Security and update behavior

Lawyer POST, PUT, DELETE and specialization POST, PUT, DELETE now require `[Authorize(Roles = "Admin")]`. Anonymous requests receive 401; authenticated Customer/Lawyer/Clerk requests receive 403. Read-only discovery remains public.

`PUT /api/lawyers/{id}` accepts name, email, phone number, qualification, experience (0–70), license number, professional description, and one existing specialization. New clients send `specializationId`; legacy clients may send the exact `category` name. The ID takes precedence if both are supplied. No account ID, role, password, lawyer ID, or status changes are accepted by the update DTO.

Responses: 200 on success, 400 for invalid fields/category, 404 for a missing lawyer, and 409 for duplicate email/license or an incompatible account association. Updates synchronize the linked Lawyer account's name and email while retaining its identity, role, and password. Directory-only records without an account remain directory-only.

Creation rejects email addresses already used by users or clerks rather than changing their role or credentials. Lawyer deletion rejects any appointment history with 409, consistent with the existing restrictive foreign keys. Existing login accounts are retained when deleting directory-only lawyer records; account lifecycle is not redesigned here.

## API contracts

| Route | Behavior |
|---|---|
| `GET /api/lawyers/search` | Alias of existing `GET /api/lawyers`; uses the same filtering action |
| `GET /api/lawyers?search=...&specialization=...&date=YYYY-MM-DD` | Text, specialization ID/name, and optional recorded unbooked-date filtering |
| `GET /api/specializations` | Alias of existing `/api/lawyers/specializations`, including IDs, names, descriptions, and lawyer counts |
| `GET /api/legal-services` | Existing catalog fields: legalServiceId, serviceName, description, category |
| `GET /api/lawyers/{id}/availability?date=YYYY-MM-DD` | Recorded unbooked slots using Member 2's existing AvailabilitySlotResponse shape; no slot generation |
| `GET /api/lawyers/{id}/availability` | Upcoming recorded unbooked slots from UTC today onward |
| `GET /api/lawyers/{id}` | Existing response plus actual linked legalServices |
| `POST /api/specializations` | Admin creates a unique name/description |
| `PUT /api/specializations/{id}` | Admin edits name/description; keeps existing name-based legal-service category references aligned |
| `DELETE /api/specializations/{id}` | Admin deletes unused records; rejects references from lawyers, legal services, or recommendation history with 409 |

Existing routes are retained, including `/api/lawyers/{id}/slots`. That existing booking lookup may generate default slots, so it was deliberately not used for the new read-only availability route. No Member 2 service or booking architecture was changed. Availability-filtered discovery excludes inactive lawyers. Without a date, the directory preserves its existing behavior of returning all statuses; Flutter disables booking controls for inactive lawyers.

## React and Flutter

React reuses the existing form for Edit with prefilled values, submission/error/success states, and refresh after saving. Password is shown only during creation. Search includes profile description, and a date field filters by recorded availability. The specialization catalog is fetched from the backend; create/update requests include the selected existing ID. A compact management panel provides list/add/edit/delete with conflict messages.

Flutter fetches specialization names, IDs, and descriptions from the backend, supports date filtering, opens a dedicated profile when a card is tapped, and displays existing professional fields, linked services, and recorded availability. Specializations open a details screen from either the profile or selected directory category. Missing descriptions are explicitly reported as missing. No location, rating, or verification data is invented. Existing booking navigation is retained.

Startup category initialization now runs only for an empty catalog or the untouched four EF seed categories with no lawyers. It preserves the six category names expected by the existing demo seeder during first setup, and stops resetting an established Admin-managed catalog. The demo seeder itself was not modified. If an Admin deliberately renames/deletes a category required by the demo seeder, its existing missing-category guard still applies.

## Recommendation access decision

The user explicitly confirmed: **keep the dedicated workflow Admin-assisted**. No recommendation permissions or workflow code were changed. Customer-facing workflow requirements elsewhere in the platform do not change this confirmed Member 1 access policy. Classification, controlled retrieval, ranking, validation, persistence, approval, booking handoff, audits, and synthetic seed data remain intact.

## Files created

- `backend/LegalService.API/Controllers/LegalCatalogController.cs`
- `backend/LegalService.API/DTOs/Requests/UpdateLawyerRequest.cs`
- `backend/LegalService.API/DTOs/Requests/SpecializationRequest.cs`
- `backend/LegalService.Tests/LawyerManagementHttpTests.cs`
- `frontend/src/components/lawyers/SpecializationManager.tsx`
- `mobile/lib/screens/appointments/lawyer_profile_screen.dart`
- `mobile/lib/screens/appointments/specialization_details_screen.dart`
- `mobile/test/lawyer_details_test.dart`
- `docs/member1-management-completion.md`

## Files modified

- `backend/LegalService.API/Controllers/LawyersController.cs`
- `backend/LegalService.API/DTOs/Requests/CreateLawyerRequest.cs`
- `backend/LegalService.API/Data/DbInitializer.cs` (Member 1 catalog initialization only)
- `frontend/src/api/lawyersApi.ts`
- `frontend/src/pages/admin/LawyersPage.tsx`
- `mobile/lib/models/lawyer.dart`
- `mobile/lib/services/lawyer_service.dart`
- `mobile/lib/screens/appointments/lawyers_screen.dart`

No AI-service source, recommendation workflow/controller/service, demo-seeder, appointment module, environment file, or dependency manifest was changed.

## Verification

Final verification: backend build passed; all **68 backend tests** passed; all **12 Python recommendation tests** passed. HTTP tests run an isolated Kestrel server, real JWT middleware and real controllers with EF InMemory. They do not start the production Program or access its configured PostgreSQL database. InMemory tests do not replace PostgreSQL integration testing.

- React production build passed; Vite reports its existing large-chunk warning.
- Targeted ESLint on the Member 1 API/page/components passed.
- Full frontend lint fails in unrelated existing modules: 76 errors and 2 warnings. These were left outside this task's scope.
- No React test runner/script is configured in the existing frontend package.
- Flutter and Dart are not on PATH. Flutter analyze and the added model/widget tests could not be run here.
- Backend build has existing EF Relational version-conflict and NuGet vulnerability-feed warnings.
- No browser/device end-to-end test or live PostgreSQL/Gemini test was performed.

These verification gaps mean this report does **not** certify Member 1 as fully completed and verified. The broader `avvoinspired.md` also lists functionality beyond this task's supplied checklist (for example full legal-service CRUD and availability writes); those additions were not silently included.

## Exact manual checks

Use a development/test database and existing accounts. Do not run delete checks against seeded or real lawyer records. No new migration is required for this change.

1. Start the backend with the existing development configuration:

   ```sh
   ASPNETCORE_ENVIRONMENT=Development ASPNETCORE_URLS=http://127.0.0.1:5295 dotnet run --no-launch-profile --project backend/LegalService.API/LegalService.API.csproj
   ```

2. Start React in another terminal:

   ```sh
   cd frontend
   VITE_API_URL=http://127.0.0.1:5295 npm run dev -- --host 127.0.0.1 --port 5173
   ```

3. Open `http://127.0.0.1:5295/swagger`. Before authorizing, call `GET /api/specializations`, `/api/lawyers/specializations`, `/api/legal-services`, and `/api/lawyers/search`. Expect 200; specialization aliases must return the same data. Copy one actual specialization ID.

4. Try POST `/api/lawyers`, PUT `/api/lawyers/{id}`, and DELETE `/api/lawyers/{id}` without a token: expect 401. Log in through POST `/api/auth/login` using an existing Customer account, authorize Swagger with its JWT, and repeat: expect 403. Repeat specialization POST/PUT/DELETE with the same expected results.

5. Log in using an existing Admin account. In React open `/admin/lawyers` → **Manage specializations**. Add `Member 1 manual test` with a description, edit that description, and verify it appears in the category selector. Creating another record with the same name must display a conflict error.

6. Click **Add New Lawyer**. Use a new test email such as `member1.manual@example.test`, license `MEMBER1-MANUAL-001`, a password you choose, and the test specialization. Expect success and a new row. Do not reuse an existing account email.

7. Click **Edit** on that new row. Verify all existing fields load, the password field is absent, and saving changed name/email/experience/description refreshes the row. Verify the new login email works with the same chosen password. Try an existing lawyer's email/license and expect a displayed conflict. Browser DevTools should show PUT `/api/lawyers/{id}`.

8. For direct API validation, copy the temporary lawyer ID and send this PUT body with the actual specialization ID substituted:

   ```json
   {
     "name": "Member 1 Manual Updated",
     "email": "member1.manual.updated@example.test",
     "phoneNumber": "000-000-0000",
     "qualification": "Test qualification",
     "experience": 5,
     "licenseNumber": "MEMBER1-MANUAL-001",
     "profileDescription": "Synthetic manual test profile",
     "specializationId": 1
   }
   ```

   Expect 200. Repeat with specializationId `2147483647`, experience `-1` or `71`, blank name/license, or malformed email: expect 400. A nonexistent lawyer UUID must return 404. Extra role/password/account-ID fields must not change account security.

9. With an existing active lawyer that already has recorded slots, call `/api/lawyers/{id}/availability` and note an actual date. Call `/api/lawyers/search?specialization=<actual-id>&search=<name-fragment>&date=<recorded-date>`. Verify the lawyer is included. A date without recorded slots must produce an empty result. Availability must omit booked slots; an unknown lawyer returns 404 and an invalid date returns 400. These calls must not create availability rows. Check the same date filter in React.

10. On a machine with Flutter, run:

    ```sh
    cd mobile
    flutter pub get
    flutter analyze
    flutter test test/lawyer_details_test.dart
    flutter run
    ```

    Configure the app's backend URL using its existing server-settings dialog. Open **Find a Lawyer**, verify backend categories, search by text, filter by date, and tap a card. Verify full description, qualifications, experience, services (if recorded), availability, specialization details, and the existing booking navigation. An inactive lawyer must show disabled booking. Empty descriptions/services/slots must show honest empty states.

11. While the temporary lawyer still uses the test specialization, try deleting the specialization: expect 409. Delete only the temporary lawyer, which has no appointments, then delete the now-unused test specialization: expect success. Deleting a lawyer with appointment history must return 409. Directory deletion retains the account; use existing account administration for any test-account cleanup.

12. As Customer, POST/GET/approve on `/api/lawyer-recommendations` must remain 403; anonymous requests must remain 401. As Admin, use the existing configured AI service and **AI Recommendation** panel to run your usual synthetic recommendation demo. A recommendation must still wait for explicit approval before booking. This optional live demo was not executed by the coding task.

13. Automated checks from the repository root:

    ```sh
    dotnet build backend/LegalService.API/LegalService.API.csproj --no-restore
    dotnet test backend/LegalService.Tests/LegalService.Tests.csproj --no-restore
    (cd ai-service && .venv/bin/python -m unittest discover -s tests -p 'test_recommendation*.py' -v)
    (cd frontend && npm run build)
    (cd frontend && npx eslint src/api/lawyersApi.ts src/pages/admin/LawyersPage.tsx src/components/lawyers/SpecializationManager.tsx src/components/lawyers/LawyerRecommendations.tsx)
    ```
