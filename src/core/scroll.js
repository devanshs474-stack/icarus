import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { MOTION, REDUCED_MOTION } from '../config.js'

gsap.registerPlugin(ScrollTrigger)

// Smooth scroll + the one global progress signal for the whole experience.
//
// The Lenis ⇄ ScrollTrigger wiring below is the officially documented pattern
// (Lenis README): lenis scroll events forward to ScrollTrigger.update, and the
// GSAP ticker drives lenis.raf so there is exactly one rAF loop in the app.
// With prefers-reduced-motion we skip Lenis entirely and use native scroll.
export function createScroll() {
  const lenis = REDUCED_MOTION
    ? null
    : new Lenis({
        autoRaf: false,
        duration: MOTION.lenisDuration,
        // Long, soft deceleration — the high-end scroll feel.
        easing: (t) => 1 - Math.pow(1 - t, 3),
        // Smooth touch input too (off by default in Lenis), so phones get the
        // same float instead of raw 1:1 drags.
        syncTouch: true,
        touchMultiplier: 1.6,
      })

  if (lenis) {
    lenis.on('scroll', ScrollTrigger.update)
    gsap.ticker.add((time) => lenis.raf(time * 1000))
    gsap.ticker.lagSmoothing(0)
  }

  const state = { progress: 0 }

  // Master progress 0→1 across the whole 900vh story spine.
  ScrollTrigger.create({
    trigger: '#story',
    start: 'top top',
    end: 'bottom bottom',
    onUpdate(self) {
      state.progress = self.progress
    },
  })

  function scrollToTarget(selector) {
    const target = document.querySelector(selector)
    if (!target) return
    if (lenis) {
      lenis.scrollTo(target, { duration: 1.6 })
    } else {
      target.scrollIntoView({ behavior: REDUCED_MOTION ? 'auto' : 'smooth' })
    }
  }

  return { lenis, state, scrollToTarget }
}
