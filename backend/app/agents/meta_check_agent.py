from .base_agent import BaseAgent
from app.services import meta_service
from app.db.meta_store import get_meta_connection

class MetaCheckAgent(BaseAgent):
    async def run(self, context: dict, emit_event=None) -> dict:
        user_id = context.get("user_id")
        
        if emit_event:
            await emit_event({"type": "tool_start", "tool": "compliance_check", "input": {}})
            
        # Fetch from DB
        conn = get_meta_connection(user_id)
        if not conn or not conn.get("access_token"):
            if emit_event:
                await emit_event({"type": "tool_end", "tool": "compliance_check", "output_summary": "Not connected"})
            return {
                "message": "It looks like you haven't connected your Facebook account yet. Please connect your Facebook account from the Dashboard to continue.",
                "context_updates": {"meta_setup_status": "disconnected", "stage": "meta_check"},
            }
            
        access_token = conn["access_token"]
        
        try:
            businesses = await meta_service.get_user_businesses(access_token)
            ad_accounts = await meta_service.get_ad_accounts(access_token)
            pages = await meta_service.get_pages(access_token)
        except Exception as e:
            if emit_event:
                await emit_event({"type": "tool_end", "tool": "compliance_check", "output_summary": "Error checking Meta API"})
            return {
                "message": f"There was an error communicating with Facebook. Please try reconnecting your account.",
                "context_updates": {"meta_setup_status": "error", "stage": "meta_check"}
            }
        
        missing = []
        if not businesses:
            missing.append("Business Manager (BM)")
        if not ad_accounts:
            missing.append("Ad Account")
        if not pages:
            missing.append("Facebook Page")
            
        if emit_event:
            await emit_event({"type": "tool_end", "tool": "compliance_check", "output_summary": f"Found missing: {missing}"})
            
        if missing:
            missing_str = ", ".join(missing)
            return {
                "message": f"Your Facebook account is connected, but you are missing some assets: {missing_str}. Please contact our support team for help setting this up.",
                "context_updates": {"meta_setup_status": "incomplete", "missing_assets": missing, "stage": "meta_check"},
            }
            
        if conn.get("status") == "active":
            return {
                "message": f"Great! Your Meta assets are already connected and ready. We can proceed with campaign publishing.",
                "context_updates": {
                    "meta_setup_status": "ready",
                    "stage": "discovery" # redirect back to discovery or next step
                },
            }
            
        return {
            "message": f"Perfect! Your account has {len(businesses)} BM(s), {len(ad_accounts)} ad account(s), and {len(pages)} page(s). Please go to the Connect page to select the ones you want to use.",
            "context_updates": {
                "meta_setup_status": "ready",
                "available_bm": businesses,
                "available_ad_accounts": ad_accounts,
                "available_pages": pages,
                "stage": "meta_check"
            },
        }
