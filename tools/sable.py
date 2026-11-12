"""The sandstorm's drifting sand (place.js sable(), the oasis's 'tempete' look): art/sable-{0,1,2}.svg, each a wheel
of thin streaks along its rim, every streak tangent to it, so the top of the turning wheel (the only part its window
shows) carries them sideways, nearly level. Plain shapes in one colour: the mod tints them (text_color).

  python3 tools/sable.py"""
import math, os, random

MOD = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "mods", "world-of-codecraft", "art")
T = 640  # the wheel's size (px); its rim band from R0 to R1
R0, R1 = 268, 318


def roue(k):
    rng = random.Random(70 + k)
    out = []
    for i in range(34):
        a = (i + rng.uniform(-0.35, 0.35)) / 34 * 2 * math.pi
        r = rng.uniform(R0, R1)
        n = rng.uniform(14, 44)  # length along the rim
        e = rng.choice((1.5, 2, 2, 2.5))  # thickness
        c, s = math.cos(a), math.sin(a)
        tx, ty = -s, c  # tangent
        cx, cy = T / 2 + r * c, T / 2 + r * s
        pts = [(cx - tx * n / 2 - c * e / 2, cy - ty * n / 2 - s * e / 2), (cx + tx * n / 2 - c * e / 4, cy + ty * n / 2 - s * e / 4),
               (cx + tx * n / 2 + c * e / 4, cy + ty * n / 2 + s * e / 4), (cx - tx * n / 2 + c * e / 2, cy - ty * n / 2 + s * e / 2)]
        out.append('<polygon points="' + " ".join(f"{x:.1f},{y:.1f}" for x, y in pts) + '"/>')
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {T} {T}" width="{T}" height="{T}" fill="#ffffff">'
            + "".join(out) + "</svg>\n")


for k in range(3):
    with open(os.path.join(MOD, f"sable-{k}.svg"), "w") as f:
        f.write(roue(k))
print("ok: art/sable-0..2.svg")
