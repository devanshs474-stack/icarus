import * as THREE from 'three'
import { EffectComposer, RenderPass, EffectPass, BloomEffect, VignetteEffect, NoiseEffect, ToneMappingEffect, ToneMappingMode, DepthOfFieldEffect } from 'postprocessing'

// Post chain (all options verified against postprocessing 6.39.5's bundled
// type definitions): RenderPass → EffectPass(Bloom, Vignette, Noise, optional
// DepthOfField) → EffectPass(ToneMapping). HalfFloat buffers keep HDR values
// alive for bloom; the renderer stays at NoToneMapping because
// ToneMappingEffect does it here.
export function createComposer(renderer, scene, camera, { dof = true } = {}) {
  const composer = new EffectComposer(renderer, { frameBufferType: THREE.HalfFloatType })
  composer.addPass(new RenderPass(scene, camera))

  const bloom = new BloomEffect({
    luminanceThreshold: 0.62,
    luminanceSmoothing: 0.25,
    mipmapBlur: true,
    intensity: 0.8,
    radius: 0.75,
  })
  const vignette = new VignetteEffect({ offset: 0.32, darkness: 0.55 })
  const noise = new NoiseEffect({ premultiply: true })
  noise.blendMode.opacity.value = 0.06

  // Depth of field with auto-focus: set `.target` to Icarus's world position
  // and the CoC keeps him sharp while the world melts into bokeh. Focus
  // distance/range are in world units in this version.
  let dofEffect = null
  const effects = [bloom, vignette, noise]
  if (dof) {
    dofEffect = new DepthOfFieldEffect(camera, {
      focusDistance: 12,
      // A wide focus range keeps the world beyond Icarus readable — with a
      // tight range the bokeh smeared the distant sea into the sky entirely.
      focusRange: 14,
      bokehScale: 1.2,
      resolutionScale: 0.75,
    })
    dofEffect.target = null // enabled per frame by the director
    effects.push(dofEffect)
  }

  const effectsPass = new EffectPass(camera, ...effects)
  composer.addPass(effectsPass)

  const toneMapping = new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC })
  composer.addPass(new EffectPass(camera, toneMapping))

  function setSize(w, h) {
    composer.setSize(w, h)
  }

  function updateGrade(grade) {
    bloom.intensity = grade.bloom
    vignette.darkness = grade.vig
  }

  function setFocusTarget(targetOrNull) {
    if (dofEffect) dofEffect.target = targetOrNull
  }

  function render() {
    composer.render()
  }

  function dispose() {
    bloom.dispose()
    vignette.dispose()
    noise.dispose()
    if (dofEffect) dofEffect.dispose()
    effectsPass.dispose()
    composer.dispose()
  }

  return { composer, setSize, updateGrade, setFocusTarget, render, dispose }
}
