import { Megaphone } from 'lucide-react'
import { cn } from '@/lib/utils'
import { STATUS_CONFIG } from './constants'
import OnOffToggle from './OnOffToggle'
import RecommendationBadge from './RecommendationBadge'
import ThreeDotMenu, { type CampaignAction } from './ThreeDotMenu'
import type { Campaign } from './types'
import type { Recommendation } from '@/lib/meta/campaignApi'

interface Props {
  campaigns: Campaign[]
  recommendationsByCampaign: Record<string, Recommendation | null | undefined>
  recommendationsLoading: boolean
  togglingId: string | null
  onToggle: (campaign: Campaign) => void
  onAction: (campaign: Campaign, action: CampaignAction) => void
}

export default function CampaignMobileList({
  campaigns, recommendationsByCampaign, recommendationsLoading, togglingId, onToggle, onAction,
}: Props) {
  return (
    <div className="space-y-3 md:hidden">
      {campaigns.map(camp => {
        const cfg = STATUS_CONFIG[camp.status]
        const StatusIcon = cfg.icon
        const canToggle = (camp.status === 'active' || camp.status === 'paused') && !!camp.meta_campaign_id
        return (
          <div key={camp.id} className="glass rounded-2xl p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 bg-brand-600/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Megaphone size={16} className="text-brand-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-white text-sm font-semibold truncate">{camp.name}</p>
                  <p className="text-slate-600 text-xs truncate">{camp.objective}</p>
                </div>
              </div>
              <ThreeDotMenu onAction={action => onAction(camp, action)} />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className={cn('inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border', cfg.color)}>
                <StatusIcon size={11} />
                {cfg.label}
              </span>
              <RecommendationBadge recommendation={recommendationsByCampaign[camp.id]} loading={recommendationsLoading} />
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-white/5">
              <div className="text-xs text-slate-500">
                &#x20b9;{camp.daily_budget.toLocaleString('en-IN')}/day &middot;{' '}
                {new Date(camp.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </div>
              <OnOffToggle
                active={camp.status === 'active'}
                disabled={!canToggle}
                loading={togglingId === camp.id}
                onToggle={() => onToggle(camp)}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
