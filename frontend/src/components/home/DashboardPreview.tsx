import { motion } from 'framer-motion'
import { SectionHeader } from './ChatDemo'
import { TrendingUp, Users, MousePointerClick, Wallet } from 'lucide-react'

const ease = [0.22, 1, 0.36, 1] as const

const STATS = [
  { label: 'Active Campaigns', value: '3',      icon: TrendingUp,      accent: '#2563eb' },
  { label: 'Total Leads',      value: '284',     icon: Users,           accent: '#10b981' },
  { label: 'Total Spent',      value: '₹84,200', icon: Wallet,          accent: '#8b5cf6' },
  { label: 'Avg ROAS',         value: '3.6×',    icon: MousePointerClick, accent: '#f59e0b' },
]

const BARS = [38, 62, 44, 80, 53, 91, 68, 97, 58, 84, 73, 100, 79, 94]

const CAMPAIGNS = [
  { name: 'Dental Clinic — Pune Leads', status: 'Live', budget: '₹15,000/mo', cpl: '₹82', roas: '3.8×', statusColor: '#10b981' },
  { name: 'D2C Skincare — Mumbai',      status: 'Optimizing', budget: '₹28,000/mo', cpl: '₹118', roas: '4.2×', statusColor: '#0ea5e9' },
  { name: 'Real Estate — Delhi NCR',    status: 'Review',  budget: '₹45,000/mo', cpl: '—', roas: '—', statusColor: '#f59e0b' },
]

export default function DashboardPreview() {
  return (
    <section className="relative py-28 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-white to-[#f5f9ff] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full bg-blue-50/50 blur-3xl pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Monitoring, not micromanaging"
          title="One dashboard. Full visibility."
          desc="The AI runs everything — this is where you watch results, approve actions, and stay in complete control."
        />

        {/* Dashboard mockup */}
        <motion.div
          initial={{ opacity: 0, y: 48 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.8, ease }}
          className="relative max-w-5xl mx-auto"
        >
          {/* Glow halo */}
          <div className="absolute -inset-8 rounded-[3.5rem] bg-blue-50/70 blur-3xl -z-10" />

          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
            className="rounded-3xl overflow-hidden"
            style={{
              background: 'rgba(255,255,255,0.92)',
              backdropFilter: 'blur(24px)',
              border: '1px solid rgba(219,234,254,0.70)',
              boxShadow: '0 40px 100px -24px rgba(37,99,235,0.22), 0 0 0 1px rgba(255,255,255,0.8)',
            }}
          >
            {/* Chrome bar */}
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-100/80 bg-white/60">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-300" />
                <div className="w-3 h-3 rounded-full bg-amber-300" />
                <div className="w-3 h-3 rounded-full bg-emerald-300" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="bg-slate-50 border border-slate-200/60 rounded-lg px-4 py-1 text-[11px] text-slate-400 font-medium">
                  app.leadpilot.in/dashboard
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                All systems live
              </div>
            </div>

            <div className="p-5 sm:p-6 space-y-5">
              {/* Stat cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {STATS.map((s, i) => (
                  <motion.div
                    key={s.label}
                    initial={{ opacity: 0, y: 14 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.07, ease }}
                    className="rounded-2xl p-4"
                    style={{
                      background: `linear-gradient(135deg, ${s.accent}0c 0%, rgba(255,255,255,0.6) 100%)`,
                      border: `1px solid ${s.accent}18`,
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[11px] text-slate-500">{s.label}</p>
                      <s.icon size={13} style={{ color: s.accent }} />
                    </div>
                    <p className="text-xl font-semibold" style={{ color: s.accent }}>{s.value}</p>
                  </motion.div>
                ))}
              </div>

              {/* Chart */}
              <div className="rounded-2xl p-4 bg-slate-50/60 border border-slate-100/60">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-slate-700">Lead volume — last 14 days</p>
                  <span className="text-[10px] text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">↑ 24% vs prev period</span>
                </div>
                <div className="h-28 flex items-end gap-1">
                  {BARS.map((h, i) => (
                    <motion.div
                      key={i}
                      initial={{ height: 0 }}
                      whileInView={{ height: `${h}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.55, delay: i * 0.035, ease }}
                      className="flex-1 rounded-t-sm transition-colors"
                      style={{
                        background: h > 80
                          ? 'linear-gradient(to top, #2563eb, #0ea5e9)'
                          : 'linear-gradient(to top, #93c5fd, #bfdbfe)',
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Campaign table */}
              <div className="rounded-2xl overflow-hidden border border-slate-100/60">
                <div className="px-4 py-2.5 bg-slate-50/60 border-b border-slate-100/60">
                  <p className="text-xs font-semibold text-slate-600">Active Campaigns</p>
                </div>
                <div className="divide-y divide-slate-100/60">
                  {CAMPAIGNS.map((c, i) => (
                    <motion.div
                      key={c.name}
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.08 }}
                      className="flex items-center justify-between px-4 py-3 hover:bg-slate-50/60 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
                          style={{ color: c.statusColor, background: c.statusColor + '14', border: `1px solid ${c.statusColor}20` }}
                        >
                          {c.status}
                        </span>
                        <p className="text-xs font-medium text-slate-700 truncate max-w-[160px]">{c.name}</p>
                      </div>
                      <div className="hidden sm:flex items-center gap-5 text-xs text-slate-500">
                        <span>{c.budget}</span>
                        <span className="text-slate-400">CPL {c.cpl}</span>
                        <span className="font-semibold text-slate-700">ROAS {c.roas}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
