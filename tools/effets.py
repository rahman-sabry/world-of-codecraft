#!/usr/bin/env python3
"""The fight effects' pixel art (mods/world-of-codecraft/art), drawn on a pixel grid with gen.py's Px; each shown at
2x (activite.js effets, place.js). One per class, by what its blow looks like:

  fx-taille-d.svg, fx-taille-g.svg    warrior: a silver crescent sweep, opening right / left (24 x 20)
  fx-dague.svg                        rogue: a dagger glint, a four-point silver star (7 x 7)
  fx-etincelles.svg                   artificer: sparks at its tool (11 x 9)
  fx-eclair-d.svg, fx-eclair-g.svg    artificer: a small orange bolt flying right / left (12 x 5)
  fx-arcane.svg                       mage: a violet orb with a blue core (9 x 9)
  fx-arcane-eclat.svg                 mage: its burst, a broken violet ring (17 x 17)
  fx-fleche-d.svg, fx-fleche-g.svg    ranger: an arrow flying right / left (18 x 5)
  fx-impact.svg                       ranger: a dust puff where it lands (11 x 8)
  fx-soin.svg                         priest: a golden mote, a small cross (5 x 5)
  fx-chatiment.svg                    priest alone: a golden flash of eight rays (15 x 15)

The raid boss's stunning blow (activite.js aoe), rings drawn flat (the ground's depth), stretched to its reach:
  fx-aoe-alerte.svg                   its warning: a dashed red ring on the ground (80 x 26)
  fx-aoe-golem.svg, fx-aoe-debris.svg golem: a ring of dust (80 x 26) and a rock thrown out (5 x 4)
  fx-aoe-troll.svg                    troll: a pale shockwave, a double ring (80 x 26)
  fx-aoe-spectre.svg                  spectre: a violet wailing ring with wisps (80 x 26)
  fx-aoe-gobelin.svg, fx-aoe-bombe.svg goblin: a fiery ring (80 x 26) and the bomb it throws (7 x 8)
  fx-etoiles-0.svg, fx-etoiles-1.svg  a stunned fighter's dizzy stars, two turns of a circle of three (17 x 7)
Its summon (activite.js renfort), white masks tinted per species (drawn with svg() and a text colour):
  fx-rune.svg                         a rune circle on the ground where a minion will come (40 x 14)
  fx-surgit.svg                       the burst a minion comes out of (21 x 21)

  python3 tools/effets.py"""
import math, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gen

gen.OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "mods", "world-of-codecraft", "art")


def flip(s):
    t = gen.Px(s.w, s.h)
    for y in range(s.h):
        for x in range(s.w):
            t.g[y][s.w - 1 - x] = s.g[y][x]
    return t


def taille():
    s = gen.Px(24, 20)
    for y in range(20):
        for x in range(24):
            # a crescent: inside the outer circle, outside the inner one shifted left, on the right half
            o = math.hypot((x - 6) / 17, (y - 9.5) / 10)
            i = math.hypot((x - 2) / 16, (y - 9.5) / 8.5)
            if o < 1 and i > 1 and x > 8:
                edge = o > 0.86
                s.p(x, y, "#ffffff" if edge else "#d8e4ef" if o > 0.7 else "#9fb8cf")
    s.outline("#2a3446")
    s.svg("fx-taille-d")
    flip(s).svg("fx-taille-g")


def dague():
    s = gen.Px(7, 7)
    for k in range(7):
        s.p(3, k, "#e8f1ff" if k in (0, 6) else "#ffffff")
        s.p(k, 3, "#e8f1ff" if k in (0, 6) else "#ffffff")
    for x, y in ((2, 2), (4, 2), (2, 4), (4, 4)):
        s.p(x, y, "#a9c7e8")
    s.svg("fx-dague")


def etincelles():
    s = gen.Px(11, 9)
    for x, y, c in ((5, 4, "#ffffff"), (4, 4, "#ffd86b"), (6, 4, "#ffd86b"), (5, 3, "#ffd86b"), (5, 5, "#ffd86b"),
                    (2, 2, "#ff9a2e"), (8, 1, "#ff9a2e"), (9, 6, "#ffb347"), (1, 7, "#ff9a2e"), (3, 5, "#ffd86b"),
                    (7, 2, "#ffd86b"), (8, 7, "#ff7a1a"), (0, 3, "#ffb347"), (10, 3, "#ff7a1a")):
        s.p(x, y, c)
    s.svg("fx-etincelles")


def eclair():
    s = gen.Px(12, 5)
    pts = [(0, 2), (1, 2), (2, 1), (3, 1), (4, 2), (5, 3), (6, 3), (7, 2), (8, 1), (9, 1), (10, 2), (11, 2)]
    for x, y in pts:
        s.p(x, y, "#fff3c4")
        s.p(x, y + 1 if y < 4 else y - 1, "#ff9a2e")
    s.svg("fx-eclair-d")
    flip(s).svg("fx-eclair-g")


def arcane():
    s = gen.Px(9, 9)
    for y in range(9):
        for x in range(9):
            d = math.hypot(x - 4, y - 4)
            if d < 4.3:
                s.p(x, y, "#ffffff" if d < 1 else "#9ad8ff" if d < 2 else "#c58bff" if d < 3.2 else "#8a3fe0")
    s.outline("#3a1a6a")
    s.svg("fx-arcane")
    s = gen.Px(17, 17)
    for y in range(17):
        for x in range(17):
            d, a = math.hypot(x - 8, y - 8), math.atan2(y - 8, x - 8)
            if 5.5 < d < 8.2 and math.cos(5 * a) > -0.4:
                s.p(x, y, "#e6c8ff" if d < 6.6 else "#b06bff")
            elif d < 2.2:
                s.p(x, y, "#9ad8ff")
    s.svg("fx-arcane-eclat")


def fleche():
    s = gen.Px(18, 5)
    s.r(3, 2, 12, 1, "#8a5a2b")  # the shaft
    for x, y in ((15, 2), (14, 1), (14, 3), (16, 2), (17, 2)):
        s.p(x, y, "#d9dde4")  # the head
    for x, y in ((0, 0), (1, 1), (2, 2), (0, 4), (1, 3), (3, 1), (3, 3)):
        s.p(x, y, "#e8e2d0")  # the fletching
    s.svg("fx-fleche-d")
    flip(s).svg("fx-fleche-g")


def impact():
    s = gen.Px(11, 8)
    for y in range(8):
        for x in range(11):
            d = math.hypot((x - 5) / 5.5, (y - 4) / 4)
            if d < 1 and (x + y) % 3:
                s.p(x, y, "#e8e2d0d0" if d < 0.6 else "#b8ad98a0")
    s.svg("fx-impact")


def soin():
    s = gen.Px(5, 5)
    s.r(2, 0, 1, 5, "#ffd86b")
    s.r(0, 2, 5, 1, "#ffd86b")
    s.p(2, 2, "#ffffff")
    s.svg("fx-soin")


def chatiment():
    s = gen.Px(15, 15)
    for k in range(8):
        a = k * math.pi / 4
        for r in range(2, 8 if k % 2 == 0 else 6):
            s.p(round(7 + math.cos(a) * r), round(7 + math.sin(a) * r), "#ffd86b" if r > 3 else "#fff3c4")
    for y in range(15):
        for x in range(15):
            if math.hypot(x - 7, y - 7) < 2.2:
                s.p(x, y, "#ffffff")
    s.svg("fx-chatiment")


def anneau(nom, couleurs, epais=0.16, trou=None, motes=None):
    """A flat ring 80 x 26 (an ellipse), its band `epais` of the radius wide, coloured from the inside out (couleurs),
    with gaps where trou(angle) is true and motes (angle -> colour) scattered just outside it."""
    s = gen.Px(80, 26)
    for y in range(26):
        for x in range(80):
            dx, dy = (x - 39.5) / 39.5, (y - 12.5) / 12.5
            d, a = math.hypot(dx, dy), math.atan2(dy, dx)
            if 1 - epais < d <= 1 and not (trou and trou(a)):
                k = min(len(couleurs) - 1, int((d - (1 - epais)) / epais * len(couleurs)))
                s.p(x, y, couleurs[k])
            elif motes and 0.66 < d < 1 - epais and motes(a, d):
                s.p(x, y, motes(a, d))
    s.svg(nom)


def aoe():
    anneau("fx-aoe-alerte", ["#ff7a1a", "#e5304a", "#b0182e"], 0.1, trou=lambda a: math.cos(16 * a) < -0.3)
    anneau("fx-aoe-golem", ["#e8dcc0c0", "#b8a27ad8", "#8a6a44e0", "#5e4a32c0"], 0.24,
           trou=lambda a: math.cos(11 * a + 1) < -0.75, motes=lambda a, d: "#8a6a44b0" if math.cos(23 * a) > 0.92 else None)
    anneau("fx-aoe-troll", ["#fff3c4a0", "#ffffffd0", "#e8e2d090"], 0.12)
    anneau("fx-aoe-spectre", ["#e6c8ffc0", "#b06bffe0", "#7a3fd0d0"], 0.18,
           trou=lambda a: math.cos(7 * a) < -0.8, motes=lambda a, d: "#c58bffc0" if math.cos(13 * a + 3 * d) > 0.95 else None)
    anneau("fx-aoe-gobelin", ["#fff3c4", "#ffd86b", "#ff9a2e", "#e5304ad0"], 0.22,
           trou=lambda a: math.cos(13 * a) < -0.85, motes=lambda a, d: "#ff7a1a" if math.cos(29 * a) > 0.95 else None)
    d = gen.Px(5, 4)
    d.r(1, 0, 3, 1, "#8a6a44"); d.r(0, 1, 5, 2, "#6e5236"); d.r(1, 3, 3, 1, "#4a3826")
    d.svg("fx-aoe-debris")
    b = gen.Px(7, 8)
    for y in range(8):
        for x in range(7):
            if math.hypot(x - 3, y - 4.5) < 3.2:
                b.p(x, y, "#2a2430" if math.hypot(x - 2, y - 3.5) > 1 else "#6a6070")
    b.p(4, 1, "#8a5a2b"); b.p(5, 0, "#ffd86b"); b.p(6, 0, "#ff7a1a")
    b.outline()
    b.svg("fx-aoe-bombe")


def etoiles():
    for k in range(2):
        s = gen.Px(17, 7)
        for i in range(3):
            a = 2 * math.pi * (i / 3 + k / 6)
            x, y = round(8 + math.cos(a) * 6.5), round(3 + math.sin(a) * 2.2)
            for dx, dy in ((0, 0), (1, 0), (-1, 0), (0, 1), (0, -1)):
                s.p(x + dx, y + dy, "#ffffff" if (dx, dy) == (0, 0) else "#ffd86b")
        s.svg(f"fx-etoiles-{k}")


def rune():
    s = gen.Px(40, 14)
    for y in range(14):
        for x in range(40):
            d, a = math.hypot((x - 19.5) / 19.5, (y - 6.5) / 6.5), math.atan2((y - 6.5) / 6.5, (x - 19.5) / 19.5)
            if 0.84 < d <= 1:
                s.p(x, y, "#ffffff")
            elif 0.6 < d <= 0.7 and math.cos(5 * a) > 0.2:
                s.p(x, y, "#ffffffc0")  # the inner glyph marks
            elif d <= 0.6:
                s.p(x, y, "#ffffff%02x" % int(70 * (1 - d / 0.6) + 20))
    s.svg("fx-rune")


def surgit():
    s = gen.Px(21, 21)
    for y in range(21):
        for x in range(21):
            d, a = math.hypot(x - 10, y - 10), math.atan2(y - 10, x - 10)
            if d < 2.5:
                s.p(x, y, "#ffffff")
            elif d < 10.5 and math.cos(8 * a) > 0.75 - d / 40:
                s.p(x, y, "#ffffff%02x" % int(255 * (1 - d / 11)))
            elif 7.5 < d < 9.2:
                s.p(x, y, "#ffffff90")
    s.svg("fx-surgit")


if __name__ == "__main__":
    rune(); surgit()
    aoe(); etoiles()
    taille(); dague(); etincelles(); eclair(); arcane(); fleche(); impact(); soin(); chatiment()
    print("fx-*.svg in", gen.OUT)
