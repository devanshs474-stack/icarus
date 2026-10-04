import * as THREE from 'three'
import { ICARUS, ICARUS_PATH, WORLD, chapterRange } from '../config.js'
import { createBody } from './procedural.js'
import { createWings } from './wings.js'
import { createDroplets } from './droplets.js'

// The Icarus director: maps global scroll progress onto the figure's position
// along ICARUS_PATH, its pose (joint targets blended every frame), wing flap,
// the melt/detach schedule, and the fall tumble.
//
// Poses are joint euler targets; blending is exponential toward the active
// pose so state changes never snap.

const STAND_OFFSET = 0.98 // root (hips) height above the ground when standing

const POSES = {
  stand: {
    torso: [0.02, 0.05, 0.015],
    head: [0, -0.04, 0],
    shoulderL: [0.15, 0, -0.16], elbowL: [-0.28, 0, 0.12],
    shoulderR: [0.15, 0, 0.16], elbowR: [-0.28, 0, -0.12],
    hipL: [-0.04, 0, -0.05], kneeL: [0.06, 0, 0],
    hipR: [0.08, 0, 0.05], kneeR: [0.2, 0, 0],
  },
  launch: {
    torso: [0.5, 0, 0],
    head: [-0.35, 0, 0],
    shoulderL: [1.9, 0, -0.5], elbowL: [-0.6, 0, 0],
    shoulderR: [1.9, 0, 0.5], elbowR: [-0.6, 0, 0],
    hipL: [-1.1, 0, 0.15], kneeL: [1.3, 0, 0],
    hipR: [-0.9, 0, -0.15], kneeR: [1.2, 0, 0],
  },
  fly: {
    torso: [0.32, 0, 0],
    head: [-0.45, 0, 0],
    shoulderL: [0.55, 0, -0.95], elbowL: [-0.55, 0, 0.1],
    shoulderR: [0.55, 0, 0.95], elbowR: [-0.55, 0, -0.1],
    hipL: [0.35, 0, 0.06], kneeL: [0.25, 0, 0],
    hipR: [0.15, 0, -0.06], kneeR: [0.45, 0, 0],
  },
  exult: {
    torso: [-0.15, 0, 0],
    head: [-0.6, 0, 0],
    shoulderL: [2.9, 0.2, -0.3], elbowL: [-0.15, 0, 0],
    shoulderR: [2.9, -0.2, 0.3], elbowR: [-0.15, 0, 0],
    hipL: [0.5, 0, 0.08], kneeL: [0.7, 0, 0],
    hipR: [0.3, 0, -0.08], kneeR: [0.5, 0, 0],
  },
  overreach: {
    torso: [-0.25, 0, 0],
    head: [-0.75, 0, 0],
    shoulderL: [3.0, 0.1, -0.2], elbowL: [-0.1, 0, 0],
    shoulderR: [3.0, -0.1, 0.2], elbowR: [-0.1, 0, 0],
    hipL: [0.6, 0, 0.08], kneeL: [0.8, 0, 0],
    hipR: [0.45, 0, -0.08], kneeR: [0.6, 0, 0],
  },
  fall: {
    torso: [0.15, 0, 0],
    head: [-0.15, 0, 0],
    shoulderL: [0.3, 0, -1.2], elbowL: [-0.3, 0, 0.15],
    shoulderR: [0.3, 0, 1.2], elbowR: [-0.3, 0, -0.15],
    hipL: [0.05, 0, -0.3], kneeL: [0.35, 0, 0],
    hipR: [0.1, 0, 0.3], kneeR: [0.5, 0, 0],
  },
  sea: {
    torso: [0.1, 0, 0],
    head: [0.5, 0, 0],
    shoulderL: [2.6, 0.4, -0.5], elbowL: [-0.2, 0, 0],
    shoulderR: [2.8, -0.3, 0.6], elbowR: [-0.15, 0, 0],
    hipL: [0.2, 0, 0.1], kneeL: [0.15, 0, 0],
    hipR: [0.05, 0, -0.1], kneeR: [0.2, 0, 0],
  },
}

// Path interpolation along a Catmull-Rom curve (uniform arc-length speed),
// matching the camera rig — no ease pulses at each key.
const pathCurveCache = new Map()

function samplePath(chapterId, t) {
  const keys = ICARUS_PATH[chapterId] || ICARUS_PATH.ch10
  if (!pathCurveCache.has(chapterId)) {
    pathCurveCache.set(
      chapterId,
      keys.length === 1
        ? { curve: null, point: new THREE.Vector3(...keys[0].pos) }
        : { curve: new THREE.CatmullRomCurve3(keys.map((k) => new THREE.Vector3(...k.pos)), false, 'centripetal'), point: null }
    )
  }
  const cached = pathCurveCache.get(chapterId)
  if (!cached.curve) return cached.point.clone()
  return cached.curve.getPointAt(THREE.MathUtils.clamp(t, 0, 1))
}

// Which pose a chapter should show; returns { pose, flap, fold, grounded }.
function stateFor(chapterId, t, melt) {
  switch (chapterId) {
    case 'ch2': case 'ch3': case 'ch4':
      return { pose: 'stand', flap: 0, fold: 0, grounded: true, base: 0.35 }
    case 'ch5':
      if (t < 0.22) return { pose: 'launch', flap: 0, fold: 0, grounded: t < 0.1, base: 0.3 }
      return { pose: 'fly', flap: 1, fold: 0, grounded: false, base: 0.3 }
    case 'ch6':
      return { pose: t > 0.35 && t < 0.75 ? 'exult' : 'fly', flap: 1, fold: 0, grounded: false, base: 0.3 }
    case 'ch7':
      return { pose: 'overreach', flap: 1, fold: 0, grounded: false, base: 0.4 }
    case 'ch8': {
      const fold = THREE.MathUtils.clamp((t - 0.15) * 1.6, 0, 1) * (0.4 + 0.6 * melt)
      const flap = t < 0.4 ? 1 - t * 1.2 : 0.15
      return { pose: 'fall', flap, fold, grounded: false, base: 0.15 }
    }
    default:
      return { pose: 'sea', flap: 0, fold: 0.9, grounded: false, base: 0.05 }
  }
}

export function createIcarus(scene) {
  const body = createBody()
  const wings = createWings(body.wingRootL, body.wingRootR)
  scene.add(body.group)
  // Attached feathers are wing-local — they must be children of the wing
  // roots so flap/fold rotations and the melt world-capture are correct.
  // Parenting them to the scene renders the cloud at the world origin.
  body.wingRootL.add(wings.meshes.attachedL)
  body.wingRootR.add(wings.meshes.attachedR)
  scene.add(wings.meshes.detached)

  const droplets = createDroplets(() => [
    body.wingRootL.getWorldPosition(new THREE.Vector3()),
    body.wingRootR.getWorldPosition(new THREE.Vector3()),
  ])
  scene.add(droplets.points)

  // Current blended joint rotations.
  const current = {}
  for (const name of Object.keys(POSES.stand)) current[name] = new THREE.Euler()

  const fallEuler = new THREE.Euler()
  let spinY = 0
  let bob = 0

  function update(state, dt, progress) {
    // Active chapter lookup (linear over 10 items).
    let active = null
    for (const c of chapterList()) {
      if (progress >= c.start && progress < c.end) {
        active = c
        break
      }
    }
    const chapterId = active ? active.id : 'ch10'
    const t = active ? (progress - active.start) / (active.end - active.start) : 1

    // Melt fraction 0..1 across the melt window.
    const melt = THREE.MathUtils.smoothstep(
      progress,
      ICARUS.meltStart,
      ICARUS.meltEnd
    )
    wings.setMelt(melt)

    const st = stateFor(chapterId, t, melt)

    // Position along the path; grounded states stand on the surface.
    const pos = samplePath(chapterId, t)
    if (st.grounded) pos.y += STAND_OFFSET
    if (chapterId === 'ch9' || chapterId === 'ch10') {
      bob += dt
      pos.y = WORLD.waterY + 0.42 + Math.sin(bob * 1.3) * 0.06
    }
    body.group.position.copy(pos)

    // Orientation per chapter: upright standing; pitched flight; tumbling fall.
    const targetEuler = new THREE.Euler()
    if (st.grounded || chapterId === 'ch2' || chapterId === 'ch3' || chapterId === 'ch4') {
      targetEuler.set(0, Math.PI, 0) // face -z toward the sea
    } else if (chapterId === 'ch5') {
      targetEuler.set(THREE.MathUtils.lerp(0.3, -0.15, t), Math.PI, 0)
    } else if (chapterId === 'ch6' || chapterId === 'ch7') {
      targetEuler.set(-0.1 + Math.sin(state.time * 0.8) * 0.06, Math.PI + Math.sin(state.time * 0.5) * 0.2, Math.sin(state.time * 0.7) * 0.08)
    } else if (chapterId === 'ch8') {
      // Slow tumble: pitch over into the dive while spinning.
      spinY += ICARUS.fallSpin * dt * (0.4 + melt)
      targetEuler.set(
        THREE.MathUtils.lerp(-0.1, Math.PI * 0.55, THREE.MathUtils.clamp(t * 1.15, 0, 1)),
        Math.PI + spinY,
        Math.sin(state.time * 1.1) * 0.15
      )
    } else {
      // Face-down on the water, rolling gently with the swell.
      targetEuler.set(Math.PI * 0.52, Math.PI + Math.sin(state.time * 0.4) * 0.2, Math.sin(state.time * 0.8) * 0.08)
    }
    fallEuler.x += (targetEuler.x - fallEuler.x) * (1 - Math.exp(-6 * dt))
    fallEuler.y += (targetEuler.y - fallEuler.y) * (1 - Math.exp(-6 * dt))
    fallEuler.z += (targetEuler.z - fallEuler.z) * (1 - Math.exp(-6 * dt))
    body.group.quaternion.setFromEuler(fallEuler)

    // Blend joints toward the active pose.
    const pose = POSES[st.pose]
    const k = 1 - Math.exp(-7 * dt)
    for (const [name, target] of Object.entries(pose)) {
      const e = current[name]
      e.x += (target[0] - e.x) * k
      e.y += (target[1] - e.y) * k
      e.z += (target[2] - e.z) * k
      body.joints[name].rotation.copy(e)
    }

    // Wing flap: driven by the state, plus a subtle idle drift. The left wing
    // spans local -x (mirrored), so raising it takes NEGATIVE z-rotation —
    // getting this sign backwards is what made both wings droop like a skirt.
    const flapPhase = state.time * (5.2 + st.flap * 1.5)
    const wingAngle = st.base + Math.sin(flapPhase) * 0.55 * st.flap - st.fold * 0.45
    body.wingRootL.rotation.z = -wingAngle
    body.wingRootR.rotation.z = wingAngle
    body.wingRootL.rotation.y = 0.15 + st.fold * 0.5
    body.wingRootR.rotation.y = -0.15 - st.fold * 0.5

    wings.updateAttached(state.time, st.flap, flapPhase, st.fold)
    wings.updateDetached(dt, state.time)

    // Wax droplets flow during the melt window.
    const meltWindow = THREE.MathUtils.clamp((progress - ICARUS.meltStart) / 0.1, 0, 1) *
      (1 - THREE.MathUtils.clamp((progress - 0.9) / 0.05, 0, 1))
    droplets.update(state, dt, meltWindow * 14)

    // The figure is offstage before the labyrinth.
    body.group.visible = progress > 0.045
  }

  // Cached chapter list (config order).
  let list = null
  function chapterList() {
    if (!list) {
      list = ['ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6', 'ch7', 'ch8', 'ch9', 'ch10'].map(chapterRange)
    }
    return list
  }

  function dispose() {
    body.dispose()
    wings.dispose()
    droplets.dispose()
  }

  return { group: body.group, update, dispose }
}
