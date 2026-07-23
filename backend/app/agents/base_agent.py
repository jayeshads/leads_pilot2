import asyncio
import json
from abc import ABC, abstractmethod
from typing import Any, Dict

from app.services import llm_service


def parse_json(response) -> dict:
    """Helper to safely parse JSON if it's a string, or return as-is if already dict."""
    if isinstance(response, dict):
        return response
    try:
        return json.loads(response)
    except Exception:
        return {}


class BaseAgent(ABC):
    def __init__(self, name: str):
        self.name = name
    
    @abstractmethod
    async def run(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute agent logic. Returns updated context + response."""
        pass
    
    async def call_llm(self, system_prompt: str, user_message: str) -> dict:
        """
        Uses the existing llm_service to make a JSON-mode chat call.
        Runs in a thread to avoid blocking the async event loop.
        """
        response = await asyncio.to_thread(
            llm_service.chat_json,
            prompt=user_message,
            system=system_prompt,
            temperature=0.3
        )
        return response
