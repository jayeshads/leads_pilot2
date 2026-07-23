import { RefObject } from 'react'
import UserMessage from './UserMessage'
import AgentMessage from './AgentMessage'
import AgentStatusCard, { ToolCallStep } from './AgentStatusCard'
import { cn } from '@/lib/utils'

export interface ChatMessage {
  role: 'user' | 'assistant' | 'error'
  content: string
}

interface MessageListProps {
  messages: ChatMessage[]
  scrollRef: RefObject<HTMLDivElement>
  loading: boolean
  running: boolean
  activeToolSteps: ToolCallStep[]
  activeStatusTitle: string
  theme: 'dark' | 'light'
  children?: React.ReactNode // slot for pendingDraft card / inline extras
}

/**
 * Phase 2 — the scrollable message column. Keeps ordering/skeleton logic
 * in one place; AiChat.tsx owns fetching/streaming state and just hands
 * it down.
 */
export default function MessageList({
  messages,
  scrollRef,
  loading,
  running,
  activeToolSteps,
  activeStatusTitle,
  theme,
  children,
}: MessageListProps) {
  const dark = theme === 'dark'

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {loading ? (
          <div className="space-y-4 py-8">
            <div className={cn('h-10 w-2/3 rounded-xl animate-pulse', dark ? 'bg-chat-border-dark/50' : 'bg-claude-border/50')} />
            <div className={cn('h-10 w-1/3 rounded-xl animate-pulse ml-auto', dark ? 'bg-chat-border-dark/50' : 'bg-claude-border/50')} />
            <div className={cn('h-16 w-1/2 rounded-xl animate-pulse', dark ? 'bg-chat-border-dark/50' : 'bg-claude-border/50')} />
          </div>
        ) : (
          messages.map((m, idx) =>
            m.role === 'user' ? (
              <UserMessage key={idx} content={m.content} theme={theme} />
            ) : (
              <AgentMessage key={idx} content={m.content} theme={theme} isError={m.role === 'error'} />
            )
          )
        )}

        {running && (
          <AgentStatusCard title={activeStatusTitle} steps={activeToolSteps} running theme={theme} />
        )}

        {children}
      </div>
    </div>
  )
}
