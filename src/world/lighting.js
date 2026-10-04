import * as THREE from 'three'

// Scene lighting: hemisphere fill + the sun directional (grade-driven), plus a
// dedicated soft key light that rides with the camera and always aims at
// Icarus. The key light is what keeps the figure readable when the sun is
// behind him (silhouette moments) — a standard cinematic cheat.
export function createLighting(scene) {
  const hemi = new THREE.HemisphereLight(0xbfd4e8, 0x0a0d12, 0.4)
  const sun = new THREE.DirectionalLight(0xffe9c4, 1.2)
  const fill = new THREE.DirectionalLight(0x8fb4d8, 0.25)
  fill.position.set(-0.6, 0.3, 0.5)

  const key = new THREE.DirectionalLight(0xfff2dc, 1.0)
  const keyTarget = new THREE.Object3D()
  key.target = keyTarget
  scene.add(key, keyTarget)

  function update(sunDir, sunColor, sunIntensity, ambient, camera, icarusPos) {
    sun.position.copy(sunDir).multiplyScalar(60)
    sun.color.set(sunColor)
    sun.intensity = sunIntensity
    hemi.intensity = ambient
    fill.intensity = ambient * 0.5

    // Camera-relative key: up and to the camera's right, aimed at Icarus.
    const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0)
    key.position.copy(camera.position).addScaledVector(right, 7).add(new THREE.Vector3(0, 9, 0))
    keyTarget.position.copy(icarusPos)
    key.intensity = 0.55 + ambient * 0.5
  }

  function dispose() {
    scene.remove(key, keyTarget)
  }

  return { lights: [hemi, sun, fill], sun, hemi, update, dispose }
}
