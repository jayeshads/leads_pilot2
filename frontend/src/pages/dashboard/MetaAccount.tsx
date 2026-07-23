import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useSearchParams } from 'react-router-dom'
import { Shield, CheckCircle2, RefreshCw, Facebook, Radio, HelpCircle, AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthContext'
import { cn } from '@/lib/utils'

interface MetaAccount {
  id: string
  account_id: string
  account_name: string
  status: 'active' | 'paused' | 'disconnected'
  created_at: string
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  token_exchange_failed: 'Facebook did not return a valid access token. Please try connecting again.',
  no_ad_accounts_found: 'No Meta Ad Accounts were found on that Facebook login. Add an ad account to your Meta Business Manager and try again.',
}

export default function MetaAccount() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [account, setAccount] = useState<MetaAccount | null>(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [step, setStep] = useState(1) // 1: Connect button, 3: Success connected
  const [oauthError, setOauthError] = useState<string | null>(null)

  const fetchAccount = async () => {
    if (!user) return
    const { data } = await supabase
      .from('meta_accounts')
      .select('*')
      .eq('assigned_user_id', user.id)
      .maybeSingle()

    if (data) {
      setAccount(data as MetaAccount)
      setStep(3)
    } else {
      setAccount(null)
      setStep(1)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (!user) return
    fetchAccount()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  // Meta's OAuth flow ends with the backend (GET /meta/oauth/callback)
  // redirecting the browser back here with either ?connected=true or
  // ?error=... in the URL — this used to be completely ignored, so the
  // page never reflected whether the real connection actually succeeded.
  useEffect(() => {
    if (!user) return
    const connected = searchParams.get('connected')
    const error = searchParams.get('error')

    if (connected === 'true') {
      fetchAccount()
      setSearchParams({}, { replace: true })
    } else if (error) {
      setOauthError(OAUTH_ERROR_MESSAGES[error] ?? `Meta connection failed: ${error.replace(/_/g, ' ')}`)
      setSearchParams({}, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, searchParams])

  const handleConnectFB = async () => {
    if (!user) return
    setConnecting(true)
    setOauthError(null)
    try {
      const session = (await supabase.auth.getSession()).data.session
      const token = session?.access_token
      if (!token) {
        setOauthError('Your session has expired. Please sign in again to connect Meta.')
        setConnecting(false)
        return
      }

      const resp = await fetch(`${API_BASE_URL}/api/meta/oauth/url?business_id=${user.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!resp.ok) {
        throw new Error(`Server returned ${resp.status}`)
      }
      const data = await resp.json()
      if (!data.oauth_url) {
        throw new Error('No oauth_url returned by the server')
      }
      // Full-page redirect into Meta's real OAuth dialog. Meta redirects
      // back to our backend, which redirects back here — the connecting
      // spinner naturally ends when the page navigates away.
      window.location.href = data.oauth_url
    } catch (e) {
      console.warn('Meta OAuth error:', e)
      setOauthError('Could not reach the Meta connection service. Please check your connection and try again.')
      setConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    if (!account || !user) return
    setConnecting(true)
    setOauthError(null)
    try {
      const session = (await supabase.auth.getSession()).data.session
      const token = session?.access_token
      if (!token) {
        setOauthError('Your session has expired. Please sign in again.')
        return
      }
      // Regular users only have SELECT rights on meta_accounts (RLS) —
      // writes/deletes are admin-only — so disconnect has to go through the
      // backend, which talks to Postgres directly and isn't subject to
      // that policy, after verifying the caller owns this business.
      const resp = await fetch(`${API_BASE_URL}/api/meta/account?business_id=${user.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!resp.ok) {
        throw new Error(`Server returned ${resp.status}`)
      }
      setAccount(null)
      setStep(1)
    } catch (e) {
      console.warn('Meta disconnect error:', e)
      setOauthError('Could not disconnect the account right now. Please try again.')
    } finally {
      setConnecting(false)
    }
  }

  const STATUS_COLOR = {
    active: 'text-green-400 border-green-500/30 bg-green-500/10',
    paused: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
    disconnected: 'text-red-400 border-red-500/30 bg-red-500/10'
  }

  return (
    <>
      <Helmet><title>Meta Account Integration — LeadPilot</title></Helmet>

      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Meta Integration</h1>
          <p className="text-slate-400 text-sm mt-1">Connect your Facebook Business manager and ad accounts to let LeadPilot launch campaigns.</p>
        </div>

        {oauthError && (
          <div className="glass rounded-2xl p-4 border border-red-500/20 bg-red-500/5 flex items-start gap-3 max-w-xl mx-auto">
            <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
            <p className="text-sm text-red-300">{oauthError}</p>
          </div>
        )}

        {loading ? (
          <div className="h-64 glass rounded-2xl animate-pulse" />
        ) : step === 1 ? (
          /* Step 1: Request connection */
          <div className="glass rounded-2xl p-8 text-center space-y-6 max-w-xl mx-auto border border-white/5 shadow-2xl relative overflow-hidden">
            <div className="absolute -right-20 -top-20 w-48 h-48 bg-brand-600/10 rounded-full blur-3xl" />
            <div className="absolute -left-20 -bottom-20 w-48 h-48 bg-violet-600/10 rounded-full blur-3xl" />

            <div className="w-16 h-16 mx-auto bg-brand-600/10 rounded-2xl flex items-center justify-center border border-brand-500/20">
              <Facebook size={32} className="text-brand-400" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white">Connect Meta Business Account</h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                Connect your account to grant LeadPilot permission to manage Meta Ads campaigns, configure tracking pixels, create custom audiences, and fetch live leads.
              </p>
            </div>

            <div className="pt-2">
              <button
                onClick={handleConnectFB}
                disabled={connecting}
                className="w-full py-3.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-medium rounded-xl flex items-center justify-center gap-2.5 shadow-lg shadow-brand-600/20 hover:scale-[1.01] active:scale-[0.99] transition-all"
              >
                {connecting ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" />
                    Opening Meta OAuth Secure Portal...
                  </>
                ) : (
                  <>
                    <Facebook size={18} fill="white" />
                    Sign in with Facebook (OAuth)
                  </>
                )}
              </button>
            </div>

            <div className="pt-4 border-t border-white/5 grid grid-cols-3 gap-4 text-left text-xs text-slate-500">
              <div>
                <span className="font-semibold text-slate-300 block mb-1">Ad Management</span>
                Write & adjust ad creative, budgets, & schedules
              </div>
              <div>
                <span className="font-semibold text-slate-300 block mb-1">Lead Retrieval</span>
                Securely sync leads instantly to your wallet dashboard
              </div>
              <div>
                <span className="font-semibold text-slate-300 block mb-1">Pixel Telemetry</span>
                Create & configure conversion pixels on landing templates
              </div>
            </div>
          </div>
        ) : (
          /* Step 3: Connected State */
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              <div className="glass rounded-2xl p-6 border border-white/5 shadow-2xl relative overflow-hidden">
                <div className="absolute right-0 top-0 w-24 h-24 bg-green-500/5 rounded-full blur-2xl" />
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-green-500/10 rounded-2xl flex items-center justify-center border border-green-500/20 text-green-400">
                    <CheckCircle2 size={24} />
                  </div>
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2.5">
                      <h2 className="text-lg font-bold text-white truncate">{account?.account_name}</h2>
                      <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium uppercase', STATUS_COLOR[account?.status ?? 'active'])}>
                        {account?.status}
                      </span>
                    </div>
                    <p className="text-slate-400 text-xs font-mono">ID: act_{account?.account_id}</p>
                    <p className="text-slate-500 text-xs mt-3">Connected on {new Date(account?.created_at ?? '').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  </div>
                </div>

                <div className="mt-6 pt-5 border-t border-white/5 flex gap-3">
                  <button
                    onClick={handleDisconnect}
                    disabled={connecting}
                    className="px-4 py-2 border border-red-500/20 hover:bg-red-500/10 text-red-400 text-xs font-medium rounded-lg transition-all"
                  >
                    Disconnect account
                  </button>
                  <button
                    onClick={handleConnectFB}
                    disabled={connecting}
                    className="px-4 py-2 border border-white/10 hover:border-white/20 text-slate-300 text-xs font-medium rounded-lg transition-all disabled:opacity-50"
                  >
                    Reconnect via Facebook
                  </button>
                </div>
              </div>

              {/* Status parameters */}
              <div className="glass rounded-2xl p-6 border border-white/5 space-y-4">
                <h3 className="font-bold text-white text-sm">Telemetry & Status Parameters</h3>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Connection status', value: account?.status === 'active' ? 'Active' : (account?.status ?? 'Unknown'), icon: Radio, state: account?.status === 'active' ? 'text-green-400' : 'text-amber-400' },
                    { label: 'Permissions scope', value: 'ads_management, ads_read', icon: Shield, state: 'text-slate-300' },
                  ].map(p => (
                    <div key={p.label} className="bg-dark-800/40 rounded-xl p-3.5 flex items-center gap-3">
                      <p.icon size={16} className="text-slate-500" />
                      <div>
                        <span className="text-slate-500 text-[10px] uppercase font-semibold block">{p.label}</span>
                        <span className={cn('text-xs font-medium truncate block mt-0.5', p.state)}>{p.value}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick tips panel */}
            <div className="glass rounded-2xl p-6 border border-white/5 space-y-4 h-fit">
              <div className="flex items-center gap-2">
                <HelpCircle size={16} className="text-brand-400" />
                <h3 className="font-bold text-white text-sm">AI Management Active</h3>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed">
                LeadPilot is now linked to your Meta account. When you discuss strategy changes or launch campaigns with the AI, the AI will:
              </p>
              <ul className="space-y-2 text-xs text-slate-500 list-disc list-inside">
                <li>Create and structure campaigns</li>
                <li>Setup target audiences & bidding</li>
                <li>Generate and link visual creatives</li>
                <li>Establish conversion telemetry</li>
                <li>Publish campaigns for review</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
