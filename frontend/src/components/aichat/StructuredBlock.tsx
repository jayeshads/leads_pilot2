import { useState } from 'react'
import { cn } from '@/lib/utils'

interface StructuredBlockProps {
  label?: string
  content: string
  theme: 'dark' | 'light'
  collapsedLines?: number
}

/**
 * Monospace, code-style block for structured output (JSON args, tool
 * output summaries, etc.) with a "Show more" toggle once it's tall.
 */
export default function StructuredBlock({ label, content, theme, collapsedLines = 6 }: StructuredBlockProps) {
  const [expanded, setExpanded] = useState(false)
  const lines = content.split('\n')
  const isLong = lines.length > collapsedLines
  const shown = expanded || !isLong ? content : lines.slice(0, collapsedLines).join('\n')

  return (
    <div
      className={cn(
        'rounded-lg border overflow-hidden',
        theme === 'dark' ? 'bg-chat-bg-dark border-chat-border-dark' : 'bg-white border-chat-border-light'
      )}
    >
      {label && (
        <div
          className={cn(
            'px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide border-b',
            theme === 'dark'
              ? 'text-chat-muted-dark border-chat-border-dark'
              : 'text-chat-muted-light border-chat-border-light'
          )}
        >
          {label}
        </div>
      )}
      <pre
        className={cn(
          'px-3 py-2.5 text-[12.5px] font-mono whitespace-pre-wrap break-words leading-relaxed overflow-x-auto',
          theme === 'dark' ? 'text-chat-primary-dark' : 'text-claude-text'
        )}
      >
        {shown}
      </pre>
      {isLong && (
        <button
          onClick={() => setExpanded(v => !v)}
          className={cn(
            'w-full text-center text-[11px] font-medium py-1.5 border-t transition-colors',
            theme === 'dark'
              ? 'text-status-waiting border-chat-border-dark hover:bg-white/5'
              : 'text-status-waiting border-chat-border-light hover:bg-black/5'
          )}
        >
          {expanded ? 'Show less' : `Show more (${lines.length - collapsedLines} more lines)`}
        </button>
      )}
    </div>
  )
}
