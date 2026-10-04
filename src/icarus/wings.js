import * as THREE from 'three'
import { ICARUS, WORLD } from '../config.js'

// Wings: Daedalus's construction — a bronze leading-edge arm arching out and
// up on each side (mirrored), finger struts fanning from the wrist, and
// layered feathers: long separated primaries at the tip, stacked secondaries,
// short gold-tinged coverts at the root. Feather quills point outward along
// the span and sweep back toward the trailing edge; quaternions orient them.
//
// Feathers are indexed TIP FIRST, so melting trims by count. Detached
// feathers move to a world-space InstancedMesh with scripted physics.
const { rows, perRow, layers } = ICARUS.featherCountPerWing
const PER_WING = rows * perRow * layers
const TOTAL = PER_WING * 2

const UP = new THREE.Vector3(0, 1, 0)
const Q_FLIP = new THREE.Quaternion().setFromAxisAngle(UP, Math.PI) // R → L mirror

export function createWings(wingRootL, wingRootR) {
  // Feather geometry: tapered toward the tip with a gentle lengthwise curve.
  function makeFeatherGeometry(width, length) {
    const geom = new THREE.PlaneGeometry(width, length, 2, 8)
    geom.translate(0, length / 2, 0) // quill at y=0, tip at y=length
    const pos = geom.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const y = pos.getY(i)
      const t = y / length
      const taper = 1 - 0.72 * t * t
      const cup = Math.sin(t * Math.PI) * length * 0.1
      pos.setX(i, x * taper)
      pos.setZ(i, cup)
    }
    geom.computeVertexNormals()
    return geom
  }

  const featherGeom = makeFeatherGeometry(ICARUS.featherSize[0], ICARUS.featherSize[1])

  const featherMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.6,
    metalness: 0.0,
    side: THREE.DoubleSide,
    envMapIntensity: 0.95,
    // A faint warm emissive keeps backlit feather undersides from melting
    // into a bright sky during the flight chapters.
    emissive: 0x8a7a5c,
    emissiveIntensity: 0.18,
  })

  const S = ICARUS.wingSpread

  // Leading-edge arc, right-wing space: u 0 (root) → 1 (tip). Rises and
  // sweeps back. The left wing mirrors x and z.
  function arcPoint(u, out) {
    out.set(u * S, 0.08 + 0.24 * u * u, -(0.05 + 0.26 * u * u))
    return out
  }
  function arcTangent(u, out) {
    out.set(S, 0.48 * u, -0.52 * u).normalize()
    return out
  }

  // Zone-based feather length: primaries at the tip reach ~1.5×, coverts ~0.6×.
  function lengthScale(u) {
    if (u > 0.62) return 0.95 + 0.55 * ((u - 0.62) / 0.38)
    if (u > 0.25) return 0.78 + 0.17 * ((u - 0.25) / 0.37)
    return 0.6
  }

  // Tip-first layout for the RIGHT wing; the left mirrors position and
  // orientation (point-reflection through the wing root's y axis).
  function layoutRight(i) {
    const k = i % PER_WING
    const row = Math.floor(k / (perRow * layers))
    const rem = k % (perRow * layers)
    const col = Math.floor(rem / layers)
    const layer = rem % layers
    const u = 1 - row / (rows - 1)

    const base = arcPoint(u, new THREE.Vector3())
    // Chord direction: backward, slightly drooping.
    const chord = new THREE.Vector3(0, -0.09, -1).normalize()
    const gap = ICARUS.featherSize[0] * (0.6 + (u > 0.62 ? 0.45 : 0))
    const pos = base
      .addScaledVector(chord, 0.02 + col * gap)
      .add(new THREE.Vector3(0, (layer - 0.5) * 0.05, 0))

    // Quill direction: outward along the span tangent, blending toward the
    // chord as u grows — root feathers point out, primaries sweep back.
    const spanT = arcTangent(u, new THREE.Vector3())
    const dir = spanT
      .multiplyScalar(1 - 0.3 * u)
      .addScaledVector(chord, 0.35 + 0.5 * u)
      .add(new THREE.Vector3(0, -0.1 - col * 0.012, 0))
      .normalize()

    const quat = new THREE.Quaternion().setFromUnitVectors(UP, dir)
    // Vane twist per column so the fan doesn't look stamped.
    quat.multiply(new THREE.Quaternion().setFromAxisAngle(UP, col * 0.06))

    return { pos, quat, u, col, lenScale: lengthScale(u) }
  }

  const featherData = []
  const featherTints = []
  for (let i = 0; i < TOTAL; i++) {
    const wing = i < PER_WING ? 'R' : 'L'
    const right = layoutRight(i)
    let pos, quat
    if (wing === 'R') {
      pos = right.pos
      quat = right.quat
    } else {
      pos = new THREE.Vector3(-right.pos.x, right.pos.y, -right.pos.z)
      quat = Q_FLIP.clone().multiply(right.quat)
    }
    featherData.push({ wing, pos, quat, u: right.u, col: right.col, lenScale: right.lenScale })

    const v = 0.9 + Math.random() * 0.1
    if (right.u < 0.25) featherTints.push(new THREE.Color(0.91 * v, 0.85 * v, 0.7 * v))
    else if (right.u < 0.62) featherTints.push(new THREE.Color(0.96 * v, 0.94 * v, 0.87 * v))
    else featherTints.push(new THREE.Color(0.99 * v, 0.98 * v, 0.95 * v))
  }

  const dummy = new THREE.Object3D()
  const wingRoots = { R: wingRootR, L: wingRootL }

  const attachedL = new THREE.InstancedMesh(featherGeom, featherMat, PER_WING)
  const attachedR = new THREE.InstancedMesh(featherGeom, featherMat, PER_WING)
  const attached = { R: attachedR, L: attachedL }
  attachedL.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  attachedR.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  // Instances move every frame but InstancedMesh only computes its bounding
  // sphere once — a stale sphere culled the wings when the camera angle
  // changed (the corridor close-up lost its feathers). They live and die with
  // the figure, so just never cull them.
  attachedL.frustumCulled = false
  attachedR.frustumCulled = false

  const detached = new THREE.InstancedMesh(featherGeom, featherMat, TOTAL)
  detached.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  detached.frustumCulled = false
  detached.count = 0

  for (const side of ['L', 'R']) {
    for (let k = 0; k < PER_WING; k++) {
      attached[side].setColorAt(k, featherTints[side === 'R' ? k : PER_WING + k])
    }
    attached[side].instanceColor.needsUpdate = true
  }
  for (let i = 0; i < TOTAL; i++) detached.setColorAt(i, featherTints[i])
  detached.instanceColor.needsUpdate = true

  // The wing's bronze bones per side: leading-edge arm along the arc (mirrored
  // for the left), wrist joint, and finger struts fanning into the primaries.
  const spineMat = new THREE.MeshStandardMaterial({
    color: 0xe8c46b,
    roughness: 0.3,
    metalness: 0.9,
    transparent: true,
    envMapIntensity: 1.3,
  })
  const bonesBySide = { R: [], L: [] }
  for (const side of ['L', 'R']) {
    const mirror = side === 'L'
    const map = (p) => (mirror ? new THREE.Vector3(-p.x, p.y, -p.z) : p)

    const armPts = []
    for (let j = 0; j <= 6; j++) armPts.push(map(arcPoint(j / 6, new THREE.Vector3())))
    const arm = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(armPts), 16, 0.022, 6), spineMat)
    wingRoots[side].add(arm)
    bonesBySide[side].push(arm)

    const wrist = map(arcPoint(0.62, new THREE.Vector3()))
    const joint = new THREE.Mesh(new THREE.SphereGeometry(0.034, 10, 8), spineMat)
    joint.position.copy(wrist)
    wingRoots[side].add(joint)
    bonesBySide[side].push(joint)

    for (const [fu, drop] of [[0.78, -0.12], [0.9, -0.2], [1.0, -0.3]]) {
      const tipP = map(arcPoint(fu, new THREE.Vector3()))
      tipP.y += drop
      const mid = wrist.clone().lerp(tipP, 0.5)
      mid.y -= 0.06
      const strut = new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3([wrist.clone(), mid, tipP]), 8, 0.011, 5),
        spineMat
      )
      wingRoots[side].add(strut)
      bonesBySide[side].push(strut)
    }

    const socket = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), spineMat)
    socket.position.set(0, 0.02, 0.01)
    wingRoots[side].add(socket)
    bonesBySide[side].push(socket)
  }

  // ── Melt / detach state ────────────────────────────────────────────────────
  let detachedCount = 0
  const physics = new Map()
  const tmpMat = new THREE.Matrix4()
  const tmpQuat = new THREE.Quaternion()
  const tmpEuler = new THREE.Euler()
  const worldPos = new THREE.Vector3()
  const worldQuat = new THREE.Quaternion()
  const worldScale = new THREE.Vector3()
  const twistQ = new THREE.Quaternion()
  const twistAxis = new THREE.Vector3(0, 1, 0)

  function setMelt(m) {
    const target = Math.round(THREE.MathUtils.clamp(m, 0, 1) * TOTAL)
    while (detachedCount < target) {
      const i = detachedCount
      const fd = featherData[i]
      const sideMesh = attached[fd.wing]
      const localIndex = i % PER_WING
      sideMesh.getMatrixAt(localIndex, tmpMat)
      wingRoots[fd.wing].updateWorldMatrix(true, false)
      tmpMat.premultiply(wingRoots[fd.wing].matrixWorld)
      tmpMat.decompose(worldPos, worldQuat, worldScale)

      physics.set(i, {
        pos: worldPos.clone(),
        quat: worldQuat.clone(),
        vel: new THREE.Vector3(
          (Math.random() - 0.5) * 1.2,
          0.4 + Math.random() * 0.6,
          (Math.random() - 0.5) * 1.2 - 0.6
        ),
        angVel: new THREE.Vector3((Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3),
        phase: Math.random() * Math.PI * 2,
        afloat: false,
        lenScale: fd.lenScale,
      })
      detachedCount++
    }
    attachedR.count = PER_WING - Math.min(detachedCount, PER_WING)
    attachedL.count = PER_WING - Math.max(0, detachedCount - PER_WING)
    // Wing bones dissolve with the wax.
    spineMat.opacity = 1 - THREE.MathUtils.clamp(m * 1.15, 0, 1)
    for (const side of ['L', 'R']) {
      for (const b of bonesBySide[side]) b.visible = spineMat.opacity > 0.02
    }
  }

  // ── Per-frame updates ──────────────────────────────────────────────────────
  function updateAttached(time, flapAmp, flapPhase, fold) {
    for (const side of ['L', 'R']) {
      const s = side === 'R' ? 1 : -1
      const im = attached[side]
      const n = im.count
      for (let k = 0; k < n; k++) {
        const i = side === 'R' ? k : PER_WING + k
        const fd = featherData[i]
        // Fold draws the span in toward the spine.
        dummy.position.set(
          fd.pos.x * (1 - fold * 0.5),
          fd.pos.y,
          fd.pos.z + s * fold * 0.25
        )
        // Gentle flutter + traveling twist wave along the span.
        const wave = Math.sin(time * 5.2 - fd.u * 1.9 + flapPhase * 0.3)
        dummy.position.y += Math.sin(time * 3 + fd.col * 0.7 + flapPhase) * 0.012 * flapAmp
        dummy.quaternion.copy(fd.quat)
        twistQ.setFromAxisAngle(twistAxis, wave * 0.1 * flapAmp + fold * 0.45)
        dummy.quaternion.multiply(twistQ)
        dummy.scale.setScalar(fd.lenScale)
        dummy.updateMatrix()
        im.setMatrixAt(k, dummy.matrix)
      }
      im.instanceMatrix.needsUpdate = true
    }
  }

  function updateDetached(dt, time) {
    if (detachedCount === 0) return
    for (const [i, p] of physics) {
      if (!p.afloat) {
        p.vel.y -= 4.2 * dt // feathers fall slow: high drag
        p.vel.multiplyScalar(1 - 1.35 * dt)
        p.vel.x += Math.sin(time * 2.2 + p.phase) * 0.55 * dt
        p.vel.z += Math.cos(time * 1.9 + p.phase * 1.3) * 0.55 * dt
        p.pos.addScaledVector(p.vel, dt)
        tmpEuler.set(p.angVel.x * dt, p.angVel.y * dt, p.angVel.z * dt)
        tmpQuat.setFromEuler(tmpEuler)
        p.quat.premultiply(tmpQuat)
        p.angVel.multiplyScalar(1 - 0.8 * dt)

        const surface = WORLD.waterY + 0.1
        if (p.pos.y <= surface) {
          p.afloat = true
          p.pos.y = surface
        }
      } else {
        p.pos.y = WORLD.waterY + 0.1 + Math.sin(time * 1.1 + p.phase) * 0.045
        p.pos.x += Math.sin(time * 0.5 + p.phase) * 0.02 * dt * 60
        p.pos.z += Math.cos(time * 0.43 + p.phase) * 0.02 * dt * 60
        const flat = new THREE.Quaternion().setFromEuler(
          new THREE.Euler(-Math.PI / 2 + Math.sin(time + p.phase) * 0.08, p.phase, 0)
        )
        p.quat.slerp(flat, 1 - Math.exp(-1.6 * dt))
      }
      dummy.position.copy(p.pos)
      dummy.quaternion.copy(p.quat)
      dummy.scale.setScalar(p.lenScale)
      dummy.updateMatrix()
      detached.setMatrixAt(i, dummy.matrix)
    }
    detached.count = detachedCount
    detached.instanceMatrix.needsUpdate = true
  }

  function initialPose() {
    updateAttached(0, 0, 0, 0)
  }
  initialPose()

  function dispose() {
    featherGeom.dispose()
    featherMat.dispose()
    spineMat.dispose()
    for (const side of ['L', 'R']) {
      for (const b of bonesBySide[side]) b.geometry.dispose()
    }
    attachedL.dispose()
    attachedR.dispose()
    detached.dispose()
  }

  return {
    meshes: { attachedL, attachedR, detached },
    setMelt,
    updateAttached,
    updateDetached,
    getTotal: () => TOTAL,
    dispose,
  }
}
