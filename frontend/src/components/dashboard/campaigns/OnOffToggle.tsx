import { cn } from '@/lib/utils'

interface Props {
  active: boolean
  disabled?: boolean
  loading?: boolean
  onToggle: () => void
  title?: string
}

/** Small pill switch used in CampaignRow / CampaignMobileList to flip a
 * launched campaign between active/paused via the unified toggle endpoint. */
export default function OnOffToggle({ active, disabled, loading, onToggle, title }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      disabled={disabled || loading}
      onClick={onToggle}
      title={title ?? (active ? 'Pause this campaign' : 'Resume this campaign')}
      className={cn(
        'relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
        active ? 'bg-green-500/80' : 'bg-white/10'
      )}
    >
      <span
        className={cn(
          'inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow transition-transform',
          active ? 'translate-x-6' : 'translate-x-1',
          loading && 'animate-pulse'
        )}
        style={{ height: 18, width: 18 }}
      />
    </button>
  )
}
