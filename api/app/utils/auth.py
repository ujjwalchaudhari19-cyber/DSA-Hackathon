"""Authentication dependencies and token verification for Firebase Auth."""

from __future__ import annotations

import json
import logging
import os
import uuid
from typing import Annotated, Any

import firebase_admin
from firebase_admin import auth as firebase_auth
from firebase_admin import credentials
from firebase_admin.auth import (
    CertificateFetchError,
    EmailAlreadyExistsError,
    ExpiredIdTokenError,
    InvalidIdTokenError,
    RevokedIdTokenError,
    UserNotFoundError,
)
from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.config import settings
from app.models.database import User, get_db

logger = logging.getLogger("gramudyam.auth")

_firebase_app: firebase_admin.App | None = None


def get_firebase_app() -> firebase_admin.App:
    """Initialize or return the default Firebase Admin app."""
    global _firebase_app
    if _firebase_app is not None:
        return _firebase_app

    try:
        # Check if already initialized in default app
        _firebase_app = firebase_admin.get_app()
        return _firebase_app
    except ValueError:
        pass

    # Initialize with service account credentials from env var or file
    service_account_info = None
    if settings.FIREBASE_SERVICE_ACCOUNT_JSON and settings.FIREBASE_SERVICE_ACCOUNT_JSON.strip():
        try:
            service_account_info = json.loads(settings.FIREBASE_SERVICE_ACCOUNT_JSON)
        except Exception as exc:
            logger.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON: %s", exc)

    if service_account_info:
        cred = credentials.Certificate(service_account_info)
        _firebase_app = firebase_admin.initialize_app(cred, {
            "projectId": settings.FIREBASE_PROJECT_ID,
        })
    elif settings.FIREBASE_SERVICE_ACCOUNT_PATH and os.path.isfile(settings.FIREBASE_SERVICE_ACCOUNT_PATH):
        cred = credentials.Certificate(settings.FIREBASE_SERVICE_ACCOUNT_PATH)
        _firebase_app = firebase_admin.initialize_app(cred, {
            "projectId": settings.FIREBASE_PROJECT_ID,
        })
    else:
        # Fall back to project ID or Application Default Credentials (ADC)
        try:
            cred = credentials.ApplicationDefault()
            _firebase_app = firebase_admin.initialize_app(cred, {
                "projectId": settings.FIREBASE_PROJECT_ID,
            })
        except Exception:
            # Initialize with project ID options only
            _firebase_app = firebase_admin.initialize_app(options={
                "projectId": settings.FIREBASE_PROJECT_ID,
            })

    return _firebase_app


def verify_firebase_id_token(token: str, check_revoked: bool = True) -> dict[str, Any]:
    """Verify a Firebase ID token with check_revoked=True.
    
    Maps errors to HTTP 401 with stable code identifiers:
    - token_expired
    - token_revoked
    - invalid_token
    """
    app = get_firebase_app()
    try:
        decoded_claims = firebase_auth.verify_id_token(
            token,
            app=app,
            check_revoked=check_revoked,
        )
        return decoded_claims
    except RevokedIdTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"detail": "Firebase token has been revoked.", "code": "token_revoked"},
        )
    except ExpiredIdTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"detail": "Firebase token has expired.", "code": "token_expired"},
        )
    except InvalidIdTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"detail": f"Invalid Firebase token: {exc}", "code": "invalid_token"},
        )
    except CertificateFetchError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"detail": f"Failed to fetch public keys to verify token: {exc}", "code": "cert_fetch_error"},
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"detail": f"Token verification failed: {exc}", "code": "invalid_token"},
        )


def delete_firebase_user(auth_provider_id: str) -> bool:
    """Delete the user in Firebase Auth via the Admin SDK.
    
    Returns True if deleted, False if deletion failed or user was not found.
    """
    app = get_firebase_app()
    try:
        firebase_auth.delete_user(auth_provider_id, app=app)
        return True
    except UserNotFoundError:
        # Already deleted in Firebase
        return True
    except Exception as exc:
        logger.error("Failed to delete Firebase user %s: %s", auth_provider_id, exc)
        return False


def get_current_user(
    authorization: Annotated[str | None, Header()] = None,
    db: Session = Depends(get_db),
) -> User:
    """FastAPI dependency for verifying Firebase ID token, auto-provisioning user,
    detecting anonymous guests, and rejecting soft-deleted users.
    """
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"detail": "Missing Authorization header.", "code": "missing_token"},
        )

    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"detail": "Invalid Authorization header format. Expected 'Bearer <token>'.", "code": "invalid_header"},
        )

    token = parts[1]
    claims = verify_firebase_id_token(token, check_revoked=True)

    auth_provider_id = claims.get("uid") or claims.get("sub")
    if not auth_provider_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"detail": "Token contains no user ID ('uid' or 'sub').", "code": "invalid_token"},
        )

    # In Firebase Auth, anonymous users have sign_in_provider == "anonymous" in firebase identity object
    firebase_meta = claims.get("firebase", {})
    sign_in_provider = firebase_meta.get("sign_in_provider")
    is_guest = (sign_in_provider == "anonymous")

    email = claims.get("email")

    # Map auth_provider_id (Firebase UID) to users.auth_provider_id
    user = db.query(User).filter(User.auth_provider_id == auth_provider_id).first()
    if not user:
        user = User(
            id=str(uuid.uuid4()),
            auth_provider_id=auth_provider_id,
            email=email,
            is_guest=is_guest,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        # Update is_guest status if changed (e.g. user linked provider)
        if user.is_guest != is_guest:
            user.is_guest = is_guest
            db.commit()
            db.refresh(user)

    # Reject soft-deleted users (deleted_at not null) on EVERY request
    if user.deleted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"detail": "User account has been deactivated.", "code": "user_deleted"},
        )

    return user
