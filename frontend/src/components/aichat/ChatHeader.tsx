import { PanelLeftClose, PanelLeft, PenSquare, Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChatHeaderProps {
  title: string
  sidebarOpen: boolean
  onToggleSidebar: () => void
  onNewChat: () => void
  theme: 'dark' | 'light'
  onToggleTheme: () => void
}

/**
 * Phase 2 — top bar of the AI Chat panel. Session title on the left,
 * new-chat / sidebar-collapse / theme toggle on the right. Kept dumb and
 * stateless — AiChat.tsx owns all the state, this just renders it.
 */
export default function ChatHeader({
  title,
  sidebarOpen,
  onToggleSidebar,
  onNewChat,
  theme,
  onToggleTheme,
}: ChatHeaderProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between px-4 sm:px-6 py-3 border-b flex-shrink-0',
        theme === 'dark' ? 'border-chat-border-dark bg-chat-bg-dark' : 'border-chat-border-light bg-chat-bg-light'
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        <button
          onClick={onToggleSidebar}
          className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center transition-colors flex-shrink-0',
            theme === 'dark'
              ? 'text-chat-muted-dark hover:text-chat-primary-dark hover:bg-white/5'
              : 'text-chat-muted-light hover:text-chat-primary-light hover:bg-black/5'
          )}
          title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {sidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeft size={16} />}
        </button>
        <h1
          className={cn(
            'text-sm font-semibold truncate',
            theme === 'dark' ? 'text-chat-primary-dark' : 'text-chat-primary-light'
          )}
        >
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          onClick={onToggleTheme}
          className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
            theme === 'dark'
              ? 'text-chat-muted-dark hover:text-chat-primary-dark hover:bg-white/5'
              : 'text-chat-muted-light hover:text-chat-primary-light hover:bg-black/5'
          )}
          title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>
        <button
          onClick={onNewChat}
          className={cn(
            'flex items-center gap-1.5 text-xs font-medium rounded-lg px-3 py-1.5 border transition-colors',
            theme === 'dark'
              ? 'text-chat-primary-dark bg-chat-card-dark border-chat-border-dark hover:border-status-waiting'
              : 'text-chat-primary-light bg-white border-chat-border-light hover:border-status-waiting'
          )}
        >
          <PenSquare size={13} />
          New chat
        </button>
      </div>
    </div>
  )
}
