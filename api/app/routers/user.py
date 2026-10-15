"""Per-user state management, guest claiming, profile, and chat endpoints."""

from __future__ import annotations

import json
from datetime import UTC, datetime
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.config import settings
from app.models.database import (
    ChatMessage,
    ChatSession,
    ProfileRecord,
    ReportRecord,
    User,
    get_db,
    redact_sensitive_text,
)
from app.schemas.operator2 import Profile
from app.utils.auth import (
    delete_firebase_user,
    get_current_user,
    verify_firebase_id_token,
)

router = APIRouter(prefix="/api/v1", tags=["user"])


# -------------------------------------------------------------------------
# Schemas
# -------------------------------------------------------------------------

class UserResponse(BaseModel):
    id: str
    auth_provider_id: str
    email: str | None = None
    lang: str = "en"
    is_guest: bool = False
    created_at: datetime


class ClaimGuestRequest(BaseModel):
    guest_token: str = Field(min_length=10)


class ClaimGuestResponse(BaseModel):
    claimed_records: dict[str, int]
    status: str = "claimed"


class ReportSummary(BaseModel):
    id: str
    schema_version: int
    created_at: datetime
    title: str | None = None
    score: float | None = None
    verdict: str | None = None


class ChatSessionResponse(BaseModel):
    id: str
    report_id: str | None = None
    created_at: datetime
    message_count: int = 0


class ChatMessageResponse(BaseModel):
    id: str
    session_id: str
    role: str
    content: str
    lang: str
    created_at: datetime


class ProfileUpdate(BaseModel):
    state: str | None = None
    district: str | None = None
    capital: float | None = None
    category: str | None = None
    age: int | None = None
    experience: str | None = None


# -------------------------------------------------------------------------
# Endpoints: /me and /me/claim-guest-data
# -------------------------------------------------------------------------

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Retrieve currently authenticated user details."""
    return UserResponse(
        id=current_user.id,
        auth_provider_id=current_user.auth_provider_id,
        email=current_user.email,
        lang=current_user.lang,
        is_guest=current_user.is_guest,
        created_at=current_user.created_at,
    )


class DeleteMeResponse(BaseModel):
    status: str = "deleted"
    firebase_deleted: bool = True
    message: str | None = None


@router.delete("/me", response_model=DeleteMeResponse)
def delete_me(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Hard-delete current user and all associated records in DB, and delete the Firebase user."""
    auth_provider_id = current_user.auth_provider_id

    # 1. Delete user from DB (CASCADE foreign keys remove child records)
    db.delete(current_user)
    db.commit()

    # 2. Delete user in Firebase via Admin SDK
    fb_deleted = delete_firebase_user(auth_provider_id)
    message = None if fb_deleted else "Database records removed, but Firebase user deletion encountered an issue or was already deleted."

    return DeleteMeResponse(
        status="deleted",
        firebase_deleted=fb_deleted,
        message=message,
    )


@router.post("/me/claim-guest-data", response_model=ClaimGuestResponse)
def claim_guest_data(
    body: ClaimGuestRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Claim guest-owned data and re-associate to the authenticated user in one transaction."""
    if current_user.is_guest:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"detail": "A guest account cannot claim another guest account.", "code": "guest_claim_forbidden"},
        )

    # Verify old anonymous ID token (with check_revoked=False as it may be older/transitioned, or check_revoked=True)
    guest_claims = verify_firebase_id_token(body.guest_token, check_revoked=False)
    guest_provider = guest_claims.get("firebase", {}).get("sign_in_provider")
    if guest_provider != "anonymous":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"detail": "Provided token is not an anonymous guest token.", "code": "invalid_guest_token"},
        )

    guest_provider_id = guest_claims.get("uid") or guest_claims.get("sub")
    if not guest_provider_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"detail": "Anonymous token contains no user identifier.", "code": "invalid_token"},
        )

    # Prevent claiming own current account or foreign invalid state
    if guest_provider_id == current_user.auth_provider_id:
        return ClaimGuestResponse(
            claimed_records={"reports": 0, "profiles": 0, "chat_sessions": 0},
            status="claimed",
        )

    guest_user = db.query(User).filter(User.auth_provider_id == guest_provider_id).first()
    if not guest_user:
        # Idempotent: guest record might have already been migrated or deleted
        return ClaimGuestResponse(
            claimed_records={"reports": 0, "profiles": 0, "chat_sessions": 0},
            status="claimed",
        )

    # Re-associate in a single transaction
    rep_count = db.query(ReportRecord).filter(ReportRecord.user_id == guest_user.id).update({"user_id": current_user.id})
    prof_count = db.query(ProfileRecord).filter(ProfileRecord.user_id == guest_user.id).update({"user_id": current_user.id})
    chat_count = db.query(ChatSession).filter(ChatSession.user_id == guest_user.id).update({"user_id": current_user.id})

    # Remove the guest user record
    db.delete(guest_user)
    db.commit()

    return ClaimGuestResponse(
        claimed_records={"reports": rep_count, "profiles": prof_count, "chat_sessions": chat_count},
        status="claimed",
    )


# -------------------------------------------------------------------------
# Endpoints: Reports
# -------------------------------------------------------------------------

@router.get("/reports", response_model=list[ReportSummary])
def list_reports(
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List authenticated user's reports (newest first, paginated)."""
    records = (
        db.query(ReportRecord)
        .filter(ReportRecord.user_id == current_user.id)
        .order_by(ReportRecord.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    summaries: list[ReportSummary] = []
    for r in records:
        try:
            parsed = json.loads(r.report_json)
        except Exception:
            parsed = {}
        summaries.append(
            ReportSummary(
                id=r.id,
                schema_version=r.schema_version,
                created_at=r.created_at,
                title=parsed.get("title"),
                score=parsed.get("score"),
                verdict=parsed.get("verdict"),
            )
        )
    return summaries


@router.get("/reports/{report_id}")
def get_report_detail(
    report_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get report detail for authenticated user. Returns 404 if not found or unauthorized."""
    record = (
        db.query(ReportRecord)
        .filter(ReportRecord.id == report_id, ReportRecord.user_id == current_user.id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")

    try:
        data = json.loads(record.report_json)
    except Exception:
        data = {}
    data["id"] = record.id
    data["schema_version"] = record.schema_version
    return data


@router.delete("/reports/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_report(
    report_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete report owned by user. Returns 404 if not found or unauthorized."""
    record = (
        db.query(ReportRecord)
        .filter(ReportRecord.id == report_id, ReportRecord.user_id == current_user.id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found")

    db.delete(record)
    db.commit()
    return None


# -------------------------------------------------------------------------
# Endpoints: Chat Sessions & Messages
# -------------------------------------------------------------------------

@router.get("/chat/sessions", response_model=list[ChatSessionResponse])
def list_chat_sessions(
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List authenticated user's chat sessions."""
    sessions = (
        db.query(ChatSession)
        .filter(ChatSession.user_id == current_user.id)
        .order_by(ChatSession.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    result: list[ChatSessionResponse] = []
    for s in sessions:
        count = db.query(ChatMessage).filter(ChatMessage.session_id == s.id).count()
        result.append(
            ChatSessionResponse(
                id=s.id,
                report_id=s.report_id,
                created_at=s.created_at,
                message_count=count,
            )
        )
    return result


@router.get("/chat/sessions/{session_id}/messages", response_model=list[ChatMessageResponse])
def list_session_messages(
    session_id: str,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve messages for user's chat session. Returns 404 if unauthorized."""
    sess = (
        db.query(ChatSession)
        .filter(ChatSession.id == session_id, ChatSession.user_id == current_user.id)
        .first()
    )
    if not sess:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat session not found")

    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at.asc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return [
        ChatMessageResponse(
            id=m.id,
            session_id=m.session_id,
            role=m.role,
            content=m.content,
            lang=m.lang,
            created_at=m.created_at,
        )
        for m in messages
    ]


@router.delete("/chat/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_chat_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete chat session and all messages for user. Returns 404 if unauthorized."""
    sess = (
        db.query(ChatSession)
        .filter(ChatSession.id == session_id, ChatSession.user_id == current_user.id)
        .first()
    )
    if not sess:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat session not found")

    db.delete(sess)
    db.commit()
    return None


# -------------------------------------------------------------------------
# Endpoints: Profile
# -------------------------------------------------------------------------

@router.get("/me/profile")
def get_my_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Fetch the latest profile for current user."""
    prof = (
        db.query(ProfileRecord)
        .filter(ProfileRecord.user_id == current_user.id)
        .order_by(ProfileRecord.updated_at.desc())
        .first()
    )
    if not prof:
        return {}
    if prof.payload_json:
        try:
            return json.loads(prof.payload_json)
        except Exception:
            pass
    return {
        "state": prof.state,
        "district": prof.district,
        "capital": prof.capital,
        "category": prof.category,
        "age": prof.age,
        "experience": prof.experience,
    }


@router.put("/me/profile")
def update_my_profile(
    payload: dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create or update current user's profile."""
    prof = (
        db.query(ProfileRecord)
        .filter(ProfileRecord.user_id == current_user.id)
        .order_by(ProfileRecord.updated_at.desc())
        .first()
    )
    if prof:
        prof.state = payload.get("state", prof.state)
        prof.district = payload.get("district", prof.district)
        prof.capital = payload.get("capital", prof.capital)
        prof.category = payload.get("category", prof.category)
        prof.age = payload.get("age", prof.age)
        prof.experience = payload.get("experience", prof.experience)
        prof.payload_json = json.dumps(payload, ensure_ascii=False)
        prof.updated_at = datetime.now(UTC)
    else:
        prof = ProfileRecord(
            user_id=current_user.id,
            state=payload.get("state"),
            district=payload.get("district"),
            capital=payload.get("capital"),
            category=payload.get("category"),
            age=payload.get("age"),
            experience=payload.get("experience"),
            payload_json=json.dumps(payload, ensure_ascii=False),
        )
        db.add(prof)

    db.commit()
    return payload

