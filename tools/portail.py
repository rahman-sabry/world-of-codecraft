#!/usr/bin/env python3
"""The raid teleport's portal art (mods/world-of-codecraft/art), drawn on a pixel grid with gen.py's Px:

  portail-0.svg .. portail-2.svg  the standing gate, 22 x 34 px: a violet rim round a deep blue swirl of three arms
                                  with a white-blue core, the arms turned a third of their period per frame (a loop)
  portail-sol.svg                 its glow on the ground, 30 x 8 px

  python3 tools/portail.py"""
import math, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gen

gen.OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "mods", "world-of-codecraft", "art")
W, H, ARMS = 22, 34, 3


def gate(k):
    s = gen.Px(W, H)
    cx, cy, rx, ry = (W - 1) / 2, (H - 1) / 2, W / 2 - 1, H / 2 - 1
    for y in range(H):
        for x in range(W):
            dx, dy = (x - cx) / rx, (y - cy) / ry
            d = math.hypot(dx, dy)
            if d > 1:
                continue
            if d > 0.76:  # the rim: lit on the upper left, shaded on the lower right
                lit = -dx - dy
                s.p(x, y, "#e2d0ff" if lit > 1 else "#b58cff" if lit > 0 else "#8a5ae6" if lit > -0.9 else "#5c34a8")
                continue
            if d > 0.7:  # its inner edge, dark against the swirl
                s.p(x, y, "#1a1240")
                continue
            if d < 0.16:
                s.p(x, y, "#ffffff" if d < 0.08 else "#d8f1ff")
                continue
            a = math.atan2(dy, dx)
            arm = math.cos(ARMS * (a + 3.2 * d) - 2 * math.pi * k / 3)
            if arm > 0.6:
                c = "#9ad8ff" if d < 0.45 else "#b58cff"
            elif arm > 0.1:
                c = "#5a5be0" if d < 0.5 else "#5a3fc0"
            else:
                c = "#2e2a8a" if d < 0.55 else "#22186a"
            s.p(x, y, c)
    # a few motes caught in the swirl, a different set per frame (they twinkle as the frames turn)
    for i in range(4):
        a = 2 * math.pi * (i / 4 + k / 9) + 0.5
        r = 0.35 + 0.1 * ((i + k) % 3)
        s.p(round(cx + math.cos(a) * r * rx), round(cy + math.sin(a) * r * ry), "#fff3c4")
    s.outline()
    s.svg(f"portail-{k}")


def ground():
    s = gen.Px(30, 8)
    for y in range(8):
        for x in range(30):
            dx, dy = (x - 14.5) / 15, (y - 3.5) / 4
            d = dx * dx + dy * dy
            if d < 1:
                rim = 0.5 < d < 0.85
                s.p(x, y, ("#c9a8ff%02x" % int(150 * (1 - d) + 150)) if rim else ("#8f5cff%02x" % int((1 - d) * 140 + 60)))
    s.svg("portail-sol")


if __name__ == "__main__":
    for k in range(3):
        gate(k)
    ground()
    print("portail-0..2.svg, portail-sol.svg in", gen.OUT)
