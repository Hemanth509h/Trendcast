# Backend

Contains the FastAPI backend for Trendcast.

How to run

```bash
cd backend
python -m uvicorn main:app --port 8000
```

Notes
- Configure Supabase credentials in `backend/.env`.
- API routes are under `backend/api/routes`.
