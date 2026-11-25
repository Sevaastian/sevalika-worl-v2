#!/usr/bin/env python3
"""Eşyaları 3D'den 4 yönlü PNG olarak üretir: public/sprites/f3/<tür>.png (4 sütun: rot 0 GD, 1 GB, 2 KB, 3 KD) ve lib/furni3d.ts (ölçü tablosu).
1 birim = 4 px, bir kare kenarı = 45 birim. Eşya +z yönüne bakar; merkez (zemin) noktası karede (fw/2, feet) konumundadır."""
import os, sys, math, json
sys.path.insert(0, os.path.dirname(__file__))
import numpy as np
from PIL import Image
import r3d
from r3d import P, rot, rx, hexc, render, outline, downsample, to_image, DIRS_YAW

ROOT = os.path.join(os.path.dirname(__file__), "..")
OUT = os.path.join(ROOT, "public", "sprites", "f3")
os.makedirs(OUT, exist_ok=True)
G = lambda v: (v, v, v)
IRON = hexc("#1f2937"); WOOD = hexc("#b9772c"); WOOD_D = hexc("#7c4a1c")

def bench():
    o = []
    for x in (-17.5, 17.5):  # demir yan ayaklar (kıvrımlı)
        o += [P("box", (x, 7, 0), (1.0, 7.0, 6.2), IRON, rad=.6),
              P("box", (x, 15.2, 0), (1.3, .9, 7.4), IRON, rad=.4),  # kol dayama
              P("box", (x, 21, -6.4), (1.0, 15.2, 1.0), IRON, rad=.4, R=rot(-10, 0, 0)),
              P("torus", (x, 4.0, 5.4), (2.8, .5), IRON, R=rot(0, 0, 90)),
              P("torus", (x, 12.0, 5.2), (2.2, .45), IRON, R=rot(0, 0, 90))]
    for i in range(4):  # oturak çıtaları
        o.append(P("box", (0, 14.0, -5.2 + i * 3.5), (19.0, .9, 1.45), WOOD, rad=.5, spec=.1))
    for i in range(3):  # sırt çıtaları
        y = 18.5 + i * 4.6
        o.append(P("box", (0, y, -7.3 - (y - 14) * .18), (19.0, 1.8, .7), WOOD, rad=.4, R=rot(-10, 0, 0), spec=.1))
    return o

def chair():
    pink = hexc("#e0607e")
    o = [P("cyl", (0, 1.0, 0), (10.5, 1.0), G(.42), rad=.6, spec=.2),
         P("cyl", (0, 11, 0), (2.0, 10), G(.78), rad=.4, spec=.8),
         P("torus", (0, 7, 0), (5.2, .5), G(.8), spec=.8),
         P("cyl", (0, 21.5, 0), (8.8, 2.4), pink, rad=1.6, spec=.25),
         P("box", (0, 27.0, -7.6), (6.4, 3.6, 1.3), pink * .92, rad=1.1, R=rot(-14, 0, 0), spec=.2),
         P("cap", (0, 0, 0), ((-3, 20, -6), (-3, 24, -7.6), .7), G(.78)), P("cap", (0, 0, 0), ((3, 20, -6), (3, 24, -7.6), .7), G(.78))]
    return o

def sofa():
    r = hexc("#c2263f"); rd = hexc("#9a1b30"); rl = hexc("#e04a63")
    return [P("box", (0, 6.0, 0), (17.5, 6.0, 16.5), rd, rad=2.0),
            P("box", (0, 12.8, 3.0), (12.5, 2.8, 12.5), rl, rad=2.2, spec=.15),
            P("box", (0, 19.5, -12.0), (17.5, 9.5, 4.8), r, rad=3.0),
            P("box", (-14.8, 15.0, 1.0), (3.4, 6.0, 15.2), r, rad=2.4),
            P("box", (14.8, 15.0, 1.0), (3.4, 6.0, 15.2), r, rad=2.4),
            P("box", (0, 21.0, -8.6), (11, 4.8, 1.8), rl * .95, rad=1.8)]

def lounger():
    w = G(.96); blue = hexc("#2f6fd0")
    o = [P("box", (0, 10.0, 2), (9.5, 1.6, 20), blue, rad=1.0, stripe=(2, 5.0, G(.96))),
         P("box", (0, 17.2, -27.4), (9.5, 1.6, 12.5), blue, rad=1.0, R=rot(38, 0, 0), stripe=(2, 5.0, G(.96)))]
    for x in (-10.8, 10.8):
        o += [P("box", (x, 10.3, 2), (1.1, 1.3, 21), w, rad=.5), P("box", (x, 17.2, -27.4), (1.1, 1.3, 13.2), w, rad=.5, R=rot(38, 0, 0)),
              P("box", (x, 4.6, 19), (1.0, 5.6, 1.0), w, rad=.4), P("box", (x, 4.6, -8), (1.0, 5.6, 1.0), w, rad=.4),
              P("box", (x, 14.2, 0), (1.0, .8, 8), w, rad=.4)]
    return o

def tv():
    o = [P("box", (0, 32, 0), (17.5, 12.5, 2.2), hexc("#111827"), rad=1.2),
         P("cap", (0, 0, 0), ((0, 11, 0), (0, 19, 0), 1.6), G(.12)),
         P("box", (0, 10.5, 0), (8.5, .9, 5.5), G(.14), rad=.6)]
    cols = ["#ef4444", "#f97316", "#facc15", "#22c55e", "#06b6d4", "#6366f1", "#a855f7"]
    for i, c in enumerate(cols):
        x = -15.0 + i * 5.0 + 2.5
        o.append(P("box", (x, 32, 2.2), (2.5, 10.8, .5), hexc(c), emissive=True))
    o.append(P("box", (0, 32, -2.3), (12, 8, .5), G(.2), rad=.5))
    return o

def bookshelf():
    wd = hexc("#8a5a2b"); wl = hexc("#a16a35")
    o = [P("box", (-16.5, 28, 0), (1.5, 28, 7.2), wd, rad=.5), P("box", (16.5, 28, 0), (1.5, 28, 7.2), wd, rad=.5),
         P("box", (0, 56.4, 0), (18, 1.4, 7.6), wl, rad=.5), P("box", (0, 1.6, 0), (18, 1.6, 7.4), wd, rad=.4),
         P("box", (0, 28, -6.2), (16.8, 27.5, .8), hexc("#6b4423"))]
    cols = ["#ef4444", "#2563eb", "#16a34a", "#facc15", "#9333ea", "#f97316", "#0ea5e9"]
    rng = np.random.RandomState(3)
    for k, y in enumerate((3.2, 19.5, 36.0)):
        o.append(P("box", (0, y + 15.3 if False else y + 14.0, 0), (15.2, .6, 6.6), wl, rad=.3))
        x = -14.0
        while x < 13:
            wbk = rng.uniform(1.4, 2.4); hb = rng.uniform(9, 12.5)
            o.append(P("box", (x + wbk, y + 0.8 + hb / 2, 1.0), (wbk, hb / 2, 4.6), hexc(cols[rng.randint(7)]), rad=.3))
            x += wbk * 2 + .25
    return o

def bed():
    wd = hexc("#6b3f1f")
    return [P("box", (0, 6.0, 0), (19.5, 5.0, 40.5), wd, rad=1.6),
            P("box", (0, 12.8, 2.5), (17.4, 3.2, 37.5), G(.96), rad=2.2),
            P("box", (0, 15.6, 9.0), (17.9, 1.5, 25), hexc("#4f8fe8"), rad=1.4, stripe=(2, 7, hexc("#6aa5f2"))),
            P("ell", (0, 17.2, -29.0), (11, 3.4, 6.5), hexc("#fde68a"), spec=.1),
            P("box", (0, 21.0, -42.0), (19.8, 12.0, 2.4), wd, rad=1.4),
            P("box", (0, 11.0, 42.0), (19.8, 6.0, 1.8), wd, rad=1.2)]

def logseat():
    br = hexc("#8f5a2a")
    return [P("cyl", (0, 8.5, 0), (8.5, 19), br, R=rot(90, 0, 0), rad=2.0, spec=.05),
            P("cyl", (0, 8.5, 19.1), (6.6, .5), hexc("#d8a35f"), R=rot(90, 0, 0), rad=.3),
            P("cyl", (0, 8.5, -19.1), (6.6, .5), hexc("#d8a35f"), R=rot(90, 0, 0), rad=.3)]


def beanbag():
    c = hexc("#14b8a6"); d = hexc("#0f8f82")
    return [P("ell", (0, 9.5, 0), (15.5, 10.5, 15.5), c, spec=.15),
            P("ell", (0, 17.5, -3.5), (10, 6.5, 9), d, spec=.15, R=rot(-18, 0, 0)),
            P("torus", (0, 9.0, 0), (15.2, .55), hexc("#0b6b61"), rad=0)]

def plant():
    pot = hexc("#c2693a"); g1 = hexc("#1f9d55"); g2 = hexc("#2fbf6b"); g3 = hexc("#157a40")
    o = [P("cone", (0, 0, 0), (7.2, 9.0, 15.0), pot, spec=.1), P("torus", (0, 15.0, 0), (9.0, 1.3), hexc("#a8552b")),
         P("cyl", (0, 14.2, 0), (8.4, .6), hexc("#4a2f1b"))]
    rng = np.random.RandomState(5)
    for i in range(9):
        a = i * 40 + rng.uniform(-8, 8); L = rng.uniform(13, 19); tilt = rng.uniform(32, 60)
        col = (g1, g2, g3)[i % 3]
        o.append(P("ell", (0, 24, 0), (1.2, L * .55, 5.0), col, R=rot(0, a, tilt), spec=.2) if False else
                 P("ell", (math.sin(math.radians(a)) * 5.5, 27 + (i % 3) * 3, math.cos(math.radians(a)) * 5.5), (4.8, 9.5 + (i % 3) * 1.5, 1.6), col,
                   R=rot(math.cos(math.radians(a)) * 28, 0, -math.sin(math.radians(a)) * 28), spec=.25))
    o.append(P("ell", (0, 33, 0), (4.5, 8.5, 1.6), g2, spec=.25))
    return o

def lamp():
    o = [P("cyl", (0, 1.2, 0), (7.5, 1.2), G(.16), rad=.6), P("cap", (0, 0, 0), ((0, 2, 0), (0, 44, 0), 1.4), G(.2)),
         P("box", (0, 52, 0), (4.2, 9.5, 4.2), hexc("#fde047"), emissive=True, rad=1.4),
         P("box", (0, 62.5, 0), (5.8, 1.0, 5.8), G(.18), rad=.6), P("box", (0, 41.5, 0), (5.2, 1.0, 5.2), G(.18), rad=.6)]
    return o

def streetlight():
    d = hexc("#263238")
    return [P("cyl", (0, 2.0, 0), (6.6, 2.0), d, rad=.8), P("cyl", (0, 8, 0), (3.6, 4.0), d, rad=.8),
            P("cap", (0, 0, 0), ((0, 10, 0), (0, 82, 0), 1.9), d),
            P("cap", (0, 0, 0), ((0, 82, 0), (0, 90, 5), 1.7), d), P("cap", (0, 0, 0), ((0, 90, 5), (0, 90, 15), 1.7), d),
            P("box", (0, 88.4, 18), (4.2, .9, 5.8), d, rad=.6), P("box", (0, 86.2, 18), (3.2, 1.4, 4.6), hexc("#fff3b0"), emissive=True, rad=.8),
            P("ell", (0, 82, 0), (3.6, 1.6, 3.6), d)]

def table():
    return [P("cyl", (0, 17.5, 0), (13, .8), hexc("#9ad7ee"), rad=.7, spec=.7),
            P("torus", (0, 17.5, 0), (13.2, .6), G(.8), spec=.8)] + \
           [P("cap", (0, 0, 0), ((x, 17, z), (x * 1.05, 1.0, z * 1.05), 1.0), G(.75), spec=.8) for x, z in ((-8, -8), (8, -8), (-8, 8), (8, 8))] + \
           [P("cyl", (0, 8, 0), (11, .5), hexc("#7cc0dc"), rad=.4, spec=.6)]

def counter():
    w = hexc("#7a4b26"); t = hexc("#e7e1d6")
    return [P("box", (0, 11.5, 0), (18.5, 11.5, 12.0), w, rad=.9),
            P("box", (0, 23.4, 0), (20.0, 1.3, 13.4), t, rad=.7, spec=.35),
            P("box", (0, 11.0, 12.1), (15.5, 7.8, .5), hexc("#5b3416"), rad=.4),
            P("box", (0, 2.4, 11.5), (18.8, 2.0, 1.0), G(.18))]

def casinotable():
    return [P("cyl", (0, 14.5, 0), (18, 1.5), hexc("#0d7a45"), rad=1.2, spec=.05),
            P("torus", (0, 15.8, 0), (18.0, 1.7), hexc("#5a3216"), spec=.2),
            P("cyl", (0, 7, 0), (6, 7), hexc("#3d2410"), rad=.8),
            P("cyl", (0, 1.4, 0), (11, 1.4), hexc("#2b1a0b"), rad=.8),
            P("cyl", (0, 16.1, 4), (3.2, .4), hexc("#ef4444"), rad=.3), P("cyl", (0, 16.6, 4), (3.2, .4), hexc("#fafafa"), rad=.3),
            P("cyl", (4.5, 16.1, -3), (3.2, .4), hexc("#1d4ed8"), rad=.3)]

def bin_():
    g = hexc("#2f6b4a")
    return [P("cyl", (0, 11.5, 0), (8.6, 11.5), g, rad=1.0, stripe=(1, 4.0, hexc("#285c3f"))),
            P("cyl", (0, 24, 0), (9.4, 1.4), hexc("#245138"), rad=.9),
            P("torus", (0, 23.0, 0), (9.2, .7), G(.2)), P("box", (0, 26.4, 0), (3.6, .8, .9), G(.25), rad=.4),
            P("box", (0, 12, 8.7), (2.6, 5, .5), hexc("#e5e7eb"), rad=.2)]

def umbrella():
    w = G(.96); b = hexc("#2563eb")
    return [P("cyl", (0, 2.0, 0), (6, 2.0), G(.7), rad=.6), P("cap", (0, 0, 0), ((0, 3, 0), (0, 60, 0), 1.0), G(.82)),
            P("ell", (0, 50, 0), (25, 13, 25), b, cut=((0, 1, 0), 0), stripe=(0, 7.0, w), spec=.1),
            P("ell", (0, 64.5, 0), (2.0, 1.6, 2.0), G(.82))]

def campfire():
    brown = hexc("#6b3f1f"); st = hexc("#8a8f98")
    o = []
    for i in range(7):
        a = i * (360 / 7)
        x = math.sin(math.radians(a)) * 15; z = math.cos(math.radians(a)) * 15
        o.append(P("ell", (x, 3.6, z), (4.4, 3.5, 4.0), st * (0.85 + .15 * (i % 2)), rad=0))
    for a in (20, 100, 200, 290):
        o.append(P("cyl", (0, 5.4, 0), (1.9, 9.5), brown, R=rot(78, a, 0), rad=.6))
    o += [P("cone", (0, 4.5, 0), (5.8, .2, 15), hexc("#f97316"), emissive=True),
          P("cone", (1.6, 5.0, 0.6), (3.6, .1, 15), hexc("#facc15"), emissive=True),
          P("cone", (-2.4, 5.0, -1), (3.0, .1, 11), hexc("#fb923c"), emissive=True)]
    return o

def mannequin():
    sk = hexc("#e8d5c0"); dr = hexc("#d6336c")
    return [P("cyl", (0, 1.0, 0), (9.5, 1.0), G(.22), rad=.6), P("cap", (0, 0, 0), ((0, 2, 0), (0, 22, 0), .9), G(.75), spec=.8),
            P("cone", (0, 24, 0), (6.4, 3.8, 6.0), dr), P("ell", (0, 33.5, 0), (6.4, 9, 4.1), dr, spec=.1),
            P("cone", (0, 17, 0), (10.0, 5.0, 8.0), dr, spec=.1),
            P("cap", (0, 0, 0), ((0, 41, 0), (0, 44, 0), 1.7), sk), P("ell", (0, 48.5, 0), (4.4, 5.6, 4.5), sk, spec=.2),
            P("ell", (-6.9, 36, 0), (1.6, 6.5, 1.9), sk), P("ell", (6.9, 36, 0), (1.6, 6.5, 1.9), sk)]

def surfboard():
    return [P("ell", (0, 24, 0), (7.4, 24, 1.8), hexc("#f97316"), stripe=(1, 9.0, hexc("#fde047")), spec=.45),
            P("box", (0, 26, 1.8), (.6, 20, .4), hexc("#fafafa")),
            P("cone", (0, 0, 0), (7, 7, 3), hexc("#e6c98a")) if False else P("cyl", (0, 1.0, 0), (9, 1.0), hexc("#e6c98a"), rad=.6)]

def phone_booth():
    r = hexc("#d62828"); gl = hexc("#8fc4ea")
    o = [P("box", (0, 1.4, 0), (8.6, 1.4, 8.6), G(.2)), P("box", (0, 41, 0), (9.2, 1.4, 9.2), r, rad=.5),
         P("box", (0, 44.2, 0), (7.2, 1.8, 7.2), r, rad=.5), P("box", (0, 14.6, 0), (8.4, 11.6, 8.4), gl, spec=.5, rad=.3)]
    for x in (-8.0, 8.0):
        for z in (-8.0, 8.0):
            o.append(P("box", (x, 20, z), (.9, 20, .9), r, rad=.3))
    for y in (14.0, 24.5, 34.0):
        o.append(P("box", (0, y, 8.3), (7.6, .5, .5), r)); o.append(P("box", (0, y, -8.3), (7.6, .5, .5), r))
    o.append(P("box", (0, 25, -7.2), (6.4, 9, .6), G(.18)))
    o.append(P("box", (0, 33.0, 8.5), (5.4, 1.4, .4), hexc("#fde68a"), emissive=True))
    return o

def kiosk():
    w = hexc("#2b6cb0"); aw = hexc("#ef4444")
    return [P("box", (0, 14.5, -1), (15.5, 14.5, 10.5), w, rad=.8),
            P("box", (0, 30.3, -1), (17.0, 1.2, 12.5), hexc("#1e4a7d"), rad=.6),
            P("box", (0, 22, 9.4), (13, 6.0, .5), G(.12), rad=.2),
            P("box", (0, 14.2, 11.8), (14.0, .8, 3.4), hexc("#e2e8f0"), rad=.4),
            P("box", (0, 33.5, 5.6), (15.5, 1.6, 8.6), aw, stripe=(0, 5.0, G(.97)), R=rot(-14, 0, 0), rad=.5),
            P("box", (-5, 20.5, 8.8), (2.6, 3.2, .4), hexc("#fde68a")), P("box", (4.5, 20.5, 8.8), (3.4, 3.2, .4), hexc("#86efac")),
            P("box", (0, 4.5, 11), (16, 2.0, .6), G(.2))]

def ore_cart():
    br = hexc("#6b4a2b"); ir = G(.28)
    o = [P("box", (0, 12, 0), (14.5, 7.5, 18.5), br, rad=1.0, R=rot(0, 0, 0)), P("box", (0, 12, 0), (15.2, 1.0, 19.2), ir, rad=.4),
         P("box", (0, 20, 0), (15.5, .9, 19.8), ir, rad=.4), P("box", (0, 9, 0), (15.2, .9, 19.2), ir, rad=.4)]
    for x in (-14.5, 14.5):
        for z in (-10, 10):
            o.append(P("cyl", (x, 4.5, z), (4.5, 1.2), ir, R=rot(0, 0, 90), rad=.5))
    rng = np.random.RandomState(9)
    for i in range(8):
        o.append(P("ell", (rng.uniform(-9, 9), 21.5 + rng.uniform(0, 3), rng.uniform(-12, 12)), (rng.uniform(3, 4.6), rng.uniform(2.5, 4), rng.uniform(3, 4.5)),
                   hexc(["#94a3b8", "#fbbf24", "#60a5fa", "#a78bfa"][i % 4]), spec=.3))
    return o


# --- v33: çok karolu büyük eşyalar. Model z ekseni = wTiles (45 birim/karo), x ekseni = hTiles. ---
def _stall(col, col2):
    wd = hexc("#8a5a2b"); wl = hexc("#a9703a")
    o0 = [P("box", (-6, 10, 0), (14, 10, 40.0), wd, rad=.8), P("box", (-6, 20.6, 0), (15.5, 1.0, 41.5), wl, rad=.5),
         P("box", (8.5, 16, 0), (1.0, 16, 41.0), wd * .8)]  # arka duvar (ön +x, arka duvar -x yönünde değil: x=+ ürün sergisi)
    o = [P("box", (-6, 10, 0), (14, 10, 40.0), wd, rad=.8), P("box", (-6, 20.6, 0), (15.5, 1.0, 41.5), wl, rad=.5),
         P("box", (17, 24, 0), (1.0, 24, 41.0), wd * .8, rad=.4)]
    rng = np.random.RandomState(11)
    cols = ["#ef4444", "#facc15", "#22c55e", "#f97316", "#a855f7"]
    for i in range(5):
        z = -32 + i * 16
        o.append(P("box", (-6, 23.2, z), (11, 2.0, 7.0), hexc("#c08a4a"), rad=.5))
        for j in range(6):
            o.append(P("ell", (-6 + rng.uniform(-7, 7), 26.6 + rng.uniform(0, 1.5), z + rng.uniform(-4.5, 4.5)), (2.6, 2.6, 2.6), hexc(cols[(i + j) % 5]), spec=.35))
    for x in (-16.5, 16.5):
        for z in (-40.5, 40.5):
            o.append(P("box", (x, 25, z), (.9, 25, .9), wl, rad=.3))
    o.append(P("box", (0.5, 51.0, 0), (21.5, 1.0, 44.5), col, stripe=(2, 11.0, col2), R=rot(0, 0, 9), rad=.4))
    o.append(P("box", (-16.0, 44.0, 0), (1.0, 3.0, 44.5), col, stripe=(2, 11.0, col2)))
    return o

def stall_red(): return _stall(hexc("#dc2626"), G(.97))
def stall_blue(): return _stall(hexc("#2563eb"), G(.97))

def flower_bed():
    br = hexc("#a8623a"); o = [P("box", (0, 4.5, 0), (12.5, 4.5, 60.0), br, rad=1.0), P("box", (0, 9.2, 0), (13.6, .9, 61.0), hexc("#c27a4c"), rad=.5),
                               P("box", (0, 9.2, 0), (11.2, .7, 58.0), hexc("#3f2a1a"))]
    rng = np.random.RandomState(4); cols = ["#f472b6", "#fde047", "#fb7185", "#c084fc", "#fb923c", "#ffffff"]
    for i in range(34):
        z = rng.uniform(-55, 55); x = rng.uniform(-9, 9); h = rng.uniform(3, 8)
        o.append(P("cap", (0, 0, 0), ((x, 10, z), (x, 10 + h, z), .45), hexc("#22c55e")))
        o.append(P("ell", (x, 11 + h, z), (2.4, 1.8, 2.4), hexc(cols[rng.randint(6)]), spec=.2))
    for i in range(10):
        o.append(P("ell", (rng.uniform(-9, 9), 11.5, rng.uniform(-55, 55)), (3.4, 2.6, 3.4), hexc("#1f9d55")))
    return o

def bus_stop():
    d = hexc("#334155"); gl = hexc("#9fd3ef")
    o = [P("box", (0, 48, 0), (13, 1.3, 63), d, rad=.6), P("box", (0, 50.4, 0), (12, 1.0, 62), hexc("#2563eb"), rad=.4)]
    for z in (-60.5, 60.5):
        o.append(P("box", (-11, 24, z), (.9, 24, .9), d))
    for z in (-60.5, -20, 20, 60.5):
        o.append(P("box", (-12, 24, z), (.7, 24, .7), d))
    o.append(P("box", (-12, 27, 0), (.5, 21, 59), gl, spec=.6))
    o.append(P("box", (-5, 13.5, 0), (5.5, .9, 36), hexc("#b9772c"), rad=.4)); o.append(P("box", (-9.5, 18.5, 0), (.9, 4, 36), hexc("#b9772c"), rad=.4))
    for z in (-30, 30):
        o.append(P("box", (-5, 6.5, z), (4.5, 6.5, 1.0), d))
    o.append(P("box", (10, 58, 48), (.6, 8, 8), hexc("#facc15"), emissive=False)); o.append(P("cap", (0, 0, 0), ((10, 8, 55), (10, 58, 55), .9), d))
    o.append(P("box", (12.8, 62, 55), (.5, 6, 6), hexc("#2563eb")))
    o.append(P("box", (12.3, 46, -1), (.4, 3.5, 20), hexc("#fef08a"), emissive=True))
    return o

def billboard():
    d = hexc("#334155")
    o = [P("box", (0, 28, -36), (1.8, 28, 1.8), d), P("box", (0, 28, 36), (1.8, 28, 1.8), d),
         P("box", (0, 66, 0), (2.4, 20, 61), hexc("#1f1b3a"), rad=1.0),
         P("box", (2.6, 66, 0), (.6, 17, 58), hexc("#2a2552"))]
    cols = ["#f97316", "#facc15", "#22c55e", "#38bdf8", "#a855f7", "#ec4899"]
    for i, c in enumerate(cols):
        o.append(P("box", (3.3, 52 + (i % 3) * 12, -40 + i * 16), (.5, 4.5, 6.5), hexc(c), emissive=True))
    o.append(P("box", (3.3, 74, 0), (.5, 5, 28), hexc("#fef08a"), emissive=True))
    o.append(P("box", (3, 90, 0), (2, .8, 60), d))
    return o

def clock_tower():
    st = hexc("#c9b38a"); sd = hexc("#a8946a"); rf = hexc("#b83b25")
    o = [P("box", (0, 6, 0), (34, 6, 34), sd, rad=1.4), P("box", (0, 18, 0), (28, 6, 28), st, rad=1.2),
         P("box", (0, 70, 0), (17, 52, 17), st, rad=1.0), P("box", (0, 124, 0), (21, 3, 21), sd, rad=1.0),
         P("box", (0, 142, 0), (17.5, 15, 17.5), st, rad=1.0), P("box", (0, 158, 0), (20.5, 2.4, 20.5), sd, rad=.8),
         P("cone", (0, 160, 0), (21, 1.2, 40), rf, spec=.1), P("cap", (0, 0, 0), ((0, 198, 0), (0, 212, 0), .9), hexc("#facc15"), spec=.6),
         P("ell", (0, 200, 0), (3.2, 3.2, 3.2), hexc("#facc15"), spec=.6)]
    for x, z, R in ((17.9, 0, rot(0, 0, 90)), (-17.9, 0, rot(0, 0, 90)), (0, 17.9, rot(90, 0, 0)), (0, -17.9, rot(90, 0, 0))):
        o += [P("cyl", (x, 142, z), (13, .5), G(.97), R=R, rad=.3), P("torus", (x, 142, z), (13.2, .8), hexc("#8a6a2e"), R=R, spec=.5)]
        for k in range(4):
            a = math.radians(k * 90)
            c1 = (x, 142 + math.cos(a) * 10.5, z + math.sin(a) * 10.5) if abs(x) > 1 else (x + math.sin(a) * 10.5, 142 + math.cos(a) * 10.5, z)
            o.append(P("box", c1, (.6, .6, .6) if False else (.9, .9, .9), G(.15)))
        if abs(x) > 1:
            sg = 1 if x > 0 else -1
            o.append(P("box", (x + sg * .8, 148, z), (.4, 7.2, .5), G(.1))); o.append(P("box", (x + sg * .8, 142, z + 3), (.4, .5, 4.6), G(.1)))
        else:
            sg = 1 if z > 0 else -1
            o.append(P("box", (x, 148, z + sg * .8), (.5, 7.2, .4), G(.1))); o.append(P("box", (x + 3, 142, z + sg * .8), (4.6, .5, .4), G(.1)))
    for x, z in ((-16, -16), (16, -16), (-16, 16), (16, 16)):
        o.append(P("cone", (x * 1.05, 160, z * 1.05), (3.2, .4, 9.0), rf))
    return o

def fountain_big():
    st = hexc("#cdd1d6"); sd = hexc("#9aa1aa"); wt = hexc("#4cc3ee")
    o = [P("cyl", (0, 5, 0), (62, 5), st, rad=1.2), P("torus", (0, 10.5, 0), (61, 3.2), st, spec=.1),
         P("cyl", (0, 8.2, 0), (58, .9), wt, spec=.9),
         P("cyl", (0, 17, 0), (13, 8), sd, rad=1.2), P("cyl", (0, 28, 0), (24, 2.2), st, rad=1.6), P("torus", (0, 29.5, 0), (24, 1.8), st),
         P("cyl", (0, 29.5, 0), (22, .6), wt, spec=.9),
         P("cyl", (0, 38, 0), (6, 8), sd, rad=1.0), P("cyl", (0, 47, 0), (15, 1.8), st, rad=1.4), P("torus", (0, 48.2, 0), (15, 1.3), st),
         P("cyl", (0, 48.5, 0), (13.5, .5), wt, spec=.9),
         P("cap", (0, 0, 0), ((0, 48, 0), (0, 64, 0), 1.6), hexc("#bdeaff"), emissive=True),
         P("ell", (0, 66, 0), (3.2, 3.8, 3.2), hexc("#d3f1ff"), emissive=True)]
    for k in range(8):
        a = math.radians(k * 45)
        o.append(P("cap", (0, 0, 0), ((math.sin(a) * 6, 49, math.cos(a) * 6), (math.sin(a) * 16, 40, math.cos(a) * 16), .8), hexc("#bdeaff"), emissive=True))
        o.append(P("cap", (0, 0, 0), ((math.sin(a) * 16, 40, math.cos(a) * 16), (math.sin(a) * 22.5, 30.6, math.cos(a) * 22.5), .8), hexc("#bdeaff"), emissive=True))
    for k in range(10):
        a = math.radians(k * 36 + 18)
        o.append(P("cap", (0, 0, 0), ((math.sin(a) * 18, 30, math.cos(a) * 18), (math.sin(a) * 38, 22, math.cos(a) * 38), .8), hexc("#bdeaff"), emissive=True))
        o.append(P("cap", (0, 0, 0), ((math.sin(a) * 38, 22, math.cos(a) * 38), (math.sin(a) * 52, 9.5, math.cos(a) * 52), .8), hexc("#bdeaff"), emissive=True))
    return o

def food_truck():
    c = hexc("#f59e0b"); w = hexc("#fafafa"); d = G(.16)
    o = [P("box", (0, 22, -14), (21, 18, 60.0), c, rad=2.0), P("box", (0, 17, 47), (19.5, 12, 16.0), hexc("#d97706"), rad=2.0),
         P("box", (0, 33, 52.0), (17.5, 8, 9.0), hexc("#9fd3ef"), spec=.6, rad=1.0), P("box", (0, 41.5, -14), (21.5, 1.0, 60.5), w, rad=.5),
         P("box", (0, 3.6, 0), (22, 3.2, 70.0), d, rad=1.0)]
    for z in (-42, 46):
        for x in (-21.5, 21.5):
            o += [P("cyl", (x, 7.5, z), (8.0, 2.6), G(.07), R=rot(0, 0, 90), rad=.8), P("cyl", (x + (1.6 if x > 0 else -1.6), 7.5, z), (4.5, 1.0), G(.7), R=rot(0, 0, 90), spec=.6)]
    o += [P("box", (21.2, 28, -12), (.7, 7.5, 24), hexc("#111827")), P("box", (24.0, 38, -12), (3.2, 1.0, 26), hexc("#dc2626"), stripe=(2, 8, w), R=rot(0, 0, -18)),
          P("box", (23.5, 23.2, -12), (3.4, .7, 25), w, rad=.4),
          P("box", (21.2, 30, -45), (.5, 8, 8), hexc("#fde047"), emissive=True), P("ell", (-8, 44.5, -30), (5, 2.0, 5), G(.7))]
    return o


# --- v38: ağaç, palmiye ve büyük yapılar. Ön yüz -x (rot 0'da kameraya bakar), uzun eksen z. ---
def tree():
    br = hexc("#6b4423"); g = [hexc("#2f8f46"), hexc("#3da35a"), hexc("#25793a"), hexc("#4bb768")]
    o = [P("cone", (0, 0, 0), (9.5, 6.0, 40), br, spec=.05),
         P("cap", (0, 0, 0), ((0, 30, 0), (-9, 50, 4), 3.2), br), P("cap", (0, 0, 0), ((0, 32, 0), (8, 52, -3), 3.0), br)]
    rng = np.random.RandomState(21)
    blobs = [(0, 66, 0, 24), (-14, 56, 9, 17), (15, 57, -8, 17), (6, 52, 15, 15), (-10, 58, -14, 16), (0, 80, 2, 17), (-12, 72, 6, 13), (13, 72, -4, 13)]
    for i, (x, y, z, r) in enumerate(blobs):
        o.append(P("ell", (x, y, z), (r, r * .85, r), g[i % 4], spec=.05))
    for i in range(14):
        a = rng.uniform(0, 6.28); rr = rng.uniform(14, 26); y = rng.uniform(52, 80)
        o.append(P("ell", (math.cos(a) * rr, y, math.sin(a) * rr), (6.5, 5.5, 6.5), g[rng.randint(4)], spec=.05))
    return o

def palm():
    br = hexc("#8a6a3d"); br2 = hexc("#6d5230"); lf = [hexc("#2f9e4a"), hexc("#3fb55c"), hexc("#278a3f")]
    pts = [(0, 0, 0), (2, 22, 1), (6, 46, 3), (10, 70, 3), (12, 86, 2)]
    o = []
    for i in range(len(pts) - 1):
        a, b = pts[i], pts[i + 1]
        o.append(P("cap", (0, 0, 0), (a, b, 4.8 - i * .7), br if i % 2 == 0 else br2, spec=.03))
    for k in range(1, 9):
        y = k * 9.5
        xo = 2 + (y / 86) * 10
        o.append(P("torus", (xo * 0.9, y, 1.5 * (y / 40)), (4.3 - (y / 86) * 1.0, .6), br2))
    crown = np.array([12.0, 88.0, 2.0])
    for i in range(10):
        a = math.radians(i * 36 + 8); L = 40 + (i % 3) * 3; D = 20 + (i % 2) * 6
        dx, dz = math.cos(a), -math.sin(a)
        for t in (.18, .35, .52, .7, .86):
            pos = crown + np.array([dx * L * t, -(t ** 2) * D + 4 * (1 - t), dz * L * t])
            o.append(P("ell", tuple(pos), (6.2 - t * 2.4, 1.1, 4.0 - t * 1.6), lf[i % 3], R=rot(0, math.degrees(a), 0), spec=.15))
    for c in ((14.5, 82, 5), (9.5, 82, -1), (13, 80, -4)):
        o.append(P("ell", c, (3.2, 3.4, 3.2), hexc("#5b3a1c")))
    return o

def _thatch(zl, xl, y0, rise, col):
    """Beşik çatı: sırt z ekseni boyunca"""
    ang = math.degrees(math.atan2(rise, xl))
    L = math.hypot(xl, rise)
    return [P("box", (-xl / 2, y0 + rise / 2, 0), (L / 2, 1.6, zl), col, R=rot(0, 0, ang), rad=.8),
            P("box", (xl / 2, y0 + rise / 2, 0), (L / 2, 1.6, zl), col * .9, R=rot(0, 0, -ang), rad=.8),
            P("box", (0, y0 + rise + .6, 0), (2.4, 1.6, zl + .5), col * .75, rad=.8)]

def beach_cafe():
    wd = hexc("#b9772c"); wd2 = hexc("#8a5a2b"); th = hexc("#d9b36a")
    o = [P("box", (0, 2.5, 0), (66, 2.5, 88), wd, rad=.8)]
    for i in range(10):
        o.append(P("box", (-66 + i * 14.6, 5.1, 0), (.3, .3, 87), wd2))
    for x in (-60, 60):
        for z in (-82, 82, 0):
            o.append(P("box", (x, 32, z), (2.0, 27, 2.0), wd2, rad=.5))
    o += _thatch(88, 66, 58, 28, th)
    o.append(P("box", (52, 17, 0), (4.5, 12, 78), wd2, rad=.6))  # arka duvar/bar
    o.append(P("box", (36, 12, 0), (7.5, 8, 70), wd, rad=.6)); o.append(P("box", (36, 20.4, 0), (8.5, .9, 71), hexc("#f3e5c0"), rad=.4))
    cols = ["#22c55e", "#f59e0b", "#38bdf8", "#ef4444", "#a855f7"]
    for i in range(12):
        o.append(P("cap", (0, 0, 0), ((52, 28, -66 + i * 12), (52, 36, -66 + i * 12), 1.6), hexc(cols[i % 5]), spec=.4))
    o.append(P("box", (50, 27, 0), (1.0, .8, 74), wd2))
    for z in (-50, -20, 20, 50):
        o += [P("cyl", (14, 11, z), (5.5, 1.0), hexc("#2f6fd0"), rad=.5), P("cap", (0, 0, 0), ((14, 2, z), (14, 10, z), .9), G(.6))]
    for z in (-60, 60):
        o += [P("cyl", (-34, 9, z), (10, 1.2), hexc("#f1e0b8"), rad=.6), P("cyl", (-34, 4.5, z), (1.2, 4.5), G(.6))]
    for z in (-70, -35, 0, 35, 70):
        o.append(P("ell", (-64, 52, z), (2.6, 3.2, 2.6), hexc("#fde68a"), emissive=True))
    o.append(P("box", (-64.5, 44, 0), (.8, 4, 20), hexc("#0ea5e9"), emissive=True))
    return o

def dj_booth():
    d = G(.13); pk = hexc("#d946ef"); cy = hexc("#22d3ee")
    o = [P("box", (0, 4, 0), (40, 4, 66), G(.2), rad=1.0), P("box", (-44, 2, 0), (4, 2, 40), G(.25), rad=.6)]
    for z in (-62, 62):
        o += [P("box", (30, 36, z), (2.0, 32, 2.0), d, rad=.5), P("box", (-30, 36, z), (2.0, 32, 2.0), d, rad=.5)]
    o.append(P("box", (0, 68, 0), (32, 2.2, 66), d, rad=.8))
    o.append(P("box", (-31, 66, 0), (.6, .8, 64), pk, emissive=True)); o.append(P("box", (31, 66, 0), (.6, .8, 64), cy, emissive=True))
    rb = ["#ef4444", "#f97316", "#facc15", "#22c55e", "#06b6d4", "#6366f1", "#a855f7"]
    for i, c in enumerate(rb):
        o.append(P("box", (36, 40, -54 + i * 18), (.8, 22, 7.6), hexc(c), emissive=True))
    o.append(P("box", (-6, 14, 0), (7, 5, 26), G(.12), rad=.8)); o.append(P("box", (-6, 19.2, 0), (7.4, .6, 26.4), G(.3), rad=.4))
    for z in (-14, 14):
        o += [P("cyl", (-6, 19.9, z), (6.0, .35), G(.05), rad=.3), P("cyl", (-6, 20.3, z), (1.0, .3), hexc("#ef4444"))]
    for z in (-50, 50):
        o.append(P("box", (-12, 16, z), (7, 12, 7), d, rad=1.0))
        o.append(P("cyl", (-19.4, 18, z), (4.6, .5), G(.3), R=rot(0, 0, 90), rad=.3)); o.append(P("cyl", (-19.8, 18, z), (1.8, .5), G(.5), R=rot(0, 0, 90)))
        o.append(P("cyl", (-19.4, 10, z), (2.4, .5), G(.3), R=rot(0, 0, 90)))
    o.append(P("box", (-16, 23, 0), (2, 3, 12), pk, emissive=True))
    return o

def tiki_bar():
    wd = hexc("#9a6330"); wd2 = hexc("#6e4420"); th = hexc("#d4a85a")
    o = [P("box", (0, 2, 0), (40, 2, 40), wd2, rad=.7)]
    o.append(P("box", (14, 12, 0), (6, 10, 34), wd, rad=.6)); o.append(P("box", (-8, 12, 28), (24, 10, 6), wd, rad=.6))
    o.append(P("box", (14, 22.4, 0), (7, .9, 35), hexc("#f3e5c0"), rad=.4)); o.append(P("box", (-8, 22.4, 28), (25, .9, 7), hexc("#f3e5c0"), rad=.4))
    for x, z in ((-34, -34), (34, -34), (-34, 34), (34, 34)):
        o.append(P("box", (x, 28, z), (1.8, 26, 1.8), wd2, rad=.5))
    o.append(P("ell", (0, 50, 0), (56, 28, 56), th, cut=((0, 1, 0), 0), stripe=(1, 6, hexc("#b88a42")), spec=.0))
    o.append(P("ell", (0, 90, 0), (2.4, 3, 2.4), wd2))
    cols = ["#22c55e", "#f59e0b", "#38bdf8", "#ef4444", "#a855f7"]
    for i in range(6):
        o.append(P("cap", (0, 0, 0), ((26, 34, -26 + i * 10), (26, 44, -26 + i * 10), 1.5), hexc(cols[i % 5]), spec=.4))
    o.append(P("box", (24, 33, 0), (.8, .8, 33), wd2))
    for z in (-18, 0, 18):
        o += [P("cyl", (-10, 11, z), (5, 1.0), hexc("#ef4444"), rad=.5), P("cap", (0, 0, 0), ((-10, 2, z), (-10, 10, z), .9), G(.6))]
    o.append(P("box", (-34, 40, 0), (.8, 4, 16), hexc("#f43f5e"), emissive=True))
    for z in (-34, 34): o.append(P("ell", (-34.8, 36, z), (2.0, 2.8, 2.0), hexc("#fde68a"), emissive=True))
    return o

def casino_bar():
    wd = hexc("#4a2a15"); gd = hexc("#d4a017"); rd = hexc("#7f1d1d")
    o = [P("box", (-16, 14, 0), (7, 14, 84), wd, rad=.9), P("box", (-16, 28.6, 0), (8.2, 1.4, 85), hexc("#1f1b24"), rad=.7, spec=.4),
         P("box", (-23.2, 14, 0), (.5, 11, 80), rd, rad=.3), P("box", (-23.4, 27, 0), (.5, .8, 82), gd, spec=.7), P("box", (-23.4, 3, 0), (.5, .8, 82), gd, spec=.7),
         P("box", (24, 28, 0), (5, 28, 84), hexc("#23160d"), rad=.8)]
    for lv in (24, 38):
        o.append(P("box", (19, lv, 0), (3.2, .8, 80), wd))
        for i in range(16):
            o.append(P("cap", (0, 0, 0), ((19, lv + 1, -74 + i * 9.8), (19, lv + 10, -74 + i * 9.8), 1.6), hexc(["#22c55e", "#f59e0b", "#38bdf8", "#ef4444", "#a855f7"][i % 5]), spec=.5))
    o.append(P("box", (28.8, 36, 0), (.4, 20, 78), hexc("#7dd3fc"), spec=.7))
    for z in (-60, -30, 0, 30, 60):
        o += [P("cyl", (-34, 11, z), (6, 1.0), rd, rad=.5), P("cap", (0, 0, 0), ((-34, 2, z), (-34, 10, z), 1.0), gd, spec=.6), P("cyl", (-34, .8, z), (5, .8), G(.3))]
    o.append(P("box", (-12, 62, 0), (2, 6, 40), hexc("#fb7185"), emissive=True)); o.append(P("box", (-12.6, 62, 0), (1.0, 4, 36), hexc("#fef08a"), emissive=True))
    for z in (-38, 38): o.append(P("box", (-12, 54, z), (1.0, 14, 1.0), G(.2)))
    return o

def fish_hut():
    wd = hexc("#9a6a3a"); wd2 = hexc("#6e4a28"); rf = hexc("#3e4d5c")
    o = [P("box", (0, 3, 0), (40, 3, 62), wd2, rad=.8), P("box", (14, 24, 0), (22, 21, 56), wd, rad=.8, stripe=(1, 5.0, hexc("#8a5a2f")))]
    o += _thatch(60, 38, 45, 22, rf)
    o.append(P("box", (-8.3, 18, 8), (.8, 14, 10), wd2, rad=.4)); o.append(P("box", (-8.5, 25, -26), (.6, 7, 9), hexc("#9fd3ef"), spec=.5)); o.append(P("box", (-8.8, 25, -26), (.5, 8, 10), wd2, rad=.3))
    for z in (-44, 40): o.append(P("box", (-30, 20, z), (1.2, 20, 1.2), wd2))
    o.append(P("box", (-30, 38, 0), (1.2, 1.0, 44), wd2))
    for i in range(6):
        o.append(P("ell", (-30, 28 - (i % 2) * 3, -32 + i * 12), (1.8, 6.2, 2.4), hexc("#cbd5e1"), spec=.6))
    for z in (24, 34):
        o += [P("cyl", (-24, 9, z), (6.2, 8), hexc("#7c4a1c"), rad=1.0), P("torus", (-24, 12, z), (6.3, .5), G(.25)), P("torus", (-24, 6, z), (6.3, .5), G(.25))]
    o.append(P("box", (-22, 6, -52), (7, 4, 6), hexc("#b0793a"), rad=.5)); o.append(P("ell", (-22, 11, -52), (4.5, 2.5, 4.5), hexc("#94a3b8")))
    return o

def mine_entrance():
    rk = [hexc("#6b7280"), hexc("#7b828d"), hexc("#585f6b"), hexc("#8b929c")]; wd = hexc("#7a4f2a")
    o = []
    rng = np.random.RandomState(6)
    for i in range(34):
        z = rng.uniform(-78, 78); x = rng.uniform(-6, 38); y = rng.uniform(10, 44)
        if abs(z) < 26 and x < 14: continue
        r = rng.uniform(10, 17)
        o.append(P("ell", (x, y, z), (r, r * .9, r), rk[rng.randint(4)], spec=.05))
    o.append(P("box", (30, 30, 0), (14, 30, 86), rk[2], rad=3))
    o.append(P("box", (-6, 24, 0), (16, 24, 24), G(.04), rad=1.0))
    for z in (-26, 26): o.append(P("box", (-20.5, 20, z), (2.6, 20, 2.6), wd, rad=.6))
    o.append(P("box", (-20.5, 41, 0), (3.0, 2.6, 30), wd, rad=.6))
    o.append(P("box", (-23.5, 46, 0), (.8, 3, 12), hexc("#3f2a14"))); o.append(P("box", (-24.0, 46, 0), (.4, 1.4, 9), hexc("#fbbf24"), emissive=True))
    for z in (-12, 12): o.append(P("box", (-30, .7, z), (28, .5, .8), G(.3)))
    for x in range(-58, -16, 8): o.append(P("box", (x, .4, 0), (.8, .5, 14), wd))
    o.append(P("box", (-20.4, 36, 0), (.6, 3.4, 3.2), hexc("#ef4444"))); o.append(P("ell", (-21.3, 30, -26), (1.8, 2.4, 1.8), hexc("#fde68a"), emissive=True))
    return o

def _store(body, trim, awn, sign, glow):
    o = [P("box", (6, 36, 0), (30, 36, 84), body, rad=1.2), P("box", (-25, 72.5, 0), (7, 2.4, 86), trim, rad=.8),
         P("box", (-24.5, 5.0, 0), (1.4, 3.0, 82), trim)]
    o.append(P("box", (-24.4, 22, 0), (.7, 17, 74), hexc("#1b2638"), spec=.6))
    for i in range(6):
        o.append(P("box", (-25.2, 22, -64 + i * 25.6), (.5, 16.2, 11.5), glow, emissive=True))
    o.append(P("box", (-24.2, 22, 0), (1.0, 17.6, 1.4), trim))
    o.append(P("box", (-27, 44.6, 0), (3.8, 1.0, 80), awn, stripe=(2, 9.0, G(.96)), R=rot(0, 0, 14), rad=.4))
    o.append(P("box", (-26.5, 62, 0), (1.6, 7.0, 40), sign, rad=.8, emissive=True))
    o.append(P("box", (-28.2, 62, 0), (.6, 4.8, 36), G(.96), emissive=True))
    o.append(P("box", (-24.8, 15, 62), (1.2, 15, 10), trim, rad=.4)); o.append(P("box", (-25.6, 15, 62), (.5, 14, 8), hexc("#9fd3ef"), spec=.6))
    return o

def store_fashion(): return _store(hexc("#8b5cf6"), hexc("#f1ecff"), hexc("#ec4899"), hexc("#c026d3"), hexc("#fde1f0"))
def store_tech(): return _store(hexc("#2563eb"), hexc("#e0ecff"), hexc("#22d3ee"), hexc("#0ea5e9"), hexc("#a5f3fc"))
def store_food(): return _store(hexc("#f59e0b"), hexc("#fff3d6"), hexc("#ef4444"), hexc("#dc2626"), hexc("#fff0b8"))

def kitchen_block():
    st = G(.78); d = G(.18)
    o = [P("box", (-8, 15, 0), (16, 15, 80), st, rad=.9, spec=.55), P("box", (-8, 30.5, 0), (17, 1.0, 81), G(.88), rad=.5, spec=.7),
         P("box", (-24.2, 15, 0), (.5, 12, 76), G(.6), spec=.6)]
    for i in range(7):
        o.append(P("box", (-24.5, 15, -66 + i * 22), (.4, 9, 9.5), G(.7), spec=.5)); o.append(P("box", (-25.0, 19, -66 + i * 22), (.4, 1.0, 5), G(.2)))
    for z in (-48, -16): 
        for dz in (-8, 8):
            o += [P("cyl", (-6, 31.8, z + dz), (5.0, .5), d, rad=.3), P("torus", (-6, 32.4, z + dz), (3.6, .45), hexc("#fb923c"), emissive=True)]
    o.append(P("box", (14, 56, -32), (17, 5, 52), G(.74), rad=1.0, spec=.55))
    o.append(P("box", (14, 70, -32), (6, 10, 8), G(.66), spec=.5))
    o.append(P("box", (-8, 33, 40), (9, 1.4, 22), hexc("#b9772c"), rad=.6))
    for z in (-60, -30, 0, 30, 60):
        o.append(P("cyl", (22, 40, z), (5.0, 3.0), hexc(["#ef4444", "#94a3b8", "#f59e0b", "#94a3b8", "#22c55e"][int((z + 60) // 30)]), rad=.8, spec=.4))
    o.append(P("box", (20, 33, 0), (1.2, .8, 76), G(.5), spec=.6))
    for z in (-70, -30): o.append(P("cap", (0, 0, 0), ((8, 56, z), (8, 63, z + 4), .8), G(.6)))
    return o

def barn():
    rd = hexc("#b83227"); rd2 = hexc("#8e231c"); wh = hexc("#f4efe6"); rf = hexc("#5c6470")
    o = [P("box", (0, 26, 0), (46, 26, 82), rd, rad=1.0, stripe=(2, 6.0, rd2))]
    ang = math.degrees(math.atan2(28, 46)); L = math.hypot(46, 28)
    o += [P("box", (-23, 59, 0), (L / 2 + 2, 1.8, 86), rf, R=rot(0, 0, ang), rad=.8), P("box", (23, 59, 0), (L / 2 + 2, 1.8, 86), rf * .9, R=rot(0, 0, -ang), rad=.8),
          P("box", (0, 73.6, 0), (3.0, 1.8, 86), rf * .7, rad=.8)]
    o.append(P("box", (0, 61, 82.4), (46, 24, .7), rd, rad=.4))
    for i, zz in enumerate((83.2,)):
        o.append(P("box", (0, 22, zz), (19, 20, .6), rd2, rad=.3))
        o.append(P("box", (-0.3, 22, zz + .4), (19.8, .9, .5), wh)); o.append(P("box", (0, 22, zz + .4), (.9, 20.8, .5), wh))
        o.append(P("box", (0, 22, zz + .5), (17.6, 17.6, .3), wh, R=rot(0, 0, 45)) if False else P("box", (0, 52, zz), (7, 4, .5), G(.1)))
    for z in (-50, -10, 30):
        o.append(P("box", (-46.5, 30, z), (.6, 7, 7), G(.12))); o.append(P("box", (-47.0, 30, z), (.5, .8, 8), wh)); o.append(P("box", (-47.0, 30, z), (.8, 8, .5), wh))
    o += [P("cyl", (-24, 40, -108), (16, 40), hexc("#c9ced6"), rad=1.0, spec=.2, stripe=(1, 8.0, hexc("#b4bac4"))),
          P("ell", (-24, 82, -108), (16.5, 12, 16.5), hexc("#a0a7b3"), cut=((0, 1, 0), 0))]
    for k, (x, z) in enumerate(((-60, 40), (-60, 62), (-66, 52), (-60, 14))):
        o.append(P("cyl", (x, 6.2, z), (6.5, 7.5), hexc("#d9b94a"), R=rot(90, 0, 0), rad=2.0, stripe=(2, 3.0, hexc("#c4a43c"))))
    return o

# tür -> (model, fw, fh, feet_y, wTiles, hTiles)
ITEMS = {
    "bench": (bench, 260, 280, 190, 1, 1),
    "chair": (chair, 160, 220, 160, 1, 1),
    "sofa": (sofa, 200, 220, 160, 1, 1),
    "lounger": (lounger, 300, 280, 200, 1, 1),
    "tv": (tv, 200, 260, 190, 1, 1),
    "bookshelf": (bookshelf, 200, 340, 260, 1, 1),
    "bed": (bed, 360, 320, 230, 2, 1),
    "logseat": (logseat, 200, 200, 150, 1, 1),
    "beanbag": (beanbag, 160, 200, 140, 1, 1),
    "plant": (plant, 160, 260, 180, 1, 1),
    "lamp": (lamp, 120, 360, 280, 1, 1),
    "streetlight": (streetlight, 180, 500, 420, 1, 1),
    "table": (table, 160, 200, 150, 1, 1),
    "counter": (counter, 180, 220, 160, 1, 1),
    "casinotable": (casinotable, 180, 200, 140, 1, 1),
    "bin": (bin_, 120, 200, 140, 1, 1),
    "umbrella": (umbrella, 200, 340, 280, 1, 1),
    "campfire": (campfire, 160, 180, 130, 1, 1),
    "mannequin": (mannequin, 120, 310, 240, 1, 1),
    "surfboard": (surfboard, 120, 260, 190, 1, 1),
    "phone_booth": (phone_booth, 140, 300, 220, 1, 1),
    "kiosk": (kiosk, 200, 300, 220, 1, 1),
    "ore_cart": (ore_cart, 180, 200, 150, 1, 1),
    "stall_red": (stall_red, 520, 510, 360, 2, 1),
    "stall_blue": (stall_blue, 520, 510, 360, 2, 1),
    "flower_bed": (flower_bed, 580, 280, 150, 3, 1),
    "bus_stop": (bus_stop, 580, 500, 370, 3, 1),
    "billboard": (billboard, 580, 560, 420, 3, 1),
    "clock_tower": (clock_tower, 540, 940, 770, 2, 2),
    "fountain_big": (fountain_big, 820, 480, 300, 3, 3),
    "food_truck": (food_truck, 700, 480, 350, 3, 2),
    "tree": (tree, 300, 440, 395, 1, 1),
    "palm": (palm, 360, 470, 400, 1, 1),
    "beach_cafe": (beach_cafe, 930, 620, 377, 4, 3),
    "dj_booth": (dj_booth, 680, 540, 361, 3, 2),
    "tiki_bar": (tiki_bar, 560, 420, 273, 2, 2),
    "casino_bar": (casino_bar, 810, 510, 299, 4, 2),
    "fish_hut": (fish_hut, 680, 440, 261, 3, 2),
    "mine_entrance": (mine_entrance, 810, 590, 379, 4, 2),
    "store_fashion": (store_fashion, 810, 610, 399, 4, 2),
    "store_tech": (store_tech, 810, 610, 399, 4, 2),
    "store_food": (store_food, 810, 610, 399, 4, 2),
    "kitchen_block": (kitchen_block, 810, 540, 329, 4, 2),
    "barn": (barn, 1000, 700, 447, 4, 3),
}

SCALE = {"bench": 1.3}

def _sc(v, k):
    if isinstance(v, (tuple, list)): return type(v)(_sc(x, k) for x in v)
    return v * k if isinstance(v, (int, float)) else v

def scaled(prims, k):
    out = []
    for p in prims:
        q = P.__new__(P); q.__dict__ = dict(p.__dict__)
        q.c = p.c * k; q.size = _sc(p.size, k); q.rad = p.rad * k
        if p.cut is not None: q.cut = (p.cut[0], p.cut[1] * k)
        if p.stripe is not None: q.stripe = (p.stripe[0], p.stripe[1] * k, p.stripe[2])
        out.append(q)
    return out

MIRROR = {"billboard", "bus_stop"}

def mirrored(prims):
    M = np.diag([-1.0, 1.0, 1.0]); out = []
    for p in prims:
        q = P.__new__(P); q.__dict__ = dict(p.__dict__)
        q.c = M @ p.c; q.R = M @ p.R @ M
        out.append(q)
    return out

def gen(name):
    fn, fw, fh, feet, wt, ht = ITEMS[name]
    r3d.FW, r3d.FH, r3d.FEET_PX, r3d.ELEV = fw, fh, feet, math.radians(30)
    sheet = Image.new("RGBA", (fw * 4, fh))
    for d, yaw in enumerate(DIRS_YAW):
        cam = r3d.Cam(yaw)
        pr = scaled(fn(), SCALE[name]) if name in SCALE else fn()
        if name in MIRROR: pr = mirrored(pr)
        rgb, al, dp = render(pr, cam)
        sheet.paste(to_image(downsample(outline(rgb, al, dp), al)), (d * fw, 0))
    sheet.save(os.path.join(OUT, name + ".png"), optimize=True)
    print("ok", name, flush=True)

def write_meta():
    lines = ["// Otomatik üretildi: tools/gen_furni3d.py. 4 yönlü 3D eşya sheet ölçüleri (kare px).", "export const FURNI3D: Record<string, { fw: number; fh: number; feet: number }> = {"]
    for k, (_, fw, fh, feet, _, _) in ITEMS.items():
        lines.append(f'  {k}: {{ fw: {fw}, fh: {fh}, feet: {feet} }},')
    lines.append("};")
    open(os.path.join(ROOT, "lib", "furni3d.ts"), "w").write("\n".join(lines) + "\n")

if __name__ == "__main__":
    names = sys.argv[1:] or list(ITEMS)
    for n in names: gen(n)
    write_meta()
