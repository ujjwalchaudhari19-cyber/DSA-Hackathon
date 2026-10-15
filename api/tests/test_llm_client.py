import asyncio, pytest
from types import SimpleNamespace as NS
from pydantic import BaseModel
from app.config import settings
from app.llm.client import MultiProvider, ProviderTransientError, generate_json

class S(BaseModel):
    summary: str

class P:
    def __init__(self, outs):
        self.outs, self.n = list(outs), 0
    async def complete(self, **kw):
        self.n += 1
        o = self.outs.pop(0)
        if isinstance(o, Exception):
            raise o
        return o

ok = lambda t, stop="end_turn": NS(text=t, stop_reason=stop)
nosleep = lambda s: asyncio.sleep(0)
fb = lambda: S(summary="fallback")
run = lambda p: asyncio.run(generate_json(p, "x", "sys", "usr", S, "fr", fb, sleep=nosleep))

def test_fenced_json():
    r, src = run(P([ok('```json\n{"summary":"hi"}\n```')]))
    assert (r.summary, src) == ("hi", "llm")

def test_truncated_then_ok():
    p = P([ok('{"summary":"hi', "max_tokens"), ok('{"summary":"hi"}')])
    r, src = run(p)
    assert src == "llm" and p.n == 2

def test_transient_then_ok():
    p = P([ProviderTransientError(), asyncio.TimeoutError(), ok('{"summary":"ok"}')])
    r, src = run(p)
    assert src == "llm"

def test_always_fails_returns_valid_fallback():
    r, src = run(P([ok("nope")] * 3))
    assert isinstance(r, S) and src == "fallback"

def test_provider_down_returns_fallback():
    r, src = run(P([ProviderTransientError()] * 3))
    assert src == "fallback"


def test_configured_provider_is_honoured(monkeypatch):
    monkeypatch.setattr(settings, "LLM_PROVIDER", "groq")
    monkeypatch.setattr(settings, "GROQ_API_KEY", "test-key")
    monkeypatch.setattr(settings, "OPENAI_API_KEY", "openai-key")
    assert MultiProvider()._get_active_provider() == "groq"

