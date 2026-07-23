import { cn } from '@/lib/utils'

interface AgentMessageProps {
  content: string
  theme: 'dark' | 'light'
  isError?: boolean
}

export default function AgentMessage({ content, theme, isError }: AgentMessageProps) {
  return (
    <div className="flex justify-start gap-2.5 items-start">
      <span
        className={cn(
          'w-2 h-2 rounded-full mt-2 flex-shrink-0',
          isError ? 'bg-red-500' : 'bg-status-running'
        )}
      />
      <div
        className={cn(
          'max-w-[80%] text-[15px] leading-relaxed',
          isError ? 'text-red-500' : theme === 'dark' ? 'text-chat-primary-dark' : 'text-claude-text'
        )}
      >
        <p className="whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  )
}
