from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel, EmailStr
from supabase import create_client, Client
import os
from dotenv import load_dotenv
import jwt
from datetime import datetime, timedelta
import json

load_dotenv()

router = APIRouter()

# ==========================
# SUPABASE CONFIG
# ==========================
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://coztxkaoyxphgvoulbel.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvenR4a2FveXhwaGd2b3VsYmVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxOTI3MTEsImV4cCI6MjA4Nzc2ODcxMX0.Pa8rf_fFIAaIj0wiDGLoi11qP9mRqJl8YP7Qbt3ojkU")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "your-jwt-secret-key")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


# ==========================
# REQUEST MODELS
# ==========================
class SignUpRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    access_token: str
    user: dict


# ==========================
# SIGNUP ENDPOINT
# ==========================
@router.post("/auth/signup", response_model=AuthResponse)
async def signup(req: SignUpRequest):
    try:
        # Create user in Supabase Auth (pass dict payload per client API)
        auth_response = supabase.auth.sign_up({"email": req.email, "password": req.password})

        # Debug: log raw response shape (helps diagnose 500s)
        print("[auth.signup] raw response:", auth_response)

        # Parse response (support both dict-style and attribute-style responses)
        user_obj = None
        session_obj = None
        if isinstance(auth_response, dict):
            # supabase-py sometimes returns {'data': {...}, 'error': ...}
            data = auth_response.get("data") or auth_response.get("user") or {}
            # Try common keys
            user_obj = data.get("user") if isinstance(data, dict) else None
            session_obj = data.get("session") if isinstance(data, dict) else None
            # fallback top-level
            if not user_obj and auth_response.get("user"):
                user_obj = auth_response.get("user")
            if not session_obj and auth_response.get("session"):
                session_obj = auth_response.get("session")
        else:
            # Attribute-style (older client)
            user_obj = getattr(auth_response, "user", None)
            session_obj = getattr(auth_response, "session", None)

        if not user_obj:
            raise HTTPException(status_code=400, detail="Failed to create user account")

        user_id = user_obj.get("id") if isinstance(user_obj, dict) else getattr(user_obj, "id", None)

        # Create user profile in database
        try:
            user_data = {
                "id": user_id,
                "email": req.email,
                "full_name": req.full_name or req.email.split("@")[0],
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat(),
            }
            supabase.table("users").upsert(user_data).execute()
        except Exception as db_err:
            print(f"[auth.signup] database error: {db_err}")
            # If user creation in Auth succeeded but DB profile failed, 
            # we might want to continue or handle it. For now, let's log.

        access_token = None
        if session_obj:
            access_token = session_obj.get("access_token") if isinstance(session_obj, dict) else getattr(session_obj, "access_token", None)

        return AuthResponse(
            access_token=access_token or "",
            user={
                "id": user_id,
                "email": req.email,
                "full_name": req.full_name,
            }
        )

    except Exception as e:
        # Log exception for debugging
        print("[auth.signup] exception:", repr(e))
        print("[auth.signup] exception str:", str(e))
        error_str = str(e).lower()
        if "already registered" in error_str or "user already exists" in error_str or "unique" in error_str:
            raise HTTPException(status_code=400, detail="Email already registered")
        # Return error details for debugging
        raise HTTPException(status_code=500, detail=f"Signup error: {str(e)}")


# ==========================
# LOGIN ENDPOINT
# ==========================
@router.post("/auth/login", response_model=AuthResponse)
async def login(req: LoginRequest):
    try:
        # Authenticate with Supabase (pass dict payload per client API)
        auth_response = supabase.auth.sign_in_with_password({"email": req.email, "password": req.password})
        print("[auth.login] raw response:", auth_response)

        # Parse response
        user_obj = None
        session_obj = None
        if isinstance(auth_response, dict):
            data = auth_response.get("data") or auth_response.get("user") or {}
            user_obj = data.get("user") if isinstance(data, dict) else None
            session_obj = data.get("session") if isinstance(data, dict) else None
            if not user_obj and auth_response.get("user"):
                user_obj = auth_response.get("user")
            if not session_obj and auth_response.get("session"):
                session_obj = auth_response.get("session")
        else:
            user_obj = getattr(auth_response, "user", None)
            session_obj = getattr(auth_response, "session", None)

        if not user_obj:
            raise HTTPException(status_code=401, detail="Invalid email or password")

        user_id = user_obj.get("id") if isinstance(user_obj, dict) else getattr(user_obj, "id", None)

        # Get user profile
        user_response = supabase.table("users").select("*").eq("id", user_id).execute()
        user_profile = None
        if isinstance(user_response, dict):
            data = user_response.get("data")
            user_profile = data[0] if data else None
        else:
            user_profile = getattr(user_response, "data", None)
            if user_profile:
                user_profile = user_profile[0] if isinstance(user_profile, list) and user_profile else None

        if not user_profile:
            user_profile = {
                "id": user_id,
                "email": req.email,
                "full_name": req.email.split("@")[0],
            }

        access_token = None
        if session_obj:
            access_token = session_obj.get("access_token") if isinstance(session_obj, dict) else getattr(session_obj, "access_token", None)

        return AuthResponse(access_token=access_token or "", user=user_profile)

    except Exception as e:
        print("[auth.login] exception:", repr(e))
        print("[auth.login] exception str:", str(e))
        raise HTTPException(status_code=401, detail="Invalid email or password")


# ==========================
# LOGOUT ENDPOINT
# ==========================
@router.post("/auth/logout")
async def logout(token: str):
    try:
        # Revoke session (optional - mainly client-side)
        return {"message": "Logged out successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Logout error: {str(e)}"
        )


# ==========================
# GET CURRENT USER ENDPOINT
# ==========================
@router.get("/auth/me")
async def get_current_user(request: Request):
    try:
        token = getattr(request.state, "token", None)
        if not token:
            raise HTTPException(status_code=401, detail="No token provided")

        # Verify token with Supabase
        print(f"[auth.me] verifying token: {token[:20]}...")
        try:
            possible = supabase.auth.get_user(token)
        except TypeError:
            possible = supabase.auth.get_user(access_token=token)

        print("[auth.me] raw get_user:", possible)

        user_obj = None
        if isinstance(possible, dict):
            user_obj = possible.get("data") or possible.get("user")
            if isinstance(user_obj, dict) and user_obj.get("user"):
                user_obj = user_obj.get("user")
        else:
            user_obj = getattr(possible, "user", None)

        if not user_obj:
            raise HTTPException(status_code=401, detail="Invalid token")

        user_id = user_obj.get("id") if isinstance(user_obj, dict) else getattr(user_obj, "id", None)

        # Get user profile
        user_response = supabase.table("users").select("*").eq("id", user_id).execute()

        if not user_response.data:
            raise HTTPException(status_code=404, detail="User not found")

        return {"user": user_response.data[0]}

    except HTTPException:
        raise
    except Exception as e:
        print(f"[auth.me] exception: {repr(e)}")
        raise HTTPException(status_code=401, detail="Unauthorized")


# ==========================
# DEPENDENCY FOR PROTECTED ROUTES
# ==========================
async def get_current_user_id(request: Request) -> str:
    """Dependency to inject user_id into protected routes"""
    token = getattr(request.state, "token", None)
    if not token:
        raise HTTPException(status_code=401, detail="No token provided")

    try:
        user = supabase.auth.get_user(token)
        if not user:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user.user.id
    except Exception as e:
        print(f"[get_current_user_id] exception: {repr(e)}")
        raise HTTPException(status_code=401, detail="Unauthorized")
