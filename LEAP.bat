@echo off
setlocal
title LEAP
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\leap.ps1"
set "leap_result=%errorlevel%"
echo.
pause
exit /b %leap_result%
