"""
Storage for the Admin Panel's Users section — reads/writes LeadPilot
Complete's own `profiles` table (plus the campaigns/leads/transactions/
creatives/landing_pages/meta_accounts it's related to) via the backend's
direct Postgres connection, the same way app/db/meta_store.py reuses the
dashboard's own tables instead of keeping a shadow `ai_`-prefixed copy.

No `init_db()` here — unlike the ai_-prefixed CRM tables, `profiles` and
friends already exist (created by supabase/schema.sql), this module just
queries/updates them.
"""
from app.db.base import get_conn as _conn, stringify_dates, add_column


def init_db():
    # `profiles` itself is created by supabase/schema.sql; these add_column
    # calls just keep a bare local-SQLite dev DB in sync with the same shape
    # (see supabase/migrations/005_group4_admin_users.sql), mirroring how
    # meta_store/creative_store do it for their own dashboard-native tables.
    # Harmless no-ops against a Postgres DB that already ran the migration.
    with _conn() as conn:
        add_column(conn, "profiles", "status", "TEXT DEFAULT 'active'")
        add_column(conn, "profiles", "funds_frozen", "BOOLEAN DEFAULT false")


# --------------------------------------------------------------------------
# List / detail
# --------------------------------------------------------------------------

def list_users() -> list:
    """All users with aggregate campaign/lead counts and wallet balance, for
    the Users list page. One query per aggregate (kept simple/readable over
    a single mega-join, matching this codebase's other store modules)."""
    with _conn() as conn:
        profiles = conn.execute("SELECT * FROM profiles ORDER BY created_at DESC").fetchall()
        campaign_counts = conn.execute(
            "SELECT user_id, COUNT(*) AS n FROM campaigns GROUP BY user_id"
        ).fetchall()
        lead_counts = conn.execute(
            "SELECT c.user_id AS user_id, COUNT(*) AS n FROM leads l "
            "JOIN campaigns c ON c.id = l.campaign_id GROUP BY c.user_id"
        ).fetchall()
        wallet_rows = conn.execute(
            "SELECT user_id, "
            "SUM(CASE WHEN type = 'add_funds' AND status = 'confirmed' THEN amount ELSE 0 END) - "
            "SUM(CASE WHEN type = 'spend' AND status = 'confirmed' THEN amount ELSE 0 END) AS balance "
            "FROM transactions GROUP BY user_id"
        ).fetchall()

    camp_map = {r["user_id"]: r["n"] for r in campaign_counts}
    lead_map = {r["user_id"]: r["n"] for r in lead_counts}
    wallet_map = {r["user_id"]: float(r["balance"] or 0) for r in wallet_rows}

    return [
        {
            **stringify_dates(dict(p)),
            "campaign_count": camp_map.get(p["id"], 0),
            "lead_count": lead_map.get(p["id"], 0),
            "wallet_balance": wallet_map.get(p["id"], 0.0),
        }
        for p in profiles
    ]


def get_user_detail(user_id: str) -> dict | None:
    """Full profile view for one user: their own campaigns, wallet balance,
    connected Meta ad account, and creative/landing-page summaries. Never
    includes a password — Supabase (correctly) never exposes password
    hashes through any API, admin or otherwise; see the router docstring
    for the user-facing note about this."""
    with _conn() as conn:
        profile = conn.execute("SELECT * FROM profiles WHERE id = ?", (user_id,)).fetchone()
        if not profile:
            return None
        campaigns = conn.execute(
            "SELECT id, name, status, daily_budget, created_at FROM campaigns "
            "WHERE user_id = ? ORDER BY created_at DESC", (user_id,)
        ).fetchall()
        wallet_row = conn.execute(
            "SELECT "
            "SUM(CASE WHEN type = 'add_funds' AND status = 'confirmed' THEN amount ELSE 0 END) - "
            "SUM(CASE WHEN type = 'spend' AND status = 'confirmed' THEN amount ELSE 0 END) AS balance "
            "FROM transactions WHERE user_id = ?", (user_id,)
        ).fetchone()
        meta_account = conn.execute(
            "SELECT id, account_id, account_name, status FROM meta_accounts "
            "WHERE assigned_user_id = ? ORDER BY created_at DESC LIMIT 1", (user_id,)
        ).fetchone()
        creative_counts = conn.execute(
            "SELECT "
            "COUNT(*) AS total, "
            "SUM(CASE WHEN is_approved THEN 1 ELSE 0 END) AS approved, "
            "SUM(CASE WHEN is_archived THEN 1 ELSE 0 END) AS archived "
            "FROM creatives WHERE user_id = ?", (user_id,)
        ).fetchone()
        landing_pages = conn.execute(
            "SELECT id, name, url, status FROM landing_pages WHERE user_id = ? ORDER BY created_at DESC",
            (user_id,)
        ).fetchall()

    return {
        "profile": stringify_dates(dict(profile)),
        "campaigns": [stringify_dates(dict(c)) for c in campaigns],
        "wallet_balance": float(wallet_row["balance"] or 0) if wallet_row else 0.0,
        "meta_account": dict(meta_account) if meta_account else None,
        "creatives": {
            "total": creative_counts["total"] or 0,
            "approved": creative_counts["approved"] or 0,
            "archived": creative_counts["archived"] or 0,
        } if creative_counts else {"total": 0, "approved": 0, "archived": 0},
        "landing_pages": [dict(lp) for lp in landing_pages],
    }


# --------------------------------------------------------------------------
# Mutations
# --------------------------------------------------------------------------

def set_user_status(user_id: str, status: str) -> dict | None:
    """status: 'active' or 'blocked'. Enforced at login/session-refresh time
    in the frontend (see lib/AuthContext.tsx)."""
    with _conn() as conn:
        conn.execute("UPDATE profiles SET status = ? WHERE id = ?", (status, user_id))
        row = conn.execute("SELECT * FROM profiles WHERE id = ?", (user_id,)).fetchone()
    return stringify_dates(dict(row)) if row else None


def set_funds_frozen(user_id: str, frozen: bool) -> dict | None:
    with _conn() as conn:
        conn.execute("UPDATE profiles SET funds_frozen = ? WHERE id = ?", (frozen, user_id))
        row = conn.execute("SELECT * FROM profiles WHERE id = ?", (user_id,)).fetchone()
    return stringify_dates(dict(row)) if row else None


def set_role(user_id: str, role: str) -> dict | None:
    """role: 'client' or 'admin'. Used right after create_user() when
    provisioning a new admin account (Supabase Admin Auth API always
    creates the row with the trigger's default role='client')."""
    with _conn() as conn:
        conn.execute("UPDATE profiles SET role = ? WHERE id = ?", (role, user_id))
        row = conn.execute("SELECT * FROM profiles WHERE id = ?", (user_id,)).fetchone()
    return stringify_dates(dict(row)) if row else None


def get_user(user_id: str) -> dict | None:
    with _conn() as conn:
        row = conn.execute("SELECT * FROM profiles WHERE id = ?", (user_id,)).fetchone()
    return stringify_dates(dict(row)) if row else None


def find_by_email(email: str) -> dict | None:
    with _conn() as conn:
        row = conn.execute("SELECT * FROM profiles WHERE lower(email) = lower(?)", (email,)).fetchone()
    return stringify_dates(dict(row)) if row else None
