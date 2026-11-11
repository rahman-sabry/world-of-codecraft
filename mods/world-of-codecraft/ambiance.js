// Village life (Lot 3), independent of the agents, drawn only while the « Animations » toggle is on:
//   walkers on the road (peasant woman and farmer by day, a merchant when 2+ heroes work, a guard with a
//   lantern at night), pausing between stops; hens pecking by the barn (asleep at night), a cat at the
//   tavern door, three roaming cats (sitting at their stops, or beside an idle hero now and then), a stag at
//   the forest edge at dawn and dusk, sparrows circling over the fields, fish leaping in the river (not in winter: it is frozen); the treasury in front of the town hall (coins = account A's weekly quota left)
//   and fair pennants over the square the day before the weekly reset.
// Walks are native linear `left`/`top` transitions, one leg at a time: a 1 s data timer only starts the
// next leg (and flips the sprite) when one ends, so the cost is one redraw every few seconds.
// Frame swaps (stand/step, peck, wings) use an opacity loop pushed far outside 0..1 so it clamps to an
// almost instant switch instead of a slow crossfade.

import { div, image, svg } from "gpui-kit";
import { readQuotas, left as timeLeft, hash, carte } from "./kit.js";
import { CREATURES } from "./creatures-data.js";
import { FRONTS } from "./monde-data.js";
import { t as tr } from "./i18n.js";

const CRE = "mods/world-of-codecraft/art/creatures";
const ART = "mods/world-of-codecraft/art";
const TICK = 1000;

const day = (ph) => ph === "jour" || ph === "aube" || ph === "crepuscule";
const WALKERS = [
  { id: "paysanne", when: (ph) => day(ph), speed: 20, route: [[1010, 368], [1215, 340], [1360, 382], [1500, 374], [1735, 366]] },
  { id: "fermier", when: (ph) => day(ph), speed: 16, route: [[80, 332], [210, 322], [330, 348], [430, 374], [560, 356]] },
  { id: "marchand", when: (ph, working) => day(ph) && working >= 2, speed: 14, route: [[1760, 360], [1900, 352], [2040, 372], [2160, 374]] },
  { id: "garde", when: (ph) => !day(ph) || ph === "crepuscule", speed: 15, lantern: true, route: [[1215, 340], [1400, 384], [1610, 394], [1735, 366]] },
];
const HENS = [[195, 270, 2600], [229, 278, 3100], [166, 282, 3700]];
const CAT = [1626, 290];
// Roaming cats: their stops (open ground: windmill fields, barn, tavern, market, jetty and lake shore) and speed
// (px/s). They walk along the road like the heroes, sit a while, and now and then go and sit beside a hero.
const CATS = [
  { stops: [[-505, 322], [-460, 365], [-180, 345], [290, 300], [330, 335]], speed: 24 },
  { stops: [[290, 300], [1520, 335], [1598, 352], [1680, 342], [1735, 320]], speed: 28 },
  { stops: [[1680, 342], [1900, 352], [3400, 250], [3545, 292], [3700, 316]], speed: 22 },
];
const SIT = (k, n) => 20000 + (hash(`chat${k}:${n}`) % 40000); // how long a cat sits at a stop
const FRIEND = 800; // a cat goes to a hero only this close (px)
const SIDE = 22; // and sits this far to the side of its feet
const calm = (u) => (u.a.status === "idle" || u.a.status === "garde") && !u.leg;
const STAG = [2790, 252];
const FISH = [[2858, 372, 4200], [2912, 350, 5300]];
const TREASURY = [1262, 352];
const FAIR = [[1508, 300], [1700, 300]];

/** A near-instant swap between two frames: `b` shows half the period. */
/** Where a walker really is now (its element glides natively towards the leg's end). */
const at = (leg, now) => {
  const k = leg.t1 > leg.t0 ? Math.max(0, Math.min(1, (now - leg.t0) / (leg.t1 - leg.t0))) : 1;
  return [leg.a[0] + (leg.b[0] - leg.a[0]) * k, leg.a[1] + (leg.b[1] - leg.a[1]) * k];
};

/** The front cut-outs a sprite box is behind (drawn again above it): the same test as for heroes. */
export function behind(b) {
  return FRONTS.filter((fr) => b.fy + 3 < fr.z && b.x < fr.x + fr.w && b.x + b.w > fr.x && b.y < fr.y + fr.h && b.fy > fr.y);
}

const swap = (el, period) => el.loop("opacity", { from: -6, to: 7, period, easing: "linear" });
/** Its partner: the other frame, hidden exactly while `swap` shows (both loops start on the same render). */
const unswap = (el, period) => el.loop("opacity", { from: 7, to: -6, period, easing: "linear" });

export class Ambiance {
  /** route(a, b): the points from a to b along the road (place.js, as the heroes walk). */
  constructor(route) {
    this.route = route;
    this.walk = new Map(); // id -> { i, dir, leg: { a, b, t0, t1 }, face }
    this.heroes = []; // the units of the last render (for the cats)
    const now = Date.now();
    // k -> { n, leg, path (points still to walk), goal, face, hero (address it sits by), by (that hero's feet) }
    this.cats = CATS.map((c, k) => {
      const p = c.stops[Math.floor(c.stops.length / 2)];
      return { n: 0, leg: { a: p, b: p, t0: now, t1: now + 5000 + (hash(`chat${k}`) % 25000) }, path: [], goal: p, face: k % 2 ? "-g" : "", hero: null };
    });
    this.timer = null;
    this.quota = null; // { left (0..100), resets (ms) }
    this.qAt = 0;
  }

  /** Runs the 1 s timer while the village is animated and shown; ctx.wake: when an idle hero moves on (redraw then). */
  watch(cx, on, ctx) {
    this.ctx = ctx;
    if (on && !this.timer) this.timer = cx.timer.every(TICK, (cx) => this.tick(cx));
    else if (!on && this.timer) { this.timer.cancel(); this.timer = null; }
    if (on && Date.now() - this.qAt > 60_000) this.loadQuota(cx);
  }

  loadQuota(cx) {
    this.qAt = Date.now();
    cx.spawn(async (cx) => {
      try {
        const [a] = await readQuotas();
        const q = a?.week && !a.missing ? { left: 100 - a.week.used, resets: a.week.resets } : null;
        if (JSON.stringify(q) !== JSON.stringify(this.quota)) { this.quota = q; cx.notify(); }
      } catch {}
    });
  }

  tick(cx) {
    const now = Date.now();
    let changed = false;
    for (const w of WALKERS) {
      const m = this.walk.get(w.id);
      if (m && now >= m.leg.t1) { this.next(w, m, now); changed = true; }
      // redraw when a walker passes behind or out from behind a building, a stall, the board...
      if (m) {
        const key = behind(this.box(w.id, m, now)).map((f) => f.key).join();
        if (key !== m.depth) { m.depth = key; changed = true; }
      }
    }
    this.cats.forEach((m, k) => {
      if (this.cat(k, m, now)) changed = true;
      const key = behind(this.box("chat", m, now, m.leg.a === m.leg.b ? "assis" : "marche")).map((f) => f.key).join();
      if (key !== m.depth) { m.depth = key; changed = true; }
    });
    if (this.ctx?.wake && now >= this.ctx.wake) { this.ctx.wake = null; changed = true; }
    if (now - this.qAt > 60_000) this.loadQuota(cx);
    if (changed) cx.notify();
  }

  /** A walker's sprite box at its real position: { x, y, w, h, fy (feet) }. */
  box(id, m, now, pose = "debout") {
    const p = CREATURES[id]?.[pose] ?? { w: 30, h: 60, ax: 15, ay: 59 };
    const [x, y] = at(m.leg, now);
    return { x: x - p.ax, y: y - p.ay, w: p.w, h: p.h, fy: y };
  }

  /** The next leg: a pause at a stop (2-7 s), then on to the neighbouring stop (back at the ends). */
  next(w, m, now) {
    const here = m.leg.b;
    if (!m.paused) {
      m.paused = true;
      const wait = 2000 + ((now / 7) % 5000);
      m.leg = { a: here, b: here, t0: now, t1: now + wait };
      return;
    }
    m.paused = false;
    if (m.i + m.dir < 0 || m.i + m.dir >= w.route.length) m.dir = -m.dir;
    m.i += m.dir;
    const b = w.route[m.i];
    const d = Math.hypot(b[0] - here[0], b[1] - here[1]);
    m.face = b[0] < here[0] ? "" : "-g"; // sprites face left; -g faces right
    m.leg = { a: here, b, t0: now, t1: now + (d / w.speed) * 1000 };
  }

  /** A cat's next move when its leg ends (true = redraw): the next road point, sitting on arrival, then off to
   *  another stop or, one time in three, beside a calm hero nearby (no other cat's). It gets up early when that
   *  hero walks off, starts working or leaves (gone before it arrives: it sits there all the same). */
  cat(k, m, now) {
    const sitting = m.leg.a === m.leg.b;
    const stays = () => {
      const u = this.heroes.find((h) => h.a.address === m.hero);
      return u && calm(u) && Math.hypot(u.x - m.by[0], u.y - m.by[1]) <= 4;
    };
    if (sitting && m.hero && now < m.leg.t1 && !stays()) m.leg.t1 = now;
    if (now < m.leg.t1) return false;
    const here = m.leg.b;
    const step = (b) => {
      if (Math.abs(b[0] - here[0]) > 1) m.face = b[0] < here[0] ? "" : "-g"; // sprites face left; -g faces right
      m.leg = { a: here, b, t0: now, t1: now + (Math.hypot(b[0] - here[0], b[1] - here[1]) / CATS[k].speed) * 1000 };
    };
    if (m.path.length) { step(m.path.shift()); return true; }
    if (!sitting) { // arrived: sit (facing its hero)
      if (m.hero && !stays()) m.hero = null;
      if (m.hero) m.face = m.by[0] > here[0] ? "-g" : "";
      m.leg = { a: here, b: here, t0: now, t1: now + SIT(k, m.n) };
      return true;
    }
    m.n++;
    m.hero = null;
    const others = this.cats.filter((o) => o !== m);
    let goal = null;
    if (hash(`chat${k}:ami:${m.n}`) % 3 === 0) {
      const [u] = this.heroes.filter((u) => calm(u) && !others.some((o) => o.hero === u.a.address) && Math.hypot(u.x - here[0], u.y - here[1]) < FRIEND)
        .sort((p, q) => Math.hypot(p.x - here[0], p.y - here[1]) - Math.hypot(q.x - here[0], q.y - here[1]));
      if (u) { m.hero = u.a.address; m.by = [u.x, u.y]; goal = [u.x + (here[0] < u.x ? -SIDE : SIDE), u.y]; }
    }
    if (!goal) {
      const free = CATS[k].stops.filter((s) => s !== m.goal && !others.some((o) => o.goal === s)
        && !this.heroes.some((u) => Math.hypot(u.x - s[0], u.y - s[1]) < 30));
      if (!free.length) { m.leg = { a: here, b: here, t0: now, t1: now + SIT(k, m.n) }; return false; }
      goal = free[hash(`chat${k}:${m.n}`) % free.length];
    }
    m.goal = goal;
    m.path = this.route(here, goal).slice(1);
    if (!m.path.length) return false;
    step(m.path.shift());
    return true;
  }

  /** Depth-sorted world elements: [{ z, el }]; heroes: this render's units (the cats keep them company). */
  things(night, phase, working, heroes) {
    this.heroes = heroes;
    const out = [];
    const n = night ? "-n" : "";
    const now = Date.now();
    const img = (kind, pose, face = "") => {
      const p = CREATURES[kind]?.[pose];
      return p ? image(`${CRE}/${kind}/${pose}${face}${n}.png`).absolute().left(-p.ax).top(-p.ay).w(p.w).h(p.h) : null;
    };

    // walkers
    for (const w of WALKERS) {
      if (!w.when(phase, working) || !CREATURES[w.id]) { this.walk.delete(w.id); continue; }
      let m = this.walk.get(w.id);
      if (!m) {
        const i = Math.floor(w.route.length / 2);
        m = { i, dir: 1, face: "", paused: true, leg: { a: w.route[i], b: w.route[i], t0: now, t1: now + 1500 } };
        this.walk.set(w.id, m);
      }
      const moving = m.leg.a !== m.leg.b && now < m.leg.t1;
      const [x, y] = m.leg.b;
      // the transition is always declared: GPUI only animates a change made after it exists, so a
      // transition added on the same render as the new target would just jump there
      const dur = moving ? Math.max(16, m.leg.t1 - now) : 16;
      const el0 = div().id(`pnj-${w.id}`).absolute().left(Math.round(x)).top(Math.round(y)).w(0).h(0)
        .transition("left", { duration: dur, easing: "linear" }).transition("top", { duration: dur, easing: "linear" });
      let el = el0;
      const body = div().absolute().left(0).top(0).w(0).h(0)
        .when(moving, (e) => e.loop("top", { from: 0, to: -2, period: 520 }))
        .child(moving ? unswap(img(w.id, "debout", m.face), 700) : img(w.id, "debout", m.face))
        .when(moving, (e) => e.child(swap(img(w.id, "pas", m.face), 700)));
      el = el.child(div().absolute().left(-12).top(-4).w(24).h(8).rounded_full().bg("#00000033")).child(body);
      if (w.lantern) {
        const lx = m.face ? 15 : -15;
        el = el.child(div().absolute().left(lx - 16).top(-46).size(32).rounded_full().bg("#ffb84a2e")
          .loop("opacity", { from: 0.5, to: 1, period: 900 }));
      }
      // depth from where the walker really is now (the tick redraws when that changes sides)
      const box = this.box(w.id, m, now);
      out.push({ z: box.fy + 3, el, box });
    }

    // hens by the barn (day only), pecking at their own pace
    if (day(phase)) {
      for (const [hx, hy, per] of HENS) {
        out.push({ z: hy + 3, el: div().absolute().left(hx).top(hy).w(0).h(0)
          .child(unswap(img("poule", "debout", hx % 2 ? "-g" : ""), per)).child(swap(img("poule", "picore", hx % 2 ? "-g" : ""), per)) });
      }
      // sparrows circling over the fields
      for (let k = 0; k < 3; k++) {
        const per = 6000 + k * 1300, cx0 = 180 + k * 40, cy0 = 150 + k * 18;
        out.push({ z: 0, el: div().absolute().left(cx0).top(cy0).w(0).h(0)
          .loop("left", { from: cx0 - 70, to: cx0 + 90, period: per })
          .loop("top", { from: cy0 - 16, to: cy0 + 14, period: per / 2.2 })
          .child(unswap(img("moineau", "vol1", k % 2 ? "-g" : ""), 300 + k * 30)).child(swap(img("moineau", "vol0", k % 2 ? "-g" : ""), 300 + k * 30)) });
      }
    }
    // the tavern cat
    out.push({ z: CAT[1] + 3, el: div().absolute().left(CAT[0]).top(CAT[1]).w(0).h(0).child(img("chat", "assis")) });
    // the roaming cats: the feet point glides along the leg (as the walkers'), bobbing while it walks
    this.cats.forEach((m, k) => {
      const moving = m.leg.a !== m.leg.b && now < m.leg.t1;
      const [x, y] = m.leg.b;
      const dur = moving ? Math.max(16, m.leg.t1 - now) : 16;
      const pose = moving ? "marche" : "assis";
      const el = div().id(`chat-${k}`).absolute().left(Math.round(x)).top(Math.round(y)).w(0).h(0)
        .transition("left", { duration: dur, easing: "linear" }).transition("top", { duration: dur, easing: "linear" })
        .child(div().absolute().left(0).top(0).w(0).h(0).when(moving, (e) => e.loop("top", { from: 0, to: -1, period: 300 }))
          .child(img("chat", pose, m.face)));
      const box = this.box("chat", m, now, pose);
      out.push({ z: box.fy + 3, el, box });
    });
    // the stag at dawn and dusk
    if (phase === "aube" || phase === "crepuscule") {
      out.push({ z: STAG[1] + 3, el: div().absolute().left(STAG[0]).top(STAG[1]).w(0).h(0)
        .child(unswap(img("cerf", "broute"), 9000)).child(swap(img("cerf", "alerte"), 9000)) });
    }
    // fish leaping: shown only near the top of the arc; a ring where it left the water
    for (const [fx, fy, per] of carte().id === "hiver" ? [] : FISH) {
      out.push({ z: fy, el: div().absolute().left(fx).top(fy).w(0).h(0)
        .child(div().absolute().left(-9).top(-3).w(18).h(6).rounded_full().border_1().border_color("#e6f6ffcc")
          .loop("opacity", { from: 1, to: -5, period: per, easing: "linear" }))
        .child(div().absolute().left(0).top(0).w(0).h(0).loop("top", { from: 6, to: -16, period: per, easing: "ease-out" })
          .loop("opacity", { from: -5, to: 1.4, period: per, easing: "linear" })
          .child(img("poisson", "saut"))) });
    }
    // the treasury: up to five coins, one per 20 % of account A's week left
    if (this.quota) {
      const coins = Math.max(0, Math.min(5, Math.ceil(this.quota.left / 20)));
      const [tx, ty] = TREASURY;
      out.push({ z: ty + 3, el: div().id("tresor").absolute().left(tx - 14).top(ty - 12 - coins * 3).w(28).h(14 + coins * 3)
        .tooltip(tr("treasury", this.quota.left))
        .children(Array.from({ length: coins }, (_, i) => image(`${ART}/res-or.svg`).absolute().left(i % 2 ? 9 : 5).top(coins * 3 - i * 3).w(14).h(12))) });
      // fair pennants over the square on the last day before the weekly reset
      const left = this.quota.resets - now;
      if (left > 0 && left < 24 * 3600e3) {
        const [[ax, ay], [bx, by]] = FAIR;
        const cols = ["#c8323a", "#e8c35a", "#3a6fc8", "#5aa04a"];
        const flags = Array.from({ length: 9 }, (_, i) => {
          const k = i / 8, x = ax + (bx - ax) * k, sag = Math.sin(Math.PI * k) * 14, y = ay + (by - ay) * k + sag;
          return svg(`${ART}/fanion.svg`).absolute().left(x - 5).top(y).w(10).h(14).text_color(cols[i % 4])
            .loop("top", { from: y, to: y + 2, period: 1600 + i * 90 });
        });
        out.push({ z: 0, el: div().id("foire").absolute().left(0).top(0).w(0).h(0)
          .child(div().absolute().left(ax).top(ay).w(bx - ax).h(1).bg("#3a2a1a").tooltip(tr("fair", timeLeft(this.quota.resets))))
          .children(flags) });
      }
    }
    return out;
  }
}
