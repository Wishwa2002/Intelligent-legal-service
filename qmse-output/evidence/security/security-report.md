# Security testing report

Scope: isolated actual ASP.NET controller/service fixture, EF InMemory, synthetic accounts, mocked AI transport. No production/staging database, public deployment, active scan or crawler was used.

OWASP ZAP 2.17.0 passive scan: six controlled requests to http://127.0.0.1:52815/, 2026-10-08 02:54:12–02:54:14 UTC (08:24:12–08:24:14 Asia/Colombo). Queue was empty at export. See scan-metadata.json, zap-alerts.json, zap-passive-report.html and zap-passive-report.xml.

| Finding | Severity | Verification | Interpretation |
|---|---|---|---|
| X-Content-Type-Options header missing, 3 URL alerts | Low | Response headers captured in scan metadata omit the header | Verified in this minimal fixture; normal Program.cs startup/header policy not scanned. Do not extrapolate to deployed configuration. |
| Authentication request identified, 1 URL alert | Informational | Login request includes a synthetic password and returns 401 | Discovery information, not a vulnerability. |
| Spoofed PDF accepted (manual automated service probe, outside ZAP findings) | Potential Medium, pending threat-model confirmation | Qmse_DEF12_SpoofedPdfMustBeRejected fails: inert MZ bytes with .pdf/application/pdf accepted | Current service validates extension/MIME/size, not signature. No proof of execution or exploit chain; report's rejection/fixed assertion contradicted. |

Fresh xUnit HTTP checks reject missing, malformed, expired and signature-tampered JWTs (401). Existing role tests reject Customer/Lawyer/Clerk staff mutations (403). New tests verify Customer cannot mark documentation completed or approve a lawyer workflow. Duplicate signup is rejected on isolated PostgreSQL. Error-body checks suppress test signing key and stack traces. Synthetic wrong-password/unknown-user login returns 401 in the passive traffic.

10 MiB upload succeeds and 10 MiB + 1 byte fails at service scope. Spoofed-upload rejection fails. SQL-like search input is treated as data and returns an empty result in the InMemory fixture; actual SQL execution was not involved, so comprehensive relational injection resistance is BLOCKED/unverified. Existing scoped lawyer detail tests hide customer email/ID, but no comprehensive sensitive-data audit was completed.

False-positive triage: Authentication Request Identified is informational rather than an exploitable issue. Missing-header alerts are real for the fixture; production applicability remains unknown. No finding is silently suppressed. Four alert instances correspond to two alert types, not four distinct vulnerabilities. The passive scan's absence of High alerts does not establish zero vulnerabilities or complete OWASP API coverage.
