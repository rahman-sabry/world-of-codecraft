"""Highpass Hold's live waterfall: two frames of foam streaks over the baked col-cascade, swapped in the mod by a pair of
native opacity loops (place.js chutes, the map's CHUTES).

  tools/village-art/.venv/bin/python tools/col_chute.py [--racine DIR]

For each col-cascade of maps/col.json, the streaks are drawn where its water shows: the water alone (col-cascade-eau,
its alpha) and, on the whole sprite, a watery colour (rock in front of it hides it). Dashes fall down each column,
the second frame half a period lower, with foam flecks at its foot. Written to art/col-ete/chute-<k>-<0|1>.png (PNG at
2x; only the summer look flows: in winter the fall is frozen); prints each one's CHUTES record for carte-col.js."""
import argparse, json, os
import numpy as np
from PIL import Image

TOOLS = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(TOOLS)
A = os.path.join(TOOLS, "village-art", "assets")
ap = argparse.ArgumentParser()
ap.add_argument("--racine", default=os.path.join(ROOT, "mods", "world-of-codecraft"))
args = ap.parse_args()
meta = json.load(open(os.path.join(A, "meta.json")))
layout = json.load(open(os.path.join(ROOT, "maps", "col.json")))


def sprite(nom):
    a = np.asarray(Image.open(os.path.join(A, f"b-{nom}.png")).convert("RGBA"))[::2, ::2]
    return a, meta[f"b-{nom}"]


eau, me = sprite("col-cascade-eau")
tout, mt = sprite("col-cascade")
out = os.path.join(args.racine, "art", "col-ete")
os.makedirs(out, exist_ok=True)
rng = np.random.default_rng(3)
P = 16  # dash period, px
for k, ob in enumerate(o for o in layout["props"] if o["modele"] == "col-cascade"):
    u, v = ob["at"]
    x0, y0 = u - me["ax"], v - me["ay"]
    h, w = eau.shape[:2]
    # the whole sprite under the water's box
    tx, ty = mt["ax"] - me["ax"], mt["ay"] - me["ay"]
    t = np.zeros((h, w, 4), np.uint8)
    sy0, sx0 = max(0, -ty), max(0, -tx)
    sy1, sx1 = min(h, tout.shape[0] - ty), min(w, tout.shape[1] - tx)
    t[sy0:sy1, sx0:sx1] = tout[sy0 + ty:sy1 + ty, sx0 + tx:sx1 + tx]
    r, g, b = (t[..., i].astype(int) for i in range(3))
    mask = (eau[..., 3] > 0) & (t[..., 3] > 0) & ((b > r + 25) | ((r > 200) & (g > 215) & (b > 215)))
    ys, xs = np.nonzero(mask)
    bx0, bx1, by0, by1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    mask = mask[by0:by1, bx0:bx1]
    H, W = mask.shape
    yy, xx = np.mgrid[0:H, 0:W]
    ph = rng.integers(0, P, W)[None, :]  # each column's own phase and dash length
    ln = rng.integers(3, 7, W)[None, :]
    foot = yy > H - 12
    for f in (0, 1):
        q = (yy - ph - f * P // 2) % P
        im = np.zeros((H, W, 4), np.uint8)
        core = mask & (q < ln) & ~foot
        tail = mask & (q >= ln) & (q < ln + 2) & ~foot
        im[tail] = (200, 230, 244, 120)
        im[core] = (244, 251, 255, 210)
        fl = mask & foot & (rng.random((H, W)) > 0.72)
        im[fl] = (250, 253, 255, 200)
        Image.fromarray(im).resize((W * 2, H * 2), Image.NEAREST).save(os.path.join(out, f"chute-{k}-{f}.png"), optimize=True)
    print(json.dumps({"at": [int(x0 + bx0), int(y0 + by0)], "w": int(W), "h": int(H)}))
