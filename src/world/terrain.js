import * as THREE from 'three'
import { WORLD } from '../config.js'

// Terrain: the takeoff cliff (a faceted rock mass whose top is the chapter IV
// ledge, dressed with olive greenery) and the epilogue island silhouette.
export function createTerrain() {
  const group = new THREE.Group()

  const rockMat = new THREE.MeshStandardMaterial({
    color: 0x474e58,
    roughness: 0.95,
    metalness: 0.05,
    flatShading: true,
  })
  const cliffMat = new THREE.MeshStandardMaterial({
    color: 0x565e68,
    roughness: 0.9,
    metalness: 0.05,
    flatShading: true,
  })

  const [cx, cy, cz] = WORLD.cliffPos
  const [sx, sy, sz] = WORLD.cliffSize

  const cliff = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz, 3, 3, 2), cliffMat)
  cliff.position.set(cx, cy, cz)
  group.add(cliff)

  // Faceted rock chunks jutting from the cliff face so the silhouette reads.
  const chunkGeom = new THREE.BoxGeometry(1, 1, 1)
  const chunks = [
    { s: [9, 12, 8], p: [-sx / 2 + 2, cy + 2, cz - 2] },
    { s: [7, 9, 7], p: [sx / 2 - 1, cy - 3, cz + 3] },
    { s: [8, 6, 6], p: [0, cy - sy / 2 + 1, cz - sz / 2 + 1] },
    { s: [5, 5, 5], p: [-6, cy - 8, cz + sz / 2 - 1] },
  ]
  for (const c of chunks) {
    const m = new THREE.Mesh(chunkGeom, rockMat)
    m.scale.set(...c.s)
    m.position.set(...c.p)
    m.rotation.set(Math.random() * 0.4, Math.random() * Math.PI, Math.random() * 0.3)
    group.add(m)
  }

  // ── Cliff-top greenery: olive bushes, cypresses, grass tufts ──────────────
  // Ringed along the cliff edges, clear of the figure's spot at the center.
  const greenMat = new THREE.MeshStandardMaterial({ color: 0x55743c, roughness: 0.9, metalness: 0, flatShading: true })
  const greenDark = new THREE.MeshStandardMaterial({ color: 0x3c5530, roughness: 0.92, metalness: 0, flatShading: true })
  const cypressMat = new THREE.MeshStandardMaterial({ color: 0x2f4a30, roughness: 0.88, metalness: 0, flatShading: true })
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4d3b28, roughness: 0.95, metalness: 0 })

  const bushGeom = new THREE.IcosahedronGeometry(1, 0)
  const bushSpots = [
    [-10.5, -4.6, 1.6], [8.5, -5.0, 1.9], [11.5, -2.2, 1.3], [-12, 1.5, 1.7],
    [10, 3.6, 1.4], [-7.5, 4.6, 1.2], [4.5, 5.2, 1.0], [-3.5, 5.4, 0.9],
    [6.5, -4.4, 1.1], [-11.5, 4.0, 1.5], [-4.5, -3.0, 1.0], [5.2, -3.4, 1.2],
  ]
  for (const [bx, bz, bs] of bushSpots) {
    const bush = new THREE.Mesh(bushGeom, Math.random() > 0.5 ? greenMat : greenDark)
    bush.scale.set(bs, bs * 0.62, bs)
    bush.position.set(bx, bs * 0.42, bz)
    bush.rotation.y = Math.random() * Math.PI
    group.add(bush)
  }

  const cypressTrunkGeom = new THREE.CylinderGeometry(0.12, 0.18, 1.1, 7)
  const cypressGeom = new THREE.ConeGeometry(0.85, 5.2, 7)
  for (const [cx2, cz2] of [[-12.6, -4.9], [12.2, -5.1], [-6.5, -5.2]]) {
    const trunk = new THREE.Mesh(cypressTrunkGeom, trunkMat)
    trunk.position.set(cx2, 0.55, cz2)
    group.add(trunk)
    const crown = new THREE.Mesh(cypressGeom, cypressMat)
    crown.position.set(cx2, 3.4, cz2)
    crown.rotation.y = Math.random() * Math.PI
    group.add(crown)
  }

  const tuftGeom = new THREE.ConeGeometry(0.42, 1.0, 5)
  const tuftMat = new THREE.MeshStandardMaterial({ color: 0x6b8a48, roughness: 0.9, flatShading: true })
  const tuftSpots = [
    [-5.5, -3.8], [2.8, -4.6], [9, 1.2], [-9, -1.8], [1.5, 4.4],
    [-1.8, -4.9], [7.2, 5.0], [-4.4, 2.2], [12.4, 1.0], [-12.8, -2.6],
  ]
  for (const [tx, tz] of tuftSpots) {
    const tuft = new THREE.Mesh(tuftGeom, tuftMat)
    tuft.position.set(tx, 0.32, tz)
    tuft.rotation.z = (Math.random() - 0.5) * 0.35
    group.add(tuft)
  }

  // Epilogue island: a low cone ridge with two stacked rock blocks, far off.
  // Its own group so the director can hide it outside chapters IX–X — from
  // the dawn cliff it would otherwise read as a fogged blue pyramid.
  const island = new THREE.Group()
  island.visible = false
  const [ix, iy, iz] = WORLD.islandPos
  const ridge = new THREE.Mesh(new THREE.ConeGeometry(40, 30, 7, 1), rockMat)
  ridge.position.set(ix, iy + 8, iz)
  ridge.rotation.y = 0.7
  island.add(ridge)
  const block = new THREE.Mesh(chunkGeom, rockMat)
  block.scale.set(18, 10, 14)
  block.position.set(ix + 8, iy + 12, iz + 6)
  block.rotation.y = 0.4
  island.add(block)
  group.add(island)

  function setIslVisible(v) {
    island.visible = v
  }

  function dispose() {
    cliff.geometry.dispose()
    chunkGeom.dispose()
    ridge.geometry.dispose()
    bushGeom.dispose()
    cypressTrunkGeom.dispose()
    cypressGeom.dispose()
    tuftGeom.dispose()
    rockMat.dispose()
    cliffMat.dispose()
    greenMat.dispose()
    greenDark.dispose()
    cypressMat.dispose()
    trunkMat.dispose()
    tuftMat.dispose()
  }

  return { group, island, setIslVisible, dispose }
}
