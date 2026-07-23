import { motion } from 'framer-motion'
import { FileText, BrainCircuit, ArrowRight } from 'lucide-react'
import { SectionHeader } from './ChatDemo'

const ease = [0.22, 1, 0.36, 1] as const

const DOCS = [
  { label: 'Brand Playbook',  angle: -65, dist: 230, delay: 0.0, color: '#2563eb' },
  { label: 'Ad Strategy',     angle: -25, dist: 268, delay: 0.3, color: '#0ea5e9' },
  { label: 'Funnel Maps',     angle:  18, dist: 244, delay: 0.6, color: '#8b5cf6' },
  { label: 'SOPs',            angle:  60, dist: 260, delay: 0.9, color: '#10b981' },
  { label: 'Business Docs',   angle: 104, dist: 238, delay: 0.2, color: '#f59e0b' },
  { label: 'Brand Guide',     angle: 148, dist: 262, delay: 0.5, color: '#ef4444' },
]

const OUTPUTS = [
  { label: 'Campaign',    color: '#2563eb' },
  { label: 'Creatives',  color: '#0ea5e9' },
  { label: 'Audiences',  color: '#8b5cf6' },
  { label: 'Landing Page', color: '#10b981' },
]

export default function KnowledgeEngine() {
  return (
    <section className="relative py-28 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#f5f9ff] via-white to-[#f5f9ff] pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-100 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-100 to-transparent" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Knowledge becomes intelligence"
          title="It reads before it acts"
          desc="Upload your playbooks, SOPs, brand guides, and funnels — the AI internalises everything before touching a campaign."
        />

        {/* Visual */}
        <div className="relative max-w-2xl mx-auto h-[480px] flex items-center justify-center">

          {/* Atmosphere */}
          <div className="absolute w-[360px] h-[360px] rounded-full bg-blue-50/60 blur-3xl" />

          {/* Orbit rings */}
          {[180, 264].map(r => (
            <div
              key={r}
              className="absolute rounded-full border border-blue-100/50"
              style={{ width: r * 2, height: r * 2 }}
            />
          ))}

          {/* Central brain */}
          <motion.div
            initial={{ scale: 0.75, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.65, ease }}
            className="relative z-20"
          >
            <div className="relative w-24 h-24 rounded-3xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #2563eb 0%, #0ea5e9 100%)',
                boxShadow: '0 24px 64px rgba(37,99,235,0.45), 0 0 0 8px rgba(37,99,235,0.08), 0 0 0 16px rgba(37,99,235,0.04)',
              }}
            >
              <motion.div
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute inset-0 rounded-3xl bg-blue-400/30 blur-xl"
              />
              <BrainCircuit size={34} className="text-pure-white relative z-10" />
            </div>
          </motion.div>

          {/* Floating document nodes */}
          {DOCS.map((doc) => {
            const rad = (doc.angle * Math.PI) / 180
            const x   = Math.cos(rad) * doc.dist
            const y   = Math.sin(rad) * doc.dist * 0.55
            return (
              <motion.div
                key={doc.label}
                initial={{ opacity: 0, x: x * 0.7, y: y * 0.7 - 12 }}
                whileInView={{ opacity: 1, x, y }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.85, delay: doc.delay, ease }}
                className="absolute z-10"
              >
                <motion.div
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 4.5 + doc.delay, repeat: Infinity, ease: 'easeInOut' }}
                  whileHover={{ scale: 1.08, y: -14 }}
                  className="flex items-center gap-2 rounded-2xl px-3.5 py-2.5 cursor-default"
                  style={{
                    background: 'rgba(255,255,255,0.90)',
                    backdropFilter: 'blur(16px)',
                    border: `1px solid ${doc.color}20`,
                    boxShadow: `0 8px 24px rgba(0,0,0,0.05), 0 0 0 1px rgba(255,255,255,0.7) inset`,
                  }}
                >
                  <FileText size={13} style={{ color: doc.color }} className="flex-shrink-0" />
                  <span className="text-xs font-semibold text-slate-700 whitespace-nowrap">{doc.label}</span>
                </motion.div>
              </motion.div>
            )
          })}

          {/* Output strip */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6, delay: 1.0, ease }}
            className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-2 z-30"
          >
            {OUTPUTS.map((o, i) => (
              <motion.span
                key={o.label}
                initial={{ opacity: 0, scale: 0.85 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 1.1 + i * 0.08, ease }}
                className="text-xs font-semibold px-3 py-1.5 rounded-full whitespace-nowrap"
                style={{
                  color: o.color,
                  background: o.color + '12',
                  border: `1px solid ${o.color}25`,
                }}
              >
                {i === 0 && <ArrowRight size={10} className="inline mr-1 -mt-0.5" />}
                {o.label}
              </motion.span>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  )
}
