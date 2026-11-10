// Where things are in the baked world (art/monde: the village is x 0-3000 of a world from -1000 to 4000, 400
// logical px high; 1 art px = 1 logical px).
// Hand-edited: unit spots per building (feet points), where idle heroes stroll, the road heroes walk on,
// building hit boxes (tooltip, double-click to recruit), chimneys and live glows.

import { t } from "./i18n.js";

/** Feet points where the demo heroes of each class stand while working / blocked / done (first free wins); with
 *  FLANE and ROAD, the walkable points a working hero moves between. */
export const SPOTS = {
  tour: [[690, 372], [640, 342], [745, 352], [470, 338], [600, 390]], // mage tower (mage)
  atelier: [[1010, 300], [935, 290], [1060, 272], [820, 296], [1090, 312]], // forge-workshop (artificer)
  caserne: [[2600, 338], [2470, 345], [2700, 318], [2380, 352], [2530, 368], [2660, 366], [2750, 345], [2430, 380]], // barracks (warrior, shells on guard)
  temple: [[2190, 372], [2235, 338], [2110, 388], [2290, 362], [2160, 330]], // temple (priest)
  grange: [[420, 345], [290, 300], [520, 312], [350, 378], [470, 380]], // barn and archery spot (ranger)
  etal1: [[2020, 395], [1735, 320], [1040, 318], [960, 316], [1190, 392]], // market stalls (rogue)
};

/** Where idle heroes stroll (feet points on open ground, in front of every object of the new lands): the
 *  village (road, square, in front of the buildings), the farmland west (fields, the windmill's door) and,
 *  over the footbridge, the east lands (by the jetty, the lake's south and east shores, along the lane). */
export const FLANE = [
  [330, 335], [640, 350], [900, 340], [1200, 380], [1520, 335], [1598, 352], [1680, 342], [1900, 352], [2150, 375],
  [2450, 360], [2700, 305], [-180, 345], [-260, 325], [-460, 365], [-505, 322], [-640, 330], [-800, 345], [-920, 346],
  [3400, 250], [3545, 292], [3700, 316], [3835, 228], [3920, 322],
];

/** The dirt road along the front of the village (screen feet points), walked between spots; west, it follows
 *  the baked road through the farmland (kept a little north at -620 to pass behind no bush); east, the baked
 *  path over the footbridge (its ramps at 3054 and 3168, the deck 7 px up: feet on the planks, behind the
 *  front rail's cut-outs) to the lane by the lake (tools/bake_wide.py, CROSSING and LANE). */
export const ROAD = [
  [-1000, 350], [-840, 340], [-620, 354], [-400, 338], [-180, 352], [0, 330], [200, 320], [420, 372], [640, 345], [900, 330], [1060, 360], [1350, 380], [1500, 372],
  [1610, 392], [1720, 360], [1900, 350], [2150, 372], [2330, 340], [2560, 330], [2700, 300],
  [2840, 288], [2950, 256], [3054, 201], [3063, 199], [3159, 247], [3168, 259], [3250, 284], [3340, 282], [3426, 252], [3600, 322], [3800, 310], [4000, 335],
];

/** Building hit boxes [x, y, w, h] and names (in the current language). */
export const BUILDINGS = {
  grange: { get nom() { return t("building").grange; }, box: [70, 75, 220, 200] },
  tour: { get nom() { return t("building").tour; }, box: [505, 15, 110, 350] },
  atelier: { get nom() { return t("building").atelier; }, box: [750, 70, 230, 200] },
  hotel: { get nom() { return t("building").hotel; }, box: [1115, 20, 330, 320] },
  taverne: { get nom() { return t("building").taverne; }, box: [1475, 40, 230, 250] },
  temple: { get nom() { return t("building").temple; }, box: [1890, 10, 270, 350] },
  caserne: { get nom() { return t("building").caserne; }, box: [2330, 100, 240, 220] },
};
// The water, measured on the baked world (tools/bake_wide.py): the river's centre line and half width, the lake's
// ellipse [cx, cy, rx, ry], and the footbridge's deck (walkable over the river).
const RIVER = [[3420, 20], [3300, 110], [3130, 190], [3070, 260], [3020, 330], [2860, 380], [2740, 410]];
const RIVER_R = 36;
const LAKE = [3570, 165, 245, 130];
const DECK = [[3054, 201], [3168, 259]];
const SPOT_R = 60, ROAD_R = 30;

/** Distance from p to the polyline pts. */
function toLine([x, y], pts) {
  let best = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
    const dx = bx - ax, dy = by - ay, k = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
    best = Math.min(best, Math.hypot(ax + k * dx - x, ay + k * dy - y));
  }
  return best;
}

/** Open ground a unit may stand on (there is no ground map at run time): the bridge's deck, the road, or near a
 *  known standing spot outside every building's box (hit boxes: larger than the buildings, they overlap the road);
 *  never the water. */
export function walkable(p) {
  const [x, y] = p;
  if (toLine(p, DECK) < 14) return true;
  if (toLine(p, RIVER) < RIVER_R || ((x - LAKE[0]) / LAKE[2]) ** 2 + ((y - LAKE[1]) / LAKE[3]) ** 2 < 1) return false;
  if (toLine(p, ROAD) < ROAD_R) return true;
  if (Object.values(BUILDINGS).some(({ box: [bx, by, bw, bh] }) => x > bx && x < bx + bw && y > by && y < by + bh)) return false;
  return [...FLANE, ...Object.values(SPOTS).flat()].some(([sx, sy]) => Math.hypot(sx - x, sy - y) < SPOT_R);
}

/** The market's name in the current language, and its box [x, y, w, h] (the red and blue stalls). */
export const market = () => t("market");
export const MARCHE = [1647, 309, 317, 91];

/** Chimney tops (smoke) and live glows [x, y, size, color, period] (night only). */
export const SMOKE = [[827, 95], [1590, 47], [1639, 100]];
export const GLOWS = [
  { at: [815, 236], size: 60, color: "#ff8a2b", period: 650 }, // forge hearth
  { at: [558, 160], size: 70, color: "#a86bff", period: 2200 }, // tower windows
];
