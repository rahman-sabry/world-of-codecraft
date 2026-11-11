"""Bake a map's art from its layout (maps/<id>.json, schema in RECIPE.md) in one pass, with the village's own
compositor, lighting and textures (village-art compose3, extras), for one look (theme.py LOOKS).

  tools/village-art/.venv/bin/python tools/bake_map.py maps/<id>.json [--look ete|hiver] [--racine DIR]

The canvas is the whole map: the village band (WORLD: x to x + w, 0 to h) with the immersive bands above (nord) and
below (sud), one ground (tools/mapbake/sol.py), the layout's objects and seeded scatter (mapbake/objets.py), checked
first (mapbake/verif.py: the bake stops on any failure). Writes, under DIR (default the mod):
  art/<id>-<look>/jour-<k>.png, nuit-<k>.png             the village band in tiles of 'tuile' px (PNG at 2x)
  art/<id>-<look>/nord-<k>-<jour|nuit>.png, sud-<k>-...   the bands, as wide as the tile under them
  art/<id>-<look>/avant-<key>-<jour|nuit>.png             front cut-outs (bake_world.py's), kept to the village band
  art/<id>-<look>/minicarte.png                           the minimap (the village band)
  carte-<id>-data.js                                      WORLD, TILES, FRONTS, EXT (the same for every look)
A front cut-out is made for an object when a unit standing where the layout's heroes can walk (heros: lieux.js
walkable(), its feet within 32 px of the object's sides) has its feet above the object's base, below its top: the
mod draws it above that unit. Without heros, bake_world.py's FRONT_V rule: every object based in the lower half of
the band. An object's 'front' forces it (true), drops it (false), or cuts it from another sprite in column pieces
({"masque": "bridge-rail", "pieces": 4}: bake_wide.py's bridge rail, each piece at its own foot's depth)."""
import argparse, functools, json, os, re, sys, time
import numpy as np
from PIL import Image

TOOLS = os.path.dirname(os.path.abspath(__file__))
ART = os.path.join(TOOLS, "village-art")
MOD = os.path.join(os.path.dirname(TOOLS), "mods", "world-of-codecraft")
MARGE = 32  # px each side of a front's box where a unit's feet make it overlap (a hero sprite's half width)

ap = argparse.ArgumentParser(description="Bake a map's art from its layout, one look.")
ap.add_argument("layout")
ap.add_argument("--look", default="ete", help="a look of village-art/theme.py LOOKS (default ete)")
ap.add_argument("--racine", default=MOD, help="output root: art/<id>-<look>/ and carte-<id>-data.js (default the mod)")
args = ap.parse_args()
LAYOUT, RACINE = os.path.abspath(args.layout), os.path.abspath(args.racine)
os.environ["THEME"] = args.look  # read by the village-art modules on import
os.chdir(ART)
sys.path[:0] = [ART, TOOLS]
import theme  # noqa: E402
import compose as C  # noqa: E402
import compose2 as C2  # noqa: E402
import compose3 as C3  # noqa: E402
import buildings  # noqa: E402
from mapbake.carte import charger, Erreur  # noqa: E402
from mapbake.sol import sol  # noqa: E402
from mapbake.objets import objets, disperser  # noqa: E402
from mapbake.verif import modeles, verifier, marchable  # noqa: E402

C3.load = functools.lru_cache(maxsize=None)(C.load)  # receive() loads every caster's PNG for every receiver

t0 = time.time()
try:
    c = charger(LAYOUT)
    ground, kind, _eau = sol(c)
    O = objets(c)
    modeles(c, O, C2.META, buildings.B)
    O += disperser(c, kind, O)
    verifier(c, O, kind)
except Erreur as e:
    sys.exit(f"{args.layout}: the layout fails its checks:\n{e}")
m = c["monde"]
X0, W, H, N, S = m["x"], m["w"], m["h"], m["nord"], m["sud"]
print(f"{len(O)} objects, ground and checks in {time.time() - t0:.0f}s")

# canvas px: column u - X0, row v + N
objs = [(o["nom"], o["u"] - X0, o["v"] + N, o["dp"], {}) for o in O]
t1 = time.time()
day = C3.compose_sol(ground, False, objs, [])
night = C3.compose_sol(ground, True, objs, [])
print(f"composited day and night in {time.time() - t1:.0f}s")

OUT = os.path.join(RACINE, "art", f"{c['id']}-{theme.LOOK_ID}")
os.makedirs(OUT, exist_ok=True)
for f in os.listdir(OUT):
    if re.match(r"(jour|nuit|nord|sud|avant)-.*\.png$|minicarte\.png$", f):
        os.remove(os.path.join(OUT, f))


def save2(arr, path):
    Image.fromarray(arr).resize((arr.shape[1] * 2, arr.shape[0] * 2), Image.NEAREST).save(path, optimize=True)


tiles = []
for k, x in enumerate(range(X0, X0 + W, c["tuile"])):
    a, b = x - X0, min(W, x - X0 + c["tuile"])
    for tag, img in (("jour", day), ("nuit", night)):
        save2(img[N:N + H, a:b], os.path.join(OUT, f"{tag}-{k}.png"))
        save2(img[:N, a:b], os.path.join(OUT, f"nord-{k}-{tag}.png"))
        save2(img[N + H:, a:b], os.path.join(OUT, f"sud-{k}-{tag}.png"))
    tiles.append({"k": k, "x": x, "w": b - a})
Image.fromarray(day[N:N + H]).resize((448, round(448 * H / W)), Image.LANCZOS).save(os.path.join(OUT, "minicarte.png"), optimize=True)

# ------------------------------------------------------------------ front cut-outs

if "heros" in c:
    vv, uu = np.mgrid[0:H, X0:X0 + W]
    pas = np.pad(marchable(c, kind, O, uu, vv).astype(np.int32), ((1, 0), (1, 0))).cumsum(0).cumsum(1)


def foule(u0, u1, v0, v1):
    """Walkable feet points with u0 <= u < u1 and v0 <= v < v1 (map px, the village band)."""
    a, b = max(0, u0 - X0), min(W, u1 - X0)
    r0, r1 = max(0, v0), min(H, v1)
    return a < b and r0 < r1 and pas[r1, b] - pas[r0, b] - pas[r1, a] + pas[r0, a] > 0


fronts = []
seen = {}


def cut(key, mask, x0, y0, z):
    """A cut-out of the composite under mask (alpha placed at map px x0, y0), kept to the village band; its box is
    the mask's box (a whole sprite) or its alpha's (a piece)."""
    fronts.append({"key": key, "x": x0, "y": y0, "w": mask.shape[1], "h": mask.shape[0], "z": int(z)})
    for tag, img in (("jour", day), ("nuit", night)):
        im = np.zeros(mask.shape + (4,), np.uint8)
        im[..., :3] = img[N + y0:N + y0 + mask.shape[0], x0 - X0:x0 - X0 + mask.shape[1]]
        im[..., 3] = np.where(mask, 255, 0)
        save2(im, os.path.join(OUT, f"avant-{key}-{tag}.png"))


def bande(name, u, v):
    """A sprite's alpha placed at its anchor (u, v), clipped to the village band: (mask, x0, y0) or None."""
    mm = C2.META[name]
    a = C3.load(name)[..., 3] > 0
    x0, y0 = u - mm["ax"], v - mm["ay"]
    xs0, ys0, xs1, ys1 = max(X0, x0), max(0, y0), min(X0 + W, x0 + a.shape[1]), min(H, y0 + a.shape[0])
    if xs1 <= xs0 or ys1 <= ys0:
        return None
    return a[ys0 - y0:ys1 - y0, xs0 - x0:xs1 - x0], xs0, ys0


for o in O:
    if o["front"] is False:
        continue
    name, u, v, z = o["nom"], o["u"], o["v"], o["v"] + o["dp"]
    b = bande(name, u, v)
    if b is None:
        continue
    mask, x0, y0 = b
    if o["front"] is None:
        if "heros" in c:
            if not foule(x0 - MARGE, x0 + mask.shape[1] + MARGE, y0 + 1, z - 3):
                continue
        elif v < H / 2:
            continue
    n = seen.get(name, 0)
    seen[name] = n + 1
    key = name[2:] + (f"-{n}" if n else "")
    if isinstance(o["front"], dict):  # another sprite (the rail alone), in column pieces at their feet's depth
        b = bande("b-" + o["front"]["masque"], u, v)
        if b is None:
            continue
        mask, x0, y0 = b
        for j, cols in enumerate(np.array_split(np.nonzero(mask.any(0))[0], o["front"].get("pieces", 1))):
            piece = np.zeros_like(mask)
            piece[:, cols] = mask[:, cols]
            ys, xs = np.nonzero(piece)
            sub = piece[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
            cut(f"{key}-{j}", sub, x0 + int(xs.min()), y0 + int(ys.min()), y0 + ys.max() + 4)
    else:
        cut(key, mask, x0, y0, z)

js = os.path.join(RACINE, f"carte-{c['id']}-data.js")
with open(js, "w") as f:
    f.write(f"// Generated by tools/bake_map.py from maps/{os.path.basename(LAYOUT)} (the same for every look). Do not edit: re-bake.\n")
    f.write(f"export const WORLD = {json.dumps({'x': X0, 'w': W, 'h': H})};\n")
    f.write(f"export const TILES = {json.dumps(tiles)};\n")
    f.write("// front cut-outs: drawn above any unit whose depth (feet y + 3) is below z and that overlaps it\n")
    f.write("export const FRONTS = [\n" + ",\n".join("  " + json.dumps(fr) for fr in fronts) + "\n];\n")
    f.write("// the immersive bands: their heights, a tile under each world tile\n")
    f.write(f"export const EXT = {json.dumps({'nord': N, 'sud': S, 'tiles': [{'k': t['k'], 'x': t['x']} for t in tiles]})};\n")
print(f"ok: {len(tiles)} tiles, {len(fronts)} fronts into {OUT}, {js}; {time.time() - t0:.0f}s in all")
