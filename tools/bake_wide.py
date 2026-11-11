"""A wider Valbrume: 1000 px of new land west and east of the village, in the village band and in the
immersive bands, baked by the village's own compositor (compose3) on a canvas 5000 x 1200.

  tools/village-art/build_assets.sh && tools/village-art/.venv/bin/python tools/bake_wide.py

Runs after bake_world.py and bake_lands.py, and takes their place for the tiles: the lands of bake_lands.py
(its taller ground and its objects, re-run from its own source) are drawn again, the ground is now computed
over 5000 columns (screen columns keep their numbers, -1000 to 3999, like the rows of the bands, so the
dithering and the hashed details of the old land come out as baked), and new land stands on both sides:
- west, farmland: the road goes on, fields with fences, a windmill (b-windmill), the forest continued north;
- east: a lake on the river (the river's own distance field joined to an ellipse's) with a jetty and a
  rowboat (b-dock), a lane to the edge of the map, a trail north through the forest to a ruined watchtower
  (b-ruin), meadows and woods;
- the crossing: a dirt path from the village road's end over a wooden footbridge (b-bridge) to the east lane,
  with front cut-outs (keys "est-*" in monde-data.js FRONTS) for the bridge's front rail and the objects just
  in front of the walk, since heroes now cross and stroll there.
The world keeps its coordinates: x runs from -1000 to 4000 (WORLD.x = -1000), so every spot, road and path of
the mod stays valid. The old tiles are rewritten from the composite only if no building pixel of the village
changed by day (only the new land's shadows and the night glow may reach the old edges).
Writes art/monde/{jour,nuit}-{ouest,0,1,2,est}.png, {nord,sud}-<same>-{jour,nuit}.png, minicarte.png, and
the WORLD and TILES lines of monde-data.js and terre-data.js. About 10 minutes; CACHE=x.npz reuses the composite.
THEME=hiver: the winter map, into art/monde-hiver/ (see bake_world.py); the data comes out the same.
"""
import functools, inspect, json, os, re, sys
import numpy as np
from PIL import Image

TOOLS = os.path.dirname(os.path.abspath(__file__))
MOD = os.path.join(os.path.dirname(TOOLS), "mods", "world-of-codecraft")
ART = os.environ.get("ART") or os.path.join(TOOLS, "village-art")
os.chdir(ART)
sys.path.insert(0, ART)
import theme  # noqa: E402
OUT = os.path.join(MOD, "art", theme.MONDE)
import compose as C  # noqa: E402
import compose2 as C2  # noqa: E402
import compose3 as C3  # noqa: E402

GROUND_SRC = inspect.getsource(C2.ground)  # before bake_lands.py replaces it

# ------------------------------------------------------------------ the lands of bake_lands.py, as it builds them

LANDS = os.path.join(TOOLS, "bake_lands.py")
L = {"__file__": LANDS, "__name__": "bake_lands"}
exec(compile(open(LANDS).read().split("# " + "-" * 66 + " bake")[0], LANDS, "exec"), L)
N, S, H0 = L["N"], L["S"], L["H0"]
H = N + H0 + S
XW, XE = 1000, 1000  # new land west and east, logical px (multiples of 4: the Bayer dither stays in phase)
W0 = L["W"]
W = XW + W0 + XE

# ------------------------------------------------------------------ the ground over 5000 columns

LAKE = (990, -1070, 190, 140)  # world centre and half-axes (x, y): screen (3560, 160), on the river's east bank
BRIDGE = (3111, 230)  # the footbridge (b-bridge) over the river, east of the village road's end
# the path from the village road's end over the bridge (its ramps at 3054 and 3168) to the east lane
CROSSING = [(2700, 300), (2840, 288), (2950, 256), (3054, 201), (3168, 259), (3250, 284), (3340, 282), (3426, 252)]
LANE = [(3600, 322), (3800, 310), (4000, 335)]
src = GROUND_SRC
for a, b in L["patches"]:
    src = src.replace(a, b)
patches = [
    ("v, u = np.mgrid[-OFF:H - OFF, 0:W]", "v, u = np.mgrid[-OFF:H - OFF, -XOFF:W - XOFF]"),
    # the road goes on west past the fields, a lane to the mill; east, a lane from the jetty to the edge of the
    # map and a trail from the lake up to the ruined watchtower
    ("[(1520, 400), (1490, 520), (1550, 650), (1510, 800)]]",
     "[(1520, 400), (1490, 520), (1550, 650), (1510, 800)], "
     "[(0, 330), (-180, 352), (-400, 338), (-620, 362), (-840, 340), (-1000, 350)], [(-470, 344), (-505, 312)], "
     "[(3426, 252), (3600, 322), (3800, 310), (4000, 335)], [(3395, 95), (3480, -40), (3610, -125)], %r]" % CROSSING),
    ("(230, 560, 90, 50), (520, 640, 70, 40))",
     "(230, 560, 90, 50), (520, 640, 70, 40), "
     "(-300, 250, 70, 45), (-720, 250, 80, 50), (-640, 445, 70, 40), (-260, 470, 80, 45), (-860, 520, 70, 40), (-420, 610, 90, 50))"),
    # the lake: an ellipse with a noisy shore, joined to the river's distance so banks and foam run round both
    ("d = np.abs(x - xr) - 26 + nz * 0.4",
     "d = np.abs(x - xr) - 26 + nz * 0.4\n"
     "    d = np.minimum(d, (np.hypot((x - %d) / %d, (y - %d) / %d) - 1) * %d + (vnoise2(x, y, 40, 63) - 0.5) * 24 + nz * 0.4)"
     % (LAKE[0], LAKE[2], LAKE[1], LAKE[3], LAKE[3])),
]
for a, b in patches:
    assert a in src, a
    src = src.replace(a, b)
C2.XOFF = XW
C2.W = C3.W = C.W = W
C2.H = C3.H = C.H = H


def ground(src):
    exec(compile(src, C2.__file__, "exec"), C2.__dict__)
    return C2.ground()


# the objects are placed on the ground as it was before the crossing (the same draws, so the same lands), and
# the few standing on it are dropped below
kind = ground(src.replace(", %r]" % CROSSING, "]"))[1]
GROUND = ground(src)
C2.ground = lambda: GROUND  # computed once: both bakes reuse it
C3.load = functools.lru_cache(maxsize=None)(C.load)  # receive() reloaded every caster's PNG for every receiver

# ------------------------------------------------------------------ objects (u: screen column, v: screen row, as in the mod)

O = [(n, u + XW, v, dp, ex) for (n, u, v, dp, ex) in L["O"]]  # bake_lands.py's objects: v already on its canvas
old = len(O)
placed = [(u - XW, v - N) for (n, u, v, dp, ex) in O]
rng = np.random.default_rng(23)


def add(name, u, v, dp=6):
    O.append(("b-" + name, u + XW, v + N, dp, {}))


def w2s(x, y):
    return 1500 + x - y, 200 + (x + y) / 2


def grass(u, v, r, up=0):
    """Only grass round a base point (no path, field, water or square), r px each way, r / 2 down and
    max(up, r / 2) up: a tree's crown hides the ground above its trunk, so trees ask for more."""
    c, w = int(u) + XW, int(v) + N
    win = kind[max(0, w - max(up, r // 2)):w + r // 2 + 1, max(0, c - r):c + r + 1]
    return win.size > 0 and bool((win == 0).all())


def free(u, v, du, dv):
    return not any(abs(u - pu) < du and abs(v - pv) < dv for pu, pv in placed)


def new_land(u, margin):
    """In the new land, margin px from the old: no new sprite may cover a pixel of the old tiles."""
    return u < -margin or u > W0 + margin


LANDMARKS = [("windmill", -500, 292, 30), ("dock", 3471, 224, 6), ("ruin", 3620, -150, 30)]
CLEAR = [(-500, 292, 150, 170, 60), (3471, 224, 90, 50, 40), (3620, -150, 130, 120, 80)]  # u, v, half-width, above, below
for name, u, v, dp in LANDMARKS:
    add(name, u, v, dp)
    placed.append((u, v))


def clear_of_landmarks(u, v):
    return not any(abs(u - cu) < hw and cv - up < v < cv + dn for cu, cv, hw, up, dn in CLEAR)


TREES = ["tree-pine", "tree-pine", "tree-oak", "tree-pine", "tree-autumn", "tree-pine", "tree-oak"]
# north: the forest goes on, thick to the north, thinner near the village band; a clearing for the watchtower
for k in range(3600):
    u = int(rng.integers(-XW - 40, W0 + XE + 40))
    v = int(rng.integers(-N + 8, 4))
    if not new_land(u, 100) or not grass(u, v, 26, 60) or not clear_of_landmarks(u, v):
        continue
    if rng.random() > 0.35 + 0.65 * min(1, -v / 160) or not free(u, v, 40, 18):
        continue
    placed.append((u, v))
    add(TREES[k % 7], u, v)
    bu, bv = u + int(rng.integers(-26, 26)), v + int(rng.integers(6, 16))
    if rng.random() < 0.08 and grass(bu, bv, 12):
        add(rng.choice(["bush", "rocks"]), bu, bv, 4)

# the village band: the back forest (as in compose2.scene), then oaks, bushes and rocks in front; west of the
# village, trees keep 200 px from the seam so their shadows (cast east) never reach the barn or its fences
for k in range(1400):
    u = int(rng.integers(-XW - 30, W0 + XE + 30))
    v = int(rng.integers(10, 175))
    if not new_land(u, 200 if u < 0 else 100) or not grass(u, v, 26, 60) or not clear_of_landmarks(u, v):
        continue
    if rng.random() > 0.7 or not free(u, v, 40, 18):
        continue
    placed.append((u, v))
    add(TREES[k % 5], u, v)
for k in range(900):
    u = int(rng.integers(-XW - 30, W0 + XE + 30))
    v = int(rng.integers(175, 396))
    tall = rng.random() < 0.35
    if not new_land(u, 200 if tall or u < 0 else 100) or not grass(u, v, 30 if tall else 16, 70 if tall else 0):
        continue
    if not clear_of_landmarks(u, v) or rng.random() > (0.4 if tall else 0.3) or not free(u, v, 70 if tall else 50, 30 if tall else 22):
        continue
    placed.append((u, v))
    add(rng.choice(["tree-oak", "tree-oak", "tree-autumn", "tree-pine"]) if tall else rng.choice(["bush", "bush", "rocks"]), u, v, 8 if tall else 4)

# south: meadows, oaks, bushes and rocks; nothing tall close enough to reach the village band (bake_lands.py's rule)
for k in range(1100):
    u = int(rng.integers(-XW - 30, W0 + XE + 30))
    v = int(rng.integers(H0 + 30, H0 + S - 4))
    tall = rng.random() < 0.38
    if (tall and v < H0 + 200) or not new_land(u, 100) or not grass(u, v, 30 if tall else 16, 70 if tall else 0):
        continue
    if rng.random() > (0.5 if tall else 0.2) or not free(u, v, 70 if tall else 50, 30 if tall else 22):
        continue
    placed.append((u, v))
    add(rng.choice(["tree-oak", "tree-oak", "tree-autumn", "tree-pine"]) if tall else rng.choice(["bush", "bush", "rocks"]), u, v, 8 if tall else 4)

# fences along the front (+y) and right (+x) edges of three new fields
for fu, fv, a, b in ((-300, 250, 70, 45), (-720, 250, 80, 50), (-260, 470, 80, 45)):
    fx, fy = C.s2w(fu, fv)
    for t in np.arange(-a + 22, a, 44):
        add("fence-x", *w2s(fx + t, fy + b + 6), 2)
    for t in np.arange(-b + 22, b, 44):
        add("fence-y", *w2s(fx + a + 6, fy + t), 2)

# the crossing: the new objects standing on its path are dropped, then the bridge spans the river
ROUTE = CROSSING[3:] + LANE  # where heroes walk east of the river: the bridge, the path, the lane


def route_v(u):
    return float(np.interp(u, [p[0] for p in ROUTE], [p[1] for p in ROUTE]))


KEEP = {"b-" + n for n, *_ in LANDMARKS}
n = len(O)
O = O[:old] + [o for o in O[old:] if o[0] in KEEP or not (ROUTE[0][0] <= o[1] - XW <= ROUTE[-1][0] and abs(o[2] - N - route_v(o[1] - XW)) < 22)]
print(n - len(O), "objects dropped from the crossing")
add("bridge", *BRIDGE, 26)
O = [(n, int(round(u)), int(round(v)), dp, ex) for (n, u, v, dp, ex) in O]
print(len(O) - old, "new objects")

# ------------------------------------------------------------------ bake

CACHE = os.environ.get("CACHE")  # a .npz path: reuse the composite while tuning the checks and the export
if CACHE and os.path.exists(CACHE):
    z = np.load(CACHE)
    day, night = z["day"], z["night"]
else:
    day = C3.compose(False, O, [])
    night = C3.compose(True, O, [])
    if CACHE:
        np.savez_compressed(CACHE, day=day, night=night)


def save2(arr, path):
    Image.fromarray(arr).resize((arr.shape[1] * 2, arr.shape[0] * 2), Image.NEAREST).save(path, optimize=True)


# The old land differs from the approved bake only where the new land's shadows or the night glow reach it. Its
# buildings must not change by a single pixel by day (checked against every building sprite's own pixels);
# then every tile is rewritten from the composite, so no seam shows.
BUILDINGS = {"b-barn", "b-magetower", "b-forge", "b-townhall", "b-tavern", "b-temple", "b-barracks", "b-well",
             "b-noticeboard", "b-stall-red", "b-stall-blue", "b-stall-green"}
rd = lambda p: np.asarray(Image.open(p).convert("RGB"))[::2, ::2]
for tag, img in (("jour", day), ("nuit", night)):
    band = img[N:N + H0, XW:XW + W0]
    ref = np.concatenate([rd(os.path.join(OUT, f"{tag}-{k}.png")) for k in range(3)], 1)
    d = np.abs(band.astype(int) - ref.astype(int)).sum(-1) > 0
    bad = worst = 0
    for (name, u, v, dp, _x) in L["village"]:
        if name not in BUILDINGS:
            continue
        m = C2.META[name]
        c = C3.load(name)
        x0, y0 = int(u - m["ax"]), int(v - m["ay"])
        ys0, xs0 = max(0, y0), max(0, x0)
        ys1, xs1 = min(H0, y0 + c.shape[0]), min(W0, x0 + c.shape[1])
        hit = d[ys0:ys1, xs0:xs1] & (c[ys0 - y0:ys1 - y0, xs0 - x0:xs1 - x0, 3] > 0)
        bad += int(hit.sum())
        if hit.any():
            worst = max(worst, int(np.abs(band[ys0:ys1, xs0:xs1][hit].astype(int) - ref[ys0:ys1, xs0:xs1][hit].astype(int)).max()))
    cols = np.nonzero(d.any(0))[0]
    print(tag, "village pixels changed: %.3f%%, columns %s, building pixels changed: %d (max delta %d)"
          % (100 * d.mean(), f"{cols.min()}-{cols.max()}" if len(cols) else "-", bad, worst))
    for name, rows in (("nord", slice(0, N)), ("sud", slice(N + H0, H))):
        ref = np.concatenate([rd(os.path.join(OUT, f"{name}-{k}-{tag}.png")) for k in range(3)], 1)
        print(tag, name, "pixels changed: %.3f%%" % (100 * (np.abs(img[rows, XW:XW + W0].astype(int) - ref.astype(int)).sum(-1) > 0).mean()))
    if os.environ.get("DIFF"):
        Image.fromarray((d * 255).astype(np.uint8)).save(os.environ["DIFF"].replace(".png", f"-{tag}.png"))
    # at night the window glow (blurred over 22 px) no longer meets a canvas edge at the old seams
    assert bad == 0 if tag == "jour" else (bad < 400 and worst <= 40), "a building changed: keep the approved village tiles"

TILES = [("ouest", -XW), (0, 0), (1, 1000), (2, 2000), ("est", W0)]
for k, x in TILES:
    c = x + XW
    for tag, img in (("jour", day), ("nuit", night)):
        save2(img[N:N + H0, c:c + 1000], os.path.join(OUT, f"{tag}-{k}.png"))
        save2(img[:N, c:c + 1000], os.path.join(OUT, f"nord-{k}-{tag}.png"))
        save2(img[N + H0:, c:c + 1000], os.path.join(OUT, f"sud-{k}-{tag}.png"))
Image.fromarray(day[N:N + H0]).resize((448, 36), Image.LANCZOS).save(os.path.join(OUT, "minicarte.png"), optimize=True)

# front cut-outs east of the river (as bake_world.py's, keys "est-*"): the bridge's front rail in four pieces
# along the deck (a hero crossing walks behind it), and the objects just in front of the walk to the lake
for f in os.listdir(OUT):
    if f.startswith("avant-est-"):
        os.remove(os.path.join(OUT, f))
fronts = []


def cut(key, mask, x0, y0, z):
    """A cut-out of the composite under mask (a sprite's alpha placed at x0, y0), kept to the village band."""
    rows, cols = np.arange(mask.shape[0])[:, None] + y0, np.arange(mask.shape[1])[None] + x0
    mask = mask & (rows >= 0) & (rows < H0) & (cols < W0 + XE)
    ys, xs = np.nonzero(mask)
    ys0, ys1, xs0, xs1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    for tag, img in (("jour", day), ("nuit", night)):
        c = np.zeros((ys1 - ys0, xs1 - xs0, 4), np.uint8)
        c[..., :3] = img[N + y0 + ys0:N + y0 + ys1, XW + x0 + xs0:XW + x0 + xs1]
        c[..., 3] = np.where(mask[ys0:ys1, xs0:xs1], 255, 0)
        save2(c, os.path.join(OUT, f"avant-{key}-{tag}.png"))
    fronts.append({"key": key, "x": int(x0 + xs0), "y": int(y0 + ys0), "w": int(xs1 - xs0), "h": int(ys1 - ys0), "z": int(z)})


m = C2.META["b-bridge-rail"]
rail = C3.load("b-bridge-rail")[..., 3] > 0
x0, y0 = BRIDGE[0] - m["ax"], BRIDGE[1] - m["ay"]
for k, cols in enumerate(np.array_split(np.nonzero(rail.any(0))[0], 4)):
    piece = np.zeros_like(rail)
    piece[:, cols] = rail[:, cols]
    cut(f"est-rail-{k}", piece, x0, y0, y0 + np.nonzero(piece.any(1))[0].max() + 4)  # its foot on the deck, east end
seen = {}
for (name, u, v, dp, _x) in O[old:]:
    u, v = u - XW, v - N
    if name in KEEP or name == "b-bridge" or not (ROUTE[0][0] - 40 <= u <= ROUTE[-1][0]):
        continue
    if not 0 < v - route_v(u) < (110 if name.startswith("b-tree") else 40):
        continue
    m = C2.META[name]
    k = seen[name] = seen.get(name, -1) + 1
    cut(f"est-{name[2:]}-{k}", C3.load(name)[..., 3] > 0, u - m["ax"], v - m["ay"], v + dp)
print(len(fronts), "front cut-outs east of the river")

path = os.path.join(MOD, "monde-data.js")
js = open(path).read()
fr = re.search(r"(?s)export const FRONTS = (\[.*?\n\]);", js)
keep = [f for f in json.loads(fr.group(1)) if not f["key"].startswith("est-")]
js = js[:fr.start(1)] + "[\n" + ",\n".join("  " + json.dumps(f) for f in keep + fronts) + "\n]" + js[fr.end(1):]
js = re.sub(r"(?m)^export const WORLD = .*$", "export const WORLD = " + json.dumps({"x": -XW, "w": W, "h": H0}) + ";  // tools/bake_wide.py", js)
js = re.sub(r"(?m)^export const TILES = .*$", "export const TILES = " + json.dumps([{"k": k, "x": x, "w": 1000} for k, x in TILES]) + ";", js)
open(path, "w").write(js)
with open(os.path.join(MOD, "terre-data.js"), "w") as f:
    f.write("// Generated by tools/bake_wide.py (the village's compositor on a wider, taller canvas): the bands around the village.\n")
    f.write("export const EXT = " + json.dumps({"nord": N, "sud": S, "tiles": [{"k": k, "x": x} for k, x in TILES]}) + ";\n")
if os.environ.get("PREVIEW"):
    Image.fromarray(day).resize((W // 2, H // 2), Image.LANCZOS).save(os.environ["PREVIEW"])
print("ok")
