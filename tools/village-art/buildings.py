"""Valbrume buildings, all modelled in world units centred on (0,0) footprint, ground z=0."""
import sys, json, time
import numpy as np
from engine import Vol, save2x
from gi import render, trim
S_B = 1.4
import engine; engine.VS_DEFAULT[0] = 1 / S_B
from kit3d import *
from theme import LOOK, LOOKS

B = {}
def bld(name):
    def deco(f): B[name] = f; return f
    return deco

@bld('tavern')
def tavern():
    v = Vol(-52, 52, -48, 50, 0, 150)
    x0, x1, y0, y1 = -34, 34, -28, 28
    v.box(x0, x1, y0, y1, 0, 14, STONE)                       # stone ground floor plinth
    v.box(x0 + 1, x1 - 1, y0 + 1, y1 - 1, 14, 36, PLASTER)    # ground floor
    v.box(x0 - 3, x1 + 3, y0 - 3, y1 + 3, 36, 39, TIMBER)     # jetty beam
    v.box(x0 - 3, x1 + 3, y0 - 3, y1 + 3, 39, 62, PLASTER)    # jettied upper floor
    timber_frame(v, 'y', y1 - 1, x0 + 1, x1 - 1, 14, 36, spacing=13)
    timber_frame(v, 'x', x1 - 1, y0 + 1, y1 - 1, 14, 36, spacing=13)
    timber_frame(v, 'y', y1 + 3, x0 - 3, x1 + 3, 39, 62, spacing=10, braces=True)
    timber_frame(v, 'x', x1 + 3, y0 - 3, y1 + 3, 39, 62, spacing=10)
    v.roof(x0 - 9, x1 + 9, y0 - 10, y1 + 10, 58, 112, ROOF_R, axis='x', th=5, fill=PLASTER, curve=1.15)
    # gable dormer on the left face
    v.box(-8, 10, y1 + 2, y1 + 14, 60, 76, PLASTER)
    timber_frame(v, 'y', y1 + 14, -8, 10, 60, 76, spacing=9, braces=False)
    v.roof(-12, 14, y1 - 2, y1 + 18, 74, 92, ROOF_R, axis='y', th=4, fill=PLASTER)
    window(v, 'y', y1 + 14, -3, 5, 64, 72, shutters=None)
    # ridge cap
    v.box(x0 - 9, x1 + 9, -1.5, 1.5, 110, 114, ROOF_S)
    chimney(v, -20, -6, 80, 128, BRICK, 9)
    chimney(v, 24, 4, 90, 118, STONE_D, 7)
    # windows ground + upper (left face y=y1, right face x=x1)
    door(v, 'y', y1, -6, 6, 22, arch=True)
    for a in (-26, 16):
        window(v, 'y', y1 - 1, a, a + 9, 20, 30, shutters=CLOTH_G)
    for a in (-24, -6, 12):
        window(v, 'y', y1 + 3, a, a + 9, 44, 55, shutters=CLOTH_G)
    for a in (-14, 6):
        window(v, 'x', x1 - 1, a, a + 9, 20, 30)
        window(v, 'x', x1 + 3, a, a + 9, 44, 55, shutters=CLOTH_G)
    # hanging sign with mug emblem
    v.box(x1 + 3, x1 + 18, y1 - 2, y1, 52, 54, METAL)
    v.box(x1 + 8, x1 + 18, y1 - 1.4, y1 - 0.6, 38, 50, WOOD_L)
    v.box(x1 + 11, x1 + 15, y1 - 0.6, y1 + 0.4, 41, 47, GOLD)
    for xx in (x1 + 9, x1 + 17):
        v.box(xx - 0.5, xx + 0.5, y1 - 1.2, y1 - 0.8, 50, 52, METAL)
    lantern(v, -11, y1 + 3, 30); lantern(v, 11, y1 + 3, 30)
    for k, (bx, by) in enumerate(((x1 + 6, y1 - 10), (x1 + 6, y1 - 3), (x1 + 13, y1 + 4))):
        barrel(v, bx, by)
    crate(v, -30, y1 + 4, 8); crate(v, -29, y1 + 4, 6, z=8)
    # bench + table
    v.box(16, 30, y1 + 6, y1 + 9, 4, 5.5, WOOD_L); v.box(17, 18.5, y1 + 6, y1 + 9, 0, 4, TIMBER); v.box(27.5, 29, y1 + 6, y1 + 9, 0, 4, TIMBER)
    return v


def gable_frame(v, face, c, a0, a1, z0, ztop, mat=TIMBER):
    m = (a0 + a1) / 2; hw = (a1 - a0) / 2
    for k in np.arange(-hw, hw, 0.5):
        zt = z0 + (ztop - z0) * (1 - abs(k) / hw)
        if abs(k) < 1 or abs(abs(k) - hw * 0.5) < 0.8:
            fbox(v, face, c, m + k, m + k + 0.5, z0, zt, -0.5, 1, mat)
    fbox(v, face, c, a0, a1, z0 + (ztop - z0) * 0.45, z0 + (ztop - z0) * 0.45 + 1.6, -0.5, 1, mat)

def spire(v, cx, cy, r, z0, z1, mat, finial=GOLD, p=1.7):
    v.cone(cx, cy, r, z0, z1, mat, p=p)
    v.cyl(cx, cy, 0.9, z1 - 2, z1 + 8, finial)
    v.ell(cx, cy, z1 + 4, 2, 2, 2, finial)

@bld('townhall')
def townhall():
    v = Vol(-80, 80, -66, 70, 0, 210)
    x0, x1, y0, y1 = -58, 58, -40, 40
    v.box(x0, x1, y0, y1, 0, 18, STONE)
    v.box(x0 - 2, x1 + 2, y0 - 2, y1 + 2, 0, 4, STONE_D)
    v.box(x0 + 1, x1 - 1, y0 + 1, y1 - 1, 18, 44, PLASTER)
    v.box(x0 - 2, x1 + 2, y0 - 2, y1 + 2, 44, 47, TIMBER)
    v.box(x0 - 2, x1 + 2, y0 - 2, y1 + 2, 47, 70, PLASTER)
    timber_frame(v, 'y', y1 - 1, x0 + 1, x1 - 1, 18, 44, spacing=14)
    timber_frame(v, 'x', x1 - 1, y0 + 1, y1 - 1, 18, 44, spacing=14)
    timber_frame(v, 'y', y1 + 2, x0 - 2, x1 + 2, 47, 70, spacing=11)
    timber_frame(v, 'x', x1 + 2, y0 - 2, y1 + 2, 47, 70, spacing=11)
    # corner stone quoins
    for (cx, cy) in ((x1, y1), (x0, y1), (x1, y0)):
        for zz in range(0, 70, 8):
            v.box(cx - 3, cx + 3, cy - 3, cy + 3, zz, zz + 5, STONE)
    v.roof(x0 - 10, x1 + 10, y0 - 10, y1 + 10, 66, 126, ROOF_B, axis='x', hip=0.9, th=5, fill=PLASTER, curve=1.25)
    v.box(-23, 23, -1.5, 1.5, 123, 128, GOLD)
    for xx in (-23, 23):
        v.ell(xx, 0, 130, 2.5, 2.5, 3.5, GOLD)
    # belfry / clock tower rising from the front of the roof
    bx0, bx1, by0, by1 = -14, 14, 18, 46
    v.box(bx0, bx1, by0, by1, 0, 112, STONE)
    v.box(bx0 - 2, bx1 + 2, by0 - 2, by1 + 2, 110, 116, STONE_D)
    v.box(bx0, bx1, by0, by1, 116, 146, PLASTER)
    timber_frame(v, 'y', by1, bx0, bx1, 116, 146, spacing=7, braces=False)
    timber_frame(v, 'x', bx1, by0, by1, 116, 146, spacing=7, braces=False)
    for face, c in (('y', by1), ('x', bx1)):
        fbox(v, face, c, -6 if face == 'y' else 26, 6 if face == 'y' else 38, 124, 140, -4, 1, 0)
        fbox(v, face, c, -6 if face == 'y' else 26, 6 if face == 'y' else 38, 124, 140, -4, -3, COAL)
    v.box(-2, 2, 30, 34, 120, 137, GOLD)  # bell
    v.roof(bx0 - 6, bx1 + 6, by0 - 6, by1 + 6, 144, 200, ROOF_B, axis='x', hip=1.0, th=4, curve=1.6, fill=PLASTER)
    v.cyl(0, 32, 1, 196, 208, GOLD); v.ell(0, 32, 203, 2.2, 2.2, 2.2, GOLD)
    # clock on the belfry shaft
    v.put((-8, 8, by1, by1 + 2, 84, 100), lambda X, Y, Z: ((X) ** 2 + (Z - 92) ** 2 <= 64) & (Y < by1 + 1.5), GOLD)
    v.put((-8, 8, by1, by1 + 2.5, 84, 100), lambda X, Y, Z: ((X) ** 2 + (Z - 92) ** 2 <= 36) & (Y < by1 + 2), CREAM)
    v.box(-0.5, 0.5, by1 + 1.8, by1 + 2.6, 92, 97, COAL); v.box(0, 4, by1 + 1.8, by1 + 2.6, 91.5, 92.5, COAL)
    door(v, 'y', by1, -8, 8, 34, arch=True)
    window(v, 'y', by1, -5, 5, 56, 70, arch=True)
    window(v, 'x', bx1, 27, 37, 56, 70, arch=True)
    # main facade windows
    for a in (-50, -34, 22, 40):
        window(v, 'y', y1 - 1, a, a + 9, 24, 36, shutters=CLOTH_B)
        window(v, 'y', y1 + 2, a, a + 9, 52, 63, shutters=CLOTH_B)
    for a in (-30, -12, 6, 22):
        window(v, 'x', x1 - 1, a, a + 9, 24, 36, shutters=CLOTH_B)
        window(v, 'x', x1 + 2, a, a + 9, 52, 63, shutters=CLOTH_B)
    # dormers on the roof
    for a in (-40, 30):
        v.box(a - 7, a + 7, y1 - 6, y1 + 6, 70, 86, PLASTER)
        v.roof(a - 10, a + 10, y1 - 10, y1 + 10, 84, 98, ROOF_B, axis='y', th=3, fill=PLASTER)
        window(v, 'y', y1 + 6, a - 3, a + 3, 74, 82, cross=False)
    banner(v, 'y', y1 + 2, -24, 66, 22, 8, CLOTH_B, GOLD, GOLD)
    banner(v, 'y', y1 + 2, 30 - 2, 66, 22, 8, CLOTH_B, GOLD, GOLD) if False else None
    banner(v, 'x', x1 + 2, -2, 66, 22, 8, CLOTH_B, GOLD, GOLD)
    # front steps + lanterns
    for k in range(3):
        v.box(-12 - 3 * (2 - k), 12 + 3 * (2 - k), by1, by1 + 9 - 3 * k, 2 * k, 2 * k + 2, STONE_D)
    lantern(v, -18, by1 + 2, 30); lantern(v, 18, by1 + 2, 30)
    chimney(v, -42, -20, 90, 120, BRICK, 8)
    return v

@bld('magetower')
def magetower():
    v = Vol(-46, 46, -46, 46, 0, 262)
    v.cyl(0, 0, 25, 0, 10, STONE_D)
    v.put((-24, 24, -24, 24, 10, 130), lambda X, Y, Z: X ** 2 + Y ** 2 <= (22 - (Z - 10) * 0.035) ** 2, PAL_ID('tower_st'))
    for ang in (0.4, 1.25, 2.1, 3.0, 3.9, 4.8, 5.6):
        bx, by = 22 * np.cos(ang), 22 * np.sin(ang)
        v.put((bx - 6, bx + 6, by - 6, by + 6, 0, 60), lambda X, Y, Z, bx=bx, by=by: ((X - bx) ** 2 + (Y - by) ** 2 <= 16) & (Z < 60 - 2.2 * np.sqrt((X - bx * 1.25) ** 2 + (Y - by * 1.25) ** 2) * 2.4) , STONE_D)
    # corbelled balcony
    v.cone(0, 0, 21, 112, 130, STONE_D, r1=30, p=1.0) if False else None
    v.put((-31, 31, -31, 31, 112, 132), lambda X, Y, Z: X ** 2 + Y ** 2 <= (19 + (Z - 112) * 0.6) ** 2, STONE_D)
    v.cyl(0, 0, 31, 132, 136, STONE)
    for k in range(20):
        a = k / 20 * 2 * np.pi
        v.cyl(30 * np.cos(a), 30 * np.sin(a), 1.4, 136, 143, STONE)
    v.cyl(0, 0, 31.5, 143, 145.5, STONE, rin=28)
    # upper chamber
    v.cyl(0, 0, 18, 136, 176, PAL_ID('tower_st'))
    for k in range(6):
        a = k / 6 * 2 * np.pi + 0.3
        v.cyl(18 * np.cos(a), 18 * np.sin(a), 2.2, 136, 176, STONE_D)
    v.cyl(0, 0, 20, 174, 179, GOLD)
    # flared curved spire
    v.put((-32, 32, -32, 32, 176, 250), lambda X, Y, Z: (X ** 2 + Y ** 2 <= (2 + 28 * (1 - np.clip((Z - 176) / 74, 0, 1)) ** 2.1) ** 2), PAL_ID('tower_roof'))
    v.cyl(0, 0, 1, 246, 256, GOLD); v.ell(0, 0, 252, 2.5, 2.5, 2.5, GOLD)
    # floating crystal (detached voxels)
    v.put((-5, 5, -5, 5, 236, 262), lambda X, Y, Z: (np.abs(X) + np.abs(Y)) * 1.0 <= 4.2 * (1 - np.abs(Z - 252) / 9) , 0) if False else None
    # windows (arched, magic glow) on the visible faces
    def rwin(ang, z, h, hw, R):
        def m(X, Y, Z, d0, d1, ext=0):
            an = np.arctan2(Y, X); dr = np.hypot(X, Y)
            da = np.abs(((an - ang + np.pi) % (2 * np.pi)) - np.pi) * R
            top = z + h + np.sqrt(np.clip((hw + ext) ** 2 - da ** 2, 0, None))
            return (da <= hw + ext) & (Z >= z - ext) & (Z < top + ext) & (dr >= d0) & (dr <= d1)
        bb = (-R - 6, R + 6, -R - 6, R + 6, z - 3, z + h + hw + 3)
        v.put(bb, lambda X, Y, Z: m(X, Y, Z, R - 1.5, R + 1.6, 1.3), GOLD)
        v.put(bb, lambda X, Y, Z: m(X, Y, Z, R - 3, R + 2), 0)
        v.put(bb, lambda X, Y, Z: m(X, Y, Z, R - 4, R - 2.2), MAGIC)
        v.put(bb, lambda X, Y, Z: m(X, Y, Z, R - 2.5, R - 0.5) & (np.abs(Z - (z + h * 0.55)) < 0.6), GOLD)
    for ang, z in ((0.3, 34), (1.3, 34), (0.8, 68), (1.55, 96), (0.45, 98)):
        rwin(ang, z, 9, 3.2, 22 - (z - 10) * 0.035)
    for ang in (0.35, 0.95, 1.55):
        rwin(ang, 148, 12, 3.2, 18)
    for zz in (62, 92):
        v.cyl(0, 0, 22.6 - (zz - 10) * 0.035, zz, zz + 2.5, STONE_D)
    for ang in (0.2, 1.4):
        cx, cy = 31 * np.cos(ang), 31 * np.sin(ang)
        for zz in np.arange(110, 134, 0.5):
            w = 4.5 if zz > 114 else (zz - 110) * 1.1
            v.put((cx - 6, cx + 6, cy - 6, cy + 6, zz, zz + 0.5), lambda X, Y, Z, cx=cx, cy=cy, w=w, ang=ang: (np.abs(-(X - cx) * np.sin(ang) + (Y - cy) * np.cos(ang)) <= w) & (np.abs((X - cx) * np.cos(ang) + (Y - cy) * np.sin(ang)) < 0.8), PAL[31] and 31)
    # rune band glowing at the base
    v.put((-26, 26, -26, 26, 14, 18), lambda X, Y, Z: (X ** 2 + Y ** 2 <= 22.8 ** 2) & (X ** 2 + Y ** 2 > 20.5 ** 2) & (np.sin(np.arctan2(Y, X) * 22) > 0.2), MAGIC)
    # door
    a = 0.8; cx, cy = 23 * np.cos(a), 23 * np.sin(a)
    v.put((cx - 9, cx + 9, cy - 9, cy + 9, 0, 30), lambda X, Y, Z: ((X - cx) ** 2 + (Y - cy) ** 2 <= 8.5 ** 2) & (Z < 18 + np.sqrt(np.clip(36 - ((X - cx) * 0.7 - (Y - cy) * 0.7) ** 2, 0, None))), 0)
    v.put((cx - 9, cx + 9, cy - 9, cy + 9, 0, 30), lambda X, Y, Z: ((X - cx) ** 2 + (Y - cy) ** 2 <= 8.5 ** 2) & (X ** 2 + Y ** 2 <= 19 ** 2) & (Z < 18 + np.sqrt(np.clip(36 - ((X - cx) * 0.7 - (Y - cy) * 0.7) ** 2, 0, None))), PLANK)
    v.cyl(cx + 4, cy + 4, 4, 0, 1.5, STONE)
    # banners on the balcony
    return v

def PAL_ID(k):
    return {'tower_st': 48, 'tower_roof': 49, 'temple_dome': 50}[k]

PAL[48] = Mat('#8c8aa6', t_stone, params={'c': (0, 0), 'r': 22, 'ch': 6, 'bl': 9, 'moss': 40, 'mossh': 24}, hs=24)
PAL[49] = Mat('#6b3fb0', t_shingle, params={'c': (0, 0), 'r': 24, 'round': True, 'rh': 3.2, 'w': 4.5}, hs=26, light=1.35)
PAL[50] = Mat('#e0a32a', t_shingle, params={'c': (0, 0), 'r': 20, 'round': True, 'rh': 3.0, 'w': 4}, hs=20, light=1.38)

@bld('forge')
def forge():
    v = Vol(-56, 56, -50, 52, 0, 150)
    x0, x1, y0, y1 = -36, 20, -30, 26
    v.box(x0, x1, y0, y1, 0, 40, STONE_D)
    v.roof(x0 - 7, x1 + 7, y0 - 8, y1 + 8, 36, 82, ROOF_S, axis='x', th=4, fill=STONE_D)
    gable_frame(v, 'x', x1, y0, y1, 40, 78)
    # open lean-to smithy on the right
    lx0, lx1 = x1, x1 + 26
    v.box(lx0, lx1, y0 + 4, y1, 0, 2, STONE)
    for (px, py) in ((lx1 - 2, y1 - 4), (lx1 - 2, y0 + 6)):
        v.box(px - 2, px + 2, py - 2, py + 2, 0, 34, TIMBER)
    v.put((lx0 - 2, lx1 + 6, y0, y1 - 2, 30, 50), lambda X, Y, Z: (Z <= 48 - (X - lx0) * 0.55) & (Z > 44 - (X - lx0) * 0.55), ROOF_S)
    barrel(v, lx0 + 8, y0 + 10); barrel(v, lx0 + 8, y0 + 18); crate(v, lx0 + 14, y0 + 8, 8)
    # furnace protruding from the left face with a glowing arched mouth
    fx0, fx1, fy1 = -2, 16, y1 + 12
    v.box(fx0, fx1, y1, fy1, 0, 28, BRICK)
    v.box(fx0 - 1, fx1 + 1, y1, fy1 + 1, 26, 30, STONE_D)
    v.put((fx0 + 3, fx1 - 3, fy1 - 4, fy1 + 1, 2, 20), lambda X, Y, Z: (Z < 12 + np.sqrt(np.clip(25 - (X - 7) ** 2, 0, None))) & (np.abs(X - 7) <= 5), 0)
    v.put((fx0 + 3, fx1 - 3, fy1 - 6, fy1 - 3, 2, 20), lambda X, Y, Z: (Z < 12 + np.sqrt(np.clip(25 - (X - 7) ** 2, 0, None))) & (np.abs(X - 7) <= 5), FIRE)
    v.put((fx0 + 1, fx1 - 1, fy1 - 1, fy1 + 1.5, 0, 22), lambda X, Y, Z: (np.abs(np.hypot(X - 7, np.maximum(Z - 12, 0)) - 6.5) < 1.3) & (Z > 1), STONE)
    v.box(fx0 + 4, fx1 - 4, fy1, fy1 + 3, 0, 3, COAL)
    chimney(v, 7, y1 + 4, 28, 104, BRICK, 10)
    v.box(4, 10, y1 + 1, y1 + 7, 101, 103, FIRE)
    # anvil out front
    ax_, ay_ = x1 + 10, y1 + 6
    v.box(ax_, ax_ + 4, ay_, ay_ + 4, 0, 7, STONE_D)
    v.box(ax_ - 2, ax_ + 7, ay_ - 0.5, ay_ + 4.5, 7, 11, METAL)
    v.box(ax_ + 7, ax_ + 10, ay_ + 1, ay_ + 3, 8.5, 10.5, METAL)
    # tool rack on the wall
    for k in range(4):
        xx = -30 + k * 4
        v.box(xx, xx + 1, y1, y1 + 1.2, 12, 26, WOOD_L)
        v.box(xx - 1, xx + 2, y1, y1 + 1.6, 24 - (k % 2) * 3, 27, METAL)
    # water trough + quench barrel
    barrel(v, lx1 + 4, y1 - 4)
    v.box(lx0 + 2, lx0 + 14, y1 + 2, y1 + 8, 0, 6, PLANK); v.box(lx0 + 3, lx0 + 13, y1 + 3, y1 + 7, 4, 5.5, WATER)
    # door + windows on the stone house
    door(v, 'y', y1, -20, -8, 24, arch=True)
    window(v, 'x', x1, -26, -18, 18, 28)
    # gear sign
    gy = y1 + 1
    v.put((-34, -24, gy, gy + 2, 26, 40), lambda X, Y, Z: (((X + 29) ** 2 + (Z - 33) ** 2) <= (4.6 + 1.3 * (np.sin(np.arctan2(Z - 33, X + 29) * 8) > 0)) ** 2) & (((X + 29) ** 2 + (Z - 33) ** 2) > 2.0 ** 2), GOLD)
    v.box(-30, -28, gy - 1, gy, 38, 46, METAL)
    # log pile + wheel
    for k in range(3):
        v.put((x0 - 10, x0, y1 - 20, y1, 0, 12), lambda X, Y, Z, k=k: ((Z - 3 - k * 3.5) ** 2 + ((Y - (y1 - 16 + (k % 2) * 3.5)) % 7 - 3.5) ** 2 <= 9.5) & (X >= x0 - 9) & (X < x0 - 1) & (Y < y1 - 2 - k * 2), BARK)
    for zz in range(4):
        pass
    lantern(v, -2, y1 + 2, 30)
    return v

@bld('barracks')
def barracks():
    v = Vol(-74, 74, -52, 56, 0, 190)
    x0, x1, y0, y1 = -58, 34, -30, 30
    v.box(x0, x1, y0, y1, 0, 46, STONE)
    v.box(x0 - 2, x1 + 2, y0 - 2, y1 + 2, 44, 49, STONE_D)
    # crenellations
    for a in np.arange(x0 - 2, x1 + 2, 7):
        v.box(a, a + 4, y1 - 2, y1 + 2, 49, 55, STONE_D)
        v.box(a, a + 4, y0 - 2, y0 + 2, 49, 55, STONE_D)
    for a in np.arange(y0 - 2, y1 + 2, 7):
        v.box(x1 - 2, x1 + 2, a, a + 4, 49, 55, STONE_D)
        v.box(x0 - 2, x0 + 2, a, a + 4, 49, 55, STONE_D)
    v.roof(x0 + 2, x1 - 2, y0 + 2, y1 - 2, 46, 78, ROOF_R, axis='x', th=4, fill=STONE)
    # corner keep
    kx, ky = x1, y1 - 6
    v.box(kx - 14, kx + 14, ky - 14, ky + 14, 0, 98, STONE)
    v.box(kx - 16, kx + 16, ky - 16, ky + 16, 96, 102, STONE_D)
    for a in np.arange(-16, 16, 6):
        v.box(kx + a, kx + a + 3.5, ky + 13, ky + 16, 102, 108, STONE_D)
        v.box(kx + 13, kx + 16, ky + a, ky + a + 3.5, 102, 108, STONE_D)
    v.roof(kx - 12, kx + 12, ky - 12, ky + 12, 102, 156, ROOF_R, axis='x', hip=1.0, th=4, curve=1.5, fill=STONE)
    v.cyl(kx, ky, 1, 152, 160, GOLD)
    flag(v, kx, ky, 156, 24, CLOTH_R, 18)
    for zz in (30, 64):
        window(v, 'y', ky + 14, kx - 3, kx + 3, zz, zz + 12, cross=False, sill=False)
        window(v, 'x', kx + 14, ky - 3, ky + 3, zz, zz + 12, cross=False, sill=False)
    # gate
    door(v, 'y', y1, -26, -6, 30, arch=True, leaf=PLANK)
    for a in (-48, 4, 18):
        window(v, 'y', y1, a, a + 4, 22, 34, cross=False, sill=False)
    banner(v, 'y', y1, -38, 44, 26, 9, CLOTH_R, GOLD, GOLD)
    banner(v, 'y', y1, 8, 44, 26, 9, CLOTH_R, GOLD, GOLD) if False else None
    # weapon rack + training dummy
    rx = -58
    v.box(rx, rx + 22, y1 + 8, y1 + 10, 0, 3, TIMBER); v.box(rx, rx + 22, y1 + 8, y1 + 10, 14, 16, TIMBER)
    for k in range(5):
        xx = rx + 2 + k * 4.5
        v.box(xx, xx + 1, y1 + 8.5, y1 + 9.5, 0, 26, WOOD_L)
        v.cone(xx + 0.5, y1 + 9, 1.6, 26, 31, METAL)
    dx, dy = 2, y1 + 18
    v.cyl(dx, dy, 1.2, 0, 28, TIMBER)
    v.box(dx - 8, dx + 8, dy - 1, dy + 1, 20, 22, TIMBER)
    v.ell(dx, dy, 22, 5, 4, 7, HAY); v.ell(dx, dy, 32, 3.5, 3.5, 3.5, HAY)
    v.ell(dx, dy + 0.5, 21, 5.3, 4.3, 3, CLOTH_R)
    return v

@bld('temple')
def temple():
    v = Vol(-64, 64, -60, 72, 0, 210)
    x0, x1, y0, y1 = -40, 40, -40, 34
    for k in range(3):
        v.box(x0 - 8 + 2 * k, x1 + 8 - 2 * k, y0 - 8 + 2 * k, y1 + 26 - 2 * k, 2 * k, 2 * k + 2, MARBLE)
    v.box(x0, x1, y0, y1, 6, 56, MARBLE)
    v.box(x0 - 3, x1 + 3, y0 - 3, y1 + 3, 54, 60, GOLD)
    v.box(x0 - 2, x1 + 2, y0 - 2, y1 + 2, 60, 64, MARBLE)
    # portico with columns on the left (+y) face
    for a in np.linspace(x0 + 4, x1 - 4, 5):
        v.cyl(a, y1 + 16, 3.4, 6, 54, MARBLE)
        v.box(a - 4.5, a + 4.5, y1 + 11.5, y1 + 20.5, 50, 54, MARBLE)
        v.cyl(a, y1 + 16, 4.4, 6, 9, MARBLE)
    v.box(x0 - 3, x1 + 3, y1, y1 + 22, 54, 60, GOLD)
    v.box(x0 - 2, x1 + 2, y1, y1 + 21, 60, 64, MARBLE)
    v.roof(x0 - 4, x1 + 4, y0 - 4, y1 + 22, 64, 92, PAL_ID('temple_dome'), axis='y', th=4, fill=MARBLE)
    # pediment sun disk
    v.put((-9, 9, y1 + 21, y1 + 24, 66, 86), lambda X, Y, Z: (X ** 2 + (Z - 74) ** 2 <= 42) & (Y < y1 + 23), HOLY)
    # drum + dome
    v.cyl(0, -6, 22, 80, 110, MARBLE)
    for k in range(10):
        a = k / 10 * 2 * np.pi
        v.cyl(22 * np.cos(a), -6 + 22 * np.sin(a), 2.4, 80, 110, GOLD)
    v.cyl(0, -6, 24, 108, 112, GOLD)
    v.put((-24, 24, -30, 18, 112, 170), lambda X, Y, Z: (X ** 2 + (Y + 6) ** 2) / 23.0 ** 2 + ((Z - 112) / 44.0) ** 2 <= 1, PAL_ID('temple_dome'))
    v.cyl(0, -6, 4, 152, 166, GOLD); v.cone(0, -6, 3, 166, 186, GOLD, p=1.5)
    v.ell(0, -6, 192, 4.2, 4.2, 4.2, HOLY)
    for ang in (0.6, 1.4):
        cx, cy = 22 * np.cos(ang), -6 + 22 * np.sin(ang)
        v.put((cx - 4, cx + 4, cy - 4, cy + 4, 86, 104), lambda X, Y, Z, cx=cx, cy=cy: ((X - cx) ** 2 + (Y - cy) ** 2 <= 9) & (Z < 102), HOLY)
    # holy windows on the cella
    for a in (-4,):
        window(v, 'x', x1, -26, -18, 18, 38, frame=GOLD, glass=HOLY, arch=True, cross=False, sill=False)
        window(v, 'x', x1, -2, 6, 18, 38, frame=GOLD, glass=HOLY, arch=True, cross=False, sill=False)
        window(v, 'x', x1, 20, 28, 18, 38, frame=GOLD, glass=HOLY, arch=True, cross=False, sill=False)
    door(v, 'y', y1, -8, 8, 30, frame=GOLD, leaf=PLANK, arch=True)
    # braziers
    for bx in (x0 - 4, x1 + 4):
        v.cyl(bx, y1 + 30, 1.5, 0, 14, METAL); v.cone(bx, y1 + 30, 4.5, 14, 18, GOLD, r1=4.5) if False else v.cyl(bx, y1 + 30, 4, 14, 18, GOLD)
        v.cone(bx, y1 + 30, 3.4, 18, 26, FIRE, p=1.3)
    return v

@bld('barn')
def barn():
    v = Vol(-56, 60, -44, 48, 0, 140)
    x0, x1, y0, y1 = -40, 40, -26, 26
    v.box(x0, x1, y0, y1, 0, 4, STONE)
    v.box(x0 + 1, x1 - 1, y0 + 1, y1 - 1, 4, 40, PAL_ID('barn_pl'))
    # gambrel roof (convex profile) along y so the gable faces right
    v.roof(x0 - 6, x1 + 6, y0 - 5, y1 + 5, 38, 96, ROOF_S, axis='y', th=5, curve=0.6, fill=PAL_ID('barn_pl'))
    for zz in (40,):
        pass
    gable_frame(v, 'y', y1 - 1, x0, x1, 40, 92, mat=CREAM) if False else None
    # big X doors on the left face and the hayloft
    for (a0, a1) in ((-14, 14),):
        fbox(v, 'y', y1 - 1, a0, a1, 4, 34, -2, 1.2, CREAM)
        fbox(v, 'y', y1 - 1, a0 + 2, a1 - 2, 6, 32, -3, 1.4, 0)
        fbox(v, 'y', y1 - 1, a0 + 2, a1 - 2, 6, 32, -3, -1, PAL_ID('barn_pl'))
        for s in np.linspace(0, 1, 60):
            for sg in (0, 1):
                xx = a0 + 2 + (a1 - a0 - 4) * (s if sg else 1 - s); zz = 6 + 26 * s
                fbox(v, 'y', y1 - 1, xx - 1, xx + 1, zz - 1, zz + 1, -1.5, 0.6, CREAM)
        fbox(v, 'y', y1 - 1, -0.6, 0.6, 6, 32, -1.5, 0.6, CREAM)
    for face, c, a0, a1 in (('y', y1 - 1, -38, -26), ('y', y1 - 1, 26, 38), ('x', x1 - 1, -12, 0)):
        window(v, face, c, a0 + 3, a1 - 3, 16, 26, frame=CREAM, cross=True)
    # hayloft on the right gable
    fbox(v, 'x', x1 + 1, -9, 9, 50, 70, -1, 1, CREAM); fbox(v, 'x', x1 + 1, -7, 7, 52, 68, -4, 2, 0)
    v.ell(x1 - 3, 0, 52, 3, 7, 4, HAY)
    v.box(x1 - 2, x1 + 12, -1, 1, 74, 76, TIMBER)
    v.box(x1 + 10, x1 + 11, -0.5, 0.5, 60, 74, ROPE)
    # hay bales + cart wheel
    for (hx_, hy_, hz) in ((x1 + 6, y1 + 6, 0), (x1 + 14, y1 + 2, 0), (x1 + 9, y1 + 3, 8)):
        v.box(hx_, hx_ + 9, hy_, hy_ + 7, hz, hz + 8, HAY)
        v.box(hx_ + 2, hx_ + 3, hy_ - 0.3, hy_ + 7.3, hz, hz + 8.3, ROPE)
    v.put((x0 - 4, x0 + 10, y1 + 2, y1 + 4, 0, 16), lambda X, Y, Z: (np.abs(np.hypot(X - x0 - 3, Z - 7.5) - 6.5) < 1.1) | ((np.hypot(X - x0 - 3, Z - 7.5) < 6.5) & ((np.abs(X - x0 - 3) < 0.6) | (np.abs(Z - 7.5) < 0.6))), PLANK)
    return v

PAL[51] = Mat('#a33a2a', t_plank, params={'w': 4}, hs=26)
_old = PAL_ID
def PAL_ID(k):
    return {'tower_st': 48, 'tower_roof': 49, 'temple_dome': 50, 'barn_pl': 51}[k]

def stall(cloth):
    v = Vol(-30, 30, -24, 26, 0, 70)
    x0, x1, y0, y1 = -20, 20, -12, 12
    for (px, py) in ((x0, y0), (x1 - 2, y0), (x0, y1 - 2), (x1 - 2, y1 - 2)):
        v.box(px, px + 2, py, py + 2, 0, 40 if py < 0 else 30, TIMBER)
    v.box(x0, x1, y0, y1 + 2, 12, 14, WOOD_L)
    v.box(x0, x1, y1, y1 + 2, 0, 12, PLANK)
    # awning sloping toward the viewer (+y) with scalloped edge
    v.put((x0 - 3, x1 + 3, y0 - 4, y1 + 2, 30, 48),
          lambda X, Y, Z: (np.abs(Z - (37 + (Y - y0) * 0.32)) < 1.0) & (Y < y1 - 4 - (np.sin((X - x0) * 0.8) > 0) * 1.5), cloth)
    for px in (x0, x1 - 2):
        v.box(px, px + 2, y1 - 6, y1 - 4, 0, 44, TIMBER)
    # produce
    for k, (mat, cx) in enumerate(((APPLE, -14), (PUMPKIN, -3), (CABBAGE, 9))):
        crate(v, cx - 4.5, y1 - 10, 9, PLANK, z=14)
        for j in range(7):
            ox, oy = (j % 3) * 2.6 - 2.6, (j // 3) * 2.6 - 2.6
            v.ell(cx + ox + 0.4, y1 - 5.5 + oy, 23.5 + (j % 2) * 0.6, 1.8, 1.8, 1.6, mat)
    crate(v, x1 + 2, y1 - 6, 8, PLANK); v.ell(x1 + 6, y1 - 2, 9, 3.5, 3.5, 2, APPLE)
    barrel(v, x0 - 5, y1 + 2, 3.2, 8)
    return v

@bld('stall-red')
def stall_r(): return stall(RED_AWN)
@bld('stall-blue')
def stall_b(): return stall(BLU_AWN)
@bld('stall-green')
def stall_g(): return stall(GRN_AWN)

@bld('well')
def well():
    v = Vol(-22, 22, -22, 22, 0, 70)
    PAL[52] = Mat('#9a8f86', t_stone, params={'c': (0, 0), 'r': 12, 'ch': 4.5, 'bl': 6, 'moss': 40, 'mossh': 10})
    v.cyl(0, 0, 13, 0, 13, 52, rin=9)
    v.cyl(0, 0, 14, 12, 15, STONE_D, rin=9)
    v.cyl(0, 0, 9, 0, 9, WATER)
    for py in (-12, 12):
        v.box(-1.5, 1.5, py - 1.5, py + 1.5, 13, 40, TIMBER)
    v.cyl(0, 0, 0, 0, 0, 0) if False else None
    v.box(-1, 1, -14, 14, 30, 32.5, WOOD_L)
    v.box(-1, 1, 14, 18, 28, 29.5, METAL)
    v.box(-2.5, 2.5, -1.5, 1.5, 20, 25, PLANK); v.box(-0.3, 0.3, -0.3, 0.3, 25, 30, ROPE)
    v.roof(-12, 12, -18, 18, 36, 52, ROOF_R, axis='y', th=3.5)
    v.box(-12, 12, -0.8, 0.8, 50, 53, TIMBER) if False else None
    return v

@bld('noticeboard')
def noticeboard():
    v = Vol(-22, 22, -10, 12, 0, 56)
    for px in (-15, 13):
        v.box(px, px + 2.5, -1, 1.5, 0, 42, TIMBER)
    v.box(-16, 16, -0.5, 1.5, 14, 36, PLANK)
    v.box(-17, 17, -0.6, 2.2, 13, 14.5, TIMBER); v.box(-17, 17, -0.6, 2.2, 35.5, 37, TIMBER)
    papers = [(-13, 18, 8, 9, PAPER), (-3, 24, 7, 9, CREAM), (6, 17, 7, 8, PAPER), (-12, 28, 6, 6, CREAM), (5, 26, 8, 7, PAPER)]
    for (a, z, w, h, m) in papers:
        v.box(a, a + w, 1.5, 2.1, z, z + h, m)
        v.box(a + w / 2 - 0.5, a + w / 2 + 0.5, 2.0, 2.5, z + h - 1.5, z + h - 0.5, CLOTH_R)
    v.roof(-19, 19, -5, 7, 38, 48, ROOF_R, axis='x', th=2.5)
    return v

@bld('campfire')
def campfire():
    v = Vol(-14, 14, -14, 14, 0, 26)
    for k in range(9):
        a = k / 9 * 2 * np.pi
        v.ell(9 * np.cos(a), 9 * np.sin(a), 1.2, 2.8, 2.6, 2.2, STONE_D)
    for a in (0.3, 1.9, 3.5, 5.0):
        c, s = np.cos(a), np.sin(a)
        v.capsule((6 * c, 6 * s, 1.2), (-1 * c, -1 * s, 4.5), 1.4, BARK)
    v.cyl(0, 0, 3.5, 1, 3, COAL)
    v.put((-6, 6, -6, 6, 2, 22), lambda X, Y, Z: (X ** 2 + Y ** 2) <= (4.6 * (1 - (Z - 2) / 18) ** 1.2 + 0.9 * np.sin(Z * 0.9 + np.arctan2(Y, X) * 3)) ** 2, FIRE)
    return v

def canopy(v, cx, cy, cz, r, mat, seed=1, n=9):
    rng = np.random.default_rng(seed)
    blobs = [(cx, cy, cz, r * 0.8)]
    for k in range(n):
        a = rng.uniform(0, 2 * np.pi); e = rng.uniform(-0.6, 0.8)
        d = r * rng.uniform(0.45, 0.7)
        blobs.append((cx + d * np.cos(a) * np.cos(e), cy + d * np.sin(a) * np.cos(e), cz + d * np.sin(e) * 0.8, r * rng.uniform(0.42, 0.58)))
    for (bx, by, bz, br) in blobs:
        v.put((bx - br - 2, bx + br + 2, by - br - 2, by + br + 2, bz - br - 2, bz + br + 2),
              lambda X, Y, Z, bx=bx, by=by, bz=bz, br=br: (X - bx) ** 2 + (Y - by) ** 2 + ((Z - bz) * 1.1) ** 2 <= (br + 1.4 * (hash3(np.floor(X / 2).astype(np.int64), np.floor(Y / 2).astype(np.int64), np.floor(Z / 2).astype(np.int64), 5) - 0.5) * 2) ** 2, mat)

def bare(v, z0, r, seed=1):
    """Winter: a leafless crown for a summer canopy of radius r, limbs forking out of the trunk from z0 (thinner
    at each fork); the snow on them comes from the winter bark (tex.hiver)."""
    rng = np.random.default_rng(seed)
    def limb(a, ang, tilt, length, rad, depth):
        b = (a[0] + length * np.cos(ang) * np.cos(tilt), a[1] + length * np.sin(ang) * np.cos(tilt), a[2] + length * np.sin(tilt))
        v.capsule(a, b, rad, BARK)
        if depth:
            for s in (-1, 1):
                limb(b, ang + s * rng.uniform(0.3, 0.7), min(1.3, tilt + rng.uniform(0.0, 0.35)), length * 0.72, max(0.7, rad * 0.7), depth - 1)
    for k in range(5):
        ang = k / 5 * 2 * np.pi + rng.uniform(-0.4, 0.4)
        limb((0, 0, z0 + k * 2.4), ang, rng.uniform(0.45, 0.8), r * 0.52, 1.8, 3)

@bld('tree-oak')
def oak():
    v = Vol(-34, 34, -34, 34, 0, 96)
    v.put((-6, 6, -6, 6, 0, 50), lambda X, Y, Z: X ** 2 + Y ** 2 <= (2.6 + 3.2 * np.clip(1 - Z / 9, 0, 1) ** 2) ** 2, BARK)
    v.capsule((0, 0, 30), (10, -4, 46), 1.8, BARK); v.capsule((0, 0, 32), (-9, 6, 44), 1.8, BARK)
    if LOOK['arbres_nus']: bare(v, 34, 26, seed=3)
    else: canopy(v, 0, 0, 52, 27, LEAF, seed=3, n=12)
    return v

@bld('tree-pine')
def pine():
    v = Vol(-22, 22, -22, 22, 0, 110)
    v.cyl(0, 0, 2.4, 0, 30, BARK)
    for k, (z0, r) in enumerate(((16, 19), (36, 16), (54, 12.5), (70, 9))):
        v.put((-r - 2, r + 2, -r - 2, r + 2, z0, z0 + 30),
              lambda X, Y, Z, z0=z0, r=r: np.hypot(X, Y) <= (r * (1 - (Z - z0) / 30) + 1.4 * np.sin(np.arctan2(Y, X) * 9) * (1 - (Z - z0) / 30)), LEAF_D)
    return v

@bld('bush')
def bush():
    v = Vol(-18, 18, -18, 18, 0, 26)
    canopy(v, 0, 0, 8, 11, LEAF_F, seed=7, n=7)
    return v

@bld('tree-autumn')
def autumn():
    v = Vol(-26, 26, -26, 26, 0, 80)
    v.put((-6, 6, -6, 6, 0, 40), lambda X, Y, Z: X ** 2 + Y ** 2 <= (2.2 + 2.6 * np.clip(1 - Z / 8, 0, 1) ** 2) ** 2, BARK)
    if LOOK['arbres_nus']: bare(v, 30, 18, seed=11)
    else: canopy(v, 0, 0, 50, 19, LEAF_A, seed=11, n=9)
    return v

@bld('rocks')
def rocks():
    v = Vol(-18, 18, -16, 16, 0, 18)
    for (x, y, rx, ry, rz) in ((-4, -2, 9, 7, 9), (6, 4, 6, 5, 6), (-9, 7, 4, 4, 4), (9, -6, 3.5, 3, 3)):
        v.put((x - rx - 2, x + rx + 2, y - ry - 2, y + ry + 2, 0, rz + 2),
              lambda X, Y, Z, x=x, y=y, rx=rx, ry=ry, rz=rz: ((X - x) / rx) ** 2 + ((Y - y) / ry) ** 2 + (Z / rz) ** 2 <= 1 - 0.25 * (hash3(np.floor(X / 3).astype(np.int64), np.floor(Y / 3).astype(np.int64), np.floor(Z / 3).astype(np.int64), 9)), STONE_D)
    v.put((-16, 16, -14, 14, 0, 10), lambda X, Y, Z: (Z > 6) & (hash3(np.floor(X / 2).astype(np.int64), np.floor(Y / 2).astype(np.int64), np.zeros_like(X, dtype=np.int64), 3) > 0.7) & (v.m[0:1, 0:1, 0:1].size > 0) & False, MOSS)
    return v

def fence(axis):
    v = Vol(-20, 20, -20, 20, 0, 18)
    for k in (-15, 0, 15):
        if axis == 'x': v.box(k - 1.2, k + 1.2, -1.2, 1.2, 0, 15, TIMBER); v.cone(k, 0, 1.3, 15, 17, TIMBER)
        else: v.box(-1.2, 1.2, k - 1.2, k + 1.2, 0, 15, TIMBER); v.cone(0, k, 1.3, 15, 17, TIMBER)
    for zz in (5, 11):
        if axis == 'x': v.box(-16, 16, -0.6, 0.6, zz, zz + 2, WOOD_L)
        else: v.box(-0.6, 0.6, -16, 16, zz, zz + 2, WOOD_L)
    return v

@bld('fence-x')
def fx(): return fence('x')
@bld('fence-y')
def fy(): return fence('y')

@bld('windmill')
def windmill():
    v = Vol(-62, 66, -62, 66, 0, 180)
    taper = lambda Z: 18 - (Z - 8) * 0.06
    v.cyl(0, 0, 21, 0, 8, STONE)
    v.put((-19, 19, -19, 19, 8, 102), lambda X, Y, Z: X ** 2 + Y ** 2 <= taper(Z) ** 2, PLASTER)
    for zz in (38, 72):
        v.cyl(0, 0, taper(zz) + 0.8, zz, zz + 2, TIMBER)
    v.cyl(0, 0, taper(100) + 2, 100, 103, TIMBER)
    # thatched cap with a curved profile, gold finial
    v.put((-18, 18, -18, 18, 103, 136), lambda X, Y, Z: X ** 2 + Y ** 2 <= (1 + 15.5 * (1 - (Z - 103) / 33) ** 0.8) ** 2, ROOF_T)
    v.cyl(0, 0, 0.9, 134, 142, GOLD); v.ell(0, 0, 142, 1.8, 1.8, 1.8, GOLD)
    # sails facing the viewer (plane x + y = const), turned a little off the cross
    hub, hz, r2 = 12.5, 108, np.sqrt(2)
    v.capsule((0, 0, hz), (hub, hub, hz), 1.8, TIMBER)
    v.ell(hub + 0.6, hub + 0.6, hz, 3, 3, 3, METAL)
    for k in range(4):
        th = np.radians(25 + 90 * k)
        def blade(X, Y, Z, th=th, part=0):
            s = (X - Y) / r2; t = Z - hz; w = (X + Y) / r2 - hub * r2
            al = s * np.cos(th) + t * np.sin(th); ac = -s * np.sin(th) + t * np.cos(th)
            if part == 0:
                return (np.abs(w) < 0.9) & (al > 2) & (al < 60) & (np.abs(ac) < 1.1)
            lat = (al > 12) & (al < 58) & (ac > 1.1) & (ac < 10) & (np.abs(w - 0.3) < 0.9)
            bars = (np.mod(al, 7.5) < 1.1) | (ac > 8.8) | (al > 56.9)
            return lat & (bars if part == 1 else ~bars)
        bb = (-48, 66, -48, 66, 40, 178)
        v.put(bb, lambda X, Y, Z, f=blade: f(X, Y, Z, part=2), CREAM)
        v.put(bb, lambda X, Y, Z, f=blade: f(X, Y, Z, part=1), WOOD_L)
        v.put(bb, lambda X, Y, Z, f=blade: f(X, Y, Z, part=0), TIMBER)
    # door, windows, lantern
    door(v, 'y', taper(10) - 0.5, -5, 5, 15, arch=True)
    lantern(v, 9, taper(20) + 1.5, 26)
    window(v, 'x', taper(52) - 0.5, -3, 3, 48, 57, cross=False, sill=False)
    window(v, 'y', taper(80) - 0.5, -3, 3, 76, 85, cross=False, sill=False)
    # flour sacks, a cart wheel, hay
    for (sx, sy, sz) in ((16, 12, 0), (21, 7, 0), (18, 10, 5)):
        v.ell(sx, sy, sz + 3, 3.2, 2.6, 3.4, CLOTH_W)
    for (hx_, hy_) in ((-26, 14), (-17, 20)):
        v.box(hx_, hx_ + 9, hy_, hy_ + 7, 0, 7, HAY)
        v.box(hx_ + 3, hx_ + 4, hy_ - 0.3, hy_ + 7.3, 0, 7.3, ROPE)
    barrel(v, 24, -6)
    return v

@bld('dock')
def dock():
    v = Vol(-24, 34, -52, 40, 0, 40)
    y0, y1 = -44, 32  # the jetty runs along y; its +y end rests on the shore
    v.box(-7, -5.6, y0, y1, 3.6, 5, TIMBER); v.box(5.6, 7, y0, y1, 3.6, 5, TIMBER)
    for yy in np.arange(y0, y1, 3.1):
        v.box(-7.5, 7.5, yy, yy + 2.6, 5, 6.4, PLANK)
    for yy in np.arange(y0 + 1, y1 - 4, 12):
        for xx in (-8, 6.4):
            v.box(xx, xx + 1.8, yy, yy + 1.8, 0, 9 if yy == y0 + 1 else 6.4, TIMBER)
    for xx in (-8, 6.4):
        v.box(xx - 0.3, xx + 2.1, y0 + 0.7, y0 + 3.1, 7, 8, ROPE)
    # a lantern pole at the end
    v.box(-7.5, -5.7, y0 + 6, y0 + 7.8, 6.4, 30, TIMBER)
    v.box(-7.5, -1, y0 + 6.2, y0 + 7.6, 28, 29.5, TIMBER)
    lantern(v, -2, y0 + 7, 26)
    v.box(-3.4, -0.6, y0 + 4.7, y0 + 9.3, 22.8, 26, FIRE); v.box(-4.3, 0.3, y0 + 5.6, y0 + 8.4, 22.8, 26, FIRE)
    # a rowboat moored alongside
    bx, by = 15, -16
    hull = lambda X, Y, Z, k=1.0: ((X - bx) / (5.5 * k)) ** 2 + ((Y - by) / (15 * k)) ** 2 <= 1 - np.clip((3.5 - Z) / 5, 0, 1) ** 2
    v.put((bx - 7, bx + 7, by - 17, by + 17, 0, 5), lambda X, Y, Z: hull(X, Y, Z) & ~(hull(X, Y, Z, 0.8) & (Z > 1.2)), PLANK_R)
    v.box(bx - 4.5, bx + 4.5, by - 1, by + 1.5, 2.6, 3.6, WOOD_L)
    v.box(bx - 1, bx + 1, by + 4, by + 14, 1.6, 2.4, WOOD_L)
    v.capsule((bx - 2, by - 4, 3.5), (bx + 6, by + 10, 2), 0.5, WOOD_L)
    v.capsule((bx + 1, by - 12, 3.8), (6.4, by - 16, 7.5), 0.3, ROPE)
    # crates, a barrel and a coil of rope on the shore end
    crate(v, -6, y1 - 9, 6, z=6.4); crate(v, -5, y1 - 15, 5, z=6.4)
    barrel(v, 3, y1 - 6, 3, 8, z=6.4)
    v.cyl(2, y1 - 16, 2.4, 6.4, 7.6, ROPE, rin=1.0)
    return v

def footbridge(front_only=False):
    """A wooden footbridge along x on stone abutments, ramps down to both banks. front_only: its front (+y)
    rail alone, the mask of the cut-out drawn over heroes crossing the deck (bake_wide.py)."""
    v = Vol(-42, 42, -14, 14, 0, 22)
    x0, x1, w = -26, 26, 8  # the deck spans the water from x0 to x1; heroes walk at y = 0
    if not front_only:
        for a, b in ((x0 - 8, x0 + 2), (x1 - 2, x1 + 8)):
            v.box(a, b, -w - 1.5, w + 1.5, 0, 4, STONE)
        v.put((x0 - 15, x0 - 8, -w, w, 0, 5.2), lambda X, Y, Z: Z < 5.2 * (X - (x0 - 15)) / 7, PLANK)
        v.put((x1 + 8, x1 + 15, -w, w, 0, 5.2), lambda X, Y, Z: Z < 5.2 * ((x1 + 15) - X) / 7, PLANK)
        for yy in (-w + 0.5, w - 2):
            v.box(x0 - 8, x1 + 8, yy, yy + 1.5, 2.6, 4, TIMBER)
            for xx in (-10, 9):
                v.box(xx, xx + 1.8, yy, yy + 1.8, 0, 4, TIMBER)  # piles in the stream
        for xx in np.arange(x0 - 8, x1 + 8, 3.1):
            v.box(xx, xx + 2.6, -w, w, 4, 5.2, PLANK)
    for yy in ((w - 1.6,) if front_only else (-w, w - 1.6)):
        for xx in np.arange(x0 - 6, x1 + 7, 11):
            v.box(xx - 0.8, xx + 0.8, yy, yy + 1.6, 4, 14, TIMBER)
        v.box(x0 - 7, x1 + 7, yy + 0.1, yy + 1.5, 12.2, 13.6, WOOD_L)
        v.box(x0 - 7, x1 + 7, yy + 0.3, yy + 1.3, 8.4, 9.4, WOOD_L)
    return v

@bld('bridge')
def bridge(): return footbridge()
@bld('bridge-rail')
def bridge_rail(): return footbridge(True)

@bld('ruin')
def ruin():
    v = Vol(-48, 48, -48, 48, 0, 170)
    x0, x1, y0, y1 = -23, 23, -23, 23
    v.box(x0 - 3, x1 + 3, y0 - 3, y1 + 3, 0, 6, STONE_D)
    # a hollow square keep, its front corner fallen in: the top drops steeply towards +x+y, every
    # stone course broken at its own height
    def top(X, Y):
        h = 132 - 62 * np.clip((X + Y - 4) / 34, 0, 1) ** 1.3
        return h - 12 * hash3(np.floor(X / 4).astype(np.int64), np.floor(Y / 4).astype(np.int64), np.zeros_like(X, dtype=np.int64), 21)
    shell = lambda X, Y, Z: ((np.abs(X) > 19) | (np.abs(Y) > 19)) & (Z < top(X, Y))
    v.put((x0, x1, y0, y1, 6, 140), shell, STONE)
    for zz in (46, 88):
        v.put((x0 - 2, x1 + 2, y0 - 2, y1 + 2, zz, zz + 4), lambda X, Y, Z: shell(np.clip(X, -23, 23) * 0.99, np.clip(Y, -23, 23) * 0.99, Z) & (Z < top(X, Y) - 2), STONE_D)
    # surviving merlons on the back corner
    for a in np.arange(-25, 0, 6):
        v.box(a, a + 3.5, -25, -21, 126, 135, STONE)
        v.box(-25, -21, a, a + 3.5, 126, 135, STONE)
    # a charred floor beam sticking out of the breach, arrow slits, an open arched doorway
    v.box(-8, 30, -4, -1, 82, 85, TIMBER)
    for face, c in (('y', y1), ('x', x1)):
        for (a, zz) in ((-12, 28), (8, 62), (-8, 100)):
            if zz < 70 or face == 'y':
                fbox(v, face, c, a, a + 2, zz, zz + 10, -4.5, 0.5, 0)
    door(v, 'y', y1, -7, 5, 20, frame=STONE_D, leaf=COAL, studs=None)
    lantern(v, -14, y1 + 2, 28)
    v.box(-15.4, -12.6, y1 - 0.3, y1 + 4.3, 24.8, 28, FIRE); v.box(-16.3, -11.7, y1 + 0.6, y1 + 3.4, 24.8, 28, FIRE)
    # rubble from the fallen corner, ivy on the left face
    rng = np.random.default_rng(5)
    for k in range(26):
        a = rng.uniform(-0.3, 1.9); d = rng.uniform(28, 44)
        rx, ry = d * np.cos(a), d * np.sin(a)
        s = rng.uniform(2, 4.5)
        v.box(rx, rx + s * 1.3, ry, ry + s, 0, s * rng.uniform(0.6, 1.0), STONE if k % 3 else STONE_D)
    for (ix, iz, ir) in ((-16, 40, 6), (-19, 54, 5), (-12, 66, 5.5), (-18, 78, 4.5), (12, 12, 5)):
        v.ell(ix, y1 + 1, iz, ir, 2.2, ir * 1.2, LEAF)
    return v

# ---------------------------------------------------------------- the port (maps/port.json)
# The sea is drawn flat like the ground, but reads as lying MER units below the land: quay walls drop to it, the pier
# stands on piles in it, boats float on it (their waterline at z = -MER, their anchor the land-level point above it).
MER = 10
PAL[54] = Mat('#b8382c', t_plaster, light=1.15, hs=22)  # lighthouse red paint
PAL[55] = Mat('#ece6da', t_plaster, light=1.1, hs=14)   # whitewash
PAL[56] = Mat('#e8f4f6', t_noise, params={'amp': 0.6}, light=1.05, hs=10)  # foam at a waterline
PAL[57] = Mat('#5e6a5a', t_noise, params={'amp': 1.2, 'sc': 1.0}, hs=16)  # fishing net, wet and tarred
PAL[58] = Mat('#958c84', t_stone, params={'ch': 5, 'bl': 11}, hs=24)  # quay ashlar (no moss: the land's moss rule is by height)
PAL[59] = Mat('#5a5664', t_stone, params={'ch': 5, 'bl': 9}, hs=22)   # its wet foot
RED_P, WHITE_P, FOAM, NET, QUAI, QUAI_D = 54, 55, 56, 57, 58, 59

def flamme(v, x, y, z):
    """The flame showing through the panes of kit3d.lantern(v, x, y, z) (it is shut inside its iron box otherwise)."""
    v.box(x - 2.3, x + 2.3, y - 1.2, y + 1.2, z - 3.2, z, FIRE); v.box(x - 1.2, x + 1.2, y - 2.3, y + 2.3, z - 3.2, z, FIRE)

def quay(axis):
    """A quay wall segment, 32 units along its axis (44.8 px: a run of them at 'pas' 44 joins up), its face towards the
    viewer (+y for 'x', +x for 'y') dropping MER units from the land (z = 0) to the sea, a coping on top and a
    bollard; the land is behind it (-y / -x). The anchor (0, 0, 0) is the face's top edge, mid-segment."""
    v = Vol(-18, 18, -18, 18, -MER - 1, 12)
    def b(a0, a1, d0, d1, z0, z1, mat):  # a along the run, d out of the face
        if axis == 'x': v.box(a0, a1, d0, d1, z0, z1, mat)
        else: v.box(d0, d1, a0, a1, z0, z1, mat)
    b(-16, 16, -9, 0, -MER, 0, QUAI)                      # the wall
    b(-16, 16, -9, 0, -MER, -MER + 2.5, QUAI_D)           # wet foot
    b(-16, 16, -10, 1.2, 0, 1.6, QUAI_D)                  # coping
    for a in (-16, 0):                                    # coping joints
        b(a, a + 0.6, -10, 1.2, 0.2, 1.6, COAL)
    b(-11, -7, -6, -2, 1.6, 7, TIMBER)                    # bollard
    b(-11.6, -6.4, -6.6, -1.4, 6.2, 7.6, METAL)
    b(-9.5, -8.5, -0.2, 0.6, -MER + 3, -MER + 7, METAL)   # mooring ring
    b(-10.5, -7.5, -0.2, 0.6, -MER + 2.6, -MER + 3.4, METAL)
    rng = np.random.default_rng(31 if axis == 'x' else 37)
    for k in range(5):                                    # weed at the foot
        a = rng.uniform(-15, 13)
        b(a, a + rng.uniform(1.5, 3.5), -0.4, 0.4, -MER, -MER + rng.uniform(1, 2.5), MOSS)
    return v

@bld('quay-x')
def quay_x(): return quay('x')
@bld('quay-y')
def quay_y(): return quay('y')

@bld('pier')
def pier():
    """A wooden pier along +x from the quay's face (x = 0, deck at land level) out to x = 80, on piles standing in
    the sea; a lantern post and bollards at its end."""
    L, w = 80, 8
    v = Vol(-3, L + 4, -12, 12, -MER - 1, 32)
    for yy in (-w, w - 1.5):
        v.box(0, L, yy, yy + 1.5, -1.6, 0, TIMBER)
    for xx in np.arange(0, L, 3.1):
        v.box(xx, xx + 2.6, -w - 0.4, w + 0.4, 0, 1.4, PLANK)
    for xx in np.arange(6, L, 16):
        for yy in (-w - 1.6, w - 0.2):
            v.box(xx, xx + 1.8, yy, yy + 1.8, -MER, 1, TIMBER)
            v.box(xx - 0.2, xx + 2, yy - 0.2, yy + 2, -MER, -MER + 1.5, STONE_D)
    for yy in (-w - 1.6, w - 0.2):  # the end's taller piles as bollards, with rope
        v.box(L - 2, L, yy, yy + 1.8, -MER, 6, TIMBER)
        v.box(L - 2.3, L + 0.3, yy - 0.3, yy + 2.1, 3.6, 4.6, ROPE)
    v.box(L - 6, L - 4.4, -w + 1, -w + 2.6, 1.4, 26, TIMBER)  # lantern post
    v.box(L - 6, L - 1, -w + 1.1, -w + 2.4, 24, 25.4, TIMBER)
    lantern(v, L - 2, -w + 1.8, 22); flamme(v, L - 2, -w + 1.8, 22)
    v.cyl(L - 14, w - 4, 2.4, 1.4, 2.6, ROPE, rin=1.0)
    crate(v, 18, -w + 0.5, 5, z=1.4); crate(v, 18.5, -w + 0.8, 4, z=6.4)
    for k in range(4):  # a ladder down the end
        v.box(L, L + 1, -2, 2, -MER + 1 + k * 2.8, -MER + 1.8 + k * 2.8, WOOD_L)
    for yy in (-2.4, 1.6):
        v.box(L, L + 1.2, yy, yy + 0.8, -MER, 1.4, WOOD_L)
    return v

def hull(v, L, B, zb, zt, mat, rim, floor=None, sheer=2.0):
    """A boat's hull along x (bow +x), L long, B wide at the beam, from its keel zb to its gunwale zt (rising sheer
    towards both ends); hollow above 'floor' (None: decked at zt - 1.2); a rim band under the gunwale."""
    hl, hb = L / 2, B / 2
    def w(X, Z):
        t = np.clip(np.abs(X) / hl, 0, 1)
        k = np.where(X > 0, (1 - t ** 2.0), (1 - t ** 4.5)) ** 0.5
        return hb * k * (0.62 + 0.38 * np.clip((Z - zb) / (zt - zb), 0, 1) ** 0.6)
    top = lambda X: zt + sheer * np.clip(np.abs(X) / hl, 0, 1) ** 2
    shell = lambda X, Y, Z: (np.abs(Y) <= w(X, Z)) & (Z >= zb) & (Z < top(X))
    bb = (-hl - 1, hl + 1, -hb - 1, hb + 1, zb, zt + sheer + 1)
    v.put(bb, shell, mat)
    v.put(bb, lambda X, Y, Z: shell(X, Y, Z) & (Z > top(X) - 1.8), rim)
    fl = zt - 1.2 if floor is None else floor
    v.put(bb, lambda X, Y, Z: shell(X, Y, Z) & (np.abs(Y) <= w(X, Z) - 1.1) & (np.abs(X) < hl - 1.6) & (Z > fl), 0)
    # foam where it meets the sea
    v.put((-hl - 3, hl + 3, -hb - 3, hb + 3, zb, zb + 0.7),
          lambda X, Y, Z: (np.abs(Y) <= w(np.clip(X, -hl * 0.97, hl * 0.97), zb) + 1.6) & (np.abs(X) <= hl + 1.4) & ~shell(X, Y, Z), FOAM)

@bld('boat-small')
def boat_small():
    """A fishing skiff afloat (its waterline MER below the anchor): thwarts, oars shipped, a heap of net and a fish
    basket."""
    v = Vol(-22, 22, -10, 10, -MER - 1, 0)
    zb = -MER
    hull(v, 34, 11, zb, zb + 5.5, PLANK, PLANK_R, floor=zb + 1.2)
    for xx in (-6, 5):
        v.box(xx, xx + 2.4, -4.4, 4.4, zb + 3.4, zb + 4.4, WOOD_L)
    v.capsule((-12, -3, zb + 5.6), (13, 2.4, zb + 5.2), 0.5, WOOD_L)
    v.capsule((-11, 3, zb + 5.6), (12, -2.8, zb + 5.4), 0.5, WOOD_L)
    v.ell(-11, 0, zb + 2.4, 3.6, 3, 1.8, NET)
    v.cyl(9, 0, 2.2, zb + 1.2, zb + 4, HAY)
    return v

@bld('boat-large')
def boat_large():
    """A one-masted trading cog afloat, sail furled on its yard: a stern castle, rigging, a pennant, cargo on deck.
    Built at a larger scale (build()): its waterline is MER * 1.75 px under its anchor."""
    v = Vol(-42, 42, -16, 16, -MER - 1, 92)
    zb, zt = -MER, 3
    hull(v, 72, 22, zb, zt, PLANK, PLANK_R, floor=0, sheer=3.0)
    v.box(-32, 30, -9, 9, -0.6, 0.6, WOOD_L)                       # deck
    # stern castle with a rail and a door
    v.box(-34, -20, -9.5, 9.5, 0, 9, PLANK)
    v.box(-34.5, -19.5, -10, 10, 9, 10.2, TIMBER)
    for yy in np.arange(-9.5, 10, 3.2):
        v.box(-21, -19.6, yy, yy + 0.9, 10.2, 14, TIMBER)
    for xx in np.arange(-34, -20, 3.2):
        v.box(xx, xx + 0.9, 8.6, 9.6, 10.2, 14, TIMBER)
    v.box(-34.5, -19.5, 8.5, 10, 13.6, 14.8, TIMBER)
    v.box(-20.2, -19.4, -2.5, 2.5, 0, 7, COAL)
    v.box(-20.4, -19.6, -2, 2, 0.4, 6.4, PLANK_R)
    lantern(v, -34, 0, 19); flamme(v, -34, 0, 19)
    v.box(-34.8, -33.2, -0.8, 0.8, 10.2, 15, METAL)
    # mast, yard and the furled sail
    v.cyl(2, 0, 1.5, 0, 82, TIMBER)
    v.cyl(2, 0, 2.2, 74, 77, TIMBER)                             # top
    v.box(0.8, 3.2, -17, 17, 60, 61.6, WOOD_L)                    # yard
    v.put((-2, 6, -15, 15, 54, 62), lambda X, Y, Z: ((X - 2.6) / 2.6) ** 2 + ((Z - 58.6) / 3.0) ** 2 <= 1 - (np.abs(Y) / 15.5) ** 4, CLOTH_W)
    for yy in (-10, -3, 4, 11):
        v.box(1.8, 5.6, yy, yy + 0.8, 55, 61.8, ROPE)
    flag(v, 2, 0, 82, 6, CLOTH_R, 12)
    # rigging: stays to bow and stern, shrouds to the sides
    v.capsule((2, 0, 74), (35, 0, 4), 0.35, ROPE)
    v.capsule((2, 0, 74), (-33, 0, 14), 0.35, ROPE)
    for s in (-1, 1):
        for xx in (-2, 4):
            v.capsule((2, 0, 70), (xx, s * 10.5, 2.8), 0.3, ROPE)
    v.capsule((34, 0, 3.6), (42, 0, 8), 0.8, TIMBER)              # bowsprit
    # cargo
    crate(v, 10, -6, 6, z=0.6); crate(v, 10.5, -5.5, 5, z=6.6); crate(v, 17, -6, 6, z=0.6)
    barrel(v, 13, 5, 2.8, 7, z=0.6); barrel(v, 19, 4.5, 2.8, 7, z=0.6)
    v.cyl(-10, 3, 3, 0.6, 2, ROPE, rin=1.4)
    return v

@bld('lighthouse')
def lighthouse():
    """The harbour's lighthouse: a whitewashed tower with red bands on a stone base, a gallery, an open lantern whose
    flame shows by day and lights the night, a copper dome. Lit window slits, a stone porch with its door."""
    v = Vol(-34, 34, -34, 34, 0, 184)
    v.cyl(0, 0, 21, 0, 9, STONE_D)
    v.cyl(0, 0, 22, 8, 11, STONE)
    rad = lambda Z: 16.5 - (Z - 11) * 0.04
    band = lambda X, Y, Z: np.where(((Z - 11) // 24) % 2 == 1, RED_P, WHITE_P)
    v.put((-18, 18, -18, 18, 11, 128), lambda X, Y, Z: X ** 2 + Y ** 2 <= rad(Z) ** 2, band)
    # window slits facing the viewer, a stone sill under each
    for ang, z in ((0.55, 34), (1.1, 62), (0.65, 88), (1.0, 110)):
        R = rad(z)
        def m(X, Y, Z, d0, d1, z0, z1, ang=ang, R=R, w=1.6):
            an = np.arctan2(Y, X); da = np.abs(((an - ang + np.pi) % (2 * np.pi)) - np.pi) * R
            dr = np.hypot(X, Y)
            return (da <= w) & (Z >= z0) & (Z < z1) & (dr >= d0) & (dr <= d1)
        bb = (-R - 3, R + 3, -R - 3, R + 3, z - 3, z + 12)
        v.put(bb, lambda X, Y, Z, m=m: m(X, Y, Z, R - 2, R + 1, z, z + 8), 0)
        v.put(bb, lambda X, Y, Z, m=m: m(X, Y, Z, R - 2, R - 1.2, z, z + 8), GLASS)
        v.put(bb, lambda X, Y, Z, m=m: m(X, Y, Z, R - 1, R + 1.2, z - 1.4, z, w=2.6), STONE)
    # porch with its door on the left (+y) face
    v.box(-8, 8, 10, 23, 0, 20, STONE)
    v.roof(-10, 10, 8, 25, 19, 29, ROOF_S, axis='y', th=2.5, fill=STONE)
    door(v, 'y', 23, -4, 4, 11, arch=True)
    lantern(v, 6.5, 24.5, 16); flamme(v, 6.5, 24.5, 16)
    # gallery on corbels, an iron rail
    v.put((-22, 22, -22, 22, 120, 130), lambda X, Y, Z: X ** 2 + Y ** 2 <= (12.5 + (Z - 120) * 0.75) ** 2, STONE_D)
    v.cyl(0, 0, 20.5, 128, 131, STONE)
    for k in range(28):
        a = k / 28 * 2 * np.pi
        v.box(19.6 * np.cos(a) - 0.5, 19.6 * np.cos(a) + 0.5, 19.6 * np.sin(a) - 0.5, 19.6 * np.sin(a) + 0.5, 131, 138, METAL)
    v.cyl(0, 0, 20.4, 137.2, 138.6, METAL, rin=19)
    # the lantern: a flame core behind iron mullions, a copper dome, a gold finial
    v.cyl(0, 0, 11, 131, 134, STONE_D)
    v.cyl(0, 0, 8.4, 134, 152, HOLY)
    for k in range(8):
        a = k / 8 * 2 * np.pi + 0.2
        v.box(9 * np.cos(a) - 0.8, 9 * np.cos(a) + 0.8, 9 * np.sin(a) - 0.8, 9 * np.sin(a) + 0.8, 134, 152, METAL)
    v.cyl(0, 0, 10, 151, 153.4, METAL)
    v.cone(0, 0, 11.5, 153, 168, ROOF_G, p=1.5)
    v.cyl(0, 0, 0.9, 166, 176, GOLD); v.ell(0, 0, 172, 1.8, 1.8, 1.8, GOLD)
    v.box(-0.4, 0.4, -5, 5, 177, 178, METAL); v.box(-3, 3, -0.4, 0.4, 175, 180, METAL)
    # rocks and a coil of rope at its foot
    rng = np.random.default_rng(8)
    for k in range(9):
        a = rng.uniform(-0.6, 2.2); d = rng.uniform(22, 30)
        rx, ry = d * np.cos(a), d * np.sin(a)
        v.ell(rx, ry, 1.5, rng.uniform(2.5, 4.5), rng.uniform(2, 4), rng.uniform(2, 3.5), STONE_D)
    return v

@bld('crates')
def crates():
    v = Vol(-14, 14, -14, 14, 0, 22)
    crate(v, -9, -6, 8); crate(v, 0, -7, 8); crate(v, -8.5, -5.5, 7, z=8); crate(v, -4, 3, 7)
    v.ell(7, 6, 3.4, 3.6, 3, 3.6, CLOTH_W); v.box(6.2, 7.8, 5.2, 6.8, 6.6, 7.6, ROPE)
    return v

@bld('barrels')
def barrels():
    v = Vol(-14, 14, -14, 14, 0, 22)
    barrel(v, -4, -3, 3.5, 9); barrel(v, 3.5, -4, 3.5, 9); barrel(v, -1, 4, 3.5, 9); barrel(v, 0, -3.5, 3.2, 8, z=9)
    v.put((4, 14, 2, 10, 0, 8), lambda X, Y, Z: ((Y - 6) ** 2 + (Z - 3.6) ** 2 <= (3.2 + 0.8 * np.sin(np.clip((X - 5) / 8, 0, 1) * np.pi)) ** 2) & (X > 5) & (X < 13), PLANK)
    for xx in (6.2, 11):
        v.put((xx - 1, xx + 1, 1, 11, 0, 9), lambda X, Y, Z, xx=xx: ((Y - 6) ** 2 + (Z - 3.6) ** 2 <= 3.7 ** 2) & (np.abs(X - xx) < 0.6), METAL)
    return v

@bld('nets')
def nets():
    """Nets drying: two poles, a net sagging between them with cork floats along its head rope, a heap at the foot."""
    v = Vol(-20, 20, -10, 10, 0, 30)
    for xx in (-14, 14):
        v.box(xx - 0.9, xx + 0.9, -0.9, 0.9, 0, 26, TIMBER)
    v.box(-15, 15, -0.5, 0.5, 23, 24, ROPE)
    sag = lambda X: 23 - 3.5 * (1 - (X / 14) ** 2)
    cell = lambda X, Z: (np.mod(X + 0.3, 2.6) < 0.7) | (np.mod(Z - sag(X) + 40, 2.6) < 0.7)
    v.put((-14, 14, -0.6, 0.6, 6, 24), lambda X, Y, Z: (Z <= 23) & (Z > sag(X) - 14 + 3 * (X / 14) ** 2) & cell(X, Z), NET)
    for xx in np.arange(-12, 13, 4):
        v.ell(xx, 0.6, 22.6, 1.1, 0.8, 0.9, CLOTH_Y)
    v.ell(-6, 4, 1.6, 6, 3.6, 2.2, NET); v.ell(-2, 5, 3, 3.2, 2.4, 1.6, NET)
    for xx in (-9, -4, 0):
        v.ell(xx, 6.8, 2.2, 1, 0.8, 0.9, CLOTH_Y)
    return v

# ---------------------------------------------------------------- Highpass Hold (maps/col.json)
# A dwarven town in a mountain pass: granite cliffs along the north (segments along the screen's horizontal, the iso
# diagonal x = -y, their face towards the viewer), a waterfall falling from a notch into a stream, a mine carved into
# the cliff with rails and a cart, a stone bridge, boulders, and stone-and-slate variants of the village's buildings
# (the same models with their plaster and tiled roofs swapped: same sprites' boxes, so the layout's offsets hold).
# Palette ids 150-159 (Vol voxels are uint8: ids stay under 256; other maps use 140-149, 160-181, 200+).
from engine import vnoise2

def t_rock(P, n, p, lv):
    """Natural granite: horizontal strata, broken blocks, vertical cracks, lichen; turf on the ledges turned up."""
    z = P[:, 2]
    st = np.sin(z * 0.42 + (blob3(P, 7.0, 151) - 0.5) * 5.0 + (blob3(P, 19.0, 157) - 0.5) * 6.0)
    off = (st > 0.85) * 0.5 - (st < -0.92) * 0.7
    off = off + (blob3(P, 5.0, 152) - 0.5) * 1.1 + (blob3(P, 1.3, 153) - 0.5) * 0.5
    q = np.floor(P / np.array([4.0, 4.0, 13.0])).astype(np.int64)
    off = np.where(hash3(q[:, 0], q[:, 1], q[:, 2], 154) > 0.94, off - 1.5, off)
    swap = np.where((n[:, 2] > 0.55) & (blob3(P, 2.2, 155) > 0.3), p.get('turf', 0), 0)
    swap = np.where((swap == 0) & (blob3(P, 1.6, 156) > 0.965), MOSS_R, swap)
    return off, swap

TURF = M(152, '#6f9440', t_leaf, hs=26, light=1.3, dark=0.32)              # alpine turf on ledges
GRANITE = M(150, '#868a92', t_rock, params={'turf': TURF}, hs=16, light=1.24)  # cliff rock
ASHLAR = M(151, '#a0979b', t_stone, params={'ch': 6, 'bl': 11, 'moss': 40, 'mossh': 10}, hs=22)  # dressed granite
SCREE = M(153, '#7c7c84', t_noise, params={'amp': 2.2, 'sc': 1.2}, hs=16)  # rubble at the cliff's foot
S2 = np.sqrt(2)

def recolor(v, table):
    """The model's materials swapped (a stone-and-slate variant): voxels of each key become its value."""
    lut = np.arange(256, dtype=np.uint8)
    for a, b in table.items():
        lut[a] = b
    v.m = lut[v.m]
    return v

COL_PIERRE = {PLASTER: ASHLAR, ROOF_R: ROOF_S, ROOF_B: ROOF_S, 51: ASHLAR}
@bld('col-tavern')
def col_tavern(): return recolor(tavern(), COL_PIERRE)
@bld('col-townhall')
def col_townhall(): return recolor(townhall(), COL_PIERRE)
@bld('col-barn')
def col_barn(): return recolor(barn(), COL_PIERRE)
@bld('col-barracks')
def col_barracks(): return recolor(barracks(), COL_PIERRE)
@bld('col-well')
def col_well(): return recolor(well(), COL_PIERRE)
@bld('col-noticeboard')
def col_noticeboard(): return recolor(noticeboard(), COL_PIERRE)

def falaise(v, seed, H, Lh=62, notch=0.0, rock=True, water=False):
    """A cliff segment along the iso diagonal (d = (x - y)/sqrt2 from -Lh to Lh, n = (x + y)/sqrt2 towards the
    viewer), its foot at n ~ 0 (the anchor): a jagged face leaning back as it rises, blocky jags (lit +y facets, dark +x
    ones), a talus of rubble at its foot, a crest of height ~H tapering at both ends so neighbours overlap; notch > 0
    cuts a slot for a waterfall at d = 0 (its water: 'water', alone when not 'rock')."""
    def nz(D, Z, sc, sd):
        return vnoise2(D, Z, sc, seed * 10 + sd)
    def crest(D):
        tap = np.clip((Lh - np.abs(D)) / 26, 0, 1) ** 0.7
        c = H * (0.74 + 0.30 * (nz(D, D * 0, 16, 1) - 0.5) * 2 * 0.5) * (0.30 + 0.70 * tap)
        return c - notch * 34 * np.clip(1 - np.abs(D) / 16, 0, 1) ** 1.3
    def front(X, Y, Z):
        D = (X - Y) / S2
        f = 8 * (nz(D, Z, 22, 2) - 0.5) + 10 * (nz(D, D * 0, 34, 3) - 0.5) - 0.24 * Z
        f = f + 8 * hash3(np.floor(X / 13).astype(np.int64), np.floor(Y / 13).astype(np.int64), np.floor(Z / 38).astype(np.int64), seed + 11)  # buttresses
        f = f + 3.5 * hash3(np.floor(X / 5).astype(np.int64), np.floor(Y / 5).astype(np.int64), np.floor(Z / 9).astype(np.int64), seed)
        f = f + 2.5 * (((Z + 13 * nz(D, D * 0, 40, 4)) % 29) < 3.0)  # ledges
        f = f + 14 * np.clip(1 - Z / 17, 0, 1) ** 1.5  # talus
        return f - notch * 10 * np.clip(1 - np.abs(D) / 13, 0, 1)
    R = (Lh + 56) / S2 + 1
    bb = (-R, R, -R, R, 0, H * 1.2 + 4)
    if rock:
        def solid(X, Y, Z):
            D, Nn = (X - Y) / S2, (X + Y) / S2
            top = crest(D) + 6 * hash3(np.floor(X / 6).astype(np.int64), np.floor(Y / 6).astype(np.int64), np.zeros_like(X, dtype=np.int64), seed + 7) - 1.3 * np.clip(-Nn - 12, 0, None)
            return (np.abs(D) < Lh) & (Nn < front(X, Y, Z)) & (Nn > -56) & (Z < top)
        mat = lambda X, Y, Z: np.where(Z < 9 + 5 * hash3(np.floor(X / 3).astype(np.int64), np.floor(Y / 3).astype(np.int64), np.zeros_like(X, dtype=np.int64), seed + 3), SCREE, GRANITE).astype(np.uint8)
        v.put(bb, solid, mat)
    if water:
        zl = float(crest(np.zeros(1))[0]) + 3  # the lip
        def sheet(X, Y, Z):  # a sheet hugging the slot's face, stepping over its jags and ledges
            D, Nn = (X - Y) / S2, (X + Y) / S2
            hw = 7 + 4 * (1 - Z / zl) + 0.8 * np.sin(Z * 0.35 + D)
            f = front(X, Y, Z)
            return (np.abs(D) < hw) & (Nn >= f - 0.5) & (Nn < f + 3.2) & (Z < zl) & (Z > 1)
        streak = lambda X, Y, Z: np.where(np.sin((X - Y) * 1.3 + 4 * hash3(np.floor((X - Y) / 2).astype(np.int64), np.floor(Z / 11).astype(np.int64), np.zeros_like(X, dtype=np.int64), 5)) > 0.35, FOAM, WATER).astype(np.uint8)
        v.put(bb, sheet, streak)
        rng = np.random.default_rng(seed)
        for k in range(16):  # spray and foam where it lands
            d = rng.uniform(-11, 11); nn = rng.uniform(-6, 9)
            r = rng.uniform(2.2, 4.2)
            v.ell((nn + d) / S2, (nn - d) / S2, rng.uniform(1, 7), r, r, r * 0.8, FOAM)

@bld('col-falaise-a')
def col_falaise_a():
    v = Vol(-82, 82, -82, 82, 0, 210); falaise(v, 1, 150); return v
@bld('col-falaise-b')
def col_falaise_b():
    v = Vol(-82, 82, -82, 82, 0, 210); falaise(v, 2, 172); return v
@bld('col-falaise-c')
def col_falaise_c():
    v = Vol(-82, 82, -82, 82, 0, 210); falaise(v, 3, 128); return v
@bld('col-cascade')
def col_cascade():
    v = Vol(-82, 82, -82, 82, 0, 230); falaise(v, 4, 182, notch=1.0, water=True); return v
@bld('col-cascade-eau')
def col_cascade_eau():
    """The waterfall's water alone: the mask of its live streaks (tools/col_chute.py)."""
    v = Vol(-82, 82, -82, 82, 0, 230); falaise(v, 4, 182, notch=1.0, rock=False, water=True); return v

@bld('col-mine')
def col_mine():
    """The mine: a lower cliff with a portal facing +y (towards the lower left), timber posts and a lintel under a
    rune, a lantern; rails running out of it on sleepers with an ore cart, a spoil heap, a barrel and crates."""
    v = Vol(-82, 82, -82, 82, 0, 170)
    falaise(v, 5, 120)
    # the rock hood round the portal, the gallery carved into it, its dark back
    v.put((-26, 26, -30, 10, 0, 52), lambda X, Y, Z: (np.abs(X) < 25) & (Y > -30) & (Y < 9) & (Z < 50 - 7 * hash3(np.floor(X / 5).astype(np.int64), np.floor(Y / 5).astype(np.int64), np.zeros_like(X, dtype=np.int64), 9) - np.abs(X) * 0.6), GRANITE)
    v.box(-10, 10, -22, 10, 0, 26, 0)
    v.put((-10, 10, -22, 10, 26, 32), lambda X, Y, Z: (Z < 26 + 6 * np.sqrt(np.clip(1 - (X / 10) ** 2, 0, 1))), 0)
    v.box(-10, 10, -25, -22, 0, 32, COAL)
    for xx in (-12.5, 10):  # posts, a lintel, a gold rune plate over it
        v.box(xx, xx + 2.5, 6, 10, 0, 27, TIMBER)
    v.box(-14, 14, 5.5, 10.5, 26.5, 30.5, TIMBER)
    v.box(-5, 5, 8, 10.6, 32.5, 38, GOLD)
    v.box(-3.4, 3.4, 10.2, 10.8, 33.8, 36.6, COAL)
    v.box(-0.6, 0.6, 10.4, 11, 33.2, 37.2, GOLD)
    lantern(v, 15, 11, 22); flamme(v, 15, 11, 22)
    # rails on sleepers
    for yy in np.arange(-20, 66, 4.5):
        v.box(-6, 6, yy, yy + 2, 0, 1.2, PLANK)
    for xx in (-4.2, 3.2):
        v.box(xx, xx + 1, -21, 66, 1.2, 2.3, METAL)
    # the ore cart
    cy = 34
    v.box(-5.6, 5.6, cy - 8, cy + 8, 3.5, 13, PLANK)
    v.box(-4.4, 4.4, cy - 6.8, cy + 6.8, 5, 13.5, 0)
    for zz in (4.5, 11):
        v.box(-5.8, 5.8, cy - 8.2, cy + 8.2, zz, zz + 1.1, METAL)
    for yy in (cy - 4.5, cy + 4.5):
        for xx in (-6, 6):
            v.ell(xx, yy, 3, 0.8, 2.8, 2.8, METAL)
    v.ell(0, cy, 12.5, 4.6, 7, 3.4, STONE_D)
    for (ox, oy, oz) in ((-1.6, cy - 3, 15), (1.8, cy + 2, 14.6), (0.3, cy + 4.6, 14), (-2.4, cy + 1.6, 14.2)):
        v.ell(ox, oy, oz, 1.1, 1.1, 1, GOLD)
    # spoil heap, a barrel, crates, a pick against the hood
    v.put((10, 40, 12, 44, 0, 16), lambda X, Y, Z: ((X - 25) / 13) ** 2 + ((Y - 27) / 14) ** 2 + (Z / 12) ** 2 <= 1 - 0.3 * hash3(np.floor(X / 2).astype(np.int64), np.floor(Y / 2).astype(np.int64), np.floor(Z / 2).astype(np.int64), 11), SCREE)
    barrel(v, -14, 20, 4.2, 11); crate(v, -22, 28, 8); crate(v, -21.5, 28.5, 6.5, z=8)
    v.capsule((-17, 11, 0), (-16, 11, 19), 0.7, WOOD_L)
    v.capsule((-19, 11, 17.5), (-13, 11, 20), 0.9, METAL)
    return v

def pont(front_only=False):
    """A humped stone bridge along x over a stream flowing along y: an arch, a flagged deck (z ~7 to 9, ramps down to
    the ground at both ends), low parapets. front_only: its front (+y) parapet alone, the mask of its cut-outs."""
    v = Vol(-50, 50, -14, 14, 0, 26)
    w = 9
    zd = lambda X: np.where(np.abs(X) < 32, 6.5 + 2.5 * (1 - (X / 32) ** 2), 6.5 * np.clip((46 - np.abs(X)) / 14, 0, 1))
    arch = lambda X, Z: (X / 14) ** 2 + (Z / 5.8) ** 2 < 1
    if not front_only:
        v.put((-46, 46, -w, w, 0, 10), lambda X, Y, Z: (Z < zd(X) - 1.2) & ~arch(X, Z), ASHLAR)
        v.put((-46, 46, -w, w, 0, 10), lambda X, Y, Z: (Z >= zd(X) - 1.2) & (Z < zd(X)), STONE)
        for xx in (-15, 15):  # cutwaters at the springing
            v.put((xx - 5, xx + 5, w - 1, w + 4, 0, 6), lambda X, Y, Z, xx=xx: (np.abs(X - xx) < 3.5 - (Y - w) * 0.9) & (Z < 6 - (Y - w)), ASHLAR)
    for yy in ((w - 2,) if front_only else (-w, w - 2)):
        v.put((-38, 38, yy, yy + 2, 0, 16), lambda X, Y, Z: (Z >= zd(X)) & (Z < zd(X) + 4.2), ASHLAR)
        v.put((-39, 39, yy - 0.3, yy + 2.3, 0, 16), lambda X, Y, Z: (Z >= zd(X) + 4.2) & (Z < zd(X) + 5.4), STONE_D)
    return v

@bld('col-pont')
def col_pont(): return pont()
@bld('col-pont-parapet')
def col_pont_parapet(): return pont(True)

@bld('col-rocher')
def col_rocher():
    """Granite boulders, lichen on their tops."""
    v = Vol(-22, 22, -20, 20, 0, 28)
    for (x, y, rx, ry, rz, sd) in ((-3, -2, 12, 9, 15, 1), (9, 6, 7, 6, 8, 2), (-11, 9, 5, 4.5, 5, 3)):
        v.put((x - rx - 2, x + rx + 2, y - ry - 2, y + ry + 2, 0, rz + 2),
              lambda X, Y, Z, x=x, y=y, rx=rx, ry=ry, rz=rz, sd=sd: ((X - x) / rx) ** 2 + ((Y - y) / ry) ** 2 + (Z / rz) ** 2 <= 1 - 0.3 * hash3(np.floor(X / 4).astype(np.int64), np.floor(Y / 4).astype(np.int64), np.floor(Z / 4).astype(np.int64), 20 + sd), GRANITE)
    return v

def fit(r, name):
    """A look with a base (winter): the sprite cut to the base look's box (same size and anchor, from its meta.json),
    so the map's layout data (fronts, anchors) stays the same; a bare tree fits inside its summer crown's box."""
    m = json.load(open(LOOKS[LOOK['base']]['assets'] + 'meta.json'))['b-' + name]
    ax, ay = r['anchor']; x0, y0 = ax - m['ax'], ay - m['ay']
    assert x0 >= 0 and y0 >= 0, (name, 'outside its base look box')
    for k in ('color', 'shadow', 'emis', 'nightlit', 'cast'):
        cut = r[k][y0:y0 + m['h'], x0:x0 + m['w']]
        assert (cut[..., 3] > 0).sum() == (r[k][..., 3] > 0).sum(), (name, k, 'outside its base look box')
        r[k] = cut
    r['anchor'] = (m['ax'], m['ay'])
    return r

def build(name):
    t = time.time()
    s = {'magetower': 1.3, 'boat-large': 1.75}.get(name, S_B)  # the cog drawn larger: a ship, not a house's length
    engine.VS_DEFAULT[0] = 1 / s
    v = B[name]()
    if LOOK['materiaux']: MATERIAUX[LOOK['materiaux']](PAL)
    r = render(v, PAL, S=s)
    r = fit(r, name) if LOOK['base'] else trim(r)
    print(name, 'rendered', r['color'].shape, 'anchor', r['anchor'], f'{time.time() - t:.1f}s', flush=True)
    return r

if __name__ == '__main__':
    import os
    from theme import ASSETS
    OUT = os.environ.get('OUT', ASSETS.rstrip('/'))
    os.makedirs(OUT, exist_ok=True)
    meta = {}
    if os.path.exists(OUT + '/meta.json'): meta = json.load(open(OUT + '/meta.json'))
    for name in (sys.argv[1:] or list(B)):
        r = build(name)
        from PIL import Image
        save2x(r['color'], f'{OUT}/b-{name}.png')
        save2x(r['shadow'], f'{OUT}/b-{name}-shadow.png')
        save2x(r['emis'], f'{OUT}/b-{name}-night.png')
        save2x(r['nightlit'], f'{OUT}/b-{name}-nightlit.png')
        save2x(r['cast'], f'{OUT}/b-{name}-cast.png')
        meta['b-' + name] = {'w': int(r['color'].shape[1]), 'h': int(r['color'].shape[0]), 'ax': int(r['anchor'][0]), 'ay': int(r['anchor'][1])}
        json.dump(meta, open(OUT + '/meta.json', 'w'), indent=1)
