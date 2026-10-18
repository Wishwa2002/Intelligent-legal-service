# Completion defect verification

Historical DEF-01–15 details remain in qmse-output/audit/defect-verification.md and the preserved pre-completion report. Commit presence is not successful retesting.

| Defect | Finding / action | Actual evidence / final status |
|---|---|---|
| DEF-02 | Fresh schema/link tests pass; original historical reproduction not rerun | Final TRX related linkage checks; historical retest remains UNVERIFIED |
| DEF-07 | Unsubstantiated login 180 ms near 200 ms is an observation | No matching login latency run; not a proven breach |
| DEF-08 | Existing scheduling/concurrency tests pass; exact two-timezone drift not reproduced | Final TRX; historical retest UNVERIFIED |
| DEF-09 | Current Customer/Lawyer/Clerk career writes denied | Final TRX + real-api-http.json; current RBAC PASS, original pre-fix occurrence unverified |
| DEF-11 | Actual local IPv4 React login/API workflow succeeds | Actual E2E; historical IPv6 regression not reproduced |
| DEF-12 | Original spoof assertion fails before; actual byte-limit/MIME/signature/PDF-parser validation added | spoof-before.trx, upload-retest.trx 18/18 PASS, final TRX, HTTP spoof 400, real Flutter valid PDF upload 201. FIXED AND RETESTED |
| DEF-13 | Seeder unit test is idempotent at 12; actual workflow catalogue available | Final TRX + actual API/UI; original absent-seed incident remains unverified |
| DEF-15 | JWT validation/RBAC/input probes pass narrowly | Final TRX/ZAP; broad historical remediation not fully proven |
| DEF-16 (new) | Fresh migrated appointment table omitted ConsultationType/Description/LegalServiceCategory; API GET 500 | Additive migration applied only local DB; migration regression + k6 before/after. FIXED AND RETESTED |
| DEF-17 (new) | Flutter web sample upload uses unsupported Directory.systemTemp | Direct bundled byte multipart; preserved before image/log, real upload PASS + 49 unit/widgets. FIXED AND RETESTED |
| DEF-18 (new) | React compares ClerkId to user ID, hiding real assigned queue | Correct clerkId contract, 2 browser regressions + real human completion. FIXED AND RETESTED |
| ZAP header finding | Missing X-Content-Type-Options verified on real response headers | 9 Low instances, OPEN; no false positive or zero-vulnerability assertion |

Content validation is not antivirus, sanitization or full image decoding. Original failed runs, fixture-setup duplicate-PK failure, and corrected fixture successful retests are all preserved. Query/headroom/cancellation expectations remain unresolved and business rules were not changed. Real PostgreSQL caller/per-attachment rollback succeeds; an atomic multi-file HTTP operation is not established.

