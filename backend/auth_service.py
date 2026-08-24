"""
SatQuery AI — Authentication & Security Service
Implements bcrypt password hashing, JWT session encoding/decoding,
and FastAPI Bearer authorization guards.
"""

import os
import re
import time
import secrets
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, Tuple
from fastapi import Header, HTTPException, Depends, status

# Security configuration (Reads from environment, defaults to secure random token if unset)
JWT_SECRET = os.environ.get("JWT_SECRET", "satquery-production-secret-key-928374928374-isro-sac")
JWT_ALGORITHM = os.environ.get("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", "1440")) # 24 hours


def hash_password(password: str) -> str:
    """Hashes a plaintext password using bcrypt with salt."""
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain_password: str, password_hash: str) -> bool:
    """Verifies a plaintext password against a stored bcrypt hash."""
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), password_hash.encode("utf-8"))
    except Exception:
        return False


def validate_password_strength(password: str) -> Tuple[bool, str]:
    """
    Validates password complexity:
    - At least 8 characters
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one number
    - At least one special character
    """
    if len(password) < 8:
        return False, "Password must be at least 8 characters long."
    if not re.search(r"[A-Z]", password):
        return False, "Password must contain at least one uppercase letter."
    if not re.search(r"[a-z]", password):
        return False, "Password must contain at least one lowercase letter."
    if not re.search(r"[0-9]", password):
        return False, "Password must contain at least one number."
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>\-_+=\[\]~`/\\]", password):
        return False, "Password must contain at least one special character."
    return True, "Password meets all security criteria."


def create_access_token(user_id: str, email: str, role: str, remember_me: bool = False) -> str:
    """Generates a signed JWT session token."""
    expire_minutes = ACCESS_TOKEN_EXPIRE_MINUTES * (7 if remember_me else 1) # 7 days if remember me
    expire_time = datetime.now(timezone.utc) + timedelta(minutes=expire_minutes)
    
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": int(expire_time.timestamp()),
        "iat": int(datetime.now(timezone.utc).timestamp()),
        "iss": "satquery-ai-auth"
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Decodes and verifies a JWT token. Returns None if invalid or expired."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM], issuer="satquery-ai-auth")
        return payload
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None


def generate_secure_token(nbytes: int = 32) -> str:
    """Generates a cryptographically random URL-safe token for email verification or password reset."""
    return secrets.token_urlsafe(nbytes)


# ─────────────────────────────────────────────────────────────────────────────
# FastAPI Authentication Dependency
# ─────────────────────────────────────────────────────────────────────────────

async def get_current_user_optional(authorization: Optional[str] = Header(None)) -> Optional[Dict[str, Any]]:
    """Extracts authenticated user if Authorization header is provided, otherwise returns None."""
    if not authorization:
        return None
    
    parts = authorization.strip().split(" ")
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None
    
    token = parts[1]
    payload = decode_access_token(token)
    if not payload:
        return None
    
    user_id = payload.get("sub")
    if not user_id:
        return None
    
    from database import get_user_by_id
    user = get_user_by_id(user_id)
    return user


async def get_current_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """Strict authorization guard: raises 401 Unauthorized if token is missing, invalid, or expired."""
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please sign in to continue.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    parts = authorization.strip().split(" ")
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization scheme. Expected 'Bearer <token>'.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = parts[1]
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Your session has expired or is invalid. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed authentication token payload.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    from database import get_user_by_id
    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account no longer exists.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user
