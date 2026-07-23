import uuid
import urllib.parse
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import RedirectResponse
from pydantic import BaseModel

from app import config
from app.db import approval_store, meta_store
from app.services import meta_ads_service, support_service
from app.services.meta_ads_service import MetaAdsError
from app.auth import get_current_user, CurrentUser, assert_business_access

# NOTE: auth is applied per-route here, not at the router level, because
# GET /meta/oauth/callback is hit by Meta's own server redirecting the
# user's browser — it carries no LeadPilot session/Bearer token at all.
# Router-wide auth would break the entire "connect your ad account" flow.
router = APIRouter(prefix="/api/meta", tags=["meta-ads"])


@router.get("/oauth/url")
def get_oauth_url(business_id: str, user: CurrentUser = Depends(get_current_user)):
    """Frontend redirects the user to this URL to connect their Meta Ad Account."""
    assert_business_access(business_id, user)
    # state carries business_id through the OAuth round-trip
    return {"oauth_url": meta_ads_service.build_oauth_url(state=business_id)}


@router.get("/oauth/callback")
def oauth_callback(code: str, state: str):
    """Meta redirects here after the user approves. `state` = business_id we sent
    earlier."""
    business_id = state
    redirect_base = f"{config.FRONTEND_URL.rstrip('/')}/dashboard/meta-account"
    try:
        token_data = meta_ads_service.exchange_code_for_token(code)
        access_token = token_data.get("access_token")
        if not access_token:
            return RedirectResponse(url=f"{redirect_base}?error=token_exchange_failed")

        ad_accounts = meta_ads_service.get_ad_accounts(access_token)
    except Exception as e:
        support_service.escalate(business_id, "api_error", str(e))
        return RedirectResponse(url=f"{redirect_base}?error={urllib.parse.quote(str(e))}")

    if not ad_accounts:
        return RedirectResponse(url=f"{redirect_base}?error=no_ad_accounts_found")

    ad_account_id = ad_accounts[0]["id"]
    ad_account_name = ad_accounts[0].get("name", "Meta Ad Account")
    meta_store.save_meta_account(business_id, ad_account_id, access_token,
                                  ["ads_management", "ads_read"], account_name=ad_account_name)

    return RedirectResponse(url=f"{redirect_base}?connected=true&account_id={ad_account_id}")


@router.delete("/account")
def disconnect_account(business_id: str, user: CurrentUser = Depends(get_current_user)):
    """Disconnect the Meta Ad Account for a business.

    The dashboard's own `meta_accounts` table only grants the client role a
    SELECT policy (see supabase/schema.sql -- "Clients read assigned meta
    account"); INSERT/UPDATE/DELETE are admin-only. The frontend used to
    fall back to deleting the row directly with the client's Supabase
    session, which RLS silently blocked. This backend connects to Postgres
    directly (not through PostgREST), so it isn't subject to that RLS
    policy and can perform the delete on the user's behalf after verifying
    they own the account.
    """
    assert_business_access(business_id, user)
    meta_store.disconnect_meta_account(business_id)
    return {"business_id": business_id, "status": "disconnected"}


class LaunchRequest(BaseModel):
    launched_by: str  # who's triggering the actual go-live, for the audit trail


@router.post("/campaigns/launch/{draft_id}")
def launch_campaign(draft_id: str, payload: LaunchRequest, user: CurrentUser = Depends(get_current_user)):
    """
    THE gated action. Fires only if:
    1) The draft exists and its approval status is exactly 'approved'
    2) This draft hasn't already been launched (checked in meta_store)
    3) A Meta account is connected for this business
    4) The budget is within the safety cap (re-checked inside meta_ads_service)
    5) The caller owns this draft's business_id (or is an admin)
    Any failure here raises a clear error and changes nothing.
    """
    draft = approval_store.get_draft(draft_id)
    if draft is None:
        raise HTTPException(404, f"No such draft: {draft_id}")
    assert_business_access(draft["business_id"], user)
    if draft["status"] != "approved":
        raise HTTPException(
            409,
            f"Draft status is '{draft['status']}', not 'approved'. "
            f"A campaign can only be launched after it has been approved in the Approval Gate.",
        )
    if meta_store.campaign_already_launched_for_draft(draft_id):
        raise HTTPException(409, "This draft has already been launched. Refusing to launch it a second time.")

    business_id = draft["business_id"]
    meta_account = meta_store.get_meta_account(business_id)
    if meta_account is None:
        raise HTTPException(
            400,
            f"No Meta Ad Account connected for business_id={business_id}. "
            f"Call GET /meta/oauth/url first to connect one.",
        )

    try:
        result = meta_ads_service.launch_campaign(
            meta_account["access_token"], meta_account["ad_account_id"],
            draft["strategy"], draft["creative"],
        )
    except MetaAdsError as e:
        support_service.escalate(business_id, "api_error", str(e))
        raise HTTPException(502, str(e))

    campaign_id = meta_store.save_campaign(
        business_id, draft_id, result, result["name"], result["objective"],
        result["daily_budget_inr"], dry_run=config.META_DRY_RUN,
    )
    approval_store.mark_launched(draft_id)

    return {
        "campaign_id": campaign_id,
        "meta_campaign_id": result["campaign_id"],
        "status": "live" if not config.META_DRY_RUN else "live (simulated — DRY_RUN mode)",
        "dry_run": config.META_DRY_RUN,
    }


@router.get("/campaigns")
def list_campaigns(business_id: str, user: CurrentUser = Depends(get_current_user)):
    assert_business_access(business_id, user)
    return meta_store.list_campaigns(business_id)


@router.get("/campaigns/{campaign_id}/creative")
def get_campaign_creative(campaign_id: str, user: CurrentUser = Depends(get_current_user)):
    """Phase 4 — backs the 3-dot menu's 'Preview ad' action. Returns the
    original AI-generated creative (headline, primary text, CTA, image) from
    the draft this campaign was launched from, so the dashboard can render
    it the way it appears on Facebook without a separate Meta API call."""
    campaign = meta_store.get_campaign(campaign_id)
    if campaign is None:
        raise HTTPException(404, f"No such campaign: {campaign_id}")
    assert_business_access(campaign["business_id"], user)

    draft = approval_store.get_draft(campaign.get("draft_id")) if campaign.get("draft_id") else None
    if draft is None:
        return {"available": False, "reason": "No AI-generated creative on file for this campaign."}

    return {"available": True, "creative": draft["creative"], "strategy": draft["strategy"]}


def _toggle_campaign_status(campaign_id: str, user: CurrentUser, target_status: str):
    """Shared logic for pause/resume: verify ownership, verify this campaign
    was actually launched to Meta, call the matching Meta API action, then
    persist the new status. `target_status` is the dashboard-vocabulary
    value ('active' / 'paused'); the Meta-side call always uses ACTIVE/PAUSED."""
    campaign = meta_store.get_campaign(campaign_id)
    if campaign is None:
        raise HTTPException(404, f"No such campaign: {campaign_id}")
    assert_business_access(campaign["business_id"], user)
    if not campaign.get("meta_campaign_id"):
        raise HTTPException(409, "This campaign hasn't been launched to Meta yet — nothing to pause/resume.")

    meta_account = meta_store.get_meta_account(campaign["business_id"])
    if meta_account is None:
        raise HTTPException(400, "No Meta Ad Account connected for this business.")

    try:
        if target_status == "paused":
            meta_ads_service.pause_campaign(meta_account["access_token"], campaign["meta_campaign_id"])
        else:
            meta_ads_service.resume_campaign(meta_account["access_token"], campaign["meta_campaign_id"])
    except MetaAdsError as e:
        support_service.escalate(campaign["business_id"], "api_error", str(e))
        raise HTTPException(502, str(e))

    meta_store.update_campaign_status(campaign_id, target_status)
    return {"campaign_id": campaign_id, "status": target_status}


@router.post("/campaigns/{campaign_id}/pause")
def pause_campaign_route(campaign_id: str, user: CurrentUser = Depends(get_current_user)):
    """Backs the dashboard's own Pause button on the Campaigns page (as
    opposed to an AI-recommended pause, which goes through the Approval
    Gate) — there was previously no on/off toggle anywhere in the UI."""
    return _toggle_campaign_status(campaign_id, user, "paused")


@router.post("/campaigns/{campaign_id}/resume")
def resume_campaign_route(campaign_id: str, user: CurrentUser = Depends(get_current_user)):
    return _toggle_campaign_status(campaign_id, user, "active")


@router.post("/campaigns/{campaign_id}/toggle")
def toggle_campaign_route(campaign_id: str, user: CurrentUser = Depends(get_current_user)):
    """Phase 4 — single on/off endpoint for the Campaigns table's OnOffToggle
    switch, so the frontend doesn't need to know the current status up front
    to decide whether to call /pause or /resume. Flips whatever the stored
    status currently is."""
    campaign = meta_store.get_campaign(campaign_id)
    if campaign is None:
        raise HTTPException(404, f"No such campaign: {campaign_id}")
    assert_business_access(campaign["business_id"], user)
    target_status = "paused" if campaign["status"] == "active" else "active"
    return _toggle_campaign_status(campaign_id, user, target_status)
