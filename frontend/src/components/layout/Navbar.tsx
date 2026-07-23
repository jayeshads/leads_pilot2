import { useState, useEffect } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { Menu, X, Zap, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

const navLinks = [
  { href: '/how-it-works', label: 'How it works' },
  { href: '/pricing',      label: 'Pricing'      },
  { href: '/case-studies', label: 'Case studies' },
  { href: '/blog',         label: 'Blog'         },
  { href: '/about',        label: 'About'        },
]

export default function Navbar({ light = false }: { light?: boolean }) {
  const [open, setOpen]       = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => { setOpen(false) }, [location])

  // ── Light variant (landing page) ────────────────────────────────────────
  if (light) {
    return (
      <header
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
        style={{
          background:    scrolled ? 'rgba(255,255,255,0.82)' : 'rgba(255,255,255,0.0)',
          backdropFilter:scrolled ? 'blur(20px) saturate(1.8)' : 'none',
          borderBottom:  scrolled ? '1px solid rgba(219,234,254,0.60)' : '1px solid transparent',
          boxShadow:     scrolled ? '0 1px 0 rgba(37,99,235,0.04), 0 4px 20px rgba(0,0,0,0.03)' : 'none',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 group">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform duration-300 flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, #2563eb 0%, #0ea5e9 100%)',
                  boxShadow:  '0 4px 14px rgba(37,99,235,0.32)',
                }}
              >
                <Sparkles size={14} className="text-pure-white" />
              </div>
              <span className="font-display font-semibold text-slate-900 text-lg tracking-tight">
                Lead<span
                  className="bg-clip-text text-transparent"
                  style={{ backgroundImage: 'linear-gradient(135deg, #2563eb, #0ea5e9)' }}
                >Pilot</span>
              </span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-0.5">
              {navLinks.map((link) => (
                <NavLink
                  key={link.href}
                  to={link.href}
                  className={({ isActive }) =>
                    cn(
                      'px-4 py-2 text-sm rounded-xl transition-all duration-200',
                      isActive
                        ? 'text-slate-900 bg-blue-50 font-medium'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                    )
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>

            {/* Desktop CTAs */}
            <div className="hidden md:flex items-center gap-3">
              <Link
                to="/login"
                className="text-sm text-slate-500 hover:text-slate-900 transition-colors px-3 py-2 rounded-xl hover:bg-slate-50"
              >
                Sign in
              </Link>
              <Link
                to="/signup"
                className="text-sm font-semibold text-pure-white px-4 py-2 rounded-xl transition-all duration-300 hover:-translate-y-0.5"
                style={{
                  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                  boxShadow:  '0 4px 16px rgba(37,99,235,0.35)',
                }}
              >
                Start Free
              </Link>
            </div>

            {/* Mobile toggle */}
            <button
              onClick={() => setOpen(!open)}
              className="md:hidden p-2 text-slate-500 hover:text-slate-900 rounded-xl hover:bg-slate-50 transition-colors"
              aria-label="Toggle menu"
            >
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {open && (
          <div
            className="md:hidden border-t border-slate-100/60"
            style={{ background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(20px)' }}
          >
            <div className="px-4 py-4 space-y-1">
              {navLinks.map((link) => (
                <NavLink
                  key={link.href}
                  to={link.href}
                  className={({ isActive }) =>
                    cn(
                      'block px-4 py-3 text-sm rounded-xl transition-colors',
                      isActive
                        ? 'text-slate-900 bg-blue-50 font-medium'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                    )
                  }
                >
                  {link.label}
                </NavLink>
              ))}
              <div className="pt-3 pb-1 flex flex-col gap-2">
                <Link
                  to="/login"
                  className="block text-center text-sm text-slate-600 border border-slate-200 hover:border-blue-200 px-4 py-3 rounded-xl transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  to="/signup"
                  className="block text-center text-sm font-semibold text-pure-white px-4 py-3 rounded-xl"
                  style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' }}
                >
                  Start Free
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>
    )
  }

  // ── Dark variant (other marketing pages) ────────────────────────────────
  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        scrolled
          ? 'bg-dark-950/90 backdrop-blur-xl border-b border-white/5'
          : 'bg-transparent'
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center group-hover:bg-brand-500 transition-colors">
              <Zap size={16} className="text-white" fill="white" />
            </div>
            <span className="font-semibold text-white text-lg tracking-tight">
              Lead<span className="text-brand-400">Pilot</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <NavLink
                key={link.href}
                to={link.href}
                className={({ isActive }) =>
                  cn(
                    'px-4 py-2 text-sm rounded-lg transition-colors',
                    isActive
                      ? 'text-white bg-white/8'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <Link to="/login" className="text-sm text-slate-400 hover:text-white transition-colors px-3 py-2">
              Sign in
            </Link>
            <Link
              to="/signup"
              className="text-sm font-medium bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg transition-all hover:shadow-lg hover:shadow-brand-600/25"
            >
              Get started free
            </Link>
          </div>

          {/* Mobile Toggle */}
          <button
            onClick={() => setOpen(!open)}
            className="md:hidden p-2 text-slate-400 hover:text-white"
            aria-label="Toggle menu"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {open && (
        <div className="md:hidden bg-dark-900/95 backdrop-blur-xl border-b border-white/5">
          <div className="px-4 py-4 space-y-1">
            {navLinks.map((link) => (
              <NavLink
                key={link.href}
                to={link.href}
                className={({ isActive }) =>
                  cn(
                    'block px-4 py-3 text-sm rounded-lg transition-colors',
                    isActive
                      ? 'text-white bg-white/8'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
            <div className="pt-3 pb-1 flex flex-col gap-2">
              <Link to="/login" className="block text-center text-sm text-slate-400 border border-white/10 hover:border-white/20 px-4 py-3 rounded-lg transition-colors">
                Sign in
              </Link>
              <Link to="/signup" className="block text-center text-sm font-medium bg-brand-600 hover:bg-brand-500 text-white px-4 py-3 rounded-lg transition-colors">
                Get started free
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
