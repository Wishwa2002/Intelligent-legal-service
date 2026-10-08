# Lawyer mobile dashboard

Implemented in the existing Flutter app, ASP.NET API and central appointment/scheduling model. No new production database, authentication system, appointment table, availability store, or state-management dependency was introduced.

## Behavior

The mobile login accepts Customer and Lawyer accounts (case-insensitive role routing). Customers keep `MainNavigationScreen`; Lawyers receive `LawyerNavigationScreen`, with **Home, Appointments, Schedule, Profile**. Admin, Clerk and unknown roles cannot establish a new mobile session. A restored unsupported session receives a sign-out screen. A lawyer signing in from a customer/guest modal is routed into the lawyer experience rather than remaining in customer navigation.

The backend requires an existing User with role Lawyer, a linked `Lawyer.UserId`, and an **Active** profile. Pending and Inactive profiles cannot log in, and their existing tokens cannot use operational endpoints. A missing/deleted profile is rejected. Deletion and appointment-history rules remain unchanged; a leftover account cannot access lawyer operations.

Admin-created lawyer accounts, including accounts with a custom initial password, have `MustChangePassword = true`. The migration also flags existing Lawyer accounts because their original password provenance is unknown. New development-demo lawyer identities are flagged too. Mobile entry shows mandatory password setup before the navigation tabs. The backend checks the stored flag on every lawyer API action; clearing local storage or guessing an endpoint does not bypass it. A small `/lawyer/change-password` web page handles the same gate for existing web login. The web dashboard was not rebuilt.

## API contract

All `/api/lawyer/me` endpoints authorize role Lawyer and derive the profile from the JWT NameIdentifier/UserId. They accept no LawyerId parameter for ownership. Appointment and leave IDs are additionally checked against that profile.

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/lawyer/me` | Own professional profile |
| GET, PUT | `/api/lawyer/me/profile` | Read profile; update phone and description only |
| GET | `/api/lawyer/me/dashboard` | Own profile, counters, next appointment, office timezone |
| GET | `/api/lawyer/me/appointments?filter=upcoming` | Own appointments, filtered by today/upcoming/pending/completed/cancelled/all |
| GET | `/api/lawyer/me/appointments/{id}` | Own appointment details |
| POST | `/api/lawyer/me/appointments/{id}/confirm` | Requested or Rescheduled → Confirmed |
| POST | `/api/lawyer/me/appointments/{id}/complete` | Confirmed → Completed |
| GET, PUT | `/api/lawyer/me/schedule` | Own recurring weekly schedule |
| GET, POST | `/api/lawyer/me/unavailability` | Upcoming leave; add leave |
| PUT, DELETE | `/api/lawyer/me/unavailability/{id}` | Edit/delete own leave |
| POST | `/api/auth/change-password` | Authenticated current/new/confirm password change |

The legacy appointment controller now requires authentication for appointment records/actions. Public slot availability and conflict-check routes remain public. Authenticated Lawyers are directed to the scoped API and cannot use legacy administrative appointment actions, arbitrary appointment IDs, or the general user-by-ID endpoint. Existing Admin/Customer clients must send their existing JWT for legacy appointment operations.

Counters use actual project statuses. Today counts today's appointments except Cancelled/Rejected, including any completed today. Upcoming includes Requested/Confirmed/Rescheduled starting at or after office-local now. Pending includes Requested/Rescheduled, regardless of appointment date. Completed counts Completed. The Cancelled filter includes Cancelled and Rejected. Next is the earliest upcoming appointment, with appointment ID as a deterministic tie-breaker. Office dates use the existing configured timezone, default Asia/Colombo.

Appointment DTOs contain client name, date/time, Practice Area/category, notes, consultation type, status and allowed actions. They omit client email, client ID and account details. The current Appointment entity stores a category rather than a specific LegalService ID/name; `legalService` is therefore null and the detail UI says “Not recorded.” No name is fabricated. Category falls back to the lawyer's Practice Area for historical records without one.

## Central integration and permissions

Reads resolve client names through the existing AppointmentService. Confirm/Complete invoke its existing lifecycle and status-history code under the existing lawyer mutation lock. No new statuses or autonomous rescheduling were added. A reschedule request workflow is not present in the central module, so the mobile app does not invent one. Lawyers cannot delete/reassign appointments, change the client/category/time, or cancel history through these endpoints.

Schedule and leave endpoints reuse `LawyerScheduleService` and `AvailabilityService`, including the PostgreSQL lawyer lock and controlled 409 conflicts. Seven unique weekdays, start-before-end, minute-aligned working times and duration 15–240 minutes are validated by the central service. Existing future appointment conflicts reject changes and return appointment dates/times. Full-day leave uses office-local midnight boundaries, with an exclusive end at midnight after the last included day. The mobile UI labels the last leave day as inclusive and sends that exclusive boundary. Conflicting appointments are not cancelled.

These changes immediately affect normal booking, AI Matching and Workforce capacity because those already derive availability from the same recurring schedule, leave and booked appointment snapshots. The mobile app maintains no independent slots or appointment data. Dashboard data reloads on app resume, navigation, pull-to-refresh and the refresh button. Lists reload on returning from appointment/schedule/profile edits. Mutations are not automatically retried after a connection failure.

Profile editing is limited to `phoneNumber` and `profileDescription` through a dedicated DTO. Name, email, qualification, experience, license, Practice Area, status, UserId and role remain Admin-controlled/read-only. Extra JSON fields cannot change them.

Password change verifies the current BCrypt hash, requires matching confirmation, a different password, at least 12 characters including letters and numbers, and no more than 72 UTF-8 bytes. It stores only a BCrypt hash and clears MustChangePassword. Passwords are not returned or persisted in Flutter session storage. Existing token storage is reused (SharedPreferences); no new encrypted-store dependency was introduced. Existing JWTs are not revoked by changing a password; they expire under the configured JWT lifetime. Expired/unauthorized sessions clear the stored token/user and return to login. Inactive/missing lawyer account responses also terminate the mobile operational session.

Loading indicators, retry/error views, appointment/leave/schedule empty states, and conflict dialogs with appointment dates/times are implemented. No AI chat, push notifications, payments, messaging or document management was added.

## Migration and development login

Added migration: `20261004165105_AddLawyerInitialPasswordChange` plus its designer and updated model snapshot. It adds `Users.MustChangePassword` with a false default, then sets it true for existing Lawyer identities. It does not change passwords, profile links, schedules or appointments. The migration was verified on an isolated PostgreSQL database and then applied to the configured application database on 5 October 2026 with explicit user approval. It flagged 38 existing Lawyer accounts and recorded the EF migration history entry.

For another database, apply before running the new API, from the repository root:

```sh
dotnet ef database update --project backend/LegalService.API
```

For a development database, existing idempotent development seeding can be used:

```sh
ASPNETCORE_ENVIRONMENT=Development dotnet run --project backend/LegalService.API -- --seed-demo-lawyers
ASPNETCORE_ENVIRONMENT=Development dotnet run --project backend/LegalService.API -- --seed-demo-scheduling
```

These commands are restricted to Development. Newly created synthetic demo accounts use `lawyer01@example.test` through the existing numbered demo set and initial password `DemoLawyer123!`. Use an account reported Active by `--report-demo-lawyers`. These are synthetic development credentials, not production credentials. The seeder preserves existing account passwords, so an existing account that already changed its password will not revert to the initial one. New or migration-flagged accounts must change their initial password. Newly Admin-created records can instead use an explicit initial password set in the Add Lawyer form.

The existing demo scheduler provides working hours, future booking/leave examples for selected lawyers. It does not guarantee a completed consultation for every lawyer; confirm/complete a synthetic appointment through the normal lifecycle when testing that counter. No new fake local-only appointment data is used.

Point the Flutter app's existing server settings / `.env` at a backend reachable from the device. Then:

```sh
cd mobile
flutter run
```

Compiled debug artifact: `mobile/build/app/outputs/flutter-apk/app-debug.apk` (ignored build output). No app was installed onto a personal device or deployed.

## Screens/routes to inspect

1. Mobile Sign In with an Active admin-created Lawyer account.
2. Mandatory Change Password, when flagged; then Lawyer Home.
3. Home: greeting, Today/Upcoming/Pending/Completed, next appointment, View Today.
4. Appointments: Today, Upcoming, Pending, Completed, Cancelled, All; tap for details and permitted Confirm/Complete.
5. Schedule: weekly office-local working hours and duration, Edit Working Schedule, upcoming leave, Add/Edit/Delete Unavailability.
6. Profile: professional fields, Edit Phone & Description, Change Password, Sign Out.
7. Customer login: existing customer navigation, without lawyer tabs.
8. Web `/login`, `/lawyer/change-password`, `/lawyer/dashboard`; Customer sessions cannot enter password setup.
9. Admin `/admin/lawyer-services/lawyers` for lawyer creation, and existing `/admin/lawyer-matching` for central matching/booking.

## Verification

- `flutter analyze --no-pub`: **no issues**.
- `flutter test --no-pub`: **23 passed**, including 11 new lawyer mobile tests.
- `flutter build apk --debug --no-pub`: **passed**, Android debug APK produced.
- `dotnet build backend/LegalService.API --no-restore`: **passed**. NuGet vulnerability-feed warning NU1900 occurred because the feed could not be reached; there were no compilation errors.
- Full backend regression run before the additional real-provider migration test: **271 passed, 8 skipped, 0 failed**. Skips were optional PostgreSQL/live-transport tests without environment configuration.
- `LAWYER_MOBILE_TEST_POSTGRES=... dotnet test ... --filter FullyQualifiedName~LawyerMobileHttpTests`: **26 passed, 0 skipped, 0 failed**, using a temporary loopback PostgreSQL 18 server and a separate database per test. No configured application database was touched; the temporary PostgreSQL server was stopped after verification. This includes migration backfill/preservation, real SQL queries, ownership, HTTP/JWT authorization, lifecycle/history, profile whitelist, password hashing/gates, schedule/leave conflicts and shared availability/capacity.
- `npm run build`: **passed**; existing bundle-size warning remains.
- `npx playwright test tests/lawyer-password.spec.ts`: **2 passed**, web password gate and Customer exclusion.
- `git diff --check`: **passed**.

The full backend suite includes existing shared recommendation tests covering full-day leave, booked intervals and Practice Area matching. The new HTTP test creates an AI_FRONT_DESK-source appointment through the central AppointmentService, verifies that it appears in the scoped mobile API, and verifies its booked time is unavailable. This exercises the shared appointment source, rather than calling a live Gemini service.

To run the new HTTP suite with the default in-memory provider:

```sh
dotnet test backend/LegalService.Tests --filter FullyQualifiedName~LawyerMobileHttpTests
```

To run the same HTTP suite plus SQL migration test against a disposable PostgreSQL maintenance server:

```sh
LAWYER_MOBILE_TEST_POSTGRES='Host=127.0.0.1;Port=55449;Database=postgres;Username=YOUR_LOCAL_USER;Pooling=false' \
  dotnet test backend/LegalService.Tests --filter FullyQualifiedName~LawyerMobileHttpTests
```

The tests create and drop their own databases. Do not point this maintenance connection at a production server.

## Manual end-to-end checks still needed

A physical-device/emulator → running API → Admin UI → live AI Matching session was not performed. Automated tests and the APK build passed; the following is the manual acceptance checklist, not a claim that those device/live-service steps were completed:

1. Admin creates a synthetic lawyer with a known initial password and configured working week. Verify linked User and seven schedule rows.
2. Mobile Lawyer login changes the initial password, then opens the four-tab dashboard.
3. Save working hours covering a future date. Add full-day leave on another future working date.
4. Admin AI Matching enters a synthetic walk-in requirement and chooses the leave date; that lawyer must have no available slots. Choose another working date and create an appointment.
5. Return/resume mobile, open Appointments and verify the central appointment appears with client/category/time. Check matching/normal booking/capacity no longer offer that interval.
6. Confirm it, then complete if appropriate under the existing lifecycle. Verify central status/history.
7. With an existing future 10:00–10:30 booking, attempt full-day leave on that date and a schedule ending before 10:00. Both must return conflict information and preserve the appointment.
8. Lawyer A token cannot read/confirm/complete Lawyer B's appointment or modify/delete B's leave. A client-supplied LawyerId does not change the `/me` result. Customer/Clerk/Admin tokens cannot enter `/me`.
9. Pending/Inactive/deleted-profile accounts cannot operate; expired sessions return to login. Phone/description changes must leave all verified/Admin-controlled fields untouched.

## Files created

Backend:
- `backend/LegalService.API/Controllers/LawyerMeController.cs`
- `backend/LegalService.API/DTOs/LawyerMobile/LawyerMobileDtos.cs`
- `backend/LegalService.API/Infrastructure/LawyerAccessFilter.cs`
- `backend/LegalService.API/Migrations/20261004165105_AddLawyerInitialPasswordChange.cs`
- `backend/LegalService.API/Migrations/20261004165105_AddLawyerInitialPasswordChange.Designer.cs`
- `backend/LegalService.Tests/LawyerMobileHttpTests.cs`

Mobile:
- `mobile/lib/auth/session_router.dart`
- `mobile/lib/lawyer/models.dart`
- `mobile/lib/lawyer/lawyer_api.dart`
- `mobile/lib/lawyer/widgets.dart`
- `mobile/lib/lawyer/lawyer_navigation_screen.dart`
- `mobile/lib/lawyer/dashboard/lawyer_dashboard_screen.dart`
- `mobile/lib/lawyer/appointments/appointment_card.dart`
- `mobile/lib/lawyer/appointments/lawyer_appointments_screen.dart`
- `mobile/lib/lawyer/appointments/lawyer_appointment_detail_screen.dart`
- `mobile/lib/lawyer/schedule/lawyer_schedule_screen.dart`
- `mobile/lib/lawyer/schedule/schedule_editor.dart`
- `mobile/lib/lawyer/schedule/unavailability_editor.dart`
- `mobile/lib/lawyer/profile/lawyer_profile_screen.dart`
- `mobile/lib/lawyer/profile/change_password_screen.dart`
- `mobile/test/lawyer_mobile_test.dart`

Web and documentation:
- `frontend/src/pages/lawyer/LawyerPasswordPage.tsx`
- `frontend/tests/lawyer-password.spec.ts`
- `docs/lawyer-mobile-dashboard.md`

## Files modified

- `backend/LegalService.API/Controllers/AuthController.cs`: status checks, password-change endpoint, login flag.
- `backend/LegalService.API/Controllers/LawyersController.cs`: initial password flag for admin-created accounts.
- `backend/LegalService.API/Controllers/AppointmentsController.cs`: authentication for legacy appointment records/actions.
- `backend/LegalService.API/Models/Entities/User.cs`: MustChangePassword.
- `backend/LegalService.API/Data/DemoLawyerSeeder.cs`: initial password flag for new synthetic lawyer accounts.
- `backend/LegalService.API/Program.cs`: global lawyer access filter and controlled exception handling for the new API paths.
- `backend/LegalService.API/Migrations/ApplicationDbContextModelSnapshot.cs`: new User field, preserving the pre-existing front-desk model changes.
- `mobile/lib/auth/auth_service.dart`: supported roles, session expiry callback and persisted password-setup flag.
- `mobile/lib/auth/user_model.dart`: password-setup flag.
- `mobile/lib/auth/login_screen.dart`: role-gated post-login navigation and controlled login errors.
- `mobile/lib/main.dart`: common session router on launch and `/home`.
- `mobile/lib/services/api_client.dart`: PUT/DELETE, injectable HTTP client for tests, session expiry handling, ProblemDetails/conflict decoding, optional no-retry POST mutations.
- `frontend/src/api/authApi.ts`: password-setup flag in session/login types.
- `frontend/src/routes/ProtectedRoutes.tsx`: web initial password gate.
- `frontend/src/App.tsx`: web password setup route.
- `frontend/src/components/layout/LawyerLayout.tsx`: correct logout destination `/login`.

Existing uncommitted work present before this task was retained. No commit, publication or deployment was performed.
