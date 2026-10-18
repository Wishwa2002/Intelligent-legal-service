# SE3110 group viva rehearsal

Prepared 18 October 2026 against the supplied assignment and the current local project. This is a rehearsal supplement; the submitted report, original failures and historical evidence remain unchanged. New fixes and this guide are Codex-assisted. Each student must personally verify, explain and demonstrate their work. A successful agent-run test is not proof of personal contribution.

## Start here

Run from the repository root (the folder containing `LegalService.sln`):

```sh
python3 scripts/viva-check.py --prepare
python3 scripts/viva-check.py --member c1
python3 scripts/viva-check.py --member c2
python3 scripts/viva-check.py --member c3
python3 scripts/viva-check.py --member c4
```

`--prepare` refreshes .NET package paths and Flutter SDK paths after moving the folder. .NET restore may need internet; Flutter uses its local package cache. React needs its installed `frontend/node_modules`, Python needs `ai-service/.venv`, and browser tests need Playwright Chromium. If Chromium is missing, run `npx playwright install chromium` in `frontend`. Python 3, .NET 8, Flutter compatible with Dart >=3.12.2, Node compatible with the installed Vite, and PostgreSQL tools on PATH are prerequisites. Do not upgrade dependencies on viva day.

For the group rehearsal:

```sh
python3 scripts/viva-check.py --full
```

This starts a new disposable localhost PostgreSQL cluster, runs the relational backend regression, runs each member's focused tests, deterministic Python tests, React build, Node checks, Playwright browser tests and Flutter tests, then stops/removes its cluster. Existing application databases and private `.env` files are not changed. Live AI calls are disabled. Read `results.json`, the TRX/XML and logs under the timestamped `qmse-output/viva/` directory. A nonzero exit means investigate that step; do not use an earlier screenshot as proof of a new run. The three fixed-environment historical database cases are explicitly excluded: they require the old port/database/date fixture. Their exclusion does not resolve their historical acceptance status.

Individual commands use isolated in-memory HTTP/service fixtures and need no running application, PostgreSQL or Gemini. Full checks add real PostgreSQL tests. React tests mostly intercept HTTP responses; Flutter tests use unit/widget fixtures. These are different levels of evidence.

## Individual preparation

| Member | Guide | Main live tool demo |
|---|---|---|
| Jeyashankar J, IT24103900 | [C1](c1-jeyashankar.md) | xUnit: lawyer management, duplicate license, access control |
| Buddhika P. Y. H, IT24103041 | [C2](c2-buddhika.md) | xUnit: direct booking, invalid hours, cancellation boundaries |
| Vithusan V, IT24100360 | [C3](c3-vithusan.md) | xUnit: genuine files, spoof rejection, MIME validation |
| Wijayananda W. J. W, IT24102275 | [C4](c4-wijayananda.md) | xUnit: JWT rejection, BCrypt fix/retest, response security headers |

For every member, rehearse: explain the risk; open the source; identify Arrange/Act/Assert; run the test; read the native result; explain one limitation; modify an input or assertion and predict the result; restore it and rerun. Allow about 6-8 minutes per member as a practice schedule, not an official viva duration.

## Match the assignment's marking scheme

| Requirement | Evidence to open and explain |
|---|---|
| Group strategy and coverage, 10 marks | Report test plan/risk matrix; why API, PostgreSQL, React, Flutter and AI need different test levels |
| Group integration and non-functional demonstration, 15 marks | `FrontDeskMatchingPostgresTests.AdditiveMigrationPreservesOldRecordsAndNormalAppointmentLifecycle`; real relational booking/cancellation and migration preservation. Explain that AI classification is a fixture. Also show the original document cross-platform workflow evidence. |
| Group results, defects and documents, 15 marks | Submitted report, original 77-case ledger, defect evidence and fresh rehearsal logs; explain differing populations/dates |
| Individual tool demonstration, 15 marks | Personally run the member command; explain xUnit attributes, filter, fixtures and TRX |
| Individual implementation/execution, 15 marks | Show normal, invalid, edge/failure scenarios in that member's guide |
| Individual result/defect/retest, 10 marks | Show an original failure where available and the corresponding corrected behavior; do not manufacture a personal historical defect |
| Individual contribution, 5 marks | Relevant real Git commits plus personally verified test changes and honest AI disclosure |
| Individual understanding, 15 marks | Explain assertions, change a case, predict failure, diagnose it and restore |

Performance AND security testing are required. Existing k6 performance and ZAP scan evidence is in `qmse-output/evidence/performance/`, `qmse-output/completion-20261008/evidence/`, and `qmse-output/final-audit/security/`. Read the actual threshold results and scope, including failures; these are historical runs, not new performance/security certification. Security headers, authorization, token rejection and file spoof checks are rerun by this rehearsal, but are not a replacement for the ZAP scan. The group must rehearse the documented scanner/load setup on its owned local fixture if a fresh load/scan demonstration is requested. Never aim load tests at a shared deployed service.

## Changes made for this rehearsal

- Rebuilt generated .NET restore paths and Flutter package configuration after the project moved; these generated files are machine-specific.
- Password hashing now explicitly uses BCrypt cost 12, satisfying the historical `TC-BK-01` assertion. Existing cost-11 hashes remain verifiable. Cost 12 requires more CPU; the rehearsal does not establish production login throughput.
- Updated password regressions check cost 12, random salts, correct/incorrect password verification and old cost-11 account compatibility. The old failure log remains preserved.
- Removed a blocking async assertion and used an unused isolation assertion in the policy tests.
- Default Playwright runs now separate three archived private-fixture replay files. Their named configs and source remain available. Ordinary UI tests and length boundaries run by default; live scheduling tests still require explicit setup.
- Added the portable rehearsal runner and these member guides.
- Routed active browser-demo screenshots to each new test output directory to preserve historical report images.

## Questions the whole group must answer honestly

1. Why do passing native suites coexist with failed report cases? They assert different scopes/fixtures. The historical ledger is not the same population as all framework tests. Do not add overlapping runs together.
2. Is live AI ready? Not established. The last recorded real provider attempts returned 503. Deterministic tests demonstrate guardrails, validation and safe failure, not successful model accuracy or complete live workflows.
3. Is every original requirement fixed? No. Cancellation notice, booking status, price/query rules, workforce policy and document workflow mappings include unresolved requirement differences. Existing optional proposals remain disabled. Explain current behavior and the original expectation separately.
4. Does a cost-12 fix change the old report count? No automatic change. It is new dated retest evidence for one case; reconciling a full acceptance ledger requires a new case-by-case audit.
5. Is all code quality clean? Check [readiness](readiness.md). A successful build does not imply a clean linter, complete security acceptance or live AI availability.
6. Who authored the tests? Show actual Git history and state AI assistance. This session cannot certify any student's independent authorship or understanding.

## Before the viva

- Each member personally runs their command and locates their native TRX result.
- Each member explains one passing and one invalid/boundary/failure case without reading this guide verbatim.
- Each member completes the input/assertion modification exercise and restores the source.
- Each member locates their real development/testing commits and records what they personally checked.
- The group opens the integrated, k6 and ZAP evidence and explains the results and limitations.
- Prepare the laptop, charger, installed SDKs and cached dependencies; keep the report and evidence available offline.
- If showing application screens, start the actual local system beforehand and rehearse with synthetic accounts; focused test success alone does not verify that interactive application setup.

Personal rehearsal record (leave blank until actually performed):

| Member | Run directory and date | Test explained/modified | Own contribution checked | Ready signature |
|---|---|---|---|---|
| Jeyashankar | | | | |
| Buddhika | | | | |
| Vithusan | | | | |
| Wijayananda | | | | |
