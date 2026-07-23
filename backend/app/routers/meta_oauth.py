import os
import secrets
import jwt
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from pydantic import BaseModel

from app.services import meta_service
from app.db.meta_store import save_meta_connection, get_meta_connection, update_meta_connection
from app.auth import get_current_user, User

router = APIRouter(prefix="/api/meta", tags=["meta"])

JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "fallback-secret")

class SelectPayload(BaseModel):
    business_id: str
    ad_account_id: str
    page_id: str
    page_access_token: str = None

@router.get("/oauth/start")
async def start_oauth(user: User = Depends(get_current_user)):
    """Frontend calls this -> gets Facebook OAuth URL to redirect user"""
    # Create CSRF token using JWT
    payload = {
        "user_id": str(user.id),
        "nonce": secrets.token_hex(8),
        "exp": datetime.now(timezone.utc) + timedelta(minutes=10)
    }
    state = jwt.encode(payload, JWT_SECRET, algorithm="HS256")
    url = meta_service.build_oauth_url(state)
    return {"oauth_url": url}

@router.get("/oauth/callback")
async def oauth_callback(code: str = Query(...), state: str = Query(...)):
    """Facebook redirects here after user consent"""
    try:
        data = jwt.decode(state, JWT_SECRET, algorithms=["HS256"])
        user_id = data["user_id"]
    except Exception:
        raise HTTPException(400, "Invalid or expired state")
    
    # 1. Exchange code -> short-lived token
    short = await meta_service.exchange_code_for_token(code)
    if "error" in short:
        raise HTTPException(400, short["error"]["message"])
    
    # 2. Short-lived -> long-lived (60 days)
    long_lived = await meta_service.get_long_lived_token(short["access_token"])
    access_token = long_lived.get("access_token")
    if not access_token:
        raise HTTPException(400, "Failed to get long-lived token")
    
    # 3. Fetch user info
    fb_user = await meta_service.get_user_info(access_token)
    
    # 4. Save to DB
    save_meta_connection(
        user_id=user_id,
        fb_user_id=fb_user.get("id", ""),
        fb_email=fb_user.get("email", ""),
        access_token=access_token,
        token_expires_in=long_lived.get("expires_in"),
    )
    
    # 5. Redirect to frontend with success
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    return RedirectResponse(url=f"{frontend_url}/dashboard/connect?status=connected")

@router.get("/businesses")
async def list_businesses(user: User = Depends(get_current_user)):
    conn = get_meta_connection(user.id)
    if not conn or not conn.get("access_token"):
        raise HTTPException(404, "Not connected to Facebook")
    return await meta_service.get_user_businesses(conn["access_token"])

@router.get("/ad-accounts")
async def list_ad_accounts(business_id: str = None, user: User = Depends(get_current_user)):
    conn = get_meta_connection(user.id)
    if not conn or not conn.get("access_token"):
        raise HTTPException(404, "Not connected to Facebook")
    return await meta_service.get_ad_accounts(conn["access_token"], business_id)

@router.get("/pages")
async def list_pages(user: User = Depends(get_current_user)):
    conn = get_meta_connection(user.id)
    if not conn or not conn.get("access_token"):
        raise HTTPException(404, "Not connected to Facebook")
    return await meta_service.get_pages(conn["access_token"])

@router.post("/select")
async def select_assets(payload: SelectPayload, user: User = Depends(get_current_user)):
    """User selects final BM + Ad Account + Page"""
    update_meta_connection(
        user_id=user.id,
        business_id=payload.business_id,
        ad_account_id=payload.ad_account_id,
        page_id=payload.page_id,
        page_access_token=payload.page_access_token,
        status="active",
    )
    return {"status": "connected"}
