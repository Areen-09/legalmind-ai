# app/api/v1/dependencies.py
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from firebase_admin import auth

# This is still needed for the real dependency
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# --- PRODUCTION AUTH FUNCTION ---
# This is now only for real authentication. No more development checks here.
def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception:
        # Catch all firebase-admin auth errors
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

# --- MOCK AUTH FUNCTION ---
# A new, simple function that we will use for development.
def get_mock_user():
    return {"uid": "dev-user-123", "email": "dev@example.com"}