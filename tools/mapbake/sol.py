"""The ground of a layout: its kind map from parametric shapes, textured as compose2.ground textures Valbrume's.

Shapes are painted in the layout's order (a later one wins), each a signed distance on the iso ground (negative
inside) plus edge noise:
  ligne     a polyline (map px points), half width 'demi': roads, paths, rivers
  boite     a box on the iso axes around a centre (map px), half sizes 'demi' [x, y]: squares, fields
  ellipse   an ellipse on the iso axes around a centre (map px), radii 'demi' [x, y]: lakes
  polygone  a closed polygon (map px points): lakes, seas, any outline
'bruit' scales the small edge noise (default: the kind's), 'rivage' adds a slow shore wobble of that amplitude
(iso units; bake_wide's lake used 24). Water kinds merge into one distance field for the banks, foam and shallows."""
import functools
import numpy as np
from compose import seg_dist
from engine import vnoise2, hash3, BAYER, hx
from extras import ground_tex, DR, WR
from theme import LOOK
from .carte import s2w, Erreur

# The ground kinds: index in the kind map, default edge noise, and what the edges do: interdit (nothing stands on it:
# roads, water), eau (one water distance field: bank, foam, shallows; no grass overhang), sillon (a dark top edge,
# fields). A new kind (sand, a sea shore) is an entry here and, unless extras.ground_tex knows it, a texture in TEX.
KINDS = {
    "grass": dict(i=0, bruit=0.0),
    "dirt": dict(i=1, bruit=1.0, interdit=True),
    "paved": dict(i=2, bruit=1.0),
    "water": dict(i=3, bruit=0.4, eau=True, interdit=True),
    "crop": dict(i=4, bruit=0.0, sillon=True),
}
NOMS = {k["i"]: n for n, k in KINDS.items()}
TEX = {}  # kind -> f(x, y, sx, sy, macro): RGB float, for kinds extras.ground_tex does not know
GRASS = KINDS["grass"]["i"]


def kinds_ou(flag):
    return [k["i"] for k in KINDS.values() if k.get(flag)]


def grille(c):
    """The canvas in map px (u columns, v rows: the north band, the village band, the south band) and in iso."""
    m = c["monde"]
    v, u = np.mgrid[-m["nord"]:m["h"] + m["sud"], m["x"]:m["x"] + m["w"]]
    x, y = s2w(u + 0.5, v + 0.5, c["origine"])
    return u, v, x, y


def _ligne(x, y, pts):
    d = np.full(x.shape, np.inf)
    for a, b in zip(pts[:-1], pts[1:]):
        d = np.minimum(d, seg_dist(x, y, a, b))
    return d


def _polygone(x, y, pts):
    d = _ligne(x, y, pts + pts[:1])
    dedans = np.zeros(x.shape, bool)
    for (ax, ay), (bx, by) in zip(pts, pts[1:] + pts[:1]):
        if ay == by:
            continue
        dedans ^= ((ay > y) != (by > y)) & (x < (bx - ax) * (y - ay) / (by - ay) + ax)
    return np.where(dedans, -d, d)


def distance(s, x, y, o):
    """A shape's signed distance on the iso ground (negative inside), before noise."""
    iso = lambda p: s2w(p[0], p[1], o)
    if "ligne" in s:
        return _ligne(x, y, [iso(p) for p in s["ligne"]]) - s["demi"]
    if "polygone" in s:
        return _polygone(x, y, [iso(p) for p in s["polygone"]])
    cx, cy = iso(s["boite"] if "boite" in s else s["ellipse"])
    a, b = s["demi"]
    if "boite" in s:
        return np.maximum(np.abs(x - cx) - a, np.abs(y - cy) - b)
    return (np.hypot((x - cx) / a, (y - cy) / b) - 1) * min(a, b)


def sol(c):
    """The textured ground (RGB float), the kind map and the water distance (iso units, negative in water)."""
    u, v, x, y = grille(c)
    nz = (vnoise2(x, y, 6, 51) - 0.5) * 5 + (vnoise2(x, y, 2.5, 52) - 0.5) * 2
    kind = np.zeros(u.shape, int)
    eau = np.full(u.shape, np.inf, np.float32)
    for i, s in enumerate(c["sol"]):
        if s["sol"] not in KINDS:
            raise Erreur(f"sol[{i}]: unknown ground kind {s['sol']!r} (known: {', '.join(KINDS)})")
        k = KINDS[s["sol"]]
        d = distance(s, x, y, c["origine"]) + s.get("bruit", k["bruit"]) * nz
        if s.get("rivage"):
            d = d + (vnoise2(x, y, 40, 63) - 0.5) * s["rivage"]
        kind[d < 0] = k["i"]
        if k.get("eau"):
            eau = np.minimum(eau, d)
    # textures per kind, two offset draws mixed by a slow noise (compose2.ground)
    out = np.zeros(u.shape + (3,), np.float32)
    mac_all = (vnoise2(x, y, 70, 91) - 0.5) * 1.8 + (vnoise2(x, y, 23, 92) - 0.5) * 0.9
    for name, k in KINDS.items():
        m = kind == k["i"]
        if m.any():
            tex = TEX.get(name) or functools.partial(ground_tex, name)
            mac = mac_all[m]
            t1 = tex(x[m], y[m], u[m], v[m], macro=mac)
            t2 = tex(x[m] + 11, y[m] + 19, u[m], v[m], macro=mac)
            out[m] = np.where((vnoise2(x[m], y[m], 30, 93) > 0.5)[:, None], t1, t2)
    # the look's grass tint: dry patches and lush hollows
    g = kind == GRASS
    hue = vnoise2(x, y, 55, 94) - 0.5
    dry, lush = np.array(LOOK["herbe"]["sec"]), np.array(LOOK["herbe"]["dru"])
    tint = np.where((hue > 0)[..., None], 1 + (dry - 1) * np.clip(hue * 2.4, 0, 1)[..., None], 1 + (lush - 1) * np.clip(-hue * 2.4, 0, 1)[..., None])
    out[g] = out[g] * tint[g]
    # warm sun / cool sky: soft cloud light, quantised and dithered
    q = np.floor((vnoise2(x, y, 120, 95) - 0.5) * 6 + BAYER[v % 4, u % 4] * 0.8) / 6
    out = out * (1 + q[..., None] * np.array([0.10, 0.08, 0.04]))
    if LOOK["fleurs"]:
        fl = g & (hash3(np.floor(x).astype(np.int64), np.floor(y).astype(np.int64), np.zeros_like(u), 77) > 0.996)
        cols = np.array([hx("#f4e9c8"), hx("#f2c94c"), hx("#d86a8a"), hx("#9fb6ff")], np.float32)
        out[fl] = cols[(hash3(u[fl], v[fl], v[fl] * 0, 3) * 4).astype(int) % 4]
    # edges: grass overhanging the other kinds (but water), its lit blade tips, banks, foam and shallows, field tops
    eaux = np.isin(kind, kinds_ou("eau"))
    border = ~g & (np.roll(g, 1, 0) | np.roll(g, 2, 0)) & ~eaux
    out[border] = out[border] * 0.82
    over_ = g & ~np.roll(g, -1, 0) & (hash3(u, v, u * 0, 5) > 0.5)
    lip = np.roll(over_, 1, 0) & ~g
    out[lip] = out[lip] * 0.6 + np.array(hx(LOOK["herbe"]["brins"])) * 0.4
    bank = ~eaux & (eau >= 0) & (eau < 2.2)
    out[bank] = DR[1]
    foam = eaux & (eau > -1.6)
    out[foam] = WR[6] * 0.9
    sh = eaux & (eau <= -1.6) & (eau > -7)
    out[sh] = out[sh] * 0.72 + WR[5] * 0.28
    for i in kinds_ou("sillon"):
        fe = (kind == i) & ~(np.roll(kind, 1, 0) == i)
        out[fe] = DR[1]
    return np.clip(out, 0, 255), kind, eau
