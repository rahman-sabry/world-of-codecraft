// World of Codecraft (village of Valbrume): shared bits of the mod. Palette, fonts, the hero
// every agent becomes (race from its address, class from its program), the
// hour of the day, the daily raid boss, the Claude quota fountains, and small wood/iron/parchment parts.

import { div, image, svg, PathBuilder, Background } from "gpui-kit";
import { h_flex } from "gpui-base";
import { home, readTextFile, panes, focused, agents, shared, setShared } from "herdr";
import { t, tbl } from "./i18n.js";
import { VALBRUME } from "./carte-valbrume.js";
import { PORT } from "./carte-port.js";

export const ART = "mods/world-of-codecraft/art";
export const TITLE = "Cinzel"; // Roman capitals, headings only (fonts/, OFL)
export const UI = "Alegreya Sans"; // sturdy humanist text, everything else (fonts/, OFL)

// The maps (layouts: their data modules, carte-*.js, read through lieux.js), each with one or more looks baked into
// their own folders of art/ (tools/bake_*.py, THEME=hiver for the winter one). The shown map is the store key wocc.map,
// its look wocc.look, kept across restarts.
export const CARTES = [VALBRUME, PORT];
/** The shown map (its data module's record). */
export const carte = () => CARTES.find((c) => c.id === shared("wocc.map")) ?? CARTES[0];
/** The shown map's name in the current language ("Valbrume", "Port-Salin"): the top bar, the panel, the chronicle. */
export const nomCarte = () => t("maps")[carte().nom];
/** The shown look of the shown map: { id, nom, dossier, neige, poissons, fond }. Before looks, wocc.map "hiver" was
 *  Valbrume in winter: it still reads so until a look is picked. */
export function look() {
  const { looks } = carte(), id = shared("wocc.look") ?? (shared("wocc.map") === "hiver" ? "hiver" : null);
  return looks.find((l) => l.id === id) ?? looks[0];
}
/** The folder of the shown look's world images (tiles, bands, front cut-outs, minimap). */
export const monde = () => `${ART}/${look().dossier}`;
/** Shows the next map (d = 1) or the previous one (d = -1), in the same look when it has one of that id. */
export function changeCarte(d) {
  setShared("wocc.look", look().id);
  setShared("wocc.map", CARTES[(CARTES.indexOf(carte()) + d + CARTES.length) % CARTES.length].id);
}
/** Shows the shown map's next look (d = 1) or the previous one (d = -1). */
export function changeLook(d) {
  const c = carte(), L = c.looks, next = L[(L.indexOf(look()) + d + L.length) % L.length].id;
  setShared("wocc.map", c.id);
  setShared("wocc.look", next);
}

export const C = {
  wood: "#7a4e2a", woodLight: "#a8693a", woodPale: "#c98b52", woodDark: "#4a2e17", woodInk: "#2a1a0e",
  iron: "#3b3542", ironLight: "#6b6574", rivet: "#9a93a3",
  parch: "#efe2bf", parchDark: "#d9c697", ink: "#2e2016", inkSoft: "#6a5034",
  gold: "#e8c35a", goldLight: "#ffe9a0", quest: "#ffd23f", wax: "#a3242e",
  slate: "#16171c", stone: "#8d8a93", cobble: "#5d5866", cobbleLight: "#77717f", cobbleDark: "#45414d",
  water: "#4aa8e8", waterLight: "#a8dcff", mana: "#8a7bff",
  cream: "#fbf6e8", night: "#0b1030",
};

const RECT = () => PathBuilder.fill().move_to("0%", "0%").line_to("100%", "0%").line_to("100%", "100%").line_to("0%", "100%").close().build();
/** A layer filling its relative parent with a linear gradient (180 = top to bottom). */
export function gradient(from, to, angle = 180) {
  return globalThis.window.paint_path(RECT(), Background.linear_gradient(angle, from, to)).absolute().top(0).left(0).size_full();
}

export function hash(s) {
  let h = 2166136261;
  for (const ch of String(s)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  h ^= h >>> 16; h = Math.imul(h, 0x7feb352d); h ^= h >>> 15; h = Math.imul(h, 0x846ca68b); h ^= h >>> 16;
  return h >>> 0;
}

/** Walk anim for a step: towards the viewer = walk_dl (mirrored: walk_dr), away = walk_ur (walk_ul). */
export const walkAnim = (dx, dy) => (dy > 0 || (dy === 0 && dx < 0) ? (dx <= 0 ? "walk_dl" : "walk_dr") : (dx >= 0 ? "walk_ur" : "walk_ul"));

export function clip(s, n) {
  s = String(s ?? "");
  return s.length > n ? s.slice(0, Math.max(1, n - 1)) + "…" : s;
}

export function folder(cwd) {
  if (!cwd) return "";
  const h = home();
  return cwd === h ? "~" : cwd.startsWith(h + "/") ? "~" + cwd.slice(h.length) : cwd;
}

// ------------------------------------------------------------------ heroes

export const RACES = ["elfe", "orque", "humain", "mort-vivant", "nain"];
// Display names in the current language (the keys stay as the art file names use them).
export const RACE_FR = tbl("race");
const NAMES = {
  elfe: ["Aelith", "Sylvarin", "Elowen", "Thalindra", "Faelar", "Liriel", "Ithrandë"],
  orque: ["Grokka", "Murzag", "Ushna", "Thrakk", "Bolgra", "Zugor", "Krasha"],
  humain: ["Aldric", "Maëlle", "Gauvain", "Isolde", "Bertrand", "Ysaline", "Tancrède"],
  "mort-vivant": ["Morvane", "Ossian", "Cendrine", "Lugubre", "Sépulcrin", "Vespérine", "Fanel"],
  nain: ["Durgan", "Helga", "Ostrik", "Brunna", "Gromdal", "Barbefer", "Kordi"],
};

export const CLASSES = {
  mage: { get nom() { return t("cls").mage; }, bat: "tour", item: "baton" },
  artificier: { get nom() { return t("cls").artificier; }, bat: "atelier", item: "cle" },
  guerrier: { get nom() { return t("cls").guerrier; }, bat: "caserne", item: "marteau" },
  pretre: { get nom() { return t("cls").pretre; }, bat: "temple", item: "relique" },
  rodeur: { get nom() { return t("cls").rodeur; }, bat: "grange", item: "arc" },
  voleur: { get nom() { return t("cls").voleur; }, bat: "etal1", item: "dague" },
};

/** The class a terminal plays: shells are warriors (the guards); every agent, whatever its program, any class, from a
 *  hash of its terminal address (other bits than the race's and the name's). */
export function classOf(program, h = 0) {
  const k = String(program?.key ?? "").toLowerCase();
  if (program?.shell || k === "shell") return "guerrier";
  const cls = Object.keys(CLASSES);
  return cls[(h >>> 9) % cls.length];
}

/** Everything that makes a terminal a villager-hero, stable for its address. */
export function heroOf(address, program) {
  const h = hash(address);
  const race = shared(RACE_PICKS)?.[address] ?? RACES[h % RACES.length];
  const cls = classOf(program, h);
  const list = NAMES[race];
  const name = list[(h >>> 5) % list.length];
  return { race, cls, name, prog: program?.name ?? "agent", sprite: `${ART}/h-${race}-${cls}`, item: CLASSES[cls].item };
}

/** Races picked with the unit card's « Race » button, by terminal address (the class stays). */
const RACE_PICKS = "wocc.races";

/** Gives this unit another race at random and forgets the picks of terminals that are gone. */
export function reroll(address, current) {
  const others = RACES.filter((r) => r !== current);
  const alive = new Set([...agents().map((a) => a.address), ...guards().map((p) => p.terminal)]);
  const picks = Object.fromEntries(Object.entries(shared(RACE_PICKS) ?? {}).filter(([k]) => alive.has(k)));
  picks[address] = others[Math.floor(Math.random() * others.length)];
  setShared(RACE_PICKS, picks);
}

/** "Orc mage" / "mage orque". */
export const heroDesc = (h) => t("hero", RACE_FR[h.race], CLASSES[h.cls].nom);
export const heroTitle = (h) => `${h.name}, ${heroDesc(h)}`;

/** Per state: `mot` (the short word) and `fr` (the chronicle verb), in the current language. */
export const QUEST = tbl("quest");

/** Shell terminals (not agents) of every tab: the warriors on guard at the forge. */
export function guards() {
  return panes().filter((p) => p.terminal && !p.status && p.program?.shell);
}

/** The selected unit's address: the focused pane's shell when it is a guard (focused().agent never goes null,
 *  it falls back to an agent), else the focused agent. */
export function selectedAddress() {
  const f = focused();
  return guards().some((p) => p.terminal === f?.terminal) ? f.terminal : f?.agent ?? f?.terminal;
}

// ------------------------------------------------------------------ time

const HOURS = [0, 5, 8, 12, 14, 18, 21]; // Matins, Lauds, Terce, Sext, None, Vespers, Compline
export function hourName(d) {
  const h = d.getHours();
  let n = 0;
  HOURS.forEach((at, i) => { if (h >= at) n = i; });
  return t("hours")[n];
}

/** The sky's phase and colors for a time. */
export function sky(d) {
  const h = d.getHours() + d.getMinutes() / 60;
  if (h >= 5 && h < 8) return { phase: "aube", top: "#3a3a72", bottom: "#f2a36b", dark: 0.22 };
  if (h >= 8 && h < 18) return { phase: "jour", top: "#5aa6e0", bottom: "#cfeaf6", dark: 0 };
  if (h >= 18 && h < 21) return { phase: "crepuscule", top: "#2e2462", bottom: "#ee8456", dark: 0.25 };
  return { phase: "nuit", top: "#070a20", bottom: "#1d2452", dark: 0.48 };
}
export const isNight = (d) => sky(d).phase !== "jour";

export const hhmm = (d) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

// ------------------------------------------------------------------ the daily raid boss
// One boss a day (local midnight), its HP shared by every hero's raid: each successful subagent tool call (the hook's
// subCoups) is 1 damage. Only the shown, live village writes these keys (Activites.degats).

/** Raised from 300 (calibrated on a median 390 / mean 496 successful subagent tool calls per weekday) once raids
 *  gathered every hero on one boss. */
export const BOSS_HP = 1000;
export const BOSS = "wocc.boss"; // { day, hp, max, slain, slainAt, by (the slayer's terminal address), heros ({ name, race, cls } of its hero then), avant (wocc.trophees before the kill), espece (set by a reset; else the date's, especeBoss) }
export const TROPHEES = "wocc.trophees"; // { total (bosses slain), streak (consecutive days with a kill), lastDay }
/** The raid boss's species, rotating by date, and each one's names. */
export const ESPECES = ["troll", "golem", "spectre", "gobelin"];
const NOMS = {
  troll: ["Gruntak", "Morgrul", "Skarn", "Brokk", "Ughlar", "Thargol", "Vruuk", "Hobrak", "Dolgrim", "Krummok"],
  golem: ["Brazzik", "Korrund", "Ferrox", "Gharnak", "Ulmbrass", "Tolvek", "Rivok", "Durnhal"],
  spectre: ["Morvhal", "Velthis", "Hollvar", "Nharrok", "Sevrin", "Ombreth", "Grisdan", "Vaelor"],
  gobelin: ["Snikrit", "Grubbek", "Zagnut", "Ritzak", "Skabble", "Nogwig", "Krikkit", "Vexnip"],
};
/** Streak tiers: the boss is Elite while a 3-day streak is at stake, Legendary from 7; their colours. */
export const PALIERS = [null, "#b07bff", "#ff9a2e"];
const deux = (n) => String(n).padStart(2, "0");
/** The local date of d, "2026-11-11": the boss's day. */
export const jour = (d) => `${d.getFullYear()}-${deux(d.getMonth() + 1)}-${deux(d.getDate())}`;
/** The day before a day. */
export const veille = (day) => { const [y, m, d] = day.split("-").map(Number); return jour(new Date(y, m - 1, d - 1)); };
/** The next local midnight after d (ms): the next boss. */
export const minuit = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime();
/** Today's boss as stored, or a fresh one at full HP when the stored one is another day's (or none yet). A standing
 *  record from a lower BOSS_HP reads lifted to it, the damage done kept (the village's degats writes it back). */
export function bossDuJour(d = new Date()) {
  const day = jour(d), b = shared(BOSS);
  if (b?.day !== day) return { day, hp: BOSS_HP, max: BOSS_HP, slain: false };
  return !b.slain && b.max < BOSS_HP ? { ...b, hp: BOSS_HP - (b.max - b.hp), max: BOSS_HP } : b;
}
/** The reset (the top bar's boss plaque): today's boss back to full HP, not slain, of another species; a kill today is undone in the
 *  trophies, to the record stored with it (avant), else derived: total - 1, and the streak - 1 ending yesterday when it
 *  was 2+, else none (a streak of 1 began today: whatever came before it was already broken). */
export function remiseBoss(d = new Date()) {
  const day = jour(d), b = shared(BOSS);
  if (b?.day === day && b.slain) {
    const T = shared(TROPHEES) ?? {}, s = (T.streak ?? 1) - 1;
    setShared(TROPHEES, b.avant ?? { total: Math.max(0, (T.total ?? 1) - 1), streak: Math.max(0, s), lastDay: s > 0 ? veille(day) : null });
  }
  // another species than the one it was, picked at random (espece reads it)
  const autres = ESPECES.filter((x) => x !== espece(day));
  setShared(BOSS, { day, hp: BOSS_HP, max: BOSS_HP, slain: false, espece: autres[Math.floor(Math.random() * autres.length)] });
}
/** The day's default boss species (a hash of the date). */
export const especeBoss = (day) => ESPECES[hash(`${day}:espece`) % ESPECES.length];
/** The day's boss species, what every consumer reads: the one a reset stored in today's record (espece), else the
 *  date's (especeBoss). */
export function espece(day) {
  const b = shared(BOSS);
  return (b?.day === day && b.espece) || especeBoss(day);
}
/** The streak a day's boss puts at stake: the one alive when the day began (a kill that day already counts in it). */
export function serieEnJeu(day) {
  const T = shared(TROPHEES) ?? {};
  return T.lastDay === day ? Math.max(0, (T.streak ?? 1) - 1) : T.lastDay === veille(day) ? T.streak ?? 0 : 0;
}
/** The day's boss tier: 0, 1 (Elite, streak 3+ at stake) or 2 (Legendary, 7+). */
export const palier = (day) => { const s = serieEnJeu(day); return s >= 7 ? 2 : s >= 3 ? 1 : 0; };
/** The day's boss name, "Gruntak the Mossback" / "Gruntak le Moussu", with its tier (a hash of the date). */
export function nomBoss(day, p = palier(day)) {
  const sp = espece(day), noms = NOMS[sp], ep = t("epithets")[sp];
  return t("bossName", noms[hash(day) % noms.length], ep[hash(`${day}:epithete`) % ep.length], p);
}
/** The terminal whose subagent slew today's boss: its hero wears the crown until midnight (null = none). */
export const champion = (d = new Date()) => { const b = bossDuJour(d); return b.slain ? b.by ?? null : null; };
/** Bosses slain, and the streak still alive (its last kill today or yesterday, else 0). */
export function trophees(d = new Date()) {
  const T = shared(TROPHEES) ?? {}, day = jour(d);
  return { total: T.total ?? 0, streak: T.lastDay === day || T.lastDay === veille(day) ? T.streak ?? 0 : 0 };
}
/** Trophy banners on the town hall: one once a boss is slain, a second from a 3-day streak, a third from 7. */
export const bannieres = (d = new Date()) => { const T = trophees(d); return T.total ? 1 + (T.streak >= 3) + (T.streak >= 7) : 0; };

// ------------------------------------------------------------------ quotas
// Claude accounts A and B, read only from the files the local poller writes.

const STALE = 30 * 60e3;
async function readQuota(acc) {
  try {
    const q = JSON.parse((await readTextFile(`${home()}/.local/state/claude-duo/quota-${acc}.json`)) ?? "null");
    if (!q?.rate_limits) return { acc, missing: true };
    const pick = (k) => {
      const w = q.rate_limits[k];
      return typeof w?.used_percentage === "number" ? { used: Math.round(w.used_percentage), resets: (w.resets_at ?? 0) * 1e3 } : null;
    };
    return { acc, at: q.at * 1e3, stale: Date.now() - q.at * 1e3 > STALE, week: pick("seven_day"), five: pick("five_hour") };
  } catch {
    return { acc, missing: true };
  }
}
export const readQuotas = () => Promise.all([readQuota("A"), readQuota("B")]);

/** "4d 12h" (FR "4j 12h"), "3h 05", "12 min". */
export function left(ms) {
  const d = ms - Date.now();
  if (!ms || d <= 0) return "";
  const m = Math.floor(d / 60e3), h = Math.floor(m / 60);
  if (h >= 48) return `${Math.floor(h / 24)}${t("days")} ${h % 24}h`;
  if (h >= 1) return `${h}h ${String(m % 60).padStart(2, "0")}`;
  return `${m} min`;
}

// ------------------------------------------------------------------ parts

/** An iron rivet. */
export const rivet = (s = 4) => div().size(s).flex_none().bg(C.rivet).border_1().border_color(C.iron).rounded(1);

/** A tinted pixel icon from art/ic-*.svg. */
export const icon = (name, color, w = 13) => {
  const el = svg(`${ART}/ic-${name}.svg`).w(w).h(Math.round((w * 7) / 9)).flex_none();
  return color ? el.text_color(color) : el;
};

/** A heraldic pennant: tinted cloth with a charge on it. */
export function pennant(color, charge, s = 2) {
  return div().relative().w(10 * s).h(14 * s).flex_none()
    .child(svg(`${ART}/fanion.svg`).absolute().left(0).top(0).w(10 * s).h(14 * s).text_color(color))
    .child(svg(`${ART}/blason-${charge}.svg`).absolute().left(Math.round(1.5 * s)).top(2 * s).w(7 * s).h(7 * s).text_color(C.goldLight));
}

const COLORS = ["#7a1f2b", "#2f4a7a", "#2f6b4a", "#6b3a8a", "#8a5a1f", "#1f6b6b", "#8a2f5a", "#4a5a2f"];
const CHARGES = ["etoile", "lune", "tour", "cle", "chene", "coupe", "epee", "soleil"];
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

/** A space as a district: its colors, charge and name. */
export function district(sp) {
  const h = hash(sp.id);
  const raw = String(sp.name ?? "");
  const nom = raw === "~" ? t("home") : raw.replace(/^~\//, "").split("/").pop();
  return {
    color: COLORS[h % COLORS.length],
    charge: CHARGES[(h >>> 4) % CHARGES.length],
    num: ROMAN[(sp.index ?? 1) - 1] ?? String(sp.index),
    nom,
    titre: t("district", ROMAN[(sp.index ?? 1) - 1] ?? sp.index, nom),
  };
}

/** A small status sign drawn natively: "!" flashing, "?" glowing, dots for work. */
export function questMark(st, size = 14) {
  if (st === "blocked") return image(`${ART}/mark-quete.svg`).w(size * 0.5).h(size).flex_none().loop("opacity", { from: 0.25, to: 1, period: 520 });
  if (st === "done") return image(`${ART}/mark-rendu.svg`).w(size * 0.64).h(size).flex_none().loop("opacity", { from: 0.6, to: 1, period: 1400 });
  if (st === "working") return div().w(18).flex_none().font_family(UI).text_size(size).text_color("#8fd16a").frames(["·  ", "·· ", "···", " ··", "  ·", "   "], 240);
  return null;
}

/** A hero's little portrait (stand sprite) for lists. */
export const portrait = (hero, h = 24, sit = false) =>
  image(`${hero.sprite}${sit ? "-assis" : ""}.svg`).w(Math.round((h * 18) / 27)).h(h).flex_none();

export const stop = (_e, cx) => cx.stop_propagation();
