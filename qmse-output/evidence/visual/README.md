# Genuine visual evidence

Packaged on 2026-10-08T04:15:25.494541+00:00.

Section 6 contains 13 figures captured by real Playwright/Chromium. Native HTML reports and unchanged raw logs/JSON were opened in a browser and captured. Raw-log views use browser font/wrapping for readability: they are artifact views, not simulated terminal windows. The React image is a focused view of the preserved real Playwright screenshot, with mocked API responses. GitHub evidence is an actual public historical Actions page.

Capture timestamps and local-source hashes are in capture-manifest.json. Execution dates below come from original execution metadata; capture dates are not new test dates. Complete source logs, TRX, XML, JSON/JSONL, scan reports and HTML reports remain in the package.

| Figure | Description | Execution UTC | Screenshot | Source |
|---|---|---|---|---|
| 6.1 | xUnit execution totals | 2026-10-08 02:56:37 UTC | evidence/visual/01-xunit-result.png | test-results/backend-final.log; evidence/backend/backend-final.trx |
| 6.2 | DEF-12: spoofed PDF rejection fails | 2026-10-08 02:56:37 UTC | evidence/visual/02-spoofed-pdf-failure.png | test-results/backend-final.log; evidence/backend/backend-final.trx |
| 6.3 | React project: Node test output | 2026-10-08 02:42:14 UTC | evidence/visual/03-node-result.png | test-results/frontend-node.log; test-results/frontend-node.json |
| 6.4 | Flutter machine runner: successful completion | 2026-10-08 03:15:24 UTC | evidence/visual/04-flutter-result.png | test-results/mobile-minimal.log; evidence/mobile/flutter-events.jsonl |
| 6.5 | Playwright HTML execution report | 2026-10-08 02:42:40 UTC | evidence/visual/05-playwright-report.png | evidence/e2e/playwright-report/index.html; evidence/e2e/playwright.json |
| 6.6 | Actual React schedule editor under Playwright | 2026-10-08 02:42:40 UTC (suite start) | evidence/visual/06-react-schedule.png | evidence/e2e/schedule-1280.png; evidence/e2e/playwright.json |
| 6.7 | OWASP ZAP passive scan summary | 2026-10-08 02:54:12 UTC | evidence/visual/07-zap-summary.png | evidence/security/zap-passive-report.html; evidence/security/scan-metadata.json |
| 6.8 | ZAP alert instances and missing-header detail | 2026-10-08 02:54:12 UTC | evidence/visual/08-zap-alert-details.png | evidence/security/zap-passive-report.html; evidence/security/zap-alerts.json |
| 6.9 | k6 controlled local execution completes | 2026-10-08 02:52:15 UTC | evidence/visual/09-k6-execution.png | test-results/performance-final.log; test-results/performance-final.json |
| 6.10 | k6 original machine metrics | 2026-10-08 02:52:15 UTC | evidence/visual/10-k6-metrics.png | evidence/performance/k6-summary.json; evidence/performance/k6-raw-final.json |
| 6.11 | Coverlet results displayed by ReportGenerator | 2026-10-08 02:56:37 UTC (test run) | evidence/visual/11-coverage.png | evidence/backend/coverage-html/index.html; evidence/backend/e95ff97b-fff2-40aa-993d-8317a0ac8565/coverage.cobertura.xml |
| 6.12 | pytest deterministic and mocked AI suite | 2026-10-08 02:47:35 UTC | evidence/visual/12-ai-tests.png | test-results/ai-final.log; evidence/ai/pytest-final.xml |
| 6.13 | GitHub Actions: historical Mobile CI success | 2026-10-05 23:48:54 UTC (run created) | evidence/visual/13-github-mobile-ci.png | https://github.com/Jeyamdev/legalease-ai/actions/runs/37390618065; evidence/ci/github-actions-runs.json |

## Results and limits

No new application test execution, defect fix, business-logic change or coverage increase occurred during this visual enhancement. Original counts and statuses remain unchanged. DEF-12 spoofed PDF acceptance remains OPEN; Figure 6.2 shows the actual failing assertion, and no successful remediation retest exists. No successful full Flutter → ASP.NET → PostgreSQL → AI → React workflow or live Gemini Golden Case execution is available, so no such application-step screenshots were added.

k6 used the retained EF InMemory/mock-AI fixture, not PostgreSQL or live Gemini. ZAP was a limited passive loopback scan; zero High/Medium alerts do not establish security. The CI page shows a historical successful Mobile CI run for base commit 8a9b8a2, not verification of uncommitted test additions.

ReportGenerator 5.5.11 generated a genuine coverage HTML report from unchanged Coverlet XML. Line coverage is 23%. Coverlet root branch coverage is 48.91% (1326/2711); ReportGenerator aggregates 48.7% (1293/2655). Both reports and the generation log are retained, and Figure 6.11 explains the discrepancy.

The existing cover, student identities, headings, report tables, test statuses and conclusions are preserved. Previous final DOCX/PDF copies are under final-report/previous/. The updated PDF has 51 pages; all rendered pages were visually inspected. Machine checks are in audit/visual-quality-check.json.
