import { useState } from 'react'
import { Lightbulb, RefreshCw, CheckCircle2 } from 'lucide-react'
import { useAuth } from '@/lib/AuthContext'
import { requestRecommendation, approveRecommendation, CampaignControlError, type Recommendation } from '@/lib/meta/campaignApi'
import { cn } from '@/lib/utils'
import ModalShell from './ModalShell'
import type { Campaign } from '../types'

interface Props {
  campaign: Campaign
  existing: Recommendation | null | undefined
  onClose: () => void
}

const CONFIDENCE_COLOR: Record<Recommendation['confidence'], string> = {
  high: 'text-green-400 border-green-500/30 bg-green-500/10',
  medium: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
  low: 'text-slate-400 border-white/15 bg-white/5',
}

/** Backed by the real Recommendation Engine (/api/monitoring/recommend +
 * /recommendations/pending) — this is Approval Gate #2. Approving here does
 * NOT apply the change; that still requires a separate explicit action
 * elsewhere, matching the backend's safety design. */
export default function RecommendationModal({ campaign, existing, onClose }: Props) {
  const { user } = useAuth()
  const [rec, setRec] = useState<Recommendation | null | undefined>(existing)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [approved, setApproved] = useState(false)

  const runEngine = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await requestRecommendation(campaign.id)
      setRec(result)
    } catch (err) {
      setError(
        err instanceof CampaignControlError
          ? err.message
          : 'Could not generate a recommendation right now.'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async () => {
    if (!rec || !user) return
    setLoading(true)
    setError(null)
    try {
      const updated = await approveRecommendation(rec.id, user.email ?? user.id)
      setRec(updated)
      setApproved(true)
    } catch (err) {
      setError(err instanceof CampaignControlError ? err.message : 'Could not approve this recommendation.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ModalShell title="Check recommendation" subtitle={campaign.name} onClose={onClose}>
      <div className="space-y-4">
        {error && (
          <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">
            {error}
          </div>
        )}

        {!rec ? (
          <div className="text-center py-6">
            <Lightbulb size={28} className="text-slate-700 mx-auto mb-3" />
            <p className="text-slate-400 text-sm mb-4">No recommendation on file yet for this campaign.</p>
            <button
              onClick={runEngine}
              disabled={loading}
              className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-60 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-all"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              {loading ? 'Analyzing…' : 'Generate recommendation'}
            </button>
            <p className="text-slate-700 text-xs mt-3">
              Requires at least one performance pull for this campaign — if none exists yet, this will say so.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <span className={cn('inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border', CONFIDENCE_COLOR[rec.confidence])}>
                {rec.confidence} confidence
              </span>
              <span className="text-xs text-slate-500 capitalize">{rec.type.replace(/_/g, ' ')}</span>
              {rec.status !== 'pending' && (
                <span className="text-xs text-slate-600 capitalize ml-auto">{rec.status}</span>
              )}
            </div>

            <div className="bg-dark-800/60 rounded-xl p-4">
              <p className="text-slate-300 text-sm leading-relaxed">{rec.reasoning}</p>
            </div>

            {approved || rec.status !== 'pending' ? (
              <div className="flex items-center gap-2 text-green-400 text-sm bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-2.5">
                <CheckCircle2 size={15} />
                {rec.status === 'applied' ? 'This recommendation has been applied.' : 'Approved — your team will apply this shortly.'}
              </div>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={runEngine}
                  disabled={loading}
                  className="flex-1 border border-white/10 hover:border-white/20 text-slate-300 text-sm font-medium py-2.5 rounded-xl transition-all disabled:opacity-60"
                >
                  Re-run
                </button>
                <button
                  onClick={handleApprove}
                  disabled={loading}
                  className="flex-1 bg-brand-600 hover:bg-brand-500 disabled:opacity-60 text-white text-sm font-medium py-2.5 rounded-xl transition-all"
                >
                  {loading ? 'Working…' : 'Approve'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </ModalShell>
  )
}
