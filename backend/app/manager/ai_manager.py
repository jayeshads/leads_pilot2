"""
LeadPilot AI Manager — the Brain.

One LLM-driven reasoning loop per chat turn:
  1. Load business memory + recent conversation history.
  2. Ask the LLM to decide the next step: call a tool, ask the user a
     clarifying question, or give a final response.
  3. If it calls a tool, run it (via the Tool Registry — never directly),
     append the result (or error) to the turn's scratchpad, and loop.
  4. Stop on ask_user / final_response, or after MAX_STEPS as a safety valve.

Tools never call each other. The Manager is the only orchestrator, and it is
the only thing that decides when a write action is confirmed for real.
"""
import json

from app.db import conversation_store
from app.services import llm_service
from app.tools import memory_tool, support_tool
from app.tools.base import ToolError
from app.tools.registry import get_tool, render_tool_catalog
from app.manager.prompts import build_system_prompt

MAX_STEPS = 6
HISTORY_TURNS = 12


class ManagerResponse:
    def __init__(self, message: str, awaiting_user: bool = False, trace: list = None,
                 session_id: str = None, options: list = None):
        self.message = message
        self.awaiting_user = awaiting_user
        self.trace = trace or []
        self.session_id = session_id
        self.options = options or []

    def to_dict(self) -> dict:
        return {
            "message": self.message,
            "awaiting_user": self.awaiting_user,
            "trace": self.trace,
            "session_id": self.session_id,
            "options": self.options,
        }


def run_turn_stream(business_id: str, user_message: str, include_trace: bool = False,
                     session_id: str = None):
    """
    Phase 1 — generator version of the reasoning loop. Yields one dict per
    SSEEvent (tool_start / tool_end) plus one final ManagerResponse (mapped
    to the `message` event by the router) as each step of the loop happens,
    instead of building up everything silently and returning one final
    JSON blob at the end. The SSE router (routers/manager.py) is
    responsible for framing/encoding each event and appending the final
    `done` event; run_turn() below is a non-streaming wrapper around this
    same generator for `?stream=false` callers, so both modes share one
    code path and can never drift apart.

    Exactly one ManagerResponse is yielded per call, always last — it marks
    either a final_response, an ask_user, an LLM error, or the MAX_STEPS
    safety-valve fallback.
    """
    if not business_id:
        raise ValueError("business_id is required.")
    if not user_message or not user_message.strip():
        raise ValueError("message is required.")

    if session_id:
        session = conversation_store.get_session(session_id, business_id)
        if session is None:
            raise ValueError("That chat session doesn't exist (or isn't yours).")
    else:
        # Legacy callers that don't know about sessions yet — reuse (or
        # create) the business's most recently active one rather than
        # silently starting a brand-new chat on every single message.
        session = conversation_store.get_or_create_active_session(business_id)
    session_id = session["id"]

    history = conversation_store.get_history(session_id, limit=HISTORY_TURNS)
    memory = memory_tool.get_business_memory(business_id)
    conversation_store.append(business_id, session_id, "user", user_message)
    conversation_store.maybe_autotitle_session(session_id, business_id, user_message)

    system_prompt = build_system_prompt(render_tool_catalog(), memory)
    scratchpad: list[dict] = []
    trace: list[dict] = []

    for step in range(MAX_STEPS):
        transcript = _render_transcript(history, user_message, scratchpad)

        try:
            decision = llm_service.chat_json(transcript, system=system_prompt)
        except llm_service.LLMError as e:
            support_tool.escalate(business_id, "api_error", f"AI Manager reasoning failure: {e}")
            yield _finalize(
                business_id, session_id,
                "I'm having trouble thinking this through right now (the AI service is unavailable). "
                "I've flagged this to support — please try again in a moment.",
                trace, include_trace,
            )
            return

        action = decision.get("action")
        trace.append({"step": step, "decision": decision})

        if action == "final_response":
            message = (decision.get("message") or "").strip() or "Done."
            yield _finalize(business_id, session_id, message, trace, include_trace)
            return

        if action == "ask_user":
            question = (decision.get("question") or "").strip() or "Could you clarify what you'd like to do next?"
            # Options let the frontend render this as one clickable question
            # at a time (like a Claude-style choice list) instead of the
            # Manager dumping every question into one wall of plain text.
            # Purely optional — free-text questions just omit them.
            raw_options = decision.get("options")
            options = [str(o).strip() for o in raw_options if str(o).strip()] if isinstance(raw_options, list) else []
            yield _finalize(business_id, session_id, question, trace, include_trace,
                             awaiting_user=True, options=options)
            return

        if action == "call_tool":
            tool_name = decision.get("tool")
            args = dict(decision.get("args") or {})
            tool = get_tool(tool_name)

            if tool is None:
                error = f"Unknown tool '{tool_name}'."
                scratchpad.append({"tool": tool_name, "args": args, "error": error})
                yield {"type": "tool_start", "tool": tool_name, "args": args}
                yield {"type": "tool_end", "tool": tool_name, "output_summary": f"error: {error}"}
                continue

            yield {"type": "tool_start", "tool": tool_name, "args": args}
            args.setdefault("business_id", business_id)
            result, error = _run_tool_with_retry(tool, args)
            scratchpad.append({"tool": tool_name, "args": args, "result": result, "error": error})

            if error:
                support_tool.escalate(business_id, "api_error", f"{tool_name} failed twice: {error}")
                yield {"type": "tool_end", "tool": tool_name, "output_summary": f"error: {error}"}
            else:
                yield {"type": "tool_end", "tool": tool_name, "output_summary": _summarize_result(result)}
            continue

        # Malformed / unrecognized decision shape — record and keep going.
        scratchpad.append({"tool": None, "args": {}, "error": f"Malformed manager decision: {decision}"})

    yield _finalize(
        business_id, session_id,
        "I've gathered some information but need a bit more direction to finish this — "
        "could you tell me what you'd like to do next?",
        trace, include_trace, awaiting_user=True,
    )


def _summarize_result(result) -> str:
    """Short, frontend-safe summary of a tool result for the tool_end
    event. The Phase 2 status card only ever shows this string (plus the
    tool name) — never the raw tool payload, and the chat bubble never
    shows internal tool names to the end user at all (that's still driven
    by the final `message` event's plain-language content)."""
    if result is None:
        return "ok"
    if isinstance(result, dict):
        for key in ("summary", "message", "title", "status"):
            value = result.get(key)
            if isinstance(value, str) and value:
                return value[:200]
        return f"{len(result)} field(s) returned"
    if isinstance(result, list):
        return f"{len(result)} item(s) returned"
    return str(result)[:200]


def run_turn(business_id: str, user_message: str, include_trace: bool = False,
             session_id: str = None) -> ManagerResponse:
    """Non-streaming entrypoint — consumes run_turn_stream() and returns the
    single final ManagerResponse. Kept for `?stream=false` callers and for
    tests/scripts that don't want to deal with an event stream (Phase 1,
    task 1.5 — backwards compatibility)."""
    final = None
    for event in run_turn_stream(business_id, user_message, include_trace=include_trace, session_id=session_id):
        if isinstance(event, ManagerResponse):
            final = event
    assert final is not None, "run_turn_stream must always yield exactly one final ManagerResponse"
    return final


def _run_tool_with_retry(tool, args: dict):
    """Runs a tool; on failure, retries once with the same args (transient
    errors like a flaky Ollama call), then gives up and returns the error
    string for the Manager to reason about on its next step."""
    try:
        return tool.run(**args), None
    except ToolError as e:
        try:
            return tool.run(**args), None
        except ToolError as e2:
            return None, str(e2)


def _render_transcript(history: list, user_message: str, scratchpad: list) -> str:
    parts = []
    if history:
        parts.append("Recent conversation:")
        for turn in history:
            role = "User" if turn["role"] == "user" else "LeadPilot"
            parts.append(f"{role}: {turn['content']}")

    parts.append(f"\nLatest user message: {user_message}")

    if scratchpad:
        parts.append("\nTool calls made so far this turn (most recent last):")
        for entry in scratchpad:
            if entry.get("error"):
                parts.append(f"- {entry['tool']}({entry['args']}) -> ERROR: {entry['error']}")
            else:
                parts.append(f"- {entry['tool']}({entry['args']}) -> {json.dumps(entry['result'])}")

    parts.append(
        "\nDecide your next action now. Respond with ONLY the JSON object described in the system prompt."
    )
    return "\n".join(parts)


def _finalize(business_id: str, session_id: str, message: str, trace: list, include_trace: bool,
              awaiting_user: bool = False, options: list = None) -> ManagerResponse:
    conversation_store.append(business_id, session_id, "assistant", message)
    return ManagerResponse(
        message=message, awaiting_user=awaiting_user, trace=trace if include_trace else [],
        session_id=session_id, options=options or [],
    )
