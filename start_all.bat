@echo off
title Reusable POS - Launcher
echo ========================================================
echo   Starting Reusable POS Fullstack Servers
echo ========================================================
echo 1. Launching Backend on http://127.0.0.1:8000 ...
start "POS Backend Server (Port 8000)" cmd /k "cd /d \"%~dp0backend\" && php artisan serve --host=127.0.0.1 --port=8000"
timeout /t 2 /nobreak >nul
echo 2. Launching Frontend on http://localhost:5173 ...
start "POS Frontend Dev (Port 5173)" cmd /k "cd /d \"%~dp0frontend\" && npm run dev"
echo ========================================================
echo   Both Servers Running!
echo   Frontend URL: http://localhost:5173
echo   Backend API:  http://127.0.0.1:8000
echo ========================================================
