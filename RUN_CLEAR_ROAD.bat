@echo off
setlocal EnableExtensions
cd /d "%~dp0"

where node >nul 2>&1
if errorlevel 1 (
  echo.
  echo [RUN_CLEAR_ROAD] Node.js not found in PATH.
  echo Install the LTS build from https://nodejs.org and run this file again.
  echo.
  pause
  exit /b 1
)

where npx >nul 2>&1
if errorlevel 1 (
  echo.
  echo [RUN_CLEAR_ROAD] npx not found. Reinstall Node.js ^(npm/npx must be included^).
  echo.
  pause
  exit /b 1
)

if not exist "dist\index.html" (
  echo.
  echo [RUN_CLEAR_ROAD] dist\index.html is missing.
  echo Build first:  node scripts\build.mjs
  echo.
  pause
  exit /b 1
)

echo [TZ-1] ---- Окружение (см. scripts\build.mjs, шапка ТЗ-1) ----
echo   - Не открывать index.html через file:// — только HTTP (этот скрипт поднимает сервер).
echo   - Свой ключ Maps: задайте CLEAR_ROAD_MAPS_API_KEY при сборке или src\secrets\maps-api-key.txt
echo   - В консоли браузера: ?cr_selfcheck=1  — таблица диагностики
echo [TZ-1] ----------------------------------------------------------
echo.

echo.
echo [RUN_CLEAR_ROAD] http://localhost:3000  —  folder: dist\
echo Browser will open automatically. Close this window to stop the server.
echo If port 3000 is busy, edit -p in this .bat or run: npx --yes http-server "./dist" -p 8765 -c-1 -o
echo.

npx --yes http-server "./dist" -p 3000 -c-1 -o
set "HR=%ERRORLEVEL%"
if not "%HR%"=="0" (
  echo.
  echo [RUN_CLEAR_ROAD] Server failed ^(exit %HR%^). Check firewall, port 3000 in use, or network for npx.
  echo.
  pause
  exit /b %HR%
)

endlocal
