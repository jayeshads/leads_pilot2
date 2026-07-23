import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Recommendation } from '@/lib/meta/campaignApi'

interface Props {
  recommendation: Recommendation | null | undefined
  loading?: boolean
}

const CONFIDENCE_COLOR: Record<Recommendation['confidence'], string> = {
  high: 'text-green-400 border-green-500/30 bg-green-500/10',
  medium: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
  low: 'text-slate-400 border-white/15 bg-white/5',
}

const TYPE_LABEL: Record<Recommendation['type'], string> = {
  pause_creative: 'Pause suggested',
  increase_budget: 'Scale up',
  decrease_budget: 'Scale down',
  change_targeting: 'Retarget',
  no_action: 'On track',
}

/** Shows nothing if there's no pending recommendation for this campaign —
 * a badge here should mean "the AI has something to say", not decorate
 * every row. */
export default function RecommendationBadge({ recommendation, loading }: Props) {
  if (loading) {
    return <span className="inline-block h-5 w-20 rounded-full bg-white/5 animate-pulse" />
  }
  if (!recommendation) return null

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border whitespace-nowrap',
        CONFIDENCE_COLOR[recommendation.confidence]
      )}
      title={recommendation.reasoning}
    >
      <Sparkles size={10} />
      {TYPE_LABEL[recommendation.type]}
    </span>
  )
}
