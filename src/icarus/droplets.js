import * as THREE from 'three'
import { WORLD } from '../config.js'

// Glowing wax droplets: an additive Points pool emitted from the wing roots
// while the wax melts, falling with the body and dying at the sea surface.
const CAP = 90

export function createDroplets(getEmitterPositions) {
  const positions = new Float32Array(CAP * 3)
  const life = new Float32Array(CAP).fill(-1) // -1 = dead
  const vel = new Float32Array(CAP * 3)
  const speeds = new Float32Array(CAP)

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('aLife', new THREE.BufferAttribute(life, 1))

  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
      uColor: { value: new THREE.Color(0xffc46b) },
    },
    vertexShader: /* glsl */ `
      uniform float uPixelRatio;
      attribute float aLife;
      varying float vLife;
      void main() {
        vLife = aLife;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        gl_PointSize = (2.0 + aLife * 3.0) * uPixelRatio * (14.0 / -mvPosition.z);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      varying float vLife;
      void main() {
        if (vLife <= 0.0) discard;
        float d = length(gl_PointCoord - 0.5);
        float alpha = smoothstep(0.5, 0.05, d) * vLife;
        gl_FragColor = vec4(uColor, alpha);
      }
    `,
  })

  const points = new THREE.Points(geometry, material)
  points.frustumCulled = false

  let acc = 0

  function emit(origin) {
    for (let i = 0; i < CAP; i++) {
      if (life[i] < 0) {
        positions[i * 3] = origin.x
        positions[i * 3 + 1] = origin.y
        positions[i * 3 + 2] = origin.z
        vel[i * 3] = (Math.random() - 0.5) * 0.8
        vel[i * 3 + 1] = 0.2 + Math.random() * 0.4
        vel[i * 3 + 2] = (Math.random() - 0.5) * 0.8
        life[i] = 1
        speeds[i] = 0.55 + Math.random() * 0.5
        return
      }
    }
  }

  function update(state, dt, emitRate) {
    acc += emitRate * dt
    while (acc >= 1) {
      const origins = getEmitterPositions()
      emit(origins[Math.floor(Math.random() * origins.length)])
      acc -= 1
    }
    for (let i = 0; i < CAP; i++) {
      if (life[i] < 0) continue
      life[i] -= dt * speeds[i] * 0.5
      vel[i * 3 + 1] -= 5.5 * dt
      positions[i * 3] += vel[i * 3] * dt
      positions[i * 3 + 1] += vel[i * 3 + 1] * dt
      positions[i * 3 + 2] += vel[i * 3 + 2] * dt
      if (positions[i * 3 + 1] < WORLD.waterY + 0.1) life[i] = -1
    }
    geometry.attributes.position.needsUpdate = true
    geometry.attributes.aLife.needsUpdate = true
  }

  function dispose() {
    geometry.dispose()
    material.dispose()
  }

  return { points, update, dispose }
}
