import * as THREE from 'three'
import { createSky } from './sky.js'

// Image-based lighting captured from the actual sky. A second sky instance
// lives in a private scene; when the chapter (and therefore the grade)
// changes, we re-render it through PMREMGenerator into scene.environment.
// Without this, metals (the wax, the bronze) have nothing to reflect and
// render nearly black — the "black model" failure mode.
export function createEnvironment(renderer, scene) {
  const envScene = new THREE.Scene()
  const envSky = createSky()
  envScene.add(envSky.mesh)

  const pmrem = new THREE.PMREMGenerator(renderer)
  let rt = null
  let lastChapterIndex = -1

  function regenerate(skyUniforms) {
    // Copy the live grade into the env sky before capturing.
    for (const key of ['uTop', 'uHorizon', 'uBottom', 'uSunTint']) {
      envSky.mesh.material.uniforms[key].value.copy(skyUniforms[key].value)
    }
    envSky.mesh.material.uniforms.uSunDir.value.copy(skyUniforms.uSunDir.value)
    envSky.mesh.material.uniforms.uGlow.value = skyUniforms.uGlow.value
    envSky.mesh.material.uniforms.uStars.value = 0 // stars add noise, not light

    // far must exceed the sky radius (1500) or the capture renders nothing.
    const next = pmrem.fromScene(envScene, 0.08, 0.1, 3000)
    if (rt) rt.dispose()
    rt = next
    scene.environment = rt.texture
    scene.environmentIntensity = 0.55
  }

  // Called every frame; only regenerates on chapter boundaries.
  function update(skyUniforms, chapterIndex) {
    if (chapterIndex !== lastChapterIndex) {
      lastChapterIndex = chapterIndex
      regenerate(skyUniforms)
    }
  }

  function dispose() {
    if (rt) rt.dispose()
    pmrem.dispose()
    envSky.dispose()
  }

  return { update, dispose }
}
