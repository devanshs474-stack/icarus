import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { CHAPTERS, REDUCED_MOTION } from '../config.js'

gsap.registerPlugin(ScrollTrigger, SplitText)

// Chapter text choreography.
//
// - setupChapterSpine(): section heights from config (single source of truth).
// - buildTextReveals(): per-chapter scrubbed line-mask reveals. Each SplitText
//   line is wrapped in an overflow-hidden div so lines can rise out of masks.
//   The prologue is handled separately — it is choreographed on load, not on
//   scroll, and then simply fades away as the reader leaves the top.
// - revealPrologue(): the "ICARUS" entrance with the gold light sweep.

let builds = []
let resizeTimer = null
let watchingResize = false

export function setupChapterSpine() {
  for (const c of CHAPTERS) {
    const el = document.getElementById(c.id)
    if (el) el.style.height = `${c.vh}vh`
  }
}

function disposeTextReveals() {
  for (const b of builds) {
    if (b.timeline.scrollTrigger) b.timeline.scrollTrigger.kill()
    b.timeline.kill()
    for (const s of b.splits) s.revert()
  }
  builds = []
}

export function buildTextReveals() {
  disposeTextReveals()

  for (const c of CHAPTERS) {
    const section = document.getElementById(c.id)
    if (!section) continue

    if (c.id === 'ch1') {
      // Prologue: load-time entrance (see revealPrologue), then a graceful
      // exit tied to the first 40vh of scrolling.
      const exit = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        },
      })
      exit.to('#ch1 .chapter__overlay', { autoAlpha: 0, y: -60, ease: 'none' })
      builds.push({ timeline: exit, splits: [] })
      continue
    }

    const targets = section.querySelectorAll('.chapter__title, .story-p')
    if (!targets.length) continue

    const splits = []
    const lines = []
    for (const el of targets) {
      const split = new SplitText(el, { type: 'lines', linesClass: 'st-line' })
      for (const line of split.lines) {
        const mask = document.createElement('div')
        mask.className = 'line-mask'
        line.parentNode.insertBefore(mask, line)
        mask.appendChild(line)
        lines.push(line)
      }
      splits.push(split)
    }

    // Each chapter's text lives inside its section's scroll window: it enters
    // while the section approaches and hands off (fades up and away) before
    // the next chapter's text arrives. Without the exit phase, neighboring
    // sticky overlays would stack on screen. 'top 45%' keeps chapter 2 —
    // which starts only 40vh from the page top — fully hidden at scrollY 0.
    const fadeables = section.querySelectorAll('.kicker, .chapter__title, .story-p, .caption')

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: 'top 40%',
        end: 'bottom top',
        scrub: REDUCED_MOTION ? true : 1.0,
      },
    })

    if (REDUCED_MOTION) {
      // Calm fallback: quiet opacity settle in, gentle fade out.
      tl.fromTo(fadeables, { autoAlpha: 0 }, { autoAlpha: 1, stagger: 0.04, duration: 0.16, ease: 'none' }, 0)
      tl.fromTo(lines, { autoAlpha: 0.1 }, { autoAlpha: 1, stagger: 0.02, duration: 0.16, ease: 'none' }, 0.04)
    } else {
      const smalls = section.querySelectorAll('.kicker, .caption')
      tl.fromTo(smalls, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.12, ease: 'none' }, 0)
      tl.fromTo(
        lines,
        { yPercent: 120 },
        { yPercent: 0, stagger: 0.012, duration: 0.15, ease: 'power3.out' },
        0.02
      )
    }

    // Handoff: everything drifts up and out during the section's last stretch.
    tl.to(fadeables, { autoAlpha: 0, y: -40, stagger: 0.02, duration: 0.14, ease: 'none' }, 0.84)

    builds.push({ timeline: tl, splits })
  }

  // Re-split on resize so line masks follow the new wrapping.
  if (!watchingResize) {
    watchingResize = true
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer)
      resizeTimer = setTimeout(() => {
        if (!builds.length) return
        buildTextReveals()
        ScrollTrigger.refresh()
      }, 350)
    })
  }
}

// Called once the loader finishes. The title letterspaces open, the supporting
// lines settle in, and a gold highlight periodically sweeps across the letters.
export function revealPrologue() {
  const title = document.querySelector('#icarus-title')
  const overlay = document.querySelector('#ch1 .chapter__overlay')

  if (REDUCED_MOTION) {
    gsap.fromTo(overlay.children, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.8, stagger: 0.12 })
    return
  }

  const tl = gsap.timeline({ defaults: { ease: 'power2.out' } })
  // immediateRender: false — if the ticker is stalled, elements keep their
  // natural (visible) state instead of being stranded at opacity 0.
  tl.fromTo(
    title,
    { autoAlpha: 0, letterSpacing: '0.55em' },
    { autoAlpha: 1, letterSpacing: '0.32em', duration: 1.8, immediateRender: false }
  )
    .fromTo('#ch1 .kicker', { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.8, immediateRender: false }, '-=1.2')
    .fromTo('#ch1 .lede', { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.9, immediateRender: false }, '-=0.6')
    .fromTo('#ch1 .scroll-cue', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.9, immediateRender: false }, '-=0.4')

  gsap.fromTo(
    title,
    { backgroundPosition: '160% 50%' },
    { backgroundPosition: '-60% 50%', duration: 2.4, ease: 'power2.inOut', delay: 0.6, repeat: -1, repeatDelay: 8 }
  )
}
