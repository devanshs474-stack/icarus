import * as THREE from 'three'
import { WORLD } from '../config.js'

// The Labyrinth: a torch-lit stone corridor beneath the cliff. Stone is a
// BoxGeometry corridor with recessed ribs; light comes from flickering torch
// quads plus two real point lights (cheap fake of many flames). Visible only
// during chapters II–III; hidden otherwise to save fill rate.
export function createLabyrinth() {
  const { center, length, width, height } = WORLD.labyrinth
  const [gx, gy, gz] = center
  const group = new THREE.Group()
  group.position.set(gx, gy, gz)

  const stone = new THREE.MeshStandardMaterial({ color: 0x4a4038, roughness: 0.92, metalness: 0.02, flatShading: true })
  const stoneDark = new THREE.MeshStandardMaterial({ color: 0x332c26, roughness: 0.96, metalness: 0.0, flatShading: true })
  const flameMat = new THREE.MeshBasicMaterial({ color: 0xffa04d })
  flameMat.toneMapped = false

  const half = length / 2

  const floor = new THREE.Mesh(new THREE.BoxGeometry(width, 0.6, length), stoneDark)
  floor.position.y = -height / 2
  group.add(floor)

  const ceiling = new THREE.Mesh(new THREE.BoxGeometry(width, 0.6, length), stoneDark)
  ceiling.position.y = height / 2
  group.add(ceiling)

  const wallL = new THREE.Mesh(new THREE.BoxGeometry(0.6, height, length), stone)
  wallL.position.set(-width / 2, 0, 0)
  group.add(wallL)

  const wallR = wallL.clone()
  wallR.position.x = width / 2
  group.add(wallR)

  const endCap = new THREE.Mesh(new THREE.BoxGeometry(width, height, 0.6), stone)
  endCap.position.z = -half
  group.add(endCap)

  // Ribs across the ceiling for rhythm in the fly-through.
  const ribGeom = new THREE.BoxGeometry(width, 0.5, 0.9)
  for (let i = 0; i < 6; i++) {
    const rib = new THREE.Mesh(ribGeom, stoneDark)
    rib.position.set(0, height / 2 - 0.5, -half + 2.4 + i * (length - 4.8) / 5)
    group.add(rib)
  }

  // Torches: emissive quads on the walls + two flickering point lights.
  const torches = []
  const flameGeom = new THREE.PlaneGeometry(0.28, 0.5)
  const torchZs = [-half + 4, -half + 11, -half + 18, -half + 24]
  torchZs.forEach((z, i) => {
    const side = i % 2 === 0 ? -1 : 1
    const flame = new THREE.Mesh(flameGeom, flameMat)
    flame.position.set(side * (width / 2 - 0.36), -0.4, z)
    flame.rotation.y = side * Math.PI / 2
    group.add(flame)
    torches.push(flame)
  })

  const lightA = new THREE.PointLight(0xff9d4d, 60, 20, 2)
  lightA.position.set(-1.4, -0.2, torchZs[1])
  group.add(lightA)
  const lightB = new THREE.PointLight(0xff9d4d, 60, 20, 2)
  lightB.position.set(1.4, -0.2, torchZs[3])
  group.add(lightB)
  const lights = [lightA, lightB]

  // ── Wall depth: pilasters, trim ledges, torch niches, floor seams ──────────
  const stoneLight = new THREE.MeshStandardMaterial({ color: 0x5c5248, roughness: 0.9, metalness: 0.02, flatShading: true })
  // Vertical pilasters marching down both walls — they catch the torchlight
  // and give the walls rhythm.
  const pilasterGeom = new THREE.BoxGeometry(0.35, height - 1.2, 0.4)
  for (let i = 0; i < 6; i++) {
    const z = -half + 2 + i * ((length - 4) / 5)
    for (const side of [-1, 1]) {
      const pil = new THREE.Mesh(pilasterGeom, stoneLight)
      pil.position.set(side * (width / 2 - 0.28), 0, z)
      group.add(pil)
    }
  }
  // Horizontal trim ledge at dado height on both walls.
  const ledgeGeom = new THREE.BoxGeometry(0.22, 0.18, length - 1)
  for (const side of [-1, 1]) {
    const ledge = new THREE.Mesh(ledgeGeom, stoneLight)
    ledge.position.set(side * (width / 2 - 0.19), -0.7, 0)
    group.add(ledge)
  }
  // Recessed dark niches behind every torch flame.
  const nicheGeom = new THREE.BoxGeometry(0.45, 1.2, 0.85)
  torchZs.forEach((z, i) => {
    const side = i % 2 === 0 ? -1 : 1
    const niche = new THREE.Mesh(nicheGeom, stoneDark)
    niche.position.set(side * (width / 2 - 0.34), -0.4, z)
    group.add(niche)
  })
  // Transverse floor slabs: dark seams across the stone floor.
  const seamGeom = new THREE.BoxGeometry(width - 0.5, 0.06, 0.14)
  for (let i = 0; i < 7; i++) {
    const seam = new THREE.Mesh(seamGeom, stoneDark)
    seam.position.set(0, -height / 2 + 0.33, -half + 1.6 + i * ((length - 3.2) / 6))
    group.add(seam)
  }
  // End wall: a carved false door — recessed slab inside lighter frames.
  const doorDark = new THREE.Mesh(new THREE.BoxGeometry(2.1, 3.1, 0.22), stoneDark)
  doorDark.position.set(0, -0.2, -half + 0.34)
  group.add(doorDark)
  const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(2.7, 3.7, 0.16), stoneLight)
  doorFrame.position.set(0, -0.2, -half + 0.3)
  group.add(doorFrame)
  const doorLintel = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.4, 0.24), stoneLight)
  doorLintel.position.set(0, 1.95, -half + 0.36)
  group.add(doorLintel)

  // Torch embers: warm motes rising along the walls, dying toward the ceiling.
  const EMBERS = 80
  const emberPositions = new Float32Array(EMBERS * 3)
  const emberSeeds = new Float32Array(EMBERS)
  for (let i = 0; i < EMBERS; i++) {
    const side = i % 2 === 0 ? -1 : 1
    emberPositions[i * 3] = side * (width / 2 - 0.5)
    emberPositions[i * 3 + 1] = 0
    emberPositions[i * 3 + 2] = torchZs[i % torchZs.length] + (Math.random() - 0.5) * 1.5
    emberSeeds[i] = Math.random() * Math.PI * 2
  }
  const emberGeom = new THREE.BufferGeometry()
  emberGeom.setAttribute('position', new THREE.BufferAttribute(emberPositions, 3))
  emberGeom.setAttribute('aSeed', new THREE.BufferAttribute(emberSeeds, 1))
  const emberMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) } },
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform float uPixelRatio;
      attribute float aSeed;
      varying float vRise;
      void main() {
        float cycle = fract(uTime * 0.09 + aSeed * 0.16);
        vRise = cycle;
        vec3 p = position;
        p.y = -${(height / 2).toFixed(2)} + cycle * ${(height + 0.4).toFixed(2)};
        p.x += sin(uTime * 1.4 + aSeed * 3.0) * 0.3 * cycle;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = (1.4 + aSeed * 0.4) * uPixelRatio * (10.0 / -mv.z) * (1.0 - cycle * 0.6);
      }
    `,
    fragmentShader: /* glsl */ `
      varying float vRise;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float alpha = smoothstep(0.5, 0.1, d) * (1.0 - vRise) * 0.85;
        gl_FragColor = vec4(1.0, 0.62, 0.28, alpha);
      }
    `,
  })
  const embers = new THREE.Points(emberGeom, emberMat)
  embers.frustumCulled = false
  group.add(embers)

  // A bench for the wing-making scene in chapter III.
  const bench = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.14, 0.8), stoneDark)
  bench.position.set(0, -height / 2 + 0.35, -half + 2.2)
  group.add(bench)
  const benchLegs = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.7, 0.6), stoneDark)
  benchLegs.position.set(0, -height / 2 + 0.05, -half + 2.2)
  group.add(benchLegs)

  function update(time) {
    // Torch flicker: quick noise-ish jitter on lights and flame scale.
    for (let i = 0; i < lights.length; i++) {
      const l = lights[i]
      const f = 55 + Math.sin(time * 11 + i * 5) * 7 + Math.sin(time * 23 + i * 9) * 5
      l.intensity = f
    }
    for (let i = 0; i < torches.length; i++) {
      const s = 1 + Math.sin(time * 13 + i * 7) * 0.12
      torches[i].scale.set(s, 1 + Math.sin(time * 17 + i * 3) * 0.18, 1)
    }
    emberMat.uniforms.uTime.value = time
  }

  function setVisible(v) {
    group.visible = v
  }

  function dispose() {
    for (const mesh of group.children) {
      if (mesh.geometry) mesh.geometry.dispose()
      if (mesh.material) mesh.material.dispose()
    }
    stone.dispose()
    stoneDark.dispose()
    stoneLight.dispose()
    flameMat.dispose()
  }

  return { group, update, setVisible, dispose }
}
