import { useCallback, useEffect, useState } from 'react'
import { Eye, MousePointer, IndianRupee, Users, TrendingUp, Target } from 'lucide-react'
import { getCachedInsights } from '@/lib/meta/sync'
import ModalShell from './ModalShell'
import type { Campaign } from '../types'

interface Props {
  campaign: Campaign
  onClose: () => void
}

interface Insights {
  impressions: number
  clicks: number
  spend: number
  reach: number
  ctr: number
  cpc: number
  leads: number
  updated_at: string
}

export default function AllMetricsModal({ campaign, onClose }: Props) {
  const [insights, setInsights] = useState<Insights | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchInsights = useCallback(async () => {
    setLoading(true)
    const data = await getCachedInsights(campaign.id, 'last_30d')
    setInsights(data)
    setLoading(false)
  }, [campaign.id])

  useEffect(() => { fetchInsights() }, [fetchInsights])

  const cpl = insights && insights.leads > 0 ? insights.spend / insights.leads : null
  // No revenue-per-lead figure exists anywhere in this codebase, so ROAS is
  // shown only if we genuinely have the inputs for it — never fabricated.
  const roas: number | null = null as number | null

  const metrics = [
    { label: 'Reach', value: insights ? insights.reach.toLocaleString('en-IN') : '—', icon: Users, color: 'text-brand-400' },
    { label: 'Impressions', value: insights ? insights.impressions.toLocaleString('en-IN') : '—', icon: Eye, color: 'text-violet-400' },
    { label: 'CTR', value: insights ? `${insights.ctr.toFixed(2)}%` : '—', icon: MousePointer, color: 'text-amber-400' },
    { label: 'CPC', value: insights ? `₹${insights.cpc.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : '—', icon: IndianRupee, color: 'text-amber-400' },
    { label: 'Cost per lead', value: cpl ? `₹${cpl.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '—', icon: TrendingUp, color: 'text-green-400' },
    { label: 'ROAS', value: roas ? `${roas.toFixed(1)}x` : 'Not tracked', icon: Target, color: 'text-slate-500' },
  ]

  return (
    <ModalShell title="All metrics" subtitle={campaign.name} onClose={onClose} maxWidth="max-w-xl">
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => <div key={i} className="h-20 bg-white/5 rounded-xl animate-pulse" />)}
        </div>
      ) : !insights ? (
        <div className="text-center py-8">
          <p className="text-slate-400 text-sm">No metrics yet for this campaign</p>
          <p className="text-slate-600 text-xs mt-1">Data syncs every few hours once the campaign is live on Meta</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {metrics.map(m => (
              <div key={m.label} className="bg-dark-800/60 rounded-xl p-3.5">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <m.icon size={13} className={m.color} />
                  <p className="text-slate-500 text-xs">{m.label}</p>
                </div>
                <p className="text-white font-bold text-lg">{m.value}</p>
              </div>
            ))}
          </div>
          <p className="text-slate-700 text-xs mt-4">
            Last synced: {new Date(insights.updated_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · Last 30 days
          </p>
        </>
      )}
    </ModalShell>
  )
}
