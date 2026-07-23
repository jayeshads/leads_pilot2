import httpx
import os
from urllib.parse import urlencode

META_APP_ID = os.getenv("META_APP_ID")
META_APP_SECRET = os.getenv("META_APP_SECRET")
META_REDIRECT_URI = os.getenv("META_REDIRECT_URI")
META_API_VERSION = os.getenv("META_API_VERSION", "v21.0")
GRAPH_URL = f"https://graph.facebook.com/{META_API_VERSION}"

def build_oauth_url(state: str) -> str:
    """Generate Facebook OAuth login URL"""
    scopes = os.getenv("META_OAUTH_SCOPES", "ads_management,ads_read,business_management,pages_show_list,pages_manage_ads,pages_read_engagement,email")
    params = {
        "client_id": META_APP_ID,
        "redirect_uri": META_REDIRECT_URI,
        "state": state,
        "scope": scopes,
        "response_type": "code",
    }
    return f"https://www.facebook.com/{META_API_VERSION}/dialog/oauth?{urlencode(params)}"

async def exchange_code_for_token(code: str) -> dict:
    """Exchange short-lived code for short-lived access token"""
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{GRAPH_URL}/oauth/access_token",
            params={
                "client_id": META_APP_ID,
                "client_secret": META_APP_SECRET,
                "redirect_uri": META_REDIRECT_URI,
                "code": code,
            },
        )
        return r.json()

async def get_long_lived_token(short_token: str) -> dict:
    """Exchange short-lived for long-lived (60 days) token"""
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{GRAPH_URL}/oauth/access_token",
            params={
                "grant_type": "fb_exchange_token",
                "client_id": META_APP_ID,
                "client_secret": META_APP_SECRET,
                "fb_exchange_token": short_token,
            },
        )
        return r.json()

async def get_user_info(access_token: str) -> dict:
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{GRAPH_URL}/me",
            params={"access_token": access_token, "fields": "id,name,email"},
        )
        return r.json()

async def get_user_businesses(access_token: str) -> list:
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{GRAPH_URL}/me/businesses",
            params={"access_token": access_token, "fields": "id,name,verification_status"},
        )
        return r.json().get("data", [])

async def get_ad_accounts(access_token: str, business_id: str = None) -> list:
    endpoint = f"{GRAPH_URL}/{business_id}/owned_ad_accounts" if business_id else f"{GRAPH_URL}/me/adaccounts"
    async with httpx.AsyncClient() as client:
        r = await client.get(
            endpoint,
            params={
                "access_token": access_token,
                "fields": "id,account_id,name,currency,account_status,timezone_name",
            },
        )
        return r.json().get("data", [])

async def get_pages(access_token: str) -> list:
    async with httpx.AsyncClient() as client:
        r = await client.get(
            f"{GRAPH_URL}/me/accounts",
            params={
                "access_token": access_token,
                "fields": "id,name,category,access_token,tasks",
            },
        )
        return r.json().get("data", [])
