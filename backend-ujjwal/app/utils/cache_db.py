"""Database-backed persistent cache for expensive Operator 1 LLM narrative and analytical calls."""

from __future__ import annotations

import copy
import json
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy.orm import Session

from app.models.database import CacheEntry, engine
from app.utils.cache import DATA_VERSION


class DatabaseCache:
    """Thread-safe DB-backed persistent cache with automated expiry and deep-copy guarantees."""

    def __init__(self, default_ttl_seconds: int = 86400) -> None:
        self.default_ttl_seconds = default_ttl_seconds

    def build_key(
        self,
        base_name: str,
        inputs: dict[str, Any] | list | tuple | str,
        lang: str = "en",
        user_id: str | None = None,
    ) -> str:
        """Construct deterministic hash key combining inputs, lang, DATA_VERSION, and optional user_id."""
        import hashlib
        serialized_inputs = json.dumps(inputs, sort_keys=True, default=str)
        content_hash = hashlib.sha256(serialized_inputs.encode("utf-8")).hexdigest()[:16]
        user_part = f":u_{user_id}" if user_id else ""
        return f"dbcache:{base_name}:{DATA_VERSION}:{lang}{user_part}:{content_hash}"

    def get(self, key: str) -> Any | None:
        """Fetch cached value. Expired entries are ignored and cleaned up."""
        now = datetime.now(UTC)
        with Session(engine) as session:
            entry = session.get(CacheEntry, key)
            if not entry:
                return None
            # Check expiry
            entry_expires = entry.expires_at
            if entry_expires.tzinfo is None:
                entry_expires = entry_expires.replace(tzinfo=UTC)
            if entry_expires <= now:
                # Expired -> delete on read and return None
                session.delete(entry)
                session.commit()
                return None
            try:
                parsed = json.loads(entry.value_json)
                return copy.deepcopy(parsed)
            except Exception:
                return None

    def set(self, key: str, value: Any, ttl: int | None = None) -> Any:
        """Store value with specified or default TTL. Returns a deep copy."""
        ttl_seconds = ttl if ttl is not None else self.default_ttl_seconds
        expires_at = datetime.now(UTC) + timedelta(seconds=ttl_seconds)
        serialized = json.dumps(value, ensure_ascii=False, default=str)

        with Session(engine) as session:
            existing = session.get(CacheEntry, key)
            if existing:
                existing.value_json = serialized
                existing.expires_at = expires_at
            else:
                entry = CacheEntry(key=key, value_json=serialized, expires_at=expires_at)
                session.add(entry)
            session.commit()

        return copy.deepcopy(value)

    def cleanup_expired(self) -> int:
        """Delete all expired rows from cache_entries."""
        now = datetime.now(UTC)
        with Session(engine) as session:
            deleted = session.query(CacheEntry).filter(CacheEntry.expires_at <= now).delete()
            session.commit()
            return deleted


cache_db = DatabaseCache()

