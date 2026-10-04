import * as THREE from 'three'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { createRenderer } from './core/renderer.js'
import { createScroll } from './core/scroll.js'
import { createCameraRig } from './core/cameraRig.js'
import { createSky } from './world/sky.js'
import { createSun } from './world/sun.js'
import { createOcean } from './world/ocean.js'
import { createTerrain } from './world/terrain.js'
import { createLabyrinth } from './world/labyrinth.js'
import { createClouds } from './world/clouds.js'
import { createLighting } from './world/lighting.js'
import { createEnvironment } from './world/envmap.js'
import { createShafts } from './world/shafts.js'
import { createDust } from './world/particles.js'
import { createIcarus } from './icarus/states.js'
import { createComposer } from './fx/composer.js'
import { sampleGrade } from './fx/grades.js'
import { runLoader } from './ui/loader.js'
import { setupChapterSpine, buildTextReveals, revealPrologue } from './ui/chapters.js'
import { createProgressRail } from './ui/progressRail.js'
import { createCursorTrail } from './ui/cursorTrail.js'
import { CHAPTERS, SUN, WORLD, QUALITY, REDUCED_MOTION } from './config.js'

gsap.registerPlugin(ScrollTrigger)

// Always restart the telling from the top, even after a refresh mid-story.
if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
window.scrollTo(0, 0)
document.documentElement.classList.add('is-loading')

// ── Capability check ─────────────────────────────────────────────────────────
// The story text works without WebGL; only the moving sky needs it.
function supportsWebGL2() {
  try {
    return !!document.createElement('canvas').getContext('webgl2')
  } catch {
    return false
  }
}
const hasWebGL2 = supportsWebGL2()

// ── Boot the scroll systems (work with or without WebGL) ────────────────────
setupChapterSpine()
const scroll = createScroll()
const rail = createProgressRail(scroll.scrollToTarget)
const cursorTrail = createCursorTrail()

// ── Three.js scene assembly ─────────────────────────────────────────────────
let three = null
let dust = null
let sky = null
let sun = null
let ocean = null
let terrain = null
let labyrinth = null
let clouds = null
let lighting = null
let envmap = null
let shafts = null
let icarus = null
let composer = null
let rig = null

function attemptInit() {
  if (three) return
  try {
    three = createRenderer(document.querySelector('#gl'))
    const { scene, camera } = three

    scene.fog = new THREE.FogExp2(0x05070c, 0.0)

    sky = createSky()
    scene.add(sky.mesh)

    sun = createSun()
    scene.add(sun.mesh)

    ocean = createOcean()
    scene.add(ocean.mesh)

    terrain = createTerrain()
    scene.add(terrain.group)

    labyrinth = createLabyrinth()
    labyrinth.setVisible(false)
    scene.add(labyrinth.group)

    clouds = createClouds()
    scene.add(clouds.group)

    lighting = createLighting(scene)
    for (const light of lighting.lights) scene.add(light)

    envmap = createEnvironment(three.renderer, scene)

    shafts = createShafts()
    scene.add(shafts.group)

    icarus = createIcarus(scene)

    dust = createDust()
    scene.add(dust.points)

    composer = createComposer(three.renderer, scene, camera, { dof: QUALITY.dof })
    rig = createCameraRig(camera)

    window.addEventListener('resize', () => composer.setSize(window.innerWidth, window.innerHeight))
    if (window.__icarus) window.__icarus.webgl = true
  } catch (err) {
    console.warn('[Icarus] WebGL scene failed to initialize — falling back to text-only.', err)
    three = null
  }
}

if (hasWebGL2) {
  attemptInit()
  if (!three) {
    // Transient GPU failure: retry once before giving up.
    setTimeout(attemptInit, 450)
  }
}

if (!three) {
  setTimeout(() => {
    if (!window.__icarus || !window.__icarus.webgl) {
      const canvas = document.querySelector('#gl')
      if (canvas) canvas.remove()
      document.querySelector('#webgl-fallback').hidden = false
    }
  }, 1400)
}

// ── Per-frame state and the single render loop ──────────────────────────────
const state = { progress: 0, velocity: 0, smoothVelocity: 0, time: 0, camera: three ? three.camera : null }
let lastScrollY = window.scrollY
let lastProgress = 0

// Sun stop interpolation: find the two surrounding stops in SUN.keys.
function sunStops(progress) {
  let i = 0
  while (i < SUN.keys.length - 2 && progress > SUN.keys[i + 1].p) i++
  return [SUN.keys[i], SUN.keys[Math.min(i + 1, SUN.keys.length - 1)]]
}

// Aegean teal the shallow water leans toward as the day brightens.
const WATER_TEAL = new THREE.Color(0x3f8ab0)

// Letterbox bars: strongest in The Fall, a hint in the Labyrinth.
function letterboxAmount(progress) {
  const ch2 = CHAPTERS[1]
  const ch8 = CHAPTERS[7]
  let amount = 0
  const bell = (p, a, b, ramp = 0.03) => {
    const inLow = THREE.MathUtils.smoothstep(p, a, a + ramp)
    const inHigh = 1 - THREE.MathUtils.smoothstep(p, b - ramp, b)
    return Math.min(inLow, inHigh)
  }
  amount += bell(progress, ch2.start, ch2.end) * 0.35
  amount += bell(progress, ch8.start, ch8.end, 0.05)
  return Math.min(amount, 1)
}

// Chapter dip: fade to black around every chapter boundary. The camera cut
// and grade swap land while the screen is dark, so the transition reads as a
// scene change instead of a jump. Widths are per-boundary: the descent into
// the Labyrinth and the sea impact get longer dips; the cliff chapters
// (same location) get a short one.
function dipAmount(progress) {
  let dip = 0
  for (let i = 0; i < CHAPTERS.length - 1; i++) {
    const b = CHAPTERS[i + 1].start
    const d = i === 0 ? 0.02 : i === 7 ? 0.022 : i === 3 ? 0.008 : 0.013
    const dist = Math.abs(progress - b)
    if (dist < d) {
      dip = Math.max(dip, 1 - THREE.MathUtils.smoothstep(dist, 0, d))
    }
  }
  return dip
}

// The single frame step. Registered on the GSAP ticker below, and also exposed
// as a debug hook so QA can drive frames deterministically when rAF is
// throttled (embedded/background contexts).
function tick(deltaMs) {
  const dt = Math.min(deltaMs / 1000, 0.05)
  state.time += dt
  state.progress = scroll.state.progress

  const y = window.scrollY
  state.velocity = y - lastScrollY
  lastScrollY = y
  state.smoothVelocity += (state.velocity - state.smoothVelocity) * 0.12

  const progress = state.progress

  if (three) {
    const grade = sampleGrade(progress)

    // Sun direction/size from the config keys.
    const [a, b] = sunStops(progress)
    const span = b.p - a.p || 1
    const sunMix = THREE.MathUtils.clamp((progress - a.p) / span, 0, 1)
    sun.applyKeys(a, b, sunMix)

    // Grade → sky, ocean, lights, fog, post.
    const su = sky.mesh.material.uniforms
    su.uTop.value.copy(grade.top)
    su.uHorizon.value.copy(grade.horizon)
    su.uBottom.value.copy(grade.bottom)
    su.uSunTint.value.copy(grade.sunTint)
    su.uSunDir.value.copy(sun.dir)
    su.uGlow.value = sun.mesh.material.uniforms.uGlow.value
    su.uStars.value = grade.stars
    su.uTime.value = state.time
    // Sky cloud bands + horizon haze ride with the story: absent underground,
    // thick as the day breaks, thinning to wisps at dusk.
    const dayBreak = THREE.MathUtils.smoothstep(progress, 0.3, 0.45)
    su.uClouds.value = dayBreak * 0.75 * (1 - THREE.MathUtils.smoothstep(progress, 0.9, 0.98))
    su.uHaze.value = 0.3 + 0.4 * dayBreak

    const ou = ocean.mesh.material.uniforms
    ou.uDeep.value.copy(grade.water)
    const dayBrightness = THREE.MathUtils.clamp(grade.sunI / 1.6, 0, 1)
    ou.uDeep.value.copy(grade.water).multiplyScalar(1 + 0.3 * dayBrightness)
    ou.uShallow.value.copy(ou.uDeep.value).lerp(WATER_TEAL, 0.5 + 0.12 * dayBrightness)
    ou.uSkyColor.value.copy(grade.horizon)
    ou.uSunDir.value.copy(sun.dir)
    ou.uSunTint.value.copy(grade.sunTint)
    ou.uGlint.value = Math.min(grade.sunI, 1.6)

    lighting.update(sun.dir, grade.sunTint, grade.sunI, grade.amb, three.camera, icarus.group.position)
    const chapterIndex = CHAPTERS.findIndex((c) => progress >= c.start && progress < c.end)
    envmap.update(su, chapterIndex)

    // Sun shafts rake through the open-air chapters; off underground and at sea.
    const shaftOpacity =
      progress > 0.24 && progress < 0.88
        ? THREE.MathUtils.clamp(grade.sunI - 0.4, 0, 1) * 0.16
        : 0
    shafts.update(sun.dir, three.camera, icarus.group.position, shaftOpacity, state.time)

    // Auto-focus: the DOF target tracks Icarus live — but only in chapters
    // where the frame is dominated by near subjects (the corridor, the fall,
    // the sea). In the bright open-sky chapters the far-focus bokeh smeared
    // the thin sea band into the warm horizon until the ocean disappeared.
    const dofOn =
      (progress > 0.05 && progress < 0.33) ||
      (progress > 0.61 && progress < 0.97)
    composer.setFocusTarget(dofOn ? icarus.group.position : null)
    three.scene.fog.color.copy(grade.fog)
    three.scene.fog.density = grade.fogD

    composer.updateGrade(grade)
    dust.points.material.uniforms.uOpacity.value = grade.dust

    // Cloud master opacity: enter at takeoff, gone after the sea.
    const cloudOpacity =
      THREE.MathUtils.smoothstep(progress, 0.33, 0.42) *
      (1 - THREE.MathUtils.smoothstep(progress, 0.9, 0.97))
    const cloudStreak = 1 + Math.min(Math.abs(state.smoothVelocity) * 0.015, 4)
    clouds.update(state, dt, cloudOpacity, cloudStreak)

    // Labyrinth only exists while chapters II–III are on stage.
    const ch2 = CHAPTERS[1]
    const ch3 = CHAPTERS[2]
    labyrinth.setVisible(progress > ch2.start - 0.01 && progress < ch3.end + 0.01)
    if (labyrinth.group.visible) labyrinth.update(state.time)

    // The epilogue island belongs to the final chapters only.
    terrain.setIslVisible(progress > 0.86)

    // Impact: fire the ripple exactly once as chapter IX begins.
    const ch9 = CHAPTERS[8]
    if (lastProgress < ch9.start && progress >= ch9.start) {
      ocean.triggerRipple(0, -140)
    }
    lastProgress = progress

    rig.update(state, dt, progress)
    sky.update(three.camera)
    sun.update(three.camera)
    ocean.update(state, dt)
    icarus.update(state, dt, progress)
    dust.update(state, dt)

    composer.render()
  }

  rail.update(progress)
  cursorTrail.update(dt, state.smoothVelocity)
  document.documentElement.style.setProperty('--letterbox', letterboxAmount(progress).toFixed(3))
  document.documentElement.style.setProperty('--dip', dipAmount(progress).toFixed(3))
}

gsap.ticker.add(tick)

// ── Resize (also resizes the composer chain) ────────────────────────────────
if (three && composer) {
  window.addEventListener('resize', () => composer.setSize(window.innerWidth, window.innerHeight))
}

// ── Loading screen: real signals only ───────────────────────────────────────
const warmup = three
  ? new Promise((resolve) => {
      // Resolve on the first rendered frame — but never let a throttled rAF
      // (background tab, embedded webview) hang the loading screen.
      const fallback = setTimeout(resolve, 2200)
      requestAnimationFrame(() => {
        composer.render()
        requestAnimationFrame(() => {
          clearTimeout(fallback)
          resolve()
        })
      })
    })
  : Promise.resolve()

runLoader(
  [
    { label: 'Loading typefaces', weight: 0.5, promise: document.fonts.ready },
    { label: 'Warming the sky', weight: 0.5, promise: warmup },
  ],
  () => {
    document.documentElement.classList.remove('is-loading')
    buildTextReveals()
    ScrollTrigger.refresh()
    revealPrologue()
  }
)

// ── Debug/QA hook ───────────────────────────────────────────────────────────
window.__icarus = {
  state,
  webgl: !!three,
  // QA handles to toggle suspect layers while probing the live buffer.
  objects: three ? { sky: sky.mesh, sun: sun.mesh, ocean: ocean.mesh, terrain: terrain.group, labyrinth: labyrinth.group, clouds: clouds.group, shafts: shafts.group, icarus: icarus.group } : null,
  renderer: three ? three.renderer : null,
  world: { waterY: WORLD.waterY },
  reducedMotion: REDUCED_MOTION,
  // QA: jump to a normalized progress and run frames without rAF. The settle
  // loop lets the damped camera rig converge before rendering stops.
  seek(p, settle = 60) {
    const max = document.documentElement.scrollHeight - window.innerHeight
    window.scrollTo(0, p * max)
    scroll.state.progress = p
    for (let i = 0; i < settle; i++) tick(50)
  },
}
