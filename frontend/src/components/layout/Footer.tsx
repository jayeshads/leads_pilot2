import { Link } from 'react-router-dom'
import { Zap, Sparkles } from 'lucide-react'

const footerLinks = {
  Product: [
    { href: '/how-it-works', label: 'How it works' },
    { href: '/pricing',      label: 'Pricing'      },
    { href: '/case-studies', label: 'Case studies' },
  ],
  Company: [
    { href: '/about',   label: 'About us' },
    { href: '/blog',    label: 'Blog'     },
    { href: '/contact', label: 'Contact'  },
  ],
  Legal: [
    { href: '#', label: 'Privacy policy'  },
    { href: '#', label: 'Terms of service' },
    { href: '#', label: 'Refund policy'   },
  ],
}

const lightLinks = [
  { href: '/about',   label: 'About'   },
  { href: '/pricing', label: 'Pricing' },
  { href: '/blog',    label: 'Blog'    },
  { href: '/login',   label: 'Sign in' },
]

export default function Footer({ light = false }: { light?: boolean }) {
  if (light) {
    return (
      <footer className="relative overflow-hidden" style={{ background: 'linear-gradient(180deg, #f5f9ff 0%, #eef6ff 100%)' }}>
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-100/80 to-transparent" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex flex-col md:flex-row items-center justify-between gap-10">
            {/* Brand */}
            <div className="flex flex-col items-center md:items-start gap-3">
              <Link to="/" className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, #2563eb 0%, #0ea5e9 100%)',
                    boxShadow:  '0 4px 14px rgba(37,99,235,0.28)',
                  }}
                >
                  <Sparkles size={14} className="text-pure-white" />
                </div>
                <span className="font-display font-semibold text-slate-900 text-lg">
                  Lead<span
                    className="bg-clip-text text-transparent"
                    style={{ backgroundImage: 'linear-gradient(135deg, #2563eb, #0ea5e9)' }}
                  >Pilot</span>
                </span>
              </Link>
              <p className="text-sm text-slate-400 max-w-xs text-center md:text-left leading-relaxed">
                The AI Marketing Employee that builds and manages Meta Ads for you.
              </p>
            </div>

            {/* Nav */}
            <nav className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2">
              {lightLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className="text-sm text-slate-500 hover:text-slate-900 transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Copyright */}
            <p className="text-xs text-slate-400">
              © {new Date().getFullYear()} LeadPilot
            </p>
          </div>
        </div>
      </footer>
    )
  }

  // ── Dark variant ──────────────────────────────────────────────────────
  return (
    <footer className="border-t border-white/5 bg-dark-900/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
                <Zap size={16} className="text-white" fill="white" />
              </div>
              <span className="font-semibold text-white text-lg">
                Lead<span className="text-brand-400">Pilot</span>
              </span>
            </Link>
            <p className="text-slate-500 text-sm leading-relaxed max-w-xs">
              The done-for-you advertising platform. We handle your Meta Ads — you focus on your business.
            </p>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
                {category}
              </h3>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={`${category}-${link.label}`}>
                    <Link
                      to={link.href}
                      className="text-sm text-slate-500 hover:text-white transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-600">
            © {new Date().getFullYear()} LeadPilot. All rights reserved.
          </p>
          <p className="text-xs text-slate-600">Made with ❤️ in India</p>
        </div>
      </div>
    </footer>
  )
}
