# TrendCast

## Overview
A React-based sales data visualization and forecasting application built with Vite (frontend) and Flask (backend).

## Project Structure
- `/src` - Frontend source code (React)
  - `/page` - Page components (salesdata, forecasts)
  - `/ui` - UI components (sidebar, button)
  - `/utils` - Utility functions (api.js)
  - `App.jsx` - Main application component
  - `main.jsx` - Entry point
- `/backend` - Backend source code (Flask)
  - `main.py` - Flask app entry point (port 8000)
  - `/routes` - API route blueprints (sales, forecasts)
  - `data.json` - Backend data file
- `/public` - Static assets
- `index.html` - HTML entry point
- `vite.config.js` - Vite configuration (proxies /api to local backend on port 8000)

## Tech Stack
- React 19, Vite 7, Tailwind CSS, Chart.js (frontend)
- Flask, Pandas, NumPy, scikit-learn (backend)

## Development
- Frontend: Vite dev server on port 5000 (workflow: "Start application")
- Backend: Flask dev server on port 8000 (workflow: "Start backend")
- Vite proxies `/api` requests to the Flask backend at localhost:8000

## Build
Run `npm run build` to create a production build.

## Recent Changes
- Migrated from external deployment to Replit environment
- Updated Vite proxy from external Render URL to local Flask backend (localhost:8000)
- Configured two workflows: frontend (port 5000) and backend (port 8000)
