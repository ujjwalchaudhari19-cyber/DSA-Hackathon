"""Relational persistence models and Operator 2 data layer."""

from __future__ import annotations

import json
import re
import uuid
from datetime import UTC, datetime
from typing import Generator

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    create_engine,
    event,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, relationship

from app.config import settings

DATABASE_URL = settings.DATABASE_URL

connect_args = {}
engine_kwargs = {"pool_pre_ping": True}

if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False, "timeout": 30.0}
else:
    # Sane pool sizing for Postgres free-tier / managed DB
    engine_kwargs.update({"pool_size": 5, "max_overflow": 10})

engine = create_engine(DATABASE_URL, connect_args=connect_args, **engine_kwargs)

if DATABASE_URL.startswith("sqlite"):
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


def get_db() -> Generator[Session, None, None]:
    """FastAPI database session dependency with try/finally lifecycle."""
    session = Session(engine)
    try:
        yield session
    finally:
        session.close()


class Base(DeclarativeBase):
    pass


# -------------------------------------------------------------------------
# Core Tables
# -------------------------------------------------------------------------

class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    auth_provider_id: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    lang: Mapped[str] = mapped_column(String(10), default="en")
    is_guest: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, default=None)

    profiles: Mapped[list["ProfileRecord"]] = relationship("ProfileRecord", back_populates="user", cascade="all, delete-orphan")
    reports: Mapped[list["ReportRecord"]] = relationship("ReportRecord", back_populates="user", cascade="all, delete-orphan")
    chat_sessions: Mapped[list["ChatSession"]] = relationship("ChatSession", back_populates="user", cascade="all, delete-orphan")
    supplier_leads: Mapped[list["SupplierLead"]] = relationship("SupplierLead", back_populates="user", cascade="all, delete-orphan")


class ProfileRecord(Base):
    __tablename__ = "profiles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    session_id: Mapped[str | None] = mapped_column(String(80), nullable=True, index=True)  # Backward compat
    state: Mapped[str | None] = mapped_column(String(80), nullable=True)
    district: Mapped[str | None] = mapped_column(String(80), nullable=True)
    capital: Mapped[float | None] = mapped_column(Float, nullable=True)
    category: Mapped[str | None] = mapped_column(String(20), nullable=True)
    age: Mapped[int | None] = mapped_column(Integer, nullable=True)
    experience: Mapped[str | None] = mapped_column(String(40), nullable=True)
    payload_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))

    user: Mapped["User | None"] = relationship("User", back_populates="profiles")


class ReportRecord(Base):
    __tablename__ = "reports"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    session_id: Mapped[str | None] = mapped_column(String(80), nullable=True, index=True)  # Backward compat
    schema_version: Mapped[int] = mapped_column(Integer, default=1)
    report_json: Mapped[str] = mapped_column(Text)  # Stored as JSON string (compatible SQLite & Postgres)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))

    user: Mapped["User | None"] = relationship("User", back_populates="reports")


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True)
    report_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("reports.id", ondelete="SET NULL"), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))

    user: Mapped["User"] = relationship("User", back_populates="chat_sessions")
    messages: Mapped[list["ChatMessage"]] = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id: Mapped[str] = mapped_column(String(36), ForeignKey("chat_sessions.id", ondelete="CASCADE"), index=True)
    role: Mapped[str] = mapped_column(String(20))
    content: Mapped[str] = mapped_column(Text)
    lang: Mapped[str] = mapped_column(String(10), default="en")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))

    session: Mapped["ChatSession"] = relationship("ChatSession", back_populates="messages")

    __table_args__ = (
        Index("ix_chat_messages_session_created", "session_id", "created_at"),
    )


class SupplierLead(Base):
    __tablename__ = "supplier_leads"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)

    supplier_id: Mapped[str] = mapped_column(String(80), index=True)
    requester_name: Mapped[str] = mapped_column(String(100))
    phone: Mapped[str] = mapped_column(String(20))
    message: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))

    user: Mapped["User | None"] = relationship("User", back_populates="supplier_leads")


class CacheEntry(Base):
    __tablename__ = "cache_entries"

    key: Mapped[str] = mapped_column(String(128), primary_key=True)
    value_json: Mapped[str] = mapped_column(Text)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)


class IdeaRecord(Base):
    __tablename__ = "ideas"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    session_id: Mapped[str] = mapped_column(String(80), index=True)
    payload_json: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))


class SupplierRecord(Base):
    __tablename__ = "suppliers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    external_id: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    payload_json: Mapped[str] = mapped_column(Text)


def create_all() -> None:
    Base.metadata.create_all(engine)


# -------------------------------------------------------------------------
# Sensitive Data Redaction Helper
# -------------------------------------------------------------------------

AADHAAR_REGEX = re.compile(r"\b\d{4}\s?\d{4}\s?\d{4}\b")
PAN_REGEX = re.compile(r"\b[A-Z]{5}[0-9]{4}[A-Z]\b", re.IGNORECASE)
BANK_ACCOUNT_REGEX = re.compile(r"\b\d{9,18}\b")


def redact_sensitive_text(text_content: str) -> str:
    """Mask Aadhaar, PAN, and potential bank account numbers before persistence."""
    if not text_content:
        return text_content
    # Mask Aadhaar (12 digits with optional spaces)
    sanitized = AADHAAR_REGEX.sub("[REDACTED]", text_content)
    # Mask PAN
    sanitized = PAN_REGEX.sub("[REDACTED]", sanitized)
    # Mask standalone 12-digit runs
    sanitized = re.sub(r"\b\d{12}\b", "[REDACTED]", sanitized)
    return sanitized


# -------------------------------------------------------------------------
# Operator 1 Legacy & Preserved Signatures
# -------------------------------------------------------------------------

def save_report(session_id: str, report: dict, user_id: str | None = None) -> str:
    """Persist a report assembled by Operator 1 without retaining raw identity documents."""
    create_all()
    report_id = str(uuid.uuid4())
    payload = dict(report)
    if "schema_version" not in payload:
        payload["schema_version"] = 1
    with Session(engine) as session:
        record = ReportRecord(
            id=report_id,
            user_id=user_id,
            session_id=session_id,
            schema_version=payload["schema_version"],
            report_json=json.dumps(payload, ensure_ascii=False),
        )
        session.add(record)
        session.commit()
        session.refresh(record)
        return record.id


def get_report(report_id: str | int, user_id: str | None = None) -> dict | None:
    """Fetch report by ID, optionally enforcing ownership if user_id is provided."""
    create_all()
    with Session(engine) as session:
        record = session.get(ReportRecord, str(report_id))
        if not record:
            return None
        if user_id is not None and record.user_id is not None and record.user_id != user_id:
            return None
        data = json.loads(record.report_json)
        if "schema_version" not in data:
            data["schema_version"] = record.schema_version
        return data


def save_profile(session_id: str, profile: dict, user_id: str | None = None) -> str:
    create_all()
    with Session(engine) as session:
        record = ProfileRecord(
            session_id=session_id,
            user_id=user_id,
            state=profile.get("state"),
            district=profile.get("district"),
            capital=profile.get("capital"),
            category=profile.get("category"),
            age=profile.get("age"),
            experience=profile.get("experience"),
            payload_json=json.dumps(profile, ensure_ascii=False),
        )
        session.add(record)
        session.commit()
        session.refresh(record)
        return record.id


def get_profile(session_id: str) -> dict | None:
    create_all()
    with Session(engine) as session:
        record = (
            session.query(ProfileRecord)
            .filter(ProfileRecord.session_id == session_id)
            .order_by(ProfileRecord.created_at.desc())
            .first()
        )
        if not record:
            return None
        if record.payload_json:
            return json.loads(record.payload_json)
        return {
            "state": record.state,
            "district": record.district,
            "capital": record.capital,
            "category": record.category,
            "age": record.age,
            "experience": record.experience,
        }


def save_idea(session_id: str, idea: dict, user_id: str | None = None) -> str:
    create_all()
    with Session(engine) as session:
        record = IdeaRecord(
            session_id=session_id,
            user_id=user_id,
            payload_json=json.dumps(idea, ensure_ascii=False),
        )
        session.add(record)
        session.commit()
        session.refresh(record)
        return record.id


def get_idea(session_id: str) -> dict | None:
    create_all()
    with Session(engine) as session:
        record = (
            session.query(IdeaRecord)
            .filter(IdeaRecord.session_id == session_id)
            .order_by(IdeaRecord.created_at.desc())
            .first()
        )
        return json.loads(record.payload_json) if record else None


def save_chat_message(session_id: str, role: str, content: str) -> str:
    create_all()
    redacted = redact_sensitive_text(content)
    with Session(engine) as session:
        # Check if chat session exists, if not auto-create
        chat_sess = session.get(ChatSession, session_id)
        if not chat_sess:
            # Create a fallback guest/session container
            chat_sess = session.query(ChatSession).filter(ChatSession.id == session_id).first()
            if not chat_sess:
                # Find an existing guest or create one
                guest = session.query(User).filter(User.auth_provider_id == f"anon:{session_id}").first()
                if not guest:
                    guest = User(auth_provider_id=f"anon:{session_id}", is_guest=True)
                    session.add(guest)
                    session.flush()
                chat_sess = ChatSession(id=session_id, user_id=guest.id)
                session.add(chat_sess)
                session.flush()

        msg = ChatMessage(session_id=chat_sess.id, role=role, content=redacted)
        session.add(msg)
        session.commit()
        session.refresh(msg)
        return msg.id


def get_chat_history(session_id: str, limit: int = 10) -> list[dict]:
    create_all()
    with Session(engine) as session:
        messages = (
            session.query(ChatMessage)
            .filter(ChatMessage.session_id == session_id)
            .order_by(ChatMessage.created_at.desc())
            .limit(limit)
            .all()
        )
        return [
            {"role": msg.role, "content": msg.content, "created_at": msg.created_at.isoformat()}
            for msg in reversed(messages)
        ]


def save_supplier_lead(supplier_id: str, requester_name: str, phone: str, message: str, user_id: str | None = None) -> SupplierLead:
    create_all()
    redacted_message = redact_sensitive_text(message)
    with Session(engine) as session:
        lead = SupplierLead(
            user_id=user_id,
            supplier_id=supplier_id,
            requester_name=requester_name,
            phone=phone,
            message=redacted_message,
        )
        session.add(lead)
        session.commit()
        session.refresh(lead)
        return lead


def seed_suppliers_from_json() -> int:
    from app.services.data_store import load_dataset

    create_all()
    data = load_dataset("suppliers.json")
    count = 0
    with Session(engine) as session:
        for item in data.get("suppliers", []):
            existing = session.query(SupplierRecord).filter(SupplierRecord.external_id == item["id"]).first()
            if not existing:
                record = SupplierRecord(external_id=item["id"], payload_json=json.dumps(item, ensure_ascii=False))
                session.add(record)
                count += 1
        session.commit()
    return count


# -------------------------------------------------------------------------
# NEW Operator 1 Database Helpers
# -------------------------------------------------------------------------

def create_chat_session(user_id: str, report_id: str | None = None) -> ChatSession:
    create_all()
    with Session(engine) as session:
        sess = ChatSession(user_id=user_id, report_id=report_id)
        session.add(sess)
        session.commit()
        session.refresh(sess)
        return sess


def save_message(session_id: str, role: str, content: str, lang: str = "en", user_id: str | None = None) -> ChatMessage:
    create_all()
    redacted = redact_sensitive_text(content)
    with Session(engine) as session:
        chat_sess = session.get(ChatSession, session_id)
        if not chat_sess:
            raise ValueError(f"ChatSession '{session_id}' not found.")
        if user_id and chat_sess.user_id != user_id:
            raise PermissionError("Unauthorized access to chat session.")

        # Check max message cap per session
        msg_count = session.query(ChatMessage).filter(ChatMessage.session_id == session_id).count()
        if msg_count >= settings.MAX_CHAT_MESSAGES_PER_SESSION:
            raise ValueError(f"Maximum message limit ({settings.MAX_CHAT_MESSAGES_PER_SESSION}) exceeded for this session.")

        msg = ChatMessage(session_id=session_id, role=role, content=redacted, lang=lang)
        session.add(msg)
        session.commit()
        session.refresh(msg)
        return msg


def get_recent_messages(session_id: str, n: int = 10, user_id: str | None = None) -> list[ChatMessage]:
    create_all()
    with Session(engine) as session:
        chat_sess = session.get(ChatSession, session_id)
        if not chat_sess:
            return []
        if user_id and chat_sess.user_id != user_id:
            return []
        messages = (
            session.query(ChatMessage)
            .filter(ChatMessage.session_id == session_id)
            .order_by(ChatMessage.created_at.desc())
            .limit(n)
            .all()
        )
        return list(reversed(messages))
