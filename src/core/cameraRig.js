import * as THREE from 'three'
import { CAMERA, chapterRange, MOTION, REDUCED_MOTION } from '../config.js'

// Camera rig: per-chapter keyframes sampled along Catmull-Rom curves (through
// every key, uniform arc-length speed) so moves flow instead of pulsing with
// ease-in-out at each key. Chapter boundaries are hard cuts — the #fade dip
// covers them — so this rig only ever moves within one chapter's set.
const CHAPTER_IDS = ['ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6', 'ch7', 'ch8', 'ch9', 'ch10']

const curveCache = new Map()

function curvesFor(chapterId) {
  if (curveCache.has(chapterId)) return curveCache.get(chapterId)
  const keys = CAMERA.chapters[chapterId] || CAMERA.chapters.ch10
  let out
  if (keys.length === 1) {
    out = {
      pos: null,
      look: null,
      staticPos: new THREE.Vector3(...keys[0].pos),
      staticLook: new THREE.Vector3(...keys[0].look),
    }
  } else {
    out = {
      pos: new THREE.CatmullRomCurve3(keys.map((k) => new THREE.Vector3(...k.pos)), false, 'centripetal'),
      look: new THREE.CatmullRomCurve3(keys.map((k) => new THREE.Vector3(...k.look)), false, 'centripetal'),
      staticPos: null,
      staticLook: null,
    }
  }
  curveCache.set(chapterId, out)
  return out
}

export function createCameraRig(camera) {
  const lookCurrent = new THREE.Vector3(...CAMERA.default.look)
  const posCurrent = new THREE.Vector3(...CAMERA.default.pos)
  let initialized = false
  let lastChapterId = null

  function update(state, dt, progress) {
    let active = null
    for (const id of CHAPTER_IDS) {
      const c = chapterRange(id)
      if (progress >= c.start && progress < c.end) {
        active = c
        break
      }
    }
    const chapterId = active ? active.id : 'ch10'
    const t = active ? (progress - active.start) / (active.end - active.start) : 1
    const { pos, look, staticPos, staticLook } = curvesFor(chapterId)
    const samplePos = pos ? pos.getPointAt(THREE.MathUtils.clamp(t, 0, 1)) : staticPos
    const sampleLook = look ? look.getPointAt(THREE.MathUtils.clamp(t, 0, 1)) : staticLook

    if (!initialized) {
      posCurrent.copy(samplePos)
      lookCurrent.copy(sampleLook)
      initialized = true
    }

    // Cut, don't swim: chapter boundaries are hard cuts (covered by the #fade
    // dip). A damped fly-between would drag the camera through walls, the
    // cliff and the sea on the way to sets that live kilometers apart.
    if (chapterId !== lastChapterId) {
      lastChapterId = chapterId
      posCurrent.copy(samplePos)
      lookCurrent.copy(sampleLook)
    }

    // Exponential damping keeps movement fluid inside a chapter; reduced
    // motion snaps instead of drifting.
    const k = REDUCED_MOTION ? 1 : 1 - Math.exp(-4.5 * dt)
    posCurrent.lerp(samplePos, k)
    lookCurrent.lerp(sampleLook, k)

    // Handheld drift: tiny perpetual motion so no frame is perfectly still.
    const amp = REDUCED_MOTION ? 0 : 0.06
    camera.position.copy(posCurrent)
    camera.position.x += Math.sin(state.time * 0.45) * amp
    camera.position.y += Math.cos(state.time * 0.38) * amp * 0.7

    // Fall turbulence: high-frequency buffet that grows with the drop and the
    // reader's scroll velocity.
    if (chapterId === 'ch8' && !REDUCED_MOTION) {
      const shake = 0.04 + Math.min(Math.abs(state.smoothVelocity) * 0.0015, 0.12)
      camera.position.x += Math.sin(state.time * 13.0) * shake
      camera.position.y += Math.sin(state.time * 17.3 + 1.7) * shake * 0.7
      camera.position.z += Math.sin(state.time * 11.1 + 3.1) * shake * 0.5
    }

    camera.lookAt(lookCurrent)

    // FOV language: slightly longer lens in the intimate corridor, wider in
    // the open sky, widest in vertigo of the fall — plus the scroll kick.
    const fovOffset =
      chapterId === 'ch3' ? -4 :
      chapterId === 'ch6' || chapterId === 'ch7' ? 4 :
      chapterId === 'ch8' ? 6 : 0
    const kick = REDUCED_MOTION
      ? 0
      : Math.min(Math.abs(state.smoothVelocity) * MOTION.fovKickScale, MOTION.fovKickMax)
    const targetFov = CAMERA.fovBase + fovOffset + kick
    if (Math.abs(camera.fov - targetFov) > 0.02) {
      camera.fov += (targetFov - camera.fov) * 0.08
      camera.updateProjectionMatrix()
    }
  }

  return { update }
}
