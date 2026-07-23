from .base_agent import BaseAgent, parse_json

LANDING_PAGE_PROMPT = """You are a Landing Page Template Matcher.
Your job: Match the best template based on the business category and campaign goal.

Business Info: {business_info}
Campaign Info: {campaign_info}

Available Templates (Mock):
1. 'edtech_lead_gen_01' (Best for K-12 and courses, goal: LEADS)
2. 'ecom_sales_01' (Best for physical products, goal: SALES)
3. 'generic_awareness_01' (Best for brand building, goal: AWARENESS)

Return ONLY a JSON object:
{
    "selected_template": "template name",
    "reasoning": "why you selected it"
}
"""

class LandingPageAgent(BaseAgent):
    def __init__(self):
        super().__init__(name="landing_page_agent")
        
    async def run(self, context):
        business_info = context.get("business_info", {})
        campaign_info = context.get("campaign_info", {})
        
        prompt = LANDING_PAGE_PROMPT.format(
            business_info=business_info,
            campaign_info=campaign_info
        )
        response = await self.call_llm(prompt, "Select the best landing page template.")
        parsed = parse_json(response)
        
        return {
            "message": f"Landing page template '{parsed.get('selected_template')}' select kar liya gaya hai. Sab kuch ready hai! Kya aap publish karna chahte hain?",
            "context_updates": {
                "landing_page": parsed,
                "stage": "publish"
            },
            "preview_data": {
                "type": "landing_page",
                "data": parsed
            }
        }
