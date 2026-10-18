# Member 1 live retest — 8 October 2026

AI-assisted testing; personal member execution remains pending confirmation.

The updated key was detected in `ai-service/.env`, without printing or copying it. A fresh isolated database (`qmse_c1_retest_20261008`), ASP.NET API on loopback port 55543 and real recommendation/workforce FastAPI service on 55545 were used. All data is synthetic. No production access, application business-rule changes, commits or deployment occurred.

## Results

- **TC-C104 remains BLOCKED.** The real recommendation request reached Gemini `gemini-3.8-flash`; the provider returned HTTP 503 UNAVAILABLE/high demand after 4.049 seconds. No usable classification or ranking was produced. Three seeded lawyers are verified in PostgreSQL, including two property specialists. The historical scenario and >90% accuracy expectation are preserved; this synthetic current-contract probe does not validate expert-labelled accuracy.
- **TC-C105 remains BLOCKED.** Real provider hiring-draft generation returned the same high-demand 503 after 6.697 seconds. Separately, the database-backed current capacity calculation passed: two active property lawyers, 20 eligible demand workflows in the preceding 30 days, zero appointments and 16 derived future slots. Sixty independent daily slot responses agree with that total. Old, future and FAILED demand controls were excluded. Existing capacity rules report CAPACITY_CONCERN; the proposed headroom flag is disabled. These retrospective signals are not a validated predictive forecast.
- **TC-C113 PASS (deterministic).** Its existing mocked timeout/safe503/health recovery test passed. Both real services also remained healthy after provider errors. No appointments or careers were published.
- Focused xUnit: **29 PASS / 0 FAIL / 0 SKIPPED**. Focused deterministic Python: **7 PASS / 0 FAIL / 0 SKIPPED**. These overlap earlier suites; they are not added to historical/full-regression totals.
- Original 77-case ledger remains **49 PASS / 16 FAIL / 12 BLOCKED**. C1 remains **7 PASS / 4 FAIL / 2 BLOCKED**. C103/C106/C107/C112 remain FAIL.

## Live-call controls

Two of the three authorised requests were used. SDK retries and classifier retries were disabled for this retest only; request timeout was 20 seconds. A global runtime gate prevented more than three calls and stopped on quota/billing errors. Neither provider response reported quota/billing problems. No third request or unnecessary retry was made. Errors supplied no usage metadata or reliable cost estimate. Do not describe the request durations as successful model-generation latency.

**Do not rerun the live scripts under this approval. A subsequent two-call run requires a new budget approval.** They are retained as reproducible execution source, not an automatic invitation to spend further calls. The fresh-database guard deliberately refuses to reuse or reset an existing database.

## Evidence

- `connectivity-config.json`: redacted configuration and call limits.
- `provider-native.json`: actual native provider requests, status, response, timing; no keys/headers.
- `http-execution.json`: synthetic API inputs/responses; login credentials and token omitted.
- `database-verification.json`: real lawyer and workflow facts.
- `workforce-calculation.json`: actual analysis, independent capacity total and checks.
- `approval-gate-verification.json`: zero appointment/career side effects; healthy services.
- `recommendation-result.json`, `workforce-draft.json`: failed live current-contract scope.
- `backend-results/c1-focused.trx`, `backend-focused.log`, `ai-focused.xml`, `ai-focused.log`: focused regressions.
- `backend-sandbox-aborted.log`, `backend-results/c1-sandbox-aborted.trx`: preserved initial runner socket restriction; successful permitted rerun is separate.
- `harness-correction.json`: evidence-query table-name correction. Application code and live executions were not repeated.
- `tested-source.json`: exact HEAD and local source-file digests. This is an unpublished local working tree, not a new tested commit.
- `report-before/`: original 101-page report and DOCX preserved.

## Focused reproduction commands (no live calls)

```bash
PYTHON_DOTENV_DISABLED=1 GEMINI_API_KEY='' GOOGLE_API_KEY='' \
  ai-service/.venv/bin/python -m pytest \
  ai-service/tests/test_qmse_boundaries.py::test_TC_C113_mock_timeout_returns_safe_503_then_health_recovers \
  ai-service/tests/test_provider_resilience_final.py

dotnet test backend/LegalService.Tests/LegalService.Tests.csproj --no-restore \
  --filter 'FullyQualifiedName~RecommendationTransportTests|FullyQualifiedName~WorkforceHiringTests'
```

The .NET test runner needs permission to open its local communication socket. Do not overwrite preserved evidence with reproduction output.

## Remaining decisions

Provider availability is external. A successful future generation still needs review of grounding/schema/ranking and approved expert-labelled accuracy criteria. Workforce predictive forecasting and its acceptance criteria require group/subject-matter review. No new cancellation, headroom, pricing or other business rule was enabled.
