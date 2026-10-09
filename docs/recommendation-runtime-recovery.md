# Recommendation runtime recovery — 4 October 2026

The supplied screenshot shows the controlled AI interpretation error. Inspection confirmed two local runtime problems: no service was listening on recommendation port 8002, and the scheduling-task backend restart used plain `dotnet run`, bypassing the project's private AI configuration launcher. Both appsettings files intentionally have no stored internal key.

The backend was restarted through `scripts/start-member1-local.py`, together with the recommendation service and frontend. The launcher reads the existing ignored dotenv file, supplies the identical private key to Python and ASP.NET through process environments, and uses the existing configured model. No credentials, model, recommendation logic or scheduling rules were changed.

Verified:

- Frontend on 5173: HTTP 200.
- Recommendation `/health` on 8002: HTTP 200.
- Missing internal key on recommendation POST: rejected with HTTP 401 before any classifier call.
- Actual backend and Python process environments contain the intended matching internal key; only comparison booleans were printed.
- Authenticated backend recommendation workflow GET reaches the controller and returns the expected 404 for an unknown ID.
- Startup, recommendation snapshot/authentication and Gemini error-handling tests: 13 passed, using mocked provider calls.

No live Gemini classification was submitted, so successful provider interpretation is not claimed. The earlier provider-quota diagnosis in `member1-recommendation-503-debug.md` remains historical evidence, not a new quota check. The local configuration/connectivity failure is repaired; reload the frontend and use Retry Analysis to test the user's requirement.

For future local startup, use the existing launcher, preserving its private configuration mapping:

```sh
ai-service/.venv/bin/python scripts/start-member1-local.py --check
# Stop selected running services before starting replacements.
ai-service/.venv/bin/python scripts/start-member1-local.py --services backend recommendation frontend
```

All three selected services were left running. The separate document-agent service on 8001 is outside this recommendation request path.

## Follow-up: completed unsupported interpretation

The subsequent screenshot shows completed interpretation of a bank-transaction-scam requirement, followed by an unsupported catalog outcome. This is distinct from an AI-service failure: no category was identified, so lawyer retrieval, availability and ranking did not run. The current catalog contains Corporate & Commercial Law, Criminal Law, Real Estate & Property Law, Labour & Employment Law and Tax Law. No category, lawyer or schedule was added or forced to match this requirement.

Confirmed recommendation outcomes now take precedence over a lingering request/loading flag in `recommendationProgress.ts` and `RecommendationWorkflowProgress.tsx`. The unsupported state retains its two confirmed stages, stops at catalog validation, and displays `UNSUPPORTED` / `2 of 9 stages complete`.

Verification: frontend build and focused lint passed; 23 recommendation browser tests and 19 route/render tests passed. Tests cover submission, reload, unsupported outcomes and completed results with a stale loading flag. A read-only browser check of an actual saved Development unsupported workflow also showed `UNSUPPORTED` and `2 of 9 stages complete`; screenshot: `docs/evidence/recurring-scheduling/unsupported-progress-live.png`. No new Gemini call or business-data write was made.
