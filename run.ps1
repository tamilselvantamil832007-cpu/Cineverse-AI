Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  Starting CINEVERSE AI Platform (Backend + Frontend)   " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

Start-Process cmd -ArgumentList "/k cd /d `"$PSScriptRoot\backend`" && .venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000"
Start-Process cmd -ArgumentList "/k cd /d `"$PSScriptRoot\frontend`" && npm run dev"

Write-Host ""
Write-Host "Backend API : http://127.0.0.1:8000" -ForegroundColor Green
Write-Host "Swagger Docs: http://127.0.0.1:8000/docs" -ForegroundColor Green
Write-Host "Frontend App: http://localhost:5173" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Cyan

