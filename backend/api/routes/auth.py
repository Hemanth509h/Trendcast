from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime, timedelta, timezone
import os
from jose import JWTError, jwt
import bcrypt
from typing import Optional
import uuid
import re
from ..database import users_collection

router = APIRouter()

# ==========================
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
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

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
    
    user_data = {
        "id": user_id,
        "email": req.email.lower(),
        "hashed_password": hashed_password,
        "full_name": req.full_name.strip(),
        "email_verified": True,  # Automatically verified
        "verification_token": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    
    try:
        await users_collection.insert_one(user_data)
    except Exception as e:
        print(f"ERROR in register: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to create user in database: {str(e)}"
        )
    
    # Generate token (verified user)
    access_token = create_access_token(data={"sub": user_id, "verified": True})
    
    print(f"[REGISTER] User {req.email} registered and verified automatically")
    
    return AuthResponse(
        access_token=access_token,
        user={
            "id": user_id,
            "email": user_data["email"],
            "full_name": user_data["full_name"],
            "email_verified": True,
            "message": "Account created successfully!"
        }
    )

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
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
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
