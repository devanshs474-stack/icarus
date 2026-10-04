import * as THREE from 'three'
import { GRADES } from '../config.js'

// Grade interpolation: samples the GRADES stops at global progress and returns
// a flat object of lerped values (colors as THREE.Color, scalars as numbers).
// One place to grade the whole experience — sky, water, lights, post.
const scratch = { a: {}, b: {} }

export function sampleGrade(progress) {
  let i = 0
  while (i < GRADES.length - 2 && progress > GRADES[i + 1].p) i++
  const a = GRADES[i]
  const b = GRADES[Math.min(i + 1, GRADES.length - 1)]
  const span = b.p - a.p || 1
  const t = THREE.MathUtils.clamp((progress - a.p) / span, 0, 1)

  const out = scratch.a
  out.top = out.top || new THREE.Color()
  out.horizon = out.horizon || new THREE.Color()
  out.bottom = out.bottom || new THREE.Color()
  out.sunTint = out.sunTint || new THREE.Color()
  out.water = out.water || new THREE.Color()
  out.fog = out.fog || new THREE.Color()

  out.top.lerpColors(new THREE.Color(a.top), new THREE.Color(b.top), t)
  out.horizon.lerpColors(new THREE.Color(a.horizon), new THREE.Color(b.horizon), t)
  out.bottom.lerpColors(new THREE.Color(a.bottom), new THREE.Color(b.bottom), t)
  out.sunTint.lerpColors(new THREE.Color(a.sunTint), new THREE.Color(b.sunTint), t)
  out.water.lerpColors(new THREE.Color(a.water), new THREE.Color(b.water), t)
  out.fog.lerpColors(new THREE.Color(a.fog), new THREE.Color(b.fog), t)

  const lerp = (k) => THREE.MathUtils.lerp(a[k], b[k], t)
  out.bloom = lerp('bloom')
  out.vig = lerp('vig')
  out.stars = lerp('stars')
  out.dust = lerp('dust')
  out.fogD = lerp('fogD')
  out.amb = lerp('amb')
  out.sunI = lerp('sunI')
  return out
}
