# CINEVERSE AI — Smart Cinema Booking Platform

## Stack
- React + Vite frontend
- FastAPI backend
- SQLite + SQLAlchemy
- Explainable AI-style services: content-based recommendations, seat scoring, crowd forecast baseline, demand-based demo pricing
- QR e-ticket generation

## Run locally

### Backend (Terminal 1)
```bash
cd backend
python -m venv .venv
# Windows PowerShell:
.venv\Scripts\Activate.ps1
# Windows CMD:
.venv\Scripts\activate.bat
pip install -r requirements.txt
uvicorn app.main:app --reload
```
API: http://127.0.0.1:8000  
Swagger: http://127.0.0.1:8000/docs

### Frontend (Terminal 2)
```bash
cd frontend
npm install
npm run dev
```
App: http://localhost:5173

## AI features included
1. Movie recommendation: content-based similarity from genres, language and rating.
2. Smart seats: scores seats by center preference, distance from screen and adjacency.
3. Crowd prediction: transparent baseline estimate based on show time, day and sample historical occupancy. It is a demo estimate, not a trained production model.
4. Dynamic pricing: transparent demo multiplier based on predicted demand, bounded to avoid extreme prices.
5. Admin analytics: booking count, revenue, seat occupancy and movie popularity.
6. QR tickets: generated for confirmed demo bookings.

## Demo limitations
- No real payment is collected.
- Sample movies, theatres and history are demonstration data.
- The crowd forecast should be retrained and evaluated using real historical booking data before operational use.
- Add real authentication, authorization, rate limiting, payment-provider integration, database migrations, secure deployment and concurrency-safe seat inventory before production.
