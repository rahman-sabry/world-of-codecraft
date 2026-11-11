// Where things are on the shown map (kit.js carte(): its data module, carte-valbrume.js, carte-port.js), resolved once per map:
// building-relative spots, boxes, chimneys, glows and standards made absolute, and the road's arc lengths. Every
// reader goes through lieux(), so switching maps needs no reload.

import { t } from "./i18n.js";
import { carte, CLASSES } from "./kit.js";

const ETAL = "etal1"; // the rogues' class building: the market
const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
const plus = (at) => ([dx, dy]) => [at[0] + dx, at[1] + dy];
const boite = ({ at, box: [dx, dy, w, h] }) => [at[0] + dx, at[1] + dy, w, h];

/** A map's layout, absolute. Its own fields (FLANE, ROAD, EAU, DECK, VICTOIRE, BASCULE, the village life's...)
 *  as they are, plus:
 *  - SPOTS: feet points per class building (kit.js CLASSES bat), from its building's (the market's for etal1) spots;
 *  - BUILDINGS: hit boxes [x, y, w, h] and names (in the current language) by building;
 *  - MARCHE: the market's box; BANNIERES: the town hall's standards; SMOKE: chimney tops; GLOWS: live glows;
 *  - ROAD_S: the road's arc length at each point; POSTES: every known walkable point (stroll spots, work spots, the
 *    road inside the world's ends), where a working hero is nudged to when another holds its point. */
function resoudre(c) {
  const B = Object.entries(c.batiments);
  const SPOTS = Object.fromEntries(Object.values(CLASSES).map(({ bat }) => {
    const b = bat === ETAL ? c.marche : c.batiments[bat];
    return [bat, b.spots.map(plus(b.at))];
  }));
  const BUILDINGS = Object.fromEntries(B.map(([k, b]) => [k, { get nom() { return t("building")[k]; }, box: boite(b) }]));
  const ROAD_S = c.ROAD.reduce((acc, p, i) => (acc.push(i ? acc[i - 1] + dist(c.ROAD[i - 1], p) : 0), acc), []);
  const POSTES = [...c.FLANE, ...Object.values(SPOTS).flat(), ...c.ROAD.filter(([x]) => x > c.WORLD.x && x < c.WORLD.x + c.WORLD.w)];
  return { ...c, SPOTS, BUILDINGS, MARCHE: boite(c.marche),
    BANNIERES: B.flatMap(([, b]) => (b.bannieres ?? []).map(plus(b.at))),
    SMOKE: B.flatMap(([, b]) => (b.fumees ?? []).map(plus(b.at))),
    GLOWS: B.flatMap(([, b]) => (b.lueurs ?? []).map((g) => ({ ...g, at: plus(b.at)(g.at) }))),
    ROAD_S, POSTES };
}

const RESOLUS = new Map(); // map id -> its resolved layout
/** The shown map's layout (resolved on first use, then cached). */
export function lieux() {
  const c = carte();
  let L = RESOLUS.get(c.id);
  if (!L) { L = resoudre(c); RESOLUS.set(c.id, L); }
  return L;
}

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

/** p in one of the map's water shapes (EAU, map px): a polyline within its half width `demi` (a river), an ellipse
 *  [cx, cy, rx, ry] (a lake), a polygon (a sea, a basin). */
function dansEau([x, y], e) {
  if (e.ligne) return toLine([x, y], e.ligne) < e.demi;
  if (e.ellipse) { const [cx, cy, rx, ry] = e.ellipse; return ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 < 1; }
  let dedans = false;
  for (let i = 0, P = e.polygone, j = P.length - 1; i < P.length; j = i++) {
    const [ax, ay] = P[i], [bx, by] = P[j];
    if ((ay > y) !== (by > y) && x < ((bx - ax) * (y - ay)) / (by - ay) + ax) dedans = !dedans;
  }
  return dedans;
}

/** Open ground a unit may stand on (there is no ground map at run time): a deck (bridge, pier), the road, or near a
 *  known standing spot outside every building's box (hit boxes: larger than the buildings, they overlap the road);
 *  never the water. */
export function walkable(p) {
  // memoized per map on the exact point (callers ask the same points every frame; a long sea polygon is costly)
  const L = lieux(), k = `${p[0]}|${p[1]}`;
  if (MARCHE.id !== L.id || MARCHE.m.size > 8192) { MARCHE.id = L.id; MARCHE.m.clear(); }
  let v = MARCHE.m.get(k);
  if (v === undefined) { v = sol(p, L); MARCHE.m.set(k, v); }
  return v;
}
const MARCHE = { id: null, m: new Map() }; // the shown map's walkable() answers by point

function sol(p, L) {
  const [x, y] = p;
  const { DECK, EAU, ROAD, ROAD_R, BUILDINGS, FLANE, SPOTS, SPOT_R } = L;
  if (toLine(p, DECK) < 14) return true;
  if (EAU.some((e) => dansEau(p, e))) return false;
  if (toLine(p, ROAD) < ROAD_R) return true;
  if (Object.values(BUILDINGS).some(({ box: [bx, by, bw, bh] }) => x > bx && x < bx + bw && y > by && y < by + bh)) return false;
  return [...FLANE, ...Object.values(SPOTS).flat()].some(([sx, sy]) => Math.hypot(sx - x, sy - y) < SPOT_R);
}

/** The market's name in the current language. */
export const market = () => t("market");
