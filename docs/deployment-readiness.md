# Deployment preparation

This repository contains deployment configuration, not live deployment evidence. Use the URLs and credentials assigned by your hosting accounts. Never put secrets in a VITE_ variable, Flutter asset, source file, or Docker image.

## Build and configure

Build all three containers from the repository root:

```sh
docker build -f backend/LegalService.API/Dockerfile -t legal-api .
docker build -f ai-service/Dockerfile.main -t legal-ai-main .
docker build -f ai-service/Dockerfile.recommendation -t legal-ai-recommendation .
```

The backend requires the variables in `backend/LegalService.API/.env.example` as platform environment variables. `ConnectionStrings__DefaultConnection` is an Npgsql connection string with TLS enabled. Apply EF Core migrations to an isolated new database before starting the API:

```sh
dotnet ef database update --project backend/LegalService.API --startup-project backend/LegalService.API
```

Run the main AI container with `AI_STATE_STORE=backend`, `BACKEND_API_URL` set to the HTTPS ASP.NET URL, and the same `AI_SERVICE_API_KEY` as ASP.NET. Configure the recommendation container with `AI_INTERNAL_KEY` matching backend `Ai__InternalKey`. Both Python containers need `GEMINI_API_KEY`; they can use the same key. Set `AiService__BaseUrl` and `Ai__BaseUrl` on ASP.NET to the respective HTTPS Python service URLs. The main AI service calls `/internal/ai-state` on ASP.NET for persistent chat and scheduling state. This state and production uploaded documents reside in PostgreSQL. Local development retains JSON state and filesystem uploads.

The ASP.NET `/health` and both Python `/health` endpoints are process liveness probes. ASP.NET Swagger is enabled with `Swagger__Enabled=true` at `/swagger/index.html`. Restrict browser CORS with `Cors__Origins__0`. No client needs a Python URL or internal key.

Deploy the React site with project root `frontend`, build command `npm run build`, output directory `dist`, and `VITE_API_URL` set to the HTTPS ASP.NET URL. `frontend/vercel.json` routes SPA deep links to `index.html`.

Prepare Flutter configuration with `cp mobile/.env.example mobile/.env`; then build an APK with:

```sh
cd mobile
flutter build apk --release --dart-define=BACKEND_URL=https://your-api.example
```

The release build requires an HTTPS API URL. Optional release-signing environment variables are `RELEASE_STORE_FILE`, `RELEASE_STORE_PASSWORD`, `RELEASE_KEY_ALIAS`, and `RELEASE_KEY_PASSWORD`. Without them, the campus APK uses the Android debug key. Do not commit a keystore or its password. The release manifest disables cleartext HTTP.

## Verify before submission

Check Swagger and health URLs in an incognito browser, run a fresh migration against an empty test database, upload and download a document, restart the API and main AI service, verify document and chat/scheduling state survive, then complete one mobile-to-web approval workflow. Record real results and links in the consolidated report. Production storage uses PostgreSQL `bytea` for documents up to 10 MB; monitor database capacity. Existing files stored only on a development filesystem need a one-time migration or re-upload.
