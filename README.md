# ICARUS — a scroll-told myth

A cinematic, scroll-driven single-page retelling of the Greek myth of Icarus:
a fixed full-screen WebGL canvas behind the text, with scroll progress driving
the camera, lighting, shaders, the 3D Icarus and the color grade. Ten chapters
over a ~910vh spine: black prologue → torch-lit Labyrinth → the making of the
wings → the dawn warning → takeoff → the euphoric ascent → the white-gold sun
→ the long fall (feathers detaching, wax droplets trailing) → the silent
impact and the body in the water among drifting feathers → the dusk epilogue.

## Run

```bash
npm install
npm run dev        # → http://localhost:5173
```

Production build and preview:

```bash
npm run build
npm run preview
```

Debug/query flags: `?dpr=1` forces devicePixelRatio 1 (slow GPUs / QA).

## Verified dependency pins

Exact versions, checked against the npm registry and published artifacts
(no ranges):

| Package         | Version | Notes |
|-----------------|---------|-------|
| three           | 0.186.1 | in the peer range of postprocessing below |
| gsap            | 3.15.0  | ScrollTrigger and SplitText ship in the public npm package |
| lenis           | 1.3.26  | wired to ScrollTrigger with the officially documented pattern |
| postprocessing  | 6.39.5  | EffectComposer → RenderPass → EffectPass(Bloom, Vignette, Noise) → EffectPass(ToneMapping, ACES) — all options verified against its bundled type definitions |
| vite            | 8.3.2   | dev dependency; requires Node 20.19+ / 22.12+ |

## What's inside

- **Sky** — inverted-sphere gradient shader (top/horizon/bottom), sun-glow
  term, procedural stars; grade-driven per chapter.
- **Sun** — billboard disc shader (core + corona) with per-chapter direction,
  size and glow keys; drives the bloom climax in chapter VII.
- **Ocean** — 160×160 plane, three vertex wave trains with finite-difference
  normals, fresnel, sun glint, horizon fade, and an expanding impact ripple
  fired once as chapter IX begins.
- **World** — faceted takeoff cliff, torch-lit Labyrinth corridor (flickering
  point lights, only visible during chapters II–III), canvas-textured cloud
  billboards that streak with scroll velocity, wheeling gulls, the epilogue
  island.
- **Icarus (procedural)** — marble-and-bronze figure with named joints and
  seven blended poses (stand/launch/fly/exult/overreach/fall/sea); wings of
  ~324 instanced feathers per the config, indexed tip-first so melting trims
  them naturally into a world-space pool with scripted physics (gravity, drag,
  flutter, tumble, buoyant rest on the water); gold wax spines that dissolve;
  an additive wax-droplet Points emitter.
- **Camera rig** — per-chapter keyframes with smoothstep easing, damped
  look-at, handheld drift, scroll-velocity FOV kick.
- **Grades** — a single stop table (`GRADES` in `src/config.js`) drives sky,
  water, fog, lights, bloom intensity, vignette darkness, star/dust opacity.
- **UI** — real-signal loading screen, SplitText line-mask reveals with
  enter/handoff windows, chapter rail with sun marker, letterbox bars during
  the Labyrinth and The Fall.

## Tuning

Everything lives in `src/config.js`: chapter heights, camera keys, Icarus
path and melt window, sun keys, color grades, quality tiers. A `?dpr=1` URL
flag forces pixel ratio 1.

## Measuring performance

Performance numbers are targets to be measured, never claims. Use the Chrome
DevTools Performance panel (record while scrolling), the Rendering → FPS
meter, or add a stats overlay (three ships `examples/jsm/libs/stats.module.js`)
in the Phase 5 pass.

## Story sources

The telling follows the classical tradition (primarily Ovid,
*Metamorphoses* VIII; also Apollodorus). The confinement is staged in the
Labyrinth per Apollodorus (*Epitome* 1.12–13); Ovid keeps it vaguer. All
on-screen text is original paraphrase — no invented "ancient quotations".
