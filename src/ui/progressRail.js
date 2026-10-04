import { CHAPTERS } from '../config.js'

// Side progress indicator: a thin vertical track with a sun marker that maps
// to global scroll progress, plus the chapter names, highlighted as they
// become active. Links jump with the smooth scroller (or natively with
// reduced motion). Hidden on narrow screens via CSS.
export function createProgressRail(scrollToTarget) {
  const nav = document.querySelector('#progress-rail')

  const track = document.createElement('div')
  track.className = 'rail__track'
  track.setAttribute('aria-hidden', 'true')

  const marker = document.createElement('div')
  marker.className = 'rail__marker'
  track.appendChild(marker)

  const list = document.createElement('ul')
  list.className = 'rail__list'

  const links = CHAPTERS.map((c) => {
    const li = document.createElement('li')
    const a = document.createElement('a')
    a.href = `#${c.id}`
    a.textContent = c.name
    a.addEventListener('click', (e) => {
      e.preventDefault()
      scrollToTarget(`#${c.id}`)
    })
    li.appendChild(a)
    list.appendChild(li)
    return a
  })

  nav.append(track, list)

  let lastActive = -1

  function update(progress) {
    marker.style.setProperty('--p', progress.toFixed(4))

    let active = CHAPTERS.length - 1
    for (let i = 0; i < CHAPTERS.length; i++) {
      if (progress >= CHAPTERS[i].start && progress < CHAPTERS[i].end) {
        active = i
        break
      }
    }
    if (active !== lastActive) {
      links.forEach((a, i) => {
        a.classList.toggle('is-active', i === active)
        if (i === active) a.setAttribute('aria-current', 'true')
        else a.removeAttribute('aria-current')
      })
      lastActive = active
    }
  }

  function dispose() {
    nav.innerHTML = ''
  }

  return { update, dispose }
}
