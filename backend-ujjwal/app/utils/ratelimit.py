"""Dependency-free fixed-window limiter for the demo deployment.

Swap this implementation for shared Redis/slowapi before horizontally scaling.
"""

from __future__ import annotations

import os
from collections import deque
from threading import RLock
from time import monotonic


class InMemoryRateLimiter:
    def __init__(self, max_requests: int | None = None, window_seconds: int | None = None) -> None:
        demo_mode = os.getenv("DEMO_MODE", "false").lower() in ("true", "1", "yes")
        default_max = 1000 if demo_mode else 60
        self.max_requests = max_requests if max_requests is not None else int(os.getenv("RATE_LIMIT_MAX_REQUESTS", str(default_max)))
        self.window_seconds = window_seconds if window_seconds is not None else int(os.getenv("RATE_LIMIT_WINDOW_SECONDS", "60"))
        self._requests: dict[str, deque[float]] = {}
        self._lock = RLock()

    def allow(self, key: str) -> bool:
        now = monotonic()
        with self._lock:
            calls = self._requests.setdefault(key, deque())
            while calls and calls[0] <= now - self.window_seconds:
                calls.popleft()
            if len(calls) >= self.max_requests:
                return False
            calls.append(now)
            return True

    def reset(self) -> None:
        with self._lock:
            self._requests.clear()
