# PowerShell script to launch all 3 services in separate windows
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "Starting Intelligent Legal Service Platform" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

$root = $PSScriptRoot

Write-Host "Starting AI Service on port 8001..." -ForegroundColor Yellow
$aiPython = "$root\ai-service\venv\Scripts\python.exe"
if (-not (Test-Path $aiPython)) { $aiPython = "python" }
Start-Process cmd.exe -ArgumentList "/k", "title AI Service && cd /d `"$root\ai-service`" && `"$aiPython`" -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload"

Write-Host "Starting Backend API on port 5000..." -ForegroundColor Yellow
Start-Process cmd.exe -ArgumentList "/k", "title Backend API && cd /d `"$root\backend\LegalService.API`" && dotnet run --launch-profile http"

Write-Host "Starting Frontend on port 5173..." -ForegroundColor Yellow
Start-Process cmd.exe -ArgumentList "/k", "title Frontend && cd /d `"$root\frontend`" && npm run dev"

Write-Host "========================================================" -ForegroundColor Green
Write-Host "All services launched!" -ForegroundColor Green
Write-Host "Frontend:   http://localhost:5173" -ForegroundColor Green
Write-Host "Backend:    http://localhost:5000/swagger" -ForegroundColor Green
Write-Host "AI Service: http://localhost:8001" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
