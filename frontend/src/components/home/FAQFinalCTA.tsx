import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ChevronDown, ArrowRight, Sparkles } from 'lucide-react'
import { SectionHeader } from './ChatDemo'

const ease = [0.22, 1, 0.36, 1] as const

const FAQS = [
  {
    q: 'Do I need to know how Meta Ads works?',
    a: 'No. You describe your business and goal in plain language — the AI handles audience targeting, budget setup, pixel configuration, and campaign structure from scratch. No Ads Manager knowledge required.',
  },
  {
    q: 'Does it publish campaigns without me seeing them first?',
    a: "No. Every element — ad creative, audience, budget, landing page — is presented to you for explicit approval before anything goes live or spends a single rupee. You're always in control.",
  },
  {
    q: 'Can I use my own creatives instead of AI-generated ones?',
    a: 'Yes. During the creative step you can upload your own assets, or let the AI generate them from your brand guidelines, logo, and business context — your choice every time.',
  },
  {
    q: 'What if I want to change something after the campaign is live?',
    a: 'Each campaign has its own persistent AI conversation. Just say "increase budget by 20%", "pause from tomorrow", or "swap the creative" — the AI makes the change directly.',
  },
  {
    q: 'What kind of businesses does LeadPilot work for?',
    a: 'Any business that runs or wants to run Meta Ads — local service businesses, D2C brands, real estate, coaching, e-commerce, clinics, and more. If you have a target audience and a budget, the AI can build for it.',
  },
  {
    q: 'How does pricing work?',
    a: "See the Pricing page for current plans, limits, and what's included.",
    link: { to: '/pricing', label: 'View pricing →' },
  },
]

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <section className="relative py-28 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-white via-[#f8fbff] to-white pointer-events-none" />

      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="FAQs"
          title="Frequently asked questions"
        />

        <div className="space-y-3">
          {FAQS.map((item, i) => {
            const isOpen = open === i
            return (
              <motion.div
                key={item.q}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.45, delay: i * 0.05, ease }}
                className="rounded-2xl overflow-hidden"
                style={{
                  background: 'rgba(255,255,255,0.85)',
                  backdropFilter: 'blur(12px)',
                  border: isOpen ? '1px solid rgba(147,197,253,0.55)' : '1px solid rgba(226,232,240,0.70)',
                  boxShadow: isOpen ? '0 8px 32px rgba(37,99,235,0.10)' : '0 2px 8px rgba(0,0,0,0.03)',
                  transition: 'border-color 0.25s ease, box-shadow 0.25s ease',
                }}
              >
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
                >
                  <span className="text-sm font-semibold text-slate-800">{item.q}</span>
                  <ChevronDown
                    size={16}
                    className={`text-blue-500 flex-shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 pt-0 text-sm text-slate-500 leading-relaxed border-t border-slate-100/60">
                        <div className="pt-3.5">
                          {item.a}{' '}
                          {item.link && (
                            <Link
                              to={item.link.to}
                              className="text-blue-600 font-semibold hover:underline"
                            >
                              {item.link.label}
                            </Link>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ─── Final CTA ───────────────────────────────────────────────────────────────
export function FinalCTA() {
  return (
    <section className="relative py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, #f0f7ff 0%, #e8f2ff 40%, #f5f9ff 100%)' }} />

      {/* Large glow blobs */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, rgba(37,99,235,0.10) 0%, rgba(14,165,233,0.06) 40%, transparent 70%)' }}
      />
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-blue-100/20 blur-3xl pointer-events-none animate-drift-slow" />
      <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-[360px] h-[360px] rounded-full bg-sky-100/20 blur-3xl pointer-events-none animate-drift-slower" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-200/60 to-transparent" />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 36 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.8, ease }}
          className="space-y-8"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 backdrop-blur-md border border-blue-100/80 shadow-sm text-sm font-medium text-blue-700"
          >
            <Sparkles size={14} className="text-blue-500" />
            Your first AI hire starts here
          </motion.div>

          {/* Headline */}
          <h2
            className="font-display font-semibold text-slate-900 tracking-tight"
            style={{ fontSize: 'clamp(2rem, 5vw, 3.75rem)', lineHeight: 1.1 }}
          >
            Ready to hire your first{' '}
            <br className="hidden sm:block" />
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 35%, #0ea5e9 65%, #38bdf8 100%)' }}
            >
              AI Marketing Employee?
            </span>
          </h2>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl text-slate-500 max-w-md mx-auto leading-relaxed">
            One conversation is all it takes to get your first campaign drafted, approved, and live.
          </p>

          {/* CTA group */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/signup"
              className="group flex items-center gap-2.5 bg-blue-600 hover:bg-blue-700 text-pure-white font-semibold px-9 py-4 rounded-2xl transition-all duration-300 text-base shadow-[0_10px_36px_rgba(37,99,235,0.40)] hover:shadow-[0_14px_44px_rgba(37,99,235,0.50)] hover:-translate-y-0.5"
            >
              <Sparkles size={17} className="group-hover:rotate-12 transition-transform duration-300" />
              Start Free — No Credit Card
              <ArrowRight size={17} className="group-hover:translate-x-1 transition-transform duration-300" />
            </Link>
            <Link
              to="/pricing"
              className="text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors underline-offset-4 hover:underline"
            >
              View pricing plans →
            </Link>
          </div>

          {/* Final trust */}
          <p className="text-xs text-slate-400">
            No Ads Manager needed · Human approval before every publish · Cancel anytime
          </p>
        </motion.div>
      </div>
    </section>
  )
}
