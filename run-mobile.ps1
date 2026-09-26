# Launch Flutter mobile app in Chrome
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "Starting Flutter Mobile App in Chrome (Port 5500)" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

$root = $PSScriptRoot
Set-Location "$root\mobile"
flutter run -d chrome --web-port=5500
