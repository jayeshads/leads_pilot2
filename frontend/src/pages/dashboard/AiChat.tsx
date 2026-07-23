import { useState, useRef, useEffect, useCallback } from 'react'
import { Helmet } from 'react-helmet-async'
import { useSearchParams } from 'react-router-dom'
import {
  Sparkles, FileText, CheckCircle2, XCircle,
  MessageSquare, Trash2, Megaphone, PenSquare,
} from 'lucide-react'
import { useAuth } from '@/lib/AuthContext'
import {
  askAiManagerStream, AiManagerError, type ManagerSSEEvent,
  listChatSessions, createChatSession, getChatSessionHistory, deleteChatSession,
  getPendingDraft, approveDraft, rejectDraft,
  type ChatSessionSummary,
} from '@/lib/aiManager'
import { cn } from '@/lib/utils'
import ChatHeader from '@/components/aichat/ChatHeader'
import MessageList, { type ChatMessage } from '@/components/aichat/MessageList'
import MessageInputBar from '@/components/aichat/MessageInputBar'
import QuestionModal, { type PendingQuestion } from '@/components/aichat/QuestionModal'
import type { ToolCallStep } from '@/components/aichat/AgentStatusCard'

interface CampaignDraft {
  id: string
  business_id: string
  status: 'pending' | 'approved' | 'rejected'
  strategy: {
    campaign_name: string
    objective: string
    daily_budget: number
    target_audience: string
    notes?: string
  }
  creative: {
    headline: string
    primary_text: string
    image_url?: string
    filename?: string
  }
  landing_page?: {
    name: string
    template_id: string
    content_json?: Record<string, unknown> | null
  }
}

// Friendly labels for tool names — never leak internal tool identifiers
// straight into the UI.
const TOOL_LABELS: Record<string, string> = {
  business_analysis: 'Audit & Market Research',
  generate_strategy: 'Designing Ad Structure',
  creative_generation: 'Copywriting & Graphics Gen',
  landing_page_selection: 'Selecting Templates',
  meta_ads_action: 'Provisioning Meta Campaign',
  analytics_monitoring: 'Retrieving Ads Metrics',
  memory_update: 'Updating Business Memory',
  compliance_check: 'Ad Safety Audit',
  support_escalation: 'Submitting Ticket',
}
const toolLabel = (tool: string) => TOOL_LABELS[tool] ?? `Invoking agent ${tool}`

const THEME_STORAGE_KEY = 'leadpilot_chat_theme'

export default function AiChat() {
  const { user, profile } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const campaignId = searchParams.get('campaignId')
  const actionParam = searchParams.get('action')
  const sessionParam = searchParams.get('session')
  const prefillParam = searchParams.get('prefill')

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window === 'undefined') return 'dark'
    return (window.localStorage.getItem(THEME_STORAGE_KEY) as 'dark' | 'light') ?? 'dark'
  })
  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark'
      window.localStorage.setItem(THEME_STORAGE_KEY, next)
      return next
    })
  }
  const dark = theme === 'dark'

  const [sessions, setSessions] = useState<ChatSessionSummary[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [running, setRunning] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [pendingDraft, setPendingDraft] = useState<CampaignDraft | null>(null)

  // Live tool-call trace, filled in in real time from SSE tool_start /
  // tool_end events — this is what AgentStatusCard renders while running.
  const [toolSteps, setToolSteps] = useState<ToolCallStep[]>([])
  const [thinkingLabel, setThinkingLabel] = useState('Understanding your request…')

  // The Manager asks one question at a time; awaitingUser + options drive
  // the QuestionModal. questionDismissed lets the user close the modal and
  // type a free-form answer in the composer instead of picking an option.
  const [awaitingUser, setAwaitingUser] = useState(false)
  const [pendingOptions, setPendingOptions] = useState<string[]>([])
  const [questionDismissed, setQuestionDismissed] = useState(false)
  const [previewData, setPreviewData] = useState<any>(null)

  const abortRef = useRef<AbortController | null>(null)

  // Rotate a friendly status line while we wait for the first SSE event
  useEffect(() => {
    if (!running || toolSteps.length > 0) return
    const phrases = [
      'Understanding your request…',
      'Checking your business context…',
      'Working out the next step…',
      'Talking to the AI Manager…',
    ]
    let i = 0
    setThinkingLabel(phrases[0])
    const id = setInterval(() => {
      i = (i + 1) % phrases.length
      setThinkingLabel(phrases[i])
    }, 1600)
    return () => clearInterval(id)
  }, [running, toolSteps.length])

  const [attachedImage, setAttachedImage] = useState<string | null>(null)
  const [attachedFileName, setAttachedFileName] = useState<string | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
    }
  }, [messages, running, toolSteps])

  // Picks up a message handed off from elsewhere in the dashboard (e.g. the
  // Landing Page Template Library's "Use Template" button).
  useEffect(() => {
    if (!prefillParam) return
    setInput(prefillParam)
    requestAnimationFrame(() => textareaRef.current?.focus())
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      next.delete('prefill')
      return next
    }, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillParam])

  const fetchPendingDraft = useCallback(async () => {
    try {
      if (!user?.id) return
      const drafts = await getPendingDraft(user.id)
      setPendingDraft(drafts && drafts.length > 0 ? (drafts[0] as CampaignDraft) : null)
    } catch (e) {
      console.error(e)
    }
  }, [user])

  const greetingFor = useCallback((forCampaignId: string | null) => {
    if (forCampaignId) {
      return `I've opened the context for campaign ID "${forCampaignId}". Let me know how you'd like to adjust its daily budget, pause/resume it, swap ad creatives, or check its current telemetry performance.`
    }
    if (actionParam === 'create') {
      return `Ready to launch a new campaign! Tell me about your business, target audience, and primary campaign objective.`
    }
    return `Ready to launch your first campaign? Describe your business. We'll build everything for you.`
  }, [actionParam])

  const openSession = useCallback(async (sessionId: string) => {
    setLoadingHistory(true)
    setAwaitingUser(false)
    setPendingOptions([])
    try {
      const { session, turns } = await getChatSessionHistory(sessionId)
      setCurrentSessionId(session.id)
      localStorage.setItem('leadpilot_last_session', session.id)
      if (turns.length > 0) {
        setMessages(turns.map(t => ({ role: t.role, content: t.content })))
      } else {
        setMessages([{ role: 'assistant', content: greetingFor(session.campaign_id) }])
      }
      setSearchParams(prev => {
        const next = new URLSearchParams(prev)
        next.set('session', session.id)
        return next
      }, { replace: true })
      fetchPendingDraft()
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingHistory(false)
    }
  }, [greetingFor, setSearchParams, fetchPendingDraft])

  const refreshSessions = useCallback(async () => {
    try {
      const list = await listChatSessions()
      setSessions(list)
      return list
    } catch (e) {
      console.error(e)
      return []
    }
  }, [])

  // Initial load: a campaign's own chat if we arrived via "Open chat" on a
  // specific campaign, a deep-linked session from the URL, or the most
  // recently active chat. Falls back to empty state if there are no chats.
  useEffect(() => {
    if (!user) return
    let cancelled = false

    ;(async () => {
      setLoadingHistory(true)
      const list = await refreshSessions()
      if (cancelled) return

      if (campaignId) {
        const existing = list.find(s => s.campaign_id === campaignId)
        if (existing) {
          await openSession(existing.id)
        } else {
          const created = await createChatSession(campaignId)
          setSessions(prev => [created, ...prev])
          await openSession(created.id)
        }
        return
      }

      if (sessionParam && list.some(s => s.id === sessionParam)) {
        await openSession(sessionParam)
        return
      }

      const storedSession = localStorage.getItem('leadpilot_last_session')
      if (storedSession && list.some(s => s.id === storedSession)) {
        await openSession(storedSession)
        return
      }

      if (list.length > 0) {
        await openSession(list[0].id)
        return
      }

      setCurrentSessionId(null)
      setMessages([])
      setLoadingHistory(false)
    })()

    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const handleNewChat = async () => {
    setRunning(true)
    try {
      const created = await createChatSession(campaignId ?? undefined)
      setSessions(prev => [created, ...prev])
      setCurrentSessionId(created.id)
      localStorage.setItem('leadpilot_last_session', created.id)
      setMessages([{ role: 'assistant', content: `Fresh canvas loaded. What business objective or campaign adjustment should we handle next?` }])
      setPendingDraft(null)
      setToolSteps([])
      setAwaitingUser(false)
      setPendingOptions([])
      setSearchParams(prev => {
        const next = new URLSearchParams(prev)
        next.set('session', created.id)
        return next
      }, { replace: true })
    } catch (e) {
      console.error(e)
    } finally {
      setRunning(false)
    }
  }

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await deleteChatSession(sessionId)
      const remaining = sessions.filter(s => s.id !== sessionId)
      setSessions(remaining)
      if (sessionId === currentSessionId) {
        if (remaining.length > 0) {
          await openSession(remaining[0].id)
        } else {
          setCurrentSessionId(null)
          setMessages([])
        }
      }
    } catch (e2) {
      console.error(e2)
    }
  }

  const handleSendMessage = async (text: string) => {
    let messageText = text.trim()
    if (!messageText || running) return

    if (campaignId && !messageText.includes('[Context:')) {
      messageText = `[Context: Campaign ID ${campaignId}] ${messageText}`
    }
    if (attachedFileName) {
      messageText = `[Attached Asset: ${attachedFileName}] ${messageText}`
    }

    setInput('')
    setAttachedImage(null)
    setAttachedFileName(null)
    setAwaitingUser(false)
    setPendingOptions([])
    setQuestionDismissed(false)
    setMessages(prev => [...prev, { role: 'user', content: messageText }])
    setRunning(true)
    setToolSteps([])

    const controller = new AbortController()
    abortRef.current = controller

    try {
      await askAiManagerStream(
        messageText,
        (event: ManagerSSEEvent) => {
          if (event.type === 'tool_start') {
            setToolSteps(prev => [...prev, { tool: toolLabel(event.tool), status: 'running' }])
          } else if (event.type === 'tool_end') {
            setToolSteps(prev => {
              const next = [...prev]
              for (let i = next.length - 1; i >= 0; i--) {
                if (next[i].tool === toolLabel(event.tool) && next[i].status === 'running') {
                  next[i] = { ...next[i], status: 'done', output_summary: event.output_summary }
                  break
                }
              }
              return next
            })
          } else if (event.type === 'message') {
            setMessages(prev => [...prev, { role: 'assistant', content: event.content }])
            setAwaitingUser(event.awaiting_user)
            setPendingOptions(event.awaiting_user ? (event.options ?? []) : [])
          } else if (event.type === 'preview_data') {
            setPreviewData(event.data)
          } else if (event.type === 'error') {
            setMessages(prev => [...prev, { role: 'error', content: event.error }])
          }
        },
        true,
        currentSessionId,
        controller.signal,
      )

      // A brand-new chat's session is created server-side on its first
      // message — pick it up now so every message after stays in it.
      if (!currentSessionId) {
        const list = await refreshSessions()
        const mostRecent = list[0]
        if (mostRecent) {
          setCurrentSessionId(mostRecent.id)
          localStorage.setItem('leadpilot_last_session', mostRecent.id)
          setSearchParams(prev => {
            const next = new URLSearchParams(prev)
            next.set('session', mostRecent.id)
            return next
          }, { replace: true })
        }
      } else {
        refreshSessions()
      }

      await fetchPendingDraft()
    } catch (err) {
      const msg = err instanceof AiManagerError ? err.message : 'Something went wrong communicating with the AI Manager.'
      setMessages(prev => [...prev, { role: 'error', content: msg }])
    } finally {
      setRunning(false)
      setToolSteps([])
      abortRef.current = null
    }
  }

  const handleStop = () => {
    abortRef.current?.abort()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAttachedFileName(file.name)
      const reader = new FileReader()
      reader.onloadend = () => setAttachedImage(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const handleApproveDraft = async () => {
    if (!pendingDraft) return
    setRunning(true)
    try {
      const decidedBy = profile?.full_name ?? user!.email ?? 'User'
      await approveDraft(pendingDraft.id, decidedBy, 'Approved')
      setMessages(prev => [
        ...prev,
        { role: 'user', content: `Approved draft: ${pendingDraft.strategy.campaign_name}` },
        { role: 'assistant', content: `Perfect! I've approved and published campaign "${pendingDraft.strategy.campaign_name}" to your Meta Account. You can monitor its live metrics in the Dashboard now.` },
      ])
      setPendingDraft(null)
    } catch (err) {
      const msg = err instanceof AiManagerError ? err.message : 'Approval request failed.'
      setMessages(prev => [...prev, { role: 'error', content: msg }])
    } finally {
      setRunning(false)
    }
  }

  const handleRejectDraft = async (reason: string) => {
    if (!pendingDraft || !reason.trim()) return
    setRunning(true)
    try {
      const decidedBy = profile?.full_name ?? user!.email ?? 'User'
      await rejectDraft(pendingDraft.id, decidedBy, reason)
      setMessages(prev => [
        ...prev,
        { role: 'user', content: `Rejected draft with changes: ${reason}` },
        { role: 'assistant', content: `I've registered your feedback: "${reason}". I am reworking the campaign parameters now. Let me know what specific changes to focus on.` },
      ])
      setPendingDraft(null)
    } catch (err) {
      const msg = err instanceof AiManagerError ? err.message : 'Rejection request failed.'
      setMessages(prev => [...prev, { role: 'error', content: msg }])
    } finally {
      setRunning(false)
    }
  }

  const suggestedPrompts = [
    { label: 'gym memberships', text: 'I need more local gym memberships. Draft a target strategy.' },
    { label: 'clinic campaign', text: 'Launch a campaign for my clinic.' },
    { label: 'adjust budget', text: 'Increase daily budget of campaign to ₹1000.' },
    { label: 'pause ads', text: 'Pause my active clinic campaign.' },
  ]

  const isEmpty = messages.length === 0 && !loadingHistory && !currentSessionId
  const isLastMessageAssistant = messages.length > 0 && messages[messages.length - 1].role === 'assistant'
  const activeStatusTitle = toolSteps.length > 0
    ? (toolSteps[toolSteps.length - 1].status === 'running' ? toolSteps[toolSteps.length - 1].tool : 'Agent workflow')
    : thinkingLabel

  const pendingQuestions: PendingQuestion[] =
    awaitingUser && !questionDismissed && isLastMessageAssistant
      ? [{ content: messages[messages.length - 1].content, options: pendingOptions.length > 0 ? pendingOptions : undefined }]
      : []

  const answerQuestion = (answer: string) => {
    setQuestionDismissed(true)
    handleSendMessage(answer)
  }

  const currentTitle = sessions.find(s => s.id === currentSessionId)?.title ?? 'New chat'

  return (
    <>
      <Helmet><title>Conversational Workspace — LeadPilot</title></Helmet>

      <div className={cn('h-[calc(100vh-3.5rem)] md:h-screen -m-4 sm:-m-6 lg:-m-8 flex', dark ? 'bg-chat-bg-dark' : 'bg-chat-bg-light')}>
        {sidebarOpen && (
          <div className={cn('hidden sm:flex w-64 flex-shrink-0 border-r flex-col', dark ? 'border-chat-border-dark bg-chat-card-dark/40' : 'border-chat-border-light bg-white/60')}>
            <div className={cn('flex items-center justify-between px-3 py-3 border-b', dark ? 'border-chat-border-dark' : 'border-chat-border-light')}>
              <span className={cn('text-xs font-semibold uppercase tracking-wide', dark ? 'text-chat-muted-dark' : 'text-chat-muted-light')}>Chats</span>
            </div>
            <div className="p-2">
              <button
                onClick={handleNewChat}
                className={cn(
                  'w-full flex items-center gap-2 text-xs font-medium rounded-lg px-3 py-2 border transition-colors',
                  dark ? 'text-chat-primary-dark bg-chat-card-dark border-chat-border-dark hover:border-status-waiting' : 'text-claude-text bg-white border-claude-border hover:border-claude-accent'
                )}
              >
                <PenSquare size={13} />
                New chat
              </button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-2 space-y-1">
              {sessions.length === 0 && (
                <p className={cn('text-xs px-2 py-3', dark ? 'text-chat-muted-dark' : 'text-claude-textMuted')}>No previous chats yet.</p>
              )}
              {sessions.map(s => (
                <button
                  key={s.id}
                  onClick={() => openSession(s.id)}
                  className={cn(
                    'w-full group flex items-start gap-2 text-left px-2.5 py-2 rounded-lg text-xs transition-colors',
                    s.id === currentSessionId
                      ? dark ? 'bg-status-waiting/15 text-chat-primary-dark' : 'bg-claude-accentSoft text-claude-text'
                      : dark ? 'text-chat-muted-dark hover:bg-white/5 hover:text-chat-primary-dark' : 'text-claude-textMuted hover:bg-claude-bg hover:text-claude-text'
                  )}
                >
                  {s.campaign_id ? <Megaphone size={13} className="mt-0.5 flex-shrink-0" /> : <MessageSquare size={13} className="mt-0.5 flex-shrink-0" />}
                  <span className="flex-1 min-w-0 truncate">{s.title}</span>
                  <span
                    onClick={e => handleDeleteSession(s.id, e)}
                    className={cn('opacity-0 group-hover:opacity-100 flex-shrink-0', dark ? 'text-chat-muted-dark hover:text-red-400' : 'text-claude-textMuted hover:text-red-500')}
                    title="Delete chat"
                  >
                    <Trash2 size={12} />
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col min-w-0">
          {isEmpty ? (
            <div className="flex-1 flex flex-col items-center justify-center px-4">
              <div className="w-full max-w-2xl mx-auto">
                <div className="flex items-center gap-2.5 justify-center mb-8">
                  <div className="w-9 h-9 rounded-xl bg-status-waiting flex items-center justify-center">
                    <Sparkles size={17} className="text-white" />
                  </div>
                  <h1 className={cn('text-[26px] font-medium', dark ? 'text-chat-primary-dark' : 'text-claude-text')}>
                    {campaignId
                      ? 'Reviewing your campaign'
                      : `Hi ${profile?.full_name?.split(' ')[0] ?? 'there'}, ready to grow?`}
                  </h1>
                </div>

                <MessageInputBar
                  input={input}
                  setInput={setInput}
                  running={running}
                  attachedImage={attachedImage}
                  onRemoveAttachment={() => { setAttachedImage(null); setAttachedFileName(null) }}
                  fileInputRef={fileInputRef}
                  textareaRef={textareaRef}
                  onFileChange={handleFileChange}
                  onSend={handleSendMessage}
                  onStop={handleStop}
                  theme={theme}
                />

                <div className="flex flex-wrap gap-2 justify-center mt-4">
                  {suggestedPrompts.map(p => (
                    <button
                      key={p.label}
                      onClick={() => { setInput(p.text); requestAnimationFrame(() => textareaRef.current?.focus()) }}
                      className={cn(
                        'px-3.5 py-1.5 text-[13px] rounded-full border transition-colors',
                        dark ? 'border-chat-border-dark text-chat-muted-dark hover:text-status-waiting hover:border-status-waiting/40' : 'border-claude-border text-claude-textMuted hover:text-claude-accent hover:border-claude-accent/40'
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              <ChatHeader
                title={currentTitle}
                sidebarOpen={sidebarOpen}
                onToggleSidebar={() => setSidebarOpen(v => !v)}
                onNewChat={handleNewChat}
                theme={theme}
                onToggleTheme={toggleTheme}
              />

              <MessageList
                messages={messages}
                scrollRef={scrollRef}
                loading={loadingHistory}
                running={running}
                activeToolSteps={toolSteps}
                activeStatusTitle={activeStatusTitle}
                theme={theme}
              >
                {pendingDraft && (
                  <div className={cn('rounded-2xl overflow-hidden shadow-sm border', dark ? 'bg-chat-card-dark border-chat-border-dark' : 'bg-white border-chat-border-light')}>
                    <div className={cn('px-4 py-3 border-b flex items-center justify-between', dark ? 'border-chat-border-dark bg-white/[0.02]' : 'border-chat-border-light bg-claude-bg/60')}>
                      <div>
                        <span className="text-[10px] px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-full font-semibold uppercase">Pending review</span>
                        <h3 className={cn('text-sm font-semibold mt-1.5', dark ? 'text-chat-primary-dark' : 'text-claude-text')}>{pendingDraft.strategy.campaign_name}</h3>
                        <p className={cn('text-xs', dark ? 'text-chat-muted-dark' : 'text-claude-textMuted')}>{pendingDraft.strategy.objective} · ₹{pendingDraft.strategy.daily_budget}/day</p>
                      </div>
                    </div>
                    <div className="p-4 space-y-3">
                      <p className={cn('text-xs leading-relaxed', dark ? 'text-chat-muted-dark' : 'text-claude-textMuted')}>
                        <span className={cn('font-medium', dark ? 'text-chat-primary-dark' : 'text-claude-text')}>Audience: </span>
                        {pendingDraft.strategy.target_audience}
                      </p>
                      <p className={cn('text-xs rounded-lg p-3 border leading-relaxed', dark ? 'text-chat-primary-dark bg-chat-bg-dark border-chat-border-dark' : 'text-claude-text bg-claude-bg border-claude-border')}>
                        {pendingDraft.creative.primary_text}
                      </p>
                      {pendingDraft.landing_page && (
                        <div className={cn('flex items-center gap-2 text-xs', dark ? 'text-chat-muted-dark' : 'text-claude-textMuted')}>
                          <FileText size={13} className="text-status-waiting" />
                          {pendingDraft.landing_page.name} ({pendingDraft.landing_page.template_id})
                        </div>
                      )}
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => {
                            const r = prompt('Provide revision feedback notes to reject draft:')
                            if (r) handleRejectDraft(r)
                          }}
                          className={cn(
                            'flex-1 py-2 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 border',
                            dark ? 'bg-white/[0.02] border-red-500/30 hover:bg-red-500/10 text-red-400' : 'bg-white border-red-200 hover:bg-red-50 text-red-500'
                          )}
                        >
                          <XCircle size={13} />
                          Reject &amp; Rework
                        </button>
                        <button
                          onClick={handleApproveDraft}
                          className="flex-1 py-2 bg-status-waiting hover:opacity-90 text-white text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5"
                        >
                          <CheckCircle2 size={13} />
                          Approve &amp; Publish
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </MessageList>

              <div className="px-4 pb-5 pt-2">
                <MessageInputBar
                  input={input}
                  setInput={setInput}
                  running={running}
                  attachedImage={attachedImage}
                  onRemoveAttachment={() => { setAttachedImage(null); setAttachedFileName(null) }}
                  fileInputRef={fileInputRef}
                  textareaRef={textareaRef}
                  onFileChange={handleFileChange}
                  onSend={handleSendMessage}
                  onStop={handleStop}
                  theme={theme}
                />
              </div>
            </>
          )}
        </div>

        {previewData && (
          <div className={cn('hidden lg:block w-80 border-l p-4 overflow-y-auto flex-shrink-0', dark ? 'border-chat-border-dark bg-chat-card-dark/20 text-chat-primary-dark' : 'border-claude-border bg-gray-50 text-claude-text')}>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Sparkles size={14}/> Live Preview</h3>
            <pre className={cn('text-xs overflow-auto p-3 rounded-lg border whitespace-pre-wrap', dark ? 'bg-chat-bg-dark border-chat-border-dark' : 'bg-white border-claude-border')}>
              {JSON.stringify(previewData, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {pendingQuestions.length > 0 && (
        <QuestionModal
          questions={pendingQuestions}
          theme={theme}
          onAnswer={answerQuestion}
          onDismiss={() => setQuestionDismissed(true)}
        />
      )}
    </>
  )
}
