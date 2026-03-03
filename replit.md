# TrendCast - Sales Forecasting App

## Overview
TrendCast is a full-stack web application for uploading, visualizing, and forecasting sales data. Users can upload CSV/Excel sales data, view records in a data grid, and generate time-series forecasts using SARIMA/Exponential Smoothing models.

## Architecture

- **Frontend**: React (Vite), running on port 5000
- **Backend**: FastAPI (Python), running on port 8000
- **Database/Auth**: Supabase (cloud-hosted PostgreSQL + auth)

## Project Structure

```
/
├── src/                   # React frontend source
│   ├── page/              # Page components (Landing, SalesData, Forecasts, AuthModal)
│   ├── ui/                # Shared UI components (sidebar, toast, dialog)
│   └── utils/api.js       # API helper with auth token support
├── backend/               # FastAPI backend
│   ├── main.py            # App entry point, CORS config, middleware
│   ├── api/routes/        # Route handlers
│   │   ├── auth.py        # Signup, login, logout, /me endpoints
│   │   ├── sales.py       # Upload, get, add/delete record, export
│   │   └── forecasts.py   # SARIMA forecast generation and retrieval
│   └── Walmart_Sales_Dataset.csv  # Sample dataset
├── vite.config.js         # Vite config with proxy to backend (port 8000)
├── index.html             # App entry HTML
└── package.json
```

## Workflows

- **Start application**: `npm run dev` — Vite dev server on port 5000 (webview)
- **Backend API**: `cd backend && python main.py` — FastAPI/uvicorn on port 8000 (console)

## Development

Frontend proxies `/api` requests to `http://127.0.0.1:8000` via Vite proxy config.

## Deployment

- Build: `npm run build` (produces `dist/`)
- Run: `gunicorn` with UvicornWorker serving `backend.main:app` on port 8000
- The FastAPI backend serves the React SPA build from `dist/` in production

## Environment Variables

The app uses Supabase for authentication and data storage. Supabase URL and anon key are currently hardcoded in the route files but can be overridden via:
- `SUPABASE_URL`
- `SUPABASE_KEY`
- `SUPABASE_JWT_SECRET`

## Dependencies

- Python: fastapi, uvicorn, gunicorn, pandas, numpy, scikit-learn, statsmodels, supabase, PyJWT
- Node: react, vite, chart.js, react-chartjs-2, framer-motion, lucide-react, wouter
