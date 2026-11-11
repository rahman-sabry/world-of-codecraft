// What each hero is doing while Herdr says "working", from the Claude Code hook
// (integrations/claude-code/wocc-activity.py and integrations/opencode/wocc-activity.js in the repo
// → ~/.local/state/world-of-codecraft/<terminal>.json), and the scenes it plays:
//   pense    thinking            idle pose + "…" bubble
//   eclaire  reading, searching  idle pose where it stands, ravens circling above it
//   combat   editing code        fights a creature drawn for the task (imp, wolf, goblin); every successful
//                                edit is a blow, 4 blows fell it and the next one comes; a failed tool = the
//                                hero is hit (red flash, recoil, "Ouch!")
//   medite   compacting          sits cross-legged (`rest`), runes orbit and a crystal pulses
//   test     running tests       strikes a training dummy; passed = the dummy falls + "Tests passed!",
//                                failed = "Tests failing" (the result stays 5 s, whatever the scene)
//   travail  bash and the rest   the usual `work` loop
// plus, whatever the scene: a wax seal and "Sealed!" on a git commit, a carrier pigeon flying off east on a
// git push; and, whatever the status, apprentices (one full-size hero per running subagent) trailing the hero.
// Raid: while a hero has running subagents, whatever its status, it fights the day's raid boss (a troll, golem,
// spectre or goblin by date, all as tall as the troll drawn twice as large, kit.js bossDuJour): one boss in the world,
// beside the first hero to raid, the others walking to a place around it (place); each successful subagent tool call
// is 1 damage. At 0 HP it falls in a gold burst (no more raids that day) and the gathering disperses; when every
// raiding hero's subagents have ended, it flees and keeps its HP. It wins over the scenes.
// Minions: once today's boss is slain, a hero with running subagents fights the boss's minions instead (one per
// subagent, up to 3, the day's species at a fight creature's size); each successful subagent tool call is a blow,
// round-robin, 4 fell one and a fresh one comes; they flee when its subagents end. Nothing stored, no chronicle.
// Lot 2: six creatures in the draw (imp, wolf, goblin, boar, rust golem, spectre); a task with 3+ failed
// tools brings the forest troll, a boss of 8 blows.
// Anti-zapping: a scene changes only when the new one has been asked for 8 s and the current one has
// lasted 15 s; 20 s / 40 s when it means walking to or from the forest edge (meditation, tests and the
// end of work switch at once).

import { div, image, svg } from "gpui-kit";
import { home, readTextFile, shared, setShared } from "herdr";
import { hash, UI, C, heroOf, walkAnim, BOSS, TROPHEES, bossDuJour, veille, especeBoss, palier, PALIERS } from "./kit.js";
import { walkable, lieux } from "./lieux.js";
import { CREATURES } from "./creatures-data.js";
import { HEROES } from "./heros-data.js";
import { t as tr } from "./i18n.js";
import { FX } from "./effets.js";

const ART = "mods/world-of-codecraft/art";
const CRE = `${ART}/creatures`;
const POLL = 1000;
const STABLE = 8000; // the new scene must be asked for this long
const HOLD = 15000; // and the current one must have lasted this long
const STABLE_WALK = 20000; // switching into or out of scouting is stickier:
const HOLD_WALK = 40000; // otherwise read / run / read loops flicker the ravens on and off
const FRESH = 15 * 60_000; // an activity file older than this is ignored
const BLOWS = 4; // successful edits to fell a creature
const BOSS_BLOWS = 8; // the troll's
const BOSS_AFTER = 3; // failed tools in a task before the troll comes
const SPECIES = ["diablotin", "loup", "gobelin", "sanglier", "golem", "spectre"];
/** Each district's own beasts. Mages (Claude Code) draw from the whole pool; the others (OpenCode = ranger
 *  at the barn, via integrations/opencode/wocc-activity.js) from their district's. */
export const DISTRICT = { atelier: ["golem", "gobelin"], grange: ["loup", "sanglier"], temple: ["spectre"], etal1: ["gobelin", "loup"] };
const HOME = { artificier: "atelier", rodeur: "grange", pretre: "temple", voleur: "etal1" };
const CLS_FR = { mage: "mage", artificer: "artificier", ranger: "rodeur", priest: "pretre", rogue: "voleur", warrior: "guerrier" };
const clsOf = (a) => (a.demoHero ? CLS_FR[a.demoHero.split("-")[1]] : heroOf(a.address, a.program).cls); // a look key ("orc-warrior") as demoHero too
const RESULT = 5000; // a test result stays on screen this long
const BETE = 1.5; // fight creatures drawn this much larger (art 2x: 3x3 screen px per art px, still crisp)
const STUCK = 10000; // a fight with no blow for this long (delegating to subagents) no longer holds the hero
const SCENE_OF = { pense: "pense", eclaire: "eclaire", web: "eclaire", code: "combat", commande: "combat", medite: "medite", test: "test" };
const FX_MAX = 12; // fight effects running at once at most (a burst of calls spawns no more)
const SUB_TTL = 30 * 60_000; // an activity file silent this long has no running subagents (as the hook drops them)
const subsOf = (s) => (s && Date.now() - (s.t ?? 0) < SUB_TTL ? s.subs ?? 0 : 0);
const KINDS = Object.keys(HEROES); // any race x class, for the apprentices
// Apprentice slots: [dx (positive = away from the creature's side), dy, lag (ms) behind the hero in single file]
const SLOTS = [[70, 12, 900], [-70, -20, 1800], [140, -6, 2700], [-140, -30, 3600]];
const STEP = 40; // px/s an apprentice walks onto the hero's path and back out to its slot
export const TRAIL = 3600 + (150 / STEP) * 1000; // the last apprentice ends its walk this long after the hero
const GAP = 45; // px kept between apprentices
const WORKS = new Set(["code", "commande", "test"]); // a subagent's acts shown with `work`
const READS = new Set(["eclaire", "web"]); // and with the scroll over the head
const GEANT = 2; // the troll raid boss drawn this much larger (art 2x: 4x4 screen px per art px); the others match its height
const COUP = 900; // a raid blow (damage dealt in a poll) shows this long
const CHUTE = 1200; // the raid boss's fall (the felled puff and the gold burst), or a minion's flight, lasts this long
const ETAPES = [100, 700]; // the fall's and the flight's stages: open / walk off from here, fade from here
const etape = (dt) => ETAPES.filter((s) => dt >= s).length;
const FUIR = 150; // px a fleeing minion walks away from its hero
const ERRE = 12; // px/s the day's boss wanders its lair at (errance)
const PAS = 50000; // ms per wander waypoint: it walks to the next, then stands there
const PIETINE = 40; // px/s its stomps in a raid and its walk back onto its wander path
const STOMP = [30000, 60000]; // ms between two stomps while a raid holds it
const SAUT = [120, 220]; // px a stomp takes it (fewer when its lair has no such room: pietine)
export const VOYAGE = [400, 700]; // a hero's teleport's stages (portail): fade into the portal, show at the far end
export const PORTAIL = 1400; // and its end, both portals closed
const SBIRES = 3; // minions at most per hero
// A minion's feet from its hero's (side 1 = right), in order of preference: in front, behind, further in front, spares
const PLACES = [[80, 18], [170, -26], [170, 56], [255, 14], [260, -44], [100, -60]];
const SBIRE = { troll: "gobelin" }; // the troll is too wide for three: its minions are goblins
// The raid ring: a party member's slot round the boss (raiders and apprentices alike), [ring (ANNEAU px further out
// each), θ (degrees round the boss on the ground: 0 = beside it, + = nearer the viewer), c (1 = the village's side, -1
// the other)], at the member's own class gap (ECART) past the boss's half width along θ (anneau). By fighting range
// (RANG, [ring, |θ|] in order, each tried on the preferred side first, then nearer the viewer first): the front line
// (ring 0) to melee looks, the artificer, priest and mage on ring 1 behind them, the ranger on ring 2; each ring
// falls back on the others when full.
const MELEE = new Set(["guerrier", "voleur"]);
const R0 = [[0, 0], [0, 35], [0, 60]], R1 = [[1, 0], [1, 20], [1, 40]], R2 = [[2, 0], [2, 20], [2, 40]];
const RANG = {
  melee: [...R0, ...R1, ...R2],
  milieu: [...R1, [0, 60], ...R2, [0, 35], [0, 0]],
  loin: [...R2, ...R1, [0, 60], [0, 35], [0, 0]],
};
const rangDe = (cls) => (MELEE.has(cls) ? "melee" : cls === "rodeur" ? "loin" : "milieu");
const ANNEAU = 75;
const APLAT = 0.32; // the ring's depth for its width: flatter than the iso ground (0.5) to fit the strip
const ESPACE = [48, 28]; // two feet points (raiders, apprentices) at least this ellipse apart (px across, px deep)
const apart = (p, q) => ((p[0] - q[0]) / ESPACE[0]) ** 2 + ((p[1] - q[1]) / ESPACE[1]) ** 2 >= 1;
const VUS = "wocc.boss.vus"; // { address: the subCoups already counted as damage }, so a reload neither loses nor recounts

// The gap (px) a hero of each class keeps from its enemy: from its feet to a raid boss's edge (geantDe); a minion or a
// fight creature stands this much minus the mage's nearer (or further) than a mage has it (proche)
export const ECART = { guerrier: 10, voleur: 15, artificier: 30, pretre: 45, mage: 50, rodeur: 65 };
const ecartDe = (a) => ECART[a ? clsOf(a) : "mage"] ?? ECART.mage;

/** A raid boss species' drawing: its scale k (the troll's height at GEANT, rounded to a half so an art px stays whole
 *  screen px), demi (half its widest pose), loin (px from the hero's feet to its feet: demi + the hero's class gap,
 *  ECART; ecart defaults to a mage's), large (demi plus an apprentice's half body: no file apprentice's feet that close
 *  to its x) and corps (its `pret` body's wider half + 10: no feet on its ring that close to its x). */
export function geantDe(sp, ecart = ECART.mage) {
  const D = CREATURES[sp], T = CREATURES.troll;
  const k = Math.round((T.pret.h * GEANT * 2) / D.pret.h) / 2;
  const demi = Math.max(...Object.values(D).flatMap((p) => [p.ax, p.w - p.ax])) * k;
  return { k, demi, loin: Math.round(demi + ecart), large: demi + 25, corps: Math.max(D.pret.ax, D.pret.w - D.pret.ax) * k + 10 };
}

/** Today's boss's lair: the outskirt a hash of the day picks (cote: "ouest" or "est"), from the map's ANTRE
 *  ({ ouest, est: { x: [x0, x1], y: [y0, y1] } }), else the world's outer 800 px at that end (150 px in) between 78%
 *  and 92% of its height. { cote, x, y }. */
export function antre(day) {
  const { ANTRE, WORLD } = lieux(), cote = hash(`${day}:antre`) % 2 ? "est" : "ouest";
  const z = ANTRE?.[cote] ?? { x: cote === "ouest" ? [WORLD.x + 150, WORLD.x + 800] : [WORLD.x + WORLD.w - 800, WORLD.x + WORLD.w - 150] };
  return { cote, x: z.x, y: z.y ?? [Math.round(WORLD.h * 0.78), Math.round(WORLD.h * 0.92)] };
}

/** Room on both sides of boss feet q (the day's species), so a party can stand round it: beside it at a warrior's
 *  gap (ring 0) and a mage's one ring out (ring 1), each walkable. */
function cotes(day, q) {
  const { demi } = geantDe(especeBoss(day));
  return [demi + ECART.guerrier, demi + ECART.mage + ANNEAU].every((dx) => walkable([q[0] - dx, q[1] - 16]) && walkable([q[0] + dx, q[1] - 16]));
}

/** Waypoint i of the day's wander in lair Z: the first of 24 points hashed from the day and i that is walkable with
 *  room on both sides (cotes), else the first walkable one, else the lair's centre. */
const JALONS = new Map(); // day:map:i -> its waypoint (each is drawn from hashes and walkable() tests: compute once)
function jalon(day, Z, i) {
  const id = `${day}:${lieux().id}:${i}`;
  if (!JALONS.has(id)) {
    if (JALONS.size > 64) JALONS.clear();
    JALONS.set(id, choisirJalon(day, Z, i));
  }
  return JALONS.get(id);
}
function choisirJalon(day, Z, i) {
  const pts = Array.from({ length: 24 }, (_, k) => {
    const h = hash(`${day}:jalon:${i}:${k}`);
    return [Z.x[0] + (h % (Z.x[1] - Z.x[0] + 1)), Z.y[0] + ((h >>> 12) % (Z.y[1] - Z.y[0] + 1))];
  }).filter((q) => walkable(q));
  return pts.find((q) => cotes(day, q)) ?? pts[0] ?? [Math.round((Z.x[0] + Z.x[1]) / 2), Math.round((Z.y[0] + Z.y[1]) / 2)];
}

/** Where today's boss wanders at t: each PAS ms from waypoint floor(t / PAS) to the next at ERRE px/s, then standing
 *  there. Pure, from the day and the time only: every village and every reload draws it at the same spot.
 *  { x, y, leg ({ a, b, t0, t1 } while it walks, else null), fin (its leg's end, or the next one's start) }. */
export function errance(day, t) {
  const Z = antre(day), i = Math.floor(t / PAS), a = jalon(day, Z, i), b = jalon(day, Z, i + 1);
  const t0 = i * PAS, t1 = t0 + Math.min(PAS - 1000, (Math.hypot(b[0] - a[0], b[1] - a[1]) / ERRE) * 1000);
  if (t >= t1) return { x: b[0], y: b[1], leg: null, fin: t0 + PAS };
  const k = (t - t0) / (t1 - t0);
  return { x: a[0] + (b[0] - a[0]) * k, y: a[1] + (b[1] - a[1]) * k, leg: { a, b, t0, t1 }, fin: t1 };
}

/** The wait before a raided boss's next stomp (STOMP). */
const attente = () => STOMP[0] + Math.random() * (STOMP[1] - STOMP[0]);

/** The work frames of look key (a hero's or an apprentice's, "orc-warrior") that face side (1 right, -1 left;
 *  0 = no foe: its own `work`): `work-g` when its `work` frames face the other way (heros-data.js face). */
export const travail = (key, side) => (side && side * (HEROES[key]?.face ?? 1) < 0 ? "work-g" : "work");

/** Off raid boss A's body for feet at q: corps px off its x in front of its first hero's line, its whole half width
 *  (demi) behind it, where the boss would hide them. */
const clair = (A, q, demi, corps) => Math.abs(q[0] - A.x) >= (q[1] < A.y - 16 ? demi : corps);

/** The point at θ degrees on ring r round raid boss A (c = 1 its first hero's side, -1 the other; demi its half width,
 *  d the class gap past it): on the line through its first hero's feet, 16 px behind its own. */
function anneau(A, demi, r, th, c, d) {
  const D = demi + d + ANNEAU * r, a = (th * Math.PI) / 180;
  return [Math.round(A.x - c * A.side * D * Math.cos(a)), Math.round(A.y - 16 + D * Math.sin(a) * APLAT)];
}

/** How far (px, feet to feet, along x) a fight creature or a minion of species sp (at BETE) on side `side` stands from
 *  hero u when a mage has it at off: moved by u's class gap minus the mage's (ECART), but never so near that its `pret`
 *  box's near edge comes within 10 px of the hero's feet, unless off itself was (sprites may overlap, as in a raid). */
function proche(u, off, sp, side) {
  const P = CREATURES[sp].pret;
  return Math.max(off + ecartDe(u.a) - ECART.mage, Math.min(off, (side > 0 ? P.ax : P.w - P.ax) * BETE + 10));
}

/** Where slot k stands by a hero standing at p: its offset, else mirrored, else pulled in (mirrored too), the first
 *  on walkable ground at least GAP px from the apprentices placed before it (and, in a raid, off the boss's
 *  footprint: raid = { x (the boss's), large } (geantDe), or the minions' zone { loin, large } (rangs)); else the first
 *  such point around the hero; else a quarter of its offset (away from a raid boss). */
function spot(p, k, side, taken, raid) {
  // in a raid every slot is on the side away from the boss, zigzagging out 45 px apart
  const [dx0, dy] = raid ? [70 + 45 * k, k % 2 ? -30 : 6] : SLOTS[k], dx = -side * dx0;
  const free = (q) => walkable(q) && !taken.some((o) => Math.hypot(o[0] - q[0], o[1] - q[1]) < GAP)
    && !(raid && Math.abs(q[0] - (raid.x ?? p[0] + side * raid.loin)) < raid.large);
  for (const f of [1, 0.75, 0.5, 0.35]) for (const ox of [dx * f, -dx * f]) {
    const q = [p[0] + ox, p[1] + dy * Math.max(f, 0.5)];
    if (free(q)) return q;
  }
  // a cramped spot (a shore, the bridge): the first free ground around the hero
  for (const r of [45, 65, 85]) for (let i = 0; i < 12; i++) {
    const q = [p[0] + r * Math.cos((i * Math.PI) / 6), p[1] + r * Math.sin((i * Math.PI) / 6)];
    if (free(q)) return q;
  }
  return [p[0] + dx / 4, p[1] + dy / 4];
}

/** An apprentice's walk for the hero's legs: from its slot by the start onto the path, the hero's legs `lag` ms
 *  late (later when the step onto the path is longer), then out to its slot by the goal: { legs, x, y } (Place.pos). */
function trail(legs, from, to, lag) {
  if (!legs.length) return { legs: [], x: to[0], y: to[1] };
  const a = legs[0].a, z = legs[legs.length - 1].b, T0 = legs[0].t0;
  const L = Math.max(lag, (Math.hypot(a[0] - from[0], a[1] - from[1]) / STEP) * 1000);
  const T1 = legs[legs.length - 1].t1 + L;
  return { x: to[0], y: to[1], legs: [{ a: from, b: a, t0: T0, t1: T0 + L },
    ...legs.map((l) => ({ a: l.a, b: l.b, t0: l.t0 + L, t1: l.t1 + L })),
    { a: z, b: to, t0: T1, t1: T1 + (Math.hypot(to[0] - z[0], to[1] - z[1]) / STEP) * 1000 }] };
}
const boss = (s) => (s?.errTache ?? 0) >= BOSS_AFTER;
const blowsFor = (s) => (boss(s) ? BOSS_BLOWS : BLOWS);
const recent = (t, ms) => Boolean(t) && Date.now() - t < ms;

/** The scene the activity file asks for (null = the plain status behaviour). */
function wanted(a, s, now) {
  if (a.status !== "working" || !s || now - (s.t ?? 0) > FRESH) return null;
  return SCENE_OF[s.act] ?? null;
}

export class Activites {
  constructor() {
    this.files = new Map(); // address -> parsed activity file
    this.scenes = new Map(); // address -> { scene, since, cand, candSince }
    this.hits = new Map(); // address -> { coups, at, felled: [{ species, at }] }
    this.slots = new Map(); // address -> Map(subagent id -> apprentice slot)
    this.ou = new Map(); // address:subagent id -> { tr, det, walk, from }: an apprentice off its file or walking back to it
    this.raids = new Map(); // address -> { ids (running subagents) }: the heroes in the raid
    // the day's boss (boss()): { day, carte, x, y (its feet while a raid holds it or it lies fallen), side (-1 when the
    // village is east of its lair, 1 west: the ring's c = 1 side, anneau), pas (its stomp or walk back { a, b, t0, t1 },
    // null = none), next (its next stomp), at (last blow), fin (its fall, 0 = alive), places (address -> { s (its ring
    // slot), q (its feet) }), apps (address:subagent id -> an apprentice's spot, coin) }
    this.arene = null;
    this.sbires = new Map(); // address -> { rr (next to be hit), list: [{ id (its subagent), k (its place), coups, at (last blow), fin (its flight, 0 = none) }], felled: [{ k, at }] }
    this.abattu = null; // (address, day) when this village's damage slays the boss: the chronicle line (Place)
    this.effets = new Map(); // member (address, or address:subagent id) -> its blow's effect { t0, addr, id, cible } (frappe)
    this.subT = new Map(); // address -> { subagent id: its last event } at the last poll (whose blows these are)
    this.timer = null;
    this.busy = false;
  }

  /** The scene a unit plays now (decided in the poll, read in render); none during a raid. */
  scene(addr) {
    if (this.melee(addr)) return null;
    return this.scenes.get(addr)?.scene ?? null;
  }

  /** True while a hero fights: a raid, or minions standing or fleeing (it plays `work` and stays where it is). */
  melee(addr) {
    return Boolean(this.raid(addr)) || this.sbires.has(addr);
  }

  /** The side a hero standing at u fights towards (1 = right, -1 = left; travail picks its frames): a raider the
   *  boss's, a hero with minions theirs (rangs), one fighting its scene's creature or the dummy theirs (cible); 0 when
   *  it does not fight. */
  face(u) {
    const addr = u.a.address, A = this.raid(addr) && this.arene;
    if (A) return A.x < u.x ? -1 : 1;
    if (this.sbires.has(addr)) return rangs(u, sbire(), u.x > lieux().BASCULE ? -1 : 1).side;
    return this.cible(u) ?? 0;
  }

  /** The side of the creature (or the training dummy) a hero standing at u fights outside a raid (creature): on its
   *  right, on its left past BASCULE; null when none is drawn. */
  cible(u) {
    const addr = u.a.address;
    if (u.leg || u.portail || this.raid(addr)) return null;
    const s = this.file(addr) ?? u.a.demoAct;
    if (!s) return null;
    const sc = this.scene(addr);
    if (sc !== "combat" && sc !== "test" && !recent(s.essai?.t, RESULT)) return null;
    return u.x > lieux().BASCULE ? -1 : 1;
  }

  /** The day's boss, made on first use each day (and on another map): in today's lair (antre), on its wander's spot
   *  (errance); slain today (fin), it is gone once its fall is over. Its fall's end drops the raid. */
  boss() {
    const now = Date.now(), b = bossDuJour(new Date(now)), carte = lieux().id ?? "";
    let A = this.arene;
    if (!A || A.day !== b.day || A.carte !== carte) {
      const fin = b.slain ? b.slainAt ?? 1 : 0, e = errance(b.day, fin || now);
      A = this.arene = { day: b.day, carte, x: Math.round(e.x), y: Math.round(e.y),
        side: antre(b.day).cote === "ouest" ? -1 : 1, pas: null, next: 0, at: 0, fin, places: new Map(), apps: new Map() };
      this.raids.clear();
    }
    if (A.fin && now - A.fin >= CHUTE && this.raids.size) this.raids.clear();
    return A;
  }

  /** Where the day's boss is at t, and the leg it walks then ({ a, b, t0, t1 } or null): its stomp or its walk back
   *  (pas) while it lasts; else where it lies or a raid holds it; else its wander (errance). */
  ici(t) {
    const A = this.boss(), P = A.pas;
    if (P && t < P.t1) {
      const k = Math.max(0, (t - P.t0) / (P.t1 - P.t0));
      return { x: P.a[0] + (P.b[0] - P.a[0]) * k, y: P.a[1] + (P.b[1] - P.a[1]) * k, leg: P };
    }
    if (A.fin || this.raids.size) return { x: A.x, y: A.y, leg: null };
    return errance(A.day, t);
  }

  /** When the wandering boss next starts or ends a leg (the ambient timer redraws then), or null (held, fallen). */
  reveil(t) {
    const A = this.boss();
    if (A.fin || this.raids.size || (A.pas && t < A.pas.t1) || !this.ecrit) return null;
    return errance(A.day, t).fin;
  }

  /** A hero's part in the raid while it has running subagents, and through the boss's fall (null = none). */
  raid(addr) {
    this.boss();
    return this.raids.get(addr) ?? null;
  }

  /** Follows the heroes' running subagents (lus: [address, its file]; not demo heroes): while today's boss stands,
   *  every hero with some is in the raid and one whose subagents all end leaves it. The first one holds the boss where
   *  it is (its wander pauses), a stomp moves it every STOMP while one is left, and when none is, it walks back onto
   *  its wander. It falls where it is when slain (mort); the raiders keep their places through the fall. True when the
   *  raid changed. */
  mene(lus, now, mort) {
    const A = this.boss();
    if (A.fin) return false;
    if (mort) {
      const p = this.ici(now);
      return Object.assign(A, { fin: now, x: Math.round(p.x), y: Math.round(p.y), pas: null }), true;
    }
    const vifs = lus.map(([addr, s]) => [addr, this.subagents(s).map((x) => x.id)]).filter(([, ids]) => ids.length);
    const avant = this.raids.size;
    let changed = false;
    for (const addr of [...this.raids.keys()]) if (!vifs.some(([a]) => a === addr)) {
      this.raids.delete(addr); A.places.delete(addr); changed = true;
      for (const k of [...A.apps.keys()]) if (k.startsWith(`${addr}:`)) A.apps.delete(k);
    }
    if (!avant && vifs.length) { // the raid begins: it stops where it is
      const p = this.ici(now);
      Object.assign(A, { x: Math.round(p.x), y: Math.round(p.y), pas: null, next: now + attente() });
    }
    for (const [addr, ids] of vifs) {
      const r = this.raids.get(addr);
      if (!r) { this.raids.set(addr, { ids }); changed = true; } else if (r.ids.join() !== ids.join()) { r.ids = ids; changed = true; }
    }
    if (avant && !this.raids.size) { // the raid is over: back onto its wander, where it will be when it gets there
      const p = this.ici(now), e = errance(A.day, now), t1 = now + (Math.hypot(e.x - p.x, e.y - p.y) / PIETINE) * 1000, f = errance(A.day, t1);
      A.pas = { a: [Math.round(p.x), Math.round(p.y)], b: [Math.round(f.x), Math.round(f.y)], t0: now, t1 };
      changed = true;
    }
    if (this.raids.size && now >= A.next && !(A.pas && now < A.pas.t1)) changed = this.pietine(now) || changed;
    return changed;
  }

  /** A stomp: SAUT px (on screen) to a walkable point of its lair with room on both its sides (cotes; the first of 24
   *  random tries), else the farthest such point of 24 others in its lair within SAUT[1] px (at least 60 px off), at PIETINE
   *  px/s; the whole party takes its slots afresh round the new spot (replace) and walks there. True when it moved. */
  pietine(now) {
    const A = this.arene, Z = antre(A.day);
    A.next = now + attente();
    const bon = (q) => q[0] >= Z.x[0] && q[0] <= Z.x[1] && q[1] >= Z.y[0] && q[1] <= Z.y[1] && walkable(q) && cotes(A.day, q);
    const loin = (q) => Math.hypot(q[0] - A.x, q[1] - A.y);
    const tirage = Array.from({ length: 24 }, () => {
      const a = Math.random() * 2 * Math.PI, d = SAUT[0] + Math.random() * (SAUT[1] - SAUT[0]);
      return [Math.round(A.x + Math.cos(a) * d), Math.round(A.y + Math.sin(a) * d * APLAT)];
    });
    const repli = Array.from({ length: 24 }, () => [Math.round(Z.x[0] + Math.random() * (Z.x[1] - Z.x[0])), Math.round(Z.y[0] + Math.random() * (Z.y[1] - Z.y[0]))])
      .filter((q) => loin(q) >= 60 && loin(q) <= SAUT[1]).sort((p, o) => loin(o) - loin(p));
    const q = tirage.find((q) => loin(q) >= SAUT[0] && bon(q)) ?? repli.find(bon);
    if (!q) return false;
    A.pas = { a: [A.x, A.y], b: q, t0: now, t1: now + (loin(q) / PIETINE) * 1000 };
    [A.x, A.y] = q;
    this.replace();
    return true;
  }

  /** The party takes its ring slots afresh round the boss's new spot, by fighting range: melee looks first (raiders
   *  and apprentices), then the artificers, priests, mages and rangers; each its old slot first when still free, a
   *  raider on the side with fewer, an apprentice its hero's side first. */
  replace() {
    const A = this.arene, cls = (addr) => { const a = this.list?.find((x) => x.address === addr); return a ? clsOf(a) : "mage"; };
    const ordre = ["melee", "milieu", "loin"];
    const qui = [...[...A.places].map(([k, P]) => ({ k, P, cls: cls(k) })), ...[...A.apps].map(([k, P]) => ({ k, P, cls: P.cls, app: true }))]
      .sort((p, q) => ordre.indexOf(rangDe(p.cls)) - ordre.indexOf(rangDe(q.cls)) || ECART[p.cls] - ECART[q.cls]);
    A.places.clear();
    A.apps.clear();
    for (const m of qui) {
      if (!m.app) { this.prend(m.k, m.P.s); continue; }
      const h = A.places.get(m.P.hero)?.q ?? [A.x, A.y], got = this.choisir(m.cls, h[0] > A.x ? -A.side : A.side, m.P.s);
      if (got) A.apps.set(m.k, { ...m.P, s: got[0], q: got[1] });
    }
  }

  /** Where a hero of the raid stands by the boss (kept while it raids and through the boss's fall; null = none, or
   *  the fall is over). */
  place(addr) {
    const A = this.boss();
    if (!this.raids.has(addr)) return null;
    const P = A.places.get(addr);
    if (P) return P.q;
    return A.fin ? null : this.prend(addr, null);
  }

  /** Gives raider addr its place (prend: in its ring slot s when still free, else as choisir, on the side with fewer of
   *  the party first; else the nearest free walkable point (POSTES) within 400 px, off the boss's footprint). Its
   *  feet, or null. */
  prend(addr, s) {
    const A = this.arene, a = this.list?.find((x) => x.address === addr);
    const n = [...this.membres()].reduce((k, q) => k + Math.sign(q[0] - A.x), 0);
    const got = this.choisir(a ? clsOf(a) : "mage", n > 0 ? A.side : n < 0 ? -A.side : 1, s)
      ?? [null, lieux().POSTES.filter((p) => this.libre(p) && Math.abs(p[0] - A.x) >= geantDe(especeBoss(A.day)).large && Math.hypot(p[0] - A.x, p[1] - A.y) < 400)
        .sort((p, o) => Math.hypot(p[0] - A.x, p[1] - A.y) - Math.hypot(o[0] - A.x, o[1] - A.y))[0]];
    if (!got[1]) return null;
    A.places.set(addr, { s: got[0], q: got[1] });
    return got[1];
  }

  /** Every party member's feet in the raid: the raiders' places and the apprentices' spots. */
  *membres() {
    for (const P of this.arene.places.values()) yield P.q;
    for (const P of this.arene.apps.values()) yield P.q;
  }

  /** Free feet for a party member at q: walkable, inside the 400 px strip, off the boss's body (clair) and ESPACE from
   *  every other member. */
  libre(q) {
    const A = this.arene, { demi, corps } = geantDe(especeBoss(A.day));
    return walkable(q) && q[1] > 60 && q[1] < lieux().WORLD.h - 15 && clair(A, q, demi, corps) && [...this.membres()].every((o) => apart(o, q));
  }

  /** The first free ring slot for a party member of class cls at its own class gap (its slot s first when given), by
   *  fighting range (RANG), on side c0 first at equal rank, nearer the viewer first: [slot, feet] or null. */
  choisir(cls, c0, s) {
    const A = this.arene, { demi } = geantDe(especeBoss(A.day)), d = ECART[cls] ?? ECART.mage;
    const slots = [...(s ? [s] : []), ...RANG[rangDe(cls)].flatMap(([r, th]) => [c0, -c0].flatMap((c) => (th ? [[r, th, c], [r, -th, c]] : [[r, 0, c]])))];
    for (const x of slots) {
      const q = anneau(A, demi, ...x, d);
      if (this.libre(q)) return [x, q];
    }
    return null;
  }

  /** An apprentice's own spot in the raid (subagent id of hero addr, key its look; kept while both raid; null = it
   *  keeps to its hero's file): a ring slot for its look's class, anywhere round the boss (choisir), its hero's side
   *  first. */
  coin(addr, id, key) {
    const A = this.arene, k = `${addr}:${id}`;
    if (A.apps.has(k)) return A.apps.get(k).q;
    const h = A.places.get(addr)?.q;
    if (!h) return null;
    const got = this.choisir(CLS_FR[key.split("-")[1]], h[0] > A.x ? -A.side : A.side, null);
    if (!got) return null;
    A.apps.set(k, { s: got[0], q: got[1], hero: addr, cls: CLS_FR[key.split("-")[1]] });
    return got[1];
  }

  /** The reset (fronton.js, a store write): today's boss's HP rose. It stands again on its wander's spot (held there
   *  while raiders are left: they take places round it afresh and walk there); the minions go at once. */
  remise() {
    const A = this.boss(), now = Date.now(), e = errance(A.day, now);
    Object.assign(A, { fin: 0, at: 0, pas: null, x: Math.round(e.x), y: Math.round(e.y), next: now + attente() });
    A.places.clear();
    A.apps.clear();
    this.sbires.clear();
  }

  /** Follows a hero's minions once today's boss is slain (slain), not while its raid still falls: one per running
   *  subagent (up to SBIRES, at the first free place), the poll's d new subagent tool calls as blows spread round-robin
   *  (every BLOWS fells one: its puff, and a fresh one stands there), and a minion whose subagent ended flees. A day
   *  with no kill (midnight) drops them. True when something visible changed. */
  suit(addr, s, now, slain, d) {
    const sb = this.sbires.get(addr);
    if (!slain) return this.sbires.delete(addr);
    if (this.boss().fin && Date.now() - this.boss().fin < CHUTE) return false; // the boss's fall first
    const ids = this.subagents(s).map((x) => x.id);
    const o = sb ?? { rr: 0, list: [], felled: [] };
    let changed = false;
    for (const m of o.list) if (!m.fin && !ids.includes(m.id)) { m.fin = now; changed = true; }
    const n = o.list.length;
    o.list = o.list.filter((m) => !m.fin || now - m.fin < CHUTE);
    o.felled = o.felled.filter((f) => now - f.at < 1200);
    changed ||= o.list.length !== n;
    const vifs = o.list.filter((m) => !m.fin);
    for (const id of ids) {
      if (vifs.length >= SBIRES || vifs.some((m) => m.id === id)) continue;
      const k = [0, 1, 2].find((k) => !vifs.some((m) => m.k === k));
      vifs.push({ id, k, coups: 0, at: 0, fin: 0 });
      o.list.push(vifs[vifs.length - 1]);
      changed = true;
    }
    for (let i = 0; i < d && vifs.length; i++) {
      const m = vifs[o.rr++ % vifs.length];
      m.coups++;
      m.at = now;
      if (m.coups % BLOWS === 0) o.felled.push({ k: m.k, at: now });
      changed = true;
    }
    if (!o.list.length) { this.sbires.delete(addr); return Boolean(sb); }
    this.sbires.set(addr, o);
    return changed || !sb;
  }

  /** The shown, live village only (ecrit; not the demo): each hero's new successful subagent tool calls since its
   *  stored count (VUS) are damage on today's boss, the first sight of a terminal only stores its count, and vanished
   *  terminals are forgotten. The last blow slays the boss: trophies and the chronicle line. Returns { coups
   *  (address -> damage dealt in this poll), tue (slain in this poll), boss (today's, after the damage), sbires (once it
   *  is slain: address -> the new calls, blows on its minions) }. */
  degats(lus, now) {
    const coups = new Map(), sbires = new Map();
    let boss = bossDuJour(new Date(now));
    if (!this.ecrit) return { coups, tue: false, boss, sbires };
    if (shared(BOSS)?.day === boss.day && shared(BOSS).max < boss.max) setShared(BOSS, boss); // lifted to BOSS_HP
    const vus = { ...(shared(VUS) ?? {}) };
    let neuf = false;
    for (const [addr, s] of lus) {
      const n = s?.subCoups;
      if (typeof n !== "number" || vus[addr] === n) continue; // no file (or an older hook), or nothing new
      const b = vus[addr];
      vus[addr] = n;
      neuf = true;
      if (b === undefined) continue;
      const d = n > b ? n - b : n; // fewer: its file started over (a session ended), every call in it is new
      if (d > 0) coups.set(addr, d);
    }
    const alive = new Set((this.list ?? []).map((a) => a.address));
    for (const k of Object.keys(vus)) if (!alive.has(k)) { delete vus[k]; neuf = true; }
    if (neuf) setShared(VUS, vus);
    if (boss.slain) return { coups: sbires, tue: false, boss, sbires: coups }; // it already fell today: the blows go to its minions
    if (!coups.size) return { coups, tue: false, boss, sbires };
    const avant = shared(TROPHEES) ?? {};
    boss = { ...boss };
    for (const [addr, d] of coups) {
      boss.hp = Math.max(0, boss.hp - d);
      if (!boss.hp) {
        const h = heroOf(addr, (this.list ?? []).find((a) => a.address === addr)?.program);
        Object.assign(boss, { slain: true, slainAt: now, by: addr, heros: { name: h.name, race: h.race, cls: h.cls }, avant }); // avant: the reset's undo
        break;
      }
    }
    setShared(BOSS, boss);
    if (boss.slain) {
      const T = avant;
      const streak = T.lastDay === boss.day ? T.streak ?? 1 : T.lastDay === veille(boss.day) ? (T.streak ?? 0) + 1 : 1;
      setShared(TROPHEES, { total: (T.total ?? 0) + 1, streak, lastDay: boss.day });
      this.abattu?.(boss.by, boss.day);
    }
    return { coups, tue: boss.slain, boss, sbires };
  }

  /** The raids' bounded windows open at t (a blow, a fall or a flight, with its stages): the frame timer runs while
   *  one is, and its signature changes at each stage and when one ends (a redraw drops it). */
  fenetres(t) {
    let s = "";
    const A = this.arene;
    if (A) {
      const fin = A.fin && t - A.fin < CHUTE;
      if (t - A.at < COUP || fin) s += `boss:${A.at}:${A.fin}:${fin ? etape(t - A.fin) : "-"};`;
      if (A.pas && t < A.pas.t1) s += `boss-pas:${A.pas.t0};`; // a stomp or its walk back: redraw at its end (its bob)
    }
    // the minions': a blow, a fall's puff, a flight and its stages
    for (const [k, o] of this.sbires) {
      for (const m of o.list) {
        const fin = m.fin && t - m.fin < CHUTE;
        if (t - m.at < COUP || fin) s += `${k}:${m.id}:${m.at}:${m.fin}:${fin ? etape(t - m.fin) : ""};`;
      }
      for (const f of o.felled) if (t - f.at < 1200) s += `${k}:${f.k}:${f.at};`;
    }
    return s;
  }

  file(addr) {
    return this.files.get(addr) ?? null;
  }

  /** True when a hero's file is read: while it works, once when first seen, and while it has subagents running. */
  reads(a) {
    return !a.guard && !a.demoAct && (a.status === "working" || !this.files.has(a.address) || subsOf(this.files.get(a.address)) > 0);
  }

  /** Polls the activity files while some agent works or has subagents; notifies only when something visible changes.
   *  ecrit: this copy deals the raid damage (not the demo); it polls only while shown. */
  watch(cx, list, hidden, ecrit = false) {
    this.list = list;
    this.ecrit = ecrit;
    const need = !hidden && list.some((a) => this.reads(a) || this.scenes.has(a.address));
    if (need && !this.timer) this.timer = cx.timer.every(POLL, (cx) => this.poll(cx));
    else if (!need && this.timer) { this.timer.cancel(); this.timer = null; }
  }

  async poll(cx) {
    if (this.busy) return;
    this.busy = true;
    let changed = false;
    try {
      const now = Date.now();
      const dir = `${home()}/.local/state/world-of-codecraft`;
      const lus = []; // [address, its file (null: not read)]: the raids follow them once the damage is dealt
      for (const a of this.list ?? []) {
        if (a.demoAct) { changed = this.apply(a, a.demoAct, now) || changed; continue; }
        if (!this.reads(a)) { changed = this.apply(a, null, now) || changed; lus.push([a.address, null]); continue; }
        let s = null;
        try { s = JSON.parse((await readTextFile(`${dir}/${a.address}.json`)) ?? "null"); } catch { s = null; }
        const old = this.files.get(a.address);
        if (JSON.stringify(old) !== JSON.stringify(s)) { this.files.set(a.address, s); changed = true; }
        changed = this.apply(a, s, now) || changed;
        lus.push([a.address, s]);
      }
      const avant = bossDuJour(new Date(now));
      if (this.pv?.day === avant.day && avant.hp > this.pv.hp) { this.remise(); changed = true; } // reset from the top bar
      const { coups, tue, boss, sbires } = this.degats(lus, now);
      this.pv = { day: boss.day, hp: boss.hp };
      changed = this.mene(lus, now, boss.slain) || changed;
      for (const [addr, s] of lus) changed = this.suit(addr, s, now, boss.slain, sbires.get(addr) ?? 0) || changed;
      const fx = this.effets.size;
      for (const [addr, s] of lus) this.frappesSub(addr, s, coups.get(addr) ?? sbires.get(addr) ?? 0, now);
      if (this.effets.size !== fx || [...this.effets.values()].some((e) => e.t0 === now)) changed = true; // a blow's effect starts
      if (coups.size && this.raids.size && !this.boss().fin) { this.boss().at = now; changed = true; } // the boss flinches
      // short-lived flashes (blow on the creature, hero hit): redraw when they start or end
      for (const a of this.list ?? []) {
        const h = this.hits.get(a.address), s = this.files.get(a.address) ?? a.demoAct;
        const flash = `${h && now - h.at < 900}:${Boolean(s?.errT && s.err > 0 && now - s.errT < 1500)}:${recent(s?.essai?.t, RESULT)}:${recent(s?.commitT, 4000)}:${recent(s?.pushT, 7000)}`;
        if (h && h.flash !== flash) { h.flash = flash; changed = true; }
      }
      const alive = new Set((this.list ?? []).map((a) => a.address));
      for (const k of [...this.scenes.keys()]) if (!alive.has(k)) { this.scenes.delete(k); changed = true; }
      for (const k of [...this.slots.keys()]) if (!alive.has(k)) this.slots.delete(k);
      for (const k of [...this.raids.keys()]) if (!alive.has(k)) this.raids.delete(k);
      for (const k of [...this.sbires.keys()]) if (!alive.has(k)) this.sbires.delete(k);
      // a felled creature's puff lasts 1.2 s
      for (const h of this.hits.values()) {
        const n = h.felled.length;
        h.felled = h.felled.filter((f) => now - f.at < 1200);
        if (h.felled.length !== n) changed = true;
      }
    } finally { this.busy = false; }
    if (changed) cx.notify();
  }

  /** Anti-zapping decision for one unit; true when its scene changed. */
  apply(a, s, now) {
    const want = wanted(a, s, now);
    if (s) this.blows(a.address, s, now, clsOf(a));
    let st = this.scenes.get(a.address);
    if (!st) {
      if (!want) return false;
      this.scenes.set(a.address, { scene: want, since: now, cand: want, candSince: now });
      return true;
    }
    if (want === st.scene) { st.cand = want; st.candSince = now; return false; }
    if (st.cand !== want) { st.cand = want; st.candSince = now; }
    const at_once = want === "medite" || want === "test" || want === null || st.scene === "medite";
    const walk = want === "eclaire" || st.scene === "eclaire";
    if (at_once || (now - st.candSince >= (walk ? STABLE_WALK : STABLE) && now - st.since >= (walk ? HOLD_WALK : HOLD))) {
      if (!want) this.scenes.delete(a.address);
      else { st.scene = want; st.since = now; }
      return true;
    }
    return false;
  }

  /** Tracks blows (successful edits) to fell creatures. */
  blows(addr, s, now, cls) {
    let h = this.hits.get(addr);
    const coups = s.coups ?? 0;
    if (!h || coups < h.coups || h.tache !== s.tache) { h = { coups, at: 0, felled: [], tache: s.tache }; this.hits.set(addr, h); return; }
    if (coups > h.coups) {
      const B = blowsFor(s);
      const before = Math.floor(h.coups / B), after = Math.floor(coups / B);
      if (after > before) h.felled.push({ species: boss(s) ? "troll" : species(addr, s.tache, before, cls), at: now });
      h.coups = coups;
      h.at = now;
      this.frappe(addr, null, now);
    }
  }

  /** A blow of member addr (a hero; with id, its apprentice for that subagent) while it fights (a raid, minions, its
   *  scene's creature or the dummy): its class's effect (effets.js), one at a time per member (a blow while one runs
   *  is dropped) and FX_MAX in all. */
  frappe(addr, id, now) {
    if (!this.ecrit) return;
    const sc = this.scenes.get(addr)?.scene;
    if (!this.raid(addr) && !this.sbires.has(addr) && (id || (sc !== "combat" && sc !== "test"))) return;
    const k = id ? `${addr}:${id}` : addr, e = this.effets.get(k);
    if ((e && now - e.t0 < FX) || (!e && this.effets.size >= FX_MAX)) return;
    this.effets.set(k, { t0: now, addr, id, cible: undefined });
  }

  /** A hero's subagents' blows this poll (d: its successful subagent tool calls that hit the raid boss or its
   *  minions): on the subagents whose last event moved since the last poll, else its latest one; their apprentices
   *  strike (frappe). */
  frappesSub(addr, s, d, now) {
    const ids = this.subagents(s), avant = this.subT.get(addr) ?? {};
    this.subT.set(addr, Object.fromEntries(ids.map((x) => [x.id, x.t ?? 0])));
    if (!d) return;
    const bouge = ids.filter((x) => (x.t ?? 0) > (avant[x.id] ?? 0));
    const qui = bouge.length ? bouge : [...ids].sort((p, q) => (q.t ?? 0) - (p.t ?? 0)).slice(0, 1);
    for (const x of qui.slice(0, d)) this.frappe(addr, x.id, now);
  }

  /** The effects running at t ([member, effect]); the ended ones are dropped. */
  effetsVifs(t) {
    for (const [k, e] of [...this.effets]) if (t - e.t0 >= FX) this.effets.delete(k);
    return [...this.effets];
  }

  /** Where the foe a fighting member strikes stands (u its hero's unit; id its subagent, for an apprentice): the raid
   *  boss; the minion its subagent fights, else the one its hero hit last; its hero's creature or dummy. { x, y (its
   *  chest), fy (its feet) }, or null (none, or its hero walks or teleports). */
  adversaire(u, id, t) {
    const addr = u.a.address;
    if (u.leg || u.portail) return null;
    if (this.raid(addr)) {
      const A = this.arene, sp = especeBoss(A.day), p = this.ici(t);
      return A.fin ? null : { x: p.x, y: p.y - (CREATURES[sp].pret.h * geantDe(sp).k) / 2 + 4, fy: p.y };
    }
    const o = this.sbires.get(addr);
    if (o) {
      const vifs = o.list.filter((m) => !m.fin);
      if (!vifs.length) return null;
      const m = (id && vifs.find((n) => n.id === id)) || vifs.reduce((p, q) => (q.at > p.at ? q : p));
      const sp = sbire(), { pts } = rangs(u, sp, u.x > lieux().BASCULE ? -1 : 1), [x, y] = pts[m.k];
      return { x, y: y - (CREATURES[sp].pret.h * BETE) / 2 + 4, fy: y };
    }
    return this.ouCreature(u);
  }

  /** Where the creature (or the dummy) a hero standing at u fights stands: { side, x, y (its chest), fy (its feet), s
   *  (the activity file), dummy, sp (its species) }, or null. */
  ouCreature(u) {
    const side = this.cible(u);
    if (side === null) return null;
    const addr = u.a.address, s = this.file(addr) ?? u.a.demoAct;
    const dummy = this.scene(addr) === "test" || recent(s.essai?.t, RESULT);
    // creatures are drawn larger (BETE); the troll is wide: keep it off the hero (a mage's; nearer or further by class)
    const sp = !dummy && (boss(s) ? "troll" : species(addr, s.tache ?? 0, Math.floor((s.coups ?? 0) / blowsFor(s)), clsOf(u.a)));
    const off = dummy ? 44 : proche(u, boss(s) ? 115 : 70, sp, side);
    const x = Math.round(u.x + side * off), fy = Math.round(u.y + 16);
    const h = dummy ? CREATURES.mannequin?.pret?.h ?? 40 : CREATURES[sp].pret.h * BETE;
    return { side, x, y: fy - h / 2 + 4, fy, s, dummy, sp };
  }

  /** True when a working hero may walk to another spot: no meditation or tests, no creature hurt and not yet
   *  felled (a move waits for the puff), and no hit, test result, seal or pigeon on screen. */
  calme(a) {
    const s = this.file(a.address) ?? a.demoAct ?? null;
    const sc = this.scene(a.address);
    const h = this.hits.get(a.address);
    if (sc === "medite" || sc === "test" || (h && (h.felled.length || Date.now() - h.at < 900))) return false;
    if (!s) return true;
    if (sc === "combat" && (s.coups ?? 0) % blowsFor(s) !== 0 && !(h && Date.now() - h.at > STUCK)) return false;
    return !(recent(s.essai?.t, RESULT) || recent(s.commitT, 4000) || recent(s.pushT, 7000) || (s.errT && (s.err ?? 0) > 0 && recent(s.errT, 1500)));
  }

  /** The anim a scene plays (null = the status default). */
  anim(addr) {
    const sc = this.scene(addr);
    return sc === "pense" ? "idle" : sc === "eclaire" ? "idle" : sc === "medite" ? "rest" : sc ? "work" : null;
  }

  /** Extra layers hung from a unit's feet point, for its scene. `head` = top of the hero sprite. */
  layers(u, head, night, t) {
    const addr = u.a.address;
    const sc = this.scene(addr);
    const s = this.file(addr) ?? u.a.demoAct ?? null;
    const out = [];
    const sfx = night ? "-n" : "";
    if (sc === "pense") {
      out.push(div().absolute().left(14).top(head - 6).h(20).px(6).rounded(10).bg(C.parch).border_2().border_color(C.woodDark)
        .flex().items_center().font_family(UI).text_size(15).text_color(C.woodDark).whitespace_nowrap()
        .frames(["·", "· ·", "· · ·", "· · ·"], 420));
    }
    if (sc === "eclaire") {
      // two ravens circling above the scout (two flight frames crossfading = wing beats)
      for (let k = 0; k < 2; k++) {
        const per = 5200 + k * 1700, cx0 = -40 + k * 30, cy0 = head - 34 - k * 14;
        const R = CREATURES.corbeau;
        if (!R) break;
        const f0 = R.vol0, f2 = R.vol2;
        // a zero-size anchor (the bird's centre) moving on a loose ellipse; both frames centred on it
        out.push(div().absolute().left(cx0).top(cy0).w(0).h(0)
          .loop("left", { from: cx0 - 30, to: cx0 + 60, period: per })
          .loop("top", { from: cy0 - 8, to: cy0 + 8, period: per / 2.3 })
          .child(image(`${CRE}/corbeau/vol2${sfx}.png`).absolute().left(-f2.w / 2).top(-f2.h / 2).w(f2.w).h(f2.h).loop("opacity", { from: 7, to: -6, period: 260 + k * 40, easing: "linear" }))
          .child(image(`${CRE}/corbeau/vol0${sfx}.png`).absolute().left(-f0.w / 2).top(-f0.h / 2).w(f0.w).h(f0.h)
            .loop("opacity", { from: -6, to: 7, period: 260 + k * 40, easing: "linear" })));
      }
    }
    if (sc === "medite") {
      out.push(image(`${ART}/halo.svg`).absolute().left(-34).top(-46).w(68).h(40).opacity(0.7)
        .loop("opacity", { from: 0.25, to: 0.8, period: 2400 }));
      for (let k = 0; k < 3; k++) {
        const per = 3600, y0 = -40;
        out.push(image(`${ART}/etincelle.svg`).absolute().left(-30).top(y0).size(10)
          .loop("left", { from: -38 + k * 8, to: 30 - k * 8, period: per + k * 500 })
          .loop("top", { from: y0 - 18 + k * 6, to: y0 + 8 - k * 4, period: (per + k * 500) / 2 })
          .loop("opacity", { from: 0.3, to: 1, period: 900 + k * 200 }));
      }
      // the crystal: the condensed memory, pulsing above the head
      out.push(div().absolute().left(-4).top(head - 14).w(8).h(12).rounded(2).bg("#c9a7ff").border_1().border_color("#5b2ca8")
        .loop("top", { from: head - 12, to: head - 18, period: 1800 }).loop("opacity", { from: 0.55, to: 1, period: 1200 }));
    }
    const says = []; // short bubbles, stacked upwards so they never cover each other
    // git commit: a wax seal pops over the head, "Sealed!"
    if (recent(s?.commitT, 4000)) {
      out.push(image(`${ART}/ic-parchemin.svg`).absolute().left(-9).top(head - 30).size(18)
        .loop("top", { from: head - 24, to: head - 34, period: 1400 }));
      says.push([tr("sealed"), C.goldLight, C.woodDark]);
    }
    // git push: a carrier pigeon takes off east and flies out of the village
    const P = CREATURES.pigeon;
    if (P && recent(s?.pushT, 7000)) {
      const f0 = P.vol0, f1 = P.vol1;
      out.push(div().absolute().left(0).top(head - 10).w(0).h(0)
        .loop("left", { from: 0, to: 900, period: 7000, easing: "linear" })
        .loop("top", { from: head - 10, to: head - 120, period: 7000, easing: "linear" })
        .child(image(`${CRE}/pigeon/vol1-g${sfx}.png`).absolute().left(-f1.w / 2).top(-f1.h / 2).w(f1.w).h(f1.h).loop("opacity", { from: 7, to: -6, period: 240, easing: "linear" }))
        .child(image(`${CRE}/pigeon/vol0-g${sfx}.png`).absolute().left(-f0.w / 2).top(-f0.h / 2).w(f0.w).h(f0.h)
          .loop("opacity", { from: -6, to: 7, period: 240, easing: "linear" })));
      if (Date.now() - s.pushT < 3500) says.push([tr("sent"), C.parch, C.woodDark]);
    }
    // test result (5 s, whatever the scene)
    if (recent(s?.essai?.t, RESULT)) {
      says.push(s.essai.ok ? [tr("testsOk"), "#d9f2c4", "#2f5a1c"] : [tr("testsKo"), C.parch, C.wax]);
    }
    says.forEach(([text, bg, fg], i) => out.push(bubble(text, bg, fg, 14, head - 8 - i * 24)));
    // the hero is hit by a failed tool (lasts 1.5 s)
    if (s?.errT && (s.err ?? 0) > 0 && Date.now() - s.errT < 1500) {
      out.push(div().absolute().left(-26).top(-14).w(52).h(28).rounded_full().bg("#ff3b3044").loop("opacity", { from: 0.2, to: 1, period: 180 }));
      out.push(div().absolute().left(-36).top(head - 8).h(20).px(5).rounded(3).bg(C.parch).border_2().border_color(C.wax)
        .flex().items_center().font_family(UI).text_size(15).text_color(C.wax).whitespace_nowrap().child(tr("ouch")));
    }
    return out;
  }

  /** A hero's running subagents, oldest first: [{ id, act }] (demo heroes: as many as their `subs`, no act). */
  subagents(s) {
    if (!subsOf(s)) return [];
    if (!s.subIds) return Array.from({ length: s.subs }, (_, i) => ({ id: `demo${i}`, act: null }));
    return Object.entries(s.subIds).map(([id, v]) => (typeof v === "object" ? { id, ...v } : { id, t0: v, t: v }))
      .filter((v) => Date.now() - v.t < SUB_TTL).sort((p, q) => p.t0 - q.t0);
  }

  /** Apprentices: one full-size hero of any race and class per running subagent (up to 4), each tied to its
   *  subagent id (its look, and its slot while it runs). Standing by the hero in its slot (on walkable ground), it
   *  plays what its subagent does: `work` while it edits, runs commands or tests, `idle` otherwise, with a small
   *  scroll over its head while it reads or searches. On the hero's walks they step onto its path, follow it in
   *  single file (walk frames by direction) and step out to their slots at the end. Fighting, each leaves the file for
   *  its own spot (det): in a raid its place round the boss (coin), after the kill past its subagent's minion (facing
   *  it, at its class distance, proche); it walks there (with its hero's walk, else straight), plays `work` facing its
   *  foe, and walks back to the file when the fight ends. m = the hero's mob entry,
   *  pos(trail, t) = Place.pos, side = the creature's side (1 = right), animate = its frames run (else frame 0).
   *  Depth-sorted world elements: [{ z, el, box, addr, key, vu, anim }], anim = its frame timer entry (fps, n, ph,
   *  trail), key = hero:subagent id, look = its race-class, vu = its frame, feet point and leg now. */
  apprentis(u, m, pos, side, night, t, animate) {
    const addr = u.a.address;
    const subs = this.subagents(this.file(addr) ?? u.a.demoAct);
    const slots = this.slots.get(addr) ?? new Map(); // subagent id -> slot, kept while it runs
    this.slots.set(addr, slots);
    for (const id of [...slots.keys()]) if (!subs.some((x) => x.id === id)) { slots.delete(id); this.ou.delete(`${addr}:${id}`); }
    for (const x of subs) {
      const used = new Set(slots.values());
      const k = SLOTS.findIndex((_, k) => !used.has(k));
      if (!slots.has(x.id) && k >= 0) slots.set(x.id, k);
    }
    const drawn = subs.filter((x) => slots.has(x.id)).sort((p, q) => slots.get(p.id) - slots.get(q.id));
    // the slots by the hero's goal and, on a walk, by its starting point
    // a raid boss's footprint, or the minions' (their side, then): no apprentice stands there
    const sb = this.sbires.has(addr) && rangs({ ...u, x: m.x, y: m.y }, sbire(), side);
    if (sb) side = sb.side;
    const A = this.raid(addr) ? this.arene : null;
    if (A) side = A.x < m.x ? -1 : 1; // the boss's side: the apprentices keep to the other
    const raid = A ? { x: A.x, large: geantDe(especeBoss(A.day)).large } : sb;
    const at = (p) => { const taken = []; return drawn.map((x) => { const q = spot(p, slots.get(x.id), side, taken, raid); taken.push(q); return q; }); };
    const ends = at([m.x, m.y]), starts = m.legs.length ? at(m.legs[0].a) : ends;
    const sfx = night ? "-n" : "";
    const o = this.sbires.get(addr), SP = sb && sbire();
    // its own spot while it fights, and its foe's x: the raid boss, or its subagent's minion once the hero stands by them
    const det = (x, key) => {
      if (A) { const q = this.coin(addr, x.id, key); return q && { q, foe: A.x }; }
      const mm = sb && !u.leg && o.list.find((n) => n.id === x.id && !n.fin);
      if (!mm) return null;
      const [mx, my] = sb.pts[mm.k], q = [Math.round(mx + sb.side * proche({ a: { demoHero: key }, key }, 70, SP, -sb.side)), Math.round(my)];
      return walkable(q) ? { q, foe: mx } : null;
    };
    const ici = (w) => { const p = pos(w.tr, t); return [p.x, p.y]; };
    const cree = !raid && this.cible(u); // its hero's scene creature or dummy, outside a raid: those working face it
    const pt = portail(m, t), fileA = pt && at(pt.P.a); // its hero's teleport: the file slots by its first portal
    return drawn.map((x, i) => {
      const k = slots.get(x.id), key = KINDS[hash(`${addr}:${x.id}`) % KINDS.length], id = `${addr}:${x.id}`;
      const d = det(x, key), E = d ? d.q : ends[i], was = this.ou.get(id);
      let tr;
      if (pt) {
        // with its hero through the portals: to its file slot by the first while it opens, into it, out by the far one
        const from = was?.tp === pt.P.t0 ? was.from : was ? ici(was) : fileA[i];
        tr = pt.e < 2 ? { x: fileA[i][0], y: fileA[i][1], legs: [{ a: from, b: fileA[i], t0: pt.P.t0, t1: pt.P.t0 + VOYAGE[0] }] }
          : { x: ends[i][0], y: ends[i][1], legs: [] };
        this.ou.set(id, { tr, det: true, tp: pt.P.t0, from });
      } else if (m.legs.length) {
        // the hero's walk: in single file from where it stood (its own spot, when it had left the file), then to E
        const walk = m.legs[0].t0, from = was?.walk === walk ? was.from : was ? ici(was) : null;
        tr = trail(m.legs, from ?? starts[i], E, SLOTS[k][2]);
        if (from || d) this.ou.set(id, { tr, det: Boolean(d), walk, from: from ?? starts[i] }); else this.ou.delete(id);
      } else if (d || was) {
        // the hero stands: straight to its spot, or back to its file slot
        const same = was && !was.walk && was.tr.x === E[0] && was.tr.y === E[1];
        const a = was ? ici(was) : ends[i], t1 = t + (Math.hypot(E[0] - a[0], E[1] - a[1]) / STEP) * 1000;
        tr = same ? was.tr : { x: E[0], y: E[1], legs: t1 > t ? [{ a, b: E, t0: t, t1 }] : [] };
        if (tr.legs.length && t >= tr.legs[0].t1) tr = { x: E[0], y: E[1], legs: [] };
        if (d || tr.legs.length) this.ou.set(id, { tr, det: Boolean(d) }); else this.ou.delete(id);
      } else tr = trail(m.legs, starts[i], ends[i], SLOTS[k][2]);
      const p = pos(tr, t), leg = p.leg && (p.leg.a[0] !== p.leg.b[0] || p.leg.a[1] !== p.leg.b[1]) ? p.leg : null;
      // in a fight it plays `work` facing its foe (on its own spot: its foe's side; in its hero's file: the hero's
      // creature's), whatever its subagent does; else what its subagent does
      const name = leg ? walkAnim(leg.b[0] - leg.a[0], leg.b[1] - leg.a[1]) : d ? travail(key, d.foe < p.x ? -1 : 1)
        : raid ? travail(key, side) : !WORKS.has(x.act) ? "idle" : travail(key, cree ?? 0);
      const A = HEROES[key]?.anims?.[name];
      if (!A) return null;
      const ph = hash(x.id) % 997;
      const f = animate ? Math.floor(((t + ph) / 1000) * A.fps) % A.n : 0;
      const { w, h, ax, ay } = A; // full hero size
      const dir = `${ART}/heros/${key}/${name}`;
      const [gx, gy] = p.leg ? p.leg.b : [p.x, p.y];
      // the feet point glides to the end of its leg (transition always declared, as the heroes')
      const dur = p.leg ? Math.max(16, p.leg.t1 - t) : 16;
      const el = div().id(`apprenti-${addr}-${x.id}`).absolute().left(Math.round(gx)).top(Math.round(gy)).w(0).h(0)
        .transition("left", { duration: dur, easing: "linear" }).transition("top", { duration: dur, easing: "linear" })
        .opacity(pt ? pt.voile : 1).transition("opacity", { duration: VOYAGE[1] - VOYAGE[0], easing: "linear" }) // a teleport's fade
        .child(div().absolute().left(-ax).top(-ay).w(w).h(h)
          .children(Array.from({ length: A.n }, (_, i) =>
            image(`${dir}/${String(i).padStart(2, "0")}${sfx}.png`).absolute().left(0).top(0).w(w).h(h).opacity(i === f ? 1 : 0))))
        .when(!leg && READS.has(x.act), (e) => e.child(image(`${ART}/ic-parchemin.svg`).absolute().left(-9).top(-ay - 22).size(18)));
      // vu: what it shows now (its ghost when it leaves; Place.passages)
      const vu = { src: `${dir}/${String(f).padStart(2, "0")}${sfx}.png`, w, h, ax, ay, x: p.x, y: p.y, leg: p.leg };
      return { z: p.y + 3, el, box: { x: p.x - ax, y: p.y - ay, w, h, fy: p.y }, addr, key: `${addr}:${x.id}`, look: key, vu, anim: { fps: animate ? A.fps : 0, n: A.n, ph, trail: tr } };
    }).filter(Boolean);
  }

  /** The creature a fighting unit faces, as its own depth-sorted world element: { z, el } or null. */
  creature(u, night) {
    // on the hero's right and a little nearer the viewer, facing it (left side near the world's right end; ouCreature)
    const c = this.ouCreature(u);
    if (!c) return null;
    const { side, x, fy: y, s, dummy, sp } = c;
    const kids = dummy ? this.dummy(u, s, night ? "-n" : "", side) : this.fight(u, s, night ? "-n" : "", side, sp);
    const el = div().absolute().left(x).top(y).w(0).h(0).children(kids);
    return { z: y + 3, el };
  }

  /** The training dummy: struck while the tests run, knocked over when they pass. */
  dummy(u, s, sfx, side) {
    const D = CREATURES.mannequin;
    if (!D) return [];
    const g = side > 0 ? "" : "-g";
    const at = (pose) => { const p = D[pose]; return image(`${CRE}/mannequin/${pose}${g}${sfx}.png`).absolute().left(-p.ax).top(-p.ay + 4).w(p.w).h(p.h); };
    if (recent(s.essai?.t, RESULT)) return [at(s.essai.ok ? "abattu" : "pret")];
    const per = 900 + (hash(u.a.address) % 300);
    return [at("pret").loop("opacity", { from: 7, to: -6, period: per, easing: "linear" }), at("touche").loop("opacity", { from: -6, to: 7, period: 900 + (hash(u.a.address) % 300), easing: "linear" })];
  }

  /** The creature (drawn at its own feet point), its blows and the puff of the last one felled. */
  fight(u, s, sfx, side, sp) {
    const addr = u.a.address;
    const h = this.hits.get(addr) ?? { coups: s.coups ?? 0, at: 0, felled: [] };
    const B = blowsFor(s);
    const D = CREATURES[sp];
    if (!D) return [];
    const g = side > 0 ? "" : "-g";
    const gap = 0;
    const now = Date.now();
    const hit = now - h.at < 900;
    const out = [];
    const sprite = (pose, extra) => {
      const p = D[pose];
      return image(`${CRE}/${sp}/${pose}${g}${sfx}.png`).absolute().left(side * gap - p.ax * BETE).top(-p.ay * BETE + 4).w(p.w * BETE).h(p.h * BETE).when(Boolean(extra), extra);
    };
    if (hit) {
      out.push(sprite("touche"));
      // impact flash on the creature
      out.push(div().absolute().left(side * gap - 6).top((-D.pret.h * BETE) / 2 - 4).size(12).rounded_full().bg("#fff6d8")
        .loop("opacity", { from: 1, to: 0, period: 450 }));
    } else {
      // ready / attack, alternating: one frame shown at a time (two clamped opacity loops in step)
      out.push(sprite("pret", (el) => el.loop("opacity", { from: 7, to: -6, period: 1700 + (hash(addr) % 400), easing: "linear" })));
      out.push(sprite("attaque", (el) => el.loop("opacity", { from: -6, to: 7, period: 1700 + (hash(addr) % 400), easing: "linear" })));
    }
    // blows left: little pips over the creature
    const left = B - ((s.coups ?? 0) % B);
    out.push(div().absolute().left(side * gap - 2.5 * B).top(-D.pret.h * BETE - 6).flex().gap(1)
      .children(Array.from({ length: B }, (_, i) => div().w(4).h(3).bg(i < left ? "#e5685a" : "#3a2a2a").border_1().border_color("#000000"))));
    // the last creature felled: fades and rises in a puff
    for (const f of h.felled) {
      const F = CREATURES[f.species];
      if (!F) continue;
      const p = F.touche;
      out.push(image(`${CRE}/${f.species}/touche${g}${sfx}.png`).absolute().left(side * (gap + 14) - p.ax * BETE).top(-p.ay * BETE).w(p.w * BETE).h(p.h * BETE)
        .loop("opacity", { from: 0.9, to: 0, period: 1200 }).loop("top", { from: -p.ay * BETE, to: -p.ay * BETE - 16, period: 1200 }));
      out.push(div().absolute().left(side * (gap + 14) - 12).top(-20).size(24).rounded_full().bg("#e8e2d0aa")
        .loop("opacity", { from: 0.8, to: 0, period: 1200 }));
    }
    return out;
  }

  /** The day's boss, once, where it is (ici): the day's species at the troll's height (geantDe), its feet gliding
   *  natively along its leg with a bob while it walks (`pret`, turned the way it goes), else turned to the side with
   *  more raiders (the village's when none); `pret` / `attaque` alternating in a raid, today's HP in a bar over its head
   *  and, for an Elite or Legendary boss, an aura of its tier's colour at its feet; hit COUP ms after each damage tick.
   *  Slain: the felled puff and a gold burst CHUTE ms, then nothing until tomorrow's boss. None in the demo.
   *  { z, el } or null. */
  geant(night, t = Date.now()) {
    if (!this.ecrit) return null;
    const r = this.boss(), b = bossDuJour(), sp = especeBoss(r.day), D = CREATURES[sp];
    if (!D) return null;
    const { k: K } = geantDe(sp);
    const addr = "boss", p = this.ici(t), leg = p.leg;
    const raids = [...r.places.values()].reduce((n, P) => n + Math.sign(P.q[0] - r.x), 0);
    const dir = leg && leg.b[0] !== leg.a[0] ? Math.sign(leg.b[0] - leg.a[0]) : this.raids.size && raids ? Math.sign(raids) : -r.side;
    const g = dir < 0 ? "" : "-g", sfx = night ? "-n" : ""; // its art faces left; -g faces right
    const e = r.fin ? etape(t - r.fin) : 0, chute = r.fin && t - r.fin < CHUTE;
    const sprite = (pose, extra) => {
      const q = D[pose];
      return image(`${CRE}/${sp}/${pose}${g}${sfx}.png`).absolute().left(-q.ax * K).top(-q.ay * K + 4).w(q.w * K).h(q.h * K).when(Boolean(extra), extra);
    };
    const out = [];
    if (r.fin) {
      if (!chute) return null; // gone once its fall is over, until tomorrow's boss
      // felled: fades and rises in a puff, at the boss's size, in a gold burst
      const q = D.touche;
      out.push(image(`${CRE}/${sp}/touche${g}${sfx}.png`).absolute().left(-dir * 28 - q.ax * K).top(-q.ay * K).w(q.w * K).h(q.h * K)
        .loop("opacity", { from: 0.9, to: 0, period: CHUTE }).loop("top", { from: -q.ay * K, to: -q.ay * K - 32, period: CHUTE }));
      out.push(div().absolute().left(-dir * 28 - 24).top(-40).size(48).rounded_full().bg("#e8e2d0aa")
        .loop("opacity", { from: 0.8, to: 0, period: CHUTE }));
      out.push(...eclat(addr, e, Math.round((D.pret.h * K) / 2)));
    } else {
      // an Elite or Legendary boss stands in an aura of its tier's colour (halo.svg as a mask, a smaller one for its core)
      const pl = palier(r.day);
      if (pl) for (const f of [1.3, 0.8]) {
        const w = Math.round(D.pret.w * K * f), h = Math.round(w / 2.4);
        out.push(svg(`${ART}/halo.svg`).absolute().left(-w / 2).top(-h / 2 + 4).w(w).h(h).text_color(PALIERS[pl])
          .loop("opacity", { from: 0.55, to: 1, period: 1600 }));
      }
      if (t - r.at < COUP) {
        out.push(sprite("touche"));
        out.push(div().absolute().left(-12).top(-D.pret.h * K / 2 - 8).size(24).rounded_full().bg("#fff6d8")
          .loop("opacity", { from: 1, to: 0, period: 450 }));
      } else if (leg) {
        out.push(div().absolute().left(0).top(0).w(0).h(0).loop("top", { from: 0, to: -5, period: 420 }).child(sprite("pret")));
      } else if (this.raids.size) {
        out.push(sprite("pret", (el) => el.loop("opacity", { from: 7, to: -6, period: 1700 + (hash(addr) % 400), easing: "linear" })));
        out.push(sprite("attaque", (el) => el.loop("opacity", { from: -6, to: 7, period: 1700 + (hash(addr) % 400), easing: "linear" })));
      } else out.push(sprite("pret"));
      // today's HP over its head
      const W = 84;
      out.push(div().absolute().left(-W / 2).top(-D.pret.h * K - 12).w(W).h(8).bg("#1b1420").border_1().border_color("#000000")
        .child(div().h_full().w(Math.round(((W - 2) * b.hp) / b.max)).bg("#e5685a")));
    }
    // its feet glide to its leg's end (transition always declared, as the heroes')
    const [x, y] = leg ? leg.b : [p.x, p.y], dur = leg ? Math.max(16, leg.t1 - t) : 16;
    return { z: p.y + 3, el: div().id("geant").absolute().left(Math.round(x)).top(Math.round(y)).w(0).h(0)
      .transition("left", { duration: dur, easing: "linear" }).transition("top", { duration: dur, easing: "linear" }).children(out) };
  }

  /** A hero's minions (after the day's kill): each at its place (rangs), drawn at BETE like a fight creature, `pret` /
   *  `attaque` alternating, `touche` and a flash COUP ms after a blow, its blows left in pips; a felled one's puff at
   *  its place (the fresh one stands there already); a fleeing one turns, walks FUIR px off and fades (fuite).
   *  Depth-sorted world elements [{ z, el }]. */
  sbiresDe(u, night) {
    const addr = u.a.address, o = this.sbires.get(addr);
    if (!o || u.leg || u.portail) return []; // shown once it stands (not while it walks or teleports)
    const sp = sbire(), D = CREATURES[sp];
    const { side, pts } = rangs(u, sp, u.x > lieux().BASCULE ? -1 : 1);
    const g = side > 0 ? "" : "-g", sfx = night ? "-n" : "";
    const now = Date.now();
    const sprite = (pose, extra, gg = g) => {
      const p = D[pose];
      return image(`${CRE}/${sp}/${pose}${gg}${sfx}.png`).absolute().left(-p.ax * BETE).top(-p.ay * BETE + 4).w(p.w * BETE).h(p.h * BETE).when(Boolean(extra), extra);
    };
    const at = (k) => [Math.round(pts[k][0]), Math.round(pts[k][1])];
    const out = [];
    for (const m of o.list) {
      const [x, y] = at(m.k);
      if (m.fin) {
        if (now - m.fin < CHUTE) out.push({ z: y + 3, el: fuite(`sbire-${addr}-${m.id}`, x, y, side, etape(now - m.fin), sprite("pret", null, side > 0 ? "-g" : "")) });
        continue;
      }
      const per = 1700 + (hash(`${addr}:${m.id}`) % 400), kids = [];
      if (now - m.at < COUP) {
        kids.push(sprite("touche"));
        kids.push(div().absolute().left(-6).top((-D.pret.h * BETE) / 2 - 4).size(12).rounded_full().bg("#fff6d8")
          .loop("opacity", { from: 1, to: 0, period: 450 }));
      } else {
        kids.push(sprite("pret", (el) => el.loop("opacity", { from: 7, to: -6, period: per, easing: "linear" })));
        kids.push(sprite("attaque", (el) => el.loop("opacity", { from: -6, to: 7, period: per, easing: "linear" })));
      }
      const left = BLOWS - (m.coups % BLOWS);
      kids.push(div().absolute().left(-2.5 * BLOWS).top(-D.pret.h * BETE - 6).flex().gap(1)
        .children(Array.from({ length: BLOWS }, (_, i) => div().w(4).h(3).bg(i < left ? "#e5685a" : "#3a2a2a").border_1().border_color("#000000"))));
      out.push({ z: y + 3, el: div().absolute().left(x).top(y).w(0).h(0).children(kids) });
    }
    // the felled ones: fade and rise in a puff where they stood
    for (const f of o.felled) {
      if (now - f.at >= 1200) continue;
      const [x, y] = at(f.k), p = D.touche;
      out.push({ z: y + 3.5, el: div().absolute().left(x).top(y).w(0).h(0)
        .child(image(`${CRE}/${sp}/touche${g}${sfx}.png`).absolute().left(side * 14 - p.ax * BETE).top(-p.ay * BETE).w(p.w * BETE).h(p.h * BETE)
          .loop("opacity", { from: 0.9, to: 0, period: 1200 }).loop("top", { from: -p.ay * BETE, to: -p.ay * BETE - 16, period: 1200 }))
        .child(div().absolute().left(side * 14 - 12).top(-20).size(24).rounded_full().bg("#e8e2d0aa")
          .loop("opacity", { from: 0.8, to: 0, period: 1200 })) });
    }
    return out;
  }
}

/** The species of today's boss's minions. */
const sbire = () => { const sp = especeBoss(bossDuJour().day); return SBIRE[sp] ?? sp; };

/** Where hero u standing at (u.x, u.y) has its minions (species sp) stand: the first PLACES (dx by its class, proche) on walkable ground whose `pret`
 *  boxes at BETE overlap none of those taken, on its creature's side (side0) unless the other side has room for more;
 *  cramped (fewer than SBIRES), the rest from the first free PLACES whatever the ground. { side, pts, loin, large }:
 *  loin and large mark the zone apprentices keep off, as a raid boss's (geantDe). */
function rangs(u, sp, side0) {
  const { x, y } = u, P = CREATURES[sp].pret, W = P.w * BETE, H = P.h * BETE;
  const at = (side, sol) => {
    const pts = [];
    for (const [dx, dy] of PLACES) {
      const q = [x + side * proche(u, dx, sp, side), y + dy];
      if (pts.length < SBIRES && (!sol || walkable(q)) && pts.every((o) => Math.abs(o[0] - q[0]) >= W || Math.abs(o[1] - q[1]) >= H)) pts.push(q);
    }
    return pts;
  };
  let side = side0, pts = at(side0, true);
  if (pts.length < SBIRES) { const o = at(-side0, true); if (o.length > pts.length) { side = -side0; pts = o; } }
  if (pts.length < SBIRES) for (const q of at(side, false)) if (pts.length < SBIRES && pts.every((o) => Math.abs(o[0] - q[0]) >= W || Math.abs(o[1] - q[1]) >= H)) pts.push(q);
  const xs = pts.map((q) => q[0]), lo = Math.min(...xs) - W / 2, hi = Math.max(...xs) + W / 2;
  return { side, pts, loin: side * ((lo + hi) / 2 - x), large: (hi - lo) / 2 + 25 };
}

/** A creature fleeing from (x, y): drawn there, then (stage e 1) given the far point FUIR px off and opacity 0, which
 *  its native transitions carry; it bobs as it goes. */
function fuite(id, x, y, side, e, el) {
  const tr = { duration: CHUTE - ETAPES[0], easing: "ease-in" };
  return div().id(id).absolute().left(e ? x + side * FUIR : x).top(y).w(0).h(0).opacity(e ? 0 : 1)
    .transition("left", tr).transition("opacity", tr)
    .child(div().absolute().left(0).top(0).w(0).h(0).loop("top", { from: 0, to: -5, period: 320 }).child(el));
}

/** A hero's teleport at t (m its mob entry, m.portail = { t0, a (from), b (to) }, set by Place on a move asked for
 *  with Place.sauter): a portal opens where it stands (100 ms on), it and its apprentices fade into it from
 *  VOYAGE[0], and it shows at the far end from VOYAGE[1] (a portal opened there from VOYAGE[0]), fading in; done at
 *  PORTAIL. { e (0 its portal opens, 1 it fades into it, 2 it is at the far end), at (where it shows), voile (its
 *  opacity), P } or null when none runs. */
export function portail(m, t) {
  const P = m?.portail;
  if (!P || t - P.t0 >= PORTAIL) return null;
  const e = VOYAGE.filter((s) => t - P.t0 >= s).length;
  return { e, at: e < 2 ? P.a : P.b, voile: e === 1 ? 0 : 1, P };
}

/** The gold burst over a slain raid boss (mid px above its feet): a gold ring opening and 10 sparkles rising, gold
 *  pixels and stars in turn. Hidden at stage 0, open at 1, faded at 2; the native transitions carry each stage. */
function eclat(addr, e, mid) {
  const tr = (duration, delay = 0) => ({ duration, delay, easing: "ease-out" });
  const w = e ? 260 : 20, h = e ? 110 : 8;
  const out = [image(`${ART}/halo.svg`).id(`eclat-${addr}`).absolute().left(-w / 2).top(-mid - h / 2).w(w).h(h).opacity(e === 1 ? 1 : 0)
    .transition("left", tr(900)).transition("top", tr(900)).transition("width", tr(900)).transition("height", tr(900))
    .transition("opacity", tr(400))];
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * 2 * Math.PI, x = Math.round(Math.cos(a) * 56) - 6, y = Math.round(Math.sin(a) * 44) - mid;
    const el = k % 2 ? div().size(6).bg(C.goldLight).border_1().border_color(C.gold) : image(`${ART}/etincelle.svg`).size(12);
    out.push(el.id(`eclat-${addr}-${k}`).absolute().left(x).top(e ? y - 70 : y).opacity(e === 1 ? 1 : 0)
      .transition("top", tr(1000, k * 40)).transition("opacity", tr(300, k * 40)));
  }
  return out;
}

/** A parchment bubble over the hero. */
function bubble(text, bg, fg, size, top) {
  return div().absolute().left(16).top(top).h(20).px(6).rounded(3).bg(bg).border_2().border_color(C.woodDark)
    .flex().items_center().font_family(UI).text_size(size + 1).text_color(fg).whitespace_nowrap().child(text);
}

/** The creature for a task: drawn from the task number and the hero, one per BLOWS edits. */
export function species(addr, tache, n, cls = "mage") {
  const pool = (cls !== "mage" && DISTRICT[HOME[cls]]) || SPECIES;
  return pool[hash(`${addr}:${tache}:${n}`) % pool.length];
}
