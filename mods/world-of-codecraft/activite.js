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
// Raid: while a hero has running subagents, whatever its status, it stands and fights the day's raid boss (the forest
// troll drawn twice as large, kit.js bossDuJour), whose HP every hero shares: each successful subagent tool call is
// 1 damage. At 0 HP it falls in a gold burst (no more raids that day); when a hero's subagents all end first, it flees
// and keeps its HP. It wins over the scenes.
// Lot 2: six creatures in the draw (imp, wolf, goblin, boar, rust golem, spectre); a task with 3+ failed
// tools brings the forest troll, a boss of 8 blows.
// Anti-zapping: a scene changes only when the new one has been asked for 8 s and the current one has
// lasted 15 s; 20 s / 40 s when it means walking to or from the forest edge (meditation, tests and the
// end of work switch at once).

import { div, image } from "gpui-kit";
import { home, readTextFile, shared, setShared } from "herdr";
import { hash, UI, C, heroOf, walkAnim, BOSS, TROPHEES, bossDuJour, veille } from "./kit.js";
import { walkable } from "./lieux.js";
import { CREATURES } from "./creatures-data.js";
import { HEROES } from "./heros-data.js";
import { t as tr } from "./i18n.js";

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
const clsOf = (a) => (a.demoHero ? { mage: "mage", artificer: "artificier", ranger: "rodeur", priest: "pretre", rogue: "voleur", warrior: "guerrier" }[a.demoHero.split("-")[1]] : heroOf(a.address, a.program).cls);
const RESULT = 5000; // a test result stays on screen this long
const BETE = 1.5; // fight creatures drawn this much larger (art 2x: 3x3 screen px per art px, still crisp)
const STUCK = 10000; // a fight with no blow for this long (delegating to subagents) no longer holds the hero
const SCENE_OF = { pense: "pense", eclaire: "eclaire", web: "eclaire", code: "combat", commande: "combat", medite: "medite", test: "test" };
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
const GEANT = 2; // the raid boss drawn this much larger (art 2x: 4x4 screen px per art px)
const LOIN = 170; // px from the hero's feet to the raid boss's
const COUP = 900; // a raid blow (damage dealt in a poll) shows this long
const CHUTE = 1200; // the raid boss's fall (the felled puff and the gold burst), or its flight, lasts this long
const ETAPES = [100, 700]; // the fall's and the flight's stages: open / walk off from here, fade from here
const etape = (dt) => ETAPES.filter((s) => dt >= s).length;
const FUIR = 150; // px the raid boss walks away from the hero when it flees
const VUS = "wocc.boss.vus"; // { address: the subCoups already counted as damage }, so a reload neither loses nor recounts
// half the raid boss's width at its widest pose, plus an apprentice's half body: no apprentice's feet that close to its x
const LARGE = Math.max(...Object.values(CREATURES.troll ?? {}).flatMap((p) => [p.ax, p.w - p.ax])) * GEANT + 25;

/** Where slot k stands by a hero standing at p: its offset, else mirrored, else pulled in (mirrored too), the first
 *  on walkable ground at least GAP px from the apprentices placed before it (and, in a raid, off the boss's
 *  footprint); else the first such point around the hero; else a quarter of its offset (away from a raid boss). */
function spot(p, k, side, taken, raid) {
  // in a raid every slot is on the side away from the boss, zigzagging out 45 px apart
  const [dx0, dy] = raid ? [70 + 45 * k, k % 2 ? -30 : 6] : SLOTS[k], dx = -side * dx0;
  const free = (q) => walkable(q) && !taken.some((o) => Math.hypot(o[0] - q[0], o[1] - q[1]) < GAP)
    && !(raid && Math.abs(q[0] - (p[0] + side * LOIN)) < LARGE);
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
    this.raids = new Map(); // address -> { ids (running subagents), at (last blow), fin (its end, 0 = none), issue ("mort" | "fuite") }
    this.abattu = null; // (address, day) when this village's damage slays the boss: the chronicle line (Place)
    this.timer = null;
    this.busy = false;
  }

  /** The scene a unit plays now (decided in the poll, read in render); none during a raid. */
  scene(addr) {
    if (this.off || this.raid(addr)) return null;
    return this.scenes.get(addr)?.scene ?? null;
  }

  /** A hero's raid, while it has running subagents and through the boss's fall or flight (null = none). */
  raid(addr) {
    const r = this.raids.get(addr);
    if (!r || this.off) return null;
    if (r.fin && Date.now() - r.fin >= CHUTE) { this.raids.delete(addr); return null; }
    return r;
  }

  /** Follows a hero's running subagents (not demo heroes): a raid starts with the first one while today's boss stands,
   *  the boss flees when the last one ends, and falls when it is slain (mort; tue: this hero dealt damage in the poll
   *  that slew it, so a raid not drawn yet still shows the fall). A new subagent during the flight starts it again.
   *  True when the raid changed. */
  mene(addr, s, now, mort, tue) {
    const ids = this.subagents(s).map((x) => x.id);
    const r = this.raids.get(addr);
    if (r && !r.fin) {
      if (mort) Object.assign(r, { fin: now, issue: "mort" });
      else if (!ids.length) Object.assign(r, { fin: now, issue: "fuite" });
      else if (ids.join() === r.ids.join()) return false;
      r.ids = ids;
      return true;
    }
    if (tue) { this.raids.set(addr, { ids, at: now, fin: now, issue: "mort" }); return true; }
    if (!ids.length || mort) return false;
    this.raids.set(addr, { ids, at: 0, fin: 0, issue: null });
    return true;
  }

  /** The shown, live village only (ecrit; not the demo): each hero's new successful subagent tool calls since its
   *  stored count (VUS) are damage on today's boss, the first sight of a terminal only stores its count, and vanished
   *  terminals are forgotten. The last blow slays the boss: trophies and the chronicle line. Returns { coups
   *  (address -> damage dealt in this poll), tue (slain in this poll), boss (today's, after the damage) }. */
  degats(lus, now) {
    const coups = new Map();
    let boss = bossDuJour(new Date(now));
    if (!this.ecrit) return { coups, tue: false, boss };
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
    if (boss.slain) { coups.clear(); return { coups, tue: false, boss }; } // it already fell today: no more blows
    if (!coups.size) return { coups, tue: false, boss };
    boss = { ...boss };
    for (const [addr, d] of coups) {
      boss.hp = Math.max(0, boss.hp - d);
      if (!boss.hp) { Object.assign(boss, { slain: true, slainAt: now, by: addr }); break; }
    }
    setShared(BOSS, boss);
    if (boss.slain) {
      const T = shared(TROPHEES) ?? {};
      const streak = T.lastDay === boss.day ? T.streak ?? 1 : T.lastDay === veille(boss.day) ? (T.streak ?? 0) + 1 : 1;
      setShared(TROPHEES, { total: (T.total ?? 0) + 1, streak, lastDay: boss.day });
      this.abattu?.(boss.by, boss.day);
    }
    return { coups, tue: boss.slain, boss };
  }

  /** The raids' bounded windows open at t (a blow, a fall or a flight, with its stages): the frame timer runs while
   *  one is, and its signature changes at each stage and when one ends (a redraw drops it). */
  fenetres(t) {
    let s = "";
    if (this.off) return s;
    for (const [k, r] of this.raids) {
      const fin = r.fin && t - r.fin < CHUTE;
      if (t - r.at < COUP || fin) s += `${k}:${r.at}:${r.fin}:${fin ? etape(t - r.fin) : ""};`;
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
   *  ecrit: this copy deals the raid damage (not the demo); it polls only while shown and animated. */
  watch(cx, list, hidden, off = false, ecrit = false) {
    this.list = list;
    this.off = off;
    this.ecrit = ecrit;
    if (off) this.raids.clear();
    const need = !hidden && !off && list.some((a) => this.reads(a) || this.scenes.has(a.address));
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
      const { coups, tue, boss } = this.degats(lus, now);
      for (const [addr, s] of lus) changed = this.mene(addr, s, now, boss.slain, tue && coups.has(addr)) || changed;
      for (const addr of coups.keys()) { const r = this.raids.get(addr); if (r && !r.fin) { r.at = now; changed = true; } } // the boss flinches
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
    }
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
   *  single file (walk frames by direction) and step out to their slots at the end. m = the hero's mob entry,
   *  pos(trail, t) = Place.pos, side = the creature's side (1 = right), animate = its frames run (else frame 0).
   *  Depth-sorted world elements: [{ z, el, box, addr, key, vu, anim }], anim = its frame timer entry (fps, n, ph,
   *  trail), key = hero:subagent id, vu = its frame, feet point and leg now. */
  apprentis(u, m, pos, side, night, t, animate) {
    const addr = u.a.address;
    const subs = this.subagents(this.file(addr) ?? u.a.demoAct);
    const slots = this.slots.get(addr) ?? new Map(); // subagent id -> slot, kept while it runs
    this.slots.set(addr, slots);
    for (const id of [...slots.keys()]) if (!subs.some((x) => x.id === id)) slots.delete(id);
    for (const x of subs) {
      const used = new Set(slots.values());
      const k = SLOTS.findIndex((_, k) => !used.has(k));
      if (!slots.has(x.id) && k >= 0) slots.set(x.id, k);
    }
    const drawn = subs.filter((x) => slots.has(x.id)).sort((p, q) => slots.get(p.id) - slots.get(q.id));
    // the slots by the hero's goal and, on a walk, by its starting point
    const raid = Boolean(this.raid(addr));
    const at = (p) => { const taken = []; return drawn.map((x) => { const q = spot(p, slots.get(x.id), side, taken, raid); taken.push(q); return q; }); };
    const ends = at([m.x, m.y]), starts = m.legs.length ? at(m.legs[0].a) : ends;
    const sfx = night ? "-n" : "";
    return drawn.map((x, i) => {
      const k = slots.get(x.id);
      const tr = trail(m.legs, starts[i], ends[i], SLOTS[k][2]);
      const p = pos(tr, t), leg = p.leg && (p.leg.a[0] !== p.leg.b[0] || p.leg.a[1] !== p.leg.b[1]) ? p.leg : null;
      const name = leg ? walkAnim(leg.b[0] - leg.a[0], leg.b[1] - leg.a[1]) : WORKS.has(x.act) ? "work" : "idle";
      const key = KINDS[hash(`${addr}:${x.id}`) % KINDS.length];
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
        .child(div().absolute().left(-ax).top(-ay).w(w).h(h)
          .children(Array.from({ length: A.n }, (_, i) =>
            image(`${dir}/${String(i).padStart(2, "0")}${sfx}.png`).absolute().left(0).top(0).w(w).h(h).opacity(i === f ? 1 : 0))))
        .when(!leg && READS.has(x.act), (e) => e.child(image(`${ART}/ic-parchemin.svg`).absolute().left(-9).top(-ay - 22).size(18)));
      // vu: what it shows now (its ghost when it leaves; Place.passages)
      const vu = { src: `${dir}/${String(f).padStart(2, "0")}${sfx}.png`, w, h, ax, ay, x: p.x, y: p.y, leg: p.leg };
      return { z: p.y + 3, el, box: { x: p.x - ax, y: p.y - ay, w, h, fy: p.y }, addr, key: `${addr}:${x.id}`, vu, anim: { fps: animate ? A.fps : 0, n: A.n, ph, trail: tr } };
    }).filter(Boolean);
  }

  /** The creature a fighting unit faces, as its own depth-sorted world element: { z, el } or null. */
  creature(u, night) {
    const addr = u.a.address;
    if (u.leg || this.off) return null;
    const r = this.raid(addr);
    if (r) return this.geant(u, r, night);
    const s = this.file(addr) ?? u.a.demoAct;
    if (!s) return null;
    const sc = this.scene(addr);
    const dummy = sc === "test" || recent(s.essai?.t, RESULT);
    if (sc !== "combat" && !dummy) return null;
    // on the hero's right and a little nearer the viewer, facing it (left side near the world's right end)
    const side = u.x > 2700 ? -1 : 1;
    const off = dummy ? 44 : boss(s) ? 115 : 70; // creatures are drawn larger (BETE); the troll is wide: keep it off the hero
    const x = Math.round(u.x + side * off), y = Math.round(u.y + 16);
    const kids = dummy ? this.dummy(u, s, night ? "-n" : "", side) : this.fight(u, s, night ? "-n" : "", side);
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
  fight(u, s, sfx, side) {
    const addr = u.a.address;
    const h = this.hits.get(addr) ?? { coups: s.coups ?? 0, at: 0, felled: [] };
    const B = blowsFor(s);
    const sp = boss(s) ? "troll" : species(addr, s.tache ?? 0, Math.floor((s.coups ?? 0) / B), clsOf(u.a));
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

  /** The raid boss: the troll GEANT times its drawn size, LOIN px from the hero on the creature's side, today's HP
   *  (shared by every raid) in a bar over its head; hit COUP ms after each damage tick; when slain, the felled puff and a
   *  gold burst; when it flees, it turns its back and walks FUIR px away, fading. { z, el }. */
  geant(u, r, night) {
    const D = CREATURES.troll;
    if (!D) return null;
    const addr = u.a.address;
    const side = u.x > 2700 ? -1 : 1;
    const x = Math.round(u.x + side * LOIN), y = Math.round(u.y + 16);
    const g = side > 0 ? "" : "-g", sfx = night ? "-n" : "";
    const now = Date.now();
    const e = r.fin ? etape(now - r.fin) : 0;
    const sprite = (pose, extra, gg = g) => {
      const p = D[pose];
      return image(`${CRE}/troll/${pose}${gg}${sfx}.png`).absolute().left(-p.ax * GEANT).top(-p.ay * GEANT + 4).w(p.w * GEANT).h(p.h * GEANT).when(Boolean(extra), extra);
    };
    if (r.issue === "fuite") {
      // drawn where it stood, then (stage 1) given the far point and opacity 0, which its native transitions carry
      const tr = { duration: CHUTE - ETAPES[0], easing: "ease-in" };
      return { z: y + 3, el: div().id(`fuite-${addr}`).absolute().left(e ? x + side * FUIR : x).top(y).w(0).h(0).opacity(e ? 0 : 1)
        .transition("left", tr).transition("opacity", tr)
        .child(div().absolute().left(0).top(0).w(0).h(0).loop("top", { from: 0, to: -5, period: 320 })
          .child(sprite("pret", null, side > 0 ? "-g" : ""))) };
    }
    const out = [];
    if (r.issue === "mort") {
      // felled: fades and rises in a puff, at the boss's size, in a gold burst
      const p = D.touche;
      out.push(image(`${CRE}/troll/touche${g}${sfx}.png`).absolute().left(side * 28 - p.ax * GEANT).top(-p.ay * GEANT).w(p.w * GEANT).h(p.h * GEANT)
        .loop("opacity", { from: 0.9, to: 0, period: CHUTE }).loop("top", { from: -p.ay * GEANT, to: -p.ay * GEANT - 32, period: CHUTE }));
      out.push(div().absolute().left(side * 28 - 24).top(-40).size(48).rounded_full().bg("#e8e2d0aa")
        .loop("opacity", { from: 0.8, to: 0, period: CHUTE }));
      out.push(...eclat(addr, e, Math.round((D.pret.h * GEANT) / 2)));
    } else if (now - r.at < COUP) {
      out.push(sprite("touche"));
      out.push(div().absolute().left(-12).top(-D.pret.h * GEANT / 2 - 8).size(24).rounded_full().bg("#fff6d8")
        .loop("opacity", { from: 1, to: 0, period: 450 }));
    } else {
      out.push(sprite("pret", (el) => el.loop("opacity", { from: 7, to: -6, period: 1700 + (hash(addr) % 400), easing: "linear" })));
      out.push(sprite("attaque", (el) => el.loop("opacity", { from: -6, to: 7, period: 1700 + (hash(addr) % 400), easing: "linear" })));
    }
    // today's HP over its head while it fights
    if (!r.fin) {
      const b = bossDuJour(), W = 84;
      out.push(div().absolute().left(-W / 2).top(-D.pret.h * GEANT - 12).w(W).h(8).bg("#1b1420").border_1().border_color("#000000")
        .child(div().h_full().w(Math.round(((W - 2) * b.hp) / b.max)).bg("#e5685a")));
    }
    return { z: y + 3, el: div().absolute().left(x).top(y).w(0).h(0).children(out) };
  }
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
