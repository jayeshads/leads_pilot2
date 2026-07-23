import { useEffect } from 'react'
import { Paperclip, Image as ImageIcon, Send, Square, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MessageInputBarProps {
  input: string
  setInput: (v: string) => void
  running: boolean
  attachedImage: string | null
  onRemoveAttachment: () => void
  fileInputRef: React.RefObject<HTMLInputElement>
  textareaRef: React.RefObject<HTMLTextAreaElement>
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onSend: (text: string) => void
  onStop?: () => void
  theme: 'dark' | 'light'
}

const MAX_HEIGHT = 200

function autoGrow(el: HTMLTextAreaElement | null) {
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`
}

/**
 * Phase 2 — composer whose toolbar swaps depending on agent state: attach
 * / generate-image while idle, a Stop control while the agent is running.
 */
export default function MessageInputBar({
  input,
  setInput,
  running,
  attachedImage,
  onRemoveAttachment,
  fileInputRef,
  textareaRef,
  onFileChange,
  onSend,
  onStop,
  theme,
}: MessageInputBarProps) {
  useEffect(() => { autoGrow(textareaRef.current) }, [input, textareaRef])
  const dark = theme === 'dark'

  return (
    <div className="max-w-3xl mx-auto w-full">
      {attachedImage && (
        <div className={cn('mb-2 flex items-center gap-2 p-2 rounded-xl max-w-xs relative border', dark ? 'bg-chat-card-dark border-chat-border-dark' : 'bg-white border-chat-border-light')}>
          <img src={attachedImage} className="w-9 h-9 object-cover rounded-lg" alt="Attachment thumb" />
          <p className={cn('text-xs truncate flex-1', dark ? 'text-chat-primary-dark' : 'text-claude-text')}>Ready to send</p>
          <button onClick={onRemoveAttachment} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white border border-chat-border-light rounded-full flex items-center justify-center shadow-sm">
            <X size={10} />
          </button>
        </div>
      )}

      <div className={cn('border rounded-2xl shadow-sm px-3 pt-3 pb-2 flex flex-col gap-2', dark ? 'bg-chat-card-dark border-chat-border-dark' : 'bg-white border-chat-border-light')}>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={onFileChange} className="hidden" />

        <textarea
          ref={textareaRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onInput={e => autoGrow(e.currentTarget)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(input) } }}
          placeholder="Message LeadPilot…"
          rows={1}
          disabled={running}
          className={cn(
            'w-full resize-none bg-transparent text-[15px] focus:outline-none overflow-y-auto',
            dark ? 'text-chat-primary-dark placeholder-chat-muted-dark' : 'text-claude-text placeholder-claude-textMuted'
          )}
          style={{ maxHeight: MAX_HEIGHT, minHeight: 24 }}
        />

        <div className="flex items-center justify-between">
          {running ? (
            <span className="text-[12px] text-status-running font-medium">Agent is working…</span>
          ) : (
            <div className="flex items-center gap-1">
              <button
                onClick={() => fileInputRef.current?.click()}
                className={cn('w-8 h-8 rounded-lg flex items-center justify-center transition-all', dark ? 'text-chat-muted-dark hover:text-chat-primary-dark hover:bg-white/5' : 'text-claude-textMuted hover:text-claude-text hover:bg-claude-bg')}
                title="Attach a file or image"
              >
                <Paperclip size={16} />
              </button>
              <button
                onClick={() => setInput('/generate-image ')}
                className={cn('w-8 h-8 rounded-lg flex items-center justify-center transition-all', dark ? 'text-chat-muted-dark hover:text-status-waiting hover:bg-white/5' : 'text-claude-textMuted hover:text-claude-accent hover:bg-claude-bg')}
                title="Generate an image"
              >
                <ImageIcon size={16} />
              </button>
            </div>
          )}

          {running && onStop ? (
            <button onClick={onStop} className="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center" title="Stop">
              <Square size={13} />
            </button>
          ) : (
            <button
              onClick={() => onSend(input)}
              disabled={!input.trim()}
              className="w-8 h-8 rounded-lg flex items-center justify-center bg-status-waiting hover:opacity-90 text-white disabled:opacity-30 transition-all"
            >
              <Send size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
