"""
Supabase Admin Auth API — server-side only.

The Admin Panel's "Create New User" / "Create New Admin" buttons need to
provision a real `auth.users` row with a working email/password, which is
not something the regular client-side Supabase SDK (anon key, RLS-bound)
can do. Supabase exposes exactly this over its GoTrue Admin API
(`/auth/v1/admin/users`), authorized with the project's service_role key.

Creating a user this way (rather than an INSERT into `public.profiles`
directly) also means `public.handle_auth_user_profile()` — the existing
trigger on `auth.users` — fires normally and creates the matching
`profiles` row for us, with `full_name`/`phone` carried over from
`user_metadata`. No parallel profile-creation code needed here.
"""
import requests

from app import config


class SupabaseAdminError(Exception):
    pass


def _require_config() -> None:
    if not config.SUPABASE_URL or not config.SUPABASE_SERVICE_ROLE_KEY:
        raise SupabaseAdminError(
            "SUPABASE_SERVICE_ROLE_KEY is not configured on the backend "
            "(see backend/.env.example) — user creation and password resets "
            "are unavailable until it is set."
        )


def _headers() -> dict:
    return {
        "apikey": config.SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {config.SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
    }


def create_user(email: str, password: str, full_name: str, phone: str) -> dict:
    """Creates a confirmed auth user. Returns the Supabase auth user object
    (contains `id`, which becomes profiles.id via the existing trigger)."""
    _require_config()
    url = f"{config.SUPABASE_URL.rstrip('/')}/auth/v1/admin/users"
    payload = {
        "email": email,
        "password": password,
        "email_confirm": True,  # skip the confirmation-email step for admin-provisioned accounts
        "user_metadata": {"full_name": full_name, "phone": phone},
    }
    try:
        resp = requests.post(url, headers=_headers(), json=payload, timeout=15)
    except requests.exceptions.RequestException as e:
        raise SupabaseAdminError(f"Could not reach Supabase Admin API: {e}")

    if not resp.ok:
        raise SupabaseAdminError(_extract_error(resp))
    return resp.json()


def set_user_password(user_id: str, new_password: str) -> None:
    """Used by the Admin Panel's "Reset password" action — sets a new
    password for an existing user without requiring the old one."""
    _require_config()
    url = f"{config.SUPABASE_URL.rstrip('/')}/auth/v1/admin/users/{user_id}"
    try:
        resp = requests.put(url, headers=_headers(), json={"password": new_password}, timeout=15)
    except requests.exceptions.RequestException as e:
        raise SupabaseAdminError(f"Could not reach Supabase Admin API: {e}")

    if not resp.ok:
        raise SupabaseAdminError(_extract_error(resp))


def _extract_error(resp: requests.Response) -> str:
    try:
        body = resp.json()
        return body.get("msg") or body.get("message") or body.get("error_description") or resp.text
    except ValueError:
        return resp.text or f"Supabase Admin API returned HTTP {resp.status_code}"
