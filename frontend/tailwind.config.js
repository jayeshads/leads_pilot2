/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        dark: {
          950: '#020409',
          900: '#04080f',
          800: '#060d18',
          700: '#0a1628',
          600: '#0f2040',
        },
        // Landing page light design system
        cloud: {
          0:   '#ffffff',
          50:  '#fbfdff',
          100: '#f5f9ff',
        },
        sky: {
          50:  '#eff7ff',
          100: '#e1f0ff',
          200: '#c9e4ff',
          300: '#a8d3ff',
          400: '#7cbbff',
          500: '#4fa0ff',
          600: '#2c86f5',
          700: '#1c6bd6',
        },
        ink: {
          900: '#10151f',
          700: '#33394a',
          600: '#4b5563',
          400: '#8a94a6',
        },
        // Premium extra tokens
        ice: {
          50:  '#f0f7ff',
          100: '#e0efff',
          200: '#c0deff',
        },
        // White + very light blue accent palette (dashboard / AI chat)
        claude: {
          bg: '#FFFFFF',
          card: '#FFFFFF',
          border: '#E1EEF2',
          sidebar: '#FFFFFF',
          sidebarHover: '#E8FBFF',
          sidebarActive: '#B1F2FF',
          sidebarBorder: '#E1EEF2',
          text: '#1E293B',
          textMuted: '#64748B',
          textLight: '#64748B',
          accent: '#B1F2FF',
          accentHover: '#8FE9FF',
          accentSoft: '#E8FBFF',
          accentText: '#0F172A',
        },
        // Phase 2 — Emergent-style AI Chat UI (dark + light).
        chat: {
          bg: { dark: '#0a0e16', light: '#ffffff' },
          card: { dark: '#141a24', light: '#eef4ff' },
          border: { dark: '#242b38', light: '#E1EEF2' },
          muted: { dark: '#6b7280', light: '#64748B' },
          primary: { dark: '#e5e7eb', light: '#1E293B' },
        },
        status: {
          waiting: '#3b82f6',
          running: '#22c55e',
          stopped: '#6b7280',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Bricolage Grotesque"', 'Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'grid-pattern': "linear-gradient(rgba(59,130,246,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.05) 1px, transparent 1px)",
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'hero-glow': 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(37,99,235,0.12) 0%, transparent 60%)',
        'section-glow': 'radial-gradient(ellipse 60% 50% at 50% 100%, rgba(37,99,235,0.08) 0%, transparent 60%)',
      },
      backgroundSize: {
        'grid': '60px 60px',
      },
      animation: {
        'fade-up':        'fadeUp 0.6s ease-out forwards',
        'fade-in':        'fadeIn 0.5s ease-out forwards',
        'glow-pulse':     'glowPulse 3s ease-in-out infinite',
        'float':          'float 6s ease-in-out infinite',
        'float-slow':     'float 9s ease-in-out infinite',
        'float-slower':   'float 13s ease-in-out infinite',
        'drift-slow':     'drift 22s ease-in-out infinite',
        'drift-slower':   'drift 34s ease-in-out infinite reverse',
        'marquee':        'marquee 36s linear infinite',
        'marquee-slow':   'marquee 54s linear infinite',
        'marquee-rev':    'marquee 40s linear infinite reverse',
        'spin-slow':      'spin 16s linear infinite',
        'spin-slower':    'spin 28s linear infinite',
        'dash':           'dash 3.5s ease-in-out infinite',
        'shimmer':        'shimmer 2.4s linear infinite',
        'pulse-soft':     'pulseSoft 3s ease-in-out infinite',
        'slide-up':       'slideUp 0.5s ease-out forwards',
        'scale-in':       'scaleIn 0.4s ease-out forwards',
        'beam':           'beam 3s ease-in-out infinite',
        'aurora':         'aurora 8s ease-in-out infinite alternate',
        'ping-slow':      'ping 2.5s cubic-bezier(0,0,0.2,1) infinite',
      },
      keyframes: {
        fadeUp: {
          '0%':   { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        glowPulse: {
          '0%, 100%': { opacity: '0.4' },
          '50%':      { opacity: '0.9' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '0.6', transform: 'scale(1)' },
          '50%':      { opacity: '1', transform: 'scale(1.04)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-14px)' },
        },
        drift: {
          '0%, 100%': { transform: 'translate3d(0,0,0) rotate(0deg)' },
          '50%':      { transform: 'translate3d(14px,-18px,0) rotate(2deg)' },
        },
        marquee: {
          '0%':   { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        dash: {
          '0%':   { strokeDashoffset: '240' },
          '100%': { strokeDashoffset: '0' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        slideUp: {
          '0%':   { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%':   { opacity: '0', transform: 'scale(0.92)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        beam: {
          '0%, 100%': { transform: 'scaleY(0.8)', opacity: '0.4' },
          '50%':      { transform: 'scaleY(1.2)', opacity: '0.8' },
        },
        aurora: {
          '0%':   { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '100% 50%' },
        },
      },
      boxShadow: {
        'glass':        '0 4px 24px -4px rgba(148,163,184,0.12), 0 0 0 1px rgba(255,255,255,0.6)',
        'glass-lg':     '0 20px 60px -12px rgba(37,99,235,0.12), 0 0 0 1px rgba(255,255,255,0.7)',
        'blue-glow':    '0 8px 32px rgba(37,99,235,0.28)',
        'blue-glow-lg': '0 16px 48px rgba(37,99,235,0.35)',
        'card':         '0 2px 8px rgba(0,0,0,0.04), 0 12px 32px -8px rgba(37,99,235,0.08)',
        'card-hover':   '0 4px 12px rgba(0,0,0,0.05), 0 20px 48px -8px rgba(37,99,235,0.15)',
      },
    },
  },
  plugins: [],
}
