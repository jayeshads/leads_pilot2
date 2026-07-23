import json
from psycopg2.extras import Json
from app.db.base import get_conn

def load_conversation(session_id: str, user_id: str) -> dict:
    """
    Load a conversation by id or create a new one for the user.
    """
    with get_conn() as conn:
        with conn.cursor() as cur:
            if session_id:
                cur.execute(
                    "SELECT id, user_id, business_id, context, messages, stage FROM public.ai_conversations WHERE id = %s AND user_id = %s",
                    (session_id, user_id)
                )
                row = cur.fetchone()
                if row:
                    return dict(row)
            
            # Create new
            cur.execute(
                """
                INSERT INTO public.ai_conversations (user_id, business_id, context, messages)
                VALUES (%s, %s, '{}'::jsonb, ARRAY[]::jsonb[])
                RETURNING id, user_id, business_id, context, messages, stage
                """,
                (user_id, user_id)
            )
            row = cur.fetchone()
            conn.commit()
            return dict(row)

def save_conversation(session_id: str, context: dict, messages: list, stage: str):
    """
    Update the conversation context, messages, and stage.
    """
    with get_conn() as conn:
        with conn.cursor() as cur:
            # Postgres jsonb array expects an array of jsonb strings
            msgs_jsonb = [json.dumps(m) for m in messages]
            cur.execute(
                """
                UPDATE public.ai_conversations
                SET context = %s, messages = %s::jsonb[], stage = %s, updated_at = NOW()
                WHERE id = %s
                """,
                (Json(context), msgs_jsonb, stage, session_id)
            )
            conn.commit()
