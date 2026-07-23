import { cn } from '@/lib/utils'

export default function UserMessage({ content, theme }: { content: string; theme: 'dark' | 'light' }) {
  return (
    <div className="flex justify-end">
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed',
          theme === 'dark' ? 'bg-status-waiting/15 text-chat-primary-dark' : 'bg-claude-accentSoft text-claude-text'
        )}
      >
        <p className="whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  )
}
