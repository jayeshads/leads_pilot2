import { useCallback, useEffect, useState } from 'react'
import { LineChart } from 'lucide-react'
import { getPerformanceHistory, CampaignControlError, type PerformanceLog } from '@/lib/meta/campaignApi'
import { cn } from '@/lib/utils'
import ModalShell from './ModalShell'
import type { Campaign } from '../types'

interface Props {
  campaign: Campaign
  onClose: () => void
}

type Range = '7d' | '30d' | '90d'
const RANGE_LABELS: Record<Range, string> = { '7d': '7 days', '30d': '30 days', '90d': '90 days' }

/** Renders spend and leads (conversions) as two hand-rolled SVG sparklines —
 * no charting library is installed in this project, so this avoids adding
 * one just for a single modal. Data comes from the real Monitoring Module
 * (ai_performance_logs), not a mock. */
export default function PerformanceModal({ campaign, onClose }: Props) {
  const [range, setRange] = useState<Range>('30d')
  const [logs, setLogs] = useState<PerformanceLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setLogs(await getPerformanceHistory(campaign.id, range))
    } catch (err) {
      setError(err instanceof CampaignControlError ? err.message : 'Could not load performance history.')
    } finally {
      setLoading(false)
    }
  }, [campaign.id, range])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  return (
    <ModalShell title="Performance over time" subtitle={campaign.name} onClose={onClose} maxWidth="max-w-2xl">
      <div className="space-y-5">
        <div className="flex gap-1">
          {(Object.keys(RANGE_LABELS) as Range[]).map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                'text-xs px-3 py-1.5 rounded-lg transition-all',
                range === r ? 'bg-brand-600/20 text-brand-300 border border-brand-500/30' : 'text-slate-500 hover:text-slate-300'
              )}
            >
              {RANGE_LABELS[r]}
            </button>
          ))}
        </div>

        {error && (
          <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">{error}</div>
        )}

        {loading ? (
          <div className="h-48 bg-white/5 rounded-xl animate-pulse" />
        ) : logs.length === 0 ? (
          <div className="text-center py-10">
            <LineChart size={28} className="text-slate-700 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">No performance data yet</p>
            <p className="text-slate-600 text-xs mt-1">
              This fills in once daily insights start being pulled for this campaign.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <Sparkline title="Spend (₹)" logs={logs} accessor={l => l.spend} color="#f59e0b" format={v => `₹${v.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`} />
            <Sparkline title="Leads" logs={logs} accessor={l => l.conversions} color="#22c55e" format={v => v.toString()} />
          </div>
        )}
      </div>
    </ModalShell>
  )
}

function Sparkline({
  title, logs, accessor, color, format,
}: {
  title: string
  logs: PerformanceLog[]
  accessor: (l: PerformanceLog) => number
  color: string
  format: (v: number) => string
}) {
  const values = logs.map(accessor)
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const range = max - min || 1
  const width = 600
  const height = 120
  const padding = 8
  const stepX = values.length > 1 ? (width - padding * 2) / (values.length - 1) : 0

  const points = values.map((v, i) => {
    const x = padding + i * stepX
    const y = height - padding - ((v - min) / range) * (height - padding * 2)
    return `${x},${y}`
  })

  const latest = values[values.length - 1]
  const total = values.reduce((a, b) => a + b, 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-slate-400 text-xs font-medium">{title}</p>
        <p className="text-white text-sm font-semibold">
          {format(latest)} <span className="text-slate-600 font-normal">latest · {format(total)} total</span>
        </p>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-28" preserveAspectRatio="none">
        <polyline points={points.join(' ')} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
        {points.map((p, i) => {
          const [x, y] = p.split(',')
          return <circle key={i} cx={x} cy={y} r="2.5" fill={color} />
        })}
      </svg>
    </div>
  )
}
