import * as THREE from 'three'
import { WORLD, QUALITY } from '../config.js'

// The sea: a large plane with three overlapping vertex waves, fresnel between
// deep/shallow tones, a sun glint along the light direction, and an expanding
// ripple ring triggered at the impact in chapter IX.
const VERT = /* glsl */ `
  uniform float uTime;
  uniform float uChop;
  varying vec3 vWorldPos;
  varying vec3 vNormal;

  float waveY(vec2 w) {
    float t = uTime;
    return
      sin(w.x * 0.055 + t * 0.7) * cos(w.y * 0.042 + t * 0.5) * 1.15 +
      sin(w.x * 0.14 - t * 0.9 + w.y * 0.1) * 0.42 +
      sin(w.y * 0.21 + t * 1.3) * 0.18;
  }

  void main() {
    // Transform the raw vertex once: the rotated plane lies flat at y=-25,
    // so wp.xz are true world coordinates. The earlier version built a world
    // position from local coords AND applied modelMatrix — double-transform
    // that stood the sea up as a vertical curtain wall.
    vec4 wp = modelMatrix * vec4(position, 1.0);
    float y = waveY(wp.xz) * uChop;

    // Normal from finite differences of the same wave field.
    float e = 2.0;
    float yL = waveY(wp.xz - vec2(e, 0.0));
    float yR = waveY(wp.xz + vec2(e, 0.0));
    float yD = waveY(wp.xz - vec2(0.0, e));
    float yU = waveY(wp.xz + vec2(0.0, e));
    vNormal = normalize(vec3(yL - yR, 2.0 * e, yD - yU));

    vWorldPos = vec3(wp.x, wp.y + y, wp.z);
    gl_Position = projectionMatrix * viewMatrix * vec4(vWorldPos, 1.0);
  }
`

const FRAG = /* glsl */ `
  uniform vec3 uDeep;
  uniform vec3 uShallow;
  uniform vec3 uSkyColor;
  uniform vec3 uSunDir;
  uniform vec3 uSunTint;
  uniform vec3 uCameraPos;
  uniform float uRippleT;      // seconds since impact; < 0 means idle
  uniform vec2 uRippleCenter;
  uniform float uGlint;
  varying vec3 vWorldPos;
  varying vec3 vNormal;

  void main() {
    vec3 viewDir = normalize(uCameraPos - vWorldPos);
    vec3 n = normalize(vNormal);

    // Fine ripple detail: two high-frequency moving sine layers perturb the
    // interpolated normal, fading with distance so the far sea stays glassy.
    float detailFade = 1.0 - smoothstep(60.0, 320.0, length(uCameraPos.xz - vWorldPos.xz));
    float d1 = sin(dot(vWorldPos.xz, vec2(0.9, 0.7)) + uTime * 2.2);
    float d2 = sin(dot(vWorldPos.xz, vec2(-0.6, 1.1)) + uTime * 1.7);
    n = normalize(n + vec3(d1, 0.0, d2) * 0.05 * detailFade);

    float fres = pow(1.0 - max(dot(n, viewDir), 0.0), 3.0);
    vec3 col = mix(uDeep, uShallow, fres * 0.65);

    // Sun glint: tight sparkle plus the elongated light column — the classic
    // sun path on water (the reflected vector is squeezed toward the
    // camera-sun azimuth, so the highlight smears vertically).
    vec3 sunDir = normalize(uSunDir);
    vec3 refl = reflect(-sunDir, n);
    float spec = pow(max(dot(refl, viewDir), 0.0), 220.0);
    float sheen = pow(max(dot(refl, viewDir), 0.0), 8.0);
    vec3 reflS = normalize(vec3(refl.x * 0.25, refl.y, refl.z));
    float column = pow(max(dot(reflS, viewDir), 0.0), 60.0);
    vec3 viewAz = normalize(vec3(viewDir.x, 0.0, viewDir.z));
    vec3 sunAz = normalize(vec3(sunDir.x, 0.0, sunDir.z));
    float azAlign = pow(max(dot(viewAz, sunAz), 0.0), 6.0);
    col += uSunTint * (spec * 2.4 + sheen * 0.12 + column * 0.7) * uGlint * (0.12 + 0.88 * azAlign);

    // Horizon water line: the distant sea reads as a distinct dark-blue
    // band right before it dissolves into the sky — the cue that says "sea".
    float dist = length(uCameraPos.xz - vWorldPos.xz);
    float horizonBand = smoothstep(500.0, 680.0, dist) * (1.0 - smoothstep(680.0, 790.0, dist));
    col = mix(col, uDeep * 1.35 + uSunTint * 0.06, horizonBand * 0.85);

    // Distance fade into the sky color for the horizon seam.
    col = mix(col, uSkyColor, 0.72 * smoothstep(170.0, 800.0, dist));

    // Impact ripple: one expanding ring, fading as it travels.
    if (uRippleT >= 0.0) {
      float r = uRippleT * 14.0;
      float d = length(vWorldPos.xz - uRippleCenter);
      float ring = exp(-pow((d - r) * 0.9, 2.0)) * exp(-uRippleT * 0.45);
      float ring2 = exp(-pow((d - r * 0.55) * 1.4, 2.0)) * exp(-uRippleT * 0.6);
      col += uSkyColor * (ring * 0.55 + ring2 * 0.3) + vec3(0.06) * ring;
    }

    gl_FragColor = vec4(col, 1.0);
  }
`

export function createOcean() {
  const geometry = new THREE.PlaneGeometry(4000, 4000, QUALITY.oceanSegments, QUALITY.oceanSegments)
  const material = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: {
      uTime: { value: 0 },
      uChop: { value: 1.0 },
      uDeep: { value: new THREE.Color('#06121c') },
      uShallow: { value: new THREE.Color('#1c4a6a') },
      uSkyColor: { value: new THREE.Color('#10141d') },
      uSunDir: { value: new THREE.Vector3(0.5, 0.12, -0.8).normalize() },
      uSunTint: { value: new THREE.Color('#ffe9c4') },
      uCameraPos: { value: new THREE.Vector3() },
      uRippleT: { value: -1 },
      uRippleCenter: { value: new THREE.Vector2(0, -140) },
      uGlint: { value: 1 },
    },
  })

  const mesh = new THREE.Mesh(geometry, material)
  mesh.rotation.x = -Math.PI / 2
  mesh.position.y = WORLD.waterY
  mesh.frustumCulled = false

  let rippleStarted = false
  function triggerRipple(x, z) {
    material.uniforms.uRippleT.value = 0
    material.uniforms.uRippleCenter.value.set(x, z)
    rippleStarted = true
  }

  function update(state, dt) {
    material.uniforms.uTime.value += dt
    material.uniforms.uCameraPos.value.copy(state.camera.position)
    if (rippleStarted) {
      material.uniforms.uRippleT.value += dt
    }
  }

  function dispose() {
    geometry.dispose()
    material.dispose()
  }

  return { mesh, triggerRipple, update, dispose }
}
