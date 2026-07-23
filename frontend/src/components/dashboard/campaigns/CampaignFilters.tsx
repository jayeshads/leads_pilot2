import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CampaignStatus } from './types'

export interface FiltersState {
  status: CampaignStatus | 'all'
  dateRange: 'all' | '7d' | '30d' | '90d'
  search: string
}

interface Props {
  filters: FiltersState
  onChange: (filters: FiltersState) => void
  resultCount: number
}

const STATUS_OPTIONS: { value: FiltersState['status']; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'pending_review', label: 'Pending review' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'completed', label: 'Completed' },
  { value: 'rejected', label: 'Rejected' },
]

const DATE_OPTIONS: { value: FiltersState['dateRange']; label: string }[] = [
  { value: 'all', label: 'All time' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
]

const selectCls =
  'bg-dark-800 border border-white/10 hover:border-white/20 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all cursor-pointer'

export default function CampaignFilters({ filters, onChange, resultCount }: Props) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="relative flex-1 min-w-[180px]">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
        <input
          type="text"
          placeholder="Search campaigns…"
          value={filters.search}
          onChange={e => onChange({ ...filters, search: e.target.value })}
          className={cn(
            'w-full bg-dark-800 border border-white/10 hover:border-white/20 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all'
          )}
        />
      </div>

      <select
        value={filters.status}
        onChange={e => onChange({ ...filters, status: e.target.value as FiltersState['status'] })}
        className={selectCls}
      >
        {STATUS_OPTIONS.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      <select
        value={filters.dateRange}
        onChange={e => onChange({ ...filters, dateRange: e.target.value as FiltersState['dateRange'] })}
        className={selectCls}
      >
        {DATE_OPTIONS.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      <span className="text-xs text-slate-600 whitespace-nowrap sm:ml-auto">
        {resultCount} campaign{resultCount === 1 ? '' : 's'}
      </span>
    </div>
  )
}
