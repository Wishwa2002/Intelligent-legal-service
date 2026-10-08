# Existing-lawyer schedule backfill — verified 4 October 2026

Schedule saving now works against the Development API and through the actual lawyer-edit screen. The stale backend on port 5295 was restarted with the updated build; the frontend already uses that port.

Follow-up: the plain backend restart omitted the private AI configuration supplied by the project's launcher. The backend, recommendation service and frontend were subsequently restored through that launcher; see [recommendation-runtime-recovery.md](recommendation-runtime-recovery.md). Use the launcher for normal local startup.

## Findings

- `LawyerWorkingSchedule` already supports one row per weekday, with a unique `(LawyerId, DayOfWeek)` index. `Lawyer.DefaultAppointmentDurationMinutes` already defaults to 30, with a 15–240 database constraint.
- The original scheduling migration inferred weekly hours from legacy availability records. It did not provide the requested Mon–Fri fallback for subsequent lawyers without schedule records. General database initialization seeded catalogs/accounts, with no general missing-schedule backfill. Demo scheduling only covered recognized synthetic profiles.
- Missing schedules intentionally produce no bookable slots. Previously, schedule GET returned seven off days without indicating whether anything was saved.
- The frontend used `Promise.all` for schedule and leave loading. Either failure prevented the schedule from being set, leaving the loading text indefinitely. Requests had no timeout, and error handling ignored controlled backend `message` responses.
- The actual running backend on port 5295 had **no working-schedule routes**, confirmed through Swagger. This was a concrete cause of the failed edit requests.
- At migration verification time, Development had **28 lawyers, 196 schedule rows, zero lawyers missing schedules, zero unset durations and zero duplicate weekdays**. No existing schedules were replaced. The missing-record hypothesis was not present in that database snapshot.

## Backfill and migration

Added `20261004095244_BackfillMissingLawyerSchedules`. It locks lawyer rows in deterministic order, sets duration to 30 only for NULL/zero, then inserts seven rows only when a lawyer has **no schedule records at all**:

| Days | Working | Hours |
| --- | --- | --- |
| Monday–Friday | Yes | 09:00–17:00 |
| Saturday–Sunday | No | 09:00–17:00 inactive field defaults |

Existing full, partial, and all-off schedules remain untouched, including their row IDs and audit fields. Valid configured durations remain untouched. The existing unique index plus `ON CONFLICT DO NOTHING` prevents duplicates. Lawyer locks also coordinate with existing schedule/booking mutations. No future appointment slots are persisted by this backfill.

The shared backfill also runs during Development initialization and is available explicitly:

```sh
ASPNETCORE_ENVIRONMENT=Development dotnet run --project backend/LegalService.API -- --backfill-lawyer-schedules
```

The command rejects non-Development environments. The EF migration itself supports deployment in any environment. Its SQL constants should remain immutable after deployment. Migration rollback intentionally does not remove defaults: they may have been edited or used by appointments.

**Development result: 0 lawyers backfilled, 0 durations changed.** Every pre-existing schedule was compared before/after migration and remained unchanged. Two explicit Development backfill runs each reported zero changes. Isolated PostgreSQL tests verified actual missing records receive the requested defaults.

The required EF-generated migration was applied and recorded in `__EFMigrationsHistory`. Both scheduling tables and the lawyer duration column were verified. Plain `dotnet ef database update` encountered unrelated historical drift: `20261003065251_AddMissingCurrentSchemaColumns` is absent from history while `Clerks.UserId` already exists. Following the project's selective migration convention, only the reviewed new EF script was applied with `scripts/verify-schedule-backfill.py --apply`. That older mismatch remains outside this repair; its migration history was not rewritten.

## API and frontend repair

Schedule GET now returns `hasConfiguredSchedule`. If no rows exist, it returns editable Mon–Fri defaults with `hasConfiguredSchedule: false`, without writing anything or treating these unsaved defaults as available hours. Existing partial/all-off schedules keep their configured values. PUT continues to validate seven unique weekdays, upsert rows, save duration and protect existing appointments.

The edit screen loads schedule and leave independently. Read requests and schedule saving have a 10-second timeout; leaving the screen aborts outstanding reads. Each load failure ends loading and exposes a retry. Retrying leave preserves unsaved schedule edits. Missing/empty schedules display an explicit editable default state. Backend `detail`, `message` and `title` responses are shown. Save failures retain entered values. The panel is keyed by lawyer ID to prevent displaying another lawyer's stale form.

The source of truth remains persisted working schedules + unavailability + blocking appointments. Gemini and recommendation ranking were unchanged.

## Verification

| Check | Result |
| --- | --- |
| Backend build | Passed; NU1900 vulnerability-feed access warning |
| Backend suite, including real isolated PostgreSQL | 239 passed, 1 existing opt-in live Gemini test skipped |
| Frontend production build | Passed; existing large-bundle warning |
| Full browser suite with live scheduling and save enabled | 86 passed |
| Frontend route checks | 18 passed |
| Focused ESLint and `git diff --check` | Passed |
| New backfill tests | Missing defaults, NULL/zero duration, configured durations, partial/all-off preservation, repeat runs, post-migration records, edit/save, leave and generated availability |
| New browser regression checks | API errors, timeout recovery, independent leave loading/retry, missing defaults, controlled save errors and real Save Schedule button |

The first full browser run had one test-cleanup failure from an outstanding background summary request. Live-test cleanup was corrected, and the entire final suite passed.

Existing lawyer `f42193d6-906f-441c-9540-ecf0a18e7d45` was verified with schedule GET, an off-day time-field PUT, GET confirming persistence, and PUT/GET restoring its original values. Actual bookable hours and duration were preserved. A separate live browser test clicked Save Schedule, received HTTP 200, displayed success, and confirmed the persisted schedule. Leave GET also succeeded.

Real API examples verified 16 slots on a normal working day, zero on Sunday, zero during full-day leave, 8 during partial leave, 15 on a partially booked day and zero on a fully booked day. Workforce and coverage summary both reported 7,065 remaining slots over the configured 30-day window. AI-service code was untouched; no live Gemini request was made.

Inspect `/admin/lawyer-services/lawyers` → existing lawyer → Edit → Working Schedule / Leave & Unavailability. API routes:

- `GET/PUT /api/lawyers/{lawyerId}/working-schedule` (Admin)
- `GET/POST /api/lawyers/{lawyerId}/unavailability` (Admin)
- `PUT/DELETE /api/lawyers/{lawyerId}/unavailability/{leaveId}` (Admin)
- `GET /api/lawyers/{lawyerId}/available-slots?date=2026-10-07`

## Files

Created: `Data/LawyerScheduleBackfill.cs`; migration and designer; `LegalService.Tests/LawyerScheduleBackfillTests.cs`; `scripts/verify-schedule-backfill.py`; `scripts/verify-existing-lawyer-schedule.py`; `docs/sql/lawyer-schedule-backfill.sql`; this report; migration/save evidence JSON and live-save screenshot under `docs/evidence/recurring-scheduling`.

Modified: API `Program.cs`, scheduling DTOs, `LawyerScheduleService.cs`, EF model snapshot; frontend `schedulingApi.ts`, `LawyerSchedulingPanel.tsx`, `LawyerFormDialog.tsx`, scheduling regression/live tests. Existing recurring-scheduling verification evidence/screenshots were refreshed. No new domain entities or schema columns were needed for this data repair.
