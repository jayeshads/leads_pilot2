import { motion } from 'framer-motion'
import { ArrowRight, Star, Building2, Quote, Clock } from 'lucide-react'
import { SectionHeader } from './ChatDemo'

const ease = [0.22, 1, 0.36, 1] as const

// ── Case Studies ─────────────────────────────────────────────────────────────
// Structure is production-ready. Content marked [Pending] awaiting real stories.
const CASE_SLOTS = [
  { sector: 'Local Service Business',     color: '#2563eb', bg: 'rgba(239,246,255,0.9)', border: 'rgba(147,197,253,0.4)' },
  { sector: 'D2C E-commerce Brand',       color: '#10b981', bg: 'rgba(240,253,249,0.9)', border: 'rgba(110,231,183,0.4)' },
  { sector: 'Real Estate / High-Ticket',  color: '#8b5cf6', bg: 'rgba(245,243,255,0.9)', border: 'rgba(196,181,253,0.4)' },
]

// ── Reviews ───────────────────────────────────────────────────────────────────
// Six premium placeholder cards — clearly marked as awaiting approved testimonials.
const REVIEW_SLOTS = Array.from({ length: 6 }, (_, i) => i)

const AVATARS = ['#2563eb', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#0ea5e9']

export function CaseStudies() {
  return (
    <section className="relative py-28 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#f5f9ff] via-white to-white pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-100 to-transparent" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Results in the wild"
          title="Case studies coming soon"
          desc="These slots are production-ready and wired for real data. We'll update with approved client stories as they come in."
        />

        <div className="grid md:grid-cols-3 gap-6">
          {CASE_SLOTS.map((slot, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.55, delay: i * 0.08, ease }}
              whileHover={{ y: -6 }}
              className="relative rounded-3xl p-6 flex flex-col gap-4 overflow-hidden cursor-default"
              style={{
                background: slot.bg,
                backdropFilter: 'blur(12px)',
                border: `1px solid ${slot.border}`,
                boxShadow: `0 4px 24px rgba(0,0,0,0.03), 0 12px 32px -8px ${slot.color}14`,
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: slot.color + '14', border: `1px solid ${slot.color}22` }}
                >
                  <Building2 size={18} style={{ color: slot.color }} />
                </div>
                <span
                  className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full flex items-center gap-1"
                  style={{ color: slot.color, background: slot.color + '12', border: `1px solid ${slot.color}20` }}
                >
                  <Clock size={9} />
                  Coming soon
                </span>
              </div>

              {/* Sector */}
              <div>
                <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-1">{slot.sector}</p>
                <div className="space-y-2">
                  {['Challenge', 'AI Solution', 'Result'].map(field => (
                    <div key={field} className="flex items-start gap-2">
                      <span className="text-xs font-semibold text-slate-500 w-20 flex-shrink-0 mt-0.5">{field}</span>
                      <div className="flex-1 h-3 rounded-full bg-slate-100/80" />
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA placeholder */}
              <span className="mt-auto inline-flex items-center gap-1 text-xs font-semibold" style={{ color: slot.color }}>
                Read case study <ArrowRight size={11} />
              </span>

              {/* Corner glow */}
              <div className="absolute -bottom-6 -right-6 w-24 h-24 rounded-full blur-2xl pointer-events-none" style={{ background: slot.color + '18' }} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function Reviews() {
  const DOUBLED = [...REVIEW_SLOTS, ...REVIEW_SLOTS]

  return (
    <section className="relative py-24 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-white via-[#f5f9ff] to-white pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-100 to-transparent" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="What people are saying"
          title="Testimonials coming soon"
          desc="These cards are placeholder-only. We'll populate them with approved customer testimonials as they come in."
        />
      </div>

      <div className="relative overflow-hidden">
        <div className="flex gap-5 w-max animate-marquee">
          {DOUBLED.map((_, idx) => {
            const color = AVATARS[idx % AVATARS.length]
            return (
              <div
                key={idx}
                className="w-80 flex-shrink-0 rounded-3xl p-5 flex flex-col gap-4"
                style={{
                  background: 'rgba(255,255,255,0.80)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(219,234,254,0.60)',
                  boxShadow: '0 4px 20px rgba(37,99,235,0.05)',
                }}
              >
                {/* Stars */}
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, si) => (
                    <Star key={si} size={13} className="fill-amber-400 text-amber-400" />
                  ))}
                </div>

                {/* Quote */}
                <div className="relative">
                  <Quote size={16} className="text-blue-100 absolute -top-1 -left-1" />
                  <div className="space-y-1.5 pl-3">
                    <div className="h-2.5 bg-slate-100 rounded-full w-full" />
                    <div className="h-2.5 bg-slate-100 rounded-full w-5/6" />
                    <div className="h-2.5 bg-slate-100 rounded-full w-4/5" />
                    <div className="h-2.5 bg-slate-100 rounded-full w-3/5" />
                  </div>
                </div>

                {/* Attribution */}
                <div className="flex items-center gap-3 mt-1">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-pure-white text-xs font-bold flex-shrink-0"
                    style={{ background: `linear-gradient(135deg, ${color} 0%, ${color}99 100%)` }}
                  >
                    ?
                  </div>
                  <div>
                    <div className="h-2.5 bg-slate-100 rounded-full w-24 mb-1" />
                    <div className="h-2 bg-slate-100 rounded-full w-16" />
                  </div>
                  <span className="ml-auto text-[9px] uppercase tracking-wider font-semibold text-slate-300 border border-slate-100 px-2 py-0.5 rounded-full">Pending</span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Edge fades */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-white to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-white to-transparent" />
      </div>
    </section>
  )
}
