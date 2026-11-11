@echo off
echo ========================================================
echo   Starting CINEVERSE AI Platform (Backend + Frontend)
echo ========================================================

start "CINEVERSE AI - Backend (FastAPI)" cmd /k "cd /d %~dp0backend && .venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000"
start "CINEVERSE AI - Frontend (Vite React)" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo Backend API : http://127.0.0.1:8000
echo Swagger Docs: http://127.0.0.1:8000/docs
echo Frontend App: http://localhost:5173
echo ========================================================

