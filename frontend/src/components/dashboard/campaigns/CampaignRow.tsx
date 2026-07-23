import { Megaphone } from 'lucide-react'
import { cn } from '@/lib/utils'
import { STATUS_CONFIG } from './constants'
import OnOffToggle from './OnOffToggle'
import RecommendationBadge from './RecommendationBadge'
import ThreeDotMenu, { type CampaignAction } from './ThreeDotMenu'
import type { Campaign } from './types'
import type { Recommendation } from '@/lib/meta/campaignApi'

interface Props {
  campaign: Campaign
  recommendation: Recommendation | null | undefined
  recommendationLoading?: boolean
  toggling: boolean
  onToggle: (campaign: Campaign) => void
  onAction: (campaign: Campaign, action: CampaignAction) => void
}

export default function CampaignRow({ campaign, recommendation, recommendationLoading, toggling, onToggle, onAction }: Props) {
  const cfg = STATUS_CONFIG[campaign.status]
  const StatusIcon = cfg.icon
  const canToggle = (campaign.status === 'active' || campaign.status === 'paused') && !!campaign.meta_campaign_id

  return (
    <tr className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors">
      <td className="py-3.5 pl-5 pr-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 bg-brand-600/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <Megaphone size={14} className="text-brand-400" />
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-medium truncate">{campaign.name}</p>
            <p className="text-slate-600 text-xs truncate">{campaign.objective}</p>
          </div>
        </div>
      </td>
      <td className="py-3.5 px-3">
        <span className={cn('inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border whitespace-nowrap', cfg.color)}>
          <StatusIcon size={11} />
          {cfg.label}
        </span>
      </td>
      <td className="py-3.5 px-3 text-sm text-slate-300 whitespace-nowrap">
        &#x20b9;{campaign.daily_budget.toLocaleString('en-IN')}/day
      </td>
      <td className="py-3.5 px-3 text-xs text-slate-500 whitespace-nowrap">
        {new Date(campaign.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
      </td>
      <td className="py-3.5 px-3">
        <RecommendationBadge recommendation={recommendation} loading={recommendationLoading} />
      </td>
      <td className="py-3.5 px-3">
        <OnOffToggle
          active={campaign.status === 'active'}
          disabled={!canToggle}
          loading={toggling}
          onToggle={() => onToggle(campaign)}
        />
      </td>
      <td className="py-3.5 pr-5 pl-3 text-right">
        <ThreeDotMenu onAction={action => onAction(campaign, action)} />
      </td>
    </tr>
  )
}
