from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from supabase import create_client, Client
import os
import re

from app.database import get_db
from app.schemas.auth import RegisterRequest, LoginRequest
from app.models.profiles import Profile


router = APIRouter(prefix="/auth", tags=["Authentication"])


def set_auth_cookies(response: JSONResponse, access_token: str, refresh_token: str):
    is_prod = os.getenv("APP_ENV", "development") == "production"
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=is_prod,
        samesite="lax",
        path="/",
        max_age=60 * 60,
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=is_prod,
        samesite="lax",
        path="/",
        max_age=60 * 60 * 24 * 7,
    )


supabase: Client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_ROLE_KEY")
)


@router.post("/register")
def register(data: RegisterRequest, db: Session = Depends(get_db)):

    # 1. Validate username format
    username = data.username
    if not (3 <= len(username) <= 20):
        raise HTTPException(
            status_code=400,
            detail="Username must be between 3 and 20 characters long."
        )
    if not re.match(r'^[a-zA-Z]', username):
        raise HTTPException(
            status_code=400,
            detail="Username must start with a letter."
        )
    if username.endswith('_'):
        raise HTTPException(
            status_code=400,
            detail="Username cannot end with an underscore."
        )
    if not re.match(r'^[a-zA-Z0-9_]+$', username):
        raise HTTPException(
            status_code=400,
            detail="Username can only contain letters, numbers, and underscores (no spaces or special characters)."
        )

    # 2. Validate password length
    if len(data.password) < 8:
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 8 characters long."
        )

    # 3. Check username uniqueness case-insensitively
    existing_user = (
        db.query(Profile)
        .filter(func.lower(Profile.username) == func.lower(username))
        .first()
    )
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Username is already taken."
        )

    # 4. Check email uniqueness case-insensitively
    existing_email = (
        db.query(Profile)
        .filter(func.lower(Profile.email) == func.lower(data.email))
        .first()
    )
    if existing_email:
        raise HTTPException(
            status_code=400,
            detail="Email is already registered."
        )

    try:
        response = supabase.auth.admin.create_user({
            "email": data.email,
            "password": data.password,
            "email_confirm": True,
            "user_metadata": {
                "username": data.username
            }
        })

        return {
            "message": "User registered successfully",
            "user_id": response.user.id
        }

    except Exception as e:
        print("SUPABASE REGISTER ERROR:", repr(e))

        msg = str(e) or "Registration failed"
        if "User not allowed" in msg:
            msg = (
                "Registration failed: User not allowed. "
                "Check SUPABASE_SERVICE_ROLE_KEY, Supabase project settings, and whether server-side user creation is permitted."
            )

        raise HTTPException(
            status_code=400,
            detail=msg
        )


@router.post("/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):

    profile = (
        db.query(Profile)
        .filter(func.lower(Profile.username) == func.lower(data.username))
        .first()
    )

    if not profile:
        raise HTTPException(
            status_code=401,
            detail="Username not found"
        )

    if not profile.email:
        raise HTTPException(
            status_code=400,
            detail="User email is missing"
        )

    try:
        response = supabase.auth.sign_in_with_password({
            "email": profile.email,
            "password": data.password
        })

        payload = {
            "message": "Login successful",
            "username": profile.username,
        }
        final_response = JSONResponse(content=payload)
        set_auth_cookies(
            final_response,
            response.session.access_token,
            response.session.refresh_token
        )
        return final_response

    except Exception as e:
        print("SUPABASE LOGIN ERROR:", e)

        raise HTTPException(
            status_code=401,
            detail="Invalid username or password"
        )


@router.post("/refresh")
def refresh_session(request: Request):
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(
            status_code=401,
            detail="Session expired"
        )

    try:
        response = supabase.auth.refresh_session({
            "refresh_token": refresh_token
        })

        payload = JSONResponse({"message": "Session refreshed"})
        set_auth_cookies(
            payload,
            response.session.access_token,
            response.session.refresh_token,
        )
        return payload
    except Exception as e:
        print("SUPABASE REFRESH ERROR:", e)
        cleared = JSONResponse({"detail": "Session expired"}, status_code=401)
        cleared.delete_cookie("access_token", path="/")
        cleared.delete_cookie("refresh_token", path="/")
        return cleared


@router.post("/logout")
def logout():
    response = JSONResponse({"message": "Logged out"})
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return response
