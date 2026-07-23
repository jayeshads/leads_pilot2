import { useEffect, useRef, useState } from 'react'
import { MoreVertical, Sparkles, BarChart3, Lightbulb, LineChart, ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type CampaignAction = 'edit_with_ai' | 'all_metrics' | 'recommendation' | 'performance' | 'preview_ad'

interface Props {
  onAction: (action: CampaignAction) => void
  disabled?: boolean
}

const ACTIONS: { key: CampaignAction; label: string; icon: React.ElementType }[] = [
  { key: 'edit_with_ai', label: 'Edit with AI', icon: Sparkles },
  { key: 'all_metrics', label: 'View all metrics', icon: BarChart3 },
  { key: 'recommendation', label: 'Check recommendation', icon: Lightbulb },
  { key: 'performance', label: 'View performance', icon: LineChart },
  { key: 'preview_ad', label: 'Preview ad', icon: ImageIcon },
]

/** The 5-action menu from every CampaignRow / CampaignMobileList card.
 * Closes on outside click and on Escape. */
export default function ThreeDotMenu({ onAction, disabled }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(v => !v)}
        className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        title="More actions"
        aria-label="More actions"
      >
        <MoreVertical size={16} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 w-56 glass rounded-xl border border-white/10 overflow-hidden shadow-xl py-1">
          {ACTIONS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setOpen(false)
                onAction(key)
              }}
              className={cn(
                'w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-white/5 transition-colors text-left'
              )}
            >
              <Icon size={14} className="text-slate-500" />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
