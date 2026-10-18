# Reproduce the published QMSE source

The exact published revision is `05359214df52fa743b234e1d77e6671f57c14dea`. These instructions are setup/replay guidance, not a claim of an additional full test run. Publication did not modify any application code or historical test result.

```sh
git clone https://github.com/Wishwa2002/Intelligent-legal-service.git
cd Intelligent-legal-service
git switch se3110-qmse-testing
git rev-parse HEAD
```

Expected SHA: `05359214df52fa743b234e1d77e6671f57c14dea`.

The first unassisted audit clone timed out after 150 seconds. A reference-assisted clone succeeded, established the advertised remote SHA, and verified all 97 commit identities/author/committer records with 83 beyond original main. It used audited local objects and did not independently download all objects or rerun applications. Both attempts are retained in evidence/fresh-clone-*.json/log.

## Prerequisites and isolated data

Use .NET 8, Node 22, Python with ai-service/requirements.txt and a complete Flutter SDK (recorded local SDK 3.47.6). Install PostgreSQL locally; only use a fresh loopback-bound cluster. ZAP 2.17.0 and k6 2.3.0 were the recorded scanner/load tools. Do not point test environment variables at hosted databases. Native device, accessibility and live provider acceptance remain separate tasks.

Use a new PostgreSQL data directory and dedicated test role/database. The recorded host used role `qmse_completion`, port 55446, database `qmse_workflow`. Relational regression fixtures create/drop uniquely named databases, so the isolated role needs CREATEDB. Keep the role scoped to the dedicated test cluster. Apply the application's migrations only to this fresh database. Do not reset, seed or migrate production.

From the repository root:

```sh
dotnet restore LegalService.sln
dotnet build LegalService.sln
```

Configure `ConnectionStrings__DefaultConnection`, `Jwt__Key`, issuer/audience and seed-account settings through private environment variables. Generate fresh signing material and synthetic account passwords. Use `.env.example` only as a template; it is not runnable production configuration. Put provider keys/private browser state outside Git and the evidence package.

For the relational suite, set `MEMBER1_TEST_POSTGRES` and `LAWYER_MOBILE_TEST_POSTGRES` to the fresh isolated loopback connection; for the recorded runner use `QMSE_ISOLATED_POSTGRES`, which forwards those two variables. Missing configuration causes relational cases to skip; a skipped suite is not equivalent to the recorded 326-pass/2-skip run.

```sh
dotnet test backend/LegalService.Tests/LegalService.Tests.csproj --logger "trx;LogFileName=backend.trx" --results-directory qmse-output/reproduction/backend --collect:"XPlat Code Coverage"
```

## Frontend and Flutter suites

```sh
cd frontend
npm ci
npx playwright install chromium
npm run build
npm run test:member1
npm test -- --reporter=list,html
```

Return to repository root, then:

```sh
cd mobile
flutter pub get
flutter test --machine
```

Most Playwright component specs intercept API routes. They are distinct from the genuine integrated workflow. Flutter unit/widget success does not establish native Android/iOS compatibility.

## Deterministic AI suite

From root:

```sh
cd ai-service
python -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
GEMINI_API_KEY=qmse-synthetic-not-a-real-provider-key GOOGLE_API_KEY=qmse-synthetic-not-a-real-provider-key PYTHON_DOTENV_DISABLED=1 HF_HUB_OFFLINE=1 TRANSFORMERS_OFFLINE=1 .venv/bin/python -m pytest tests -s --junitxml=../qmse-output/reproduction/ai.xml
```

The literal initialization value is synthetic, not a provider credential. Keep mock/offline configuration; one original live attempt returned 504 and did not verify Golden Case accuracy. Do not run `live_gemini.py` without a new suitable provider/budget decision. The original cumulative cap was eight calls, one attempted; no additional call was made for publication.

## Actual integrated workflow replay

Read `frontend/tests/qmse-integration/README.md` and the committed `qmse-output/completion-20261008/audit/local_services.py`. The latter reflects the recorded macOS runtime paths; adapt executable paths to the assessor host. Build the API, install frontend/Python dependencies and build actual Flutter web before starting it. Create the evidence directories before executing scripts.

Match the recorded isolated ports: API 55443; FastAPI 55444; PostgreSQL 55446; React 55447; Flutter web 55448. The supervisor's environment directs all clients/AI backend data reads to loopback. Generate private synthetic `settings.json` (password and bridge key) under `/private/tmp/qmse-completion-control`, owner-readable only. The supervisor creates it and writes private runtime state. Remove an old private stop marker only for this fresh isolated setup. No private control directory is supplied in the evidence package.

Set up synthetic seeded Admin/Clerk profiles, current documentation catalogue and legal synthetic fixtures. Never assume the original generated IDs/passwords. API startup with the isolated connection applies actual migrations; inspect migration output and profile IDs. Configure generated Flutter web asset `.env` with `BACKEND_URL=http://127.0.0.1:55443`; preserve the original ignored development configuration. FastAPI `app.main:app` runs on 55444 with matching internal bridge key and `BACKEND_API_URL`; the deterministic clerk-ranking workflow uses real backend data, no Gemini transport. The optional recommendation gateway `lawyer_recommendation.app:app` is separate and not required for this document workflow.

From root, after checking that all actual services are available:

```sh
node frontend/tests/qmse-integration/integrated_workflow.cjs
node frontend/tests/qmse-integration/resume_workflow.cjs
node frontend/tests/qmse-integration/complete_review.cjs
```

These scripts create a synthetic customer/request, upload a genuine PDF through Flutter and two through the API, request actual deterministic clerk ranking, require explicit assignment, complete React human review, verify Flutter synchronization and query PostgreSQL. They can preserve BLOCKED attempts while exiting zero: check `integrated-result.json`, actual HTTP statuses and independent final SQL, rather than assuming success from the process exit. The recorded result is request 12 / COMPLETED / 3 binary files / 7,667 bytes; new synthetic IDs may differ.

## Security and k6

Start ZAP on the isolated proxy port and read `expanded_zap.py` before execution. Its recorded mode makes fifteen finite requests plus passive inspection, not an automated active scan or production scan. Review scope, authentication and each alert manually; zero emitted alerts would not establish zero vulnerabilities.

`postgres-smoke.k6.js` reads private `/private/tmp/qmse-completion-control/performance.json`: baseUrl must equal `http://127.0.0.1:55443`, token must be a freshly obtained local token, and lawyerId must identify a synthetic local fixture. No such token is packaged. The script performs 2 VUs/15 seconds against four real API read endpoints. Its summary path is hard-coded under completion-20261008/evidence: run in a fresh clone or make a separate output-path copy before later runs so original reports are not overwritten.

```sh
k6 run qmse-output/completion-20261008/audit/postgres-smoke.k6.js
```

## Evidence and CI

The published commit contains reusable scripts and tests. The final DOCX/PDF, native logs, coverage/scanner/load reports and screenshots are supplied in `SE3110_GR42_Completed_Evidence_Package.zip`, not committed. Runtime caches/dependencies and private control state are excluded. Use a fresh output folder for each replay and preserve its exact timestamp/exit code.

The three source workflows have main/develop push filters and no workflow_dispatch, so the testing branch did not trigger CI. Managed CodeQL/Dependabot metadata does not establish additional runnable manual dispatch. Separate local patch proposals are untested/unpublished; applying/publishing them needs approval of a different SHA. No main/develop changes or CI pass claim was made.
