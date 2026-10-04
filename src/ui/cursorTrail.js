import { REDUCED_MOTION } from '../config.js'

// Gold dust cursor trail: a pointer-events-none canvas above the page draws
// motes emitted along the pointer's path (interpolated, so fast swipes leave
// a continuous ribbon) plus sparks stirred up by scroll velocity itself.
// Rendered from the shared GSAP ticker — no second animation loop. Skipped
// for touch devices (no cursor) and reduced motion.
const POOL = 160

export function createCursorTrail() {
  const coarse =
    typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches

  if (REDUCED_MOTION || coarse) {
    return { canvas: null, update() {}, dispose() {} }
  }

  const canvas = document.createElement('canvas')
  canvas.id = 'cursor-trail'
  canvas.setAttribute('aria-hidden', 'true')
  document.body.appendChild(canvas)
  const ctx = canvas.getContext('2d')

  let dpr = Math.min(window.devicePixelRatio || 1, 2)
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = Math.round(window.innerWidth * dpr)
    canvas.height = Math.round(window.innerHeight * dpr)
    canvas.style.width = window.innerWidth + 'px'
    canvas.style.height = window.innerHeight + 'px'
  }
  resize()
  window.addEventListener('resize', resize)

  const motes = Array.from({ length: POOL }, () => ({
    x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, size: 1, gold: true,
  }))
  let next = 0

  const pointer = { x: -100, y: -100 }
  const last = { x: -100, y: -100 }
  let hasPointer = false

  window.addEventListener('mousemove', (e) => {
    pointer.x = e.clientX
    pointer.y = e.clientY
    if (!hasPointer) {
      last.x = pointer.x
      last.y = pointer.y
      hasPointer = true
    }
  }, { passive: true })

  function spawn(x, y, boost) {
    const m = motes[next]
    next = (next + 1) % POOL
    m.x = x + (Math.random() - 0.5) * 6
    m.y = y + (Math.random() - 0.5) * 6
    m.vx = (Math.random() - 0.5) * 30 - boost * 6
    m.vy = (Math.random() - 0.5) * 30 - 12 - boost * 4
    m.max = 0.45 + Math.random() * 0.5
    m.life = m.max
    m.size = 1 + Math.random() * 2.4 + boost * 0.8
    m.gold = Math.random() > 0.18
  }

  function update(dt, scrollVelocity) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)

    // Emit along the pointer's path — interpolated so quick gestures draw a
    // continuous ribbon instead of dots.
    if (hasPointer) {
      const dx = pointer.x - last.x
      const dy = pointer.y - last.y
      const dist = Math.hypot(dx, dy)
      const steps = Math.min(Math.max(Math.round(dist / 7), dist > 1 ? 1 : 0), 14)
      for (let i = 0; i < steps; i++) {
        const f = (i + 1) / steps
        spawn(last.x + dx * f, last.y + dy * f, 0)
      }
      // Scrolling stirs extra sparks at the resting cursor.
      const stir = Math.min(Math.abs(scrollVelocity) * 0.02, 2.5)
      if (stir > 0.3 && Math.random() < stir * 0.5) spawn(pointer.x, pointer.y, stir)
    }
    last.x = pointer.x
    last.y = pointer.y

    ctx.globalCompositeOperation = 'lighter'
    for (const m of motes) {
      if (m.life <= 0) continue
      m.life -= dt
      m.vy -= 14 * dt        // dust rises
      m.vx *= 1 - 1.6 * dt
      m.vy *= 1 - 1.6 * dt
      m.x += m.vx * dt
      m.y += m.vy * dt
      const t = m.life / m.max
      const a = t * t
      const r = m.size * (0.6 + 0.6 * t)
      const g = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, r * 3)
      if (m.gold) {
        g.addColorStop(0, `rgba(255, 222, 140, ${a})`)
        g.addColorStop(0.4, `rgba(232, 196, 107, ${a * 0.55})`)
        g.addColorStop(1, 'rgba(232, 196, 107, 0)')
      } else {
        g.addColorStop(0, `rgba(255, 255, 255, ${a})`)
        g.addColorStop(1, 'rgba(255, 255, 255, 0)')
      }
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(m.x, m.y, r * 3, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalCompositeOperation = 'source-over'
  }

  function dispose() {
    window.removeEventListener('resize', resize)
    canvas.remove()
  }

  return { canvas, update, dispose }
}
