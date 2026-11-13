// The calendar: your next meetings, from the macOS Calendar app (every calendar synced into it, Google included), read by
// a small EventKit helper (tools/agenda, installed at ~/.local/share/world-of-codecraft/agenda). It is run once at
// start and every 3 min, never per frame, through herdr-core (`hc exec`): macOS then asks Herdr Core for the calendar,
// which has the calendar usage description (Herdr.app, which runs a mod's exec, has none and is refused unasked); its answer stays in memory only (titles are never stored). Missing helper,
// denied access or bad output: no meetings (the plaque, the bell and the gathering stay hidden). fronton.js shows the
// countdown, place.js rings the town bell and gathers the idle heroes PREAVIS before a meeting.

import { exec, hc, home } from "herdr";

const POLL = 3 * 60_000;
const PRES = 60_000; // two readers (the top bar, the village) share one run within this
export const PREAVIS = 2 * 60_000; // the bell rings and the idle heroes gather this long before a meeting
// the only links ever opened: a Google Meet room, passed to `open` as an argument (no shell)
const MEET = /^https:\/\/meet\.google\.com\/[a-z0-9-]+(\?[^\s"']*)?$/;

const etat = { evts: null, err: null, at: 0, lit: false };

/** The helper's path. */
export const AIDE = () => `${home()}/.local/share/world-of-codecraft/agenda`;

/** A Meet link when it is exactly one (MEET), else null. */
export const meetSur = (u) => (typeof u === "string" && MEET.test(u) ? u : null);

/** The helper's stdout as { evts } or { err } ("denied", "pending", "bad"). */
export function lire(stdout) {
  let d;
  try { d = JSON.parse(stdout); } catch { return { err: "bad" }; }
  if (d && !Array.isArray(d)) return { err: d.error === "denied" || d.error === "pending" ? d.error : "bad" };
  if (!Array.isArray(d)) return { err: "bad" };
  const evts = d.filter((e) => e && Number.isFinite(e.start) && Number.isFinite(e.end))
    .map((e) => ({ title: String(e.title ?? ""), start: e.start, end: e.end, allDay: e.allDay === true, calendar: String(e.calendar ?? ""), meet: meetSur(e.meet) }))
    .sort((a, b) => a.start - b.start);
  return { evts };
}

async function lecture(cx) {
  if (etat.lit || Date.now() - etat.at < PRES) return;
  etat.lit = true;
  try {
    const r = await hc(["exec", "--timeout", "30", AIDE()]);
    const { evts, err } = r.code === 0 ? lire(r.stdout) : { err: /spawn_failed/.test(r.stdout) ? "missing" : "bad" };
    etat.evts = evts ?? null; etat.err = err ?? null;
  } catch { etat.evts = null; etat.err = "bad"; } // hc could not run
  etat.lit = false;
  etat.at = Date.now();
  cx.notify();
}

/** Starts reading the calendar (call it from init): now, then every POLL. */
export function suivre(cx) {
  cx.spawn(lecture);
  cx.timer.every(POLL, (cx) => { cx.spawn(lecture); });
}

/** The last answer: { evts (null without data), err }. */
export const agenda = () => ({ evts: etat.evts, err: etat.err });

/** The next meeting (not all-day) starting after now, or null. */
export const prochain = (now = Date.now()) => etat.evts?.find((e) => !e.allDay && e.start > now) ?? null;
/** The meeting (not all-day) going on now, or null. */
export const enCours = (now = Date.now()) => etat.evts?.find((e) => !e.allDay && e.start <= now && e.end > now) ?? null;
/** The meeting the bell is for: the next one when it starts within PREAVIS, else null. */
export const sonnerie = (now = Date.now()) => { const e = prochain(now); return e && e.start - now <= PREAVIS ? e : null; };
/** A meeting's key (its start and a hash of its title: nothing readable is stored). */
export function cle(e) {
  let h = 0;
  for (const ch of e.title) h = (Math.imul(h, 31) + ch.charCodeAt(0)) | 0;
  return `${e.start}:${(h >>> 0).toString(36)}`;
}

/** Opens a meeting's Meet link in the browser (only a MEET link, as one argv element). */
export function rejoindre(e) {
  const u = meetSur(e?.meet);
  if (u) exec("open", [u]).catch(() => {});
}
