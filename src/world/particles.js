import * as THREE from 'three'
import { QUALITY, REDUCED_MOTION } from '../config.js'

// Prologue dust motes — one draw call, custom soft-sprite point shader.
// The same file grows in later phases to hold the other pooled particle
// systems (embers, gulls, speed streaks, wax droplets).
export function createDust() {
  const COUNT = QUALITY.dustCount

  const positions = new Float32Array(COUNT * 3)
  const seeds = new Float32Array(COUNT)
  const sizes = new Float32Array(COUNT)

  for (let i = 0; i < COUNT; i++) {
    positions[i * 3 + 0] = (Math.random() * 2 - 1) * 14 // x
    positions[i * 3 + 1] = (Math.random() * 2 - 1) * 8  // y
    positions[i * 3 + 2] = (Math.random() * 2 - 1) * 8 - 2 // z, in front of the idle camera
    seeds[i] = Math.random() * Math.PI * 2
    sizes[i] = 0.6 + Math.random() * 2.2
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1))
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))

  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, QUALITY.dprCap) },
      uAmp: { value: REDUCED_MOTION ? 0.15 : 1.0 },
      uOpacity: { value: 0.5 },
      uColorWarm: { value: new THREE.Color(0xe8c46b) },
      uColorCool: { value: new THREE.Color(0x9db4c8) },
    },
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform float uPixelRatio;
      uniform float uAmp;
      attribute float aSeed;
      attribute float aSize;
      varying float vSeed;

      void main() {
        vSeed = aSeed;
        vec3 p = position;
        p.y += sin(uTime * 0.35 + aSeed) * 0.5 * uAmp;
        p.x += cos(uTime * 0.22 + aSeed * 1.7) * 0.4 * uAmp;
        vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        gl_PointSize = aSize * uPixelRatio * (18.0 / -mvPosition.z);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColorWarm;
      uniform vec3 uColorCool;
      uniform float uOpacity;
      varying float vSeed;

      void main() {
        float d = length(gl_PointCoord - 0.5);
        float alpha = smoothstep(0.5, 0.05, d);
        vec3 color = mix(uColorCool, uColorWarm, 0.5 + 0.5 * sin(vSeed));
        gl_FragColor = vec4(color, alpha * uOpacity);
      }
    `,
  })

  const points = new THREE.Points(geometry, material)
  points.frustumCulled = false

  function update(state, dt) {
    // Faster scroll stirs the dust; the cap keeps it subtle.
    const stir = 1 + Math.min(Math.abs(state.smoothVelocity) * 0.02, 3)
    material.uniforms.uTime.value += dt * stir

    // Gentle sideways sway with scroll velocity + slow vertical settle over
    // the whole spine, so the void feels like it responds to the reader.
    const sway = THREE.MathUtils.clamp(-state.smoothVelocity * 0.012, -0.9, 0.9)
    points.position.x += (sway - points.position.x) * 0.05
    points.position.y = state.progress * -5
  }

  function dispose() {
    geometry.dispose()
    material.dispose()
  }

  return { points, update, dispose }
}
