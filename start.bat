@echo off
echo ========================================================
echo Starting Intelligent Legal Service Platform
echo ========================================================

echo Starting AI Service on port 8001...
start "AI Service (FastAPI)" cmd /k "cd ai-service && python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload"

echo Starting Backend API on port 5000...
start "Backend API (.NET)" cmd /k "cd backend\LegalService.API && dotnet run --urls http://0.0.0.0:5000"

echo Starting Frontend on port 5173...
start "Frontend (Vite React)" cmd /k "cd frontend && npm run dev"

echo ========================================================
echo All services launched!
echo Frontend:   http://localhost:5173
echo Backend:    http://localhost:5000/swagger
echo AI Service: http://localhost:8001
echo ========================================================
