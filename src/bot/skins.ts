import { PROFILE_SAMPLES } from './profiles'
import {
  hullOfCircles,
  profileFromPolygon,
  regularPolygonProfile,
  superellipseProfile,
  unionOfCirclesProfile,
  type Point
} from './shape'

/**
 * Formes et couleurs proposees par le personnalisateur du bot.
 *
 * A la difference des silhouettes d'animation (`profiles.ts`), celles-ci ne sont
 * PAS relevees sur la video : elles sont construites analytiquement d'apres la
 * grille du personnalisateur d'origine. Deux sources distinctes, donc, et c'est
 * volontaire — les etats animes doivent rester fideles a la video, les formes de
 * base sont un choix d'utilisateur.
 */

/**
 * Les identifiants sont enumeres plutot que deduits du tableau : c'est ce qui
 * permet a la couche i18n de verifier A LA COMPILATION que chaque forme a bien
 * sa traduction dans les trois langues (`t(\`shapes.${id}\`)` ne compile que si
 * la cle existe). Un `as const` sur le tableau aurait le meme effet mais
 * rendrait `radii` en lecture seule, alors que le moteur le passe tel quel.
 */
export type ShapeId =
  | 'cercle'
  | 'galet'
  | 'squircle'
  | 'capsule'
  | 'triangle'
  | 'hexagone'
  | 'nuage'
  | 'goutte'
  | 'maison'

export interface BotShape {
  id: ShapeId
  radii: number[]
}

/** Ramene le rayon maximal a `max` pour que toutes les formes pesent pareil a l'oeil. */
function normalize(radii: number[], max = 1): number[] {
  const peak = Math.max(...radii)
  if (peak <= 0) return radii
  const k = max / peak
  return radii.map((r) => r * k)
}

const ANGLES = Array.from({ length: PROFILE_SAMPLES }, (_, i) => (i / PROFILE_SAMPLES) * Math.PI * 2)

/** Galet : cercle deforme par deux harmoniques basses, donc irregulier mais lisse. */
const pebble = normalize(
  ANGLES.map((a) => 1 + 0.075 * Math.cos(2 * a + 0.5) + 0.035 * Math.cos(3 * a + 2.1)),
  1.02
)

/** Nuage : union de bosses, large en bas, deux lobes en haut. */
const cloud = normalize(
  unionOfCirclesProfile([
    { x: -0.44, y: 0.2, r: 0.54 },
    { x: 0.46, y: 0.2, r: 0.5 },
    { x: 0.02, y: 0.3, r: 0.6 },
    { x: -0.24, y: -0.3, r: 0.48 },
    { x: 0.3, y: -0.24, r: 0.44 }
  ]),
  1.02
)

/** Goutte : gros disque en bas, pointe effilee en haut. */
const droplet = normalize(
  profileFromPolygon(hullOfCircles(0, 0.28, 0.66, 0, -0.96, 0.05), 0, 0),
  1.04
)

/** Capsule couchee : enveloppe de deux disques cote a cote. */
const capsule = profileFromPolygon(hullOfCircles(-0.42, 0, 0.62, 0.42, 0, 0.62), 0, 0)


// House outline traced from the supplied 1024px STR Host avatar. Unlike a radial
// profile, this retains the chimney's concave notch during state morphs.
const HOUSE_VERTICES: Point[] = [
  [936, 438], [936, 473], [931, 489], [916, 498], [858, 498],
  [858, 926], [852, 944], [838, 952], [185, 952], [166, 940],
  [165, 926], [165, 499], [107, 498], [92, 490], [87, 473],
  [87, 440], [94, 420], [266, 284], [266, 89], [271, 77],
  [282, 72], [388, 72], [399, 77], [403, 88], [403, 180],
  [499, 108], [510, 103], [525, 108], [925, 413]
].map(([x, y]) => ({ x: (x! - 512) / 425, y: (y! - 512) / 425 }))

/** Equal-perimeter samples, beginning at the right edge, clockwise. */
function resampleClosed(points: Point[], count: number): Point[] {
  const lengths = points.map((p, i) =>
    Math.hypot(points[(i + 1) % points.length]!.x - p.x, points[(i + 1) % points.length]!.y - p.y))
  const total = lengths.reduce((a, b) => a + b, 0)
  const result: Point[] = []
  let edge = 0
  let start = 0
  for (let i = 0; i < count; i++) {
    const at = (i / count) * total
    while (edge < lengths.length - 1 && start + lengths[edge]! < at) {
      start += lengths[edge]!
      edge++
    }
    const p = points[edge]!
    const q = points[(edge + 1) % points.length]!
    const t = (at - start) / Math.max(1e-9, lengths[edge]!)
    result.push({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t })
  }
  return result
}

export const HOUSE_CONTOUR = resampleClosed(HOUSE_VERTICES, PROFILE_SAMPLES)
export const HOUSE_RADII = profileFromPolygon(HOUSE_VERTICES, 0, 0)

/** Four-pane window cutouts; their vertical contraction reproduces the user's GIF. */
export function houseWindowsPath(scale: number): string {
  const panes = [
    [300, 518, 364, 628], [380, 518, 444, 628],
    [300, 643, 364, 752], [380, 643, 444, 752],
    [577, 518, 642, 628], [657, 518, 722, 628],
    [577, 643, 642, 752], [657, 643, 722, 752]
  ]
  const coord = (v: number) => Math.round((v * scale / 425) * 100) / 100
  return panes.map(([x1, y1, x2, y2]) =>
    `M${coord(x1! - 512)} ${coord(y1! - 512)}h${coord(x2! - x1!)}v${coord(y2! - y1!)}h${-coord(x2! - x1!)}Z`
  ).join('')
}

export const SHAPES: BotShape[] = [
  { id: 'cercle', radii: new Array(PROFILE_SAMPLES).fill(1) },
  { id: 'galet', radii: pebble },
  // 1.15 et pas 1.02 : sur une superellipse le rayon maximal est la diagonale,
  // donc normaliser dessus donne une forme qui parait plus petite que le cercle.
  { id: 'squircle', radii: normalize(superellipseProfile(4.2), 1.15) },
  { id: 'capsule', radii: capsule },
  // -90deg : un sommet vers le haut de l'ecran (y est oriente vers le bas)
  { id: 'triangle', radii: regularPolygonProfile(3, 1.12, 0.34, -90) },
  // 0deg : sommets a gauche et a droite, donc aretes du haut et du bas plates
  { id: 'hexagone', radii: regularPolygonProfile(6, 1.04, 0.26, 0) },
  { id: 'nuage', radii: cloud },
  { id: 'goutte', radii: droplet },
  { id: 'maison', radii: HOUSE_RADII }
]

// Map indexee par `string` et non par `ShapeId` : les appelants interrogent avec
// une valeur relue du localStorage ou d'une prop, donc non validee.
export const SHAPE_BY_ID = new Map<string, BotShape>(SHAPES.map((s) => [s.id, s]))
export const DEFAULT_SHAPE = 'cercle'

export type ColorId =
  | 'encre'
  | 'creme'
  | 'brun'
  | 'rouge'
  | 'orange'
  | 'ambre'
  | 'vert'
  | 'turquoise'
  | 'bleu'
  | 'violet'
  | 'rose'
  | 'gris'

export interface BotColor {
  id: ColorId
  hex: string
}

/** Palette du personnalisateur d'origine. */
export const COLORS: BotColor[] = [
  { id: 'encre', hex: '#0a0a0c' },
  { id: 'brun', hex: '#8b5e3c' },
  { id: 'rouge', hex: '#e8483f' },
  { id: 'orange', hex: '#f5701c' },
  { id: 'ambre', hex: '#f0b429' },
  { id: 'vert', hex: '#3ecf8e' },
  { id: 'turquoise', hex: '#2fbfa0' },
  { id: 'bleu', hex: '#3b93f0' },
  { id: 'violet', hex: '#8b5cf6' },
  { id: 'rose', hex: '#e152b0' },
  { id: 'gris', hex: '#a3a3a3' },
  { id: 'creme', hex: '#f1efe9' }
]

export const COLOR_BY_ID = new Map<string, BotColor>(COLORS.map((c) => [c.id, c]))
export const DEFAULT_COLOR = 'encre'

/** Melange deux couleurs hex. Sert a la brume de profondeur des particules. */
export function mixHex(from: string, to: string, t: number): string {
  const parse = (h: string) => {
    const v = parseInt(h.slice(1), 16)
    return [(v >> 16) & 255, (v >> 8) & 255, v & 255]
  }
  const a = parse(from)
  const b = parse(to)
  const c = a.map((x, i) => Math.round(x + (b[i]! - x) * t))
  return `#${c.map((x) => x.toString(16).padStart(2, '0')).join('')}`
}
