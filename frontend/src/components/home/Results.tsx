import { useEffect, useRef, useState } from 'react'
import { motion, useInView, animate } from 'framer-motion'
import { SectionHeader } from './ChatDemo'
import { Zap, Target, LayoutTemplate, Palette, TrendingUp, BrainCircuit } from 'lucide-react'

const ease = [0.22, 1, 0.36, 1] as const

// ── KPI data ──────────────────────────────────────────────────────────────────
// Values are left configurable — replace with real product metrics before launch.
const KPIS = [
  {
    icon: Zap,
    label: 'Campaign generation speed',
    value: '<3',
    unit: 'min',
    desc: 'From conversation to full campaign draft',
    color: '#2563eb',
    bg: 'rgba(239,246,255,0.9)',
    border: 'rgba(147,197,253,0.4)',
  },
  {
    icon: Target,
    label: 'AI-driven workflows',
    value: '9',
    unit: '+',
    desc: 'Strategy · Creative · Audience · Compliance · More',
    color: '#0ea5e9',
    bg: 'rgba(240,249,255,0.9)',
    border: 'rgba(125,211,252,0.4)',
  },
  {
    icon: LayoutTemplate,
    label: 'Landing page templates',
    value: '—',
    unit: '',
    desc: 'Configurable — add your template count here',
    color: '#8b5cf6',
    bg: 'rgba(245,243,255,0.9)',
    border: 'rgba(196,181,253,0.4)',
  },
  {
    icon: Palette,
    label: 'Creative outputs per campaign',
    value: '3',
    unit: '+',
    desc: 'Ad copy, visuals, and variant creatives',
    color: '#f59e0b',
    bg: 'rgba(255,251,235,0.9)',
    border: 'rgba(253,230,138,0.4)',
  },
  {
    icon: TrendingUp,
    label: 'Optimization cycles',
    value: '∞',
    unit: '',
    desc: 'Continuous performance monitoring & tuning',
    color: '#10b981',
    bg: 'rgba(240,253,249,0.9)',
    border: 'rgba(110,231,183,0.4)',
  },
  {
    icon: BrainCircuit,
    label: 'Business context memory',
    value: '100',
    unit: '%',
    desc: 'Every action informed by your uploaded knowledge',
    color: '#6366f1',
    bg: 'rgba(238,242,255,0.9)',
    border: 'rgba(165,180,252,0.4)',
  },
]

function AnimatedValue({ raw }: { raw: string }) {
  const ref    = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const [display, setDisplay] = useState('0')

  useEffect(() => {
    if (!inView) return
    const num = parseFloat(raw)
    if (isNaN(num)) { setDisplay(raw); return }
    const ctrl = animate(0, num, {
      duration: 1.6,
      ease: 'easeOut',
      onUpdate: v => setDisplay(Number.isInteger(num) ? String(Math.round(v)) : v.toFixed(1)),
    })
    return () => ctrl.stop()
  }, [inView, raw])

  return <span ref={ref}>{display}</span>
}

export default function Results() {
  return (
    <section className="relative py-28 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-white via-[#f8fbff] to-white pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] rounded-full bg-blue-50/40 blur-3xl pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="What the AI delivers"
          title="Built for results, not complexity"
          desc="Every metric below is a product capability — replace with your real numbers at launch."
        />

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {KPIS.map((kpi, i) => (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.55, delay: i * 0.06, ease }}
              whileHover={{ y: -6, scale: 1.02 }}
              className="relative rounded-3xl p-6 flex flex-col gap-4 overflow-hidden cursor-default"
              style={{
                background: kpi.bg,
                border: `1px solid ${kpi.border}`,
                boxShadow: `0 4px 24px rgba(0,0,0,0.03), 0 16px 40px -12px ${kpi.color}20`,
                backdropFilter: 'blur(12px)',
              }}
            >
              {/* Icon */}
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center"
                style={{ background: kpi.color + '18', border: `1px solid ${kpi.color}28` }}
              >
                <kpi.icon size={20} style={{ color: kpi.color }} strokeWidth={1.75} />
              </div>

              {/* Value */}
              <div className="flex items-end gap-1 leading-none">
                <span
                  className="font-display font-semibold"
                  style={{ fontSize: 'clamp(2rem, 4vw, 2.75rem)', color: kpi.color }}
                >
                  <AnimatedValue raw={kpi.value} />
                </span>
                {kpi.unit && (
                  <span
                    className="text-xl font-semibold mb-1"
                    style={{ color: kpi.color + 'bb' }}
                  >
                    {kpi.unit}
                  </span>
                )}
              </div>

              {/* Label + desc */}
              <div>
                <p className="text-sm font-semibold text-slate-800 mb-1">{kpi.label}</p>
                <p className="text-xs text-slate-400 leading-relaxed">{kpi.desc}</p>
              </div>

              {/* Decorative corner glow */}
              <div
                className="absolute -bottom-6 -right-6 w-24 h-24 rounded-full blur-2xl pointer-events-none"
                style={{ background: kpi.color + '20' }}
              />
            </motion.div>
          ))}
        </div>

        <p className="mt-8 text-center text-xs text-slate-400">
          ✦ Values are product capabilities — replace with real performance data before launch.
        </p>
      </div>
    </section>
  )
}
