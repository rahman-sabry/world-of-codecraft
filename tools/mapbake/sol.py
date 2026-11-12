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
from extras import oasis_sable, oasis_dune, oasis_dur, oasis_dalles, oasis_piste
from theme import LOOK
import forge
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
    # Emberdeep (maps/forge.json, village-art/forge.py): flagstones, the worn road, and lava (bloque: never walkable;
    # lave: its crust rim and rock face, lit over the bakes by bake_map.py)
    "forge-dalles": dict(i=7, bruit=0.8),
    "forge-chemin": dict(i=8, bruit=0.8, interdit=True),
    "forge-lave": dict(i=9, bruit=0.5, interdit=True, bloque=True, lave=True),
    # the oasis (40-49): cracked hardpan, the dunes, the green bank round the pool (the summer grass's texture)
    "oasis-dur": dict(i=40, bruit=0.8),
    "oasis-dune": dict(i=41, bruit=0.0),
    "oasis-herbe": dict(i=42, bruit=0.6),
}
NOMS = {k["i"]: n for n, k in KINDS.items()}
TEX = {}  # kind -> f(x, y, sx, sy, macro): RGB float, for kinds extras.ground_tex does not know
TEX.update(forge.TEX)  # also look variants: a kind's LOOK["sol"] variant named here wins over the kind's texture
# (also the look variants a look's sol names, when TEX knows them: the oasis's desert over the grass, its track, its flags)
TEX.update({"oasis-dur": oasis_dur, "oasis-dune": oasis_dune, "oasis-herbe": functools.partial(ground_tex, "grass"),
            "oasis-sable": oasis_sable, "oasis-piste": oasis_piste, "oasis-dalles": oasis_dalles})
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
            tex = TEX.get(LOOK["sol"].get(name)) or TEX.get(name) or functools.partial(ground_tex, name)
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
    g = np.isin(kind, [GRASS] + kinds_ou("pousse"))  # grass and the kinds that grow like it: no edge between them
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
    for i in kinds_ou("lave"):
        forge.lave_bords(out, kind == i, ~np.isin(kind, kinds_ou("lave")), u, v)
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


# ---------------------------------------------------------------- Sylvaren Grove (maps/bosquet.json)
# Its own kinds (indexes 70+): the forest floor's moss and its leaf litter (both grow like grass: scatter stands on them,
# 'pousse', and grass takes no edge over them), the winding flagstone paths (nothing stands on them) and the square's
# flagstones ('parvis', open ground for the stalls). Autumn leaves fall on them; in the spring look (theme.py sol grass
# "bosquet-printemps") they are fresher, strewn with blossom instead.
from engine import ramp  # noqa: E402

KINDS["bosquet-mousse"] = dict(i=70, bruit=0.8, pousse=True)
KINDS["bosquet-feuilles"] = dict(i=71, bruit=1.0, pousse=True)
KINDS["bosquet-dalles"] = dict(i=72, bruit=0.6, interdit=True)
KINDS["bosquet-parvis"] = dict(i=73, bruit=0.6)  # the same flagstones, open ground: a square stalls stand on
NOMS.update({k["i"]: n for n, k in KINDS.items()})
_PRINTEMPS = LOOK["sol"].get("grass") == "bosquet-printemps"
_MO = ramp("#4f8c34" if _PRINTEMPS else "#4a7430", hs=28, light=1.3, dark=0.3)
_MO2 = ramp("#3f7a3a" if _PRINTEMPS else "#3c6434", hs=28, light=1.3, dark=0.3)
_SOIL = ramp("#6a5034", hs=22)
_PIERRE = ramp("#a8a292", hs=18, light=1.22)
_TOMBEES = np.stack([ramp(c, hs=22, light=1.3) for c in (("#f0a8c0", "#f6eef0", "#e88aa8", "#f8f0e8") if _PRINTEMPS
                                                         else ("#a8402a", "#c8702a", "#d8a636", "#8a5a30"))])
# leaf layers: cell size, share of empty cells, leaf half length and half width (iso units)
_COUCHES = ((2.6, 0.75, 1.0, 0.7), (2.2, 0.85, 0.9, 0.6)) if _PRINTEMPS else ((2.6, 0.2, 1.6, 0.85), (2.2, 0.3, 1.4, 0.75))


def _i(a):
    return np.floor(a).astype(np.int64)


def _parsemer(col, x, y, sx, sy, seuil, graine):
    """Single fallen leaves (autumn) or petals (spring) sprinkled over a ground, one iso unit each."""
    on = hash3(_i(x), _i(y), _i(x) * 0, graine) > seuil
    if on.any():
        k = (hash3(_i(x[on]), _i(y[on]), _i(x[on]) * 0, graine + 1) * 4).astype(int) % 4
        lv = np.clip(np.round(3.6 + BAYER[sy[on] % 4, sx[on] % 4] * 0.6), 0, 6).astype(int)
        col[on] = _TOMBEES[k, lv]
    return col


def _mousse(x, y, sx, sy, macro=0):
    """Moss: soft cushions (lit tops, shaded hollows) in two greens, a few leaves fallen on it."""
    n = vnoise2(x, y, 9, 201) * 1.3 + vnoise2(x, y, 4, 202) * 0.8 + vnoise2(x, y, 2, 203) * 0.4
    c = vnoise2(x, y, 3, 204)
    lv = 1.9 + n + macro * 0.8 + (c > 0.62) * 0.9 - (c < 0.3) * 0.6 + BAYER[sy % 4, sx % 4] * 0.35
    idx = np.clip(np.round(lv), 0, 6).astype(int)
    col = np.where((vnoise2(x, y, 14, 205) > 0.55)[..., None], _MO2[idx], _MO[idx])
    return _parsemer(col, x, y, sx, sy, 0.994 if _PRINTEMPS else 0.985, 206)


def _feuilles(x, y, sx, sy, macro=0):
    """Leaf litter: two layers of small leaves (each an ellipse, lit at one end) over dark soil; spring: moss with
    petals fallen over it, sparser."""
    if _PRINTEMPS:
        col = _mousse(x, y, sx, sy, macro)
    else:
        lv = 1.8 + vnoise2(x, y, 6, 221) * 1.2 + macro * 0.5 + BAYER[sy % 4, sx % 4] * 0.3
        col = _SOIL[np.clip(np.round(lv), 0, 6).astype(int)]
    for s, (c, vide, la, lb) in enumerate(_COUCHES):
        gx, gy = _i((x + s * 1.3) / c), _i((y + s * 0.7) / c)
        z = gx * 0 + s
        cx = (gx + 0.2 + 0.6 * hash3(gx, gy, z, 222)) * c - s * 1.3
        cy = (gy + 0.2 + 0.6 * hash3(gx, gy, z, 223)) * c - s * 0.7
        a = hash3(gx, gy, z, 224) * np.pi
        dx, dy = x - cx, y - cy
        p, q = dx * np.cos(a) + dy * np.sin(a), -dx * np.sin(a) + dy * np.cos(a)
        on = ((p / la) ** 2 + (q / lb) ** 2 < 1) & (hash3(gx, gy, z, 225) > vide)
        k = (hash3(gx, gy, z, 226) * 4).astype(int) % 4
        lv = np.clip(np.round(3.2 + p * 0.7 - (q > 0.3) * 0.8 + BAYER[sy % 4, sx % 4] * 0.5), 0, 6).astype(int)
        col = np.where(on[..., None], _TOMBEES[k, lv], col)
    return col


def _dalles(x, y, sx, sy, macro=0):
    """Flagstones: irregular pale stones (the nearest of jittered points, 6 units apart), each its own shade, lit
    towards the top left, dark joints with moss in them, a few leaves or petals on the stones."""
    s = 6.0
    gx, gy = _i(x / s), _i(y / s)
    d1 = np.full(x.shape, np.inf); d2 = np.full(x.shape, np.inf)
    ident = np.zeros(x.shape); ox = np.zeros(x.shape); oy = np.zeros(x.shape)
    for i in (-1, 0, 1):
        for j in (-1, 0, 1):
            ax, ay = gx + i, gy + j
            cx = (ax + 0.15 + 0.7 * hash3(ax, ay, ax * 0, 211)) * s
            cy = (ay + 0.15 + 0.7 * hash3(ax, ay, ax * 0, 212)) * s
            d = np.hypot(x - cx, y - cy)
            neuf = d < d1
            d2 = np.where(neuf, d1, np.minimum(d2, d))
            ident = np.where(neuf, hash3(ax, ay, ax * 0, 213), ident)
            ox = np.where(neuf, x - cx, ox); oy = np.where(neuf, y - cy, oy)
            d1 = np.where(neuf, d, d1)
    bord = d2 - d1
    lv = 3.0 + (ident - 0.5) * 1.5 + macro * 0.5 + (vnoise2(x, y, 3, 214) - 0.5) * 0.7
    lv = lv + np.where(bord < 1.8, np.where(ox + oy < 0, 0.7, -0.6), 0) + BAYER[sy % 4, sx % 4] * 0.3
    joint = bord < 0.75
    col = _PIERRE[np.clip(np.round(np.where(joint, 0.6, lv)), 0, 6).astype(int)]
    moss = joint & (vnoise2(x, y, 5, 215) > 0.42)
    col[moss] = _MO[np.clip(np.round(1.6 + BAYER[sy[moss] % 4, sx[moss] % 4] * 0.6), 0, 6).astype(int)]
    return _parsemer(col, x, y, sx, sy, 0.993 if _PRINTEMPS else 0.988, 216)


TEX.update({"bosquet-mousse": _mousse, "bosquet-feuilles": _feuilles, "bosquet-dalles": _dalles, "bosquet-parvis": _dalles})
