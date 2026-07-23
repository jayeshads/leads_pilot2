/**
 * The ONE way the LeadPilot dashboard talks to any AI feature.
 *
 * Every "AI action" in the dashboard (generate a strategy, write ad
 * creative, draft a landing page, get a campaign recommendation, ask a
 * support question, ...) is just a natural-language message sent here.
 * The AI Manager (FastAPI backend) is the only orchestrator: it decides
 * internally which tool to run via its Tool Registry. This file must stay
 * the ONLY place in the frontend that calls the AI Manager backend —
 * components should never call a tool/service endpoint directly, and
 * should never import fetch() to the backend themselves.
 */
import { supabase } from './supabase'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

export interface ManagerChatResult {
  message: string
  awaiting_user: boolean
  trace: unknown[]
  session_id: string
  options: string[]
}

export interface ChatSessionSummary {
  id: string
  business_id: string
  title: string
  campaign_id: string | null
  created_at: string
  updated_at: string
}

export interface ChatTurn {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

// Phase 1 — SSE event schema emitted by POST /api/manager/chat (stream=true,
// the default). Mirrors backend/app/routers/manager.py's _stream_chat().
export interface SSEToolStartEvent {
  type: 'tool_start'
  tool: string
  args: Record<string, unknown>
}
export interface SSEToolEndEvent {
  type: 'tool_end'
  tool: string
  output_summary: string
}
export interface SSEMessageEvent {
  type: 'message'
  content: string
  awaiting_user: boolean
  options?: string[]
  trace?: unknown[]
}
export interface SSEErrorEvent {
  type: 'error'
  error: string
}
export interface SSEPreviewEvent {
  type: 'preview_data'
  data: any
}
export interface SSEDoneEvent {
  type: 'done'
}
export type ManagerSSEEvent =
  | SSEToolStartEvent
  | SSEToolEndEvent
  | SSEMessageEvent
  | SSEErrorEvent
  | SSEPreviewEvent
  | SSEDoneEvent

export class AiManagerError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
    this.name = 'AiManagerError'
  }
}

async function authHeaders(): Promise<{ Authorization: string; userId: string }> {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    throw new AiManagerError('You must be signed in to use the AI Manager.', 401)
  }
  return { Authorization: `Bearer ${session.access_token}`, userId: session.user.id }
}

async function handle<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new AiManagerError(body.detail ?? `AI Manager request failed (${response.status})`, response.status)
  }
  return (await response.json()) as T
}

/**
 * Send one message to the AI Manager on behalf of the signed-in user's own
 * business (business_id is always the user's own Supabase id — see
 * backend/app/auth.py; the backend rejects any other business_id).
 *
 * @param message     Natural-language instruction, e.g. "Generate a Meta ad
 *                    strategy for a ₹15,000/month budget targeting Pune."
 * @param debug       Include the internal tool-call trace (dev/debug only).
 * @param sessionId   Which chat this message belongs to. Omit to continue
 *                    (or auto-create) the business's most recently active
 *                    chat.
 */
export async function askAiManager(
  message: string,
  debug = false,
  sessionId?: string | null
): Promise<ManagerChatResult> {
  const { Authorization, userId } = await authHeaders()

  // The backend now streams SSE by default (Phase 1) — this non-streaming
  // caller opts back into the old single-JSON-blob behavior explicitly.
  const response = await fetch(`${API_BASE_URL}/api/manager/chat?stream=false`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization },
    body: JSON.stringify({
      business_id: userId,
      message,
      debug,
      session_id: sessionId ?? null,
    }),
  })

  return handle<ManagerChatResult>(response)
}

/**
 * Phase 1 — streaming version of askAiManager(). Calls `onEvent` once per
 * SSE event (tool_start / tool_end / message / error / done) as the
 * Manager's reasoning loop runs, instead of waiting for the whole turn to
 * finish and getting one final JSON blob. This is what AiChat.tsx should
 * call going forward (task 1.4); askAiManager() above still works via
 * `?stream=false` for any caller that isn't ready to consume a stream yet
 * (task 1.5 — backwards compatibility).
 *
 * Resolves once the stream ends (after the `done` event or a network
 * error) — it does not return a value; everything comes through onEvent.
 */
export async function askAiManagerStream(
  message: string,
  onEvent: (event: ManagerSSEEvent) => void,
  debug = false,
  sessionId?: string | null,
  signal?: AbortSignal
): Promise<void> {
  const { Authorization, userId } = await authHeaders()

  const response = await fetch(`${API_BASE_URL}/api/manager/chat?stream=true`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization },
    body: JSON.stringify({
      business_id: userId,
      message,
      debug,
      session_id: sessionId ?? null,
    }),
    signal,
  })

  if (!response.ok || !response.body) {
    const body = await response.json().catch(() => ({}))
    throw new AiManagerError(body.detail ?? `AI Manager request failed (${response.status})`, response.status)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      // SSE frames are separated by a blank line; each frame looks like
      // `data: {...}`. The last split chunk may be a partial frame still
      // waiting on more bytes, so keep it in the buffer for next time.
      const frames = buffer.split('\n\n')
      buffer = frames.pop() ?? ''

      for (const frame of frames) {
        const line = frame.trim()
        if (!line.startsWith('data:')) continue
        const jsonStr = line.slice('data:'.length).trim()
        if (!jsonStr) continue
        try {
          onEvent(JSON.parse(jsonStr) as ManagerSSEEvent)
        } catch {
          // Malformed frame — skip it rather than crashing the whole stream.
        }
      }
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return
    throw err
  }
}

/** All of this business's chats, most recently active first — the entire
 * data source for the "previous chats" sidebar. */
export async function listChatSessions(): Promise<ChatSessionSummary[]> {
  const { Authorization, userId } = await authHeaders()
  const response = await fetch(`${API_BASE_URL}/api/manager/sessions?business_id=${userId}`, {
    headers: { Authorization },
  })
  return handle<ChatSessionSummary[]>(response)
}

/** Starts a brand-new, separate chat on the server (this is what "New chat"
 * should call — a session is a real row, not a localStorage snapshot). */
export async function createChatSession(campaignId?: string | null): Promise<ChatSessionSummary> {
  const { Authorization, userId } = await authHeaders()
  const response = await fetch(`${API_BASE_URL}/api/manager/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization },
    body: JSON.stringify({ business_id: userId, campaign_id: campaignId ?? null }),
  })
  return handle<ChatSessionSummary>(response)
}

/** Full turn history for one chat — used to resume a session from the
 * sidebar or restore it on page load/device switch. */
export async function getChatSessionHistory(
  sessionId: string
): Promise<{ session: ChatSessionSummary; turns: ChatTurn[] }> {
  const { Authorization, userId } = await authHeaders()
  const response = await fetch(
    `${API_BASE_URL}/api/manager/sessions/${sessionId}/history?business_id=${userId}`,
    { headers: { Authorization } }
  )
  return handle<{ session: ChatSessionSummary; turns: ChatTurn[] }>(response)
}

export async function deleteChatSession(sessionId: string): Promise<void> {
  const { Authorization, userId } = await authHeaders()
  const response = await fetch(
    `${API_BASE_URL}/api/manager/sessions/${sessionId}?business_id=${userId}`,
    { method: 'DELETE', headers: { Authorization } }
  )
  await handle(response)
}

export async function getPendingDraft(businessId: string) {
  const { Authorization } = await authHeaders()
  const response = await fetch(`${API_BASE_URL}/api/approvals/drafts/pending?business_id=${businessId}`, {
    headers: { Authorization }
  })
  return handle<any[]>(response)
}

export async function approveDraft(draftId: string, decidedBy: string, reason = 'Approved') {
  const { Authorization } = await authHeaders()
  const response = await fetch(`${API_BASE_URL}/api/approvals/drafts/${draftId}/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization
    },
    body: JSON.stringify({ decided_by: decidedBy, reason })
  })
  return handle(response)
}

export async function rejectDraft(draftId: string, decidedBy: string, reason: string) {
  const { Authorization } = await authHeaders()
  const response = await fetch(`${API_BASE_URL}/api/approvals/drafts/${draftId}/reject`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization
    },
    body: JSON.stringify({ decided_by: decidedBy, reason })
  })
  return handle(response)
}

