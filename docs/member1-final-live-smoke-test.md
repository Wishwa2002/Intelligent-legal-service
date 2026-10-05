# Final Member 1 Live Smoke Test

## Latest verified result — 4 October 2026, 08:40 Asia/Colombo

**Final verdict: NOT READY. Gemini: QUOTA BLOCKED.** This section supersedes the earlier unconfirmed-provider results below. Current diagnostics now establish provider HTTP 429 for the real signed-in request.

### Environment, authentication, and privacy

Frontend 5173, backend 5295 Swagger, and recommendation 8002 health returned HTTP 200. Database: **Neon PostgreSQL**, `ConnectionStrings:DefaultConnection`.

The approved existing Admin was used. `frontend/.env.local` remains ignored/untracked; both E2E variables exist and are non-empty. Direct normal backend login returned HTTP 200, token present, Admin role. Authenticated summary GET and customer GET passed; actual port-5173 login also passed and reached the recommendation page. No fake JWT or manually injected browser auth was used.

Playwright loads the variables on the Node side only with the existing `loadEnv` utility. The private-value scan of available frontend build artifacts passed. No VITE-prefixed credentials, React/import.meta.env credential access, credential values, tokens, or headers were printed or added to this report. No Admin was created/reset/promoted/modified and the seed command was not run.

Only the recommendation service was restarted through its existing launcher to capture its existing diagnostics in a private temporary log. Existing keys/model/configuration were unchanged; no application code was edited. Backend/frontend were not restarted. Service diagnostics were extracted using a strict whitelist rather than printing the raw log.

### Preconditions and actual input

Current read-only data: **6** active lawyers solely in Real Estate & Property Law, **5** Property Law services, **7** existing Customer accounts, and **8** valid future unbooked Property Law slots on the selected date.

Requirement: **`issue with land document`**.

Preferred date: **2026-10-05**, dynamically chosen from current database availability.

Baseline: four appointments, 25 workflows. Actual UI attempt: **08:40:45–08:40:49 Asia/Colombo**, 03:10:45–03:10:49 UTC. One supported request was submitted; no live unsupported or nonsense request followed.

### Confirmed current failure

Safe current diagnostics:

```text
Gemini failure stage=provider_rate_limit status=429 exceptionType=ClientError attempt=1 retrySeconds=74950.0
Recommendation failure stage=provider_rate_limit providerStatus=429 status=503
```

The service's diagnostic correlation ID matched the newly persisted FAILED workflow. Internal service authentication therefore succeeded and the request reached Gemini. The provider reported a retry delay of **74,950 seconds**, approximately **20 hours 49 minutes**. This live attempt stopped after that quota response; no additional classification or provider retry probe was sent.

The normal application path was React → ASP.NET → POST :8002/lawyer-recommendations → Gemini. The recommendation service returned its safe 503 after provider 429, which the backend/UI surfaced as unavailable. Port 8001 was not involved.

Expected Practice Area: **Real Estate & Property Law**. Actual: **no interpretation returned** because of provider quota. No ranked recommendations were generated, so returned-lawyer eligibility, ranking, awaiting-approval restoration, and booking cannot be claimed as tested live.

### Safe failure and database verification

Real UI assertions passed: no candidate-selection controls, no approval action, no new workflow query parameter, and a clear message that no recommendation was generated.

Read-only Neon verification found exactly one new **FAILED** workflow with no category or appointment; received/snapshot-loaded events preceded the failure event. Authenticated GET returned HTTP 200, FAILED, zero recommendations, and no appointment. Appointment count remained **4**; workflows increased to **26**. The selected date still has **8** eligible unbooked slots. No booking request, manual database mutation, or appointment insertion occurred.

The failed workflow's persistence is verified; this is not successful awaiting-human-approval or Completed workflow restoration. No duplicate approval was attempted because no successfully recommended workflow exists from this attempt.

### Final status

| Check | Result |
| --- | --- |
| Credential security | PASS |
| Backend Admin login | PASS |
| Admin authorization | PASS |
| Development customer | PASS |
| Property Law lawyer | PASS |
| Valid future slot | PASS |
| Gemini | QUOTA BLOCKED — current provider 429 |
| Practice Area interpretation | BLOCKED |
| Eligible lawyers | BLOCKED |
| Workflow persistence before approval | BLOCKED |
| Human approval | BLOCKED |
| Appointment creation | BLOCKED |
| Completed restoration | BLOCKED |
| Duplicate approval protection | BLOCKED |
| Slot update after booking | BLOCKED |
| Unsupported-domain protection | AUTOMATED ONLY — PASS with stubbed interpretation |

### Commands/checks executed in this continuation

| Command/check | Result |
| --- | --- |
| Private source validation with Git ignore/tracked checks | PASS — ignored/untracked, variables non-empty; values suppressed |
| Private credential-exposure scan of existing frontend build | PASS |
| Safe normal backend login and authenticated summary/customer GETs | PASS — 200/Admin, authenticated access, seven customers |
| `python3 /private/tmp/member1-live-preconditions.py` | PASS — fresh real date/counts and baseline |
| Existing launcher restart for recommendation service only, with private diagnostic capture | PASS — same configuration; health 200 |
| Private launcher running `node /private/tmp/member1-live-smoke.mjs` | UI login PASS; live recommendation QUOTA BLOCKED; safe UI failure PASS |
| Whitelisted current service diagnostic extraction | PASS — provider 429, 74,950-second retry, matched workflow correlation |
| `python3 /private/tmp/member1-final-db-audit.py` | PASS — no new appointment; availability unchanged; workflow count increased by one |
| `python3 /private/tmp/member1-failed-workflow-audit.py` | PASS — FAILED, no category/appointment, safe event status metadata |
| Authenticated GET of failed workflow | PASS — 200, zero recommendations, no appointment |
| `.venv/bin/python -m pytest tests/test_recommendation_guardrails.py -q` (ai-service) | PASS — 8 tests in 0.30 seconds; classification stubbed; no live Gemini calls |
| `git diff --check` | PASS after update |

Application code did not change, so build/full-regression/lint commands were not rerun. Earlier results retain their original scope. Existing redacted screenshots are from the earlier 08:08 attempt and must not be presented as screenshots of this 08:40 request.

### Files changed and verdict

Only this report was updated for the current continuation. Temporary verification results/diagnostics remain outside the repository and contain no credential literals or tokens. No credentials, auth rules, accounts, schema, keys/model, ranking, or unrelated module changed; nothing was committed.

**BLOCKER:** confirmed provider rate limiting prevents the complete live booking verification. No separate implementation defect was established and no code fix was applied. Wait for provider quota recovery or restore quota through the existing provider project configuration before another controlled attempt.

**NOT READY.** Existing-Admin login and genuine database prerequisites pass, but the required live recommendation → human approval → real appointment → Completed → refreshed Completed → duplicate rejection sequence has not succeeded.

## Date and scope

4 October 2026. Direct-login/preflight started at 02:40:06 UTC (08:10:06 Asia/Colombo). Real browser attempt ran 02:41:02–02:41:05 UTC (08:11:02–08:11:05 Asia/Colombo).

This report supersedes earlier account-not-found/invalid-password blockers: the updated existing Admin credentials now authenticate successfully. The booking verification remains incomplete because the single live recommendation request returned HTTP 503.

## Environment

| Component | Endpoint / source | Result |
| --- | --- | --- |
| Frontend | localhost:5173 | HTTP 200 |
| ASP.NET Core backend | localhost:5295; Swagger responds | HTTP 200 |
| Recommendation service | localhost:8002/health | HTTP 200 |
| Database | Neon PostgreSQL; ConnectionStrings:DefaultConnection | Read-only queries successful |

Inspected architecture: React → ASP.NET Core → POST :8002/lawyer-recommendations → Gemini. Port 8001 is not part of this recommendation flow. No architecture, keys, model, or authentication rules were changed.

## Authentication

Existing Admin used: **YES**. No Admin was created/reset/modified, and the prepared development seed command was not executed.

Private source: `frontend/.env.local`.

| Check | Result |
| --- | --- |
| Credential source | PASS |
| Git ignored | YES |
| Git tracked | NO |
| E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD present and non-empty | YES |
| Normal backend login | PASS — HTTP 200, token returned internally |
| Returned role | PASS — Admin |
| Admin-only summary GET | PASS — HTTP 200 |
| Admin-only customer-list GET | PASS — HTTP 200 |
| Real frontend login / Admin navigation | PASS — normal login UI, no injected token |
| Credential-exposure scan | PASS — neither current credential value in existing frontend build artifacts |

Playwright's Node-side configuration intentionally loads E2E variables with the existing Vite loadEnv utility. They have no VITE_ prefix and are not imported into React or exposed using import.meta.env. No credentials, token, headers, customer personal data, or connection strings are included in this report or terminal output. Signed-in screenshots were deliberately omitted to avoid exposing identity/customer information. A fresh frontend build was not needed because no application code changed; the exposure scan examined existing build artifacts.

## Preconditions

Read-only authenticated API/database evidence before consuming Gemini quota:

| Real data | Count |
| --- | ---: |
| Existing Customer-role accounts | 7 |
| Active lawyers solely in Real Estate & Property Law | 6 |
| Property Law Legal Services | 5 |
| Future valid unbooked Property Law slots | 36 |
| Bookable Property Law slots on selected date | 8 |
| Existing appointments | 4 |
| Existing Admin accounts | 2 |

The availability query required Active status, exactly one Practice Area relationship, the real Property Law catalog name, unbooked status, start before end, and date-plus-start strictly after current UTC time. These are actual data counts, not hardcoded UI/demo statistics.

## Test Input

Requirement: `issue with land document`.

Preferred date: **2026-10-05**, dynamically selected as the earliest real date returned by the fresh development availability query. The browser runner consumed that query result; it did not reuse a hardcoded date.

The requirement and date were entered in the real port-5173 Admin recommendation UI, then **Find Suitable Lawyers** was clicked exactly once.

## Gemini Interpretation

Expected: **Real Estate & Property Law**.

Actual: **none returned**. The normal frontend → backend recommendation POST returned **HTTP 503**. The UI showed the safe unavailable message explicitly stating that no lawyer recommendation was generated.

Gemini verification: **FAIL**. Internal-service authentication and Gemini classification success were not established for this individual request. A generic backend 503 does not by itself identify the provider failure.

Earlier diagnostics had established exhausted Gemini daily quota, but **current provider HTTP 429 was not captured during this attempt**. It would be inaccurate to report QUOTA BLOCKED as a confirmed current result. No second live request or direct Gemini probe was issued. The service health endpoint does not establish provider usability.

Available intentional service log files contained no current diagnostics; the prior tool session for the running recommendation process was unavailable. Only safe status/metadata searches were performed. No credentials were extracted from processes, logs, or storage. Read-only process metadata established diagnostic output was directed to pipes rather than an accessible log file. No process was restarted or altered to force a retry.

## Recommendation

Returned eligible lawyers: **0**.

Result: **FAIL — HTTP 503**. No Practice Area interpretation or ranked results were accepted. The following real UI safe-failure assertions passed:

- No Select Lawyer buttons.
- No Approve & Create Appointment action.
- No new workflow query parameter in the UI URL.
- Error explains that no lawyer recommendation was generated.

Database preconditions confirmed genuine Property Law capacity, but returned-candidate eligibility, ranking, and requested-date result behavior could not be verified live. Existing source/automated evidence must not be substituted for live returned results.

## Workflow Persistence

Before-approval refresh: **BLOCKED**. No awaiting-approval recommendation result was returned to restore.

Read-only Neon evidence for this Admin's exact requirement/date, created after browser-test start:

| Failure workflow evidence | Count |
| --- | ---: |
| New matching workflows | 1 |
| FAILED workflows | 1 |
| Saved recommendations | 0 |
| Linked appointments | 0 |

This proves safe failure persistence, not successful awaiting-human-approval restoration. No workflow identifier is exposed unnecessarily in this report.

## Human Approval

**BLOCKED.** No candidate/customer/slot selection or approval was performed. The backend validation path was not bypassed.

## Appointment Creation

**BLOCKED.** No appointment was created. Neon appointment count remained **4** before and after the attempt; the new FAILED workflow has no linked appointment. Admin account count remained **2**.

No manual inserts, availability edits, account mutations, fake appointment results, or schema changes occurred.

## Completed Workflow Restoration

**BLOCKED.** No new completed workflow exists from this attempt.

## Duplicate Approval

**BLOCKED.** No successful real workflow was available to approve again. No duplicate booking request was submitted.

## Slot Update

**BLOCKED / NOT EXERCISED.** No slot was selected or booked. The prospective date still has eight unbooked eligible slots after failure.

## Unsupported Request

**AUTOMATED ONLY — PASS.** The existing deterministic guardrail suite was rerun: eight tests passed, including unsupported divorce/child-custody and nonsense handling with no unrelated lawyer retrieval, invalid category/ID injection rejection, inactive/wrong-area exclusions, availability constraints, and deterministic ranking.

The classifier is stubbed in these tests; this is not a live Gemini classification result. No additional live unsupported/nonsense request consumed quota.

## Commands and tests

| Command/check executed this attempt | Result |
| --- | --- |
| Private dotenv source verification; git check-ignore -v frontend/.env.local; git ls-files --error-unmatch frontend/.env.local | PASS — ignored/untracked; both required keys non-empty; values suppressed |
| Private credential-value scan of frontend/dist | PASS — no configured credential value found; boolean-only output |
| Inspect frontend/playwright.config.ts and private live helper | Completed — Node-side loading confirmed; no secrets printed |
| Safe Python normal backend login, Admin summary/customer GETs, and read-only availability preflight | PASS — login/role/access, customers, active Property lawyers, services, and real future date |
| Private launcher running node /private/tmp/member1-live-smoke.mjs | Login/UI/preflight PASS; supported recommendation FAIL (503); safe UI failure PASS |
| python3 /private/tmp/member1-final-db-audit.py | PASS — read-only post-request counts; appointments unchanged, FAILED workflows increased by one |
| Whitelisted metadata inspection of intentional service diagnostics | No current provider diagnostics available; no 429 claim made |
| Read-only exact-owner/request/date/time workflow audit | PASS — one FAILED workflow, zero recommendations, zero linked appointments; unchanged appointment/Admin counts |
| .venv/bin/python -m pytest tests/test_recommendation_guardrails.py -q (ai-service) | PASS — 8 tests in 0.31 seconds; no live model calls |
| git diff --check | PASS after report update |

No application code/configuration change was required or justified, so backend builds/tests, frontend build/full tests, mocked Playwright regressions, and ESLint were not rerun in this attempt. Prior test results are not claimed as newly executed or as real booking proof. The only repository change from this attempt is this documentation update; temporary verification helpers/results remain outside the repository and contain no credential literals or tokens.

## Bugs Found

- **BLOCKER:** the live supported recommendation request returns HTTP 503, preventing interpretation and all approval/booking verification. Exact current upstream/provider failure category remains unconfirmed; historical quota exhaustion is a possible explanation, not current proof.
- **MAJOR:** no separate implementation defect established.
- **MINOR:** none discovered in this attempt.

No code was changed to mask the error or weaken service authentication. The next step is to obtain safe current service diagnostics for a future controlled attempt after provider availability is established, without repeatedly consuming quota. Admin authentication is now verified and no account setup change is needed.

## Final Verdict

### Additional evidence from this verification session

This session independently completed normal backend and real UI Admin login and authenticated Member 1 GETs. Its single supported UI request ran at **08:08:26–08:08:33 Asia/Colombo**, with the dynamically selected 2026-10-05 date, and returned HTTP 503. The later 08:11 attempt described above was recorded by another session updating this shared report; the attempts must not be presented as one request.

For this session's request, API and read-only database evidence verified one FAILED workflow, zero recommendations, no category, no appointment, and an unchanged appointment count of four at the post-check. Its real form and safe-error screenshots are saved under `docs/evidence/member1-final-live/01-recommendation-form.png` and `02-live-recommendation-failure.png`; the Admin identity is redacted and both were inspected visually. These screenshots are evidence from this session, separate from the later attempt that omitted screenshots.

After the user requested autonomous diagnostic retrieval, this session traced only process IDs/executable/output-destination metadata and searched the relevant captured session and extension logs using narrowly whitelisted diagnostic matching. Historical provider-429 retry metadata was found, but no current diagnostic matching this session's request correlation identifier. No process environments, memory, credential values, or hashes were extracted. No further Gemini request was made. Exact current provider status therefore remains unconfirmed; **FAIL**, rather than confirmed QUOTA BLOCKED, remains the honest live interpretation result.

Eight mocked-classification guardrail tests passed in this session. No application code, account, schema, key/model, or private credential file was changed. The final verdict is unchanged.

**NOT READY**

Existing Admin login and real read-only preconditions passed. The required real recommendation → human approval → valid-slot appointment → Completed → refresh restoration → duplicate rejection flow did not succeed. No readiness claim is made from mocked tests or safe-failure behavior.
