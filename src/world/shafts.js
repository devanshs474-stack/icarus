import * as THREE from 'three'

// Volumetric-style sun shafts: additive billboard planes whose long axis is
// aligned with the sun direction, cylindrical-billboarded toward the camera
// (they spin around the light axis, never cross it). Opacity is driven from
// the director — strongest in the dawn and flight chapters.
function makeShaftTexture() {
  const w = 64
  const h = 256
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  const g = ctx.createLinearGradient(0, 0, 0, h)
  g.addColorStop(0, 'rgba(255,255,255,0)')
  g.addColorStop(0.35, 'rgba(255,255,255,0.55)')
  g.addColorStop(0.75, 'rgba(255,255,255,0.18)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  // Soften the sides.
  const side = ctx.createLinearGradient(0, 0, w, 0)
  side.addColorStop(0, 'rgba(0,0,0,1)')
  side.addColorStop(0.5, 'rgba(0,0,0,0)')
  side.addColorStop(1, 'rgba(0,0,0,1)')
  ctx.globalCompositeOperation = 'destination-out'
  ctx.fillStyle = side
  ctx.fillRect(0, 0, w, h)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

const COUNT = 6

export function createShafts() {
  const tex = makeShaftTexture()
  const group = new THREE.Group()

  const material = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
  material.toneMapped = false

  const shafts = []
  const offsets = [-30, -17, -5, 9, 20, 32]
  for (let i = 0; i < COUNT; i++) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(7 + (i % 3) * 4, 90), material)
    mesh.userData = { offset: offsets[i], phase: i * 1.7 }
    group.add(mesh)
    shafts.push(mesh)
  }
  group.visible = false

  const long = new THREE.Vector3()
  const toCam = new THREE.Vector3()
  const side = new THREE.Vector3()
  const center = new THREE.Vector3()
  const basis = new THREE.Matrix4()

  // sunDir: normalized direction TOWARD the sun. anchor: where the bundle
  // lives (usually near Icarus). opacity: 0..1. time: for slow drift.
  function update(sunDir, camera, anchor, opacity, time) {
    group.visible = opacity > 0.003
    if (!group.visible) return
    material.opacity = opacity
    long.copy(sunDir).normalize()

    // Bundle sits between the anchor and the sun.
    center.copy(anchor).addScaledVector(long, 34)

    // Shared screen-perpendicular axis: from the bundle toward the camera,
    // projected off the light axis.
    toCam.copy(camera.position).sub(center)
    toCam.addScaledVector(long, -toCam.dot(long)).normalize()
    side.crossVectors(long, toCam)

    for (const mesh of shafts) {
      const off = mesh.userData.offset + Math.sin(time * 0.05 + mesh.userData.phase) * 4
      mesh.position.copy(center).addScaledVector(side, off)
      mesh.position.addScaledVector(long, -6 + Math.sin(time * 0.03 + mesh.userData.phase) * 5)

      // Cylindrical billboard: plane's long axis = sunDir (+y), normal → camera.
      basis.makeBasis(side, long, toCam)
      mesh.quaternion.setFromRotationMatrix(basis)
    }
  }

  function dispose() {
    tex.dispose()
    material.dispose()
    for (const mesh of shafts) mesh.geometry.dispose()
  }

  return { group, update, dispose }
}
