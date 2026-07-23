import { useMemo, useState } from 'react'
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import CampaignRow from './CampaignRow'
import type { Campaign } from './types'
import type { CampaignAction } from './ThreeDotMenu'
import type { Recommendation } from '@/lib/meta/campaignApi'

type SortKey = 'name' | 'status' | 'daily_budget' | 'created_at'

interface Props {
  campaigns: Campaign[]
  recommendationsByCampaign: Record<string, Recommendation | null | undefined>
  recommendationsLoading: boolean
  togglingId: string | null
  onToggle: (campaign: Campaign) => void
  onAction: (campaign: Campaign, action: CampaignAction) => void
}

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'name', label: 'Campaign' },
  { key: 'status', label: 'Status' },
  { key: 'daily_budget', label: 'Budget' },
  { key: 'created_at', label: 'Created' },
]

export default function CampaignTable({
  campaigns, recommendationsByCampaign, recommendationsLoading, togglingId, onToggle, onAction,
}: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('created_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const sorted = useMemo(() => {
    const copy = [...campaigns]
    copy.sort((a, b) => {
      let cmp = 0
      if (sortKey === 'name') cmp = a.name.localeCompare(b.name)
      else if (sortKey === 'status') cmp = a.status.localeCompare(b.status)
      else if (sortKey === 'daily_budget') cmp = a.daily_budget - b.daily_budget
      else cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      return sortDir === 'asc' ? cmp : -cmp
    })
    return copy
  }, [campaigns, sortKey, sortDir])

  return (
    <div className="glass rounded-2xl overflow-x-auto hidden md:block">
      <table className="w-full min-w-[720px]">
        <thead>
          <tr className="border-b border-white/10">
            {COLUMNS.map(col => (
              <th
                key={col.key}
                className={cn(
                  'py-3 px-3 text-left text-xs font-medium text-slate-500 select-none cursor-pointer hover:text-slate-300 transition-colors',
                  col.key === 'name' && 'pl-5'
                )}
                onClick={() => toggleSort(col.key)}
              >
                <span className="inline-flex items-center gap-1">
                  {col.label}
                  {sortKey === col.key
                    ? (sortDir === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />)
                    : <ArrowUpDown size={11} className="text-slate-700" />}
                </span>
              </th>
            ))}
            <th className="py-3 px-3 text-left text-xs font-medium text-slate-500">Recommendation</th>
            <th className="py-3 px-3 text-left text-xs font-medium text-slate-500">Active</th>
            <th className="py-3 pr-5 pl-3" />
          </tr>
        </thead>
        <tbody>
          {sorted.map(camp => (
            <CampaignRow
              key={camp.id}
              campaign={camp}
              recommendation={recommendationsByCampaign[camp.id]}
              recommendationLoading={recommendationsLoading}
              toggling={togglingId === camp.id}
              onToggle={onToggle}
              onAction={onAction}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}
