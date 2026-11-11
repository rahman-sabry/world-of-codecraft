"""A map's layout (maps/<id>.json, schema in RECIPE.md): read, its keys checked, its points resolved.

Two coordinate systems (the projection of compose.py / compose2.py, origin U0, V0 = the layout's "origine"):
  map px (u, v)        the mod's (x, y): u across the world (WORLD.x to WORLD.x + w), v down from the top of the
                       village band (0 to h; the north band is v < 0, the south band v >= h); 1 logical px each
  iso ground (x, y)    world units on the ground (z = 0): u = U0 + x - y, v = V0 + (x + y) / 2 - z
Points are map px; an object may give "iso" [x, y] instead of "at" [u, v]. Widths, half-sizes and radii of ground
shapes are iso units (the ground's distance fields are computed on the iso ground, as compose2.ground does)."""
import json

TOP = {"id", "origine", "monde", "tuile", "sol", "batiments", "props", "clotures", "dispersions", "exclusions", "heros"}
MONDE = {"x", "w", "h", "nord", "sud"}
SOL = {"sol", "ligne", "boite", "ellipse", "polygone", "demi", "bruit", "rivage"}
OBJET = {"modele", "at", "iso", "dp", "sur", "box", "front"}
CLOTURE = {"axe", "de", "iso", "n", "pas", "modele", "sur", "front"}
DISPERSION = {"zone", "essais", "max", "graine", "modeles", "densite", "espacement", "herbe", "dp", "exclusions"}
HEROS = {"ROAD", "ROAD_R", "FLANE", "SPOTS", "SPOT_R", "DECK"}


class Erreur(Exception):
    pass


def w2s(x, y, o):
    """iso ground -> map px."""
    return o[0] + x - y, o[1] + (x + y) / 2


def s2w(u, v, o):
    """map px -> iso ground (z = 0)."""
    return (v - o[1]) + (u - o[0]) / 2, (v - o[1]) - (u - o[0]) / 2


def _cles(d, permis, ou):
    if not isinstance(d, dict):
        raise Erreur(f"{ou}: an object expected")
    extra = set(d) - permis
    if extra:
        raise Erreur(f"{ou}: unknown keys {sorted(extra)} (allowed: {sorted(permis)})")


def charger(path):
    c = json.load(open(path))
    _cles(c, TOP, path)
    for k in ("id", "origine", "monde"):
        if k not in c:
            raise Erreur(f"{path}: '{k}' is required")
    _cles(c["monde"], MONDE, "monde")
    m = c["monde"] = {"nord": 400, "sud": 400, **c["monde"]}
    if not all(k in m for k in ("x", "w", "h")) or min(m["w"], m["h"], m["nord"], m["sud"]) <= 0:
        raise Erreur("monde: x, w, h required; w, h, nord, sud > 0 (the immersive camera shows the bands)")
    c.setdefault("tuile", 1000)
    o = c["origine"]
    for i, s in enumerate(c.setdefault("sol", [])):
        _cles(s, SOL, f"sol[{i}]")
        if sum(g in s for g in ("ligne", "boite", "ellipse", "polygone")) != 1 or "sol" not in s:
            raise Erreur(f"sol[{i}]: needs 'sol' (a ground kind) and exactly one of ligne, boite, ellipse, polygone")
        if ("ligne" in s or "boite" in s or "ellipse" in s) and "demi" not in s:
            raise Erreur(f"sol[{i}]: 'demi' (half width, or [half x, half y], iso units) is required")
    for liste, role, dp in (("batiments", "batiment", 30), ("props", "prop", 8)):
        for i, ob in enumerate(c.setdefault(liste, [])):
            _cles(ob, OBJET, f"{liste}[{i}]")
            if "modele" not in ob or ("at" in ob) == ("iso" in ob):
                raise Erreur(f"{liste}[{i}]: needs 'modele' and one of 'at' (map px) or 'iso' (iso ground)")
            ob.setdefault("dp", dp)
            ob["role"] = role
            ob["u"], ob["v"] = _point(ob, o)
    for i, f in enumerate(c.setdefault("clotures", [])):
        _cles(f, CLOTURE, f"clotures[{i}]")
        if f.get("axe") not in ("x", "y") or ("de" in f) == ("iso" in f) or "n" not in f:
            raise Erreur(f"clotures[{i}]: needs 'axe' (x or y), 'n' and one of 'de' (map px) or 'iso'")
    for i, d in enumerate(c.setdefault("dispersions", [])):
        _cles(d, DISPERSION, f"dispersions[{i}]")
        for k in ("zone", "essais", "graine", "modeles"):
            if k not in d:
                raise Erreur(f"dispersions[{i}]: '{k}' is required")
    if "heros" in c:
        _cles(c["heros"], HEROS, "heros")
        c["heros"] = {"ROAD": [], "ROAD_R": 30, "FLANE": [], "SPOTS": [], "SPOT_R": 60, "DECK": [], **c["heros"]}
    c.setdefault("exclusions", [])
    return c


def _point(ob, o, at="at"):
    if at in ob:
        return int(round(ob[at][0])), int(round(ob[at][1]))
    u, v = w2s(*ob["iso"], o)
    return int(round(u)), int(round(v))


def point_cloture(f, o):
    """A fence run's first post: 'de' (map px) or 'iso'."""
    return _point(f, o, "de")
