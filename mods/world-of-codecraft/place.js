// La place (bottom strip): Valbrume seen from above, isometric pixel art (direction A, v3).
// Left, the RTS-style command panel: minimap (click to move the camera) and the selected unit.
// Right, the village: the static world (ground, buildings, props, shadows, night lights) is baked
// by tools/bake_world.py into a few big images, day and night, exactly as the approved mocks (one folder per
// look of a map, kit.js monde(); where things are: lieux.js); only the units, their markers, front cut-outs (depth), glows, smoke and snow are live.
//
// Every agent is a hero of its class: working = `work` loop at its class building; idle = `idle`,
// strolling from spot to spot (FLANE) with a pause at each; blocked = `idle` + flashing `!` + red ring +
// speech bubble; done = `idle` + gold `?` + halo. When the spot changes the hero walks there along the road (walk_dl / walk_ur and their
// mirrors), at its own speed. Frame-by-frame animation uses one shared data timer (~10 fps), only
// while a visible unit needs it; movement itself is a native `left`/`top` transition. Heroes whose
// frames aren't synced yet (tools/sync_heroes.py) stand still and breathe natively.

import { div, image, svg } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { agents, spaces, run, setAgentOrder, props, layout, shared, setShared } from "herdr";
import { UI, C, hash, clip, heroOf, heroTitle, guards, QUEST, sky, stop, selectedAddress, walkAnim, nomBoss, champion, bannieres, bossDuJour, look, monde } from "./kit.js";
import { HEROES } from "./heros-data.js";
import { lieux, market } from "./lieux.js";
import { art } from "./ui.js";
import { t as tr, detectLang } from "./i18n.js";
import { Activites, TRAIL } from "./activite.js";
import { Ambiance, behind } from "./ambiance.js";
import { DEMO_LOG } from "./demo.js";
import { commandPanel, MINI_INSET, watchStat } from "./commande.js";

const ART = "mods/world-of-codecraft/art";
const MONDE = `${ART}/monde`; // rings and quest marks, only in the summer folder (the world's own images: monde(), the shown look's)
const PANEL = 262; // command panel width (lines up with the quest board)
const RANK = { blocked: 0, done: 1, working: 2, idle: 3, garde: 4 };
const LOG_KEY = "wocc.chronicle";
const TICK = 100; // ms: the shared frame timer (10 fps)
const ONLY_SELECTED = false; // if CPU is too high: frame-animate only the selected unit
const PAUSE = (addr, n) => 15000 + (hash(`${addr}:pause:${n}`) % 25000); // an idle hero's stop at each stroll spot
const STAY = (addr, n) => 10000 + (hash(`${addr}:poste:${n}`) % 10000); // a working hero's stay on each spot
const NEAR = 300; // a working hero moves on only to a spot this close (px)
const BLINK = 500; // ms a unit blinks in when it comes, or its ghost blinks out when it leaves
// on/off about 3 times over BLINK (an opacity loop pushed far outside 0..1 clamps to a near-instant switch)
const clignote = (e) => e.loop("opacity", { from: -6, to: 7, period: 166, easing: "linear" });
// An apprentice's summon: its hero casts (`work`) CAST ms, a gold ring opens on the ground at its feet and sparkles
// rise, and it blinks in LEAD ms in. Each stage is a frame-timer redraw that changes the native transitions' targets.
const SUMMON = 1400;
const LEAD = 350;
const CAST = 1000;
const OUVRE = 100; // the ring opens and the sparkles rise from here
const FONDU = 700; // and fade from here
const ADIEU = [100, 300]; // a leaving apprentice's sparkles: rise, then fade, within its BLINK ghost window
const ETOFFES = [0, 3, 2]; // the trophy banners' cloth (ui.js banner colours: red, violet, green), each with the cup
/** How many of these thresholds (ms) dt has passed. */
const etape = (dt, seuils) => seuils.filter((s) => dt >= s).length;

/** The summon ring at a feet point: halo.svg from 0.2x to 2.5x (of 48 x 20 px), opacity 0 -> 0.9 -> 0 (stage 0, 1, 2). */
function anneau(k, v) {
  const w = v ? 120 : 10, h = v ? 50 : 4, tr = { duration: 900, easing: "ease-out" };
  return image(`${ART}/halo.svg`).id(`anneau-${k}`).absolute().left(-w / 2).top(-h / 2).w(w).h(h).opacity(v === 1 ? 0.9 : 0)
    .transition("left", tr).transition("top", tr).transition("width", tr).transition("height", tr)
    .transition("opacity", { duration: 400, easing: "linear" });
}

/** n sparkles (etincelle.svg) over a feet point, spread over 2r px and staggered by `pas` ms: hidden at stage 0, shown
 *  and rising `monte` px at stage 1, faded at stage 2. */
function etincelles(id, n, v, { r, pas, monte, duree, fondu }) {
  return Array.from({ length: n }, (_, k) => {
    const x = Math.round(r * ((2 * k) / (n - 1) - 1)) - 5, y = -10 - (k % 2) * 6;
    const tr = (duration) => ({ duration, delay: k * pas, easing: "ease-out" });
    return image(`${ART}/etincelle.svg`).id(`${id}-${k}`).absolute().left(x).top(v ? y - monte : y).size(10).opacity(v === 1 ? 1 : 0)
      .transition("top", tr(duree)).transition("opacity", tr(fondu));
  });
}

// Where each class works (demo heroes only: the others work where they stand).
const WORK = { mage: "tour", artificier: "atelier", guerrier: "caserne", pretre: "temple", rodeur: "grange", voleur: "etal1" };
const RECRUIT = {
  tour: { argv: ["claude"], get what() { return tr("recruit").tour; } },
  atelier: { argv: ["claude"], get what() { return tr("recruit").atelier; } },
  caserne: { argv: null, get what() { return tr("recruit").caserne; } },
};
const RACE_EN = { elfe: "elf", orque: "orc", humain: "human", "mort-vivant": "undead", nain: "dwarf" };
const CLS_EN = { mage: "mage", artificier: "artificer", guerrier: "warrior", pretre: "priest", rodeur: "ranger", voleur: "rogue" };
const RACE_FR = Object.fromEntries(Object.entries(RACE_EN).map(([f, e]) => [e, f]));
const CLS_FR = Object.fromEntries(Object.entries(CLS_EN).map(([f, e]) => [e, f]));

// ------------------------------------------------------------------ the road

const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);

/** The closest point of the road to p: { p, s (arc length), i (segment) }. */
function onRoad(p) {
  const { ROAD, ROAD_S } = lieux();
  let best = null;
  for (let i = 0; i < ROAD.length - 1; i++) {
    const a = ROAD[i], b = ROAD[i + 1];
    const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy;
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2));
    const q = [a[0] + t * dx, a[1] + t * dy];
    const d = dist(p, q);
    if (!best || d < best.d) best = { d, p: q, s: ROAD_S[i] + t * Math.sqrt(L2), i };
  }
  return best;
}

/** Points from a to b: straight when close, else onto the road, along it, and off it. */
function route(a, b) {
  if (dist(a, b) < 170) return [a, b];
  const ra = onRoad(a), rb = onRoad(b), { ROAD } = lieux();
  const pts = [a, ra.p];
  if (ra.s < rb.s) for (let i = ra.i + 1; i <= rb.i; i++) pts.push(ROAD[i]);
  else for (let i = ra.i; i > rb.i; i--) pts.push(ROAD[i]);
  pts.push(rb.p, b);
  return pts.filter((p, i) => i === 0 || dist(p, pts[i - 1]) > 2);
}

/** p, or the nearest walkable point (lieux POSTES) no other hero holds or heads for when one does. */
function libre(p, taken) {
  if (!taken.has(p.join())) return p;
  return lieux().POSTES.filter((s) => !taken.has(s.join())).sort((a, b) => dist(a, p) - dist(b, p))[0] ?? p;
}

/** The chronicle tag for a feet point: the nearest building (or the market) within 200 px, else the village. */
function quartier(x, y) {
  const { BUILDINGS, MARCHE } = lieux();
  const d = ([bx, by, bw, bh]) => Math.hypot(Math.max(bx - x, 0, x - bx - bw), Math.max(by - y, 0, y - by - bh));
  const [near] = [...Object.values(BUILDINGS).map((b) => [d(b.box), b.nom]), [d(MARCHE), market()]].sort((p, q) => p[0] - q[0]);
  return near[0] < 200 ? near[1] : tr("villageTag");
}

export default class Place {
  init(_p, cx) {
    detectLang(cx);
    if (!_p?.immersion) watchStat(cx); // the panel is drawn here only in the Workshop strip
    this.born = Date.now();
    this.gotoAt = shared("wocc.goto")?.at; // ignore a minimap click left over from an earlier session
    this.w = 1400;
    this.camX = null;
    this.lastFocus = null;
    this.now = new Date();
    this.prev = null;
    this.mob = new Map(); // address -> { x, y, goal, legs: [{ a, b, t0, t1 }] }
    this.flanes = new Map(); // address -> { n, i, at }: an idle hero's stroll (spot index, arrival time)
    this.postes = new Map(); // address -> { n, goal, at }: a working hero's spot (arrival time, moves so far)
    this.timer = null;
    this.sig = "";
    this.vus = null; // key (address, or hero:subagent id) -> its frame and feet point on the last live render; null = next is a first one
    this.nes = new Map(); // key -> when it came (blinking in)
    this.fantomes = new Map(); // key -> its last frame and feet point, and when it left (blinking out)
    this.invocations = new Map(); // apprentice key -> its summon: { t0, x, y (its feet point), hero }
    this.act = new Activites(); // what each hero does while working (Claude Code hook)
    // the raid boss slain by this village's damage: a chronicle line (only the shown village deals damage)
    this.act.abattu = (addr, day) => {
      const a = agents().find((x) => x.address === addr), m = this.mob.get(addr), p = m && this.pos(m, Date.now());
      this.say(`[${p ? quartier(p.x, p.y) : tr("villageTag")}] ${tr("bossSlain", nomBoss(day), heroTitle(heroOf(addr, a?.program)))}`, "done", addr);
    };
    this.amb = new Ambiance(route); // village life: walkers, animals, treasury, fair
    try { this.log = JSON.parse(localStorage.getItem(LOG_KEY) ?? "[]"); } catch { this.log = []; }
    cx.timer.every(60_000, (cx) => { this.now = new Date(); cx.notify(); });
  }

  // ---------------------------------------------------------------- chronicle

  say(text, kind, address) {
    try { this.log = JSON.parse(localStorage.getItem(LOG_KEY) ?? "[]"); } catch {} // the other village may have written
    this.log.unshift({ at: Date.now(), text, kind, address });
    this.log = this.log.slice(0, 40);
    try { localStorage.setItem(LOG_KEY, JSON.stringify(this.log)); } catch {}
  }

  watch(list) {
    const now = new Map(list.map((a) => [a.address, a]));
    if (this.prev) {
      for (const a of list) {
        const was = this.prev.get(a.address);
        const h = heroOf(a.address, a.program);
        const m = this.mob.get(a.address);
        const here = m && this.pos(m, Date.now());
        const where = a.status === "idle" || !here ? tr("villageTag") : quartier(here.x, here.y);
        const quest = a.tab_name && !/^\d+$/.test(a.tab_name) ? tr("quoted", clip(a.tab_name, 34)) : "";
        if (!was) this.say(`[${where}] ${tr("arrives", heroTitle(h), h.prog)}`, a.status, a.address);
        else if (was.status !== a.status) {
          if (a.status === "idle" && was.status === "done") continue;
          const verb = QUEST[a.status].fr + (a.status === "working" || a.status === "done" ? quest : "");
          this.say(`[${where}] ${heroTitle(h)} (${h.prog}) ${verb}`, a.status, a.address);
        }
      }
      for (const [addr, a] of this.prev) if (!now.has(addr)) this.say(`[${tr("gate")}] ${tr("leaves", heroTitle(heroOf(addr, a.program)))}`, "idle", null);
    } else if (!this.log.length) {
      const b = list.filter((a) => a.status === "blocked").length;
      this.say(`[${tr("crier")}] ${tr("hearYe", list.length, b)}`, "idle", null);
    }
    this.prev = new Map(list.map((a) => [a.address, { status: a.status, program: a.program }]));
  }

  // ---------------------------------------------------------------- units and movement

  /** Where a unit is at time t, and the leg it walks (null when standing). */
  pos(m, t) {
    for (const l of m.legs) {
      if (t < l.t0) return { x: l.a[0], y: l.a[1], leg: l };
      if (t < l.t1) {
        const k = (t - l.t0) / (l.t1 - l.t0);
        return { x: l.a[0] + (l.b[0] - l.a[0]) * k, y: l.a[1] + (l.b[1] - l.a[1]) * k, leg: l };
      }
    }
    return { x: m.x, y: m.y, leg: null };
  }

  /** An idle hero's stroll spot: it stands PAUSE after arriving, then heads for another. */
  flane(addr, t) {
    const { FLANE } = lieux();
    let w = this.flanes.get(addr);
    if (!w) { w = { n: 0, i: hash(addr) % FLANE.length, at: null }; this.flanes.set(addr, w); }
    const m = this.mob.get(addr);
    if (!m || m.goal.join() !== FLANE[w.i].join() || (m.legs.length && t < m.legs[m.legs.length - 1].t1)) return w;
    if (w.at === null) w.at = t;
    else if (t - w.at >= PAUSE(addr, w.n)) {
      const busy = new Set([...this.flanes.values()].map((o) => o.i));
      const held = new Set([...this.mob].filter(([k]) => k !== addr).map(([, o]) => o.goal.join())); // working heroes stand on stroll spots too
      let i = hash(`${addr}:${++w.n}`) % FLANE.length;
      for (let k = 0; k < FLANE.length && (busy.has(i) || held.has(FLANE[i].join())); k++) i = (i + 1) % FLANE.length;
      w.i = i;
      w.at = null;
    }
    return w;
  }

  /** A working hero's next spot among its group's (another one near it, no other hero's goal) once it has stood
   *  STAY on this one and its scene allows a walk (Activites.calme); null = it stays. */
  poste(u, m, t) {
    const addr = u.a.address;
    let p = this.postes.get(addr);
    if (!p || p.goal !== m.goal.join()) { p = { n: p?.n ?? 0, goal: m.goal.join(), at: null }; this.postes.set(addr, p); }
    if (u.a.status !== "working" || this.act.melee(addr) || (m.legs.length && t < m.legs[m.legs.length - 1].t1)) return null;
    if (p.at === null) p.at = t;
    const due = p.at + STAY(addr, p.n);
    if (t < due) { this.wake = Math.min(this.wake ?? Infinity, due); return null; }
    if (!this.act.calme(u.a)) return null; // the activity poll redraws when the scene allows it
    const busy = new Set([...this.mob].filter(([k]) => k !== addr).map(([, o]) => o.goal.join()));
    const free = u.spots.filter((s) => s.join() !== p.goal && !busy.has(s.join()) && dist(s, m.goal) < NEAR);
    if (!free.length) return null;
    return free[hash(`${addr}:poste:${++p.n}`) % free.length];
  }

  /** Every unit with its goal spot, current position and leg; starts walks when a goal changes. */
  units(list, t) {
    const { FLANE, SPOTS, POSTES } = lieux();
    const taken = new Set();
    const goals = new Map();
    this.wake = null; // when a standing idle hero moves on (the ambient timer redraws then)
    const want = list.map((a) => {
      const h = a.demoHero ? { ...heroOf(a.address, a.program), race: RACE_FR[a.demoHero.split("-")[0]], cls: CLS_FR[a.demoHero.split("-")[1]] } : heroOf(a.address, a.program);
      // shells stroll like idle heroes; a working, blocked or done hero, or one in a raid, stays where it is (demo
      // heroes: at their class building)
      const group = (a.status === "idle" && !this.act.melee(a.address)) || a.guard ? "flane" : a.demoHero ? WORK[h.cls] : "poste";
      if (group === "flane") {
        const w = this.flane(a.address, t);
        goals.set(a.address, FLANE[w.i]);
        taken.add(FLANE[w.i].join());
        if (w.at !== null) this.wake = Math.min(this.wake ?? Infinity, w.at + PAUSE(a.address, w.n));
      }
      return { a, h, group, spots: group === "poste" ? POSTES : SPOTS[group] };
    });
    // keep a unit on its current spot when it stays in the same group (no shuffling); a working one moves on
    // now and then to another spot of its group
    for (const u of want) {
      const m = this.mob.get(u.a.address);
      if (goals.has(u.a.address)) continue;
      if (m && m.group === u.group && !taken.has(m.goal.join())) {
        const g = this.poste(u, m, t) ?? m.goal;
        taken.add(g.join());
        goals.set(u.a.address, g);
      }
    }
    for (const u of want) {
      if (goals.has(u.a.address)) continue;
      if (u.group === "poste") { // where it stands now (mid-walk: its point on the leg), or a free point near it
        const m = this.mob.get(u.a.address), p = m && this.pos(m, t);
        const g = libre(p ? [p.x, p.y] : FLANE[hash(u.a.address) % FLANE.length], taken);
        taken.add(g.join());
        goals.set(u.a.address, g);
        continue;
      }
      let g = u.spots.find((p) => !taken.has(p.join()));
      if (!g) { const k = taken.size; const base = u.spots[k % u.spots.length]; g = [base[0] + 18 * (1 + Math.floor(k / u.spots.length)), base[1] + 6]; }
      taken.add(g.join());
      goals.set(u.a.address, g);
    }
    const out = [];
    const alive = new Set();
    for (const u of want) {
      const addr = u.a.address;
      alive.add(addr);
      const goal = goals.get(addr);
      let m = this.mob.get(addr);
      if (!m) { m = { x: goal[0], y: goal[1], goal, group: u.group, legs: [] }; this.mob.set(addr, m); }
      else if (m.goal.join() !== goal.join()) {
        const here = this.pos(m, t);
        const speed = HEROES[`${RACE_EN[u.h.race]}-${CLS_EN[u.h.cls]}`]?.speed ?? 42;
        const pts = route([here.x, here.y], goal);
        m.legs = [];
        let t0 = t;
        for (let i = 1; i < pts.length; i++) {
          const t1 = t0 + (dist(pts[i - 1], pts[i]) / speed) * 1000;
          m.legs.push({ a: pts[i - 1], b: pts[i], t0, t1 });
          t0 = t1;
        }
        m.x = goal[0]; m.y = goal[1]; m.goal = goal;
      }
      m.group = u.group; // also when it keeps its spot (a stroller turning working where it stands)
      if (m.legs.length && t >= m.legs[m.legs.length - 1].t1 + TRAIL) m.legs = []; // kept while its apprentices still walk them
      const p = this.pos(m, t);
      out.push({ a: u.a, h: u.h, x: p.x, y: p.y, leg: p.leg, key: `${RACE_EN[u.h.race]}-${CLS_EN[u.h.cls]}` });
    }
    for (const k of [...this.mob.keys()]) if (!alive.has(k)) this.mob.delete(k);
    for (const k of [...this.flanes.keys()]) if (!want.some((u) => u.group === "flane" && u.a.address === k)) this.flanes.delete(k);
    for (const k of [...this.postes.keys()]) if (!alive.has(k)) this.postes.delete(k);
    return out;
  }

  /** The anim a unit plays now, and its sprite info (falls back to the standing sprite). */
  anim(u) {
    const H = HEROES[u.key];
    let name;
    if (u.leg) name = walkAnim(u.leg.b[0] - u.leg.a[0], u.leg.b[1] - u.leg.a[1]);
    else if ([...this.invocations.values()].some((s) => s.hero === u.a.address && Date.now() - s.t0 < CAST)) name = "work"; // summoning
    else if (this.act.melee(u.a.address)) name = "work"; // fighting the raid boss or its minions
    else name = (u.a.status === "working" && this.act.anim(u.a.address)) || (u.a.status === "working" ? "work" : "idle");
    const info = H?.anims?.[name];
    if (info) return { name, info, frames: true };
    return { name: "stand", info: H?.stand ?? { w: 50, h: 85, ax: 25, ay: 83 }, frames: false };
  }

  unit(u, selected, night, t, animate) {
    const { a, h } = u;
    const st = a.status;
    const an = this.anim(u);
    const { w, h: hh, ax, ay } = an.info;
    const suffix = night ? "-n" : "";
    // the feet point moves (natively, linear, over the rest of the leg); everything hangs from it
    let el = div().id(`unite-${a.address}`).absolute().left(Math.round(u.leg ? u.leg.b[0] : u.x)).top(Math.round(u.leg ? u.leg.b[1] : u.y)).w(0).h(0);
    // always declared (16 ms when standing): GPUI animates only changes made after the transition exists,
    // so adding it on the render that sets the first leg's target made that leg jump
    {
      const dur = u.leg ? Math.max(16, u.leg.t1 - t) : 16;
      el = el.transition("left", { duration: dur, easing: "linear" }).transition("top", { duration: dur, easing: "linear" });
    }
    // rings under the feet
    if (selected) el = el.child(image(`${MONDE}/ring-selected.png`).absolute().left(-30).top(-17).w(60).h(33));
    if (st === "blocked" && !u.leg) el = el.child(image(`${MONDE}/ring-blocked.png`).absolute().left(-30).top(-17).w(60).h(33).loop("opacity", { from: 0.2, to: 1, period: 460 }));
    if (st === "done" && !u.leg) el = el.child(image(`${MONDE}/ring-done.png`).absolute().left(-30).top(-17).w(60).h(33).loop("opacity", { from: 0.45, to: 1, period: 1100 }));

    // the sprite: every frame of the anim stacked (preloaded), only the current one shown
    let body;
    if (an.frames) {
      const dir = `${ART}/heros/${u.key}/${an.name}`;
      const k = animate ? Math.floor(((t + (hash(a.address) % 997)) / 1000) * an.info.fps) % an.info.n : 0;
      body = div().absolute().left(-ax).top(-ay).w(w).h(hh)
        .children(Array.from({ length: an.info.n }, (_, i) =>
          image(`${dir}/${String(i).padStart(2, "0")}${suffix}.png`).absolute().left(0).top(0).w(w).h(hh).opacity(i === k ? 1 : 0)));
      u.vu = { src: `${dir}/${String(k).padStart(2, "0")}${suffix}.png`, w, h: hh, ax, ay };
    } else {
      // no frames yet: the standing sprite, breathing (1 px) or bobbing while it walks
      u.vu = { src: `${ART}/heros/${u.key}/stand${suffix}.png`, w, h: hh, ax, ay };
      body = div().absolute().left(-ax).top(-ay).w(w).h(hh)
        .child(image(`${ART}/heros/${u.key}/stand${suffix}.png`).absolute().left(0).top(0).w(w).h(hh)
          .loop("top", u.leg ? { from: 0, to: -2, period: 380 } : { from: 0, to: -1, period: 2600 + (hash(a.address) % 900) }));
    }
    el = el.child(body);

    // hit box, tooltip, click
    el = el.child(div().id(`clic-${a.address}`).absolute().left(-ax).top(-ay).w(w).h(hh).cursor_pointer()
      .tooltip(tr("unitTip", heroTitle(h), h.prog, `${a.space_name ?? ""} › ${a.tab_name ?? ""}`, QUEST[st]?.mot ?? tr("onGuardTerm")))
      .on_mouse_down("left", stop)
      .on_click((_e, cx) => {
        this.lastFocus = null; // the camera glides to it again, even when it was already selected
        if (a.guard) run("pane.focus", { pane: a.pane }); else run("agent.focus", { terminal: a.address });
        cx.notify();
      }));

    const head = -ay;
    if (st === "blocked" && !u.leg) {
      el = el.child(image(`${MONDE}/m-blocked.png`).absolute().left(-12).top(head - 42).w(24).h(38)
        .loop("top", { from: head - 42, to: head - 50, period: 500 }).loop("opacity", { from: 0.35, to: 1, period: 520 }));
      el = el.child(div().absolute().left(18).top(head - 4).h(22).px(6).rounded(3).bg(C.parch).border_2().border_color(C.woodDark)
        .flex().items_center().whitespace_nowrap().font_family(UI).text_size(15).text_color(C.wax)
        .frames(tr("help"), 900));
    }
    if (st === "done" && !u.leg) {
      el = el.child(image(`${MONDE}/m-done.png`).absolute().left(-14).top(head - 42).w(28).h(38).loop("top", { from: head - 40, to: head - 48, period: 900 }));
      el = el.child(div().absolute().left(-22).top(head + 10).size(3).bg(C.goldLight).loop("top", { from: head + 30, to: head - 6, period: 1000 }).loop("opacity", { from: 1, to: 0, period: 1000 }));
      el = el.child(div().absolute().left(20).top(head + 20).size(3).bg("#fff2c0").loop("top", { from: head + 40, to: head + 2, period: 1300 }).loop("opacity", { from: 1, to: 0, period: 1300 }));
    }
    if (!u.leg && !a.guard) el = el.children(this.act.layers(u, head, night, t));
    // the champion (its subagent slew today's boss) wears a crown until midnight, above its head, its HP bar and its
    // quest mark
    if (champion() === a.address) {
      const marks = (st === "blocked" || st === "done") && !u.leg;
      const top = Math.min(-(HEROES[u.key]?.stand?.ay ?? ay) - 9, marks ? head - 61 : selected ? head - 20 : 0);
      el = el.child(image(`${ART}/couronne.svg`).absolute().left(-6).top(top).w(13).h(9));
    }
    if (selected) {
      el = el.child(div().absolute().left(-15).top(head - 9).w(30).h(5).bg("#1b1420").border_1().border_color("#000000")
        .child(div().h_full().w(st === "blocked" ? 8 : 28).bg(st === "blocked" ? "#e5685a" : "#7dff6a")));
    }
    return el;
  }

  // ---------------------------------------------------------------- the frame timer

  /** One shared data timer while something needs frames or walks; it re-renders only when a frame changes. */
  tick(cx, need) {
    if (need && !this.timer) {
      this.timer = cx.timer.every(TICK, (cx) => {
        const s = this.frameSig(Date.now());
        if (s !== this.sig) { this.sig = s; cx.notify(); }
      });
    } else if (!need && this.timer) { this.timer.cancel(); this.timer = null; }
  }

  /** What the animated units show at time t (their frames and legs): unchanged = no redraw. */
  frameSig(t) {
    let s = "";
    for (const u of this.anims ?? []) {
      const m = this.mob.get(u.addr);
      if (!m) continue;
      const p = this.pos(u.trail ?? m, t); // an apprentice: its own walk
      const k = u.fps ? Math.floor(((t + u.ph) / 1000) * u.fps) % u.n : 0;
      s += `${u.addr}:${u.ph}:${k}:${p.leg ? p.leg.t0 : "-"};`;
    }
    // a blink in or out that ends: redraw once to drop it
    for (const [k, t0] of this.nes) s += `${k}:${t - t0 < BLINK};`;
    for (const [k, g] of this.fantomes) s += `${k}:${t - g.t0 < BLINK}:${etape(t - g.t0, ADIEU)};`;
    for (const [k, v] of this.invocations) s += `${k}:${etape(t - v.t0, [OUVRE, LEAD, FONDU, CAST, SUMMON])};`;
    return s + this.act.fenetres(t); // a raid blow, fall or flight: each stage and its end
  }

  // ---------------------------------------------------------------- blinking in and out

  /** Who came or left since the last live render: a hero, a warrior or an apprentice that comes blinks in (nes), one
   *  that leaves leaves a ghost at its last frame and feet point (fantomes), each for BLINK ms. An apprentice blinks
   *  in only when its hero's activity file was already read (not the first read after a reload). on = false
   *  (hidden, demo): nothing blinks, and the next render is a first one again (no blink for those
   *  present then). */
  passages(units, apps, on, t) {
    if (!on) { this.vus = null; this.nes.clear(); this.fantomes.clear(); this.invocations.clear(); return; }
    const now = new Map([...units.map((u) => [u.a.address, { ...u.vu, x: u.x, y: u.y }]), ...apps.map((ap) => [ap.key, { ...ap.vu, hero: ap.addr }])]);
    if (this.vus) {
      for (const [k, v] of now) if (!this.vus.has(k) && (!v.hero || this.lus.has(v.hero))) {
        if (v.hero) this.invocations.set(k, { t0: t, x: v.x, y: v.y, hero: v.hero }); // an apprentice is summoned
        this.nes.set(k, v.hero ? t + LEAD : t); // when its blink starts
      }
      for (const [k, v] of this.vus) if (!now.has(k)) this.fantomes.set(k, { ...v, t0: t });
    }
    for (const k of now.keys()) this.fantomes.delete(k);
    for (const [k, t0] of this.nes) if (t - t0 >= BLINK || !now.has(k)) this.nes.delete(k);
    for (const [k, g] of this.fantomes) if (t - g.t0 >= BLINK) this.fantomes.delete(k);
    for (const [k, v] of this.invocations) if (t - v.t0 >= SUMMON) this.invocations.delete(k);
    this.vus = now;
    this.lus = new Set(units.filter((u) => this.act.files.has(u.a.address)).map((u) => u.a.address));
  }

  /** A unit's or an apprentice's element in a layer that blinks while it comes (always there: a stable tree); a summoned
   *  apprentice is hidden until its blink starts. */
  blink(k, el, t) {
    const t0 = this.nes.get(k);
    return div().absolute().left(0).top(0).w(0).h(0).when(t0 > t, (e) => e.opacity(0)).when(t0 <= t, clignote).child(el);
  }

  /** The glows at the feet of those blinking in (following their walk), the ghosts blinking out (an apprentice's with
   *  sparkles rising) and the summons' rings (on the ground) and sparkles: [{ z, el, box }]. */
  traces(units, apps, t) {
    const out = [];
    const glow = (k, x, y, leg) => {
      const dur = leg ? Math.max(16, leg.t1 - t) : 16;
      return { z: y + 2.5, el: div().id(`lueur-${k}`).absolute().left(Math.round(leg ? leg.b[0] : x)).top(Math.round(leg ? leg.b[1] : y)).w(0).h(0)
        .transition("left", { duration: dur, easing: "linear" }).transition("top", { duration: dur, easing: "linear" })
        .child(image(`${ART}/halo.svg`).absolute().left(-34).top(-14).w(68).h(28).opacity(0.6)) };
    };
    for (const u of units) if (this.nes.has(u.a.address)) out.push(glow(u.a.address, u.x, u.y, u.leg));
    for (const ap of apps) if (this.nes.get(ap.key) <= t) out.push(glow(ap.key, ap.vu.x, ap.vu.y, ap.vu.leg));
    for (const [k, g] of this.fantomes) {
      out.push({ z: g.y + 3, box: { x: g.x - g.ax, y: g.y - g.ay, w: g.w, h: g.h, fy: g.y },
        el: clignote(div().id(`fantome-${k}`).absolute().left(Math.round(g.x)).top(Math.round(g.y)).w(0).h(0))
          .child(image(g.src).absolute().left(-g.ax).top(-g.ay).w(g.w).h(g.h)) });
      if (g.hero) out.push({ z: g.y + 3.5, el: div().id(`adieu-${k}`).absolute().left(Math.round(g.x)).top(Math.round(g.y)).w(0).h(0)
        .children(etincelles(`adieu-${k}`, 4, etape(t - g.t0, ADIEU), { r: 18, pas: 25, monte: 40, duree: 300, fondu: 120 })) });
    }
    for (const [k, v] of this.invocations) {
      const e = etape(t - v.t0, [OUVRE, FONDU]);
      const at = (id) => div().id(id).absolute().left(Math.round(v.x)).top(Math.round(v.y)).w(0).h(0);
      out.push({ z: v.y + 2.5, el: at(`invocation-${k}`).child(anneau(k, e)) });
      out.push({ z: v.y + 3.5, el: at(`invocation-etincelles-${k}`)
        .children(etincelles(`etincelle-${k}`, 5, e, { r: 36, pas: 80, monte: 50, duree: 700, fondu: 250 })) });
    }
    return out;
  }

  hidden() {
    const id = props()?.immersion ? "place-immersion" : "place"; // two villages in the layout, one shown
    const find = (n) => (!n || typeof n !== "object" ? null : n.id === id ? n : (n.children ?? []).map(find).find(Boolean) ?? null);
    try { return Boolean(find(layout())?.hidden); } catch { return false; }
  }

  // ---------------------------------------------------------------- world parts

  smoke() {
    const out = [];
    lieux().SMOKE.forEach(([sx, sy], n) => {
      for (let k = 0; k < 3; k++) {
        const x0 = sx - 4, y0 = sy - 8, p = 2800 + k * 520 + n * 130;
        out.push(div().absolute().left(x0).top(y0).size(7 + k * 2).rounded_full().bg(k === 1 ? "#b9b4bfbb" : "#d8d4dcbb")
          .loop("top", { from: y0, to: y0 - 44 - k * 10, period: p, easing: "linear" })
          .loop("left", { from: x0, to: x0 + 10 + k * 6, period: p, easing: "linear" })
          .loop("opacity", { from: 0.85, to: 0, period: p, easing: "linear" }));
      }
    });
    return out;
  }

  /** Winter: light snow over the view (above the world, under the chronicle). Each wheel (neige-k.svg, a few flakes on
   *  its rim) turns natively and shows only its right-hand sector, where the rim goes down: the flakes fall and never
   *  climb back, as a `top` loop (there and back) would. A twin wheel 1 px lower right, dark and turning in step (same
   *  period, same render), edges each flake so it shows over the snow too. */
  neige(vw, vh) {
    if (!look().neige) return [];
    const out = [];
    for (let y = -60, r = 0; y < vh; y += 330, r++) {
      for (let x = -40 + (r % 2) * 45, k = 0; x < vw; x += 90, k++) {
        const roue = (dx, color) => svg(`${ART}/neige-${(k + r) % 3}.svg`).absolute().left(dx - 380).top(dx - 45).size(480).text_color(color)
          .spin(17000 + ((k * 7 + r * 5) % 9) * 1100);
        out.push(div().absolute().left(x).top(y).w(100).h(390).overflow_hidden()
          .child(roue(1, "#3a4a6a99")).child(roue(0, "#ffffff")));
      }
    }
    return out;
  }

  glows(nightK) {
    if (nightK <= 0) return [];
    return lieux().GLOWS.map((g) => {
      const s = g.size;
      return div().absolute().left(g.at[0] - s / 2).top(g.at[1] - s / 2).size(s).rounded_full().bg(`${g.color}22`)
        .opacity(nightK).loop("opacity", { from: 0.35 * nightK, to: nightK, period: g.period });
    });
  }

  hitboxes() {
    return Object.entries(lieux().BUILDINGS).map(([k, b]) => {
      const r = RECRUIT[k];
      let el = div().id(`bat-${k}`).absolute().left(b.box[0]).top(b.box[1]).w(b.box[2]).h(b.box[3])
        .tooltip(r ? tr("recruitTip", b.nom, r.what) : b.nom);
      if (r) el = el.on_click((e) => { if (e.click_count === 2) run("tab.new", r.argv ? { argv: r.argv } : {}); });
      return el;
    });
  }

  /** A front cut-out (the object's own baked pixels), crossfaded like the world. */
  front(f, nightK) {
    let el = div().absolute().left(f.x).top(f.y).w(f.w).h(f.h);
    if (nightK < 1) el = el.child(image(`${monde()}/avant-${f.key}-jour.png`).absolute().left(0).top(0).w(f.w).h(f.h));
    if (nightK > 0) el = el.child(image(`${monde()}/avant-${f.key}-nuit.png`).absolute().left(0).top(0).w(f.w).h(f.h).opacity(nightK));
    return el;
  }

  /** The town hall's trophy standards (kit.js bannieres; none in the demo): a pole with a gold finial and the banner at
   *  1.5x (39 x 60) hanging from its crossbar, in front of the door; dimmed at night, the cloth swaying a pixel while
   *  animated. World elements at depth = the pole's foot, sorted with the units like any standing thing. */
  etendards(nightK) {
    if (props()?.demo) return [];
    const { BANNIERES, VICTOIRE } = lieux();
    const out = BANNIERES.slice(0, bannieres()).map(([x, y], i) => this.etendard(x, y, ETOFFES[i], 2600 + i * 700, nightK));
    // a victory day: red standards all over the world until midnight (VICTOIRE), the champion's portrait over the cup
    const boss = bossDuJour();
    if (boss.slain) out.push(...VICTOIRE.map(([x, y], i) => this.etendard(x, y, 0, 2600 + (i % 4) * 700, nightK, boss.heros)));
    return out;
  }

  /** One standard: the pole's foot at (x, y), the banner of cloth `etoffe` swaying over `period` ms; with `heros`
   *  (the slayer's { race, cls }), its framed portrait covers the cup charge and sways with the cloth. */
  etendard(x, y, etoffe, period, nightK, heros) {
    return { z: y,
      el: div().absolute().left(x).top(y).w(0).h(0).opacity(1 - 0.55 * nightK)
        .child(div().absolute().left(-2).top(-82).w(4).h(82).bg("#4a2f1e").border_1().border_color("#1e120c"))
        .child(div().absolute().left(-21).top(-79).w(42).h(3).bg("#6b3f26").border_1().border_color("#1e120c"))
        .child(div().absolute().left(-4).top(-88).size(8).rounded_full().bg("#e0a32a").border_1().border_color("#6b3f10"))
        .child(div().absolute().left(-19).top(-76).w(39).h(60)
          .child(image(art(`banniere-${etoffe}-coupe`)).absolute().left(0).top(0).w(39).h(60))
          .when(!!heros, (e) => e.child(image(art(`heros/${heros.race}-${heros.cls}-p22`)).absolute().left(7).top(13).size(24)))
          .loop("left", { from: -19, to: -18, period })) };
  }

  // ---------------------------------------------------------------- the panel

  /** Immersive layout: the command panel is another block (commande.js, role "commande"). Tell it where the
   *  camera and the units are (store key wocc.view, only when it changes, at most every 300 ms) and obey its
   *  minimap clicks (wocc.goto). */
  bridge(units, vw) {
    const g = shared("wocc.goto");
    if (g && g.at !== this.gotoAt) {
      this.gotoAt = g.at;
      this.camX = g.x - vw / 2;
      if (typeof g.y === "number") this.camY = g.y;
      this.manual = true;
    }
    const view = { cam: Math.round(this.cam(vw)), vw: Math.round(vw), dots: units.map((u) => [Math.round(u.x / 8) * 8, Math.round(u.y / 8) * 8, u.a.status]) };
    const key = JSON.stringify(view);
    const now = Date.now();
    if (key !== this.viewKey && now - (this.viewAt ?? 0) > 300) { this.viewKey = key; this.viewAt = now; setShared("wocc.view", view); }
  }

  minimap(units, vw) {
    const { WORLD } = lieux();
    const mw = PANEL - MINI_INSET, k = mw / WORLD.w, mh = Math.round(WORLD.h * k);
    const col = { blocked: C.quest, done: C.gold, working: "#7dff6a", idle: "#cfc8da", garde: "#9aa4b1" };
    const view = (vw / WORLD.w) * mw;
    const vx = ((this.cam(vw) - WORLD.x) / WORLD.w) * mw;
    return div().id("minicarte").relative().w(mw).h(mh).flex_none().cursor_pointer()
      .tooltip(tr("mapTip"))
      .on_mouse_down("left", (e, cx) => {
        const lx = e.local_position?.x;
        if (typeof lx === "number") { this.camX = WORLD.x + (lx / mw) * WORLD.w - vw / 2; this.manual = true; cx.notify(); }
        cx.stop_propagation();
      })
      .child(image(`${monde()}/minicarte.png`).absolute().left(0).top(0).w(mw).h(mh))
      .children(units.map((u) => {
        let d = div().absolute().left((u.x - WORLD.x) * k - 2).top(u.y * k - 3).size(4).bg(col[u.a.status] ?? "#ffffff").border_1().border_color("#000000");
        if (u.a.status === "blocked") d = d.loop("opacity", { from: 0.2, to: 1, period: 420 });
        return d;
      }))
      .child(div().absolute().left(vx).top(0).w(view).h(mh).border_1().border_color("#ffffff"));
  }

  /** Immersive layout: the world y at the top of the view, kept inside the painted bands. */
  camV() {
    const { WORLD, EXT } = lieux();
    const h = this.h ?? WORLD.h, top = -EXT.nord, bottom = WORLD.h + EXT.sud;
    if (h >= bottom - top) return (top + bottom - h) / 2;
    const c = Number.isFinite(this.camY) ? this.camY : WORLD.h / 2 - 40 - h / 2; // a NaN (bad world data) must not stick
    return Math.max(top, Math.min(bottom - h, c));
  }

  /** The world x at the left of the view (the world spans WORLD.x to WORLD.x + WORLD.w), kept inside it. */
  cam(vw, c = this.camX) {
    const { WORLD } = lieux();
    const max = Math.max(WORLD.x, WORLD.x + WORLD.w - vw);
    return Math.max(WORLD.x, Math.min(max, Number.isFinite(c) ? c : WORLD.x + WORLD.w / 2 - vw / 2));
  }

  chronicle() {
    const tone = { blocked: C.quest, done: C.gold, working: "#8fd16a", idle: "#cfc8da" };
    return v_flex().absolute().left(10).top(8).gap(2).children((props()?.demo ? DEMO_LOG : this.log).slice(0, 4).map((e, i) => {
      const tag = e.text.match(/^\[[^\]]+\]/)?.[0] ?? "";
      const d = new Date(e.at);
      return h_flex().id(`ev-${i}-${e.at}`).gap(5).px(6).h(20).items_center().rounded(2).bg("#0b0810bb").whitespace_nowrap().cursor_pointer()
        .opacity(i === 0 ? 1 : 0.9 - i * 0.15)
        .on_mouse_down("left", stop)
        .on_click(() => { if (e.address) run("agent.focus", { terminal: e.address }); })
        .font_family(UI).text_size(16)
        .child(div().text_color("#8a8296").child(`${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`))
        .child(div().text_color(tone[e.kind] ?? C.gold).child(tag))
        .child(div().text_color(C.cream).child(e.text.slice(tag.length).trim()));
    }));
  }

  // ---------------------------------------------------------------- demo (props.demo)

  demo() {
    const sp = spaces()[0];
    // [status, program, hero]: the animated heroes first, then fallbacks
    const D = [["working", "claude", "orc-mage"], ["blocked", "shell", "human-warrior"], ["done", "opencode", "elf-ranger"], ["idle", "codex", "dwarf-artificer"],
      ["working", "gemini", "human-priest"], ["working", "claude", "elf-mage"], ["blocked", "aider", "undead-rogue"], ["working", "codex", "orc-artificer"],
      ["working", "claude", "human-mage"], ["working", "claude", "undead-mage"]];
    // demo activities (props.demo): combat with a blow every 2.5 s and a failed tool every 20 s, a scout with
    // two apprentices, a meditation, a thinker; the scene changes immediately (no file, no anti-zapping wait)
    const n = Date.now();
    const ACT = {
      0: { act: "code", tache: 1, coups: Math.floor(n / 2500) % 400, subs: 0, err: 1, errT: n - (n % 20000), t: n },
      5: { act: "eclaire", tache: 1, subs: 2, t: n },
      7: { act: "test", tache: 1, essai: { ok: Math.floor(n / 12000) % 2 === 0, t: n - (n % 12000) }, commitT: n - (n % 15000), pushT: n - (n % 30000), t: n },
      8: { act: "pense", tache: 1, subs: 1, t: n },
      9: { act: "code", tache: 7, coups: Math.floor(n / 3100) % 400, subs: 0, errTache: 3, t: n }, // the troll boss
      4: { act: "medite", tache: 1, subs: 0, t: n },
    };
    const cyc = props()?.demo === "marche" ? Math.floor(Date.now() / 30000) % 2 : 0;
    return D.map(([status, key, hero], i) => ({
      address: `demo-${i}-${key}`, space: sp?.id, space_name: sp?.name, tab_name: tr("demoTabs")[i],
      status: cyc && i < 4 ? (status === "idle" ? "working" : "idle") : status, seq: i, focused: false, demoHero: hero, demoAct: ACT[i],
      program: { key: key === "shell" ? "sh" : key, name: key, shell: false } }));
  }

  render(cx) {
    const t = Date.now();
    const L = lieux(), { WORLD, TILES, FRONTS, EXT } = L;
    // another map: its heroes, strolls and work spots start afresh on its spots
    if (this.carteId && this.carteId !== L.id) { this.mob.clear(); this.flanes.clear(); this.postes.clear(); }
    this.carteId = L.id;
    const at = new Date(this.now);
    if (typeof props()?.heure === "number") at.setHours(props().heure, 0); // demo: another time of day
    const sk = sky(at);
    const nightK = sk.phase === "nuit" ? 1 : sk.phase === "jour" ? 0 : 0.55; // night layer over the day one
    const nightHeroes = sk.phase === "nuit";

    let list = agents().map((a) => ({ ...a }));
    if (props()?.demo) list = this.demo(); // screenshots: only the demo heroes, none of the person's agents
    else if (this.hidden()) { // the other village keeps the chronicle; start afresh when shown again
      this.prev = null;
      try { this.log = JSON.parse(localStorage.getItem(LOG_KEY) ?? "[]"); } catch {}
    } else if (shared("wocc.lang") || Date.now() - this.born > 4000) this.watch(list); // chronicle once the language is known
    const order = [...list].sort((a, b) => RANK[a.status] - RANK[b.status] || b.seq - a.seq);
    if (!props()?.demo) setAgentOrder(order.map((a) => a.address));
    const gs = guards().slice(0, 4).map((p) => ({ address: p.terminal, pane: p.pane, guard: true, status: "garde", program: p.program, tab_name: p.title, focused: p.focused }));
    this.act.watch(cx, order, this.hidden(), !props()?.demo);
    const units = this.units([...order, ...gs], t);

    // the selected unit = the focused shell when it is a guard, else the focused agent
    const want = selectedAddress();
    const sel = units.find((u) => u.a.address === want) ?? units.find((u) => u.a.focused) ?? null;
    // immersive layout: the command panel is its own block (role "commande"), the village takes the full width
    const imm = Boolean(props()?.immersion);
    const vw = Math.max(200, this.w - (imm ? 0 : PANEL));
    if (imm) this.bridge(units, vw);
    if (sel && sel.a.address !== this.lastFocus) {
      this.lastFocus = sel.a.address;
      this.manual = false; // a new selection takes the camera back
      this.camX = sel.x - vw / 2; // glide to the selected unit
      if (imm) this.camY = sel.y - 60 - (this.h ?? WORLD.h) / 2; // and bring the village back into view
    } else if (sel?.leg && sel.a.status !== "idle" && !sel.a.guard && !this.manual) this.camX = sel.x - vw / 2; // and follow it while it walks to work (not strolling or patrolling)
    const camX = this.cam(vw);

    // frame animation: visible units with frames, or any walking unit
    const hidden = this.hidden();
    const visible = (u) => u.x > camX - 80 && u.x < camX + vw + 80;
    this.anims = [];
    for (const u of units) {
      const an = this.anim(u);
      const animate = !hidden && visible(u) && an.frames && (!ONLY_SELECTED || u === sel);
      u.animate = animate;
      if (animate || u.leg) this.anims.push({ addr: u.a.address, fps: animate ? an.info.fps : 0, n: an.info.n ?? 1, ph: hash(u.a.address) % 997 });
    }
    // apprentices (one half-size hero per running subagent) by their heroes, on the side away from the creature;
    // their frames and their walks (in single file on the hero's path) run on the same frame timer
    const apps = units.flatMap((u) => {
      const m = this.mob.get(u.a.address);
      return u.a.guard ? [] : this.act.apprentis(u, m, (tr, at) => this.pos(tr, at), m.x > L.BASCULE ? -1 : 1, nightHeroes, t, !hidden && visible(u));
    });
    for (const ap of apps) if (ap.anim.fps || ap.anim.trail.legs.length) this.anims.push({ addr: ap.addr, ...ap.anim });

    // depth: units by feet y (+3, like the compositor), front cut-outs above the units behind them
    const els = units.map((u) => this.unit(u, u === sel, nightHeroes, t, u.animate));
    this.passages(units, apps, !hidden && !props()?.demo, t);
    // the frame timer also runs while someone blinks in or out or is summoned, or a raid boss is hit, falls or flees, and
    // redraws at each stage and its end
    this.tick(cx, !hidden && (this.anims.length > 0 || this.nes.size > 0 || this.fantomes.size > 0 || this.invocations.size > 0 || this.act.fenetres(t) !== ""));
    this.sig = this.frameSig(t);
    const things = units.map((u, i) => ({ z: u.y + 3, el: this.blink(u.a.address, els[i], t) }));
    for (const u of units) { const c = this.act.creature(u, nightHeroes); if (c) things.push(c); things.push(...this.act.sbiresDe(u, nightHeroes)); }
    const working = list.filter((a) => a.status === "working").length;
    this.amb.watch(cx, !hidden, { phase: sk.phase, wake: this.wake });
    const life = this.amb.things(nightHeroes, sk.phase, working, units);
    things.push(...life);
    things.push(...apps.map((ap) => ({ ...ap, el: this.blink(ap.key, ap.el, t) })));
    const traces = this.traces(units, apps, t);
    things.push(...traces);
    for (const fr of FRONTS) {
      const over = units.some((u) => {
        const an = this.anim(u);
        const x0 = u.x - an.info.ax, y0 = u.y - an.info.ay;
        return u.y + 3 < fr.z && x0 < fr.x + fr.w && x0 + an.info.w > fr.x && y0 < fr.y + fr.h && u.y > fr.y;
      });
      const walkerBehind = [...life, ...apps, ...traces].some((th) => th.box && behind(th.box).includes(fr));
      if (over || walkerBehind) things.push({ z: fr.z, el: this.front(fr, nightK) });
    }
    things.push(...this.etendards(nightK));
    things.sort((p, q) => p.z - q.z);

    // immersive layout: the lands around the village (tools/bake_lands.py, terre-data.js) and a vertical camera too
    const worldTop = imm ? -this.camV() : Math.round(((this.h ?? WORLD.h) - WORLD.h) / 2);
    const glide = this.drag ? { duration: 16, easing: "linear" } : { duration: 650, easing: "ease-in-out" };
    const M = monde();
    const tw = (k) => TILES.find((tl) => tl.k === k).w; // a band tile is as wide as the world tile under it
    const band = (name, y) => [
      ...EXT.tiles.map((tl) => image(`${M}/${name}-${tl.k}-jour.png`).absolute().left(tl.x).top(y).w(tw(tl.k)).h(EXT[name])),
      ...(nightK > 0 ? EXT.tiles.map((tl) => image(`${M}/${name}-${tl.k}-nuit.png`).absolute().left(tl.x).top(y).w(tw(tl.k)).h(EXT[name]).opacity(nightK)) : []),
    ];

    // the camera glides (650 ms) except while the view is dragged, where it follows the pointer
    const layer = (id) => div().id(id).absolute().top(worldTop).left(-camX).w(WORLD.w).h(WORLD.h)
      .transition("left", glide).transition("top", glide);
    const world = layer("monde")
      .when(imm, (el) => el.children(band("nord", -EXT.nord)).children(band("sud", WORLD.h)))
      .children(TILES.map((tl) => image(`${M}/jour-${tl.k}.png`).absolute().left(tl.x).top(0).w(tl.w).h(WORLD.h)))
      .when(nightK > 0, (el) => el.children(TILES.map((tl) => image(`${M}/nuit-${tl.k}.png`).absolute().left(tl.x).top(0).w(tl.w).h(WORLD.h).opacity(nightK))))
      .children(this.glows(nightK))
      .children(this.hitboxes())
      .children(things.map((th) => th.el))
      .children(this.smoke());

    const panel = imm ? null : commandPanel(PANEL, this.minimap(units, vw), sel);

    return h_flex().id("place").size_full().bg(C.slate)
      .on_size_change((s, cx) => {
        if (Math.abs(s.width - this.w) > 10 || s.height !== this.h) { this.w = s.width; this.h = s.height; cx.notify(); }
      })
      .when(!imm, (el) => el.child(panel))
      .child(div().id("vue").flex_1().h_full().relative().overflow_hidden().bg(look().fond)
        .on_scroll_wheel((e, cx) => {
          if (imm) { this.camX = this.cam(vw) - e.delta.x; this.camY = this.camV() - e.delta.y; }
          else this.camX = this.cam(vw) - (Math.abs(e.delta.x) > Math.abs(e.delta.y) ? e.delta.x : e.delta.y);
          this.manual = true;
          cx.notify();
        })
        // click and drag the village to pan (units and buttons stop the press, so their clicks still work)
        .when(!this.drag, (e) => e.cursor_grab()).when(Boolean(this.drag), (e) => e.cursor_grabbing())
        .on_mouse_down("left", (e, cx) => { this.drag = { x0: e.position.x, y0: e.position.y, cam0: this.cam(vw), camY0: this.camV() }; cx.notify(); })
        .on_mouse_move((e, cx) => {
          if (!this.drag) return;
          const x = this.cam(vw, this.drag.cam0 - (e.position.x - this.drag.x0));
          const y = imm ? this.drag.camY0 - (e.position.y - this.drag.y0) : 0;
          if (Math.abs(x - this.cam(vw)) < 1 && (!imm || Math.abs(y - this.camV()) < 1)) return;
          this.camX = x;
          if (imm) this.camY = y;
          this.manual = true;
          cx.notify();
        })
        .on_mouse_up("left", (_e, cx) => { if (this.drag) { this.drag = null; cx.notify(); } })
        .on_hover((over, cx) => { if (!over && this.drag) { this.drag = null; cx.notify(); } })
        .child(world)
        .children(this.neige(vw, this.h ?? WORLD.h))
        .child(this.chronicle()));
  }
}
