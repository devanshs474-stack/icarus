import { gsap } from 'gsap'

// Loading screen driven by real signals only. Tasks are { label, weight, promise };
// the bar reflects settled weight / total weight. The asset LoadingManager
// (textures in Phase 2, the GLB in Phase 3) will register as further tasks.
export function runLoader(tasks, onComplete) {
  const root = document.querySelector('#loader')
  const fill = root.querySelector('.loader__fill')
  const label = root.querySelector('.loader__label')

  const totalWeight = tasks.reduce((sum, t) => sum + t.weight, 0)
  let settled = 0

  const paint = (p) =>
    gsap.to(fill, { scaleX: p, duration: 0.35, ease: 'power2.out', overwrite: true })

  tasks.forEach((task, index) => {
    if (index === 0) label.textContent = `${task.label}…`
    const settle = () => {
      settled += task.weight
      paint(settled / totalWeight)
      const next = tasks[(index + 1) % tasks.length]
      if (settled < totalWeight && next) label.textContent = `${next.label}…`
    }
    task.promise.then(settle, (err) => {
      console.warn(`[Icarus] Loading task "${task.label}" failed; continuing.`, err)
      settle()
    })
  })

  return Promise.allSettled(tasks.map((t) => t.promise)).then(() => {
    paint(1)
    label.textContent = 'Ready'
    // Boot the app as soon as loading completes — the fade-out is purely
    // cosmetic and must never gate the experience. If the ticker is stalled
    // (throttled/background tab), a hard cutoff removes the overlay anyway.
    if (onComplete) onComplete()
    const finish = () => root.remove()
    gsap.to(root, {
      autoAlpha: 0,
      duration: 0.8,
      delay: 0.45,
      ease: 'power2.inOut',
      onComplete: finish,
    })
    setTimeout(() => {
      if (root.isConnected) {
        console.warn('[Icarus] Loader fade stalled; removing overlay directly.')
        finish()
      }
    }, 3000)
  })
}
