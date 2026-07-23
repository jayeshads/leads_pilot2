"""
Storage for creatives the AI Manager generates — persisted directly into the
dashboard's own `public.creatives` table (same table Creatives.tsx reads),
not a separate `ai_`-prefixed shadow copy, following the same pattern as
app/db/meta_store.py and app/db/landingpage_store.py.

Before this module existed, creative_tool's output (an image path + ad copy)
only ever lived in that turn's in-memory scratchpad — it was never written
anywhere the dashboard could see, which is why the Creative Library's
"Generated vs Uploaded" distinction had nothing real to read and was faked
client-side instead (`index % 2 === 0 ? 'generated' : 'uploaded'`). Every
creative the tool produces is now a real row with source='generated'.
"""
import uuid
from datetime import datetime, timezone

from app import config
from app.db.base import get_conn as _conn, stringify_dates, add_column


def init_db():
    with _conn() as conn:
        # `creatives` itself is created by the Supabase migrations (see
        # supabase/migrations/004_group2_dashboard_fixes.sql); these
        # add_column calls just keep a bare local-SQLite dev DB in sync with
        # that same shape, mirroring how meta_store/landingpage_store do it
        # for their own dashboard-native tables.
        add_column(conn, "creatives", "source", "TEXT DEFAULT 'uploaded'")
        add_column(conn, "creatives", "is_approved", "BOOLEAN DEFAULT false")
        add_column(conn, "creatives", "is_archived", "BOOLEAN DEFAULT false")


def save_generated_creative(business_id: str, name: str, image_filename: str,
                             campaign_id: str = None) -> str:
    """Records one AI-generated creative image as a real `creatives` row so
    it shows up in the dashboard's Creative Library with source='generated'."""
    creative_id = str(uuid.uuid4())
    url = f"{config.BACKEND_PUBLIC_URL}/creative/preview/{image_filename}"
    with _conn() as conn:
        conn.execute(
            "INSERT INTO creatives "
            "(id, user_id, campaign_id, name, type, thumbnail_url, file_url, source, is_approved, is_archived, created_at) "
            "VALUES (?, ?, ?, ?, 'image', ?, ?, 'generated', false, false, ?)",
            (creative_id, business_id, campaign_id, name, url, url, _now()),
        )
    return creative_id


def get_creative(creative_id: str) -> dict | None:
    with _conn() as conn:
        row = conn.execute("SELECT * FROM creatives WHERE id = ?", (creative_id,)).fetchone()
    return stringify_dates(dict(row)) if row else None


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()
