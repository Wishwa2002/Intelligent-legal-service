@echo off
echo ========================================================
echo Starting Intelligent Legal Service Platform
echo ========================================================

set ROOT=%~dp0

echo Starting AI Service on port 8001...
if exist "%ROOT%ai-service\venv\Scripts\python.exe" (
    start "AI Service" cmd /k "cd /d "%ROOT%ai-service" && "%ROOT%ai-service\venv\Scripts\python.exe" -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload"
) else (
    start "AI Service" cmd /k "cd /d "%ROOT%ai-service" && python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload"
)

echo Starting Backend API on port 5000...
start "Backend API" cmd /k "cd /d "%ROOT%backend\LegalService.API" && dotnet run --launch-profile http"

echo Starting Frontend on port 5173...
start "Frontend" cmd /k "cd /d "%ROOT%frontend" && npm run dev"

echo ========================================================
echo All services launched!
echo Frontend:   http://localhost:5173
echo Backend:    http://localhost:5000/swagger
echo AI Service: http://localhost:8001
echo ========================================================
