import asyncio
import json
import logging
import re
from collections.abc import AsyncGenerator
from pathlib import Path

from pydantic import BaseModel, ValidationError

from app.config import settings

log = logging.getLogger("llm")
SUPPORTED_LANGS = {"en", "hi", "mr"}
MAX_TOKENS = {"report_narrative": 3000, "default": 1500}

PROMPT_DIR = Path(__file__).parent / "prompts"

class ProviderTransientError(Exception):
    """Wrap SDK rate-limit / overloaded / connection errors in this class."""

def extract_json(text: str) -> str:
    text = re.sub(r"^```(?:json)?|```$", "", text.strip(), flags=re.MULTILINE).strip()
    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end == -1:
        raise ValueError("no JSON object found")
    return text[start:end + 1]

def load_prompt(prompt_name: str) -> str:
    path = PROMPT_DIR / f"{prompt_name}.md"
    if not path.exists():
        raise FileNotFoundError(f"Prompt template not found: {prompt_name}")
    return path.read_text(encoding="utf-8")

def render_prompt(template: str, variables: dict) -> str:
    try:
        return template.format(**variables)
    except KeyError as e:
        log.warning(f"Missing variable in prompt template: {e}")
        return template

async def generate_json(
    provider,
    prompt_name: str,
    system: str,
    user: str,
    schema: type[BaseModel],
    lang: str,
    fallback,
    attempts: int = 3,
    timeout: int = 30,
    sleep=asyncio.sleep
) -> tuple[BaseModel, str]:
    if lang not in SUPPORTED_LANGS:
        lang = "en"
    last = None
    for attempt in range(attempts):
        try:
            resp = await asyncio.wait_for(
                provider.complete(
                    system=system,
                    user=user,
                    temperature=0.3,
                    max_tokens=MAX_TOKENS.get(prompt_name, MAX_TOKENS["default"])
                ),
                timeout=timeout
            )
            if resp.stop_reason == "max_tokens":
                raise ValueError("output truncated")
            parsed = schema.model_validate_json(extract_json(resp.text))
            return parsed, "llm"
        except (ValidationError, ValueError, json.JSONDecodeError) as e:
            last = e
            user += f"\n\nYour previous output was invalid ({type(e).__name__}). Return ONLY one valid JSON object."
        except (TimeoutError, ProviderTransientError) as e:
            last = e
            await sleep(2 ** attempt)
    log.warning("LLM failed for %s: %s", prompt_name, last)
    return fallback(), "fallback"

class AnthropicProvider:
    """Provider adapter around Anthropic SDK that standardizes responses and errors."""
    def __init__(self):
        self._client = None

    @property
    def client(self):
        if self._client is None:
            from anthropic import AsyncAnthropic
            self._client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
        return self._client

    async def complete(self, system: str, user: str, temperature: float = 0.3, max_tokens: int = 1500):
        from types import SimpleNamespace
        if not settings.ANTHROPIC_API_KEY:
            raise ProviderTransientError("ANTHROPIC_API_KEY not configured")
        try:
            kwargs = {
                "model": settings.LLM_MODEL,
                "system": system,
                "messages": [{"role": "user", "content": user}],
                "max_tokens": max_tokens,
                "timeout": settings.LLM_TIMEOUT,
            }
            res = await self.client.messages.create(**kwargs)
            return SimpleNamespace(
                text=res.content[0].text if res.content else "",
                stop_reason=res.stop_reason or "end_turn"
            )
        except Exception as e:
            err_str = str(e).lower()
            if any(term in err_str for term in ["rate_limit", "overloaded", "connection", "timeout", "529", "429", "auth", "api_key"]):
                raise ProviderTransientError(str(e)) from e
            raise ProviderTransientError(f"Provider error: {e}") from e

class LLMClient:
    """High-level client wrapper used across routers and services."""
    def __init__(self):
        self.provider = AnthropicProvider()
        self._system_prompt = None

    @property
    def system_prompt(self) -> str:
        if self._system_prompt is None:
            try:
                self._system_prompt = load_prompt("system_base")
            except FileNotFoundError:
                self._system_prompt = "You are a financial-inclusion advisor for rural India."
        return self._system_prompt

    async def generate_json(
        self,
        prompt_name: str,
        variables: dict,
        schema: type[BaseModel],
        lang: str = "en",
        max_tokens: int | None = None
    ) -> BaseModel:
        from app.llm.fallbacks import get_fallback
        if lang not in SUPPORTED_LANGS:
            lang = "en"

        template = load_prompt(prompt_name)
        # Injection hygiene: wrap raw_input if present
        if "raw_input" in variables:
            variables["raw_input"] = f"<user_input>{variables['raw_input']}</user_input>"

        variables["lang"] = lang
        variables["schema_description"] = json.dumps(schema.model_json_schema(), indent=2)

        user_content = render_prompt(template, variables)
        system_content = render_prompt(self.system_prompt, {"lang": lang})

        fallback_fn = lambda: get_fallback(prompt_name, variables, schema)

        result, source = await generate_json(
            provider=self.provider,
            prompt_name=prompt_name,
            system=system_content,
            user=user_content,
            schema=schema,
            lang=lang,
            fallback=fallback_fn,
            timeout=settings.LLM_TIMEOUT
        )
        return result

    async def stream_text(
        self,
        prompt_name: str,
        variables: dict,
        lang: str = "en",
        max_tokens: int | None = None
    ) -> AsyncGenerator[str, None]:
        if lang not in SUPPORTED_LANGS:
            lang = "en"
        template = load_prompt(prompt_name)
        variables["lang"] = lang
        user_content = render_prompt(template, variables)
        system_content = render_prompt(self.system_prompt, {"lang": lang})

        try:
            async with self.provider.client.messages.stream(
                model=settings.LLM_MODEL,
                max_tokens=max_tokens or MAX_TOKENS.get(prompt_name, 1500),
                temperature=settings.LLM_TEMPERATURE,
                system=system_content,
                messages=[{"role": "user", "content": user_content}],
            ) as stream:
                async for text in stream.text_stream:
                    yield text
        except Exception as e:
            log.error(f"Stream failed for [{prompt_name}]: {e}")
            yield "I apologize, but I am unable to connect to the assistant service right now."

llm_client = LLMClient()
