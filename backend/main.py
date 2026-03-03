from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
from dotenv import load_dotenv

from api.routes import sales, forecasts, auth

load_dotenv()


# ==========================
# CREATE FASTAPI APP
# ==========================
app = FastAPI(
    title="Sales Forecasting API",
    version="1.0.0",
    description="Backend API for Sales Upload & Forecasting using Supabase"
)


# ==========================
# CORS CONFIGURATION
# ==========================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)


# ==========================
# CACHE CONTROL MIDDLEWARE
# ==========================
@app.middleware("http")
async def disable_cache(request: Request, call_next):
    response = await call_next(request)
    response.headers["Cache-Control"] = (
        "no-store, no-cache, must-revalidate, "
        "post-check=0, pre-check=0, max-age=0"
    )
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "-1"
    return response


# ==========================
# TOKEN EXTRACTION MIDDLEWARE
# ==========================
@app.middleware("http")
async def add_user_token(request: Request, call_next):
    """Extract and attach authorization token to request state"""
    auth_header = request.headers.get("Authorization", "")
    token = auth_header.replace("Bearer ", "") if auth_header else None
    request.state.token = token
    response = await call_next(request)
    return response


# ==========================
# REGISTER API ROUTES
# ==========================
app.include_router(auth.router, prefix="/api", tags=["Auth"])
app.include_router(sales.router, prefix="/api", tags=["Sales"])
app.include_router(forecasts.router, prefix="/api", tags=["Forecasts"])


# ==========================
# SERVE FRONTEND (SPA BUILD)
# ==========================
dist_dir = Path(__file__).parent.parent / "dist"

if dist_dir.exists():
    # Serve static assets
    assets_path = dist_dir / "assets"
    if assets_path.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_path)), name="assets")

    # Serve SPA (React/Vue/Angular)
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        file_path = dist_dir / full_path
        if file_path.is_file():
            return FileResponse(str(file_path))
        return FileResponse(str(dist_dir / "index.html"))


# ==========================
# RUN SERVER (LOCAL DEV)
# ==========================
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=False
    )
