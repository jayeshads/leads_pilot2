import { lazy, Suspense } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRight, PlayCircle, CheckCircle2, Sparkles } from 'lucide-react'

const HeroFieldInner = lazy(() => import('./HeroField'))

const ease = [0.22, 1, 0.36, 1] as const

const TRUST = [
  'No Ads Manager needed',
  'Live in minutes',
  'Human approval before publish',
  'Cancel anytime',
]

export default function Hero({ onWatchDemo }: { onWatchDemo: () => void }) {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">

      {/* ── Layered background ───────────────────────────────────────── */}
      <div className="absolute inset-0 bg-gradient-to-b from-white via-[#f5f9ff] to-[#eef6ff]" />

      {/* Large ambient orbs */}
      <div
        className="absolute -top-48 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, rgba(147,197,253,0.22) 0%, rgba(219,234,254,0.10) 45%, transparent 70%)' }}
      />
      <div className="absolute top-1/4 -left-52 w-[520px] h-[520px] rounded-full bg-sky-100/30 blur-[130px] pointer-events-none animate-drift-slow" />
      <div className="absolute top-1/3 -right-40 w-[440px] h-[440px] rounded-full bg-blue-100/25 blur-[110px] pointer-events-none animate-drift-slower" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[200px] rounded-full bg-sky-50/60 blur-3xl pointer-events-none" />

      {/* ── 3D Particle Canvas ───────────────────────────────────────── */}
      <Suspense fallback={null}>
        <div className="absolute inset-0">
          <HeroFieldInner />
        </div>
      </Suspense>

      {/* ── Hero Content ─────────────────────────────────────────────── */}
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-28 text-center z-10">

        {/* Animated badge */}
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease }}
          className="inline-flex items-center gap-2.5 mb-8 px-5 py-2 rounded-full bg-white/75 backdrop-blur-xl border border-sky-100 shadow-[0_2px_20px_rgba(37,99,235,0.07)] text-sm font-medium text-blue-700"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-60" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-sky-500" />
          </span>
          The AI Marketing Employee · Now Live
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, delay: 0.08, ease }}
          className="font-display font-semibold leading-[1.04] tracking-tight mb-6 text-slate-900"
          style={{ fontSize: 'clamp(2.6rem, 6vw, 5.5rem)' }}
        >
          The AI That Builds{' '}
          <br className="hidden sm:block" />
          <span
            className="bg-clip-text text-transparent"
            style={{ backgroundImage: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 30%, #0ea5e9 65%, #38bdf8 100%)' }}
          >
            Meta Ads
          </span>{' '}
          For You.
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, delay: 0.18, ease }}
          className="text-lg sm:text-xl text-slate-500 max-w-2xl mx-auto mb-11 leading-relaxed"
        >
          One conversation. Full campaign strategy, creatives, landing pages, and
          live Meta Ads — built and optimized by AI. You approve before anything goes live.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.28, ease }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14"
        >
          <Link
            to="/signup"
            className="group relative flex items-center gap-2.5 bg-blue-600 hover:bg-blue-700 text-pure-white font-semibold px-8 py-4 rounded-2xl transition-all duration-300 shadow-[0_8px_32px_rgba(37,99,235,0.38)] hover:shadow-[0_12px_44px_rgba(37,99,235,0.48)] hover:-translate-y-0.5 text-base"
          >
            <Sparkles size={17} className="group-hover:rotate-12 transition-transform duration-300" />
            Start Free — No Setup Required
            <ArrowRight size={17} className="group-hover:translate-x-1 transition-transform duration-300" />
          </Link>

          <button
            onClick={onWatchDemo}
            className="group flex items-center gap-2.5 text-slate-600 hover:text-slate-900 bg-white/80 backdrop-blur-md border border-slate-200/70 hover:border-blue-200 px-8 py-4 rounded-2xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(37,99,235,0.1)] text-base font-medium"
          >
            <PlayCircle size={17} className="text-blue-500 group-hover:scale-110 transition-transform duration-300" />
            Watch It Work
          </button>
        </motion.div>

        {/* Trust line */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.9, delay: 0.45 }}
          className="flex flex-wrap items-center justify-center gap-x-7 gap-y-2.5 text-sm text-slate-400"
        >
          {TRUST.map((item) => (
            <span key={item} className="flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-sky-500" />
              {item}
            </span>
          ))}
        </motion.div>

      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#eef6ff] to-transparent pointer-events-none" />
    </section>
  )
}
