import * as THREE from 'three'
import { WORLD } from '../config.js'

// Sky: an inverted sphere centered on the camera. The gradient runs
// top → horizon → bottom, with a warm glow term around the sun direction and
// procedural stars that fade in for the prologue and epilogue.
const VERT = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`

const FRAG = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uHorizon;
  uniform vec3 uBottom;
  uniform vec3 uSunDir;
  uniform vec3 uSunTint;
  uniform float uGlow;
  uniform float uStars;
  uniform float uClouds;
  uniform float uHaze;
  uniform float uTime;
  varying vec3 vDir;

  float hash(vec3 p) {
    p = fract(p * 443.8975);
    p += dot(p, p.yzx + 19.19);
    return fract((p.x + p.y) * p.z);
  }

  void main() {
    vec3 dir = normalize(vDir);
    float h = dir.y;

    // Vertical gradient: bottom below the horizon line, top above.
    vec3 sky = h >= 0.0
      ? mix(uHorizon, uTop, pow(min(h, 1.0), 0.55))
      : mix(uHorizon, uBottom, pow(min(-h, 1.0), 0.7));

    // Warm glow around the sun direction (stronger near the horizon).
    float sunAmt = max(dot(dir, normalize(uSunDir)), 0.0);
    sky += uSunTint * pow(sunAmt, 6.0) * uGlow * 0.55;
    sky += uSunTint * pow(sunAmt, 1.6) * uGlow * 0.08;

    // Horizon haze band: thickens the seam between sea and sky.
    float band = exp(-abs(h) * 9.0);
    sky = mix(sky, uHorizon * 1.25 + uSunTint * uGlow * 0.08, band * uHaze);

    // Wispy high cloud bands: cheap layered sines over the azimuth, gated to
    // the mid sky. They catch the sun tint on the sun-facing side.
    if (uClouds > 0.001 && h > 0.03 && h < 0.85) {
      float az = atan(dir.z, dir.x);
      float w = sin(az * 3.0 + sin(h * 14.0) * 2.0 + uTime * 0.004)
              * sin(az * 7.0 - uTime * 0.006 + h * 20.0);
      float cloud = smoothstep(0.25, 0.85, w) * smoothstep(0.03, 0.14, h) * smoothstep(0.85, 0.4, h);
      vec3 cloudCol = mix(uTop, uSunTint, 0.3) * 1.06;
      sky = mix(sky, cloudCol, cloud * uClouds * (0.35 + 0.4 * sunAmt));
    }

    // Stars: sparse high-frequency sparks, gated to the upper hemisphere.
    if (uStars > 0.001 && h > 0.05) {
      vec3 cell = floor(dir * 220.0);
      float s = hash(cell);
      float star = smoothstep(0.997, 1.0, s);
      float twinkle = 0.7 + 0.3 * sin(s * 90.0);
      sky += vec3(0.9, 0.95, 1.0) * star * uStars * twinkle * 0.85;
    }

    gl_FragColor = vec4(sky, 1.0);
  }
`

export function createSky() {
  const geometry = new THREE.SphereGeometry(WORLD.skyRadius, 48, 32)
  const material = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uTop: { value: new THREE.Color('#05070c') },
      uHorizon: { value: new THREE.Color('#10141d') },
      uBottom: { value: new THREE.Color('#04050a') },
      uSunDir: { value: new THREE.Vector3(0.5, 0.12, -0.8).normalize() },
      uSunTint: { value: new THREE.Color('#e8c46b') },
      uGlow: { value: 0.15 },
      uStars: { value: 0.9 },
      uClouds: { value: 0 },
      uHaze: { value: 0.4 },
      uTime: { value: 0 },
    },
  })

  const mesh = new THREE.Mesh(geometry, material)
  mesh.frustumCulled = false
  mesh.renderOrder = -10

  // Follows the camera so the horizon never drifts.
  function update(camera) {
    mesh.position.copy(camera.position)
  }

  function dispose() {
    geometry.dispose()
    material.dispose()
  }

  return { mesh, update, dispose }
}
