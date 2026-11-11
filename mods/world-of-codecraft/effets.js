// The fight effects (Activites.frappe, Place.effets): one per blow of a hero or an apprentice, by its class, drawn as
// depth-sorted world elements (art/fx-*.svg, tools/effets.py, at 2x; an apprentice's smaller). No `.loop`: each is
// drawn with ids at its starting place, size and opacity, and the frame timer's signature includes its stage
// (FX_ETAPES: launched, landed; gone at FX), so each stage redraws once with new targets that native transitions on
// left/top/width/height/opacity carry (declared on every render: GPUI animates only changes made after the transition
// exists). A projectile is one element gliding from the striker to its foe.

import { div, image } from "gpui-kit";

const ART = "mods/world-of-codecraft/art";
export const FX = 650; // ms an effect lasts
export const FX_ETAPES = [40, 340, 500]; // its stages: launched (a projectile leaves, a glint shows), landed (impact), fading
const VOL = FX_ETAPES[1] - FX_ETAPES[0]; // a projectile's flight

/** An image of art fx-<nom>.svg (w x h art px at 2x times k), centred on (x, y), with native transitions on its
 *  place, size and opacity (duration ms each, linear for a flight). */
function piece(id, nom, x, y, w, h, k, op, dur = { pos: 16, size: 120, op: 160 }) {
  const W = Math.round(w * 2 * k), H = Math.round(h * 2 * k);
  return image(`${ART}/${nom}.svg`).id(id).absolute().left(Math.round(x - W / 2)).top(Math.round(y - H / 2)).w(W).h(H).opacity(op)
    .transition("left", { duration: dur.pos, easing: "linear" }).transition("top", { duration: dur.pos, easing: "linear" })
    .transition("width", { duration: dur.size, easing: "ease-out" }).transition("height", { duration: dur.size, easing: "ease-out" })
    .transition("opacity", { duration: dur.op, easing: "linear" });
}

/** A world element over the world's origin (its children placed in world px), at depth z. */
const monde = (id, z, kids) => ({ z, el: div().id(id).absolute().left(0).top(0).w(0).h(0).children(kids) });

/** A projectile fx-<nom> from a (chest) to b, launched at stage 1, gone on landing; and the impact fx-<choc> at b
 *  on landing (stage 2: growing from half size), fading at stage 3. */
function trait(id, nom, w, h, a, b, e, k, al, choc) {
  const at = e === 0 ? a : b, out = [piece(`${id}-p`, nom, at[0], at[1], w, h, k, e === 1 ? al : 0, { pos: VOL, size: 16, op: e >= 2 ? 80 : 16 })];
  if (choc) {
    const [cn, cw, ch] = choc, f = e >= 2 ? 1 : 0.5;
    out.push(piece(`${id}-c`, cn, b[0], b[1], cw * f, ch * f, k, e === 2 ? al : 0, { pos: 16, size: 200, op: e === 3 ? 150 : 16 }));
  }
  return out;
}

/** The elements of one effect: cls the striker's class; a its chest, b its foe's chest ([x, y]); dir the side it
 *  faces (1 right); fy / tfy their feet (depth); e its stage (0 drawn, 1 launched, 2 landed, 3 fading); k its scale (an apprentice's smaller); al its
 *  opacity (dimmed at night); soin: a priest's heal { at (chest), fy } on a party member, else null (a smite). */
export function effet(id, cls, { a, b, dir, fy, tfy }, e, k, al, soin) {
  const haut = Math.max(fy, tfy) + 8; // a projectile over the units it passes
  if (cls === "guerrier") {
    // a crescent sweep just in front of it, growing and moving on, then fading
    const x = a[0] + dir * (e ? 34 : 24) * k, s = e ? 1 : 0.6;
    return [monde(id, fy + 4, [piece(`${id}-t`, dir > 0 ? "fx-taille-d" : "fx-taille-g", x, a[1], 24 * s, 20 * s, k, e >= 2 ? 0 : al, { pos: 120, size: 120, op: 200 })])];
  }
  if (cls === "voleur") {
    // two dagger glints on the foe, the second a little later and off to one side
    return [monde(id, tfy + 4, [-1, 1].map((s, i) => piece(`${id}-d${i}`, "fx-dague", b[0] + s * 9 * k, b[1] + (i ? 8 : -6) * k, 7, 7, k, e === 1 ? al : 0,
      { pos: 16, size: 16, op: i ? 260 : 60 })))];
  }
  if (cls === "artificier") {
    const out = [piece(`${id}-s`, "fx-etincelles", a[0] + dir * 16 * k, a[1] - 8 * k, 11, 9, k, e >= 2 ? 0 : al, { pos: 16, size: 16, op: 250 })];
    return [monde(id, haut, [...out, ...trait(id, dir > 0 ? "fx-eclair-d" : "fx-eclair-g", 12, 5, a, b, e, k, al, null)])];
  }
  if (cls === "mage") return [monde(id, haut, trait(id, "fx-arcane", 9, 9, a, b, e, k, al, ["fx-arcane-eclat", 17, 17]))];
  if (cls === "rodeur") return [monde(id, haut, trait(id, b[0] < a[0] ? "fx-fleche-g" : "fx-fleche-d", 18, 5, a, b, e, k, al, ["fx-impact", 11, 8]))];
  if (soin) {
    // golden motes rising from the one it heals, over a small glow at its feet
    const [x, y] = soin.at;
    const motes = [-12, -4, 5, 13].map((dx, i) => piece(`${id}-m${i}`, "fx-soin", x + dx * k, e ? y - (22 + (i % 2) * 8) * k : y + 6, 5, 5, k, e === 1 ? al : 0,
      { pos: 280, size: 16, op: e >= 2 ? 280 : 60 }));
    const glow = image(`${ART}/halo.svg`).id(`${id}-g`).absolute().left(Math.round(x - 26 * k)).top(Math.round(soin.fy - 9 * k)).w(Math.round(52 * k)).h(Math.round(18 * k))
      .opacity(e === 1 ? 0.8 * al : 0).transition("opacity", { duration: 200, easing: "linear" });
    return [monde(id, soin.fy + 4, [glow, ...motes])];
  }
  // a priest with no one to heal smites its foe: a golden flash growing on it, then fading
  const s = e ? 1 : 0.4;
  return [monde(id, tfy + 4, [piece(`${id}-f`, "fx-chatiment", b[0], b[1], 15 * s, 15 * s, k, e >= 2 ? 0 : al, { pos: 16, size: 200, op: 250 })])];
}
