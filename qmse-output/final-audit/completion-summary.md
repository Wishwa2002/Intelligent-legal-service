# Consolidated completion summary

Local debugging, selected historical CI retrieval and one report consolidation completed. No commit, push, deployment, submission, production-data modification or new live Gemini call occurred in this phase. Current baseline HEAD is 05359214df52fa743b234e1d77e6671f57c14dea; 33 AI-assisted changed/additional source files are supplied as a patch plus snapshot. Local overlay SHA-256: 06683e1b675c85a503e8d7a5d36095962711864a0306a96c79d2b781ae44a97d. This is a content label, not a Git commit.

## Case accounting

Original ledger: 35 PASS / 30 FAIL / 12 BLOCKED. Fourteen original failures have executed replacements against the user-accepted current API/UI contract; their original failure observations remain retained. Final ledger: **49 PASS / 16 FAIL / 12 BLOCKED = 77**, zero historical/unreviewed or not executed. No failed case was promoted to BLOCKED. Original failure classifications: confirmed approved-requirement product defects 0; historical expectation mismatches 18; obsolete scenarios 10; established setup defects 0; undetermined 2. These classify the original scenarios, not every newly added regression or implementation finding.

Original blocked cases: TC-E2E-01, TC-E2E-05, TC-E2E-07, TC-C104, TC-C105, TC-C2-05, TC-C3-08, TC-C3-12, TC-C4-04, TC-C4-05, TC-C4-08, TC-C4-12. Fully unblocked 0; newly passed 0; newly failed 0; still blocked 12. Service startup/internal authentication and replacement fixtures resolved prerequisites, not complete live/legal acceptance. Detailed blockers and required approvals are in blocked-case-register.md/json.

## Separate actual regression populations

| Run | PASS | FAIL | SKIPPED |
|---|---:|---:|---:|
| Final backend native TRX | 362 | 1 | 2 |
| Final Flutter native machine log | 60 | 0 | 0 |
| Final deterministic/mocked AI JUnit | 114 | 0 | 0 |
| Node helper suite, unchanged scope | 19 | 0 | 0 |
| Baseline Playwright native JSON | 111 | 0 | 3 |
| Accepted replacement UI | 8 | 0 | 0 |
| Targeted query boundaries, final corrected harness | 8 | 0 | 0 |
| Accepted HTTP/SQL replacements | 8 | 0 | 0 |

These overlap; do not sum them into a unique test total or into the 77-case ledger. The earlier 607 PASS / 5 SKIPPED and additional historical 23-test (12 PASS / 11 FAIL) populations remain separately dated. Backend failure is the original BCrypt cost-12 expectation versus current cost 11, awaiting group confirmation; it was not bypassed. The later TLS assertion passes but does not erase the earlier cold latency failure. Targeted upload/requirement regression: 70 PASS; overlaps backend. Final boundary rerun 2026-10-08 14:12:27.175 UTC: eight PASS in 7.061183 seconds; earlier incorrectly referenced failed output preserved and reconciled in audit/boundary-evidence-reconciliation.md. Only the boundary harness changed after the other suite runs.

## Technical fixes and proposals

One newly reproduced file-orphan application defect (FA-DEF-01) was fixed and retested with real PostgreSQL failure injection; one Low security-header configuration finding (FA-SEC-01) fixed and retested. Existing spoofed-PDF failure/fix evidence and genuine-upload regressions preserved. Client query validation retains server contract 3–4,000 characters, including an explicit upper guard. Three proposals are implemented and tested locally but disabled by default: inclusive 24-hour cancellation cutoff; explainable 20% workforce headroom signal; owned atomic multi-file service operation on an existing request. Full request-creation atomic HTTP/UI workflow remains blocked. No proposal is represented as a previously approved requirement.

Security: historical non-placeholder PostgreSQL/Neon credentials appear exposed in original commit c0ea64584769a65b217a2eadb1a4a30489bd4af0; current tracked source contains no matching historical value. Validity/rotation unknown; no access attempted. Repository owner must revoke/rotate privately, update consumers and inspect access history. ZAP 2.17.0 passive six-path local retest: three alert instances of one Low nosniff type before, zero after; all six responses include nosniff. This does not certify overall security. Pillow, python-dotenv and python-multipart patched compatibly; 114 AI regressions pass and pip check is clean. Remaining advisories affect Starlette, ChromaDB and pytest; alias matches are not unique vulnerabilities. npm audit blocked by certificate verification; no TLS bypass.

AI: new deterministic 503/504/timeout/malformed JSON/schema/fallback tests preserve approval gates; no new paid/live calls. Prior provider 503/504 failures cannot establish model/account availability or successful Golden Case acceptance. Expert-labelled criteria, approved corpus/fixtures and a new live-call budget remain required. Reproducible reviewer templates provided.

## Component responsibility and human confirmation

| Assigned member | Component PASS / FAIL / BLOCKED | Main outstanding action |
|---|---|---|
| Jeyashankar | C1 7 / 4 / 2 | Confirm catalogue/fee rules, workforce proposal and AI match/forecast labels |
| Buddhika | C2 9 / 2 / 1 | Confirm booking status/cancellation policy and scheduling AI acceptance |
| Vithusan | C3 8 / 2 / 2 | Confirm Deed/checklist/Approved mapping, OCR labels and full atomic boundary |
| Wijayananda | C4 8 / 0 / 4 | Coordinate credential response, auth rules and consultation acceptance/disclaimer |
| Shared | 17 / 8 / 3 | Coordinate model/database/UI contract decisions and original E2E fixtures |

Four member matrices, evidence mappings, commands, viva guides and one confirmation checklist are included. All personal execution remains **Pending member confirmation**. Original Git authors/dates preserved; component responsibility does not establish personal authorship. Codex-assisted work explicitly disclosed.

CI: twelve selected original-repository native run archives downloaded using approved read-only credentials; credentials remained in memory. Five genuine CI figures added. Supported Mobile failure at 6d982e60 → brace fix and successful analyze/tests at 8a9b8a24; successful backend/frontend/mobile also at 54aecccc. fb471202 failures are excluded deployment commits and not imported. Exact published QMSE SHA has zero observed CI runs because committed workflows filter main/develop; no workflow_dispatch declared. No final local-overlay CI claim.

## Final deliverables and QC

Report: final-report/SE3110_Testing_Report_GR42_Consolidated_Final.docx and corresponding PDF, **101 pages / 43 genuine figures**. Existing 36 images preserved; five CI and two ZAP figures added. Every page was visually reviewed; changed pages rechecked, unchanged pages hash-verified against their prior full-resolution review. Blank page removed, TOC cached to actual page numbers, footer numbering and page bounds checked. All 77 evidence references exist. Original 89-page report/backup and historical archive unchanged. Evidence index and final source manifest included. Package: SE3110_GR42_Consolidated_Final_Evidence.zip, original entries retained and new artifacts added; CRC and referenced-path verification recorded in audit/package-receipt.json.

Remaining group decisions: approve/reject disabled proposals; establish authoritative BCrypt/JWT/tariff/status/encryption rules; confirm personal contributions/AI assistance; supply original fixtures and expert Golden Case acceptance labels. Owner actions: credential rotation and access review, coordinated remaining dependency patches, trusted npm CA repair. Any new publication/workflow change needs explicit approval; no final-branch CI pass is claimed.
