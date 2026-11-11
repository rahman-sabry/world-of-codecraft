"""The layout's checks, run on the kind map before anything is composited; every failure is listed, then the bake stops.
Also the walkable rule of the mod (lieux.js walkable()), for the hero spots and the front cut-outs."""
import numpy as np
from .carte import Erreur
from .objets import rect, inter, dans
from .sol import KINDS, kinds_ou

DECK_R = 14  # lieux.js: the deck is walkable within 14 px of its line


def dist_ligne(U, V, pts):
    """Distance (map px) from points to a polyline, as lieux.js toLine."""
    d = np.full(np.shape(U), np.inf)
    for (ax, ay), (bx, by) in zip(pts[:-1], pts[1:]):
        dx, dy = bx - ax, by - ay
        k = np.clip(((U - ax) * dx + (V - ay) * dy) / (dx * dx + dy * dy), 0, 1)
        d = np.minimum(d, np.hypot(ax + k * dx - U, ay + k * dy - V))
    return d


def boites(O):
    """The buildings' boxes for the walkable rule: their 'box' [du, dv, w, h] (the mod's hit box) or their emprise."""
    out = []
    for o in O:
        if o["role"] == "batiment":
            if o["box"]:
                du, dv, w, h = o["box"]
                out.append((o["u"] + du, o["v"] + dv, o["u"] + du + w, o["v"] + dv + h))
            else:
                out.append(rect(o))
    return out


def marchable(c, kind, O, U, V):
    """lieux.js walkable() on arrays of map px points: the deck; never water (the kind map, where the mod has its water
    shapes, EAU); the road; else near a stroll or work spot and outside every building's box."""
    h, m = c["heros"], c["monde"]
    U, V = np.asarray(U), np.asarray(V)
    r, cc = V + m["nord"], U - m["x"]
    dedans = (r >= 0) & (r < kind.shape[0]) & (cc >= 0) & (cc < kind.shape[1])
    eau = np.ones(U.shape, bool)
    eau[dedans] = np.isin(kind[r[dedans], cc[dedans]], kinds_ou("eau"))
    deck = dist_ligne(U, V, h["DECK"]) < DECK_R if len(h["DECK"]) >= 2 else np.zeros(U.shape, bool)
    route = dist_ligne(U, V, h["ROAD"]) < h["ROAD_R"] if len(h["ROAD"]) >= 2 else np.zeros(U.shape, bool)
    boite = np.zeros(U.shape, bool)
    for x0, y0, x1, y1 in boites(O):
        boite |= (U > x0) & (U < x1) & (V > y0) & (V < y1)
    pres = np.zeros(U.shape, bool)
    for su, sv in h["FLANE"] + h["SPOTS"]:
        pres |= np.hypot(U - su, V - sv) < h["SPOT_R"]
    return deck | (~eau & (route | (~boite & pres)))


def modeles(c, O, meta, registre):
    """Every model the layout names (objects, front masks, scatter) is in buildings.py's registry and built for the
    look (its meta.json); every 'sur' names a ground kind. Run before the scatter, which reads the sprites."""
    err = []
    noms = [(o["ou"], o["nom"][2:]) for o in O]
    noms += [(o["ou"], o["front"]["masque"]) for o in O if isinstance(o["front"], dict)]
    noms += [(f"dispersions[{i}]", n) for i, d in enumerate(c["dispersions"]) for n in d["modeles"]]
    for ou, n in noms:
        if n not in registre:
            err.append(f"{ou}: no model {n!r} in buildings.py")
        elif "b-" + n not in meta:
            err.append(f"{ou}: {n!r} not built for this look (run build_assets.sh with its THEME)")
    for o in O:
        for s in o["sur"]:
            if s not in KINDS:
                err.append(f"{o['ou']}: 'sur' names an unknown ground kind {s!r}")
    if err:
        raise Erreur("\n".join(err))


def verifier(c, O, kind):
    err = []
    m = c["monde"]
    N, x0 = m["nord"], m["x"]
    interdit = set(kinds_ou("interdit"))
    noms = {k["i"]: n for n, k in KINDS.items()}

    def sous(o):
        return interdit - {KINDS[s]["i"] for s in o["sur"]}

    bat = [o for o in O if o["role"] == "batiment"]
    for i, a in enumerate(bat):
        for b in bat[i + 1:]:
            if inter(rect(a), rect(b)):
                err.append(f"{a['ou']} overlaps {b['ou']} (ground boxes {rect(a)} and {rect(b)})")
    for o in O:
        if o["role"] == "batiment":
            continue
        for b in bat:
            if inter(rect(o), rect(b)):
                err.append(f"{o['ou']} overlaps {b['ou']}'s ground box {rect(b)}")
    for o in O:
        if o["role"] == "batiment":
            # the footprint: the diamond inscribed in the ground box, its inner 80 % (a path may reach the door)
            u0, v0, u1, v1 = rect(o)
            cu, cv, a, b = (u0 + u1) / 2, (v0 + v1) / 2, (u1 - u0) / 2, (v1 - v0) / 2
            vv, uu = np.mgrid[int(v0):int(v1), int(u0):int(u1)]
            pied = np.abs(uu + 0.5 - cu) / a + np.abs(vv + 0.5 - cv) / b <= 0.8
            r, cc = vv[pied] + N, uu[pied] - x0
            ok = (r >= 0) & (r < kind.shape[0]) & (cc >= 0) & (cc < kind.shape[1])
            if not ok.all():
                err.append(f"{o['ou']}: its footprint leaves the canvas")
            ks = set(np.unique(kind[r[ok], cc[ok]]).tolist()) & sous(o)
            if ks:
                err.append(f"{o['ou']} stands on {', '.join(noms[k] for k in sorted(ks))} (add 'sur' if intended)")
        else:
            r, cc = o["v"] + N, o["u"] - x0
            if not (0 <= r < kind.shape[0] and 0 <= cc < kind.shape[1]):
                if o["role"] != "dispersion":  # scatter may stand past the edges (the canvas edge is not left bare)
                    err.append(f"{o['ou']}: outside the canvas")
            elif kind[r, cc] in sous(o):
                err.append(f"{o['ou']} stands on {noms[kind[r, cc]]}")
            if o["role"] == "dispersion" and dans(o["u"], o["v"], o["excl"]):
                err.append(f"{o['ou']} is inside a keep-out")
    if "heros" in c:
        h = c["heros"]
        for nom in ("FLANE", "SPOTS"):
            pts = h[nom]
            if pts:
                ok = marchable(c, kind, O, [p[0] for p in pts], [p[1] for p in pts])
                err += [f"heros.{nom} {p}: not walkable (lieux.js walkable(): water, or a building's box away from "
                        f"the road)" for p, k in zip(pts, ok) if not k]
    if err:
        raise Erreur("\n".join(err))
