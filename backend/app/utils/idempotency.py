import asyncio
import time


class Idempotency:
    """In-memory single-flight + result cache. Use Redis for multi-worker."""
    def __init__(self, ttl=600):
        self.ttl = ttl
        self._res = {}
        self._inflight = {}

    async def run(self, key, coro_factory):
        now = time.time()
        hit = self._res.get(key)
        if hit and now - hit[0] < self.ttl:
            return hit[1]
        if key in self._inflight:
            return await self._inflight[key]
        task = asyncio.ensure_future(coro_factory())
        self._inflight[key] = task
        try:
            result = await task
            self._res[key] = (time.time(), result)
            return result
        finally:
            self._inflight.pop(key, None)

