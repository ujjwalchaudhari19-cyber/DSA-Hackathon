import json
import logging
from collections import defaultdict
from collections.abc import AsyncGenerator

from app.llm.client import llm_client
from app.schemas.models import Language, Profile

logger = logging.getLogger(__name__)


class AdvisorService:
    """Context-aware AI advisor with conversation memory."""
    
    def __init__(self):
        # In-memory conversation store (session_id -> list of messages)
        # In production, this would use Redis or DB
        self._conversations: dict[str, list[dict]] = defaultdict(list)
    
    async def chat(
        self,
        message: str,
        session_id: str | None,
        profile: Profile | None,
        report_summary: dict | None,
        lang: Language
    ) -> AsyncGenerator[str, None]:
        """Stream a response from the AI advisor."""
        sid = session_id or "default"
        
        # Add user message to history
        self._conversations[sid].append({
            "role": "user",
            "content": message
        })
        
        # Keep only last 10 turns
        history = self._conversations[sid][-20:]  # 10 turns = 20 messages
        
        # Build context
        profile_str = json.dumps(profile.model_dump(), indent=2) if profile else "Not provided"
        report_str = json.dumps(report_summary, indent=2) if report_summary else "No report generated yet"
        
        variables = {
            "profile": profile_str,
            "business_summary": report_summary.get("business_type", "Not specified") if report_summary else "Not specified",
            "report_summary": report_str,
            "schemes_summary": report_summary.get("schemes", "No schemes matched yet") if report_summary else "No schemes matched yet",
            "score": report_summary.get("score", "N/A") if report_summary else "N/A",
            "verdict": report_summary.get("verdict", "N/A") if report_summary else "N/A",
            "history": json.dumps(history, indent=2, ensure_ascii=False),
            "message": message,
        }
        
        collected_response = ""
        async for chunk in llm_client.stream_text(
            prompt_name="advisor_chat",
            variables=variables,
            lang=lang.value,
            max_tokens=1500
        ):
            collected_response += chunk
            yield chunk
        
        # Save assistant response to history
        self._conversations[sid].append({
            "role": "assistant",
            "content": collected_response
        })


advisor_service = AdvisorService()
