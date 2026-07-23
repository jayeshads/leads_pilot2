import { useEffect, useRef, useState } from 'react'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import {
  Search, Target, Users, Palette, LayoutTemplate, Wallet,
  CheckCircle2, Loader2, Sparkles, Zap,
} from 'lucide-react'

const ease = [0.22, 1, 0.36, 1] as const

// ─── Shared section header ─────────────────────────────────────────────────
export function SectionHeader({
  eyebrow, title, desc,
}: { eyebrow: string; title: string; desc?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.65, ease }}
      className="text-center mb-16"
    >
      <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-widest text-blue-600 bg-blue-50 border border-blue-100/80 mb-5">
        <Zap size={10} className="fill-blue-400 text-blue-400" />
        {eyebrow}
      </span>
      <h2
        className="font-display font-semibold text-slate-900 tracking-tight mb-5"
        style={{ fontSize: 'clamp(1.85rem, 4vw, 3rem)', lineHeight: 1.12 }}
      >
        {title}
      </h2>
      {desc && (
        <p className="text-lg text-slate-500 max-w-xl mx-auto leading-relaxed">{desc}</p>
      )}
    </motion.div>
  )
}

// ─── Chat Demo ──────────────────────────────────────────────────────────────
const PROMPT = 'Create Meta ads for my dental clinic in Pune.'

const STEPS = [
  { icon: Search,         label: 'Analyzing your dental clinic…'        },
  { icon: Target,         label: 'Drafting local Meta Ads strategy…'     },
  { icon: Users,          label: 'Researching Pune audience segments…'   },
  { icon: Palette,        label: 'Generating ad creatives & copy…'       },
  { icon: LayoutTemplate, label: 'Selecting best landing page template…' },
  { icon: Wallet,         label: 'Configuring budget, pixel & placements…'},
]

function useTypewriter(text: string, active: boolean, speed = 32) {
  const [out, setOut] = useState('')
  useEffect(() => {
    if (!active) return
    setOut('')
    let i = 0
    const id = setInterval(() => {
      i += 1
      setOut(text.slice(0, i))
      if (i >= text.length) clearInterval(id)
    }, speed)
    return () => clearInterval(id)
  }, [active, text, speed])
  return out
}

export default function ChatDemo() {
  const ref    = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })

  type Phase = 'idle' | 'typing' | 'thinking' | 'steps' | 'done'
  const [phase, setPhase]         = useState<Phase>('idle')
  const [visibleSteps, setVisible] = useState(0)
  const typed = useTypewriter(PROMPT, phase === 'typing')

  useEffect(() => {
    if (inView && phase === 'idle') {
      const t = setTimeout(() => setPhase('typing'), 500)
      return () => clearTimeout(t)
    }
  }, [inView, phase])

  useEffect(() => {
    if (phase === 'typing' && typed === PROMPT) {
      const t = setTimeout(() => setPhase('thinking'), 400)
      return () => clearTimeout(t)
    }
  }, [phase, typed])

  useEffect(() => {
    if (phase === 'thinking') {
      const t = setTimeout(() => setPhase('steps'), 1000)
      return () => clearTimeout(t)
    }
  }, [phase])

  useEffect(() => {
    if (phase !== 'steps') return
    if (visibleSteps >= STEPS.length) {
      const t = setTimeout(() => setPhase('done'), 600)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setVisible(v => v + 1), 580)
    return () => clearTimeout(t)
  }, [phase, visibleSteps])

  return (
    <section className="relative py-28 overflow-hidden">
      {/* Section background glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#eef6ff] via-white to-white pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] rounded-full bg-blue-50/60 blur-3xl pointer-events-none" />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="This is the product"
          title="Talk to it. It gets to work."
          desc="No campaign wizard. No Ads Manager. Just tell LeadPilot what you need — it plans, builds, and shows you every step before anything publishes."
        />

        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 36 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.75, ease }}
          className="rounded-3xl overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.80)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(219,234,254,0.80)',
            boxShadow: '0 30px 80px -20px rgba(37,99,235,0.18), 0 0 0 1px rgba(219,234,254,0.5)',
          }}
        >
          {/* Window chrome */}
          <div className="flex items-center gap-3 px-5 py-3.5 border-b border-sky-50/80 bg-white/50">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-300/80" />
              <div className="w-3 h-3 rounded-full bg-amber-300/80" />
              <div className="w-3 h-3 rounded-full bg-emerald-300/80" />
            </div>
            <div className="flex items-center gap-2 ml-2">
              <div className="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center">
                <Sparkles size={11} className="text-pure-white" />
              </div>
              <span className="text-sm font-medium text-slate-700">LeadPilot AI</span>
              <span className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                Live
              </span>
            </div>
            <span className="ml-auto text-xs text-slate-400">Interactive demo</span>
          </div>

          {/* Chat body */}
          <div className="p-6 sm:p-8 min-h-[300px] flex flex-col justify-end gap-4">

            {/* User message */}
            {phase !== 'idle' && (
              <motion.div
                initial={{ opacity: 0, x: 16, scale: 0.96 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{ duration: 0.35, ease }}
                className="self-end max-w-md"
              >
                <div className="bg-blue-600 text-pure-white text-sm rounded-2xl rounded-br-sm px-4 py-3 shadow-[0_4px_16px_rgba(37,99,235,0.3)] leading-relaxed">
                  {typed}
                  {phase === 'typing' && (
                    <span className="inline-block w-[2px] h-4 bg-white/80 ml-0.5 align-middle animate-pulse" />
                  )}
                </div>
              </motion.div>
            )}

            {/* AI response area */}
            {(phase === 'thinking' || phase === 'steps' || phase === 'done') && (
              <div className="self-start max-w-xl space-y-2.5 w-full">

                {/* Thinking state */}
                {phase === 'thinking' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-2.5 text-slate-400 text-sm px-4 py-2.5 bg-slate-50 rounded-2xl w-fit"
                  >
                    <Loader2 size={14} className="animate-spin text-blue-500" />
                    Reading your business context…
                  </motion.div>
                )}

                {/* Step cards */}
                <AnimatePresence>
                  {STEPS.slice(0, visibleSteps).map((step, i) => {
                    const isLast     = i === visibleSteps - 1
                    const inProgress = isLast && phase === 'steps'
                    return (
                      <motion.div
                        key={step.label}
                        initial={{ opacity: 0, x: -14, y: 4 }}
                        animate={{ opacity: 1, x: 0, y: 0 }}
                        transition={{ duration: 0.38, ease }}
                        className="flex items-center gap-3 px-4 py-3 rounded-2xl border"
                        style={{
                          background: inProgress
                            ? 'rgba(239,246,255,0.9)'
                            : 'rgba(248,250,252,0.9)',
                          borderColor: inProgress
                            ? 'rgba(147,197,253,0.6)'
                            : 'rgba(226,232,240,0.6)',
                        }}
                      >
                        {inProgress
                          ? <Loader2 size={15} className="text-blue-500 animate-spin flex-shrink-0" />
                          : <CheckCircle2 size={15} className="text-blue-600 flex-shrink-0" />
                        }
                        <step.icon size={14} className="text-slate-400 flex-shrink-0" />
                        <span className="text-sm text-slate-700">{step.label}</span>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>

                {/* Done card */}
                {phase === 'done' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.5, ease }}
                    className="mt-1 rounded-2xl overflow-hidden"
                    style={{
                      background: 'linear-gradient(135deg, rgba(239,246,255,0.95) 0%, rgba(255,255,255,0.95) 100%)',
                      border: '1px solid rgba(147,197,253,0.5)',
                      boxShadow: '0 8px 24px rgba(37,99,235,0.10)',
                    }}
                  >
                    <div className="px-4 py-3.5 flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-[0_4px_12px_rgba(37,99,235,0.35)]">
                        <Sparkles size={14} className="text-pure-white" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 mb-0.5">Campaign ready for your review</p>
                        <p className="text-xs text-slate-500">Strategy · Audience · 3 Creatives · Landing Page · Budget — all set. Nothing publishes without your approval.</p>
                      </div>
                    </div>
                    <div className="px-4 pb-3.5 flex gap-2.5">
                      {['Campaign preview', 'Edit & adjust', 'Approve & launch'].map((label, i) => (
                        <span
                          key={label}
                          className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-all ${
                            i === 2
                              ? 'bg-blue-600 text-pure-white border-blue-600 shadow-[0_4px_12px_rgba(37,99,235,0.3)]'
                              : 'bg-white text-slate-600 border-slate-200'
                          }`}
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
