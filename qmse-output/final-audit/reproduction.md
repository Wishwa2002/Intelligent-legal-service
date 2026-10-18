# Final source reproduction

The published original-group branch remains at 05359214df52fa743b234e1d77e6671f57c14dea. The delivered local fixes and tests are uncommitted and unpublished. Check source-manifest.json for exact overlay SHA-256 and every source file hash. No remote CI result applies to this overlay.

```bash
git clone https://github.com/Wishwa2002/Intelligent-legal-service.git
cd Intelligent-legal-service
git switch se3110-qmse-testing
git rev-parse HEAD
```

Expected HEAD: 05359214df52fa743b234e1d77e6671f57c14dea. From the evidence package, copy final-audit/source-snapshot paths over matching clone paths. These are the exact tested source files, including previously untracked historical replay tests. Alternatively apply tested-source.patch for tracked changes and copy the new files; do not apply both methods cumulatively. The patch includes only local source/configuration changes and no secret files.

Use a newly created, owned localhost PostgreSQL 18 cluster with disposable databases and synthetic accounts. Never use a production connection string. PostgreSQL classes require MEMBER1_TEST_POSTGRES (maintenance database, local only), LAWYER_MOBILE_TEST_POSTGRES, and QMSE_HISTORY_POSTGRES (synthetic application database). Historical HTTP tests also require an isolated API/account environment; see delivered debug/audit/start_isolated.py and start_secondary_ai.py. These scripts are environment-specific references, generate private controls under /private/tmp, and must not be pointed at production. Logs identify actual versions/ports/commands. Do not reuse delivered passwords/tokens or overwrite original logs.

Backend full run in this audit:

```bash
dotnet test backend/LegalService.Tests/LegalService.Tests.csproj --filter 'FullyQualifiedName!~HistoricalPostgresSetupTests.BootstrapActualStartupSeeders' --logger 'trx;LogFileName=local-reproduction.trx' --results-directory qmse-local-reproduction
```

Startup bootstrap must be run separately first in a fresh environment; it resets only the owned synthetic fixture and was already executed in the delivered run. The full run excludes repeated bootstrap to preserve active fixture data, not to hide a failing test. Real PostgreSQL tests create/drop uniquely named databases. Latest execution: 365 total, 362 PASS, 1 FAIL and 2 SKIPPED. Historical BCrypt12 and coldTLS connection assertions are deliberately retained; results/timing may vary on a new environment.

Focused technical/policy verification:

```bash
dotnet test backend/LegalService.Tests/LegalService.Tests.csproj --filter 'FullyQualifiedName~RequirementsDecisionTests|FullyQualifiedName~SecurityHeaderTests|FullyQualifiedName~RecommendationTransportTests' --logger trx --results-directory qmse-local-reproduction
cd frontend
npm ci
npm run test:member1
npx playwright test --config final-audit-baseline.playwright.config.ts
npx playwright test --config requirements-boundaries.playwright.config.ts
```

React server55547 must run against the isolated API; Playwright configuration uses this local URL. Baseline 111 PASS / 3 SKIPPED is distinct from 8 current-contract replacements and 8 length-boundary tests. Boundary UI tests use explicit synthetic HTTP fixtures and do not prove Gemini behavior. The real HTTP/SQL script is backend/LegalService.Tests/final_audit_contract_replay.py and requires the generated private local control fixture.

```bash
cd mobile
flutter pub get
flutter test --no-pub --machine
cd ../ai-service
python -m venv .venv
.venv/bin/python -m pip install -r requirements-qmse-tested.lock.txt
PYTHON_DOTENV_DISABLED=1 HF_HUB_OFFLINE=1 TRANSFORMERS_OFFLINE=1 GEMINI_API_KEY=synthetic-only GOOGLE_API_KEY=synthetic-only .venv/bin/python -m pytest tests --junitxml=../qmse-local-reproduction/ai.xml -q
```

Both provider values must be synthetic and PYTHON_DOTENV_DISABLED=1, HF_HUB_OFFLINE=1 and TRANSFORMERS_OFFLINE=1 must be set for deterministic tests. The delivered execution wrapper does this explicitly. No live provider request is authorised. The exact current AI lock captures the tested installed environment; older lockfiles advertised versions that differed from actual runtime and are retained as historical artifacts. npm advisory access was blocked by this machine's trust chain; fix trusted CA configuration instead of disabling verification.

Default-disabled proposals: ProposedRules:Cancellation:Enabled=false (MinimumNoticeHours=24), Workforce:ProposedHeadroomEnabled=false (ProposedMinimumHeadroom=0.20), ProposedRules:AtomicDocumentBatch=false. Unit/integration tests opt in explicitly. Batch is a service-level proposal, has no HTTP route/client call, and does not implement atomic request creation plus three independent HTTP uploads. Group approval is required before enabling a policy or designing a public batch workflow.

Security replay: security_passive.py before/after scans six GET paths through a separately owned ZAP 2.17.0 daemon bound to localhost:55549. Passive only; no spider/active scan. Header fix and compensation apply to local source; historical scans and failure logs remain unchanged.
