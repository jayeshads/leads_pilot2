from .base_agent import BaseAgent, parse_json

AUDIENCE_PROMPT = """You are a Meta Ads Audience Expert.
Your job: take the collected business info and create target audience parameters.

Business Info:
{business_info}

Return ONLY a JSON object with:
{
    "location": ["list of locations"],
    "age_min": integer,
    "age_max": integer,
    "genders": ["all" or "male" or "female"],
    "interests": ["list of interest keywords"],
    "placements": ["facebook_feed", "instagram_feed", "reels", etc],
    "estimated_reach": "string range like 2M - 5M"
}
"""

class AudienceCreatorAgent(BaseAgent):
    def __init__(self):
        super().__init__(name="audience_creator")
        
    async def run(self, context):
        business_info = context.get("business_info", {})
        
        prompt = AUDIENCE_PROMPT.format(business_info=business_info)
        # Empty user message as we are just processing context for now
        response = await self.call_llm(prompt, "Create audience parameters based on business info.")
        parsed = parse_json(response)
        
        return {
            "message": "Audience details generate ho gaye hain. Ab campaign structure decide karte hain.",
            "context_updates": {
                "audience_info": parsed,
                "stage": "campaign_structure"
            },
            "preview_data": {
                "type": "audience",
                "data": parsed
            }
        }
