@echo off
title Reusable POS - Laravel API Backend
echo ========================================================
echo   Starting Reusable POS Backend (Laravel PHP)
echo   Listening at: http://127.0.0.1:8000
echo ========================================================
cd /d "%~dp0backend"
php artisan serve --host=127.0.0.1 --port=8000
pause

