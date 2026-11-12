// The command panel (left part of the bottom strip), drawn for place.js: a carved oak frame,
// "Map of Valbrume" (the shown map's name; the minimap from place.js, in a small iron frame, and the map and look switches under it), and
// "Selected unit": the focused hero full-length in a gold portrait frame, name, class,
// state gem, quest, and the Go / Next buttons. The isometric world itself stays in place.js.

import { div } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { run, home, readTextFile } from "herdr";
import { CLASSES, RACE_FR, QUEST, heroDesc, selectedAddress, reroll, champion, ART, CARTES, carte, changeCarte, look, changeLook, monde, nomCarte } from "./kit.js";
import { gradient } from "./kit.js";
import { t } from "./i18n.js";
import { P, frame, frameT, bar, pic, txt, title, button, gem, mark, portraitCard, well } from "./ui.js";

const TONE = { blocked: P.blocked, done: P.done, working: P.working, idle: P.idle, garde: P.guard };
export const MINI_INSET = 38; // the minimap is PANEL - 38 wide (frame 14 x 2 + iron frame 5 x 2)

function heading(text) {
  return div().relative().flex_none().h(30).children(bar("bandeau"))
    .child(div().absolute().left(24).right(24).top(0).bottom(0).flex().items_center().child(title(text, 16, P.goldHi)));
}

// ------------------------------------------------------------------ model and context
// The status line writes ~/.local/state/world-of-codecraft/<address>.status.json = {at (s), model, context_pct}
// (its own file, so it never races the activity hook). The selected hero's is polled into the store key
// `wocc.stat`, so the panel in place.js and the "commande" block both show it.

const STAT_POLL = 5000, STAT_STALE = 30 * 60e3;

// No busy flag: a module-level one stayed set when a read never resolved across a hot reload, and the poll
// stopped for good. Overlapping reads of this small file are harmless.
async function pollStat() {
  const address = selectedAddress(); // a shell has no status file: no stat
  let s = null;
  if (address) {
    try { s = JSON.parse((await readTextFile(`${home()}/.local/state/world-of-codecraft/${address}.status.json`)) ?? "null"); } catch { s = null; }
  }
  // and its subagents' context (the activity hook's subIds ctx), for its apprentices' bars on the card
  let act = null;
  if (s) { try { act = JSON.parse((await readTextFile(`${home()}/.local/state/world-of-codecraft/${address}.json`)) ?? "null"); } catch { act = null; } }
  const subs = Object.values(act?.subIds ?? {}).filter((v) => v && typeof v === "object" && Date.now() - (v.t ?? 0) < STAT_STALE)
    .sort((p, q) => (p.t0 ?? 0) - (q.t0 ?? 0)).slice(0, 4).map((v) => (typeof v.ctx === "number" ? v.ctx : null));
  const next = s ? { address, at: (s.at ?? 0) * 1e3, model: s.model ?? null, ctx: typeof s.context_pct === "number" ? Math.round(s.context_pct) : null, subs } : null;
  if (JSON.stringify(next) !== JSON.stringify(shared("wocc.stat") ?? null)) setShared("wocc.stat", next);
}

/** Starts polling the selected hero's model and context (call it from init): each poll is a task of the
 *  timer's own cx, so a reload stops the old build's polls and the new init starts its own. */
export function watchStat(cx) {
  cx.spawn(pollStat);
  cx.timer.every(STAT_POLL, (cx) => { cx.spawn(pollStat); });
}

/** The selected hero's {model, ctx} when its status file is fresh, else null. */
export function freshStat(address) {
  const s = shared("wocc.stat");
  return s && address && s.address === address && Date.now() - s.at <= STAT_STALE ? s : null;
}

/** "Opus 5.5 · HP 58%" for this hero (HP: its context window left, as its bar over its head, in the bar's colour),
 *  or null when there is no fresh status file. */
function statLine(a) {
  const s = freshStat(a.address);
  if (!s || (!s.model && s.ctx == null)) return null;
  const pv = s.ctx != null ? Math.max(0, 100 - s.ctx) : null;
  return h_flex().gap(6).items_center()
    .when(Boolean(s.model), (el) => el.child(txt(s.model, 14, P.parch, 700).truncate()))
    .when(pv !== null, (el) => el.child(txt(t("pv", pv), 14, couleurPv(pv), 800)));
}

/** The hero's HP on its card: a bar 110 x 8 in its colour (as the one over its head) and, for each apprentice, a thin
 *  one 22 x 3 (its subagent's HP; empty when its subagent has no ctx yet), or null with no fresh status file. */
function pvLigne(a) {
  const s = freshStat(a.address);
  if (!s || s.ctx == null) return null;
  const pv = Math.max(0, 100 - s.ctx);
  const barre = (id, v, w, h) => div().id(id).flex_none().w(w).h(h).bg("#1b1420").border_1().border_color("#000000")
    .when(v !== null, (el) => el.child(div().h_full().w(Math.round(((w - 2) * v) / 100)).bg(couleurPv(v))));
  return h_flex().gap(6).items_center()
    .child(barre("carte-pv", pv, 110, 8))
    .when((s.subs ?? []).length > 0, (el) => el.child(h_flex().gap(3).items_center()
      .children(s.subs.map((c, i) => barre(`carte-pv-${i}`, c === null ? null : Math.max(0, 100 - c), 22, 3)))));
}

function card(sel) {
  if (!sel) {
    return v_flex().flex_1().items_center().justify_center().gap(4)
      .child(txt(t("noUnit"), 16, P.muted, 700))
      .child(txt(t("clickHero"), 14, P.dim, 700));
  }
  const { a, h } = sel;
  const st = a.status;
  const word = QUEST[st]?.mot ?? t("onGuard");
  return h_flex().flex_1().min_h(0).gap(8).px(2).pt(4).items_start()
    .child(v_flex().flex_none().gap(4)
      // the champion's crown (today's boss slain by its subagent) on the frame, over its head
      .child(div().relative().child(portraitCard(h))
        .when(champion() === a.address, (el) => el.child(image(`${ART}/couronne.svg`).absolute().left(20).top(-7).w(26).h(18))))
      .when(!a.demoHero && !props()?.demo, (el) => el.child(button("race", txt(t("reroll"), 14, P.cream, 800), () => reroll(a.address, h.race), { w: 66, h: 24, tip: t("rerollTip") }))))
    .child(v_flex().flex_1().min_w(0).gap(3)
      .child(title(h.name, 19, P.goldHi).truncate())
      .child(txt(heroDesc(h), 15, P.cream, 700).truncate())
      .when(Boolean(statLine(a)), (el) => el.child(div().id("modele").tooltip(t("statTip")).child(statLine(a))))
      .when(Boolean(pvLigne(a)), (el) => el.child(pvLigne(a)))
      .child(txt(h.prog, 14, P.muted, 700).truncate())
      .child(h_flex().gap(4).items_center().child(mark(st) ?? gem(st, true)).child(txt(word, 15, TONE[st] ?? P.idle, 800)))
      .when(Boolean(a.tab_name), (el) => el.child(well(div().px(5).py(1).rounded(2), {}).child(txt(t("questTab", a.tab_name), 14, P.parch, 700).truncate())))
      .child(h_flex().gap(6).pt(4)
        .child(button("aller", txt(t("go"), 15, P.cream, 800), () => (a.guard ? run("pane.focus", { pane: a.pane }) : run("agent.focus", { terminal: a.address })), { tip: t("goTip") }))
        .child(button("suivant", [txt(t("next"), 15, P.cream, 800), pic("ic-suivant", 12, 10)], () => run("agent.next", {}), { tip: t("nextTip") }))));
}

/** A switch row: ‹ name ›, the arrows calling change(-1 / 1); with a single choice the arrows' places stay empty. */
function choix(id, nom, n, change, prevTip, nextTip) {
  const fleche = (k, c, d, tip) => (n > 1 ? button(`${id}-${k}`, txt(c, 16, P.cream, 800), () => change(d), { w: 28, h: 22, tip }) : div().flex_none().w(28).h(22));
  return h_flex().flex_none().mt(-4).gap(4).items_center()
    .child(fleche("prec", "‹", -1, prevTip))
    .child(div().flex_1().min_w(0).flex().justify_center().child(txt(nom, 15, P.cream, 800).truncate()))
    .child(fleche("suiv", "›", 1, nextTip));
}

/** The day's boss's red dot on a minimap (b = [x, y], WORLD, k its scale); [] = none. */
export function bossDot(b, WORLD, k) {
  if (!b) return [];
  const [x, y] = b;
  return [div().absolute().left((x - WORLD.x) * k - 3).top(Math.min(WORLD.h, Math.max(0, y)) * k - 4).size(6)
    .bg("#ff3048").border_1().border_color("#000000")];
}

/** The whole panel, `width` wide; `minimap` is place.js's minimap element. Under it the map switch (wocc.map) and the
 *  shown map's look switch (wocc.look), for every copy. */
export function commandPanel(width, minimap, sel) {
  const T = frameT("cadre");
  return div().id("commande").relative().flex_none().w(width).h_full().bg(P.leather)
      .child(gradient("#2b1e16", "#100b0a", 165))
    .child(v_flex().absolute().left(T).right(T).top(T).bottom(T).gap(6)
      .child(heading(t("map", nomCarte())))
      .child(div().relative().flex_none().self_start().p(5).bg("#0c0a0e").child(minimap).children(frame("fin")))
      .child(choix("carte", nomCarte(), CARTES.length, changeCarte, t("mapPrevTip"), t("mapNextTip")))
      .child(choix("look", t("looks")[look().nom], carte().looks.length, changeLook, t("lookPrevTip"), t("lookNextTip")))
      .child(heading(t("selected")))
      .child(card(sel)))
    .children(frame("cadre"));
}

// ------------------------------------------------------------------ the panel as its own block

import { image } from "gpui-kit";
import { agents, shared, setShared, props } from "herdr";
import { heroOf, guards, C as KC } from "./kit.js";
import { DEMO_SELECTED } from "./demo.js";
import { lieux } from "./lieux.js";
import { couleurPv } from "./activite.js";

const DOT = { blocked: KC.quest, done: KC.gold, working: "#7dff6a", idle: "#cfc8da", garde: "#9aa4b1" };

/** Role "commande" (immersive layout): the command panel beside the terminal, under the board. The village
 *  is another block, so the minimap reads its camera and units from the store (wocc.view, written by
 *  place.js) and a click asks it to move there (wocc.goto). */
export class Commande {
  init(_p, cx) { this.w = 262; watchStat(cx); }

  minimap() {
    const v = shared("wocc.view") ?? { cam: 0, vw: 1200, dots: [] }, { WORLD } = lieux();
    const mw = this.w - MINI_INSET, k = mw / WORLD.w, mh = Math.round(WORLD.h * k);
    return div().id("minicarte").relative().w(mw).h(mh).flex_none().cursor_pointer()
      .tooltip(t("mapTip"))
      .on_mouse_down("left", (e, cx) => {
        const lx = e.local_position?.x;
        if (typeof lx === "number") setShared("wocc.goto", { x: WORLD.x + (lx / mw) * WORLD.w, at: Date.now() });
        cx.stop_propagation();
      })
      .child(image(`${monde()}/minicarte.png`).absolute().left(0).top(0).w(mw).h(mh))
      .children((v.dots ?? []).map(([x, y, st]) => div().absolute().left((x - WORLD.x) * k - 2).top(Math.min(WORLD.h, Math.max(0, y)) * k - 3).size(4)
        .bg(DOT[st] ?? "#ffffff").border_1().border_color("#000000")))
      .children(bossDot(v.boss, WORLD, k)) // the day's boss (place.js)
      .child(div().absolute().left(((v.cam - WORLD.x) / WORLD.w) * mw).top(0).w((v.vw / WORLD.w) * mw).h(mh).border_1().border_color("#ffffff"));
  }

  /** The selected unit, as place.js picks it: the focused shell when it is a guard, else the focused agent. */
  selected() {
    if (props()?.demo) return { a: DEMO_SELECTED, h: heroOf(DEMO_SELECTED.address, DEMO_SELECTED.program) };
    const want = selectedAddress();
    const a = agents().find((x) => x.address === want)
      ?? guards().map((p) => ({ address: p.terminal, pane: p.pane, guard: true, status: "garde", program: p.program, tab_name: p.title, focused: p.focused })).find((x) => x.address === want);
    return a ? { a, h: heroOf(a.address, a.program) } : null;
  }

  render() {
    return div().id("commande-bloc").size_full()
      .on_size_change((s, cx) => { if (Math.abs(s.width - this.w) > 2) { this.w = s.width; cx.notify(); } })
      .child(commandPanel(this.w, this.minimap(), this.selected()));
  }
}
