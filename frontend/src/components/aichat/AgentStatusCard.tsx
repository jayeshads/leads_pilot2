import { useState } from 'react'
import { ChevronDown, ChevronRight, HelpCircle, Loader2, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import StructuredBlock from './StructuredBlock'

export interface ToolCallStep {
  tool: string
  args?: Record<string, unknown>
  output_summary?: string
  status: 'running' | 'done'
}

interface AgentStatusCardProps {
  title: string
  steps: ToolCallStep[]
  running: boolean
  theme: 'dark' | 'light'
}

/**
 * Phase 2 — "? icon + title + status pill + chevron" card. Click to
 * expand and see the underlying tool-call log built up from tool_start /
 * tool_end SSE events. Collapsed by default so the chat stays clean;
 * landing-page generation etc. should pass a friendly `title` and never
 * leak internal tool names into it (see behavioral spec).
 */
export default function AgentStatusCard({ title, steps, running, theme }: AgentStatusCardProps) {
  const [open, setOpen] = useState(false)
  const dark = theme === 'dark'

  return (
    <div
      className={cn(
        'max-w-[85%] rounded-xl border overflow-hidden',
        dark ? 'bg-chat-card-dark border-chat-border-dark' : 'bg-chat-card-light border-chat-border-light'
      )}
    >
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2.5 px-4 py-3 text-left"
      >
        <HelpCircle size={15} className={dark ? 'text-chat-muted-dark' : 'text-chat-muted-light'} />
        <span className={cn('flex-1 text-[13px] font-medium truncate', dark ? 'text-chat-primary-dark' : 'text-claude-text')}>
          {title}
        </span>
        <span
          className={cn(
            'text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full flex items-center gap-1',
            running ? 'text-status-running bg-status-running/10' : 'text-status-stopped bg-status-stopped/10'
          )}
        >
          {running ? <Loader2 size={10} className="animate-spin" /> : <CheckCircle2 size={10} />}
          {running ? 'Running' : 'Done'}
        </span>
        {open ? (
          <ChevronDown size={14} className={dark ? 'text-chat-muted-dark' : 'text-chat-muted-light'} />
        ) : (
          <ChevronRight size={14} className={dark ? 'text-chat-muted-dark' : 'text-chat-muted-light'} />
        )}
      </button>

      {open && steps.length > 0 && (
        <div className={cn('px-4 pb-3.5 space-y-2 border-t pt-3', dark ? 'border-chat-border-dark' : 'border-chat-border-light')}>
          {steps.map((step, idx) => (
            <div key={idx} className="space-y-1.5">
              <div className="flex items-center gap-2 text-[12px]">
                {step.status === 'running' ? (
                  <Loader2 size={11} className="text-status-waiting animate-spin flex-shrink-0" />
                ) : (
                  <CheckCircle2 size={11} className="text-status-running flex-shrink-0" />
                )}
                <span className={cn('font-medium', dark ? 'text-chat-primary-dark' : 'text-claude-text')}>
                  {step.tool}
                </span>
              </div>
              {step.output_summary && (
                <StructuredBlock content={step.output_summary} theme={theme} collapsedLines={4} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
