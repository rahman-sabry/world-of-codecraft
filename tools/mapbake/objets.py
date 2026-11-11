"""The objects of a layout: buildings (and landmarks), props, fence runs and seeded scatter, each a record
{nom: 'b-<model>', u, v (map px, its anchor), dp (depth bias: drawn at v + dp), role, sur, box, front, ou}, and their
ground boxes (emprise) for the scatter and the checks."""
import functools, json
import numpy as np
from PIL import Image
from theme import LOOK, LOOKS
from .carte import w2s, s2w, point_cloture
from .sol import GRASS


def _racine():
    """The look whose sprites give the boxes: the root of the base chain (winter sprites are cut to summer's boxes, but
    its bare trees are thinner), so every look of a map places the same scatter."""
    look = LOOK
    while look["base"]:
        look = LOOKS[look["base"]]
    return look["assets"]


@functools.lru_cache(maxsize=None)
def emprise(nom):
    """A model's ground box (du0, dv0, du1, dv1) from its anchor, map px: its opaque pixels at or below the anchor row
    (the front half of its footprint) mirrored above it."""
    meta = json.load(open(_racine() + "meta.json"))[nom]
    a = np.asarray(Image.open(_racine() + nom + ".png"))[::2, ::2, 3] > 0
    ys, xs = np.nonzero(a[meta["ay"]:])
    if not len(ys):
        return (-2, -2, 2, 2)
    b = int(ys.max()) + 1
    return (int(xs.min()) - meta["ax"], -b, int(xs.max()) + 1 - meta["ax"], b)


def rect(o):
    du0, dv0, du1, dv1 = emprise(o["nom"])
    return (o["u"] + du0, o["v"] + dv0, o["u"] + du1, o["v"] + dv1)


def inter(a, b):
    return a[0] < b[2] and b[0] < a[2] and a[1] < b[3] and b[1] < a[3]


def dans(u, v, zones):
    return any(u0 <= u <= u1 and v0 <= v <= v1 for u0, u1, v0, v1 in zones)


def objets(c):
    """The layout's explicit objects and fence runs, in the layout's order. A run is n segments of '<modele>-<axe>'
    (default the fence) 'pas' iso units apart along its axis, with its own 'sur' and 'front' (as an object's)."""
    O = []
    for ob in c["batiments"] + c["props"]:
        O.append(dict(nom="b-" + ob["modele"], u=ob["u"], v=ob["v"], dp=ob["dp"], role=ob["role"],
                      sur=ob.get("sur", []), box=ob.get("box"), front=ob.get("front"),
                      ou=f"{ob['role']} {ob['modele']} at ({ob['u']}, {ob['v']})"))
    o = c["origine"]
    for i, f in enumerate(c["clotures"]):
        x, y = s2w(*point_cloture(f, o), o)
        for k in range(f["n"]):
            t = k * f.get("pas", 44)
            u, v = w2s(x + t, y, o) if f["axe"] == "x" else w2s(x, y + t, o)
            O.append(dict(nom=f"b-{f.get('modele', 'fence')}-{f['axe']}", u=int(round(u)), v=int(round(v)), dp=2,
                          role="cloture", sur=f.get("sur", []), box=None, front=f.get("front"),
                          ou=f"clotures[{i}] post {k} at ({int(round(u))}, {int(round(v))})"))
    return O


def disperser(c, kind, O):
    """The seeded scatter bands: per band, 'essais' draws in its zone [u0, u1, v0, v1] (map px) of a model (weighted),
    kept when a draw under its density passes, the ground round the base is all grass ('herbe' [r, up]: r px each way,
    r / 2 down, max(up, r / 2) up: a crown hides the ground above its trunk), it is out of every keep-out, 'espacement'
    [du, dv] from every object placed so far (explicit ones included, across bands) and its box clear of every
    building's; up to 'max'. 'densite' is a number, or [top, bottom] across the zone."""
    m = c["monde"]
    x0, N = m["x"], m["nord"]
    placed = [(o["u"], o["v"]) for o in O]
    blocs = [rect(o) for o in O if o["role"] == "batiment"]

    def herbe(u, v, r, up):
        cc, w = u - x0, v + N
        win = kind[max(0, w - max(up, r // 2)):w + r // 2 + 1, max(0, cc - r):cc + r + 1]
        return win.size > 0 and bool((win == GRASS).all())

    out = []
    for i, d in enumerate(c["dispersions"]):
        rng = np.random.default_rng(d["graine"])
        noms = list(d["modeles"])
        p = np.array([d["modeles"][n] for n in noms], float)
        p /= p.sum()
        u0, u1, v0, v1 = d["zone"]
        du, dv = d.get("espacement", [40, 18])
        r, up = d.get("herbe", [16, 0])
        dens = d.get("densite", 1.0)
        excl = c["exclusions"] + d.get("exclusions", [])
        n = 0
        for k in range(d["essais"]):
            u, v = int(rng.integers(u0, u1)), int(rng.integers(v0, v1))
            nom = "b-" + noms[rng.choice(len(noms), p=p)]
            seuil = dens if isinstance(dens, (int, float)) else dens[0] + (dens[1] - dens[0]) * (v - v0) / max(1, v1 - v0)
            if rng.random() > seuil or dans(u, v, excl) or not herbe(u, v, r, up):
                continue
            if any(abs(u - pu) < du and abs(v - pv) < dv for pu, pv in placed):
                continue
            o = dict(nom=nom, u=u, v=v, dp=d.get("dp", 6), role="dispersion", sur=[], box=None, front=None, excl=excl,
                     ou=f"dispersions[{i}] {nom[2:]} at ({u}, {v})")
            if any(inter(rect(o), b) for b in blocs):
                continue
            placed.append((u, v))
            out.append(o)
            n += 1
            if n >= d.get("max", n + 1):
                break
        print(f"dispersions[{i}]: {n} placed of {d['essais']} draws")
    return out
