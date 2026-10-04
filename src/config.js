// ─────────────────────────────────────────────────────────────────────────────
// ICARUS — single source of tunable values.
//
// Chapter heights (vh) drive the scroll spine; normalized ranges are derived
// below. Camera keys, world layout, grades and the Icarus path are all keyed
// to chapter-local progress (t: 0..1 within a chapter) so everything can be
// tuned here without touching logic.
// ─────────────────────────────────────────────────────────────────────────────

export const PALETTE = {
  obsidian: 0x06080c,
  aegean: 0x0d2436,
  marble: 0xe8e6df,
  gold: 0xe8c46b,
  goldDeep: 0x8a6a2f,
}

export const SCROLL = {
  // The spine's real total is derived from the CHAPTERS heights below
  // (currently 910vh). Kept as a named reference for quick mental math.
  totalVh: 910,
}

export const CHAPTERS = [
  { id: 'ch1',  numeral: 'I',    name: 'Prologue',      vh: 40 },
  { id: 'ch2',  numeral: 'II',   name: 'The Labyrinth', vh: 100 },
  { id: 'ch3',  numeral: 'III',  name: 'The Wings',     vh: 80 },
  { id: 'ch4',  numeral: 'IV',   name: 'The Warning',   vh: 80 },
  { id: 'ch5',  numeral: 'V',    name: 'Takeoff',       vh: 80 },
  { id: 'ch6',  numeral: 'VI',   name: 'Euphoria',      vh: 100 },
  { id: 'ch7',  numeral: 'VII',  name: 'The Sun',       vh: 80 },
  { id: 'ch8',  numeral: 'VIII', name: 'The Fall',      vh: 250 },
  { id: 'ch9',  numeral: 'IX',   name: 'The Sea',       vh: 60 },
  { id: 'ch10', numeral: 'X',    name: 'Epilogue',      vh: 40 },
]

// Derived normalized [start, end) scroll ranges per chapter.
const totalVh = CHAPTERS.reduce((sum, c) => sum + c.vh, 0)
let acc = 0
for (const c of CHAPTERS) {
  c.start = acc / totalVh
  acc += c.vh
  c.end = acc / totalVh
}

export const chapterRange = (id) => CHAPTERS.find((c) => c.id === id)

// ── World layout ─────────────────────────────────────────────────────────────
export const WORLD = {
  waterY: -25,
  cliffTopY: 0,
  cliffPos: [0, -12.5, 0],      // box center; top surface at y=0
  cliffSize: [26, 25, 12],
  islandPos: [-90, -25, -420],  // epilogue silhouette
  skyRadius: 1500,
  sunDistance: 1200,
  labyrinth: {
    center: [0, -80, -110],     // corridor runs along z, 24 long
    length: 26,
    width: 7,
    height: 6,
  },
}

// ── Camera rig ───────────────────────────────────────────────────────────────
// Keys per chapter: t is local progress 0..1; pos/look are world coords.
// Between keys the rig eases with smoothstep. fov keys are optional.
export const CAMERA = {
  fovBase: 50,
  default: { pos: [0, 0.4, 10], look: [0, 0.4, 0] },
  chapters: {
    ch1: [
      { t: 0, pos: [0, 0.4, 10], look: [0, 0.4, 0] },
    ],
    ch2: [
      { t: 0,   pos: [0, -79.6, -98.5], look: [0, -81, -122] },
      { t: 0.6, pos: [0.6, -79.8, -108], look: [0, -81, -122] },
      { t: 1,   pos: [0, -79.8, -113.5], look: [0, -81, -121.6] },
    ],
    ch3: [
      { t: 0,   pos: [2.4, -80.9, -115.0], look: [0, -81.0, -121.6] },
      { t: 0.5, pos: [-2.2, -80.7, -115.2], look: [0, -81.0, -121.4] },
      { t: 1,   pos: [1.8, -80.5, -114.2], look: [0, -81.1, -121.8] },
    ],
    ch4: [
      { t: 0,   pos: [11, 5.5, 12.5], look: [-1.5, 0.0, -5] },
      { t: 0.6, pos: [9, 5.0, 14],    look: [-1.5, 0.2, -5.5] },
      { t: 1,   pos: [7.5, 4.6, 15],  look: [-2, 0.3, -6] },
    ],
    ch5: [
      { t: 0,   pos: [3.5, 1.6, 8],  look: [0, 1.6, -4] },
      { t: 0.5, pos: [2.2, 6, 2],    look: [0, 8, -18] },
      { t: 1,   pos: [1.2, 14, -8],  look: [0, 16, -34] },
    ],
    ch6: [
      { t: 0,   pos: [8, 26, -18],  look: [0, 30, -42] },
      { t: 0.5, pos: [-9, 48, -52], look: [0, 56, -68] },
      { t: 1,   pos: [8, 82, -78],  look: [0, 92, -76] },
    ],
    ch7: [
      { t: 0,   pos: [4, 102, -58],  look: [0, 116, -76] },
      { t: 0.5, pos: [1.2, 110, -62], look: [0, 122, -78] },
      { t: 1,   pos: [2.2, 116, -60], look: [0, 128, -80] },
    ],
    ch8: [
      { t: 0,    pos: [6, 112, -46],  look: [0, 112, -74] },
      { t: 0.3,  pos: [7, 84, -88],   look: [0, 80, -102] },
      { t: 0.55, pos: [-7, 48, -108], look: [0, 44, -122] },
      { t: 0.78, pos: [6, 12, -132],  look: [0, 8, -142] },
      { t: 1,    pos: [3.5, -18.5, -128], look: [0, -23.4, -140] },
    ],
    ch9: [
      { t: 0,   pos: [3.5, -22.4, -131.5], look: [0, -24.4, -140] },
      { t: 0.5, pos: [5, -21.5, -128],  look: [0, -24.2, -141] },
      { t: 1,   pos: [10, -12, -120],   look: [0, -23, -142] },
    ],
    ch10: [
      { t: 0, pos: [14, -6, -118],  look: [-45, -22, -300] },
      { t: 1, pos: [20, 2, -110],   look: [-90, -22, -420] },
    ],
  },
}

// ── Icarus ───────────────────────────────────────────────────────────────────
// Path keys per chapter (world position). Poses are chosen by states.js.
// The GLB slot stays for a later phase; null means procedural only.
export const MODEL = {
  glbPath: null, // e.g. '/models/icarus.glb'
  clipMap: {},   // { stateName: 'clipName' } — filled once a GLB exists
}

export const ICARUS = {
  featherCountPerWing: { rows: 12, perRow: 10, layers: 2 }, // rows×perRow×layers = 240/wing
  featherSize: [0.105, 0.58],
  wingSpread: 2.2,    // half-span of each wing
  meltStart: 0.555,   // global progress where wax begins to soften
  meltEnd: 0.9,       // all feathers gone by The Sea
  fallSpin: 0.55,     // rad/s of tumble during the fall
}

// Flight path keys (global positions) keyed per chapter like the camera.
export const ICARUS_PATH = {
  ch2: [{ t: 0, pos: [0, -82.7, -121.6] }],                       // feet on the corridor floor
  ch3: [{ t: 0, pos: [0, -82.7, -121.6] }],                       // at the bench, wings bound
  ch4: [{ t: 0, pos: [0, 0, 0] }],                                // cliff edge at dawn
  ch5: [
    { t: 0,   pos: [0, 0, 0] },
    { t: 0.35, pos: [0, 2.5, -6] },
    { t: 1,   pos: [0, 14, -30] },
  ],
  ch6: [
    { t: 0,   pos: [0, 14, -30] },
    { t: 0.45, pos: [0, 52, -62] },
    { t: 1,   pos: [0, 94, -74] },
  ],
  ch7: [
    { t: 0,   pos: [0, 94, -74] },
    { t: 0.5, pos: [0, 114, -78] },
    { t: 1,   pos: [0, 122, -80] },
  ],
  ch8: [
    { t: 0,    pos: [0, 122, -80] },
    { t: 0.3,  pos: [0, 82, -98] },
    { t: 0.55, pos: [0, 46, -118] },
    { t: 0.78, pos: [0, 10, -134] },
    { t: 1,    pos: [0, -23.6, -140] },
  ],
  ch9: [{ t: 0, pos: [0, -23.6, -140] }],                          // in the water
  ch10: [{ t: 0, pos: [0, -23.6, -140] }],
}

// ── Sun ──────────────────────────────────────────────────────────────────────
// Direction keys (normalized in code); size = disc radius factor; glow = corona.
export const SUN = {
  distance: WORLD.sunDistance,
  keys: [
    { p: 0.0,  dir: [0.5, 0.12, -0.8], size: 45, glow: 0.15 },
    { p: 0.24, dir: [0.5, 0.12, -0.8], size: 45, glow: 0.15 },  // (below ground in labyrinth)
    { p: 0.34, dir: [0.75, 0.1, -0.65], size: 55, glow: 0.35 }, // dawn, low in the east
    { p: 0.5,  dir: [0.3, 0.42, -0.85], size: 72, glow: 0.55 },
    { p: 0.6,  dir: [0.05, 0.6, -0.8], size: 92, glow: 0.8 },
    { p: 0.665, dir: [0.0, 0.78, -0.62], size: 145, glow: 1.6 }, // the climax
    { p: 0.74, dir: [-0.2, 0.9, -0.4], size: 108, glow: 1.0 },
    { p: 0.85, dir: [-0.55, 0.28, 0.75], size: 64, glow: 0.5 }, // behind, falling away
    { p: 0.93, dir: [-0.8, 0.06, 0.6], size: 55, glow: 0.4 },   // dusk over the water
    { p: 1.0,  dir: [-0.85, 0.03, 0.5], size: 48, glow: 0.3 },
  ],
}

// ── Color grades (lerped between stops by global progress) ───────────────────
// top/horizon/bottom: sky gradient; sunTint: sun + light color; water: ocean deep
// tone; bloom: bloomEffect.intensity; vig: vignette darkness; stars: 0..1;
// dust: dust opacity; exposure: scene light multiplier.
export const GRADES = [
  { p: 0.0,  top: '#05070c', horizon: '#10141d', bottom: '#04050a', sunTint: '#e8c46b', water: '#06121c', bloom: 0.5, vig: 0.55, stars: 0.9, dust: 0.5, fog: '#05070c', fogD: 0.0, amb: 0.25, sunI: 0.0 },
  { p: 0.05, top: '#05070c', horizon: '#121824', bottom: '#04050a', sunTint: '#e8c46b', water: '#06121c', bloom: 0.5, vig: 0.6,  stars: 0.8, dust: 0.35, fog: '#05070c', fogD: 0.0, amb: 0.25, sunI: 0.0 },
  { p: 0.1,  top: '#070405', horizon: '#1a0f08', bottom: '#030202', sunTint: '#ff9d4d', water: '#06121c', bloom: 0.7, vig: 0.62, stars: 0.0, dust: 0.12, fog: '#070405', fogD: 0.012, amb: 1.0, sunI: 0.0 },
  { p: 0.24, top: '#070405', horizon: '#1a0f08', bottom: '#030202', sunTint: '#ff9d4d', water: '#06121c', bloom: 0.7, vig: 0.6,  stars: 0.0, dust: 0.1,  fog: '#070405', fogD: 0.012, amb: 1.0, sunI: 0.0 },
  { p: 0.32, top: '#12233d', horizon: '#e8935c', bottom: '#1c2a38', sunTint: '#ffc46b', water: '#0a2030', bloom: 0.75, vig: 0.5, stars: 0.0, dust: 0.08, fog: '#37455c', fogD: 0.0035, amb: 0.8, sunI: 1.1 },
  { p: 0.44, top: '#1c3a5e', horizon: '#f0b078', bottom: '#23384a', sunTint: '#ffd58f', water: '#0c2a40', bloom: 0.85, vig: 0.42, stars: 0.0, dust: 0.06, fog: '#4a5a72', fogD: 0.0028, amb: 0.85, sunI: 1.35 },
  { p: 0.56, top: '#3f6690', horizon: '#ffd9a0', bottom: '#3a5266', sunTint: '#ffe9c4', water: '#123a56', bloom: 1.05, vig: 0.36, stars: 0.0, dust: 0.05, fog: '#6d7f96', fogD: 0.0022, amb: 0.7, sunI: 1.6 },
  { p: 0.66, top: '#7d9cc0', horizon: '#fff3d8', bottom: '#5d7690', sunTint: '#fff6e0', water: '#1c4a6a', bloom: 1.7, vig: 0.28, stars: 0.0, dust: 0.04, fog: '#93a5bb', fogD: 0.0016, amb: 0.9, sunI: 2.0 },
  { p: 0.73, top: '#4a5a7c', horizon: '#f0b078', bottom: '#31465c', sunTint: '#ffc9a0', water: '#14344c', bloom: 1.2, vig: 0.4, stars: 0.0, dust: 0.05, fog: '#5c6a84', fogD: 0.002, amb: 1.05, sunI: 1.3 },
  { p: 0.8,  top: '#16233c', horizon: '#b06a3f', bottom: '#0e1a28', sunTint: '#e88a50', water: '#0a1c2c', bloom: 0.9, vig: 0.5, stars: 0.1, dust: 0.06, fog: '#28344a', fogD: 0.0028, amb: 0.8, sunI: 0.8 },
  { p: 0.88, top: '#0a1524', horizon: '#2a4a5c', bottom: '#071019', sunTint: '#8fb4c8', water: '#081826', bloom: 0.8, vig: 0.55, stars: 0.35, dust: 0.07, fog: '#101c2c', fogD: 0.0035, amb: 0.7, sunI: 0.4 },
  { p: 0.94, top: '#081020', horizon: '#1c3a50', bottom: '#050b14', sunTint: '#7aa0c4', water: '#071420', bloom: 0.7, vig: 0.6, stars: 0.55, dust: 0.09, fog: '#0c1626', fogD: 0.003, amb: 0.6, sunI: 0.25 },
  { p: 1.0,  top: '#060a16', horizon: '#152838', bottom: '#04060c', sunTint: '#6b8aa8', water: '#061018', bloom: 0.6, vig: 0.62, stars: 0.85, dust: 0.4, fog: '#080e1a', fogD: 0.002, amb: 0.55, sunI: 0.15 },
]

// ── Environment / capability tiers ──────────────────────────────────────────
const coarsePointer = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches

export const REDUCED_MOTION =
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

// Debug overrides: ?dpr=1 forces devicePixelRatio 1 (QA on slow GPUs).
const params = typeof location !== 'undefined' ? new URLSearchParams(location.search) : null
const dprOverride = params ? Number(params.get('dpr')) || null : null

export const QUALITY = {
  dprCap: dprOverride || 2,
  // Depth of field is the heaviest effect; keep it off on touch devices.
  dof: !coarsePointer,
  dustCount: coarsePointer ? 140 : 360,
  oceanSegments: coarsePointer ? 96 : 160,
  cloudCount: coarsePointer ? 10 : 18,
  gullCount: coarsePointer ? 8 : 14,
}

export const MOTION = {
  lenisDuration: 1.35,
  fovKickMax: 6,
  fovKickScale: 0.12,
}
