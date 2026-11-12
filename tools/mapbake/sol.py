"""The ground of a layout: its kind map from parametric shapes, textured as compose2.ground textures Valbrume's.

Shapes are painted in the layout's order (a later one wins), each a signed distance on the iso ground (negative
inside) plus edge noise:
  ligne     a polyline (map px points), half width 'demi': roads, paths, rivers
  boite     a box on the iso axes around a centre (map px), half sizes 'demi' [x, y]: squares, fields
  ellipse   an ellipse on the iso axes around a centre (map px), radii 'demi' [x, y]: lakes
  polygone  a closed polygon (map px points): lakes, seas, any outline
'bruit' scales the small edge noise (default: the kind's), 'rivage' adds a slow shore wobble of that amplitude
(iso units; bake_wide's lake used 24). Water kinds merge into one distance field for the banks, foam and shallows; a
land shape painted after a water one pulls that field back to its own edge (a headland over the sea gets a shore).
The sea has its own edge: a white surf line, broken foam further out and turquoise shallows fading into the deep
(winter, 'froide': ice along its edges, open water beyond); sand turns wet and dark at the waterline."""
import functools
import numpy as np
from compose import seg_dist
from engine import vnoise2, hash3, BAYER, hx
from extras import ground_tex, sable_mouille, DR, WR, SH, EC
from theme import LOOK
from .carte import s2w, Erreur

# The ground kinds: index in the kind map, default edge noise, and what the edges do: interdit (nothing stands on it:
# roads, water), eau (one water distance field: bank, foam, shallows; no grass overhang), mer (the sea's own surf and
# shallows), plage (wet at the waterline instead of a dark bank), sillon (a dark top edge, fields). A new kind is an
# entry here and, unless extras.ground_tex knows it, a texture in TEX.
KINDS = {
    "grass": dict(i=0, bruit=0.0),
    "dirt": dict(i=1, bruit=1.0, interdit=True),
    "paved": dict(i=2, bruit=1.0),
    "water": dict(i=3, bruit=0.4, eau=True, interdit=True),
    "crop": dict(i=4, bruit=0.0, sillon=True),
    "sand": dict(i=5, bruit=0.6, plage=True),
    "sea": dict(i=6, bruit=0.3, eau=True, interdit=True, mer=True),
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
        elif np.isfinite(eau).any():
            eau = np.maximum(eau, -d)
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
    plage = np.isin(kind, kinds_ou("plage"))
    bank = ~eaux & ~plage & (eau >= 0) & (eau < 2.2)
    out[bank] = DR[1]
    mouille = plage & (eau >= 0) & (eau < 3 + vnoise2(x, y, 9, 64) * 5)
    if mouille.any():
        out[mouille] = sable_mouille(x[mouille], y[mouille], u[mouille], v[mouille], macro=mac_all[mouille])
    mer = np.isin(kind, kinds_ou("mer"))
    foam = eaux & ~mer & (eau > -1.6)
    out[foam] = WR[6] * 0.9
    sh = eaux & ~mer & (eau <= -1.6) & (eau > -7)
    out[sh] = out[sh] * 0.72 + WR[5] * 0.28
    if mer.any():
        rivage_mer(out, mer, -eau, x, y, u, v)
    for i in kinds_ou("sillon"):
        fe = (kind == i) & ~(np.roll(kind, 1, 0) == i)
        out[fe] = DR[1]
    return np.clip(out, 0, 255), kind, eau


def rivage_mer(out, mer, d, x, y, u, v):
    """The sea's edge, d its depth from the shore (iso units: a screen px down a level shore is 1.4 of them):
    turquoise shallows fading out to 60 and the deep darkening past 120, in dithered steps; a wet sheen, broken foam
    lines out to 16 and the white surf at the shore; winter ('froide'), ice from the shore out to 7-17 with a white
    rim, then the same edge beyond it."""
    b = BAYER[v % 4, u % 4]
    if LOOK["sol"].get("sea") == "froide":
        bord = 7 + vnoise2(x, y, 11, 66) * 10
        glace = mer & (d < bord)
        out[glace] = ground_tex("water", x[glace], y[glace], u[glace], v[glace])
        rim = mer & (d >= bord) & (d < bord + 1.6)
        out[rim] = EC[6]
        d = np.where(mer & (d >= bord), d - bord + 1.6, np.inf)
    df = np.where(np.isfinite(d), d, 0)
    k = np.floor(np.clip(1 - d / 60, 0, 1) * 5 + b * 0.9) / 5
    s = mer & (k > 0)
    out[s] = out[s] * (1 - 0.7 * k[s, None]) + SH[4] * 0.7 * k[s, None]
    f = np.floor(np.clip((df - 120) / 260, 0, 1) * 4 + b * 0.9) / 4
    s = mer & np.isfinite(d) & (f > 0)
    out[s] = out[s] * (1 - 0.22 * f[s, None])
    lisse = mer & (d >= 4) & (d < 6.5)
    out[lisse] = out[lisse] * 0.55 + SH[5] * 0.45
    ligne = np.sin(df * 0.9 - vnoise2(x, y, 14, 65) * 6)
    ecume = mer & (d >= 6.5) & (d < 16) & (ligne > 0.55 + (d - 6.5) * 0.04) & (hash3(u, v, u * 0, 67) > 0.25)
    out[ecume] = EC[np.clip(np.round(4 + b[ecume] * 0.8 + (ligne[ecume] > 0.85)), 0, 6).astype(int)]
    surf = mer & (d < 4)
    out[surf] = EC[np.clip(np.round(5 + b[surf] * 0.9 - (d[surf] > 2.6)), 0, 6).astype(int)]


# ---------------------------------------------------------------- Highpass Hold (maps/col.json): mountain ground
# Granite slabs (col-roc), scree (col-eboulis), a gravel road (col-gravier) and a fast stream (col-torrent, one of the
# water kinds: its banks, foam and shallows). Winter (theme.py LOOKS hiver sol): snow with the rock and stones showing
# through, packed snow over the gravel, the stream iced at its edges with open water in its channel. Kind ids 90-99.
from engine import ramp  # noqa: E402
from extras import GR  # noqa: E402  (snow in winter)
from tex import ICE_RAMP  # noqa: E402

KINDS.update({
    "col-roc": dict(i=90, bruit=1.4),
    "col-eboulis": dict(i=91, bruit=1.2),
    "col-gravier": dict(i=92, bruit=0.8, interdit=True),
    "col-torrent": dict(i=93, bruit=0.5, eau=True, interdit=True),
})
NOMS.update({k["i"]: n for n, k in KINDS.items()})
RK = ramp("#8a8890", hs=16, light=1.26)
GV = ramp("#a89f90", hs=18, light=1.2)
TR = ramp("#3a8aae", hs=12, light=1.4, dark=0.32)
_P = 32


def _i(a):
    return np.floor(a).astype(np.int64)


def _neige(kind):
    return LOOK["sol"].get(kind) == "neige"


def _roc(x, y, sx, sy, macro=0):
    """Granite slabs: blocks of 9 iso units, each its own shade, dark joints with grass in some, lit rims."""
    gx = np.floor(x / 9); gy = np.floor((y + (gx % 2) * 4) / 9)
    fx, fy = x - gx * 9, (y + (gx % 2) * 4) - gy * 9
    z0 = np.zeros_like(_i(x))
    h = hash3(_i(gx) % 16, _i(gy) % 16, z0, 401)
    lv = 2.8 + (h - 0.5) * 1.6 + (vnoise2(x, y, 6, 402, _P) - 0.5) * 1.2 + macro * 0.5
    lv = lv + (fx < 1.2) * 0.9 + (fy < 1.2) * 0.6 - (fx > 7.8) * 0.9 - (fy > 7.8) * 0.7
    joint = (fx < 0.6) | (fy < 0.6) | (hash3(_i(x) % _P, _i(y) % _P, z0, 403) > 0.985)
    lv = np.where(joint, 0.5, lv) + BAYER[sy % 4, sx % 4] * 0.3
    c = RK[np.clip(np.round(lv), 0, 6).astype(int)]
    if _neige("col-roc"):
        snow = GR[np.clip(np.round(lv * 0.3 + 3.6 + BAYER[sy % 4, sx % 4] * 0.4), 0, 6).astype(int)]
        cover = joint | (vnoise2(x, y, 10, 405, _P) + (h - 0.5) * 0.5 > 0.42)
        return np.where(cover[..., None], snow, c)
    herbe = joint & (hash3(_i(gx) % 16, _i(gy) % 16, z0 + 1, 404) > 0.45)
    return np.where(herbe[..., None], GR[np.clip(np.round(lv + 1.6), 0, 6).astype(int)], c)


def _eboulis(x, y, sx, sy, macro=0):
    """Scree: stones of 3 iso units in staggered rows, lit on their top left, shadowed under, dark gaps."""
    s = 3.0
    z0 = np.zeros_like(_i(x))
    gx = np.floor(x / s)
    yy = y + hash3(_i(gx) % 32, z0, z0, 411) * s
    gy = np.floor(yy / s)
    fx, fy = x - gx * s, yy - gy * s
    h = hash3(_i(gx) % 32, _i(gy) % 32, z0, 412)
    lv = 3.0 + (h - 0.5) * 2.0 + macro * 0.5 + (fx + fy < 1.6) * 1.0 - (fx + fy > 4.2) * 1.2
    gap = (fx < 0.5) | (fy < 0.5)
    lv = np.where(gap, 0.6 + (vnoise2(x, y, 4, 413, _P) > 0.5) * 0.6, lv) + BAYER[sy % 4, sx % 4] * 0.3
    c = RK[np.clip(np.round(lv - 0.3), 0, 6).astype(int)]
    if _neige("col-eboulis"):
        snow = GR[np.clip(np.round(lv * 0.25 + 3.8 + BAYER[sy % 4, sx % 4] * 0.4), 0, 6).astype(int)]
        cover = gap | (vnoise2(x, y, 8, 414, _P) + (h - 0.5) * 0.4 > 0.38)
        return np.where(cover[..., None], snow, c)
    return c


def _gravier(x, y, sx, sy, macro=0):
    """A gravel road: fine grit, a few pebbles and darker ruts; winter: packed snow, the gravel in the ruts."""
    z0 = np.zeros_like(_i(x))
    h = hash3(_i(x * 2) % 64, _i(y * 2) % 64, z0, 421)
    lv = 3.0 + (vnoise2(x, y, 7, 422, _P) - 0.5) * 1.2 + macro * 0.5 + (h > 0.86) * 1.2 - (h < 0.12) * 1.1
    lv = lv - (vnoise2(x, y, 3, 423, _P) < 0.3) * 0.6 + BAYER[sy % 4, sx % 4] * 0.3
    c = GV[np.clip(np.round(lv), 0, 6).astype(int)]
    if _neige("col-gravier"):
        snow = GR[np.clip(np.round(lv * 0.5 + 2.4), 0, 6).astype(int)]
        return np.where((vnoise2(x, y, 6, 424, _P) < 0.34)[..., None], GV[np.clip(np.round(lv - 1), 0, 6).astype(int)], snow)
    return c


def _torrent(x, y, sx, sy, macro=0):
    """Fast water: streaks drawn long down the screen (the stream runs down it), white caps; winter: ice at its
    edges and over slow pools, open dark water down its channel."""
    st = vnoise2(sx.astype(np.float32), sy.astype(np.float32) / 7.0, 3, 431) * 0.75 + vnoise2(x, y, 6, 432, _P) * 0.25
    lv = 2.0 + (vnoise2(x, y, 12, 433, _P) - 0.5) * 1.2 + macro * 0.4 + (st > 0.6) * 1.4 + (st > 0.7) * 1.4
    lv = lv + BAYER[sy % 4, sx % 4] * 0.3
    c = np.where((st > 0.76)[..., None], EC[np.clip(np.round(lv - 1), 0, 6).astype(int)], TR[np.clip(np.round(lv), 0, 6).astype(int)])
    if LOOK["sol"].get("col-torrent") == "glace":
        ice = ICE_RAMP[np.clip(np.round(3.2 + (vnoise2(x, y, 9, 434, _P) > 0.6) * 1.4 + BAYER[sy % 4, sx % 4] * 0.3), 0, 6).astype(int)]
        ouvert = vnoise2(x, y, 14, 435, _P) > 0.52
        return np.where(ouvert[..., None], TR[np.clip(np.round(lv - 0.8), 0, 6).astype(int)], ice)
    return c


TEX.update({"col-roc": _roc, "col-eboulis": _eboulis, "col-gravier": _gravier, "col-torrent": _torrent})
