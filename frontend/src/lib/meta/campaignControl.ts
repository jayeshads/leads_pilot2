/**
 * Pause/Resume a launched campaign — calls our own FastAPI backend (never
 * Meta's Graph API directly), since only the backend holds the business's
 * Meta access token. This is the "on/off toggle" that was previously
 * missing anywhere in the dashboard UI.
 */
import { supabase } from '@/lib/supabase'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

export class CampaignControlError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
    this.name = 'CampaignControlError'
  }
}

interface ToggleResult {
  campaign_id: string
  status: 'active' | 'paused'
}

async function authHeader(): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) {
    throw new CampaignControlError('You must be signed in to manage campaigns.', 401)
  }
  return `Bearer ${session.access_token}`
}

async function post(path: string): Promise<ToggleResult> {
  const Authorization = await authHeader()
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { Authorization },
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new CampaignControlError(body.detail ?? `Request failed (${response.status})`, response.status)
  }
  return (await response.json()) as ToggleResult
}

export function pauseCampaign(campaignId: string): Promise<ToggleResult> {
  return post(`/api/meta/campaigns/${campaignId}/pause`)
}

export function resumeCampaign(campaignId: string): Promise<ToggleResult> {
  return post(`/api/meta/campaigns/${campaignId}/resume`)
}
