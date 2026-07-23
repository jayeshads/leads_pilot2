import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import {
  Search, Shield, ShieldOff, ChevronDown, ChevronUp, Plus, X, Ban, CheckCircle2,
  Snowflake, Flame, KeyRound, Wallet, Facebook, Image as ImageIcon, Globe, Info,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { adminGet, adminSend, AdminApiError } from '@/lib/adminApi'
import type { Profile } from '@/lib/types'

interface UserWithMeta extends Profile {
  campaign_count: number
  lead_count: number
  wallet_balance: number
  metrics_visible: string[]
}

interface UserDetail {
  profile: Profile
  campaigns: { id: string; name: string; status: string; daily_budget: number; created_at: string }[]
  wallet_balance: number
  meta_account: { id: string; account_id: string; account_name: string; status: string } | null
  creatives: { total: number; approved: number; archived: number }
  landing_pages: { id: string; name: string; url: string | null; status: string }[]
}

interface Lead {
  id: string
  name: string
  phone: string
  email: string | null
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost'
  campaign_name: string
  created_at: string
}

const CAMPAIGN_STATUS_COLOR: Record<string, string> = {
  pending_review: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
  active: 'text-green-400 border-green-500/30 bg-green-500/10',
  paused: 'text-slate-400 border-white/15 bg-white/5',
  completed: 'text-brand-400 border-brand-500/30 bg-brand-500/10',
  rejected: 'text-red-400 border-red-500/30 bg-red-500/10',
}

const LEAD_STATUS_COLOR: Record<string, string> = {
  new: 'text-green-400 border-green-500/30 bg-green-500/10',
  contacted: 'text-brand-400 border-brand-500/30 bg-brand-500/10',
  qualified: 'text-violet-400 border-violet-500/30 bg-violet-500/10',
  converted: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
  lost: 'text-red-400 border-red-500/30 bg-red-500/10',
}

interface FundRequest {
  id: string
  amount: number
  status: 'pending' | 'confirmed' | 'failed'
  note: string | null
  utr_number?: string | null
  created_at: string
}

const ALL_METRICS = ['spend', 'impressions', 'clicks', 'leads', 'cpl', 'ctr']

export default function AdminUsers() {
  const [users, setUsers] = useState<UserWithMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [detail, setDetail] = useState<UserDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [fundRequests, setFundRequests] = useState<FundRequest[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [campaignUpdating, setCampaignUpdating] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createForm, setCreateForm] = useState({ full_name: '', email: '', phone: '', password: '', role: 'client' as 'client' | 'admin' })
  const [createError, setCreateError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const [resetPasswordResult, setResetPasswordResult] = useState<{ email: string; password: string } | null>(null)

  const fetchUsers = async () => {
    setError(null)
    try {
      const [rows, { data: metricSettings }] = await Promise.all([
        adminGet<Omit<UserWithMeta, 'metrics_visible'>[]>('/users'),
        supabase.from('user_metric_visibility').select('*'),
      ])

      const metricMap: Record<string, string[]> = {}
      metricSettings?.forEach((m: { user_id: string; metric: string }) => {
        if (!metricMap[m.user_id]) metricMap[m.user_id] = []
        metricMap[m.user_id].push(m.metric)
      })

      setUsers(rows.map(r => ({ ...r, metrics_visible: metricMap[r.id] ?? ALL_METRICS })))
    } catch (e) {
      setError(e instanceof AdminApiError ? e.message : 'Failed to load users.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchUsers() }, [])

  const toggleExpand = async (userId: string) => {
    if (expanded === userId) { setExpanded(null); setDetail(null); return }
    setExpanded(userId)
    setDetail(null)
    setFundRequests([])
    setLeads([])
    setDetailLoading(true)
    try {
      const [d, { data: reqs }, { data: leadRows }] = await Promise.all([
        adminGet<UserDetail>(`/users/${userId}`),
        supabase.from('transactions').select('*').eq('user_id', userId).eq('type', 'add_funds').order('created_at', { ascending: false }),
        supabase.from('leads').select('*, campaigns!inner(name, user_id)').eq('campaigns.user_id', userId).order('created_at', { ascending: false }).limit(100),
      ])
      setDetail(d)
      setFundRequests((reqs as unknown as FundRequest[]) || [])
      setLeads(((leadRows ?? []) as any[]).map(l => ({
        id: l.id, name: l.name, phone: l.phone, email: l.email, status: l.status,
        created_at: l.created_at, campaign_name: l.campaigns?.name ?? '—',
      })))
    } catch (e) {
      setError(e instanceof AdminApiError ? e.message : 'Failed to load user detail.')
    } finally {
      setDetailLoading(false)
    }
  }

  const updateCampaignStatus = async (campaignId: string, status: string) => {
    setCampaignUpdating(campaignId)
    await supabase.from('campaigns').update({ status }).eq('id', campaignId)
    if (expanded) {
      const d = await adminGet<UserDetail>(`/users/${expanded}`)
      setDetail(d)
    }
    setCampaignUpdating(null)
  }

  const handleUpdateFundStatus = async (id: string, newStatus: 'confirmed' | 'failed') => {
    const { error } = await supabase.from('transactions').update({ status: newStatus }).eq('id', id)
    if (!error) {
      setFundRequests(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r))
      // Option to refetch wallet balance if confirmed? Just refetch detail.
      if (newStatus === 'confirmed' && expanded) {
        const d = await adminGet<UserDetail>(`/users/${expanded}`)
        setDetail(d)
      }
    }
  }

  const toggleRole = async (user: UserWithMeta) => {
    setBusy(user.id)
    const newRole = user.role === 'admin' ? 'client' : 'admin'
    await supabase.from('profiles').update({ role: newRole }).eq('id', user.id)
    await fetchUsers()
    setBusy(null)
  }

  const toggleStatus = async (user: UserWithMeta) => {
    setBusy(user.id)
    const newStatus = user.status === 'blocked' ? 'active' : 'blocked'
    try {
      await adminSend(`/users/${user.id}/status`, 'PUT', { status: newStatus })
      await fetchUsers()
    } catch (e) {
      setError(e instanceof AdminApiError ? e.message : 'Failed to update user status.')
    } finally {
      setBusy(null)
    }
  }

  const toggleFundsFrozen = async (user: UserWithMeta) => {
    setBusy(user.id)
    try {
      await adminSend(`/users/${user.id}/funds-frozen`, 'PUT', { frozen: !user.funds_frozen })
      await fetchUsers()
    } catch (e) {
      setError(e instanceof AdminApiError ? e.message : 'Failed to update funds status.')
    } finally {
      setBusy(null)
    }
  }

  const resetPassword = async (user: UserWithMeta) => {
    if (!confirm(`Issue a new password for ${user.email}? Their current password will stop working immediately.`)) return
    setBusy(user.id)
    try {
      const result = await adminSend<{ email: string; new_password: string }>(`/users/${user.id}/reset-password`, 'POST')
      setResetPasswordResult({ email: result.email, password: result.new_password })
    } catch (e) {
      setError(e instanceof AdminApiError ? e.message : 'Failed to reset password.')
    } finally {
      setBusy(null)
    }
  }

  const toggleMetric = async (userId: string, metric: string, currentVisible: string[]) => {
    const isOn = currentVisible.includes(metric)
    if (isOn) {
      await supabase.from('user_metric_visibility').delete().eq('user_id', userId).eq('metric', metric)
    } else {
      await supabase.from('user_metric_visibility').upsert({ user_id: userId, metric })
    }
    await fetchUsers()
  }

  const handleCreate = async () => {
    setCreateError(null)
    if (!createForm.full_name.trim() || !createForm.email.trim() || !createForm.password) {
      setCreateError('Full name, email, and password are required.')
      return
    }
    if (createForm.password.length < 8) {
      setCreateError('Password must be at least 8 characters.')
      return
    }
    setCreating(true)
    try {
      await adminSend('/users', 'POST', createForm)
      setShowCreateModal(false)
      setCreateForm({ full_name: '', email: '', phone: '', password: '', role: 'client' })
      await fetchUsers()
    } catch (e) {
      setCreateError(e instanceof AdminApiError ? e.message : 'Failed to create account.')
    } finally {
      setCreating(false)
    }
  }

  const filtered = users.filter(u =>
    !search ||
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.phone.includes(search)
  )

  return (
    <>
      <Helmet><title>Users — Admin LeadPilot</title></Helmet>

      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Users</h1>
            <p className="text-slate-400 text-sm mt-1">{users.length} total registered users</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all shadow-lg flex-shrink-0"
          >
            <Plus size={15} /> Create New User
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-300 text-sm rounded-xl px-4 py-3">{error}</div>
        )}

        {/* Search */}
        <div className="relative max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search by name, email or phone…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-dark-800 border border-white/10 hover:border-white/20 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
          />
        </div>

        {/* Users list */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-16 glass rounded-xl animate-pulse" />)}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(user => (
              <div key={user.id} className="glass rounded-xl overflow-hidden">
                {/* User row */}
                <div className="flex flex-wrap items-center gap-4 px-5 py-4">
                  <div className="w-9 h-9 rounded-full bg-brand-700/40 flex items-center justify-center text-brand-200 text-xs font-bold flex-shrink-0">
                    {user.full_name.charAt(0).toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-white font-medium text-sm">{user.full_name}</p>
                      {user.role === 'admin' && (
                        <span className="text-xs text-violet-400 border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 rounded-full">Admin</span>
                      )}
                      {user.status === 'blocked' && (
                        <span className="text-xs text-red-400 border border-red-500/30 bg-red-500/10 px-2 py-0.5 rounded-full">Blocked</span>
                      )}
                      {user.funds_frozen && (
                        <span className="text-xs text-cyan-400 border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 rounded-full">Funds frozen</span>
                      )}
                    </div>
                    <p className="text-slate-500 text-xs">{user.email} · {user.phone}</p>
                  </div>

                  <div className="hidden sm:flex items-center gap-4 text-xs text-slate-500 flex-shrink-0">
                    <span>{user.campaign_count} campaigns</span>
                    <span>{user.lead_count} leads</span>
                    <span>₹{user.wallet_balance.toLocaleString('en-IN')}</span>
                    <span>{new Date(user.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap">
                    <button
                      onClick={() => toggleStatus(user)}
                      disabled={busy === user.id}
                      title={user.status === 'blocked' ? 'Unblock this user' : 'Block this user'}
                      className={cn(
                        'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all disabled:opacity-50',
                        user.status === 'blocked'
                          ? 'text-green-400 border border-green-500/30 hover:bg-green-500/10'
                          : 'text-red-400 border border-red-500/30 hover:bg-red-500/10'
                      )}
                    >
                      {user.status === 'blocked' ? <><CheckCircle2 size={12} /> Unblock</> : <><Ban size={12} /> Block</>}
                    </button>
                    <button
                      onClick={() => toggleFundsFrozen(user)}
                      disabled={busy === user.id}
                      title={user.funds_frozen ? 'Unfreeze funds' : 'Freeze funds'}
                      className={cn(
                        'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all disabled:opacity-50',
                        user.funds_frozen
                          ? 'text-amber-400 border border-amber-500/30 hover:bg-amber-500/10'
                          : 'text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/10'
                      )}
                    >
                      {user.funds_frozen ? <><Flame size={12} /> Unfreeze</> : <><Snowflake size={12} /> Freeze</>}
                    </button>
                    <button
                      onClick={() => toggleRole(user)}
                      disabled={busy === user.id}
                      className={cn(
                        'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all disabled:opacity-50',
                        user.role === 'admin'
                          ? 'text-red-400 border border-red-500/30 hover:bg-red-500/10'
                          : 'text-violet-400 border border-violet-500/30 hover:bg-violet-500/10'
                      )}
                    >
                      {user.role === 'admin' ? <><ShieldOff size={12} /> Revoke admin</> : <><Shield size={12} /> Make admin</>}
                    </button>
                    <button
                      onClick={() => resetPassword(user)}
                      disabled={busy === user.id}
                      title="Reset password"
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg text-slate-400 border border-white/10 hover:bg-white/5 transition-all disabled:opacity-50"
                    >
                      <KeyRound size={12} />
                    </button>
                    <button
                      onClick={() => toggleExpand(user.id)}
                      className="text-slate-500 hover:text-white transition-colors p-1.5"
                    >
                      {expanded === user.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {/* Expanded: full profile + metric visibility */}
                {expanded === user.id && (
                  <div className="border-t border-white/5 px-5 py-4 bg-dark-800/30 space-y-5">
                    {detailLoading ? (
                      <div className="h-24 animate-pulse bg-white/5 rounded-lg" />
                    ) : detail ? (
                      <>
                        <div className="grid sm:grid-cols-3 gap-3">
                          <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3">
                            <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                              <Wallet size={13} /> Wallet balance
                            </div>
                            <p className="text-white font-semibold text-sm">₹{detail.wallet_balance.toLocaleString('en-IN')}</p>
                          </div>
                          <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3">
                            <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                              <Facebook size={13} /> Meta ad account
                            </div>
                            <p className="text-white font-semibold text-sm">
                              {detail.meta_account ? `${detail.meta_account.account_name} (${detail.meta_account.status})` : 'Not connected'}
                            </p>
                          </div>
                          <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3">
                            <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                              <ImageIcon size={13} /> Creatives
                            </div>
                            <p className="text-white font-semibold text-sm">
                              {detail.creatives.total} total · {detail.creatives.approved} approved · {detail.creatives.archived} archived
                            </p>
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Campaigns ({detail.campaigns.length})</p>
                          {detail.campaigns.length === 0 ? (
                            <p className="text-xs text-slate-600">No campaigns yet.</p>
                          ) : (
                            <div className="space-y-1.5">
                              {detail.campaigns.map(c => {
                                const cUpdating = campaignUpdating === c.id
                                return (
                                  <div key={c.id} className="flex flex-col sm:flex-row sm:items-center justify-between text-xs bg-white/[0.02] rounded-lg px-3 py-2 gap-2">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-slate-300">{c.name}</span>
                                      <span className={cn('px-2 py-0.5 rounded-full border text-[10px] uppercase font-bold tracking-wider', CAMPAIGN_STATUS_COLOR[c.status] ?? 'text-slate-400 border-white/15 bg-white/5')}>
                                        {c.status.replace('_', ' ')}
                                      </span>
                                      <span className="text-slate-500">₹{Number(c.daily_budget).toLocaleString('en-IN')}/day</span>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      {c.status === 'pending_review' && (
                                        <>
                                          <button onClick={() => updateCampaignStatus(c.id, 'active')} disabled={cUpdating} className="px-2 py-1 text-green-400 border border-green-500/30 hover:bg-green-500/10 rounded transition-colors disabled:opacity-50">Approve</button>
                                          <button onClick={() => updateCampaignStatus(c.id, 'rejected')} disabled={cUpdating} className="px-2 py-1 text-red-400 border border-red-500/30 hover:bg-red-500/10 rounded transition-colors disabled:opacity-50">Reject</button>
                                        </>
                                      )}
                                      {c.status === 'active' && (
                                        <button onClick={() => updateCampaignStatus(c.id, 'paused')} disabled={cUpdating} className="px-2 py-1 text-amber-400 border border-amber-500/30 hover:bg-amber-500/10 rounded transition-colors disabled:opacity-50">Pause</button>
                                      )}
                                      {c.status === 'paused' && (
                                        <button onClick={() => updateCampaignStatus(c.id, 'active')} disabled={cUpdating} className="px-2 py-1 text-green-400 border border-green-500/30 hover:bg-green-500/10 rounded transition-colors disabled:opacity-50">Resume</button>
                                      )}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>

                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Leads ({leads.length})</p>
                          {leads.length === 0 ? (
                            <p className="text-xs text-slate-600">No leads yet.</p>
                          ) : (
                            <div className="space-y-1.5 max-h-64 overflow-y-auto">
                              {leads.map(l => (
                                <div key={l.id} className="flex flex-col sm:flex-row sm:items-center justify-between text-xs bg-white/[0.02] rounded-lg px-3 py-2 gap-2">
                                  <div>
                                    <span className="text-slate-300 font-medium mr-2">{l.name}</span>
                                    <span className="text-slate-500">{l.phone}{l.email ? ` · ${l.email}` : ''} · {l.campaign_name}</span>
                                  </div>
                                  <span className={cn('px-2 py-0.5 rounded-full border text-[10px] uppercase font-bold tracking-wider flex-shrink-0', LEAD_STATUS_COLOR[l.status])}>
                                    {l.status}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <Globe size={12} /> Landing pages ({detail.landing_pages.length})
                          </p>
                          {detail.landing_pages.length === 0 ? (
                            <p className="text-xs text-slate-600">No landing pages yet.</p>
                          ) : (
                            <div className="space-y-1.5">
                              {detail.landing_pages.map(lp => (
                                <div key={lp.id} className="flex items-center justify-between text-xs bg-white/[0.02] rounded-lg px-3 py-2">
                                  <span className="text-slate-300">{lp.name}</span>
                                  <span className="text-slate-500">{lp.status}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Fund Requests in User Profile */}
                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <Wallet size={12} /> Fund Requests ({fundRequests.length})
                          </p>
                          {fundRequests.length === 0 ? (
                            <p className="text-xs text-slate-600">No fund requests yet.</p>
                          ) : (
                            <div className="space-y-1.5">
                              {fundRequests.map(req => (
                                <div key={req.id} className="flex flex-col sm:flex-row sm:items-center justify-between text-xs bg-white/[0.02] rounded-lg px-3 py-2 gap-2">
                                  <div>
                                    <span className="text-slate-300 font-semibold mr-2">₹{req.amount.toLocaleString('en-IN')}</span>
                                    <span className={cn(
                                      'px-2 py-0.5 rounded-full border text-[10px] uppercase font-bold tracking-wider',
                                      req.status === 'pending' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                                      req.status === 'confirmed' ? 'bg-green-500/10 border-green-500/20 text-green-400' :
                                      'bg-red-500/10 border-red-500/20 text-red-400'
                                    )}>
                                      {req.status}
                                    </span>
                                    {req.utr_number && (
                                      <span className="block mt-1 text-[10px] text-cyan-400 font-mono">UTR: {req.utr_number}</span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {req.status === 'pending' && (
                                      <>
                                        <button onClick={() => handleUpdateFundStatus(req.id, 'failed')} className="px-2 py-1 text-red-400 hover:bg-red-500/10 rounded transition-colors">Decline</button>
                                        <button onClick={() => handleUpdateFundStatus(req.id, 'confirmed')} className="px-2 py-1 bg-violet-600 hover:bg-violet-500 text-white rounded transition-colors">Approve</button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3 flex items-start gap-2.5">
                          <Info size={13} className="text-slate-500 flex-shrink-0 mt-0.5" />
                          <p className="text-[11px] text-slate-500 leading-relaxed">
                            Passwords are never shown here — Supabase stores only a salted hash and never exposes it,
                            admin panel included. Use the key icon above to issue this user a new one-time password instead.
                          </p>
                        </div>
                      </>
                    ) : null}

                    <div className="pt-2 border-t border-white/5">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Metric visibility for this user</p>
                      <div className="flex flex-wrap gap-2">
                        {ALL_METRICS.map(metric => {
                          const isOn = user.metrics_visible.includes(metric)
                          return (
                            <button
                              key={metric}
                              onClick={() => toggleMetric(user.id, metric, user.metrics_visible)}
                              className={cn(
                                'text-xs px-3 py-1.5 rounded-lg border transition-all capitalize',
                                isOn
                                  ? 'bg-brand-600/20 border-brand-500/40 text-brand-300'
                                  : 'bg-white/3 border-white/10 text-slate-600 hover:text-slate-400'
                              )}
                            >
                              {metric.toUpperCase()}
                            </button>
                          )
                        })}
                      </div>
                      <p className="text-xs text-slate-600 mt-2">Toggle which metrics this user can see in their campaign reports</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => !creating && setShowCreateModal(false)} />
          <div className="relative glass rounded-3xl p-6 w-full max-w-md border border-white/10 shadow-2xl">
            <div className="flex items-center justify-between mb-6 pb-3 border-b border-white/5">
              <h2 className="text-base font-bold text-white">Create New User</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white border border-white/10 hover:border-white/20 p-1 rounded-xl"><X size={16} /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Full name *</label>
                <input
                  type="text"
                  value={createForm.full_name}
                  onChange={e => setCreateForm(f => ({ ...f, full_name: e.target.value }))}
                  className="w-full bg-dark-800 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Email *</label>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full bg-dark-800 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Phone</label>
                <input
                  type="text"
                  value={createForm.phone}
                  onChange={e => setCreateForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full bg-dark-800 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Password *</label>
                <input
                  type="text"
                  value={createForm.password}
                  onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="At least 8 characters"
                  className="w-full bg-dark-800 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Account type *</label>
                <select
                  value={createForm.role}
                  onChange={e => setCreateForm(f => ({ ...f, role: e.target.value as 'client' | 'admin' }))}
                  className="w-full bg-dark-800 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none cursor-pointer"
                >
                  <option value="client">Client</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {createError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-300 text-xs rounded-xl px-3 py-2.5">{createError}</div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowCreateModal(false)}
                  disabled={creating}
                  className="flex-1 py-3 border border-white/10 hover:border-white/20 text-slate-300 text-xs font-semibold rounded-xl disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={creating}
                  className="flex-1 py-3 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl"
                >
                  {creating ? 'Creating…' : 'Create account'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reset password result modal */}
      {resetPasswordResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setResetPasswordResult(null)} />
          <div className="relative glass rounded-3xl p-6 w-full max-w-md border border-white/10 shadow-2xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
              <h2 className="text-base font-bold text-white">New password issued</h2>
              <button onClick={() => setResetPasswordResult(null)} className="text-slate-400 hover:text-white border border-white/10 hover:border-white/20 p-1 rounded-xl"><X size={16} /></button>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Share this with <span className="text-white">{resetPasswordResult.email}</span> through a secure channel.
              It won't be shown again.
            </p>
            <div className="bg-dark-800 border border-white/10 rounded-xl px-4 py-3 font-mono text-sm text-brand-300 select-all break-all">
              {resetPasswordResult.password}
            </div>
            <button
              onClick={() => setResetPasswordResult(null)}
              className="w-full mt-4 py-3 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-xl"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  )
}
