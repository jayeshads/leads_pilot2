import { useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface PendingQuestion {
  content: string
  options?: string[]
}

interface QuestionModalProps {
  questions: PendingQuestion[]
  theme: 'dark' | 'light'
  onAnswer: (answer: string) => void
  onDismiss: () => void
}

/**
 * Phase 2 — one-at-a-time Q&A modal. `questions` is a queue: as soon as
 * the current one is answered the caller should pop it and re-render
 * with the next, so "Question N of M" always reflects remaining count.
 * Driven purely by the backend's `awaiting_user: true` + `options[]`
 * SSE fields — no client-side question logic.
 */
export default function QuestionModal({ questions, theme, onAnswer, onDismiss }: QuestionModalProps) {
  const [freeText, setFreeText] = useState('')
  if (questions.length === 0) return null

  const current = questions[0]
  const total = questions.length
  const dark = theme === 'dark'

  const submit = (value: string) => {
    if (!value.trim()) return
    setFreeText('')
    onAnswer(value)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm px-4 pb-4 sm:pb-0">
      <div
        className={cn(
          'w-full max-w-md rounded-2xl border shadow-xl overflow-hidden',
          dark ? 'bg-chat-card-dark border-chat-border-dark' : 'bg-white border-chat-border-light'
        )}
      >
        <div className={cn('flex items-center justify-between px-5 pt-4 pb-2', dark ? 'text-chat-muted-dark' : 'text-chat-muted-light')}>
          <span className="text-[11px] font-semibold uppercase tracking-wide">
            Question 1 of {total}
          </span>
          <button onClick={onDismiss} className="hover:opacity-70">
            <X size={15} />
          </button>
        </div>

        <div className="px-5 pb-5">
          <p className={cn('text-[15px] leading-relaxed mb-4', dark ? 'text-chat-primary-dark' : 'text-claude-text')}>
            {current.content}
          </p>

          {current.options && current.options.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {current.options.map(opt => (
                <button
                  key={opt}
                  onClick={() => submit(opt)}
                  className={cn(
                    'px-3.5 py-1.5 text-[13px] rounded-full border transition-colors',
                    dark
                      ? 'border-chat-border-dark text-chat-primary-dark hover:border-status-waiting'
                      : 'border-claude-border text-claude-text hover:border-status-waiting'
                  )}
                >
                  {opt}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={freeText}
                onChange={e => setFreeText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submit(freeText)}
                placeholder="Type your answer…"
                className={cn(
                  'flex-1 text-[14px] rounded-lg border px-3 py-2 bg-transparent focus:outline-none',
                  dark ? 'border-chat-border-dark text-chat-primary-dark' : 'border-claude-border text-claude-text'
                )}
              />
              <button
                onClick={() => submit(freeText)}
                disabled={!freeText.trim()}
                className="px-3.5 py-2 text-[13px] font-medium rounded-lg bg-status-waiting text-white disabled:opacity-40"
              >
                Send
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
