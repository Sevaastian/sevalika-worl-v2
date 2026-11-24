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

# tür -> (model, fw, fh, feet_y, wTiles, hTiles)
ITEMS = {
    "bench": (bench, 200, 240, 170, 1, 1),
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
}

def gen(name):
    fn, fw, fh, feet, wt, ht = ITEMS[name]
    r3d.FW, r3d.FH, r3d.FEET_PX, r3d.ELEV = fw, fh, feet, math.radians(30)
    sheet = Image.new("RGBA", (fw * 4, fh))
    for d, yaw in enumerate(DIRS_YAW):
        cam = r3d.Cam(yaw)
        rgb, al, dp = render(fn(), cam)
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
