# PowerShell script to launch all 3 services in separate windows
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "Starting Intelligent Legal Service Platform" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

$root = $PSScriptRoot

Write-Host "Starting AI Service on port 8001..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\ai-service'; python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload"

Write-Host "Starting Backend API on port 5000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\backend\LegalService.API'; dotnet run --urls 'http://0.0.0.0:5000'"

Write-Host "Starting Frontend on port 5173..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\frontend'; npm run dev"

Write-Host "========================================================" -ForegroundColor Green
Write-Host "All services launched!" -ForegroundColor Green
Write-Host "Frontend:   http://localhost:5173" -ForegroundColor Green
Write-Host "Backend:    http://localhost:5000/swagger" -ForegroundColor Green
Write-Host "AI Service: http://localhost:8001" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
