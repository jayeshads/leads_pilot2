/**
 * Phase 4 — Campaigns (Ads Manager style) API client.
 *
 * Extends campaignControl.ts (pause/resume) with the calls needed for the
 * 3-dot menu: recommendations (Recommendation Engine), performance history
 * (Monitoring Module), and creative preview. Uses getAuthToken() rather than
 * a raw supabase.auth.getSession() call so permanent/demo accounts (see
 * authToken.ts) work here too, not just real Supabase sessions.
 */
import { getAuthToken } from '@/lib/authToken'
import { CampaignControlError } from './campaignControl'

export { CampaignControlError }

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

async function authHeader(): Promise<string> {
  const token = await getAuthToken()
  if (!token) {
    throw new CampaignControlError('You must be signed in to manage campaigns.', 401)
  }
  return `Bearer ${token}`
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const Authorization = await authHeader()
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { Authorization, ...(options.headers ?? {}) },
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new CampaignControlError(body.detail ?? `Request failed (${response.status})`, response.status)
  }
  return (await response.json()) as T
}

export interface ToggleResult {
  campaign_id: string
  status: 'active' | 'paused'
}

/** Single flip endpoint backing the CampaignRow on/off switch. */
export function toggleCampaign(campaignId: string): Promise<ToggleResult> {
  return request<ToggleResult>(`/api/meta/campaigns/${campaignId}/toggle`, { method: 'POST' })
}

export interface Recommendation {
  id: string
  campaign_id: string
  business_id: string
  type: 'pause_creative' | 'increase_budget' | 'decrease_budget' | 'change_targeting' | 'no_action'
  reasoning: string
  suggested_change: Record<string, unknown>
  confidence: 'low' | 'medium' | 'high'
  status: 'pending' | 'approved' | 'rejected' | 'applied'
  created_at?: string
}

/** Lists every pending recommendation for the business, across campaigns
 * (there's no per-campaign filter server-side, so we filter client-side). */
export async function listPendingRecommendations(businessId: string): Promise<Recommendation[]> {
  return request<Recommendation[]>(`/api/monitoring/recommendations/pending?business_id=${encodeURIComponent(businessId)}`)
}

/** Runs the Recommendation Engine fresh for this campaign. Requires at
 * least one prior /monitoring/pull — surfaced as a friendly error if not. */
export function requestRecommendation(campaignId: string): Promise<Recommendation> {
  return request<Recommendation>(`/api/monitoring/recommend/${campaignId}`, { method: 'POST' })
}

export function approveRecommendation(recId: string, decidedBy: string): Promise<Recommendation> {
  return request<Recommendation>(`/api/monitoring/recommendations/${recId}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ decided_by: decidedBy }),
  })
}

export interface PerformanceLog {
  id: string
  campaign_id: string
  date: string
  impressions: number
  clicks: number
  ctr: number
  cpc: number
  spend: number
  conversions: number
  fetched_at: string
}

const RANGE_TO_LIMIT: Record<'7d' | '30d' | '90d', number> = { '7d': 7, '30d': 30, '90d': 90 }

/** Daily performance history for the line chart, oldest first. */
export async function getPerformanceHistory(campaignId: string, range: '7d' | '30d' | '90d'): Promise<PerformanceLog[]> {
  const logs = await request<PerformanceLog[]>(
    `/api/monitoring/performance/${campaignId}?limit=${RANGE_TO_LIMIT[range]}`
  )
  return [...logs].reverse()
}

export interface CreativePreview {
  available: boolean
  reason?: string
  creative?: { image_path: string; headline: string; primary_text: string; cta: string }
  strategy?: Record<string, unknown>
}

export function getCampaignCreative(campaignId: string): Promise<CreativePreview> {
  return request<CreativePreview>(`/api/meta/campaigns/${campaignId}/creative`)
}
