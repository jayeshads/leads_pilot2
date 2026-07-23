import { useCallback, useEffect, useMemo, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Plus, Megaphone, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthContext'
import { cn } from '@/lib/utils'
import CampaignInsights from '@/components/dashboard/CampaignInsights'
import { toggleCampaign, listPendingRecommendations, type Recommendation } from '@/lib/meta/campaignApi'
import CampaignFilters, { type FiltersState } from '@/components/dashboard/campaigns/CampaignFilters'
import CampaignTable from '@/components/dashboard/campaigns/CampaignTable'
import CampaignMobileList from '@/components/dashboard/campaigns/CampaignMobileList'
import type { CampaignAction } from '@/components/dashboard/campaigns/ThreeDotMenu'
import type { Campaign } from '@/components/dashboard/campaigns/types'
import { OBJECTIVES } from '@/components/dashboard/campaigns/constants'
import EditWithAIModal from '@/components/dashboard/campaigns/modals/EditWithAIModal'
import AllMetricsModal from '@/components/dashboard/campaigns/modals/AllMetricsModal'
import RecommendationModal from '@/components/dashboard/campaigns/modals/RecommendationModal'
import PerformanceModal from '@/components/dashboard/campaigns/modals/PerformanceModal'
import PreviewAdModal from '@/components/dashboard/campaigns/modals/PreviewAdModal'

const RANGE_DAYS: Record<Exclude<FiltersState['dateRange'], 'all'>, number> = { '7d': 7, '30d': 30, '90d': 90 }

export default function Campaigns() {
  const { user } = useAuth()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ name: '', objective: '', daily_budget: '', notes: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [toggleError, setToggleError] = useState<string | null>(null)

  const [filters, setFilters] = useState<FiltersState>({ status: 'all', dateRange: 'all', search: '' })

  const [recommendations, setRecommendations] = useState<Record<string, Recommendation | null>>({})
  const [recommendationsLoading, setRecommendationsLoading] = useState(false)

  const [activeModal, setActiveModal] = useState<{ campaign: Campaign; action: CampaignAction } | null>(null)

  const fetchCampaigns = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('campaigns')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setCampaigns(data ?? [])
    setLoading(false)
  }, [user])

  useEffect(() => { fetchCampaigns() }, [fetchCampaigns])

  // Lazily load pending recommendations for the business once campaigns are
  // known, so the RecommendationBadge column has something to show without
  // an N+1 request per row.
  useEffect(() => {
    if (!user || campaigns.length === 0) return
    setRecommendationsLoading(true)
    listPendingRecommendations(user.id)
      .then(list => {
        const byCampaign: Record<string, Recommendation | null> = {}
        for (const camp of campaigns) {
          byCampaign[camp.id] = list.find(r => r.campaign_id === camp.id) ?? null
        }
        setRecommendations(byCampaign)
      })
      .catch(() => {
        // No recommendations infra reachable yet — badges just stay hidden,
        // this isn't fatal to the page.
        setRecommendations({})
      })
      .finally(() => setRecommendationsLoading(false))
  }, [user, campaigns])

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter(camp => {
      if (filters.status !== 'all' && camp.status !== filters.status) return false
      if (filters.search.trim() && !camp.name.toLowerCase().includes(filters.search.trim().toLowerCase())) return false
      if (filters.dateRange !== 'all') {
        const days = RANGE_DAYS[filters.dateRange]
        const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
        if (new Date(camp.created_at).getTime() < cutoff) return false
      }
      return true
    })
  }, [campaigns, filters])

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = 'Campaign name is required'
    if (!form.objective) e.objective = 'Please select an objective'
    if (!form.daily_budget) e.daily_budget = 'Daily budget is required'
    else if (Number(form.daily_budget) < 500) e.daily_budget = 'Minimum daily budget is ₹500'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate() || !user) return
    setSubmitting(true)
    const { error } = await supabase.from('campaigns').insert({
      user_id: user.id,
      name: form.name.trim(),
      objective: form.objective,
      daily_budget: Number(form.daily_budget),
      notes: form.notes.trim(),
      status: 'pending_review',
    })
    setSubmitting(false)
    if (!error) {
      setShowModal(false)
      setForm({ name: '', objective: '', daily_budget: '', notes: '' })
      fetchCampaigns()
    }
  }

  const handleToggle = async (camp: Campaign) => {
    setTogglingId(camp.id)
    setToggleError(null)
    try {
      const updated = await toggleCampaign(camp.id)
      setCampaigns(prev => prev.map(c => c.id === camp.id ? { ...c, status: updated.status } : c))
    } catch (err) {
      setToggleError(err instanceof Error ? err.message : 'Could not update campaign status')
    } finally {
      setTogglingId(null)
    }
  }

  const handleAction = (campaign: Campaign, action: CampaignAction) => {
    setActiveModal({ campaign, action })
  }

  const inputCls = (err?: string) => cn(
    'w-full bg-dark-800 border rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all',
    err ? 'border-red-500/50' : 'border-white/10 hover:border-white/20'
  )

  return (
    <>
      <Helmet><title>Campaigns — LeadPilot</title></Helmet>

      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Campaigns</h1>
            <p className="text-slate-400 text-sm mt-1">Your Meta Ads campaigns managed by our team</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-all"
          >
            <Plus size={15} />
            New campaign
          </button>
        </div>

        {toggleError && (
          <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">
            {toggleError}
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-20 glass rounded-2xl animate-pulse" />)}
          </div>
        ) : campaigns.length === 0 ? (
          <div className="glass rounded-2xl p-16 text-center">
            <Megaphone size={36} className="text-slate-700 mx-auto mb-3" />
            <p className="text-white font-semibold mb-1">No campaigns yet</p>
            <p className="text-slate-500 text-sm mb-6">Create your first campaign brief and our team will get it live within 48 hours.</p>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-all"
            >
              <Plus size={15} /> Create first campaign
            </button>
          </div>
        ) : (
          <>
            <CampaignFilters filters={filters} onChange={setFilters} resultCount={filteredCampaigns.length} />

            {filteredCampaigns.length === 0 ? (
              <div className="glass rounded-2xl p-12 text-center">
                <p className="text-slate-400 text-sm">No campaigns match these filters</p>
              </div>
            ) : (
              <>
                <CampaignTable
                  campaigns={filteredCampaigns}
                  recommendationsByCampaign={recommendations}
                  recommendationsLoading={recommendationsLoading}
                  togglingId={togglingId}
                  onToggle={handleToggle}
                  onAction={handleAction}
                />
                <CampaignMobileList
                  campaigns={filteredCampaigns}
                  recommendationsByCampaign={recommendations}
                  recommendationsLoading={recommendationsLoading}
                  togglingId={togglingId}
                  onToggle={handleToggle}
                  onAction={handleAction}
                />
              </>
            )}

            {/* Inline metrics for the most recent campaign — kept from the
               previous single-page layout as a quick-glance default. */}
            {filteredCampaigns[0]?.meta_campaign_id && (
              <div className="glass rounded-2xl p-5">
                <p className="text-slate-500 text-xs font-medium mb-3 uppercase tracking-wide">
                  Quick glance — {filteredCampaigns[0].name}
                </p>
                <CampaignInsights campaignId={filteredCampaigns[0].id} metaCampaignId={filteredCampaigns[0].meta_campaign_id} />
              </div>
            )}
          </>
        )}
      </div>

      {/* New campaign modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative glass rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white">New campaign brief</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Campaign name *</label>
                <input
                  type="text"
                  placeholder="e.g. Diwali Sale Leads"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className={inputCls(errors.name)}
                />
                {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Campaign objective *</label>
                <select
                  value={form.objective}
                  onChange={e => setForm(f => ({ ...f, objective: e.target.value }))}
                  className={cn(inputCls(errors.objective), 'cursor-pointer')}
                >
                  <option value="">Select objective</option>
                  {OBJECTIVES.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
                {errors.objective && <p className="mt-1 text-xs text-red-400">{errors.objective}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Daily budget (₹) *</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm">₹</span>
                  <input
                    type="number"
                    placeholder="1000"
                    min="500"
                    value={form.daily_budget}
                    onChange={e => setForm(f => ({ ...f, daily_budget: e.target.value }))}
                    className={cn(inputCls(errors.daily_budget), 'pl-8')}
                  />
                </div>
                {errors.daily_budget
                  ? <p className="mt-1 text-xs text-red-400">{errors.daily_budget}</p>
                  : <p className="mt-1 text-xs text-slate-600">Minimum ₹500/day</p>
                }
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Additional notes</label>
                <textarea
                  rows={3}
                  placeholder="Target audience, product details, special instructions…"
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className={cn(inputCls(), 'resize-none')}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 border border-white/10 hover:border-white/20 text-slate-300 text-sm font-medium py-3 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-brand-600 hover:bg-brand-500 disabled:opacity-60 text-white text-sm font-medium py-3 rounded-xl transition-all"
                >
                  {submitting ? 'Submitting…' : 'Submit brief →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3-dot menu action modals */}
      {activeModal?.action === 'edit_with_ai' && (
        <EditWithAIModal campaign={activeModal.campaign} onClose={() => setActiveModal(null)} />
      )}
      {activeModal?.action === 'all_metrics' && (
        <AllMetricsModal campaign={activeModal.campaign} onClose={() => setActiveModal(null)} />
      )}
      {activeModal?.action === 'recommendation' && (
        <RecommendationModal
          campaign={activeModal.campaign}
          existing={recommendations[activeModal.campaign.id]}
          onClose={() => setActiveModal(null)}
        />
      )}
      {activeModal?.action === 'performance' && (
        <PerformanceModal campaign={activeModal.campaign} onClose={() => setActiveModal(null)} />
      )}
      {activeModal?.action === 'preview_ad' && (
        <PreviewAdModal campaign={activeModal.campaign} onClose={() => setActiveModal(null)} />
      )}
    </>
  )
}
