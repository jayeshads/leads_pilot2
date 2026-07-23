import { useEffect, useRef } from 'react'

interface Particle {
  x: number
  y: number
  z: number
  vx: number
  vy: number
  r: number
  hue: number
  sat: number
  life: number
  maxLife: number
  jitter: number
  isSpark: boolean
}

/**
 * Premium AI Core canvas — multi-layer 3D particle system.
 * Thousands of "lead" particles spawn at the viewport edges,
 * get pulled by inverse-distance attraction toward the central
 * AI core, and dissolve on arrival. Multiple concentric rings
 * orbit the core. Connection lines appear between nearby particles.
 * Mouse creates a gentle repulsion ripple through the field.
 */
export default function HeroField() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mouseRef = useRef({ x: -9999, y: -9999 })
  const timeRef  = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    let width = 0, height = 0, cx = 0, cy = 0

    const resize = () => {
      const parent = canvas.parentElement
      if (!parent) return
      width  = parent.clientWidth
      height = parent.clientHeight
      canvas.width  = width  * dpr
      canvas.height = height * dpr
      canvas.style.width  = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      cx = width  / 2
      cy = height / 2
    }
    resize()
    const ro = new ResizeObserver(resize)
    if (canvas.parentElement) ro.observe(canvas.parentElement)

    const COUNT = reduceMotion ? 0 : 130

    const spawn = (p: Particle, stagger = false) => {
      // Spawn from a random viewport edge
      const side = Math.floor(Math.random() * 4)
      const margin = 60
      if      (side === 0) { p.x = Math.random() * width;  p.y = -margin }
      else if (side === 1) { p.x = width  + margin; p.y = Math.random() * height }
      else if (side === 2) { p.x = Math.random() * width;  p.y = height + margin }
      else                 { p.x = -margin;          p.y = Math.random() * height }

      p.z       = 0.25 + Math.random() * 0.75      // depth
      p.vx      = 0
      p.vy      = 0
      p.r       = p.z * (1.4 + Math.random() * 2.2)
      p.hue     = 200 + Math.random() * 35          // sky/blue range
      p.sat     = 55  + Math.random() * 45
      p.maxLife = 560 + Math.random() * 480
      p.life    = stagger ? Math.random() * p.maxLife : 0
      p.jitter  = (Math.random() - 0.5) * 0.85
      p.isSpark = Math.random() < 0.12
    }

    const particles: Particle[] = Array.from({ length: COUNT }, () => {
      const p: Particle = { x:0,y:0,z:0.5,vx:0,vy:0,r:2,hue:210,sat:80,life:0,maxLife:600,jitter:0,isSpark:false }
      spawn(p, true)
      return p
    })

    const onMove  = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }
    const onLeave = () => { mouseRef.current = { x: -9999, y: -9999 } }
    canvas.addEventListener('mousemove', onMove)
    canvas.addEventListener('mouseleave', onLeave)

    let raf = 0

    const step = () => {
      timeRef.current += 0.016
      const t = timeRef.current

      ctx.clearRect(0, 0, width, height)

      const cr = Math.min(width, height) * 0.065

      // ── Outer atmosphere glow ──────────────────────────────────────────
      const atmo = ctx.createRadialGradient(cx, cy, 0, cx, cy, cr * 6)
      atmo.addColorStop(0,   'rgba(147,197,253,0.12)')
      atmo.addColorStop(0.5, 'rgba(191,219,254,0.05)')
      atmo.addColorStop(1,   'rgba(219,234,254,0)')
      ctx.fillStyle = atmo
      ctx.beginPath()
      ctx.arc(cx, cy, cr * 6, 0, Math.PI * 2)
      ctx.fill()

      // ── Concentric rings ──────────────────────────────────────────────
      const RINGS = [2.4, 3.4, 4.6]
      RINGS.forEach((factor, ri) => {
        const rr = cr * factor
        const opacity = 0.06 - ri * 0.015

        // Static ring
        ctx.beginPath()
        ctx.arc(cx, cy, rr, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(96,165,250,${opacity})`
        ctx.lineWidth   = ri === 0 ? 1.5 : 1
        ctx.stroke()

        // Orbiting dots
        const dotCount = (ri + 2) * 5
        for (let d = 0; d < dotCount; d++) {
          const angle = (d / dotCount) * Math.PI * 2 + t * (0.12 / (ri + 1))
          const dx = cx + Math.cos(angle) * rr
          const dy = cy + Math.sin(angle) * rr
          ctx.beginPath()
          ctx.arc(dx, dy, 1.4, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(96,165,250,${0.18 - ri * 0.04})`
          ctx.fill()
        }
      })

      // ── AI Core ───────────────────────────────────────────────────────
      // Inner glow
      const coreGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, cr)
      coreGlow.addColorStop(0,   `rgba(255,255,255,${0.92 + Math.sin(t * 2.2) * 0.06})`)
      coreGlow.addColorStop(0.4, 'rgba(219,234,254,0.82)')
      coreGlow.addColorStop(0.8, 'rgba(147,197,253,0.35)')
      coreGlow.addColorStop(1,   'rgba(96,165,250,0.0)')
      ctx.beginPath()
      ctx.arc(cx, cy, cr, 0, Math.PI * 2)
      ctx.fillStyle = coreGlow
      ctx.fill()

      // Pulsing bright centre
      const pulse = cr * (0.72 + Math.sin(t * 2.8) * 0.1)
      const coreFill = ctx.createRadialGradient(cx, cy, 0, cx, cy, pulse)
      coreFill.addColorStop(0,   'rgba(255,255,255,0.98)')
      coreFill.addColorStop(0.6, 'rgba(239,246,255,0.90)')
      coreFill.addColorStop(1,   'rgba(219,234,254,0.60)')
      ctx.beginPath()
      ctx.arc(cx, cy, pulse, 0, Math.PI * 2)
      ctx.fillStyle = coreFill
      ctx.fill()

      // ── Particles ─────────────────────────────────────────────────────
      const connectDist = 85

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]
        p.life += 1
        if (p.life > p.maxLife) { spawn(p); continue }

        // Attraction toward core
        const dx   = cx - p.x
        const dy   = cy - p.y
        const dist = Math.max(Math.hypot(dx, dy), 1)
        const pull = Math.min(3400 / (dist * dist), 0.55) * p.z
        const ax   = (dx / dist) * pull + (-dy / dist) * p.jitter * 0.13
        const ay   = (dy / dist) * pull + ( dx / dist) * p.jitter * 0.13

        // Mouse repulsion
        const mdx   = p.x - mouseRef.current.x
        const mdy   = p.y - mouseRef.current.y
        const mdist = Math.hypot(mdx, mdy)
        let mx = 0, my = 0
        if (mdist < 130) {
          const f = (1 - mdist / 130) * 0.9
          mx = (mdx / (mdist || 1)) * f
          my = (mdy / (mdist || 1)) * f
        }

        p.vx = (p.vx + ax + mx) * 0.967
        p.vy = (p.vy + ay + my) * 0.967
        p.x += p.vx
        p.y += p.vy

        // Alpha compositing
        const fadeIn  = Math.min(p.life / 55, 1)
        const fadeOut = dist < cr * 1.6 ? Math.max(dist / (cr * 1.6), 0) : 1
        const lifeFade = 1 - Math.max(p.life - p.maxLife * 0.84, 0) / (p.maxLife * 0.16)
        const alpha   = Math.max(0, Math.min(fadeIn, fadeOut, lifeFade)) * (0.45 + p.z * 0.4)

        if (alpha <= 0.01) continue

        // Connection lines to nearby particles
        for (let j = i + 1; j < Math.min(particles.length, i + 20); j++) {
          const q = particles[j]
          const cdx = p.x - q.x, cdy = p.y - q.y
          const cd  = Math.hypot(cdx, cdy)
          if (cd < connectDist) {
            const la = (1 - cd / connectDist) * alpha * 0.22
            ctx.beginPath()
            ctx.moveTo(p.x, p.y)
            ctx.lineTo(q.x, q.y)
            ctx.strokeStyle = `hsla(${p.hue},80%,72%,${la})`
            ctx.lineWidth   = 0.5
            ctx.stroke()
          }
        }

        // Draw particle
        if (p.isSpark) {
          ctx.shadowColor = `hsla(${p.hue},100%,75%,${alpha * 0.7})`
          ctx.shadowBlur  = 10
        }
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r * (0.75 + p.z * 0.45), 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${p.hue},${p.sat}%,${62 + p.z * 22}%,${alpha})`
        ctx.fill()
        ctx.shadowBlur = 0
      }

      raf = requestAnimationFrame(step)
    }

    if (!reduceMotion) raf = requestAnimationFrame(step)
    else step()

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      canvas.removeEventListener('mousemove', onMove)
      canvas.removeEventListener('mouseleave', onLeave)
    }
  }, [])

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-auto" aria-hidden="true" />
}
