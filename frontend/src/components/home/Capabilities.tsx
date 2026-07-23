import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Megaphone, Palette, LayoutTemplate, Users,
  ShieldCheck, TrendingUp, BarChart3, BrainCircuit,
  MessageSquare, Database, Zap, RefreshCw,
} from 'lucide-react'
import { SectionHeader } from './ChatDemo'

const ease = [0.22, 1, 0.36, 1] as const

const CAPABILITIES = [
  {
    icon: BrainCircuit,
    title: 'AI Strategy',
    desc: 'Before touching a single setting, the AI reads your business, market, and goals — then builds a data-backed campaign plan.',
    color: '#2563eb',
    gradient: 'from-blue-50 to-blue-50/30',
  },
  {
    icon: Megaphone,
    title: 'Meta Ads',
    desc: 'Full campaign setup — targeting, budget, pixel tracking, and ad structure — handled end to end without an Ads Manager.',
    color: '#0ea5e9',
    gradient: 'from-sky-50 to-sky-50/30',
  },
  {
    icon: Palette,
    title: 'Creative AI',
    desc: 'Ad copy and visual concepts generated from your brand guidelines, or upload your own — it adapts to your identity.',
    color: '#8b5cf6',
    gradient: 'from-violet-50 to-violet-50/30',
  },
  {
    icon: LayoutTemplate,
    title: 'Landing Pages',
    desc: 'Automatically matches your campaign goal to the right landing page template from your library, then publishes on approval.',
    color: '#f59e0b',
    gradient: 'from-amber-50 to-amber-50/30',
  },
  {
    icon: Users,
    title: 'Audience Research',
    desc: 'Builds hyper-targeted audience segments from your business context — location, demographics, interests, and behaviour.',
    color: '#10b981',
    gradient: 'from-emerald-50 to-emerald-50/30',
  },
  {
    icon: ShieldCheck,
    title: 'Compliance',
    desc: 'Checks every creative and copy line against Meta ad policy before anything reaches the publish queue.',
    color: '#ef4444',
    gradient: 'from-red-50 to-red-50/30',
  },
  {
    icon: TrendingUp,
    title: 'Optimization',
    desc: 'Monitors live performance and proactively recommends budget shifts, audience changes, and creative refreshes.',
    color: '#f97316',
    gradient: 'from-orange-50 to-orange-50/30',
  },
  {
    icon: BarChart3,
    title: 'Analytics',
    desc: 'One dashboard for spend, leads, CTR, CPM, CPL, and ROAS — no spreadsheets, no context switching.',
    color: '#06b6d4',
    gradient: 'from-cyan-50 to-cyan-50/30',
  },
  {
    icon: MessageSquare,
    title: 'Conversational UI',
    desc: 'Every action happens through conversation. No forms, no wizards — just tell the AI what you need.',
    color: '#6366f1',
    gradient: 'from-indigo-50 to-indigo-50/30',
  },
  {
    icon: Database,
    title: 'Knowledge Base',
    desc: 'Upload your playbooks, SOPs, brand guides, and funnels — the AI internalises them before every action.',
    color: '#0891b2',
    gradient: 'from-cyan-50 to-cyan-50/30',
  },
  {
    icon: RefreshCw,
    title: 'Memory',
    desc: 'Remembers your business, past campaigns, audience insights, and preferences across every session.',
    color: '#7c3aed',
    gradient: 'from-purple-50 to-purple-50/30',
  },
  {
    icon: Zap,
    title: 'Human Approval',
    desc: 'Nothing publishes without your explicit approval. Full transparency at every step — you stay in control.',
    color: '#2563eb',
    gradient: 'from-blue-50 to-blue-50/30',
  },
]

function Card({ item, index }: { item: typeof CAPABILITIES[number]; index: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const [glow, setGlow] = useState({ x: 50, y: 50 })

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const px   = (e.clientX - rect.left) / rect.width
    const py   = (e.clientY - rect.top)  / rect.height
    setTilt({ x: (py - 0.5) * -10, y: (px - 0.5) * 10 })
    setGlow({ x: px * 100, y: py * 100 })
  }
  const onLeave = () => { setTilt({ x: 0, y: 0 }); setGlow({ x: 50, y: 50 }) }

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.55, delay: (index % 4) * 0.06, ease }}
      className="[perspective:1000px] h-full"
    >
      <div
        ref={ref}
        onMouseMove={onMouseMove}
        onMouseLeave={onLeave}
        style={{
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          transformStyle: 'preserve-3d',
          transition: 'transform 0.25s ease',
          background: `radial-gradient(circle at ${glow.x}% ${glow.y}%, ${item.color}09 0%, transparent 60%), rgba(255,255,255,0.80)`,
          backdropFilter: 'blur(12px)',
          border: `1px solid ${item.color}18`,
          boxShadow: `0 4px 24px rgba(0,0,0,0.03), 0 12px 32px -8px ${item.color}14`,
        }}
        className="rounded-2xl p-6 h-full cursor-default group transition-shadow hover:shadow-card-hover"
      >
        {/* Icon */}
        <div
          style={{ transform: 'translateZ(20px)', background: item.color + '14', border: `1px solid ${item.color}22` }}
          className="w-11 h-11 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300"
        >
          <item.icon size={20} style={{ color: item.color }} strokeWidth={1.75} />
        </div>

        {/* Text */}
        <h3
          style={{ transform: 'translateZ(14px)' }}
          className="text-slate-900 font-semibold text-base mb-2"
        >
          {item.title}
        </h3>
        <p
          style={{ transform: 'translateZ(12px)' }}
          className="text-slate-500 text-sm leading-relaxed"
        >
          {item.desc}
        </p>
      </div>
    </motion.div>
  )
}

export default function Capabilities() {
  return (
    <section className="relative py-28 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#f5f9ff] via-white to-[#f5f9ff] pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-100 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-100 to-transparent" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Full AI capability stack"
          title="One AI employee. Twelve disciplines."
          desc="Everything a full marketing team would do — minus the ramp-up, the salaries, and the coordination overhead."
        />

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {CAPABILITIES.map((item, i) => (
            <Card key={item.title} item={item} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}
