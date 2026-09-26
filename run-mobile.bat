@echo off
echo ========================================================
echo Starting Flutter Mobile App in Chrome (Port 5500)
echo ========================================================
cd /d "%~dp0mobile"
flutter run -d chrome --web-port=5500
