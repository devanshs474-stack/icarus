import * as THREE from 'three'
import { QUALITY } from '../config.js'

// Clouds: billboards with a procedurally painted canvas texture (soft blobs),
// drifting slowly. Opacity is driven per chapter — absent in the labyrinth,
// thick during the euphoric ascent, streaking past in the fall.
function makeCloudTexture() {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, size, size)
  for (let i = 0; i < 26; i++) {
    const x = size * (0.2 + Math.random() * 0.6)
    const y = size * (0.35 + Math.random() * 0.3)
    const r = size * (0.08 + Math.random() * 0.16)
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    const a = 0.10 + Math.random() * 0.16
    g.addColorStop(0, `rgba(255,255,255,${a})`)
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function makeGullTexture() {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  ctx.strokeStyle = 'rgba(232,230,223,0.9)'
  ctx.lineWidth = 4
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(10, 36)
  ctx.quadraticCurveTo(22, 22, 32, 32)
  ctx.quadraticCurveTo(42, 22, 54, 36)
  ctx.stroke()
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

export function createClouds() {
  const group = new THREE.Group()
  const cloudTex = makeCloudTexture()
  const gullTex = makeGullTexture()

  const clouds = []
  for (let i = 0; i < QUALITY.cloudCount; i++) {
    const mat = new THREE.SpriteMaterial({
      map: cloudTex,
      transparent: true,
      depthWrite: false,
      opacity: 0,
      color: 0xdfe8f2,
    })
    const s = new THREE.Sprite(mat)
    const scale = 40 + Math.random() * 90
    s.scale.set(scale, scale * (0.4 + Math.random() * 0.25), 1)
    s.position.set(
      (Math.random() * 2 - 1) * 160,
      8 + Math.random() * 130,
      -30 - Math.random() * 140
    )
    s.userData = { drift: 0.4 + Math.random() * 0.8, baseOpacity: 0.5 + Math.random() * 0.4 }
    group.add(s)
    clouds.push(s)
  }

  // Gulls wheeling below the cliff at takeoff.
  const gulls = []
  for (let i = 0; i < QUALITY.gullCount; i++) {
    const mat = new THREE.SpriteMaterial({
      map: gullTex,
      transparent: true,
      depthWrite: false,
      opacity: 0,
    })
    const s = new THREE.Sprite(mat)
    s.scale.set(2.2, 2.2, 1)
    s.userData = {
      cx: (Math.random() * 2 - 1) * 30,
      cz: -10 - Math.random() * 30,
      r: 6 + Math.random() * 14,
      speed: 0.6 + Math.random() * 0.9,
      phase: Math.random() * Math.PI * 2,
      y: 4 + Math.random() * 22,
    }
    group.add(s)
    gulls.push(s)
  }

  // opacity: 0..1 master control from the director; timeScale boosts drift
  // with scroll velocity so clouds streak past during the fall.
  function update(state, dt, opacity, timeScale) {
    for (const c of clouds) {
      c.material.opacity = c.userData.baseOpacity * opacity
      c.position.x += c.userData.drift * dt * 2 * timeScale
      if (c.position.x > 180) c.position.x = -180
    }
    for (const g of gulls) {
      g.material.opacity = opacity * 0.85
      const u = g.userData
      const a = state.time * u.speed + u.phase
      g.position.set(u.cx + Math.cos(a) * u.r, u.y + Math.sin(a * 2.3) * 1.5, u.cz + Math.sin(a) * u.r * 0.6)
    }
  }

  function dispose() {
    cloudTex.dispose()
    gullTex.dispose()
    for (const c of clouds) c.material.dispose()
    for (const g of gulls) g.material.dispose()
  }

  return { group, update, dispose }
}
