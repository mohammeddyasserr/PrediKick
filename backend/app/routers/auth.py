from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from supabase import create_client, Client
import os

from app.database import get_db
from app.schemas.auth import RegisterRequest, LoginRequest
from app.models.profiles import Profile


router = APIRouter(prefix="/auth", tags=["Authentication"])


supabase: Client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_ROLE_KEY")
)


@router.post("/register")
def register(data: RegisterRequest):

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
        .filter(Profile.username == data.username)
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

        return {
            "access_token": response.session.access_token,
            "refresh_token": response.session.refresh_token,
            "token_type": "bearer"
        }

    except Exception as e:
        print("SUPABASE LOGIN ERROR:", e)

        raise HTTPException(
            status_code=401,
            detail="Invalid username or password"
        )