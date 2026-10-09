# Member 1 recommendation 503 investigation

Verified on 2026-10-04. **Integration configuration and diagnostics are corrected; successful live recommendation generation remains blocked by Gemini's exhausted daily quota.** No key or model value was changed.

## Confirmed cause

A direct request to `:8002/lawyer-recommendations` with the existing `AI_INTERNAL_KEY` returns 503, not 401. The request reaches Gemini. The provider returns HTTP 429 with quota metric `generativelanguage.googleapis.com/generate_content_free_tier_requests`, quota ID `GenerateRequestsPerDayPerProjectPerModel-FreeTier`, and quota value **20**. The provider reported a retry delay around **84,000 seconds (23 hours)** at diagnosis time. This is exhausted daily quota, not a missing route, unsupported model, or failed internal authentication.

Gemini's model catalog lists the configured `gemini-3.8-flash`. It was preserved. Provider status/body secrets are not echoed: only whitelisted status, quota metric/limit and numeric retry timing were inspected.

The initial backend configuration files also had an empty `Ai:InternalKey`; the running-process audit found no canonical exported `Ai__InternalKey`. The old normal signed-in browser request was not replayed automatically, so its exact effective runtime configuration is not claimed. This was a real startup configuration gap that needed a reliable launch path, independently of the proven Gemini quota failure. The Windows `start.ps1` and `start.bat` launch only the old three services; they omit `:8002` and do not map its dotenv internal key into ASP.NET. The suggested `scripts/start-member1-local.py` did not previously exist.

The frontend maps any backend 503 to its safe unavailable message. The backend previously mapped all unsuccessful upstream statuses except 422 to generic 503, and Python masked provider/SDK/parse failures without safe stage logging. Thus the UI message alone could not identify the failing layer.

## Actual request flow

1. `frontend/src/components/lawyers/LawyerRecommendations.tsx` uses `useRecommendationWorkflow.submit`.
2. `frontend/src/hooks/useRecommendationWorkflow.ts` calls `recommendationsApi.recommend`.
3. `frontend/src/api/recommendationsApi.ts` sends `{ requirement, date, limit: 5 }` through the existing configured `apiClient` to `POST /api/lawyer-recommendations` on :5295. Frontend `.env.local` points to :5295.
4. `backend/LegalService.API/Controllers/LawyerRecommendationsController.cs`, protected by Admin authorization, calls `RecommendationService.RecommendAsync`.
5. `backend/LegalService.API/Services/Lawyers/RecommendationService.cs` loads real Practice Areas, services and active single-area lawyer candidates from the database. It uses its dedicated HttpClient, adds `x-internal-key`, serializes the trusted snapshot as JSON, and posts to configured base URL plus **`lawyer-recommendations`**. No `/recommend` route is involved.
6. `ai-service/lawyer_recommendation/app.py:recommend` checks `x-internal-key` with `secrets.compare_digest` against `AI_INTERNAL_KEY`, then runs `build_recommendation_graph`.
7. `ai-service/lawyer_recommendation/agent.py` invokes `GeminiClassifier.classify`; the classifier calls Gemini **directly**. The :8001 document agent is not in this recommendation path.
8. Provider 429 becomes a controlled Python 503, then a controlled backend 503, then the safe React error. No random recommendation, fallback category or appointment is created.

The backend HttpClient timeout remains 45 seconds, Python graph deadline 40 seconds, per-provider call timeout 20 seconds, frontend recommendation timeout 60 seconds. Range/date validation remains unchanged. The payload has camel-case `requirement`, `date` in `YYYY-MM-DD` or null, `limit`, `specializations`, `services`, and `candidates`.

## Authentication/configuration correction

The internal header was already added correctly in RecommendationService; it was not removed or moved to the browser. Its canonical ASP.NET configuration remains `Ai:InternalKey`, supplied by environment variable `Ai__InternalKey`; URL remains `Ai:BaseUrl` / `Ai__BaseUrl`.

New local launcher: `scripts/start-member1-local.py` reads the existing Git-ignored `ai-service/.env` with the same python-dotenv parser used by Python. It maps the parsed `AI_INTERNAL_KEY` into backend `Ai__InternalKey` and passes the same parsed value to :8002. Differently-cased stale ASP.NET aliases are removed from the launched environment. Explicit dotenv AI configuration overrides stale inherited AI variables. No stored value is rewritten, trimmed by custom code, replaced or rotated.

Python-dotenv trims whitespace after `=` in an unquoted value. Current parsed internal key had no outer whitespace. A test proves `AI_INTERNAL_KEY= existing-test-key` produces identical Python/backend keys. Quoted secret values are preserved by the parser; there is no blind `.strip()` of the internal key.

The launcher starts existing modules on frontend5173/backend5295/agent8001/recommendation8002, passes secrets in child environments rather than command-line arguments, and refuses to replace a running service automatically. Gemini API credentials are not supplied to the browser/frontend process or added to backend configuration. The backend and recommendation service were restarted using this launcher with unchanged keys/model; frontend and :8001 remained running.

Run from repository root:

```sh
ai-service/.venv/bin/python scripts/start-member1-local.py --check
# After stopping previous instances of the selected services:
ai-service/.venv/bin/python scripts/start-member1-local.py
```

Use `--services backend recommendation` to launch only those two after stopping them. Existing `.env` must remain private and ignored.

Config names only: `AI_INTERNAL_KEY`, `Ai__InternalKey` / `Ai:InternalKey`, `Ai__BaseUrl` / `Ai:BaseUrl`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `VITE_API_URL`, `ASPNETCORE_ENVIRONMENT`.

## Targeted diagnostics and safe behavior

Backend logs safe route/status/stage/correlation metadata for internal auth (401/403), wrong route (404), validation (422), classification/service failure, timeout, connection failure and response schema errors. A UUID `x-correlation-id` connects the backend workflow with the :8002 log. No provider body, full URL with credentials, requirement text, Authorization header or internal key is logged. Unsupported/no-match/completed outcomes are distinct safe backend statuses.

Python logs safe provider status, exception **type**, stage, attempt and numeric retry timing. Configuration, SDK import, provider auth/model, transport, timeout, structured parse and catalog validation are distinguishable. Arbitrary correlation header text cannot enter logs: only parsed UUIDs are used. Provider exceptions are never formatted into log strings.

The classifier uses the already-installed HTTPX transport with explicit lifetime management. This does not bypass Gemini quota. Small transient errors retain bounded retry behavior; a provider RetryInfo delay longer than one second fails safely instead of repeatedly retrying a daily quota or sleeping for hours. No alternative model, key or heuristic classification fallback was introduced.

Frontend unavailable wording now says no lawyer recommendation was generated and invites retry, with no internal auth/config/provider details. Failure clears candidates/approval controls. Backend failure workflows remain FAILED; no appointments are created.

## Direct and integration results

| Check | Observed result |
| --- | --- |
| :8002 GET `/health` | 200 |
| :8001 GET `/health` | 200 |
| :8002 POST without internal key | 401 |
| :8002 POST with wrong internal key | 401 |
| :8002 POST with configured unchanged key | 503 after successful auth; correlated diagnostics show provider 429 |
| Real ASP.NET RecommendationService → live :8002 | Auth passed; upstream 503, not 401/403/404; provider 429; isolated test workflow persisted safely |
| Gemini model catalog | Configured model exists |
| Live `issue with land document`, date 2026-10-04 | Interpretation cannot complete under exhausted quota; no successful lawyer recommendation claimed |

The live transport test uses the real ASP.NET client and real Python service, with synthetic data in an isolated in-memory test database. It does not write a remote workflow or use a real Admin password/JWT. It passes when the authentication/error boundary behaves correctly, **not** because Gemini successfully classified the requirement. Its opt-in key is loaded privately from the intended dotenv configuration into the test process environment.

A request for manual submission through the user's already-authenticated Admin browser session was sent. No signed-in real browser submission was observed before this report. Browser success/failure UI behavior was verified with Playwright API fixtures; that is not a successful live Gemini UI test.

## Files changed for this debugging task

| File | Purpose |
| --- | --- |
| `scripts/start-member1-local.py` (new) | Four-service local launcher; maps existing dotenv key to canonical backend configuration without printing values. |
| `ai-service/lawyer_recommendation/gemini.py` | Managed existing HTTPX transport, safe error stages and provider retry-delay handling. |
| `ai-service/lawyer_recommendation/app.py` | Safe authentication/catalog/provider/timeout logs and validated correlation IDs. |
| `backend/LegalService.API/Services/Lawyers/RecommendationService.cs` | Safe upstream status/stage/timeout/schema diagnostics and outgoing correlation header; recommendation/approval rules unchanged. |
| `frontend/src/hooks/useRecommendationWorkflow.ts` | Safe unavailable message with explicit no-recommendation outcome. |
| `ai-service/tests/test_recommendation_gemini.py` | Safe 429/parse logging, short transient retries and no rapid retry on exhausted daily quota. |
| `ai-service/tests/test_recommendation_snapshot.py` | Wrong-key rejection alongside missing-key coverage. |
| `ai-service/tests/test_member1_local_startup.py` (new) | Parser consistency, stale-env override, no frontend secrets and correct module/port checks. |
| `backend/LegalService.Tests/RecommendationTransportTests.cs` (new) | Real service header/route/date/catalog snapshot contract, distinct 401/404/422/503 logs and safe external failures. |
| `backend/LegalService.Tests/RecommendationLiveTransportTests.cs` (new) | Opt-in live ASP.NET → :8002 auth boundary using isolated synthetic workflow data. |
| `frontend/tests/recommendation.spec.ts` | Safe unavailable UI with no candidates, approval, workflow URL or appointment call. |
| This report (new) | Findings, verification and remaining blocker. |

Pre-existing working-tree changes were preserved. No appsettings secret, dotenv secret, model value, route, schema or unrelated module was changed for this task. No commit was made.

## Test/build results

| Command | Result |
| --- | --- |
| `dotnet build LegalService.sln --no-restore --disable-build-servers /p:UseSharedCompilation=false --verbosity minimal` | PASS, zero errors. Existing vulnerability-feed connectivity warning. |
| `MEMBER1_TEST_POSTGRES=... dotnet test LegalService.sln --no-build --no-restore --verbosity minimal` | PASS, 146 tests before adding the opt-in live case. |
| Full backend test project with local `MEMBER1_TEST_POSTGRES` and private `MEMBER1_TEST_AI_INTERNAL_KEY` / `MEMBER1_TEST_AI_URL`; `dotnet test backend/LegalService.Tests/LegalService.Tests.csproj --no-restore --no-build --verbosity minimal --disable-build-servers /p:UseSharedCompilation=false` | PASS, 147 tests, zero skipped. Includes live authenticated transport handling, not successful live classification. |
| `.venv/bin/python -m pytest -q` from ai-service | PASS, 78 tests; existing deprecation warnings. |
| `ai-service/.venv/bin/python scripts/start-member1-local.py --check` | PASS, reports presence/mapping and nonsecret URLs/model only. |
| `npm run build` from frontend | PASS, TypeScript/Vite; existing large-bundle warning. |
| `npm run test:member1` | PASS, 18 tests. |
| `npm run test:e2e -- --workers=1` | PASS, 22 tests, including new safe failure case; browser responses are fixtures. |
| `npx eslint src/hooks/useRecommendationWorkflow.ts tests/recommendation.spec.ts` | PASS, no errors/warnings. |
| `git diff --check` | PASS. |
| Live Gemini classification | FAIL / blocked: provider HTTP429, daily free-tier requests exhausted. |

## Remaining issues

**CRITICAL:** Gemini's daily model/project quota is exhausted. Restore quota/billing for the same existing project/key, or wait for the provider's reset. No application change can grant additional provider quota while preserving the current model/key. Successful normal UI recommendation generation remains unverified and blocked. After reset, use a valid current/future preferred date: 2026-10-04 must not be silently accepted once it becomes a past date.

**SHOULD FIX:** Finish a real signed-in Admin browser verification after quota is available: submit the land requirement, verify Real Estate & Property Law, persisted workflow, valid date filtering, and no appointment before approval.

**OPTIONAL:** Migrate old Windows-only startup wrappers to use the new portable helper; they were inspected but not executed on this macOS machine.

## Security/approval boundary

Internal authentication remains mandatory. Browser code has no internal/Gemini key. Existing key and model values were preserved; no secrets were logged, printed in tool output, or committed. New tests use synthetic test-only keys except the explicit private live-service test, whose existing key is passed only through the test environment.

Automatic approval review rejected extracting Admin credentials from a running process and using them for a real backend login/workflow. That action was not executed or retried through another credential source. A safer real-service integration test with isolated synthetic workflow data was approved and run. No credential extraction is needed for the manual browser check requested from the user's existing Admin session.
