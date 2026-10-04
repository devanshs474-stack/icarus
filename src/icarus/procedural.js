import * as THREE from 'three'

// Procedural Icarus: a lathe-sculpted classical figure. Every limb is a
// LatheGeometry built from a muscle profile (deltoid bulge, elbow/knee taper,
// calf swell) rather than uniform capsules — that's what separates a body
// from a stick figure. Root origin sits at the hips; grounded poses add a
// feet offset (see STAND_OFFSET in states.js).
export function createBody() {
  const group = new THREE.Group()

  const marble = new THREE.MeshStandardMaterial({
    color: 0xefe7d8,
    roughness: 0.46,
    metalness: 0.02,
    envMapIntensity: 0.85,
    emissive: 0x4a4238,
    emissiveIntensity: 0.1,
  })
  const bronze = new THREE.MeshStandardMaterial({
    color: 0xc09a55,
    roughness: 0.3,
    metalness: 0.92,
    envMapIntensity: 1.25,
  })
  const hairMat = new THREE.MeshStandardMaterial({
    color: 0x3d2c1e,
    roughness: 0.62,
    metalness: 0.05,
    envMapIntensity: 0.6,
  })
  const cloth = new THREE.MeshStandardMaterial({
    color: 0x2c4258,
    roughness: 0.88,
    metalness: 0,
    side: THREE.DoubleSide,
    envMapIntensity: 0.5,
  })

  const joints = {}
  const addJoint = (name, parent, x, y, z) => {
    const j = new THREE.Group()
    j.position.set(x, y, z)
    parent.add(j)
    joints[name] = j
    return j
  }

  const mesh = (geo, mat, parent, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(geo, mat)
    m.position.set(x, y, z)
    parent.add(m)
    return m
  }

  // Lathe a 2D profile ([radius, y] pairs, y downward-negative for limbs)
  // around the Y axis. Profiles use smooth-ish point density so shading is soft.
  const lathe = (profile, mat, parent, x = 0, y = 0, z = 0, seg = 18) => {
    const pts = profile.map(([r, py]) => new THREE.Vector2(Math.max(r, 0.001), py))
    return mesh(new THREE.LatheGeometry(pts, seg), mat, parent, x, y, z)
  }

  // ── Pelvis + kilt ──────────────────────────────────────────────────────────
  const hips = addJoint('hips', group, 0, 0, 0)
  lathe(
    [[0.09, 0.1], [0.13, 0.06], [0.155, 0], [0.15, -0.08], [0.125, -0.15], [0.1, -0.18]],
    marble, hips, 0, 0, 0
  ).scale.z = 0.78
  const kilt = mesh(new THREE.CylinderGeometry(0.18, 0.25, 0.34, 16, 1, true), cloth, hips, 0, -0.1, 0)
  kilt.rotation.y = Math.PI / 14
  // Sash diagonally across the waist.
  const sash = mesh(new THREE.BoxGeometry(0.34, 0.07, 0.02), cloth, hips, 0.02, 0.08, 0.15)
  sash.rotation.z = 0.5

  // ── Torso: sculpted chest tapering to the waist, flattened front-to-back ──
  const torso = addJoint('torso', hips, 0, 0.1, 0)
  lathe(
    [
      [0.12, 0], [0.14, 0.06], [0.135, 0.12], [0.128, 0.18],
      [0.15, 0.26], [0.175, 0.33], [0.19, 0.4], [0.185, 0.46], [0.15, 0.52], [0.11, 0.55],
    ],
    marble, torso, 0, 0, 0
  ).scale.z = 0.74
  // Pectorals + shoulder deltoids for the classical V silhouette.
  for (const sx of [-1, 1]) {
    const pec = mesh(new THREE.SphereGeometry(0.072, 14, 10), marble, torso, sx * 0.072, 0.4, 0.1)
    pec.scale.set(1.1, 0.72, 0.55)
    const delt = mesh(new THREE.SphereGeometry(0.07, 12, 10), marble, torso, sx * 0.2, 0.46, 0)
    delt.scale.set(0.9, 1.15, 0.9)
  }
  // Abdomen ridge hint.
  const abdomen = mesh(new THREE.SphereGeometry(0.06, 12, 8), marble, torso, 0, 0.18, 0.09)
  abdomen.scale.set(1.6, 1.9, 0.4)
  mesh(new THREE.CylinderGeometry(0.155, 0.165, 0.08, 16), bronze, torso, 0, 0.05, 0) // bronze belt

  // ── Head: skull, jaw, nose, hair cap, laurel ───────────────────────────────
  const head = addJoint('head', torso, 0, 0.58, 0)
  mesh(new THREE.CylinderGeometry(0.048, 0.06, 0.12, 10), marble, head, 0, 0.01, 0)
  const trapez = mesh(new THREE.SphereGeometry(0.075, 12, 10), marble, head, 0, 0.045, -0.02)
  trapez.scale.set(1.5, 0.7, 1.0) // neck-to-shoulder slope
  const skull = mesh(new THREE.SphereGeometry(0.122, 20, 16), marble, head, 0, 0.16, 0)
  skull.scale.set(0.92, 1.1, 0.98)
  const jaw = mesh(new THREE.SphereGeometry(0.085, 14, 12), marble, head, 0, 0.1, 0.02)
  jaw.scale.set(0.85, 0.7, 0.9)
  const nose = mesh(new THREE.ConeGeometry(0.02, 0.06, 8), marble, head, 0, 0.15, 0.115)
  nose.rotation.x = Math.PI / 2.1
  const hair = mesh(new THREE.SphereGeometry(0.126, 18, 14), hairMat, head, 0, 0.175, -0.014)
  hair.scale.set(0.95, 0.92, 1.0)
  const bun = mesh(new THREE.SphereGeometry(0.05, 10, 8), hairMat, head, 0, 0.13, -0.11)
  const laurel = mesh(new THREE.TorusGeometry(0.114, 0.015, 8, 24), bronze, head, 0, 0.2, 0)
  laurel.rotation.x = Math.PI / 2.15

  // ── Arms: deltoid → biceps swell → elbow → forearm taper → hand ───────────
  for (const side of ['L', 'R']) {
    const sx = side === 'L' ? -1 : 1
    const shoulder = addJoint(`shoulder${side}`, torso, sx * 0.21, 0.46, 0)
    lathe(
      [[0.062, 0], [0.066, -0.05], [0.058, -0.12], [0.05, -0.2], [0.044, -0.28], [0.042, -0.31]],
      marble, shoulder
    )
    const elbow = addJoint(`elbow${side}`, shoulder, 0, -0.31, 0)
    mesh(new THREE.SphereGeometry(0.045, 10, 8), marble, elbow, 0, 0, 0)
    lathe(
      [[0.045, 0], [0.05, -0.06], [0.044, -0.14], [0.036, -0.2], [0.03, -0.26], [0.028, -0.28]],
      marble, elbow
    )
    mesh(new THREE.SphereGeometry(0.05, 10, 8), bronze, elbow, 0, -0.27, 0) // wax bracer
    const hand = mesh(new THREE.SphereGeometry(0.048, 10, 8), marble, elbow, 0, -0.34, 0)
    hand.scale.set(0.72, 1.25, 0.5)
  }

  // ── Legs: thigh swell → knee → calf → ankle → foot ────────────────────────
  for (const side of ['L', 'R']) {
    const sx = side === 'L' ? -1 : 1
    const hip = addJoint(`hip${side}`, hips, sx * 0.095, -0.16, 0)
    lathe(
      [[0.078, 0], [0.082, -0.06], [0.07, -0.16], [0.058, -0.28], [0.052, -0.36], [0.05, -0.4]],
      marble, hip
    )
    const knee = addJoint(`knee${side}`, hip, 0, -0.4, 0)
    mesh(new THREE.SphereGeometry(0.052, 10, 8), marble, knee, 0, 0, 0)
    lathe(
      [[0.05, 0], [0.056, -0.07], [0.045, -0.16], [0.034, -0.26], [0.03, -0.33], [0.029, -0.36]],
      marble, knee
    )
    const foot = mesh(new THREE.BoxGeometry(0.085, 0.045, 0.22), bronze, knee, 0, -0.4, 0.04)
    foot.rotation.x = 0.04
  }

  // Wing roots: high on the back, where the wax binds the wings.
  const wingRootL = addJoint('wingRootL', torso, -0.13, 0.4, -0.12)
  const wingRootR = addJoint('wingRootR', torso, 0.13, 0.4, -0.12)

  function dispose() {
    for (const m of Object.values(joints)) {
      m.traverse((node) => {
        if (node.isMesh) node.geometry.dispose()
      })
    }
    marble.dispose()
    bronze.dispose()
    hairMat.dispose()
    cloth.dispose()
  }

  return { group, joints, wingRootL, wingRootR, dispose }
}
