import { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { CheckCircle2, ChevronRight, Facebook, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/AuthContext'
import { getAuthToken } from '@/lib/authToken'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

export default function Connect() {
  const { user } = useAuth()
  const [status, setStatus] = useState<"disconnected" | "connecting" | "selecting" | "connected">("disconnected")
  const [businesses, setBusinesses] = useState<any[]>([])
  const [adAccounts, setAdAccounts] = useState<any[]>([])
  const [pages, setPages] = useState<any[]>([])
  const [selected, setSelected] = useState({ business_id: "", ad_account_id: "", page_id: "" })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const startOAuth = async () => {
    setStatus("connecting")
    try {
      const token = await getAuthToken()
      const res = await fetch(`${API_BASE_URL}/api/meta/oauth/start`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error("Failed to start OAuth")
      const data = await res.json()
      window.location.href = data.oauth_url
    } catch (err: any) {
      setError(err.message || "Failed to start OAuth")
      setStatus("disconnected")
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get("status") === "connected") {
      setStatus("selecting")
      loadAssets()
      
      // Clean up URL
      const url = new URL(window.location.href)
      url.searchParams.delete('status')
      window.history.replaceState({}, '', url)
    }
  }, [])

  const loadAssets = async () => {
    setLoading(true)
    setError(null)
    try {
      const token = await getAuthToken()
      const headers = { Authorization: `Bearer ${token}` }
      
      const [bRes, aRes, pRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/meta/businesses`, { headers }),
        fetch(`${API_BASE_URL}/api/meta/ad-accounts`, { headers }),
        fetch(`${API_BASE_URL}/api/meta/pages`, { headers }),
      ])
      
      if (!bRes.ok || !aRes.ok || !pRes.ok) throw new Error("Failed to fetch assets")
      
      const b = await bRes.json()
      const a = await aRes.json()
      const p = await pRes.json()

      setBusinesses(b)
      setAdAccounts(a)
      setPages(p)
      
      // Auto-select if only 1 option available
      const autoSel = { business_id: "", ad_account_id: "", page_id: "" }
      if (b.length === 1) autoSel.business_id = b[0].id
      if (a.length === 1) autoSel.ad_account_id = a[0].id
      if (p.length === 1) autoSel.page_id = p[0].id
      setSelected(autoSel)
      
    } catch (err: any) {
      setError(err.message || "Failed to load Meta assets")
    } finally {
      setLoading(false)
    }
  }

  // When business changes, fetch ad accounts for that business specifically
  useEffect(() => {
    if (selected.business_id && businesses.length > 0) {
      getAuthToken().then(token => {
        fetch(`${API_BASE_URL}/api/meta/ad-accounts?business_id=${selected.business_id}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(data => setAdAccounts(data))
        .catch(err => console.error(err))
      })
    }
  }, [selected.business_id])

  const saveSelection = async () => {
    if (!selected.business_id || !selected.ad_account_id || !selected.page_id) {
      setError("Please select all three assets")
      return
    }
    
    setLoading(true)
    setError(null)
    try {
      // Find the page token
      const page = pages.find(p => p.id === selected.page_id)
      const token = await getAuthToken()
      const res = await fetch(`${API_BASE_URL}/api/meta/select`, {
        method: "POST",
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...selected,
          page_access_token: page?.access_token
        })
      })
      if (!res.ok) throw new Error("Failed to save selection")
      setStatus("connected")
    } catch (err: any) {
      setError(err.message || "Failed to save selection")
      setLoading(false)
    }
  }

  return (
    <>
      <Helmet><title>Connect Meta — LeadPilot</title></Helmet>
      
      <div className="max-w-2xl mx-auto py-12 px-4 sm:px-6">
        <div className="text-center mb-10">
          <div className="mx-auto h-12 w-12 bg-[#1877F2]/10 rounded-xl flex items-center justify-center mb-4">
            <Facebook className="text-[#1877F2]" size={28} />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Connect Meta Assets</h1>
          <p className="mt-2 text-sm text-gray-500">Link your Facebook Business Manager to publish AI campaigns.</p>
        </div>
        
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3">
            <AlertCircle className="text-red-500 shrink-0" size={18} />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border p-6 sm:p-8">
          
          {status === "disconnected" && (
            <div className="text-center py-6">
              <button 
                onClick={startOAuth}
                className="bg-[#1877F2] hover:bg-[#1877F2]/90 text-white font-medium py-2.5 px-6 rounded-lg transition-colors inline-flex items-center gap-2"
              >
                <Facebook size={18} />
                Connect with Facebook
              </button>
              <p className="mt-4 text-xs text-gray-400">
                You will be redirected to Facebook to grant permissions.
              </p>
            </div>
          )}

          {status === "connecting" && (
            <div className="text-center py-10">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#1877F2] border-r-transparent mb-4"></div>
              <p className="text-sm text-gray-500">Redirecting to Facebook...</p>
            </div>
          )}

          {status === "selecting" && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Business Manager</label>
                <select 
                  className="w-full rounded-lg border-gray-300 text-sm shadow-sm focus:border-claude-accent focus:ring-claude-accent"
                  value={selected.business_id}
                  onChange={e => setSelected(prev => ({...prev, business_id: e.target.value}))}
                  disabled={loading}
                >
                  <option value="">Select a Business</option>
                  {businesses.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Ad Account</label>
                <select 
                  className="w-full rounded-lg border-gray-300 text-sm shadow-sm focus:border-claude-accent focus:ring-claude-accent"
                  value={selected.ad_account_id}
                  onChange={e => setSelected(prev => ({...prev, ad_account_id: e.target.value}))}
                  disabled={loading || !selected.business_id}
                >
                  <option value="">Select an Ad Account</option>
                  {adAccounts.map(a => (
                    <option key={a.id} value={a.id}>{a.name} ({a.currency})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Facebook Page</label>
                <select 
                  className="w-full rounded-lg border-gray-300 text-sm shadow-sm focus:border-claude-accent focus:ring-claude-accent"
                  value={selected.page_id}
                  onChange={e => setSelected(prev => ({...prev, page_id: e.target.value}))}
                  disabled={loading}
                >
                  <option value="">Select a Page</option>
                  {pages.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="pt-4 border-t">
                <button
                  onClick={saveSelection}
                  disabled={loading || !selected.business_id || !selected.ad_account_id || !selected.page_id}
                  className="w-full bg-gray-900 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? 'Saving...' : 'Save & Continue'}
                </button>
              </div>
            </div>
          )}

          {status === "connected" && (
            <div className="text-center py-8">
              <div className="mx-auto h-16 w-16 bg-green-50 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="text-green-500" size={32} />
              </div>
              <h2 className="text-xl font-medium text-gray-900">Successfully Connected</h2>
              <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">
                Your Meta assets have been linked to LeadPilot. The AI can now publish and manage campaigns on your behalf.
              </p>
              <a 
                href="/dashboard/ai" 
                className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-claude-accent hover:text-claude-accent/80"
              >
                Go to AI Chat <ChevronRight size={16} />
              </a>
            </div>
          )}
          
        </div>
      </div>
    </>
  )
}
