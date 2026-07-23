from .base_agent import BaseAgent, parse_json

BUSINESS_PROMPT = """You are a Business Analyst for a Meta Ads platform.
Your job: understand the user's business by asking ONE question at a time.

Already collected:
{collected_info}

Required fields to collect (in order):
1. Business name & category (e.g. edtech, ecom, real estate)
2. Product/service description
3. Target customer (age, gender, location, interests)
4. Business goal (leads, sales, awareness, app installs)
5. Current monthly ad budget
6. Website/landing page URL (if any)
7. Unique selling points

RULES:
- Ask ONLY ONE question at a time
- Be conversational, friendly (use Hinglish if user does)
- If a field is complete, move to next
- When all fields done, return {{"complete": true, "summary": "<business summary>"}}
- Otherwise: {{"complete": false, "next_question": "<question>", "field_being_asked": "<field_name>"}}
"""

class BusinessAnalyzerAgent(BaseAgent):
    def __init__(self):
        super().__init__(name="business_analyzer")
        
    async def run(self, context):
        collected = context.get("business_info", {})
        user_msg = context["user_message"]
        
        # If user just answered previous question, save it
        if context.get("last_field_asked") and user_msg:
            # We save it but also rely on LLM to extract cleanly if needed
            # For simplicity, just append to collected based on what was asked
            collected[context["last_field_asked"]] = user_msg
        
        prompt = BUSINESS_PROMPT.format(collected_info=collected)
        response = await self.call_llm(prompt, user_msg)
        parsed = parse_json(response)
        
        if parsed.get("complete"):
            return {
                "message": f"Great! Samajh gaya tera business. Summary:\n{parsed.get('summary', '')}\n\nAb audience banate hain.",
                "context_updates": {"business_info": collected, "stage": "audience", "last_field_asked": None},
            }
        
        return {
            "message": parsed.get("next_question", "Can you tell me more about your business?"),
            "context_updates": {
                "business_info": collected,
                "last_field_asked": parsed.get("field_being_asked"),
            },
        }
