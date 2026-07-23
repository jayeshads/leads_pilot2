export type CampaignStatus = 'pending_review' | 'active' | 'paused' | 'completed' | 'rejected'

export interface Campaign {
  id: string
  name: string
  objective: string
  daily_budget: number
  status: CampaignStatus
  notes: string
  meta_campaign_id: string | null
  created_at: string
}
