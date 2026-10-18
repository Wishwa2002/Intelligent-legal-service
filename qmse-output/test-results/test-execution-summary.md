# Final technical execution summary

Source commit: f360e4ac21f149ae5b90a125c57bf928982a9c53 on local docs/se3110-qmse-testing. No push, deployment or submission. All fresh executions occurred on 2026-10-08 UTC; exact start/end/exit metadata are retained in test-results/completion-20261008-*.json. Available SE3090 Version 3.0 reference was read before business-rule decisions; approval remains unconfirmed.

| Suite | Total | Passed | Failed | Skipped | Evidence |
|---|---:|---:|---:|---:|---|
| xUnit | 328 | 326 | 0 | 2 | completion-20261008/evidence/backend-final-verified.trx |
| React/Node | 19 | 19 | 0 | 0 | test-results/completion-20261008-node.log |
| Flutter unit/widget | 49 | 49 | 0 | 0 | test-results/completion-20261008-mobile.log |
| Playwright | 114 | 111 | 0 | 3 | completion-20261008/evidence/playwright-final.json |
| Python deterministic/mocked | 102 | 102 | 0 | 0 | completion-20261008/evidence/ai-completion.xml |

These are independent runner cases, not unique business requirements. Final report originals: 77 designed cases, 23 scoped VERIFIED, 3 FAILED expectation conflicts, 2 BLOCKED, 49 HISTORICAL/UNVERIFIED. Original expected outcomes were preserved. All 57 previously historical cases were reviewed; eight now have matching scoped evidence. The three conflicts are not proven application defects: query length, workforce headroom, cancellation cutoff. Fresh current-contract tests pass but do not approve the old rules.

The final xUnit runner wall time was 25.949 s, displayed test duration 22 s; exit 0. The two skips are live recommendation transport and scanner/evidence-host harness. Playwright: 15 spec files, 53.758 s tool duration; three live fixture skips. Most browser regressions intercept API traffic. Node helpers are not a React Testing Library suite. Flutter: six files; 6.648 s runner wall. Python: displayed 1.92 s; nine warnings; four added deterministic Golden Case subcriteria. Upload focused retest: 18/18 passing.

## Real integrated workflow — PASS

Actual Flutter web, ASP.NET Core Staging API, isolated PostgreSQL 18, actual FastAPI and React were used; no application API response interception. Request 12 (Affidavit & Notary) was created in Flutter; a genuine bundled NIC PDF was uploaded through Flutter multipart; two genuine sample PDFs were uploaded through the API. FastAPI retrieved actual backend clerk/workload state, ranked clerk CLK-001, and explicit admin approval assigned ClerkId 1. React clerk review changed status to COMPLETED; Flutter read and displayed the same result. SQL confirms three stored binary attachments, 7,667 bytes. Completion timestamp 2026-10-08T05:02:00.518Z.

Evidence: completion-20261008/evidence/integrated-{http,final-http,completion-http}.json, integrated-result.json, integrated-final-database.log, actual e2e-*.png screenshots. Creation/upload/review scripts and local-service setup logs are retained. Actual deterministic AI ranking uses defaults for unspecified skills/experience. Gemini was not part of this workflow; native mobile devices and historical Deed/checklist/Approved statuses are separate, unverified acceptance scenarios.

## Coverage

Raw Coverlet root: 81.11% lines (20654/25463), 49.76% branches (1375/2763). Migration/designer execution dominates the raw increase. Distinct filename+line pairs excluding Migrations/: before 57.45%, after 57.82% (4136/7153). Content validator class is 97.05% lines, 90% branches in raw XML. Coverage is not correctness or an invented target.

## Security, performance and live AI

ZAP 2.17.0: 15 deliberate loopback requests; passive plus finite manual auth/injection probes; 9 Low missing nosniff instances, 1 Informational authentication identification. Header finding remains open. Earlier HTTP 500 alert is absent after schema repair; no full vulnerability guarantee or verified false positives claimed. Original native HTML/XML/JSON retained.

k6 2.3.0 actual PostgreSQL/API retest: 2 VUs, 15 s, 120 HTTP requests, error rate 0, throughput 7.803/s. Search p50/p95/avg 3.487/5.679/3.724 ms; details 2.134/3.528/2.277; appointments GET 1.500/3.585/1.694; documentation GET 15.475/20.966/15.831. Tiny synthetic read workload; not hosted/booking throughput acceptance. First failing run and raw JSON samples preserved.

One live Gemini call of authorised maximum eight; retries disabled; synthetic prompt; provider ServerError 504 after 29.326 s. No output/token usage/verified tariff, estimated cost unavailable. Stop on failure; no further live calls. GC-01–04 full live acceptance and successful-response latency remain BLOCKED. GC-03 checklist subcases and GC-04 sanitizer isolation are deterministic checks only.

## CI

Local source commit is unpushed. Read-only GitHub API check found zero workflow runs for that SHA; remote CI UNVERIFIED. Historical run screenshot and metadata remain dated evidence for the old commit only. Backend CI currently lacks dedicated PostgreSQL service setup, so relational tests may skip there until configured appropriately.


Executed replay scripts additionally committed at 05359214df52fa743b234e1d77e6671f57c14dea; application/test fixes remain f360e4ac21f149ae5b90a125c57bf928982a9c53. Read-only CI query for final script commit also returned zero runs. No push.

Frontend compile/build verification: `npm run build` (TypeScript tsc -b and Vite) executed on 2026-10-08T05:48:33.772639Z; exit 0, 3.553 s. Existing bundle-size warning retained. Native log/metadata: test-results/completion-20261008-frontend-build.log/.json. This build adds no test cases to the suite totals.
