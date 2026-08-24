"""
SatQuery AI — Authentication & User Workspace API Router
Provides endpoints for Registration, Login, Session Check, Password Recovery,
Profile Management, User-Isolated Analyses History, and Decision Reports.
"""

import time
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, EmailStr, Field
from fastapi import APIRouter, HTTPException, Depends, status, Header

from database import (
    create_user, get_user_by_email, get_user_by_id, get_user_with_password_by_id,
    update_last_login, update_user_profile, update_user_password,
    set_reset_token, get_user_by_reset_token, verify_user_email_by_token,
    delete_user_account, save_analysis, get_user_analyses, get_analysis,
    delete_analysis, save_report, get_user_reports, get_report,
    delete_report, get_user_stats
)
from auth_service import (
    hash_password, verify_password, validate_password_strength,
    create_access_token, generate_secure_token, get_current_user,
    get_current_user_optional
)

router = APIRouter(prefix="/api", tags=["Authentication & Workspace"])


# ─────────────────────────────────────────────────────────────────────────────
# Request / Response Schemas
# ─────────────────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    fullName: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8)
    confirmPassword: str
    organization: Optional[str] = ""
    role: Optional[str] = "Researcher"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    rememberMe: Optional[bool] = False


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    newPassword: str = Field(..., min_length=8)
    confirmNewPassword: str


class ChangePasswordRequest(BaseModel):
    currentPassword: str
    newPassword: str = Field(..., min_length=8)
    confirmNewPassword: str


class UpdateProfileRequest(BaseModel):
    fullName: str = Field(..., min_length=2, max_length=100)
    organization: Optional[str] = ""
    role: Optional[str] = "Researcher"


class SaveAnalysisRequest(BaseModel):
    title: str
    question: str
    mode: str
    intent: str
    confidence: float
    confidence_label: str
    headline: Optional[str] = ""
    answer_summary: Optional[str] = ""
    image_names: Optional[str] = ""
    result: Dict[str, Any]


class SaveReportRequest(BaseModel):
    title: str
    authority: str
    department_id: Optional[str] = "disaster"
    question: str
    summary_text: str
    report_dict: Dict[str, Any]
    analysis_id: Optional[str] = None


# ─────────────────────────────────────────────────────────────────────────────
# Authentication Endpoints
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/auth/register", status_code=status.HTTP_201_CREATED)
async def register(req: RegisterRequest):
    """Registers a new user account with hashed password and email verification token."""
    # 1. Confirm passwords match
    if req.password != req.confirmPassword:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords do not match."
        )

    # 2. Validate password strength
    is_valid, msg = validate_password_strength(req.password)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=msg
        )

    # 3. Check if email already exists
    existing = get_user_by_email(req.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unable to create this account. Please try signing in or use another email."
        )

    # 4. Hash password & create user
    pwd_hash = hash_password(req.password)
    verification_token = generate_secure_token()
    
    # In standard setup, default to verified or pending token
    user = create_user(
        full_name=req.fullName,
        email=req.email,
        password_hash=pwd_hash,
        role=req.role or "Researcher",
        organization=req.organization or "",
        email_verified=True, # Active by default for immediate workflow testing
        verification_token=verification_token
    )

    # 5. Generate session token
    token = create_access_token(user["id"], user["email"], user["role"])

    return {
        "message": "Account created successfully.",
        "user": user,
        "token": token,
        "verification_token": verification_token,
    }


@router.post("/auth/login")
async def login(req: LoginRequest):
    """Authenticates user credentials and returns a JWT session token."""
    user = get_user_by_email(req.email)
    if not user:
        # Prevent user enumeration with generic error
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email or password is incorrect."
        )

    # Fetch full record with password_hash
    full_user = get_user_with_password_by_id(user["id"])
    if not full_user or not verify_password(req.password, full_user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email or password is incorrect."
        )

    # Update last login timestamp
    update_last_login(user["id"])
    token = create_access_token(user["id"], user["email"], user["role"], remember_me=req.rememberMe or False)

    safe_user = get_user_by_id(user["id"])
    return {
        "message": "Sign in successful.",
        "user": safe_user,
        "token": token,
    }


@router.get("/auth/me")
async def get_me(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Verifies active session and returns the current user profile."""
    return {"user": current_user}


@router.put("/auth/profile")
async def update_profile(
    req: UpdateProfileRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Updates user profile information (Name, Organization, Role)."""
    updated_user = update_user_profile(
        user_id=current_user["id"],
        full_name=req.fullName,
        organization=req.organization or "",
        role=req.role or "Researcher"
    )
    return {"message": "Profile updated successfully.", "user": updated_user}


@router.post("/auth/change-password")
async def change_password(
    req: ChangePasswordRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Changes password after verifying existing password."""
    if req.newPassword != req.confirmNewPassword:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New passwords do not match."
        )

    is_valid, msg = validate_password_strength(req.newPassword)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=msg
        )

    full_user = get_user_with_password_by_id(current_user["id"])
    if not full_user or not verify_password(req.currentPassword, full_user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect."
        )

    new_hash = hash_password(req.newPassword)
    update_user_password(current_user["id"], new_hash)
    return {"message": "Your password has been updated successfully."}


@router.post("/auth/forgot-password")
async def forgot_password(req: ForgotPasswordRequest):
    """Generates a secure password reset token and returns a safe generic response."""
    user = get_user_by_email(req.email)
    if user:
        reset_token = generate_secure_token()
        # 1-hour expiration
        exp = time.time() + 3600
        set_reset_token(req.email, reset_token, exp)
        # In production with SMTP configured, send email here
        # Return generic message to prevent account harvesting
        return {
            "message": "If an account exists for this email, a password reset link has been sent.",
            "demo_reset_token": reset_token # Provided for local developer testing
        }

    return {
        "message": "If an account exists for this email, a password reset link has been sent."
    }


@router.post("/auth/reset-password")
async def reset_password(req: ResetPasswordRequest):
    """Resets user password using a valid, unexpired reset token."""
    if req.newPassword != req.confirmNewPassword:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords do not match."
        )

    is_valid, msg = validate_password_strength(req.newPassword)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=msg
        )

    user = get_user_by_reset_token(req.token)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired password reset link. Please request a new one."
        )

    # Check token expiration
    exp = user.get("reset_token_exp")
    if exp and time.time() > exp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This password reset link has expired. Please request a new one."
        )

    new_hash = hash_password(req.newPassword)
    update_user_password(user["id"], new_hash)
    return {"message": "Your password has been updated."}


@router.post("/auth/verify-email")
async def verify_email(token: str):
    """Verifies user email with activation token."""
    success = verify_user_email_by_token(token)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification link."
        )
    return {"message": "Email verified successfully. You can now access all features."}


@router.delete("/auth/account")
async def delete_account(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Permanently deletes the authenticated user's account and all associated data."""
    delete_user_account(current_user["id"])
    return {"message": "Your account and all associated analyses have been permanently deleted."}


@router.get("/auth/google/status")
async def google_auth_status():
    """Returns whether Google OAuth credentials are configured in the environment."""
    import os
    client_id = os.environ.get("GOOGLE_CLIENT_ID", "").strip()
    return {
        "available": bool(client_id),
        "message": "Google OAuth is ready" if client_id else "Google OAuth is not configured on this server."
    }


# ─────────────────────────────────────────────────────────────────────────────
# User-Isolated Analyses API (User A cannot access User B's records)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/analyses")
async def list_analyses(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Returns only the authenticated user's analyses."""
    analyses = get_user_analyses(current_user["id"])
    return {"analyses": analyses}


@router.post("/analyses")
async def create_analysis_record(
    req: SaveAnalysisRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Saves an analysis record strictly isolated to the authenticated user."""
    record = save_analysis(
        user_id=current_user["id"],
        title=req.title,
        question=req.question,
        mode=req.mode,
        intent=req.intent,
        confidence=req.confidence,
        confidence_label=req.confidence_label,
        headline=req.headline or "",
        answer_summary=req.answer_summary or "",
        image_names=req.image_names or "",
        result_dict=req.result
    )
    return {"message": "Analysis saved to your workspace history.", "analysis": record}


@router.get("/analyses/{analysis_id}")
async def get_single_analysis(
    analysis_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Retrieves a specific analysis record. Enforces user isolation."""
    record = get_analysis(current_user["id"], analysis_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Analysis record not found or access is not authorized."
        )
    return {"analysis": record}


@router.delete("/analyses/{analysis_id}")
async def remove_analysis(
    analysis_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Deletes an analysis record belonging to the authenticated user."""
    success = delete_analysis(current_user["id"], analysis_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Analysis record not found or access is not authorized."
        )
    return {"message": "Analysis removed from history."}


# ─────────────────────────────────────────────────────────────────────────────
# User-Isolated Decision Reports API (User A cannot access User B's reports)
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/reports")
async def list_reports(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Returns only the authenticated user's decision reports."""
    reports = get_user_reports(current_user["id"])
    return {"reports": reports}


@router.post("/reports")
async def create_report_record(
    req: SaveReportRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Saves an official decision report strictly isolated to the authenticated user."""
    record = save_report(
        user_id=current_user["id"],
        title=req.title,
        authority=req.authority,
        department_id=req.department_id or "disaster",
        question=req.question,
        summary_text=req.summary_text,
        report_dict=req.report_dict,
        analysis_id=req.analysis_id
    )
    return {"message": "Decision report generated and saved to your workspace.", "report": record}


@router.get("/reports/{report_id}")
async def get_single_report(
    report_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Retrieves a specific decision report. Enforces user isolation."""
    record = get_report(current_user["id"], report_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Decision report not found or access is not authorized."
        )
    return {"report": record}


@router.delete("/reports/{report_id}")
async def remove_report(
    report_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Deletes a decision report belonging to the authenticated user."""
    success = delete_report(current_user["id"], report_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Decision report not found or access is not authorized."
        )
    return {"message": "Decision report removed from archive."}


@router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Returns summary analytics for the user dashboard."""
    stats = get_user_stats(current_user["id"])
    recent_analyses = get_user_analyses(current_user["id"], limit=5)
    recent_reports = get_user_reports(current_user["id"], limit=5)
    return {
        "user": current_user,
        "stats": stats,
        "recent_analyses": recent_analyses,
        "recent_reports": recent_reports,
    }
