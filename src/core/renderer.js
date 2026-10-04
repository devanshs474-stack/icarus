import * as THREE from 'three'
import { PALETTE, QUALITY } from '../config.js'

// Renderer, scene and camera in one place. The postprocessing EffectComposer
// (Phase 4) will wrap `renderer` without changing anything here except the
// resize hook, which will also call composer.setSize.
export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, QUALITY.dprCap))
  renderer.setSize(window.innerWidth, window.innerHeight, false)
  // Color-managed pipeline; matches the postprocessing chain added in Phase 4.
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.NoToneMapping // tone mapping moves into the effect chain in Phase 4

  // If the GPU takes the context away mid-story, degrade to the readable
  // text story instead of freezing on a dead canvas.
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault()
    console.warn('[Icarus] WebGL context lost — switching to the text-only story.')
    const fb = document.querySelector('#webgl-fallback')
    if (fb) fb.hidden = false
  })

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(PALETTE.obsidian)

  // far 3000: must exceed the sky sphere (1500) and sun distance (1200).
  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 3000)
  camera.position.set(0, 0, 10)

  function resize() {
    const w = window.innerWidth
    const h = window.innerHeight
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.setSize(w, h, false)
  }
  window.addEventListener('resize', resize)

  function dispose() {
    window.removeEventListener('resize', resize)
    renderer.dispose()
  }

  return { renderer, scene, camera, resize, dispose }
}
