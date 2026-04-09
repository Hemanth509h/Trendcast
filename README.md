# Trendcast

Sales forecasting web app (FastAPI backend + React frontend).

Quick start

1. Backend:
   ```bash
   cd backend
   python -m uvicorn main:app --port 8000
   ```
2. Frontend:
   ```bash
   npm install
   npm run dev
   ```

Environment
- Set Supabase credentials via backend/.env and frontend `.env.local` as needed.

Project layout
- `backend/` - FastAPI server and API routes
- `src/` - React frontend

For detailed instructions see README files in the subfolders.
