import * as THREE from 'three'
import { WORLD } from '../config.js'

// The sun: a soft-edged disc with a corona falloff, kept far along the current
// sun direction and billboarded to the camera. The bloom pass turns the core
// into the near-white-gold climax of chapter VII.
const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const FRAG = /* glsl */ `
  uniform vec3 uTint;
  uniform float uGlow;
  varying vec2 vUv;

  void main() {
    float d = length(vUv - 0.5) * 2.0;          // 0 center → 1 edge
    float core = 1.0 - smoothstep(0.52, 0.62, d);
    float corona = exp(-d * d * 3.2) * 0.6;
    float halo = exp(-d * d * 1.1) * 0.22;
    vec3 col = uTint * (core * 1.6) + uTint * (corona + halo) * (0.35 + uGlow);
    float alpha = clamp(core + (corona + halo) * (0.4 + uGlow * 0.6), 0.0, 1.0);
    gl_FragColor = vec4(col, alpha);
  }
`

export function createSun() {
  const geometry = new THREE.PlaneGeometry(2, 2)
  const material = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
    // depthTest stays on: the sky sphere doesn't write depth, so the disc is
    // still visible everywhere outdoors, but walls can now occlude it.
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTint: { value: new THREE.Color('#ffe9c4') },
      uGlow: { value: 0.15 },
    },
  })

  const mesh = new THREE.Mesh(geometry, material)
  mesh.renderOrder = -9
  mesh.frustumCulled = false

  // Anamorphic streak: a wide thin additive canvas-gradient child of the
  // billboarded disc — the classic lens-flare smear when the sun is in frame.
  const streakCanvas = document.createElement('canvas')
  streakCanvas.width = 256
  streakCanvas.height = 16
  const sctx = streakCanvas.getContext('2d')
  const sg = sctx.createLinearGradient(0, 0, 256, 0)
  sg.addColorStop(0, 'rgba(255,230,190,0)')
  sg.addColorStop(0.5, 'rgba(255,240,220,0.85)')
  sg.addColorStop(1, 'rgba(255,230,190,0)')
  sctx.fillStyle = sg
  sctx.fillRect(0, 0, 256, 16)
  const streakTex = new THREE.CanvasTexture(streakCanvas)
  streakTex.colorSpace = THREE.SRGBColorSpace
  const streakMat = new THREE.MeshBasicMaterial({
    map: streakTex,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: false,
  })
  streakMat.toneMapped = false
  const streak = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), streakMat)
  streak.scale.set(1.9, 0.045, 1)
  streak.renderOrder = -8
  mesh.add(streak)

  const dir = new THREE.Vector3(0.5, 0.12, -0.8).normalize()

  // keys: [{p, dir, size, glow}] from config; a/b are the surrounding stops.
  function applyKeys(a, b, mix) {
    const d = new THREE.Vector3(...a.dir).normalize().lerp(new THREE.Vector3(...b.dir).normalize(), mix)
    dir.copy(d.normalize())
    mesh.position.copy(dir).multiplyScalar(WORLD.sunDistance)
    const size = THREE.MathUtils.lerp(a.size, b.size, mix)
    mesh.scale.set(size, size, 1)
    const glow = THREE.MathUtils.lerp(a.glow, b.glow, mix)
    material.uniforms.uGlow.value = glow
    // The streak widens and brightens with the corona (clamped so the climax
    // stays bright, not blown out).
    streak.scale.set(1.9 + glow * 1.6, 0.04 + glow * 0.012, 1)
    streakMat.opacity = Math.min(glow * 0.32, 0.55)
  }

  function update(camera) {
    mesh.quaternion.copy(camera.quaternion)
  }

  function dispose() {
    geometry.dispose()
    material.dispose()
    streakTex.dispose()
    streakMat.dispose()
    streak.geometry.dispose()
  }

  return { mesh, dir, applyKeys, update, dispose }
}
