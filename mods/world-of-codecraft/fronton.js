// The pediment (top bar, window drag): a carved oak beam with iron straps and a gold bead.
// Left, the crest and title in a gold cartouche. Then ornate plaques, strategy-game
// style: Gold = Claude account A, Wood = account B (left this week, the 5-hour window under
// it), Heroes = agents at work / in the village, Fair = the next weekly reset.
// Gold, Wood and Fair are an optional cduo integration: they only appear when the quota
// files exist (see readQuotas in kit.js); without them the header shows Heroes only. In the middle,
// the district's banner and a parchment scroll with the district and quest. On the right,
// the waiting-heroes button (click: go to the next one), then the hour plaque. After Heroes, today's raid boss (its HP,
// slain in gold) and the trophies (bosses slain, daily streak), the trophies only when the bar has room for them.

import { div, image, svg } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { spaces, agents, run, props, layout, nextCommand, window as appWindow } from "herdr";
import { freshStat } from "./commande.js";
import { VILLAGE, ART, district, clip, heroOf, heroTitle, hourName, hhmm, isNight, readQuotas, left, selectedAddress, bossDuJour, nomBoss, trophees, minuit, especeBoss, palier, serieEnJeu, PALIERS } from "./kit.js";
import { CREATURES } from "./creatures-data.js";
import { P, DECO, TEXTE, bar, pic, txt, button, mark, banner } from "./ui.js";
import { DEMO_SPACES } from "./demo.js";
import { t, detectLang } from "./i18n.js";

// Immersive mode lives in the one layout: the big village (place-immersion) and the command panel
// (commande) are shown, the bottom village (place) hidden, and the terminal (arene) shrinks to 400 px.
// These are layout clicks, so the mode survives restarts.
const node = (n, id) => (!n || typeof n !== "object" ? null : n.id === id ? n : (n.children ?? []).map((c) => node(c, id)).find(Boolean) ?? null);
export function immersive() {
  try { const n = node(layout(), "place-immersion"); return Boolean(n && !n.hidden); } catch { return false; }
}
function setMode(on) {
  run(on ? "layout.show" : "layout.hide", { id: "place-immersion" });
  run(on ? "layout.show" : "layout.hide", { id: "commande" });
  run(on ? "layout.hide" : "layout.show", { id: "place" });
  run("layout.resize", on ? { id: "arene", px: 400 } : { id: "arene", weight: 1 });
}

const PW = 136; // plaque width

export default class Fronton {
  init(_p, cx) {
    detectLang(cx); // the system language, shared with every copy of the mod
    this.now = new Date();
    this.q = [];
    const tick = (cx) => {
      this.now = new Date();
      cx.spawn(async (cx) => { this.q = await readQuotas(); cx.notify(); });
    };
    tick(cx);
    cx.timer.every(60_000, tick);
    // ctrl-shift-i (KEYS.json): "world-of-codecraft.mode"
    cx.spawn(async (cx) => { for (;;) { if ((await nextCommand()) === "mode") { setMode(!immersive()); cx.notify(); } } });
  }

  /** An ornate plaque: icon in its gold socket, the value (red when warn, else in its tone), a caption. */
  plaque(id, icon, main, sub, tip, warn, tone = P.cream) {
    return div().id(id).relative().flex_none().w(PW).h(40).tooltip(tip)
      .child(pic("plaque", PW, 40).absolute().left(0).top(0))
      .child(div().absolute().left(4).top(4).w(32).h(32).flex().items_center().justify_center().child(icon))
      .child(v_flex().absolute().left(42).top(4).bottom(4).right(8).justify_center().gap(0)
        .child(txt(main, 18, warn ? P.blocked : tone, 800).line_height(1.05))
        .when(Boolean(sub), (el) => el.child(txt(sub, 13, P.muted, 700).line_height(1.05).truncate())));
  }

  quota(acc, label, icon) {
    const q = this.q.find((x) => x.acc === acc) ?? { missing: true };
    if (q.missing || !q.week) return null; // no quota file: no plaque at all
    const rem = Math.max(0, 100 - q.week.used);
    const five = q.five ? t("five", 100 - q.five.used) : t("account", acc);
    const tip = t("quotaTip", label, acc, rem, left(q.week.resets) || "?", q.five ? 100 - q.five.used : null, q.five?.resets ? left(q.five.resets) : "", q.stale);
    return this.plaque(`res-${acc}`, icon, `${t("pct", rem)}${q.stale ? " ?" : ""}`, five, tip, rem <= 20);
  }

  /** The selected hero's context window: a mana gauge filling up, the %, and the model. Hidden without a fresh
   *  status file (see watchStat in commande.js). */
  contexte() {
    const s = freshStat(selectedAddress()); // none for a warrior (shell)
    if (!s || s.ctx == null) return null;
    const pct = Math.max(0, Math.min(100, s.ctx));
    const gauge = div().relative().w(12).h(26).bg("#0c0a0e").border_1().border_color(P.goldLo).rounded(2).overflow_hidden()
      .child(div().absolute().left(0).right(0).bottom(0).h(Math.round((24 * pct) / 100)).bg(pct >= 80 ? P.blocked : "#5f8fe8"));
    return this.plaque("res-contexte", gauge, t("pct", pct), s.model ? `${t("context")} · ${s.model}` : t("context"), t("contextTip", pct, s.model), pct >= 80);
  }

  /** Today's raid boss: its species (slain: felled), its HP (slain: in gold), its tier and name (an Elite or Legendary
   *  boss's HP in its tier's colour); the tooltip says the tier, who slew it, when the next one comes, and gives the
   *  trophies when their plaque has no room (more). */
  boss(more) {
    const b = bossDuJour(this.now), p = palier(b.day), nom = nomBoss(b.day, p), reset = left(minuit(this.now)) || "?";
    const by = !b.slain ? null : b.heros ? heroTitle(b.heros)
      : b.by ? heroTitle(heroOf(b.by, agents().find((a) => a.address === b.by)?.program ?? { key: "claude" })) : null;
    const tip = (b.slain ? t("bossSlainTip", nom, by, reset) : t("bossTip", nom, b.hp, b.max, reset))
      + (p ? `\n${t("tierTip", p, serieEnJeu(b.day))}` : "") + (more ? `\n\n${more}` : "");
    const sp = especeBoss(b.day), pose = b.slain ? "touche" : "pret", D = CREATURES[sp][pose], k = Math.min(32 / D.w, 28 / D.h);
    const bete = image(`${ART}/creatures/${sp}/${pose}.png`).w(Math.round(D.w * k)).h(Math.round(D.h * k)).flex_none();
    return this.plaque("res-boss", bete, b.slain ? t("slain") : t("hp", b.hp, b.max), p ? `${t("tiers")[p]} · ${nomBoss(b.day, 0)}` : nom, tip, false,
      b.slain ? P.goldHi : PALIERS[p] ?? P.cream);
  }

  /** The immersive-mode switch: swaps the village (big) and the terminal (below), in the same layout. */
  mode() {
    const on = immersive();
    return button("mode", txt(on ? t("workshop") : t("immersion"), 16, P.cream, 800),
      () => setMode(!on),
      { h: 28, tip: on ? t("workshopTip") : t("immersionTip") });
  }

  render(_cx) {
    const sp = (props()?.demo ? DEMO_SPACES : spaces()).find((s) => s.active);
    const tab = sp?.tabs.find((t) => t.active);
    const d = sp ? district(sp) : null;
    const all = agents();
    const blocked = all.filter((a) => a.status === "blocked");
    const done = all.filter((a) => a.status === "done");
    const busy = all.filter((a) => a.status === "working").length;
    const win = appWindow();
    const mac = (win?.platform ?? "macos") === "macos" && !win?.fullscreen;
    const night = isNight(this.now);
    const resets = this.q.map((q) => q.week?.resets).filter(Boolean);
    const fair = resets.length ? left(Math.min(...resets)) : "";
    const gold = this.quota("A", t("gold"), pic("ic-or", 32, 24));
    const wood = this.quota("B", t("wood"), pic("ic-bois", 36, 28));
    const contexte = this.contexte();
    const tro = trophees(this.now);
    const troTip = t("trophyTip", tro.total, tro.streak);

    const waiting = blocked.length ? blocked : done;
    let alert = null, alertText = "";
    if (waiting.length) {
      const isB = blocked.length > 0;
      const h = heroOf(waiting[0].address, waiting[0].program);
      alertText = waiting.length > 1 ? t("waitingMany", waiting.length, isB) : t("waitingOne", h.name, isB);
      alert = button("alerte", [
        mark(isB ? "blocked" : "done"),
        txt(alertText, 16, isB ? P.goldHi : P.cream, 800),
      ], () => run("agent.focus", { terminal: waiting[0].address }), {
        face: isB ? "or" : "", h: 28,
        tip: t("waitingTip", heroTitle(h), isB),
      });
    }

    // the boss and trophy plaques only when the bar has room for them beside everything else (an estimate of the
    // fixed widths): the trophies go first, their tooltip then joins the boss's
    const modeW = (immersive() ? t("workshop") : t("immersion")).length * 9 + 24;
    const alertW = alert ? alertText.length * 9 + 41 : 0;
    const plaques = 1 + [gold, wood, contexte, resets.length > 0].filter(Boolean).length; // Heroes always
    const kids = 4 + plaques + (alert ? 1 : 0); // cartouche, plaques, scroll, alert, mode, hour
    const base = (mac ? 84 : 10) + 10 + 284 + plaques * PW + alertW + modeW + 170 + 8 * (kids - 1);
    const fits = (n) => !this.w || base + n * (PW + 8) <= this.w;
    const room = fits(2);

    // the district's banner and the parchment scroll (flat vellum behind the text)
    const scroll = d && h_flex().id("rouleau").tooltip(`${d.titre}${tab ? `\n${t("questTab", tab.name)}` : ""}`).flex_shrink(1).min_w(0).max_w(620).h(44).gap(4).items_center()
      .child(div().flex_none().h(40).mt(2).child(banner(d)))
      .child(div().relative().flex_shrink(1).min_w(0).h(34).pl(16).pr(16).flex().items_center().overflow_hidden()
        .children(bar("rouleau"))
        .child(h_flex().relative().min_w(0).gap(8).items_center()
          .child(txt(tab ? d.num : `${d.num} · ${d.nom}`, 16, P.ink2, 800).flex_none())
          .when(Boolean(tab), (e) => e
            .child(txt("›", 16, P.inkSoft, 800).flex_none())
            .child(txt(clip(tab.name, 44), 16, P.wax, 800).min_w(0).truncate()))));

    const hour = div().id("heure").relative().flex_none().w(170).h(40)
      .tooltip(t("hourTip", hourName(this.now), night))
      .child(pic("plaque-l", 170, 40).absolute().left(0).top(0))
      .child(div().absolute().left(10).top(10).child(pic(night ? "ic-lune" : "ic-soleil", 20, 20)))
      .child(h_flex().absolute().left(42).right(10).top(0).bottom(0).items_center().justify_between()
        .child(txt(hourName(this.now), 16, P.parch, 700))
        .child(txt(hhmm(this.now), 20, P.goldHi, 800)));

    return div().id("fronton").size_full().relative().overflow_hidden().bg(P.well)
      .on_size_change((sz, cx) => { if (sz.width !== this.w) { this.w = sz.width; cx.notify(); } })
      .children(bar("poutre"))
      .child(h_flex().absolute().left(mac ? 84 : 10).right(10).top(0).h(44).gap(8).items_center()
        // crest and title in their cartouche
        .child(div().relative().flex_none().w(284).h(42)
          .child(pic("cartouche", 284, 42).absolute().left(0).top(0))
          .child(div().absolute().left(10).top(3).child(pic("blason", 30, 36)))
          .child(v_flex().absolute().left(46).top(0).bottom(0).justify_center()
            .child(div().font_family(DECO).font_weight(700).text_size(17).line_height(1.1).text_color(P.goldHi).child("World of Codecraft"))
            .child(txt(t("villageOf", VILLAGE), 13, P.muted, 700).line_height(1.1))))
        .when(Boolean(gold), (el) => el.child(gold))
        .when(Boolean(wood), (el) => el.child(wood))
        .child(this.plaque("res-heros", pic("ic-heros", 26, 22), `${busy} / ${all.length}`, t("heroesAtWork"), t("heroesTip", busy, all.length)))
        .when(Boolean(contexte), (el) => el.child(contexte))
        .when(resets.length > 0, (el) => el.child(this.plaque("res-foire", pic("ic-sablier", 22, 28), fair || "—", t("untilFair"), t("fairTip"))))
        .when(fits(1), (el) => el.child(this.boss(room ? null : troTip)))
        .when(room, (el) => el.child(this.plaque("res-trophees", svg(`${ART}/blason-coupe.svg`).w(21).h(21).flex_none().text_color(P.goldHi), t("slainN", tro.total), t("streak", tro.streak), troTip, false, tro.total ? P.goldHi : P.cream)))
        .child(div().flex_1().min_w(0).flex().justify_center().when(Boolean(scroll), (el) => el.child(scroll)))
        .when(Boolean(alert), (el) => el.child(alert))
        .child(this.mode())
        .child(hour));
  }
}
