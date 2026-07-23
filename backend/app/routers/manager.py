import json

from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.db import conversation_store, ai_conversation_store
from app.manager import ai_manager
from app.manager.ai_manager import ManagerResponse
from app.agents.head_agent import HeadAgent
from app.auth import get_current_user, CurrentUser
from app.rate_limit import check_rate_limit

router = APIRouter(prefix="/api/manager", tags=["ai-manager"])


class ChatRequest(BaseModel):
    business_id: str
    message: str = Field(..., min_length=1)
    debug: bool = False  # include the tool-call trace in the response
    session_id: str | None = None  # which chat this message belongs to; omit to use/continue the most recent one


class NewSessionRequest(BaseModel):
    business_id: str
    campaign_id: str | None = None  # set when opened via "Open chat" from a specific campaign


def _require_own_business(payload_business_id: str, user: CurrentUser):
    if user.role != "admin" and payload_business_id != user.id:
        raise HTTPException(403, "You may only access your own business account's AI Manager data.")


def _sse_frame(event: dict) -> str:
    return f"data: {json.dumps(event)}\n\n"


def _message_event(result: ManagerResponse) -> dict:
    """Maps a final ManagerResponse onto the `message` SSEEvent shape."""
    event = {
        "type": "message",
        "content": result.message,
        "awaiting_user": result.awaiting_user,
    }
    if result.options:
        event["options"] = result.options
    if result.trace:
        event["trace"] = result.trace
    return event


async def _stream_chat(payload: "ChatRequest", user_id: str):
    """Generator that drives HeadAgent and frames each step as an SSE event."""
    try:
        # Load or create conversation
        conv = ai_conversation_store.load_conversation(payload.session_id, user_id)
        
        # Build context
        context = dict(conv.get("context", {}))
        context["user_message"] = payload.message
        context["user_id"] = user_id
        
        # Run Head Agent
        head = HeadAgent()
        result = await head.run(context)
        
        # Save conversation
        messages = conv.get("messages", [])
        messages.append({"role": "user", "content": payload.message})
        messages.append({"role": "assistant", "content": result.get("response", "")})
        new_context = result.get("context", context)
        
        ai_conversation_store.save_conversation(
            session_id=conv["id"],
            context=new_context,
            messages=messages,
            stage=new_context.get("stage", conv.get("stage"))
        )
        
        # Send final message
        yield _sse_frame({
            "type": "message",
            "content": result.get("response", ""),
            "awaiting_user": False
        })
        if result.get("preview_data"):
            yield _sse_frame({
                "type": "preview_data",
                "data": result.get("preview_data")
            })
    except Exception as e:
        yield _sse_frame({"type": "error", "error": str(e)})
    yield _sse_frame({"type": "done"})


@router.post("/chat")
async def chat(payload: ChatRequest, stream: bool = Query(True),
         user: CurrentUser = Depends(get_current_user)):
    """
    Phase 1: Multi-Agent AI Rebuild
    """
    _require_own_business(payload.business_id, user)
    check_rate_limit(f"manager_chat:{user.id}")

    if not stream:
        conv = ai_conversation_store.load_conversation(payload.session_id, user.id)
        context = dict(conv.get("context", {}))
        context["user_message"] = payload.message
        context["user_id"] = user.id
        
        head = HeadAgent()
        result = await head.run(context)
        
        messages = conv.get("messages", [])
        messages.append({"role": "user", "content": payload.message})
        messages.append({"role": "assistant", "content": result.get("response", "")})
        new_context = result.get("context", context)
        
        ai_conversation_store.save_conversation(
            session_id=conv["id"],
            context=new_context,
            messages=messages,
            stage=new_context.get("stage", conv.get("stage"))
        )
        
        return {
            "conversation_id": conv["id"],
            "response": result.get("response", ""),
            "preview_data": result.get("preview_data"),
            "stage": new_context.get("stage")
        }

    return StreamingResponse(_stream_chat(payload, user.id), media_type="text/event-stream")


@router.get("/sessions")
def list_sessions(business_id: str = Query(...), user: CurrentUser = Depends(get_current_user)):
    """All of this business's chats, most recently active first — this is
    the entire data source for the "previous chats" sidebar."""
    _require_own_business(business_id, user)
    return conversation_store.list_sessions(business_id)


@router.post("/sessions")
def create_session(payload: NewSessionRequest, user: CurrentUser = Depends(get_current_user)):
    """Creates a real, separate, server-side chat. This is what the "New
    chat" button should call — previously there was no such concept at all,
    so "New chat" could only ever wipe the one conversation a business had."""
    _require_own_business(payload.business_id, user)
    return conversation_store.create_session(payload.business_id, campaign_id=payload.campaign_id)


@router.get("/sessions/{session_id}/history")
def session_history(session_id: str, business_id: str = Query(...), user: CurrentUser = Depends(get_current_user)):
    """Full turn history for one chat session — what the frontend loads
    when it opens or resumes a session."""
    _require_own_business(business_id, user)
    session = conversation_store.get_session(session_id, business_id)
    if session is None:
        raise HTTPException(404, "Chat session not found.")
    return {"session": session, "turns": conversation_store.get_history(session_id, limit=200)}


@router.delete("/sessions/{session_id}")
def delete_session(session_id: str, business_id: str = Query(...), user: CurrentUser = Depends(get_current_user)):
    _require_own_business(business_id, user)
    conversation_store.delete_session(session_id, business_id)
    return {"deleted": True}
