# Viva readiness: 18 October 2026

**All four members have working, individually runnable testing demonstrations on this laptop.** This establishes executable material, not personal understanding, full live AI readiness or complete acceptance of every original expectation.

## Fresh execution

Evidence: `qmse-output/viva/20261018T014708897442Z/results.json` and its native reports/logs. Command: `python3 scripts/viva-check.py --full`. The disposable PostgreSQL cluster was successfully stopped and removed.

| Check | Actual result | Scope |
|---|---|---|
| Backend xUnit | 364 passed, 0 failed, 2 skipped | Real HTTP fixtures, unit/service tests and real disposable PostgreSQL migrations, persistence, rollback and concurrency |
| C1 focused | 68 passed | Lawyer management HTTP fixture, including shared partial-class cases |
| C2 focused | 6 passed | Direct booking, invalid hours, cancellation boundaries |
| C3 focused | 12 passed | Genuine/spoofed uploads, MIME validation |
| C4 focused | 11 passed | JWT variants, password compatibility, security headers |
| Python pytest | 114 passed | Deterministic/mocked AI logic; no live generation |
| React production build | Passed | TypeScript and Vite; bundle-size warning remains |
| Node checks | 19 passed | Routing/helpers |
| Playwright | 119 passed, 3 skipped | Real Chromium UI, mainly intercepted API fixtures |
| Flutter | 60 passed | Unit/widget fixtures, not native-device acceptance |

Focused cases overlap the full backend run. Do not add overlapping runs into a new unique-case total.

Backend skips: live AI transport and the opt-in scanner/evidence host. Browser skips: three live scheduling API scenarios. Three additional historical cases are excluded by name: two `HistoricalPostgresSetupTests` and one `HistoricalSlotConstraintTests`. They require the old fixed-port, seeded database and original dated slot. Portable real PostgreSQL tests run, but do not retroactively close those old cases.

## Resolved issues

| Issue | Cause/change | Retest |
|---|---|---|
| Backend could not build after folder move | Generated NuGet paths referenced the old directory; restored against the existing cache. `--prepare` refreshes paths. | Fresh backend build and 364 passing tests |
| Flutter tests could not compile | Package config referenced a removed temporary SDK; regenerated using `flutter pub get --offline`. | 60 passing tests |
| Password test failed | Implicit BCrypt default emitted cost 11. New hashes explicitly use cost 12; old cost-11 hashes still verify. | Preserved baseline failure at `qmse-output/viva/baseline-before-fixes/backend/backend.trx`; original `TC_BK_01` and compatibility regressions pass in fresh backend TRX |
| Default browser run mixed environments | Three archived replay files require a private historical fixture; separated from the default suite, still available through their named configs. | 119 passing UI cases; historical source/results retained |
| Test blocked on async completion | Replaced `.GetAwaiter().GetResult()` with awaited assertion; used the missing isolation assertion. | Backend compilation and regression pass |
| Browser screenshots overwrote historical images | Two active specs now use per-test output paths; previous tracked images restored and fresh images saved separately. | Four focused browser cases rerun under `screenshot-retest/` |

Local changes only: no commit, push, deployment or report substitution. Existing unrelated source changes were preserved. Fixes/tests/guides are Codex-assisted.

## Remaining limits

- **Live AI:** Last recorded provider attempts returned 503. No paid/provider request was made in this rehearsal. Live accuracy, scheduling, OCR acceptance and consultation completion remain unproven.
- **Requirement differences:** Cancellation/booking-state, fee/query, workforce and document mappings still differ from some historical expectations. Optional proposals remain disabled. The SE3110 assignment specifies testing requirements, not authoritative business-policy values.
- **Historical ledger:** The supplied report still records 49 PASS / 16 FAIL / 12 BLOCKED. The new password retest is additional dated evidence; the 77 cases were not fully re-audited/reissued today.
- **Frontend lint:** `npm run lint` reports 96 errors and 2 warnings across existing app pages and archived replay tests, mainly explicit `any`, React hook/component rules, unused expressions/escapes and refresh exports. Build and exercised UI paths pass; there is no clean-lint claim. Rules were not disabled to hide the findings.
- **Flutter analysis:** Nine informational `avoid_print` findings remain in historical test diagnostics; no application compilation/analyzer errors. Analysis exits nonzero for these findings.
- **Dependencies:** NuGet used cached packages; current advisory retrieval was unavailable. This is not a fresh vulnerability audit. TLS verification remained enabled.
- **Non-functional evidence:** Existing k6/ZAP runs are historical. Fresh auth, validation and header tests do not replace load testing or scanning, prove production throughput or establish absence of vulnerabilities.
- **Cross-platform workflow:** The report preserves an actual Flutter/API/FastAPI/PostgreSQL/React document workflow. This session reran separate UI/widget and PostgreSQL integration tests; it did not freshly repeat that full cross-platform workflow.
- **Personal readiness:** Every member must still run, explain and modify a test, identify their actual contribution and disclose AI assistance. The rehearsal record remains blank until each person completes it.

## Demo order

1. Run each member's command and open their native TRX.
2. Explain normal/invalid/boundary cases using the individual card.
3. Show the preserved cost-11 failure, explicit cost-12 fix and passing retest; explain old-account compatibility and added CPU work.
4. Open the real PostgreSQL `FrontDeskMatchingPostgresTests` result: migration preservation, persisted review, appointment creation and cancellation. AI output is synthetic.
5. Show the original cross-platform workflow, k6 and ZAP reports with their dates, thresholds, results and limitations.
