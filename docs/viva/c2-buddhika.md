# Buddhika P. Y. H: C2 viva card

Scope: appointments, availability, recurring scheduling, cancellation, careers and scheduling AI integration.

## Run and explain

```sh
python3 scripts/viva-check.py --member c2
```

Open `backend/LegalService.Tests/QmseAppointmentTests.cs`. The fixture has a fixed synthetic time, lawyer schedule, slot and appointment data. A fixed clock makes boundaries repeatable rather than dependent on today's date.

- Normal: `Qmse_TC_C2_12_DirectBookingWorksWithoutAiDependency` creates one appointment with status `Requested`, with no AI service registered.
- Invalid: `Qmse_TC_C2_11_BookingOutsideWorkingHoursRejected` supplies 08:00 and 20:00; assert 409 AND no appointment row.
- Boundary: `Qmse_TC_C2_09_CancellationOnBothSidesOf24Hours` tests 1439, 1440 and 1441 minutes. Current default behavior permits cancellation at all three values and releases the slot. This records existing behavior; it does not claim enforcement of the historical 24-hour requirement.
- Optional policy: `RequirementsDecisionTests.ProposedCancellationNoticeAndUiCapabilityAgree` tests the explicitly enabled proposal separately. It remains disabled by default.

Use the full runner for PostgreSQL slot/concurrency checks and Playwright derived-booking/rescheduling UI tests. Those UI tests use HTTP fixtures. PostgreSQL uniqueness evidence is stronger than a service mock for proving one booking survives a race.

## Practice questions

- Why `[Theory]` instead of three copied tests? The same assertion checks a set of meaningful boundary inputs with separate reported cases.
- Why not use `DateTime.Now`? It makes timezone and threshold assertions unstable. The fixture uses a controlled clock and explicit Asia/Colombo conversion.
- Why `Requested`, not immediately `Confirmed`? That is the implemented approval workflow; the historical expectation differs and is retained as a requirement issue.
- Why is cancelling a slot more than a status update? The slot must become available and history/persistence must remain consistent.
- Why does direct booking matter? Core booking should work independently of the AI provider.
- Can a passing proposal test close an old failure? No. A disabled proposal is not active application behavior.
- What defect/retest can you explain? The original cancellation route mismatch (PUT versus implemented POST), slot-release verification and the Flutter `canCancel` capability agreement. State who actually made and verified each change.

## Modification exercise

Change an outside-hours test input from 08:00 to a valid 10:00 interval. Predict why `Assert.ThrowsAsync` no longer succeeds. Run, explain, restore and rerun. Alternatively explain the allowed/not-allowed result at 1439 versus 1440 minutes when the optional rule is explicitly enabled.

## Evidence and ownership

Open fresh `c2.trx` plus the full-run relational backend TRX. Show actual Git history for `AppointmentService.cs`, `QmseAppointmentTests.cs` and your original appointment tests. Historical C2 9/2/1 remains a distinct case population. Personally run and explain the tests before claiming readiness.
