"""Comprehensive integration and edge-case tests for Postgres/Alembic, Firebase Auth, Cache DB, and Data Lifecycle."""

from __future__ import annotations

import time
import uuid
from datetime import UTC, datetime
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from firebase_admin.auth import (
    ExpiredIdTokenError,
    InvalidIdTokenError,
    RevokedIdTokenError,
)
from sqlalchemy.orm import Session

from app.config import settings
from app.main import app
from app.models.database import (
    ChatMessage,
    ChatSession,
    ProfileRecord,
    ReportRecord,
    SupplierLead,
    User,
    create_chat_session,
    engine,
    get_recent_messages,
    redact_sensitive_text,
    save_message,
)
from app.utils.auth import (
    delete_firebase_user,
    get_current_user,
    verify_firebase_id_token,
)
from app.utils.cache_db import cache_db

client = TestClient(app)


def make_mock_firebase_claims(
    uid: str,
    email: str | None = "user@example.com",
    is_anonymous: bool = False,
    exp_delta: int = 3600,
) -> dict:
    """Helper creating mock decoded Firebase ID token claims."""
    now = int(time.time())
    provider = "anonymous" if is_anonymous else "password"
    return {
        "uid": uid,
        "sub": uid,
        "email": None if is_anonymous else email,
        "aud": settings.FIREBASE_PROJECT_ID,
        "iss": f"https://securetoken.google.com/{settings.FIREBASE_PROJECT_ID}",
        "auth_time": now,
        "iat": now,
        "exp": now + exp_delta,
        "firebase": {
            "sign_in_provider": provider,
            "identities": {},
        },
    }


# =========================================================================
# 1. 401 Error Paths: Missing, Malformed, Expired, Revoked, Invalid
# =========================================================================

def test_auth_401_missing_token():
    """Missing Authorization header returns 401 with code 'missing_token'."""
    res = client.get("/api/v1/me")
    assert res.status_code == 401
    assert res.json()["detail"]["code"] == "missing_token"


def test_auth_401_malformed_token():
    """Malformed token string returns 401."""
    with patch("app.utils.auth.firebase_auth.verify_id_token") as mock_verify:
        mock_verify.side_effect = InvalidIdTokenError("Invalid token format")
        res = client.get("/api/v1/me", headers={"Authorization": "Bearer not-a-valid-jwt"})
        assert res.status_code == 401
        assert res.json()["detail"]["code"] == "invalid_token"


def test_auth_401_expired_token():
    """Expired token returns 401 with code 'token_expired'."""
    with patch("app.utils.auth.firebase_auth.verify_id_token") as mock_verify:
        mock_verify.side_effect = ExpiredIdTokenError("Token expired", Exception("Expired"))
        res = client.get("/api/v1/me", headers={"Authorization": "Bearer expired_fb_token"})
        assert res.status_code == 401
        assert res.json()["detail"]["code"] == "token_expired"


def test_auth_401_revoked_token():
    """Revoked token returns 401 with code 'token_revoked' when check_revoked=True."""
    with patch("app.utils.auth.firebase_auth.verify_id_token") as mock_verify:
        mock_verify.side_effect = RevokedIdTokenError("Token has been revoked")
        res = client.get("/api/v1/me", headers={"Authorization": "Bearer revoked_fb_token"})
        assert res.status_code == 401
        assert res.json()["detail"]["code"] == "token_revoked"


# =========================================================================
# 2. Soft-deleted User Rejection on EVERY Request
# =========================================================================

def test_soft_deleted_user_rejected():
    """Soft-deleted user with still-valid token is rejected with code 'user_deleted'."""
    sub = f"soft_del_{uuid.uuid4().hex[:8]}"
    claims = make_mock_firebase_claims(uid=sub, email="softdel@example.com")

    with patch("app.utils.auth.firebase_auth.verify_id_token", return_value=claims):
        # First access provisions the user
        res1 = client.get("/api/v1/me", headers={"Authorization": "Bearer valid_token"})
        assert res1.status_code == 200

        # Mark user as soft-deleted in database
        with Session(engine) as session:
            u = session.query(User).filter(User.auth_provider_id == sub).first()
            assert u is not None
            u.deleted_at = datetime.now(UTC)
            session.commit()

        # Subsequent request with same valid token is rejected
        res2 = client.get("/api/v1/me", headers={"Authorization": "Bearer valid_token"})
        assert res2.status_code == 401
        assert res2.json()["detail"]["code"] == "user_deleted"


# =========================================================================
# 3. Anonymous Guest User & Fallback Data Claiming
# =========================================================================

def test_anonymous_guest_user_and_claim_fallback():
    """Anonymous user is marked is_guest=True, and real user can claim their rows."""
    guest_uid = f"anon_fb_{uuid.uuid4().hex[:8]}"
    guest_claims = make_mock_firebase_claims(uid=guest_uid, is_anonymous=True)

    # 1. Anonymous user accesses /api/v1/me and is provisioned with is_guest=True
    with patch("app.utils.auth.firebase_auth.verify_id_token", return_value=guest_claims):
        res_me = client.get("/api/v1/me", headers={"Authorization": "Bearer anon_token_123"})
        assert res_me.status_code == 200
        guest_data = res_me.json()
        assert guest_data["is_guest"] is True
        assert guest_data["auth_provider_id"] == guest_uid

        # Guest creates profile data
        prof_payload = {"state": "Maharashtra", "district": "Nashik", "capital": 75000}
        put_res = client.put(
            "/api/v1/me/profile",
            json=prof_payload,
            headers={"Authorization": "Bearer anon_token_123"},
        )
        assert put_res.status_code == 200

    # 2. Real user logs in
    real_uid = f"real_fb_{uuid.uuid4().hex[:8]}"
    real_claims = make_mock_firebase_claims(uid=real_uid, email="real@example.com", is_anonymous=False)

    with patch("app.utils.auth.firebase_auth.verify_id_token") as mock_verify:
        def verify_side_effect(token, *args, **kwargs):
            if token == "real_user_token":
                return real_claims
            if token == "old_anon_token":
                return guest_claims
            if token == "non_anon_token":
                return make_mock_firebase_claims(uid="another_real", email="other@test.com", is_anonymous=False)
            raise InvalidIdTokenError("Unknown token")

        mock_verify.side_effect = verify_side_effect

        real_me = client.get("/api/v1/me", headers={"Authorization": "Bearer real_user_token"})
        assert real_me.status_code == 200
        assert real_me.json()["is_guest"] is False

        # 3. Real user claims anonymous guest data using old anonymous token
        claim_res = client.post(
            "/api/v1/me/claim-guest-data",
            json={"guest_token": "old_anon_token"},
            headers={"Authorization": "Bearer real_user_token"},
        )
        assert claim_res.status_code == 200
        assert claim_res.json()["claimed_records"]["profiles"] == 1

        # Check real user profile now holds the claimed data
        get_prof = client.get("/api/v1/me/profile", headers={"Authorization": "Bearer real_user_token"})
        assert get_prof.status_code == 200
        assert get_prof.json()["capital"] == 75000

        # 4. Idempotent on repeat
        claim_again = client.post(
            "/api/v1/me/claim-guest-data",
            json={"guest_token": "old_anon_token"},
            headers={"Authorization": "Bearer real_user_token"},
        )
        assert claim_again.status_code == 200
        assert claim_again.json()["status"] == "claimed"

        # 5. Reject claim when token is not anonymous
        bad_claim = client.post(
            "/api/v1/me/claim-guest-data",
            json={"guest_token": "non_anon_token"},
            headers={"Authorization": "Bearer real_user_token"},
        )
        assert bad_claim.status_code == 400
        assert bad_claim.json()["detail"]["code"] == "invalid_guest_token"


# =========================================================================
# 4. Cross-User Resource Isolation (Returns 404, never 403)
# =========================================================================

def test_cross_user_isolation_returns_404():
    """User A cannot read/delete User B's report, chat session, messages, or PDF (returns 404)."""
    uid_a = f"user_a_{uuid.uuid4().hex[:8]}"
    uid_b = f"user_b_{uuid.uuid4().hex[:8]}"
    claims_a = make_mock_firebase_claims(uid=uid_a)
    claims_b = make_mock_firebase_claims(uid=uid_b)

    with patch("app.utils.auth.firebase_auth.verify_id_token") as mock_verify:
        def verify_dispatch(token, *args, **kwargs):
            if token == "token_a":
                return claims_a
            if token == "token_b":
                return claims_b
            raise InvalidIdTokenError("Invalid")

        mock_verify.side_effect = verify_dispatch

        user_a = client.get("/api/v1/me", headers={"Authorization": "Bearer token_a"}).json()
        user_b = client.get("/api/v1/me", headers={"Authorization": "Bearer token_b"}).json()

        # User B creates a report in database
        with Session(engine) as session:
            rep_b = ReportRecord(
                id=str(uuid.uuid4()),
                user_id=user_b["id"],
                schema_version=1,
                report_json='{"title": "User B Secret Report", "score": 90}',
            )
            sess_b = ChatSession(
                id=str(uuid.uuid4()),
                user_id=user_b["id"],
            )
            session.add_all([rep_b, sess_b])
            session.commit()
            rep_b_id = rep_b.id
            sess_b_id = sess_b.id

        # User A tries to GET User B's report -> 404
        res_get_rep = client.get(f"/api/v1/reports/{rep_b_id}", headers={"Authorization": "Bearer token_a"})
        assert res_get_rep.status_code == 404

        # User A tries to DELETE User B's report -> 404
        res_del_rep = client.delete(f"/api/v1/reports/{rep_b_id}", headers={"Authorization": "Bearer token_a"})
        assert res_del_rep.status_code == 404

        # User A tries to GET User B's chat session messages -> 404
        res_chat = client.get(f"/api/v1/chat/sessions/{sess_b_id}/messages", headers={"Authorization": "Bearer token_a"})
        assert res_chat.status_code == 404

        # User A tries to DELETE User B's chat session -> 404
        res_del_chat = client.delete(f"/api/v1/chat/sessions/{sess_b_id}", headers={"Authorization": "Bearer token_a"})
        assert res_del_chat.status_code == 404

        # User A tries to GET User B's report PDF -> 404
        res_pdf = client.get(f"/api/v1/report/{rep_b_id}/pdf", headers={"Authorization": "Bearer token_a"})
        assert res_pdf.status_code == 404


# =========================================================================
# 5. DELETE /me Cascades DB Rows AND Deletes Firebase User
# =========================================================================

def test_delete_me_cleans_all_user_rows_and_calls_firebase():
    """DELETE /me removes the user and cascades to delete all DB rows, and deletes Firebase user."""
    sub = f"del_all_{uuid.uuid4().hex[:8]}"
    claims = make_mock_firebase_claims(uid=sub)

    with patch("app.utils.auth.firebase_auth.verify_id_token", return_value=claims), \
         patch("app.utils.auth.firebase_auth.delete_user") as mock_fb_del:

        mock_fb_del.return_value = None  # Firebase delete succeeds

        user_info = client.get("/api/v1/me", headers={"Authorization": "Bearer valid_del_token"}).json()
        u_id = user_info["id"]

        # Populate rows in profiles, reports, chat_sessions, chat_messages, supplier_leads
        with Session(engine) as session:
            prof = ProfileRecord(user_id=u_id, state="Maharashtra", district="Pune")
            rep = ReportRecord(id=str(uuid.uuid4()), user_id=u_id, report_json='{"score": 80}')
            sess = ChatSession(id=str(uuid.uuid4()), user_id=u_id)
            session.add_all([prof, rep, sess])
            session.commit()
            sess_id = sess.id

            msg = ChatMessage(session_id=sess_id, role="user", content="Test question")
            lead = SupplierLead(user_id=u_id, supplier_id="sup-001", requester_name="Del", phone="9999999999", message="Lead")
            session.add_all([msg, lead])
            session.commit()

        # Call DELETE /api/v1/me
        del_res = client.delete("/api/v1/me", headers={"Authorization": "Bearer valid_del_token"})
        assert del_res.status_code == 200
        del_data = del_res.json()
        assert del_data["status"] == "deleted"
        assert del_data["firebase_deleted"] is True

        # Verify Firebase Admin SDK delete_user was called with sub
        mock_fb_del.assert_called_once()
        assert mock_fb_del.call_args[0][0] == sub

        # Verify zero rows remain for this user in DB
        with Session(engine) as session:
            assert session.query(User).filter(User.id == u_id).count() == 0
            assert session.query(ProfileRecord).filter(ProfileRecord.user_id == u_id).count() == 0
            assert session.query(ReportRecord).filter(ReportRecord.user_id == u_id).count() == 0
            assert session.query(ChatSession).filter(ChatSession.user_id == u_id).count() == 0
            assert session.query(ChatMessage).filter(ChatMessage.session_id == sess_id).count() == 0
            assert session.query(SupplierLead).filter(SupplierLead.user_id == u_id).count() == 0


def test_delete_me_handles_firebase_deletion_failure_gracefully():
    """If Firebase Admin deletion fails, DB rows still stay deleted and response reports it."""
    sub = f"del_fail_{uuid.uuid4().hex[:8]}"
    claims = make_mock_firebase_claims(uid=sub)

    with patch("app.utils.auth.firebase_auth.verify_id_token", return_value=claims), \
         patch("app.utils.auth.firebase_auth.delete_user") as mock_fb_del:

        mock_fb_del.side_effect = Exception("Firebase network failure")

        user_info = client.get("/api/v1/me", headers={"Authorization": "Bearer valid_fail_token"}).json()
        u_id = user_info["id"]

        del_res = client.delete("/api/v1/me", headers={"Authorization": "Bearer valid_fail_token"})
        assert del_res.status_code == 200
        del_data = del_res.json()
        assert del_data["status"] == "deleted"
        assert del_data["firebase_deleted"] is False
        assert "encountered an issue" in del_data["message"]

        # User row in DB is still deleted
        with Session(engine) as session:
            assert session.query(User).filter(User.id == u_id).count() == 0


# =========================================================================
# 6. Sensitive Data Redaction: Aadhaar & PAN
# =========================================================================

def test_sensitive_data_redaction():
    """Redaction masks 12-digit runs, Aadhaar patterns, and PAN-like strings."""
    raw_text = "My Aadhaar is 1234 5678 9012 and PAN is ABCDE1234F. Call 987654321098."
    redacted = redact_sensitive_text(raw_text)
    assert "1234 5678 9012" not in redacted
    assert "ABCDE1234F" not in redacted
    assert "987654321098" not in redacted
    assert "[REDACTED]" in redacted

    # Test saving message through new helper
    sub = f"redact_user_{uuid.uuid4().hex[:8]}"
    claims = make_mock_firebase_claims(uid=sub)

    with patch("app.utils.auth.firebase_auth.verify_id_token", return_value=claims):
        u_id = client.get("/api/v1/me", headers={"Authorization": "Bearer token"}).json()["id"]

        sess = create_chat_session(user_id=u_id)
        msg = save_message(
            session_id=sess.id,
            role="user",
            content="Applicant PAN is PQRST9876Z and Aadhaar is 999988887777",
            user_id=u_id,
        )
        assert "PQRST9876Z" not in msg.content
        assert "999988887777" not in msg.content
        assert "[REDACTED]" in msg.content


# =========================================================================
# 7. DB-Backed Persistent Cache
# =========================================================================

def test_db_backed_cache_hit_miss_expiry_collision_and_isolation():
    """Cache DB handles hit, miss, expiry, key collision, and per-user keys."""
    test_tag = f"narr_{uuid.uuid4().hex[:6]}"
    # Build keys differing only in language or quantity
    k1 = cache_db.build_key(test_tag, {"business": "dairy", "qty": 1}, lang="en")
    k2 = cache_db.build_key(test_tag, {"business": "dairy", "qty": 2}, lang="en")
    k3_mr = cache_db.build_key(test_tag, {"business": "dairy", "qty": 1}, lang="mr")
    # Per user key
    k_user = cache_db.build_key(test_tag, {"business": "dairy", "qty": 1}, lang="en", user_id="user_123")

    assert k1 != k2
    assert k1 != k3_mr
    assert k1 != k_user

    # Miss
    assert cache_db.get(k1) is None

    # Set and Hit
    val = {"narrative": "Comprehensive dairy project plan.", "items": [1, 2, 3]}
    cache_db.set(k1, val, ttl=3600)
    retrieved = cache_db.get(k1)
    assert retrieved == val

    # Deep copy verification
    retrieved["items"].append(99)
    assert cache_db.get(k1)["items"] == [1, 2, 3]

    # Expiry verification
    cache_db.set(k2, {"temp": "fast_expire"}, ttl=-10)
    assert cache_db.get(k2) is None  # Cleaned up on read


# =========================================================================
# 8. Pagination Bounds
# =========================================================================

def test_pagination_bounds():
    """Limit > 100 or negative offset returns 422 validation error."""
    sub = f"page_user_{uuid.uuid4().hex[:8]}"
    claims = make_mock_firebase_claims(uid=sub)

    with patch("app.utils.auth.firebase_auth.verify_id_token", return_value=claims):
        # Exceeding max limit (le=100)
        res_high = client.get("/api/v1/reports?limit=101", headers={"Authorization": "Bearer token"})
        assert res_high.status_code == 422

        # Negative offset (ge=0)
        res_neg = client.get("/api/v1/reports?offset=-1", headers={"Authorization": "Bearer token"})
        assert res_neg.status_code == 422


# =========================================================================
# 9. Health Endpoint Connectivity
# =========================================================================

def test_health_endpoint_checks_db_and_data():
    """GET /api/v1/health checks database and dataset readiness."""
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["database"] == "ok"
    assert data["datasets"] == "ok"


# =========================================================================
# 10. RLS Verification
# =========================================================================

def test_rls_check_script():
    """Verify that RLS verification script runs cleanly."""
    from scripts.verify_rls import check_rls
    assert check_rls() is True
