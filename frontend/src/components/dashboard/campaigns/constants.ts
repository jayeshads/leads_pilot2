import { Clock, CheckCircle2, XCircle, PauseCircle } from 'lucide-react'
import type { CampaignStatus } from './types'

export const STATUS_CONFIG: Record<CampaignStatus, { label: string; color: string; icon: React.ElementType }> = {
  pending_review: { label: 'Pending review', color: 'text-amber-400 border-amber-500/30 bg-amber-500/10', icon: Clock },
  active: { label: 'Active', color: 'text-green-400 border-green-500/30 bg-green-500/10', icon: CheckCircle2 },
  paused: { label: 'Paused', color: 'text-slate-400 border-white/15 bg-white/5', icon: PauseCircle },
  completed: { label: 'Completed', color: 'text-brand-400 border-brand-500/30 bg-brand-500/10', icon: CheckCircle2 },
  rejected: { label: 'Rejected', color: 'text-red-400 border-red-500/30 bg-red-500/10', icon: XCircle },
}

export const OBJECTIVES = ['Lead generation', 'Traffic', 'Conversions', 'Brand awareness', 'App installs', 'Store visits']
