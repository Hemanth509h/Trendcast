from fastapi import APIRouter, HTTPException, Depends, Request
<<<<<<< HEAD
from pydantic import BaseModel, EmailStr
from supabase import create_client, Client
import os
from dotenv import load_dotenv
import jwt
from datetime import datetime, timedelta
import json


load_dotenv()
=======
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime, timedelta
import os
from jose import JWTError, jwt
import bcrypt
from typing import Optional
import uuid
import secrets
import re
from ..database import users_collection
>>>>>>> hemanth

router = APIRouter()

# ==========================
<<<<<<< HEAD
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
=======
# AUTH CONFIG
# ==========================
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

# ==========================
# HELPER FUNCTIONS
# ==========================
def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against hash"""
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    """Hash password"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def validate_password(password: str) -> tuple[bool, str]:
    """Validate password strength"""
    if len(password) < 8:
        return False, "Password must be at least 8 characters"
    if not re.search(r"[A-Z]", password):
        return False, "Password must contain at least one uppercase letter"
    if not re.search(r"[a-z]", password):
        return False, "Password must contain at least one lowercase letter"
    if not re.search(r"[0-9]", password):
        return False, "Password must contain at least one number"
    return True, "Password is valid"

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def generate_verification_token() -> str:
    """Generate a random verification token"""
    return secrets.token_urlsafe(32)

def format_user_response(user: dict) -> dict:
    """Format user data for response (exclude sensitive fields)"""
    return {
        "id": user.get("id"),
        "email": user.get("email"),
        "full_name": user.get("full_name"),
        "email_verified": user.get("email_verified", False),
        "created_at": user.get("created_at"),
    }

# ==========================
# REQUEST MODELS
# ==========================
class SignUpRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: str = Field(..., min_length=1)

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class VerifyEmailRequest(BaseModel):
    email: EmailStr
    verification_token: str

class PasswordResetRequest(BaseModel):
    email: EmailStr

class UpdatePasswordRequest(BaseModel):
    old_password: str
    new_password: str = Field(..., min_length=8)

class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = None

class AuthResponse(BaseModel):
    access_token: str
    user: dict

class MessageResponse(BaseModel):
    message: str

# ==========================
# SIGNUP ENDPOINT
# ==========================
@router.post("/auth/register", response_model=AuthResponse)
async def register(req: SignUpRequest):
    """Register a new user with email verification"""
    
    # Validate password strength
    is_valid, message = validate_password(req.password)
    if not is_valid:
        raise HTTPException(status_code=400, detail=message)
    
    # Check if user already exists
    existing_user = await users_collection.find_one({"email": req.email.lower()})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered. Please login or use a different email.")
    
    # Validate full name
    if not req.full_name or len(req.full_name.strip()) == 0:
        raise HTTPException(status_code=400, detail="Full name is required")
    
    user_id = str(uuid.uuid4())
    hashed_password = get_password_hash(req.password)
    verification_token = generate_verification_token()
    
    user_data = {
        "id": user_id,
        "email": req.email.lower(),
        "hashed_password": hashed_password,
        "full_name": req.full_name.strip(),
        "email_verified": False,  # User must verify email
        "verification_token": verification_token,
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
    }
    
    try:
        await users_collection.insert_one(user_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to create user. Please try again.")
    
    # Generate token (unverified user can still access with limitations)
    access_token = create_access_token(data={"sub": user_id, "verified": False})
    
    # In production, send verification email here
    # For now, we log it for testing
    print(f"[VERIFICATION] User {req.email} - Token: {verification_token}")
    
    return AuthResponse(
        access_token=access_token,
        user={
            "id": user_id,
            "email": user_data["email"],
            "full_name": user_data["full_name"],
            "email_verified": False,
            "message": f"Account created! Verification token: {verification_token}"
        }
    )

# ==========================
# VERIFY EMAIL ENDPOINT
# ==========================
@router.post("/auth/verify-email", response_model=MessageResponse)
async def verify_email(req: VerifyEmailRequest):
    """Verify user email with token"""
    
    user = await users_collection.find_one({"email": req.email.lower()})
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.get("email_verified"):
        raise HTTPException(status_code=400, detail="Email already verified")
    
    if user.get("verification_token") != req.verification_token:
        raise HTTPException(status_code=401, detail="Invalid verification token")
    
    # Update user to verified
    await users_collection.update_one(
        {"id": user["id"]},
        {"$set": {
            "email_verified": True,
            "verification_token": None,  # Clear token after use
            "updated_at": datetime.utcnow().isoformat()
        }}
    )
    
    return MessageResponse(message="Email verified successfully! You can now login.")

# ==========================
# LOGIN ENDPOINT
# ==========================
@router.post("/auth/login", response_model=AuthResponse)
async def login(req: LoginRequest):
    """Login user with email and password"""
    
    try:
        user = await users_collection.find_one({"email": req.email.lower()})
    except Exception as e:
        raise HTTPException(status_code=500, detail="Database error")
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not verify_password(req.password, user.get("hashed_password", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Warning if email not verified (but still allow login for now)
    email_verified = user.get("email_verified", False)
    
    access_token = create_access_token(
        data={"sub": user["id"], "verified": email_verified}
    )
    
    return AuthResponse(
        access_token=access_token,
        user=format_user_response(user)
    )

# ==========================
# GET CURRENT USER ENDPOINT
# ==========================
@router.get("/auth/me")
async def get_current_user(request: Request):
    """Get current authenticated user"""
    
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="No authentication token provided")
    
    token = auth_header.split(" ")[1]
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    try:
        user = await users_collection.find_one({"id": user_id})
    except Exception:
        user = None
    
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    return {"user": format_user_response(user)}

# ==========================
# UPDATE PROFILE ENDPOINT
# ==========================
@router.put("/auth/profile")
async def update_profile(req: UpdateProfileRequest, request: Request):
    """Update user profile"""
    
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="No authentication token provided")
    
    token = auth_header.split(" ")[1]
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    update_data = {}
    if req.full_name:
        update_data["full_name"] = req.full_name.strip()
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    update_data["updated_at"] = datetime.utcnow().isoformat()
    
    result = await users_collection.update_one(
        {"id": user_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    user = await users_collection.find_one({"id": user_id})
    return {"user": format_user_response(user), "message": "Profile updated successfully"}

# ==========================
# LOGOUT ENDPOINT
# ==========================
@router.post("/auth/logout", response_model=MessageResponse)
async def logout(request: Request):
    """Logout user"""
    # In a stateless JWT system, logout is handled client-side by removing the token
    return MessageResponse(message="Logged out successfully")

# ==========================
# RESEND VERIFICATION EMAIL
# ==========================
@router.post("/auth/resend-verification")
async def resend_verification(email: EmailStr):
    """Resend verification email"""
    
    user = await users_collection.find_one({"email": email.lower()})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.get("email_verified"):
        raise HTTPException(status_code=400, detail="Email already verified")
    
    # Generate new token
    verification_token = generate_verification_token()
    
    await users_collection.update_one(
        {"id": user["id"]},
        {"$set": {"verification_token": verification_token}}
    )
    
    print(f"[VERIFICATION] Resend for {email} - Token: {verification_token}")
    
    return MessageResponse(
        message=f"Verification token sent. Token: {verification_token}"
    )

# ==========================
# DEPENDENCY FOR PROTECTED ROUTES
# ==========================
async def get_current_user_id(request: Request) -> str:
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="No token provided")
    
    token = auth_header.split(" ")[1]
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user_id
    except JWTError:
        raise HTTPException(status_code=401, detail="Unauthorized")
>>>>>>> hemanth
