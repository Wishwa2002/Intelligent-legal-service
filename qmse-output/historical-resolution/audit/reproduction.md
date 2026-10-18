# Reproduce the historical-resolution tests

New test files are AI-assisted and **not in the published SHA**. No publish is authorised. Use a fresh working copy and new output directory; do not overwrite the delivered run logs. Keep credentials/browser state in private temporary files, never in this package.

1. Clone `https://github.com/Wishwa2002/Intelligent-legal-service.git`, switch `se3110-qmse-testing`, then verify `git rev-parse HEAD` equals `05359214df52fa743b234e1d77e6671f57c14dea`.
2. Copy `source-snapshot/` preserving its repository-relative paths. Copy the historical-resolution `audit/` scripts and initial inventory into the fresh clone output location. Check `audit/source-overlay.json` hashes. The application source remains the published baseline; new files add tests only.
3. Install .NET 8, Node, Flutter, Python requirements and PostgreSQL. This recorded run used macOS ARM64, PostgreSQL 18 binaries at `/opt/homebrew/opt/postgresql@18/bin`, the existing AI venv, and a recovered Flutter SDK in `/private/tmp/qmse-flutter-source`. Adapt tool paths, not case expectations, on another host. The logged dependency restore initially failed due NuGet transport; offline cached restore succeeded. No runtime dependencies/caches are bundled.
4. Inspect `audit/start_isolated.py`. It creates **only a nonexistent fresh** `/private/tmp/qmse-history-pg` cluster, database/user `qmse_history`, loopback port 55546, TLS with a new temporary certificate. It refuses an existing path; do not reset/reuse a production cluster. On rerun use a fresh owned path or fresh disposable host. Local trust is test-only, not deployment guidance. Local synthetic password/JWT keys are generated privately. Backend/AI/React ports are 55543/55544/55547. Provider credentials are disabled for deterministic executions.
5. Build backend first; launch the supervisor in a dedicated terminal. Apply actual migrations using `dotnet-ef database update --project backend/LegalService.API --startup-project backend/LegalService.API --connection 'Host=127.0.0.1;Port=55546;Database=qmse_history;Username=qmse_history;SSL Mode=Require'`. The actual log is `evidence/migrate.log` (15 migrations). Never point this command at production.
6. Set `QMSE_HISTORY_POSTGRES` to that exact isolated connection and `QMSE_HISTORY_PASSWORD` privately from generated settings. Execute startup seeders through `HistoricalPostgresSetupTests.BootstrapActualStartupSeeders`. Connection assertions deliberately test the historical 200 ms limit; the delivered first cold result failed at 349.529 ms. The test guards host/port/database before access.
7. Run `backend/LegalService.Tests/historical_api_replay.py` with the AI venv. It prepares synthetic lawyers, working hours, customers, bookings, career, clerks, actual service-1 requests and PDF inputs. Save its ordered redacted HTTP and database records. It requires an initially fresh fixture database; do not rerun blindly against existing seed records. Script exit 0 means replay completed, **not** every acceptance passed.
8. Prepare the real 2026-10-15 14:00 synthetic lawyer-2 booking through the API as shown in `evidence/duplicate-precondition.json`, then run the EF duplicate fact. Run `audit/additional_api.py` and `audit/timezone.cjs` for the historical bridge and two-zone conflict. Exact old native command lines, working directories, dates and exits are in `test-results/*.json`.

Native commands from repository root (choose fresh result filenames):

```sh
dotnet test backend/LegalService.Tests/LegalService.Tests.csproj --filter FullyQualifiedName~HistoricalCaseVerificationTests --logger 'trx;LogFileName=password-cost.trx' --results-directory qmse-output/historical-resolution/evidence
# Requires private isolated connection/password variables:
dotnet test backend/LegalService.Tests/LegalService.Tests.csproj --filter FullyQualifiedName~HistoricalPostgresSetupTests --logger 'trx;LogFileName=postgres-setup.trx' --results-directory qmse-output/historical-resolution/evidence
dotnet test backend/LegalService.Tests/LegalService.Tests.csproj --filter FullyQualifiedName~HistoricalSlotConstraintTests --logger 'trx;LogFileName=ef-duplicate.trx' --results-directory qmse-output/historical-resolution/evidence
cd frontend
npx playwright test --config historical.playwright.config.ts --reporter=json
cd ../mobile
flutter test --no-pub --machine test/historical_cases_test.dart
cd ../ai-service
PYTHON_DOTENV_DISABLED=1 HF_HUB_OFFLINE=1 TRANSFORMERS_OFFLINE=1 GEMINI_API_KEY=qmse-synthetic-not-a-real-provider-key .venv/bin/python -m pytest -s tests/test_historical_acceptance.py --junitxml=../qmse-output/historical-resolution/evidence/ai-retrieval.xml
```

The historical requirements deliberately remain asserted; failing commands are genuine outcomes, not defects to bypass. New final native distinct totals are 23 (12 pass, 11 fail), separate from earlier 607 passing baseline cases. UI fixtures, storage fixtures and partial AI helpers are explicitly labelled in source and results. Raw-retrieval disclaimer diagnostic does not verify generated consultation output.

For actual Flutter web/catalogue and React clerk review, configure isolated API CORS for 55547 and 55548 (the recorded config-only replacement script is `audit/restart_api.py`), build Flutter web with `--dart-define=BACKEND_URL=http://127.0.0.1:55543`, serve `mobile/build/web` at 55548 and execute `audit/replay_assigned_ui.cjs`. This checks current assigned-review controls, not a full historical Deed/Approved success. Use private generated synthetic settings; tokens are redacted from logs.

Live calls are optional and require explicit available budget/credentials: the prior authorised limit was eight calls, cumulative counter now **two used**, remaining **six**. `audit/live_probe.py` disables SDK retries and increments the private counter before requesting. Preserve the cumulative counter when reproducing on this host; do not reset it to bypass the cap. The configured model returned 503; no successful live result was obtained. Do not run application agent chains with automatic retries without bounding their provider call count.

Shutdown: stop the replacement API, Flutter static server, then touch the supervisor's private `stop` file; its finally block terminates local children and stops the owned cluster. Do not kill unrelated processes. Cleanup evidence is retained separately.
