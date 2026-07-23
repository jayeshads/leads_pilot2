from .base_agent import BaseAgent, parse_json
from .business_analyzer import BusinessAnalyzerAgent
from .audience_creator import AudienceCreatorAgent
from .campaign_structure import CampaignStructureAgent
from .creative_generator import CreativeGeneratorAgent
from .landing_page_agent import LandingPageAgent
from .meta_check_agent import MetaCheckAgent

HEAD_PROMPT = """You are the Head Orchestrator of LeadPilot, a Meta Ads AI SaaS.
Your job: analyze the user's message and current conversation state, then decide which specialist agent to invoke next.

Current stage: {stage}
Business info collected: {business_info}
Campaign info collected: {campaign_info}
Meta setup status: {meta_setup_status}

Available agents:
- meta_check: When user asks about their Facebook connection status, or when they return after connecting their FB account.
- business_analyzer: When user's business info is incomplete or just starting
- audience_creator: When business is understood, need to build audience (or transition from business analyzer)
- campaign_structure: When audience ready, need budget/objective/name/location
- creative_generator: When structure ready, generate ad creatives
- landing_page_agent: When conversion goal = landing page and creatives are ready
- publish: When user confirms to publish the campaign

Return ONLY a JSON object:
{{"next_agent": "<name of the agent>", "reasoning": "<why you chose it>"}}
"""

class HeadAgent(BaseAgent):
    def __init__(self):
        super().__init__(name="head")
        self.agents = {
            "business_analyzer": BusinessAnalyzerAgent(),
            "audience_creator": AudienceCreatorAgent(),
            "campaign_structure": CampaignStructureAgent(),
            "creative_generator": CreativeGeneratorAgent(),
            "landing_page_agent": LandingPageAgent(),
            "meta_check": MetaCheckAgent(),
        }
    
    async def run(self, context, emit_event=None):
        # Build prompt with current state
        prompt = HEAD_PROMPT.format(
            stage=context.get("stage", "start"),
            business_info=context.get("business_info", {}),
            campaign_info=context.get("campaign_info", {}),
            meta_setup_status=context.get("meta_setup_status", "unknown"),
        )
        
        # Ask LLM to decide next agent
        decision = await self.call_llm(prompt, context["user_message"])
        decision_json = parse_json(decision)
        
        # Default to business_analyzer if it fails to pick
        next_agent_name = decision_json.get("next_agent", "business_analyzer")
        
        if next_agent_name == "publish":
            return {
                "response": "Congratulations! Aapka campaign live hone ke liye ready hai. Publishing...",
                "context": context,
                "preview_data": {"type": "publish", "status": "publishing"}
            }
        
        # Route to the chosen agent
        agent = self.agents.get(next_agent_name)
        if not agent:
            agent = self.agents["business_analyzer"]
            
        if next_agent_name == "meta_check":
            result = await agent.run(context, emit_event=emit_event)
        else:
            result = await agent.run(context)
        
        # Update context and return
        context.update(result.get("context_updates", {}))
        context["last_agent"] = next_agent_name
        
        return {
            "response": result.get("message", "I am thinking..."),
            "context": context,
            "preview_data": result.get("preview_data"),
        }
