import jwt
from jwt import PyJWKClient
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from sqlalchemy.orm import Session

from app.database import get_db
from app.models.profiles import Profile

SUPABASE_JWKS_URL = (
    "https://kjsmtrupxtnfpfkjcwdm.supabase.co"
    "/auth/v1/.well-known/jwks.json"
)

jwks_client = PyJWKClient(SUPABASE_JWKS_URL)

security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    token = credentials.credentials

    try:
        signing_key = jwks_client.get_signing_key_from_jwt(token)

        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256"],
            audience="authenticated"
        )

        return payload

    except jwt.PyJWTError as e:
        print("JWT ERROR:", e)

        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )




def require_admin(
    user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    profile = (
        db.query(Profile)
        .filter(Profile.id == user.get("sub"))
        .first()
    )

    if not profile:
        raise HTTPException(
            status_code=404,
            detail="User profile not found"
        )

    if profile.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Admin access required"
        )

    return profile