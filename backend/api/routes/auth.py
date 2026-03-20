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


@router.post("/auth/signup")
async def signup(request: Request):
    data = await request.json()
    email = data.get("email")
    password = data.get("password")
    full_name = data.get("full_name")
    print("Signup data received:", data)

    if not email or not password or not full_name:
        raise HTTPException(status_code=400, detail="Email, password, and full name are required.")

    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

    # Check if user already exists
    existing_user = supabase.table("users").select("*").eq("email", email).execute()
    if existing_user.data:
        raise HTTPException(status_code=400, detail="User with this email already exists.")

    # Create new user
    new_user = supabase.table("users").insert({
        "email": email,
        "password": password,  # In production, hash the password!
        "full_name": full_name
    }).execute()

    if new_user.status_code != 201:
        raise HTTPException(status_code=500, detail="Failed to create user.")

    return {"message": "User created successfully."}

@router.post("/auth/login")
async def login(request: Request):
    data = await request.json()
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password are required.")

    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

    # Check if user exists
    user_response = supabase.table("users").select("*").eq("email", email).execute()
    if not user_response.data:
        raise HTTPException(status_code=400, detail="Invalid email or password.")

    user = user_response.data[0]

    # In production, verify the hashed password
    if user["password"] != password:
        raise HTTPException(status_code=400, detail="Invalid email or password.")

    # Create JWT token
    token_data = {
        "user_id": user["id"],
        "email": user["email"],
        "full_name": user["full_name"],
        "exp": datetime.utcnow() + timedelta(hours=24)  # Token expires in 24 hours
    }
    token = jwt.encode(token_data, SUPABASE_KEY, algorithm="HS256")

    return {"token": token}
