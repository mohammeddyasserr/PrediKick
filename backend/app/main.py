from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.dependencies.auth import get_current_user,require_admin
from .database import get_db
from app.routers.auth import router as auth_router
from app.routers.matches import router as matches_router
from app.routers.predictions import router as predictions_router
from app.routers.rank import router as rank_router


app = FastAPI()

# Allow CORS from the frontend dev server(s)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(auth_router)
app.include_router(matches_router)
app.include_router(predictions_router)
app.include_router(rank_router)


@app.get("/")
def root():
    return {"message": "Backend is running"}


@app.get("/test-db")
def test_db(db: Session = Depends(get_db)):
    result = db.execute(text("SELECT 1"))
    return {"database": result.scalar()}

@app.get("/me")
def get_me(user=Depends(get_current_user)):
    return {
        "user_id": user.get("sub"),
        "email": user.get("email")
    }

@app.get("/admin/test")
def admin_test(admin=Depends(require_admin)):
    return {
        "message": "Welcome Admin",
        "username": admin.username
    }