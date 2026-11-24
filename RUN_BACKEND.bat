@echo off
cd /d "%~dp0backend"
if not exist ".env" (
  echo Missing backend\.env. Copy .env.example to .env and set the required values.
  pause
  exit /b 1
)
if not exist node_modules call npm install
call npm start
pause
