import json
import logging

from pydantic import BaseModel

logger = logging.getLogger(__name__)

REPAIR_PROMPT = """The previous response was not valid JSON matching the required schema.

Original response:
```
{original_response}
```

Validation error:
```
{error}
```

Required JSON schema:
```json
{schema}
```

Please return ONLY valid JSON matching the schema above. No extra text, no markdown code blocks. Just the raw JSON object."""

async def attempt_repair(
    client,
    model: str,
    system: str,
    original_response: str,
    error: str,
    schema: type[BaseModel],
    max_tokens: int = 4096,
    temperature: float = 0.1,
    timeout: int = 30
) -> BaseModel:
    """Attempt to repair a malformed LLM response by sending the error back."""
    repair_msg = REPAIR_PROMPT.format(
        original_response=original_response[:2000],  # truncate to save tokens
        error=error[:1000],
        schema=json.dumps(schema.model_json_schema(), indent=2)
    )
    
    response = await client.messages.create(
        model=model,
        max_tokens=max_tokens,
        temperature=temperature,
        system=system,
        messages=[{"role": "user", "content": repair_msg}],
        timeout=timeout
    )
    
    raw_text = response.content[0].text.strip()
    # Extract JSON
    if "```json" in raw_text:
        start = raw_text.index("```json") + 7
        end = raw_text.index("```", start)
        raw_text = raw_text[start:end].strip()
    elif "```" in raw_text:
        start = raw_text.index("```") + 3
        end = raw_text.index("```", start)
        raw_text = raw_text[start:end].strip()
    
    parsed = json.loads(raw_text)
    return schema.model_validate(parsed)
