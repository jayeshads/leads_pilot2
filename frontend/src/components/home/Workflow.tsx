import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import {
  Building2, BrainCircuit, BookOpen, Target,
  Palette, LayoutTemplate, CheckSquare, Rocket, RefreshCw, TrendingUp,
} from 'lucide-react'
import { SectionHeader } from './ChatDemo'

const ease = [0.22, 1, 0.36, 1] as const

const STEPS = [
  { icon: Building2,     title: 'Business enters',      desc: 'You describe your business, goal, and budget in plain language.',    color: '#6366f1' },
  { icon: BrainCircuit,  title: 'AI understands',        desc: 'The AI reads your context, knowledge base, and past performance.',    color: '#2563eb' },
  { icon: BookOpen,      title: 'Knowledge read',        desc: 'Playbooks, SOPs, and brand guides are ingested before any action.',    color: '#0ea5e9' },
  { icon: Target,        title: 'Strategy built',        desc: 'Campaign goal, audience segments, and budget plan are drafted.',       color: '#10b981' },
  { icon: Palette,       title: 'Creatives generated',   desc: 'Ad copy, visual concepts, and variant creatives are produced.',        color: '#f59e0b' },
  { icon: LayoutTemplate,title: 'Landing page selected', desc: 'The AI matches your goal to the right template from your library.',    color: '#8b5cf6' },
  { icon: CheckSquare,   title: 'You approve',           desc: 'Every element is shown for your review. Nothing publishes without you.',color: '#ef4444' },
  { icon: Rocket,        title: 'Campaign launched',     desc: 'Approved campaign is published directly to Meta via the API.',          color: '#2563eb' },
  { icon: RefreshCw,     title: 'Live monitoring',       desc: 'Real-time performance data is tracked from the moment ads go live.',    color: '#0ea5e9' },
  { icon: TrendingUp,    title: 'Optimized continuously',desc: 'The AI surfaces budget, audience, and creative recommendations daily.', color: '#10b981' },
]

export default function Workflow() {
  const ref    = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section className="relative py-28 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-white via-[#f8fbff] to-white pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="The actual sequence"
          title="From conversation to live campaign"
          desc="This is the exact order of operations — not a diagram. Every step happens automatically."
        />

        <div ref={ref} className="relative mt-8">
          {/* Vertical connector line */}
          <div className="absolute left-[26px] sm:left-1/2 top-0 bottom-0 w-px bg-blue-100 -translate-x-px" />

          {/* Animated progress line */}
          <motion.div
            initial={{ scaleY: 0 }}
            animate={inView ? { scaleY: 1 } : { scaleY: 0 }}
            transition={{ duration: 2.4, ease: 'easeInOut', delay: 0.2 }}
            className="absolute left-[26px] sm:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-blue-400 to-sky-400 -translate-x-px origin-top"
          />

          <div className="space-y-8">
            {STEPS.map((step, i) => {
              const isRight = i % 2 === 0
              return (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, x: isRight ? -24 : 24 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.55, delay: i * 0.07, ease }}
                  className={`relative flex items-center gap-6 sm:gap-0 ${
                    isRight ? 'sm:flex-row' : 'sm:flex-row-reverse'
                  }`}
                >
                  {/* Content card */}
                  <div className={`flex-1 sm:max-w-[44%] ${isRight ? 'sm:text-right' : 'sm:text-left'} pl-16 sm:pl-0 ${isRight ? 'sm:pr-12' : 'sm:pl-12'}`}>
                    <motion.div
                      whileHover={{ y: -4, scale: 1.02 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 26 }}
                      className="inline-block rounded-2xl px-5 py-4 cursor-default"
                      style={{
                        background: 'rgba(255,255,255,0.85)',
                        backdropFilter: 'blur(12px)',
                        border: `1px solid ${step.color}20`,
                        boxShadow: `0 4px 20px rgba(0,0,0,0.03), 0 8px 24px -8px ${step.color}18`,
                      }}
                    >
                      <p className="text-sm font-semibold text-slate-900 mb-1">{step.title}</p>
                      <p className="text-xs text-slate-500 leading-relaxed">{step.desc}</p>
                    </motion.div>
                  </div>

                  {/* Centre icon node — absolutely positioned on mobile, flex on desktop */}
                  <div className="absolute left-0 sm:static sm:flex-shrink-0 sm:w-14 flex justify-center z-10">
                    <motion.div
                      animate={{ y: [0, -6, 0] }}
                      transition={{ duration: 3.5 + (i % 3) * 0.5, repeat: Infinity, ease: 'easeInOut', delay: i * 0.2 }}
                      className="relative w-[52px] h-[52px] rounded-2xl flex items-center justify-center"
                      style={{
                        background: `linear-gradient(135deg, ${step.color}18 0%, ${step.color}08 100%)`,
                        border: `1.5px solid ${step.color}30`,
                        boxShadow: `0 8px 24px -8px ${step.color}40, 0 0 0 4px white`,
                      }}
                    >
                      <step.icon size={20} style={{ color: step.color }} strokeWidth={1.75} />
                      {/* Step number badge */}
                      <span
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full text-pure-white text-[10px] font-bold flex items-center justify-center shadow-sm"
                        style={{ background: step.color }}
                      >
                        {i + 1}
                      </span>
                    </motion.div>
                  </div>

                  {/* Spacer for alternating side */}
                  <div className="hidden sm:block flex-1 sm:max-w-[44%]" />
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
