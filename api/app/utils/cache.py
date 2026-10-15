"""Thread-safe bounded TTL cache for deterministic demo data and LLM prompt caching."""

from __future__ import annotations

import copy
import hashlib
from dataclasses import dataclass
from pathlib import Path
from threading import RLock
from time import monotonic
from typing import Any, Generic, TypeVar

T = TypeVar("T")

DATA_DIR = Path(__file__).resolve().parents[1] / "data"


def compute_data_version() -> str:
    try:
        hasher = hashlib.sha256()
        for p in sorted(DATA_DIR.glob("*.json")):
            hasher.update(p.name.encode("utf-8"))
            hasher.update(p.read_bytes())
        return hasher.hexdigest()[:16]
    except Exception:
        return "v1_default"


DATA_VERSION = compute_data_version()


@dataclass
class _CacheValue(Generic[T]):
    value: T
    expires_at: float


class TTLCache(Generic[T]):
    def __init__(self, ttl_seconds: int = 86_400, maxsize: int = 2_000) -> None:
        self.ttl_seconds = ttl_seconds
        self.maxsize = maxsize
        self._values: dict[str, _CacheValue[T]] = {}
        self._lock = RLock()

    def get(self, key: str) -> T | None:
        with self._lock:
            item = self._values.get(key)
            if item is None:
                return None
            if item.expires_at <= monotonic():
                self._values.pop(key, None)
                return None
            return copy.deepcopy(item.value)

    def set(self, key: str, value: T) -> T:
        now = monotonic()
        copied = copy.deepcopy(value)
        with self._lock:
            # Enforce maxsize boundary
            if len(self._values) >= self.maxsize:
                # Evict expired keys first
                expired_keys = [k for k, v in self._values.items() if v.expires_at <= now]
                for k in expired_keys:
                    self._values.pop(k, None)
                # If still at capacity, evict oldest key
                if len(self._values) >= self.maxsize:
                    oldest_key = next(iter(self._values))
                    self._values.pop(oldest_key, None)

            self._values[key] = _CacheValue(copied, now + self.ttl_seconds)
        return copy.deepcopy(copied)

    def clear(self) -> None:
        with self._lock:
            self._values.clear()


cache: TTLCache[Any] = TTLCache()
