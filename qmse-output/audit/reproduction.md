# Safe reproduction

Use the actual checkout and dependencies shown in snapshot.json and repository-inventory.txt. New reusable tests are in backend/LegalService.Tests/Qmse*.cs and ai-service/tests/test_qmse_boundaries.py. Two existing HTTP fixture classes are made partial and register missing documentation/clerk services; application business logic is unchanged. Portable source copies and the existing-fixture patch are retained.

Do not set the integration-test connection variables to a deployed database. Create a new disposable loopback PostgreSQL cluster and set QMSE_ISOLATED_POSTGRES to its maintenance connection string. The runner maps it to the two integration-fixture variables; fixtures create/drop unique test databases in that dedicated cluster. The original cluster used port 55442 and synthetic role qmse_test. See database startup/init logs.

- Backend: dotnet restore LegalService.sln; run the exact command in backend-final.json with isolated database variables and --collect "XPlat Code Coverage".
- Frontend: npm ci; npm run test:member1; npm test -- --reporter=json,html. Install Playwright browsers first. Three opt-in live cases are skipped unless deliberately configured against an isolated environment.
- Mobile: flutter pub get; flutter test --machine. Final execution used official Flutter 3.47.6 sources/resources and matching cached test-engine artifacts because no complete SDK was installed; mobile-minimal.json records exact paths. A fresh full SDK installation is recommended for replay. flutter-events.jsonl contains genuine machine events (49 visible testDone successes and a successful done event).
- AI: use ai-service requirements in a venv; pytest tests --junitxml=... . The runner disables real environment AI keys/dotenv and supplies an intentionally invalid synthetic key for provider construction in mocked tests. Do not count these as live Gemini calls.
- Security/load: start the opt-in Qmse_LocalEvidenceHost with QMSE_START_EVIDENCE_HOST=1 and a temporary QMSE_HOST_CONTROL path. It expires automatically. Use passive_scan.py and local-smoke.k6.js; inspect their loopback guards. ZAP 2.17.0 and k6 2.3.0 were used. No active scan/spider was run. Synthetic temporary host tokens are excluded from deliverables.

run_command.py writes timestamped logs and structured exit codes; inspect timed_out as well as exit_code because Flutter can exit 0 on SIGTERM. Initial failures and final retries are distinguished in the summaries. Public CI metadata is historical only; no new CI run/push occurred.
