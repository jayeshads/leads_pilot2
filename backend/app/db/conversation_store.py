"""
Storage for the AI Manager's chat sessions + conversation turns.

Before, every business_id had exactly ONE unbounded conversation — there was
no notion of a "session" at all, which is why "New chat" in the frontend had
nowhere real to point: it could only wipe the single conversation and stash
a copy in the browser's localStorage (gone on another device/browser), and
there was no way to list "previous chats" because none were ever kept
server-side. This module now models that properly: `ai_chat_sessions` holds
one row per chat ("New chat" = a new row here), and `ai_conversation_turns`
belongs to a session (business_id is kept on the turn too, purely so a
single query can scope/filter by business without a join).

Both tables are also now defined in supabase/migrations (see
003_ai_chat_sessions.sql) — previously this module was the ONLY place that
ever created ai_conversation_turns, so unless the backend's DATABASE_URL
happened to point at the exact same Postgres project the frontend's Supabase
client reads from, the table the dashboard queried and the table the AI
Manager wrote to were never the same table.
"""
import uuid
from datetime import datetime, timezone

from app.db.base import get_conn as _conn, add_column, stringify_dates

DEFAULT_SESSION_TITLE = "New chat"


def init_db():
    with _conn() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS ai_chat_sessions (
                id TEXT PRIMARY KEY,
                business_id TEXT NOT NULL,
                title TEXT NOT NULL DEFAULT 'New chat',
                campaign_id TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS ai_conversation_turns (
                id TEXT PRIMARY KEY,
                business_id TEXT NOT NULL,
                session_id TEXT,
                role TEXT NOT NULL,            -- 'user' or 'assistant'
                content TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        """)
        # Backward compat: older deployments created ai_conversation_turns
        # before session_id existed.
        add_column(conn, "ai_conversation_turns", "session_id", "TEXT")


def create_session(business_id: str, title: str = DEFAULT_SESSION_TITLE, campaign_id: str = None) -> dict:
    session_id = str(uuid.uuid4())
    now = _now()
    with _conn() as conn:
        conn.execute(
            "INSERT INTO ai_chat_sessions (id, business_id, title, campaign_id, created_at, updated_at) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (session_id, business_id, title, campaign_id, now, now),
        )
    return {"id": session_id, "business_id": business_id, "title": title,
            "campaign_id": campaign_id, "created_at": now, "updated_at": now}


def list_sessions(business_id: str, limit: int = 50) -> list:
    """Most recently active sessions first — this is the frontend sidebar's
    entire data source."""
    with _conn() as conn:
        rows = conn.execute(
            "SELECT id, business_id, title, campaign_id, created_at, updated_at "
            "FROM ai_chat_sessions WHERE business_id = ? ORDER BY updated_at DESC LIMIT ?",
            (business_id, limit),
        ).fetchall()
    return [stringify_dates(dict(r)) for r in rows]


def get_session(session_id: str, business_id: str):
    with _conn() as conn:
        row = conn.execute(
            "SELECT id, business_id, title, campaign_id, created_at, updated_at "
            "FROM ai_chat_sessions WHERE id = ? AND business_id = ?",
            (session_id, business_id),
        ).fetchone()
    return stringify_dates(dict(row)) if row else None


def get_or_create_active_session(business_id: str, campaign_id: str = None) -> dict:
    """Used only when a caller doesn't pass a session_id at all (legacy
    callers / first-ever message). Reuses the most recently touched session
    instead of silently starting a new one every call."""
    with _conn() as conn:
        row = conn.execute(
            "SELECT id, business_id, title, campaign_id, created_at, updated_at "
            "FROM ai_chat_sessions WHERE business_id = ? ORDER BY updated_at DESC LIMIT 1",
            (business_id,),
        ).fetchone()
    if row:
        return stringify_dates(dict(row))
    return create_session(business_id, campaign_id=campaign_id)


def rename_session(session_id: str, business_id: str, title: str) -> None:
    title = (title or "").strip()[:60] or DEFAULT_SESSION_TITLE
    with _conn() as conn:
        conn.execute(
            "UPDATE ai_chat_sessions SET title = ? WHERE id = ? AND business_id = ?",
            (title, session_id, business_id),
        )


def maybe_autotitle_session(session_id: str, business_id: str, first_user_message: str) -> None:
    """Give a freshly created session a real title from the user's first
    message instead of leaving every session labeled 'New chat' forever."""
    with _conn() as conn:
        row = conn.execute(
            "SELECT title FROM ai_chat_sessions WHERE id = ? AND business_id = ?",
            (session_id, business_id),
        ).fetchone()
    if row and dict(row).get("title") == DEFAULT_SESSION_TITLE:
        rename_session(session_id, business_id, first_user_message)


def delete_session(session_id: str, business_id: str) -> bool:
    with _conn() as conn:
        conn.execute(
            "DELETE FROM ai_conversation_turns WHERE session_id = ? AND business_id = ?",
            (session_id, business_id),
        )
        conn.execute(
            "DELETE FROM ai_chat_sessions WHERE id = ? AND business_id = ?",
            (session_id, business_id),
        )
    return True


def touch_session(session_id: str) -> None:
    with _conn() as conn:
        conn.execute(
            "UPDATE ai_chat_sessions SET updated_at = ? WHERE id = ?",
            (_now(), session_id),
        )


def append(business_id: str, session_id: str, role: str, content: str) -> str:
    turn_id = str(uuid.uuid4())
    with _conn() as conn:
        conn.execute(
            "INSERT INTO ai_conversation_turns (id, business_id, session_id, role, content, created_at) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (turn_id, business_id, session_id, role, content, _now()),
        )
    touch_session(session_id)
    return turn_id


def get_history(session_id: str, limit: int = 12) -> list:
    """Most recent `limit` turns for this session, oldest first, ready to
    render into a transcript."""
    with _conn() as conn:
        rows = conn.execute(
            "SELECT id, role, content, created_at FROM ai_conversation_turns "
            "WHERE session_id = ? ORDER BY created_at DESC LIMIT ?",
            (session_id, limit),
        ).fetchall()
    return [stringify_dates(dict(r)) for r in reversed(rows)]


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()
