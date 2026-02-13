# TrendCast

## Overview
A React-based sales data visualization and forecasting application built with Vite (frontend) and FastAPI (backend).

## Project Structure
- `/src` - Frontend source code (React)
  - `/page` - Page components (salesdata, forecasts)
  - `/ui` - UI components (sidebar, button)
  - `/utils` - Utility functions (api.js)
  - `App.jsx` - Main application component
  - `main.jsx` - Entry point
- `/backend` - Backend source code (FastAPI)
  - `main.py` - FastAPI app entry point (port 8000)
  - `/api` - API route modules (sales, forecasts)
  - `data.json` - Backend data file
- `/public` - Static assets
- `index.html` - HTML entry point
- `vite.config.js` - Vite configuration (proxies /api to local backend on port 8000)

## Tech Stack
- React 19, Vite 7, Tailwind CSS, Chart.js (frontend)
- FastAPI, Pandas, NumPy, scikit-learn (backend)

## Development
- Frontend: Vite dev server on port 5000 (workflow: "Start application")
- Backend: Uvicorn dev server on port 8000 (workflow: "Start backend")
- Vite proxies `/api` requests to the FastAPI backend at localhost:8000

## Build
Run `npm run build` to create a production build.

## Recent Changes
- Migrated from external deployment to Replit environment
- Installed Node.js and Python dependencies
- Configured Vite dev server and FastAPI backend workflows
- Updated deployment configuration for autoscale
