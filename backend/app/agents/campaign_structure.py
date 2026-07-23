from .base_agent import BaseAgent, parse_json
from datetime import datetime

CAMPAIGN_PROMPT = """You are a Meta Ads Campaign Strategist.
Your job: take the collected business info and create a campaign structure.

Business Info:
{business_info}

Return ONLY a JSON object with:
{
    "campaign_name": "string (e.g. LeadPilot_EdTech_Nov2025)",
    "objective": "OUTCOME_LEADS or OUTCOME_SALES or OUTCOME_AWARENESS",
    "daily_budget": integer (suggest a reasonable amount in INR),
    "duration_days": integer,
    "conversion_event": "LEAD or PURCHASE",
    "optimization_goal": "OFFSITE_CONVERSIONS or REACH",
    "estimated_cpl": "string benchmark e.g. Rs 100 - 200"
}
"""

class CampaignStructureAgent(BaseAgent):
    def __init__(self):
        super().__init__(name="campaign_structure")
        
    async def run(self, context):
        business_info = context.get("business_info", {})
        
        prompt = CAMPAIGN_PROMPT.format(business_info=business_info)
        response = await self.call_llm(prompt, "Create campaign structure based on business info.")
        parsed = parse_json(response)
        
        return {
            "message": "Campaign structure ready! Ab next step me creatives (ad images) generate karenge.",
            "context_updates": {
                "campaign_info": parsed,
                "stage": "creative"
            },
            "preview_data": {
                "type": "campaign",
                "data": parsed
            }
        }
