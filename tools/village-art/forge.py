"""Emberdeep (maps/forge.json): a dwarven forge city in a cavern hall under a mountain. Its looks (theme.py "forge":
roaring forges, bright lava; "braises": banked embers) share this module:
  - the palette transforms (tex.MATERIAUX "forge", "braises"): the village's models in dark stone and iron, windows
    lit by firelight day and night, no green moss; banked embers dim the fires and the molten metal;
  - the ground textures (mapbake/sol.py TEX): the cavern floor (basalt, the 'grass' of these looks: the scatter
    stands on it), worn flagstones (plazas), the worn road, and lava (bright core, dark crust plates with glowing
    cracks; "braises": more crust, a cooler core);
  - the lava's edges (lave_bords: a crust rim, a rock face where the ground drops to it) and its glow (lueur: pasted
    over the day and night bakes where nothing stands on it, with a posterised bloom at night; the north band's gloom).
Materials of the map's own models take PAL ids 140 to 159."""
import numpy as np
from scipy import ndimage
from engine import Mat, ramp, hx, vnoise2, hash3, BAYER, outline_of
import tex as T
from theme import LOOK

# ---------------------------------------------------------------- the map's own materials (buildings.py forge-*)
LAVE_RP = np.array([hx(c) for c in ('#4a0e0a', '#8a1e0c', '#d2451a', '#ff7a1a', '#ffb43a', '#ffe27a', '#fff6c8')], np.float32)
BRAISE_RP = np.array([hx(c) for c in ('#2e0a0a', '#5a140c', '#8e2a12', '#c4481a', '#e8722a', '#f6a24a', '#ffd68a')], np.float32)
BRAISES = LOOK.get('lave') == 'braises'
T.PAL[140] = Mat('#3e3844', T.t_stone, params={'ch': 9, 'bl': 13}, hs=22, dark=0.35)             # basalt ashlar
T.PAL[141] = Mat('#4c4854', T.t_metal, hs=10, cool=228)                                          # dark iron
T.PAL[142] = Mat('#7a4a2e', T.t_cloth, hs=20)                                                    # leather (bellows)
T.PAL[143] = Mat('#ff8a2a', T.t_noise, params={'amp': 1.6, 'sc': 1.4}, emissive=2.6 if BRAISES else 3.6, night='#ffa040',
                 rim=False, rp=BRAISE_RP if BRAISES else LAVE_RP)                                # molten metal, lava
T.PAL[144] = Mat('#ffa040', T.t_noise, params={'amp': 0.6}, emissive=2.2 if BRAISES else 3.0, night='#ff9a3a', rim=False,
                 rp=BRAISE_RP if BRAISES else LAVE_RP)                                           # glowing runes
T.PAL[145] = Mat('#352f38', T.t_noise, params={'amp': 1.0, 'sc': 2.5}, hs=18, dark=0.4)          # raw cave rock
T.PAL[146] = Mat('#b06a3a', T.t_noise, params={'amp': 1.2, 'sc': 1.0}, hs=18, light=1.35)        # copper ore
T.PAL[147] = Mat('#5a5048', T.t_stone, params={'ch': 6, 'bl': 10}, hs=22)                        # warm grey dressed stone
T.PAL[148] = Mat('#8a3a22', T.t_stone, params={'ch': 3.5, 'bl': 6.5}, hs=24)                     # furnace brick
T.PAL[149] = Mat('#2a2226', T.t_noise, params={'amp': 1.4}, hs=10)                               # soot, slag
BASALTE, FER, CUIR, FONTE, RUNE, ROC, CUIVRE, PIERRE, BRIQUE, SUIE = range(140, 150)


# ---------------------------------------------------------------- the look's palette over the village's models
def _forge(pal, braises=False):
    """The village's models carved in a dwarven hall: plaster -> dressed stone, timber -> iron, wood darkened, roofs in
    slate, copper and bronze, the barn's red planks in rust-red stone; moss -> soot; glass lit by firelight (day and
    night); the stalls' cloths kept. Banked embers: the fires dim (glows a step lower)."""
    nouveau = {
        T.STONE: Mat('#6c6260', T.t_stone, params={'moss': T.MOSS}, hs=24),
        T.STONE_D: Mat('#48424e', T.t_stone, params={'ch': 7, 'bl': 12, 'moss': T.MOSS}, hs=22),
        T.PLASTER: Mat('#7a6e66', T.t_stone, params={'ch': 6, 'bl': 11}, hs=22),
        T.TIMBER: Mat('#4a4652', T.t_metal, hs=10, cool=228),
        T.PLANK: Mat('#5e3e2a', T.t_plank, hs=22),
        T.WOOD_L: Mat('#7a5a3e', T.t_wood, hs=18),
        T.ROOF_R: Mat('#8a4632', T.t_shingle, params={'rh': 3.0, 'w': 6}, hs=26),                       # copper-rust slate
        T.ROOF_B: Mat('#3c6a66', T.t_shingle, params={'round': True}, hs=20),                           # verdigris bronze
        T.ROOF_S: Mat('#34323e', T.t_shingle, params={'rh': 3.0, 'w': 6}, hs=18),
        T.ROOF_T: Mat('#4a4450', T.t_shingle, params={'rh': 3.0, 'w': 6}, hs=18),
        T.ROOF_G: Mat('#3c6a66', T.t_shingle, params={'round': True}, hs=20),
        T.MARBLE: Mat('#b4a898', T.t_stone, params={'ch': 8, 'bl': 14}, light=1.1, hs=16),
        T.BRICK: Mat('#7e3a26', T.t_stone, params={'ch': 4, 'bl': 7}, hs=22),
        T.MOSS: Mat('#3a3034', T.t_noise, hs=12),
        T.MOSS_R: Mat('#4a3a34', T.t_noise, hs=12),
        51: Mat('#6e3428', T.t_stone, params={'ch': 5, 'bl': 9}, hs=24),                                 # the barn's planks
        48: Mat('#5e5a70', T.t_stone, params={'c': (0, 0), 'r': 22, 'ch': 6, 'bl': 9, 'moss': T.MOSS, 'mossh': 24}, hs=24),
        T.GLASS: Mat('#ffb04a', T.t_glass, emissive=2.0 if braises else 2.6, night='#ffcf6a', rim=False,
                     rp=np.array([hx(c) for c in ('#5a2410', '#9a4a1a', '#d8802a', '#ffb04a', '#ffd27a', '#ffeab0', '#fff8e0')], np.float32)),
    }
    for k, mt in nouveau.items():
        if k in pal and not getattr(pal[k], 'forge', False):
            mt.forge = True
            pal[k] = mt
    if braises and not getattr(pal[T.FIRE], 'forge', False):
        f = pal[T.FIRE]
        pal[T.FIRE] = Mat('#d8602a', f.tex, params=f.p, emissive=2.6, night='#e8803a', rim=False, rp=BRAISE_RP)
        pal[T.FIRE].forge = True


MATERIAUX = {'forge': _forge, 'braises': lambda pal: _forge(pal, True)}


# ---------------------------------------------------------------- ground textures (mapbake/sol.py TEX)
BA = ramp('#3a3236', hs=18, light=1.35, dark=0.45)      # cavern floor
BA2 = ramp('#34303a', hs=18, light=1.35, dark=0.45)
DA = ramp('#5e5550', hs=20, light=1.25, dark=0.4)        # flagstones
CH = ramp('#4e4440', hs=20, light=1.25, dark=0.4)        # the road's worn slabs
CROUTE = ramp('#2c2224', hs=14, light=1.3, dark=0.5)     # lava crust
P = 32


def _cell(x, y, s, seed):
    """Irregular slabs: a jittered grid of size s (iso units): the slab's id, and the distance to its joint."""
    gx = np.floor(x / s); gy = np.floor((y + (gx % 2) * s * 0.5) / s)
    fx = x - gx * s; fy = (y + (gx % 2) * s * 0.5) - gy * s
    sid = hash3(gx.astype(np.int64) % 8, gy.astype(np.int64) % 8, np.zeros_like(x, dtype=np.int64), seed)
    j = np.minimum(np.minimum(fx, s - fx), np.minimum(fy, s - fy))
    return sid, j, fx, fy


def basalte(x, y, sx, sy, macro=0):
    """The cavern floor: dark rock, slow mottling, cracks, grit and a few pale pebbles."""
    n = vnoise2(x, y, 16, 201, P) * 1.2 + vnoise2(x, y, 6, 202, P) * 0.7 + vnoise2(x, y, 3, 203, P) * 0.4
    lv = 2.0 + n + macro * 0.7
    cr = np.abs(np.sin((x * 0.31 - y * 0.17) * 0.7 + vnoise2(x, y, 9, 204, P) * 8.0))
    lv = lv - (cr < 0.06) * 1.4 + ((cr >= 0.06) & (cr < 0.13)) * 0.5
    h = hash3(np.floor(x).astype(np.int64) % P, np.floor(y).astype(np.int64) % P, np.zeros_like(x, dtype=np.int64), 205)
    lv = lv + (h > 0.95) * 1.3 - (h < 0.05) * 0.8 + BAYER[sy % 4, sx % 4] * 0.35
    idx = np.clip(np.round(lv), 0, 6).astype(int)
    return np.where((vnoise2(x, y, 20, 206, P) > 0.6)[..., None], BA2[idx], BA[idx])


def dalles(x, y, sx, sy, macro=0, rp=DA, s=12.0, seed=211, runes=True):
    """Worn flagstones: large slabs, bevelled lit edges, dark joints, cracks and wear; now and then a rune inlaid in a
    slab glows faintly (a forge-lit groove)."""
    sid, j, fx, fy = _cell(x, y, s, seed)
    lv = 2.9 + (sid - 0.5) * 1.4 + macro * 0.5 + (vnoise2(x, y, 5, seed + 1, P) - 0.5) * 0.9
    lv = lv + (fx < 1.4) * 0.8 + (fy < 1.4) * 0.5 - (fx > s - 1.4) * 0.7 - (fy > s - 1.4) * 0.7
    cr = (np.abs(np.sin(fx * 0.9 + fy * 0.4 + sid * 9)) < 0.05) & (sid > 0.7)
    lv = np.where(cr, lv - 1.4, lv)
    lv = np.where(j < 0.6, 0.4, lv) + BAYER[sy % 4, sx % 4] * 0.3
    c = rp[np.clip(np.round(lv), 0, 6).astype(int)]
    if runes:
        rune = (sid > 0.93) & (np.abs(fx - s / 2) < 2.6) & (np.abs(fy - s / 2) < 2.6) & \
               ((np.abs(fx - s / 2) < 0.5) | (np.abs(fx - fy) < 0.5) | (np.abs(fy - s / 2 - 1.5) < 0.45))
        c = np.where(rune[..., None], (BRAISE_RP if BRAISES else LAVE_RP)[3] * 0.85, c)
    return c


def chemin(x, y, sx, sy, macro=0):
    """The road: smaller slabs, darker and worn smooth down the middle, grit in the joints."""
    return dalles(x, y, sx, sy, macro, rp=CH, s=8.0, seed=221, runes=False)


def lave(x, y, sx, sy, macro=0):
    """Lava: a molten core with slow flow streaks and bright seams, under drifting plates of dark crust whose cracks
    glow; banked embers ('braises'): more crust, a cooler, dimmer core."""
    rp = BRAISE_RP if BRAISES else LAVE_RP
    flot = np.sin((x + y) * 0.22 + vnoise2(x, y, 14, 231) * 7.0) + 0.6 * np.sin(x * 0.17 - y * 0.29 + vnoise2(x, y, 7, 232) * 4)
    lv = 3.2 + flot * 0.8 + (vnoise2(x, y, 6, 233) - 0.5) * 1.2 + macro * 0.3 + BAYER[sy % 4, sx % 4] * 0.5
    c = rp[np.clip(np.round(lv), 1, 6).astype(int)]
    plaque = vnoise2(x, y, 11, 234) * 0.7 + vnoise2(x, y, 4, 235) * 0.3
    seuil = 0.5 if BRAISES else 0.6
    crust = plaque > seuil
    lc = 1.6 + (plaque - seuil) * 6 + (vnoise2(x, y, 3, 236) - 0.5) * 1.2 + BAYER[sy % 4, sx % 4] * 0.4
    cc = CROUTE[np.clip(np.round(lc), 0, 5).astype(int)]
    fente = crust & (plaque < seuil + 0.035)
    c = np.where(crust[..., None], cc, c)
    return np.where(fente[..., None], rp[2], c)


TEX = {'forge-basalte': basalte, 'forge-dalles': dalles, 'forge-chemin': chemin, 'forge-lave': lave}


def lave_bords(out, lave_m, sol_m, u, v):
    """The lava's edges, in canvas px (lave_m: lava pixels, sol_m: the ground beside it, not lava): a dark crust rim
    along every shore, cooling into the core; where the ground lies above the lava on screen (its near shore seen
    from the south), a rock face drops from the ground's edge to the lava, 2 to 14 px tall (a dark ledge, lit on its
    lip, a molten glow at its foot). Returns the face's mask (not lava light)."""
    rp = BRAISE_RP if BRAISES else LAVE_RP
    b = BAYER[v % 4, u % 4]
    d = ndimage.distance_transform_edt(lave_m, sampling=(2, 1))
    k = np.clip(1 - d / (10 if BRAISES else 7), 0, 1)
    # away from its shores the lava crusts over in wide drifting plates, molten rivers and glowing seams between them
    uf, vf = u.astype(np.float32), v.astype(np.float32) * 2
    nz = vnoise2(uf + vf * 0.3, vf, 34, 251) * 0.65 + vnoise2(uf, vf, 11, 252) * 0.25 + vnoise2(uf, vf, 4, 253) * 0.1
    seuil = 0.66 - np.clip((d - 20) / 90, 0, 1) * (0.36 if BRAISES else 0.3)
    plaque = lave_m & (nz > seuil)
    lc = 1.2 + (nz - seuil) * 9 + (vnoise2(uf, vf, 3, 254) - 0.5) * 1.4 + b * 0.5
    out[plaque] = CROUTE[np.clip(np.round(lc[plaque]), 0, 5).astype(int)]
    seam = lave_m & ~plaque & (nz > seuil - 0.035)
    out[seam] = rp[3] if not BRAISES else rp[2]
    rim = lave_m & (k * 3 + b * 0.9 > 0.9)
    out[rim] = CROUTE[np.clip(np.round(k[rim] * 2.2 + b[rim] * 0.8 - 0.3), 0, 6).astype(int)]
    lisere = lave_m & (k > 0) & (k * 3 + b * 0.9 <= 0.9) & (k * 3 + b * 0.9 > 0.35)
    out[lisere] = rp[2]
    # the drop: a lava pixel with ground 1..H px above it, H a slow wobble of 6 to 14 px
    H = (6 + vnoise2(u.astype(np.float32), u.astype(np.float32) * 0, 30, 241) * 8).astype(int)
    haut = np.zeros(lave_m.shape, np.int32)
    for j in range(1, 15):
        haut = np.where((haut == 0) & np.roll(sol_m, j, 0), j, haut)
    face = lave_m & (haut > 0) & (haut <= H)
    f = haut[face].astype(np.float32) / H[face]
    roche = T.PAL[ROC].ramp
    strie = hash3(u[face] // 3, u[face] * 0, u[face] * 0, 242) - 0.5
    lvf = 3.6 - f * 3.2 + strie * 1.2 + b[face] * 0.6
    out[face] = roche[np.clip(np.round(lvf), 0, 6).astype(int)]
    lip = face & (haut == 1)
    out[lip] = roche[5]
    pied = lave_m & (haut > 0) & (haut == H + 1)
    out[pied] = rp[4]
    FACE[0] = face
    return face


FACE = [None]  # the last ground's rock face (sol.py calls lave_bords; bake_map.py reads it)


def lueur(day, night, ground, lava, couvert, nord):
    """The lava's light over the composited bakes (canvas px, uint8 RGB): where nothing stands on it, the lava keeps
    its ground colour (no cast shadow on it, not graded at night); at night a two-radius bloom, posterised and
    dithered as compose3's, lights the ground and the walls round it (weaker for banked embers). The north band
    darkens towards its top, the cavern's depth (rows 0 to nord)."""
    H, W = lava.shape
    vis = lava & ~couvert
    g = ground.astype(np.float32)
    day[vis] = np.clip(g[vis], 0, 255).astype(np.uint8)
    e = np.where(vis[..., None], g, 0)
    force = 0.5 if BRAISES else 1.0
    g1 = np.stack([ndimage.gaussian_filter(e[..., c], 4) for c in range(3)], -1) * 1.1 * force
    g2 = np.stack([ndimage.gaussian_filter(e[..., c], 26) for c in range(3)], -1) * 1.5 * force
    vv, uu = np.mgrid[0:H, 0:W]
    glow = np.clip(np.floor((g1 + g2) / 16 + BAYER[vv % 4, uu % 4][..., None] * 0.9) * 16, 0, 200)
    n = night.astype(np.float32)
    lit = n + glow * (day.astype(np.float32) / 255 * 0.8 + 0.12)
    lit = lit * np.array([1.16, 1.0, 0.8])  # the hall's night is firelit, not moonlit: the blue grade warmed
    lit[vis] = g[vis] * (0.85 if BRAISES else 1.0)
    night[:] = np.clip(lit, 0, 255).astype(np.uint8)
    # the cavern's depth: the north band darkens to 45 % at its top, in dithered steps
    k = np.clip(1 - vv[:nord] / nord, 0, 1) ** 1.4
    q = np.floor(k * 6 + BAYER[vv[:nord] % 4, uu[:nord] % 4] * 0.9) / 6 * 0.55
    for img in (day, night):
        img[:nord] = np.clip(img[:nord].astype(np.float32) * (1 - q[..., None]), 0, 255).astype(np.uint8)
