# Test execution summary

Base commit: 8a9b8a24f5a567460f90e60b3b6675ed02230062. All timestamps below are actual execution timestamps, stored in UTC. Display date in report: 8 October 2026, Asia/Colombo.

| Suite | Total | Passed | Failed | Skipped | Exit | Start UTC | Wall seconds |
|---|---:|---:|---:|---:|---:|---|---:|
| backend | 313 | 310 | 1 | 2 | 1 | 2026-10-08T02:56:37.658493+00:00 | 21.636 |
| frontend_node | 19 | 19 | 0 | 0 | 0 | 2026-10-08T02:42:14.472866+00:00 | 1.17 |
| playwright | 112 | 109 | 0 | 3 | 0 | 2026-10-08T02:42:40.784892+00:00 | 68.806 |
| ai | 98 | 98 | 0 | 0 | 0 | 2026-10-08T02:47:35.905055+00:00 | 2.458 |
| mobile | 49 | 49 | 0 | 0 | 0 | 2026-10-08T03:15:24.493780+00:00 | 145.928 |

Flutter: 49 unit/widget tests passed across 6 files; actual test event duration 9.115 seconds, runner wall time includes SDK/lock setup. Official source/resource recovery and matching cached artifacts enabled execution. Earlier failed/timeout setup attempts are retained; no physical-device or complete API workflow result is inferred.

Backend total includes one skipped evidence-host harness plus one skipped live AI transport case. Functional denominator excludes the host harness. Counts across tools are not report-case totals and are not unique business requirements.
Backend aggregate Coverlet line coverage: 23.00%; branch coverage: 48.91%. This includes the referenced API assembly, unexecuted startup and other code; it is not individual ownership coverage.

The final one xUnit failure reproduces spoofed PDF acceptance. Initial Python run: 86 passed/2 failed due provider initialization without a key. Final synthetic-initialization run: 98 deterministic/mocked cases passed; original failures remain in ai.log and pytest.xml. Initial sandbox failures were test-runner/server socket blockers, not successful executions.

Mapped original report cases: 77 designed; 14 VERIFIED, 4 FAILED (3 requirement conflicts + spoofed upload), 2 BLOCKED, 57 HISTORICAL/UNVERIFIED. Detailed record: case-verification.json. No historical timing or GC accuracy is promoted to a fresh measurement.

Security: passive ZAP, 4 alert instances (3 Low missing-header alerts; 1 Informational authentication-discovery alert). Performance: local InMemory/mock benchmark only. Integrated mobile-to-clerk workflow, live Golden Cases and live-AI latency remain BLOCKED.
