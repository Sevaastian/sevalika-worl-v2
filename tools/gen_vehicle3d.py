#!/usr/bin/env python3
"""Araçları 3D'den 4 yönlü PNG olarak üretir: public/sprites/veh/<ad>.png
Sheet: 4 sütun (0 GD, 1 GB, 2 KB, 3 KD) x 1 satır, kare 480x360; araç merkezi (zemin) kare (240, 240) noktasındadır.
1 birim = 4 px (oyunda 1x'te 1 px)."""
import os, sys, math
sys.path.insert(0, os.path.dirname(__file__))
import numpy as np
from PIL import Image
import r3d
r3d.FW, r3d.FH, r3d.FEET_PX, r3d.ELEV = 480, 360, 240, math.radians(30)
from r3d import P, Cam, rot, hexc, render, outline, downsample, to_image, DIRS_YAW

OUT = os.path.join(os.path.dirname(__file__), "..", "public", "sprites", "veh")
os.makedirs(OUT, exist_ok=True)
G = lambda v: (v, v, v)
GLASS = hexc("#1e3a5f")

def wheels(L, W, wz, r=7.0, y=None):
    o = []
    for zz in wz:
        for sx in (-1, 1):
            c = (sx * (W + 0.5), r, zz)
            o.append(P("cyl", c, (r, 3.2), hexc("#111827"), R=rot(0, 0, 90), rad=1.4))
            o.append(P("cyl", (sx * (W + 3.0), r, zz), (r * .55, .8), hexc("#cbd5e1"), R=rot(0, 0, 90), rad=.3, spec=.8))
    return o

def lights(W, front, back, y=11.5):
    o = []
    for sx in (-1, 1):
        o.append(P("ell", (sx * (W - 6), y, front), (3.0, 2.2, 1.2), G(1), emissive=True))
        o.append(P("ell", (sx * (W - 5), y, back), (3.0, 2.0, 1.0), hexc("#ef4444"), emissive=True))
    o.append(P("box", (0, 8.5, front + .2), (W - 4, 2.2, 1.0), hexc("#1f2937"), rad=.8))  # tampon/ızgara
    o.append(P("box", (0, 7.5, front + .9), (4.2, 1.7, .4), G(.97)))  # plaka
    o.append(P("box", (0, 7.5, back - .9), (4.2, 1.7, .4), G(.97)))
    return o

def car(body, roof=None, extra=None, stripe=None):
    W, Ln = 19.0, 41.0
    roof = roof or body
    o = [P("box", (0, 11.0, 0), (W, 6.0, Ln), body, rad=4.5, spec=.45, stripe=stripe),
         P("box", (0, 19.2, -3), (W - 2.5, 4.2, 23), GLASS, rad=2.5, spec=.8),
         P("box", (0, 24.4, -3), (W - 3.2, 1.3, 21.5), roof, rad=1.2, spec=.45),
         P("box", (0, 15.4, 22), (W - 1.0, .8, 14), body * .86, rad=.5)]  # kaput çizgisi
    o += wheels(Ln, W, (-24, 25)) + lights(W, Ln, -Ln)
    return o + (extra or [])

def taxi():
    y = hexc("#fbbf24")
    ex = [P("box", (0, 27.6, -3), (5.0, 1.8, 2.6), G(.97), rad=.5), P("box", (0, 27.8, -3), (4.6, .9, 2.7), hexc("#111827"), rad=.3)]
    return car(y, extra=ex, stripe=None) + [P("box", (0, 11.6, 0), (19.2, .9, 41.2), hexc("#111827"), rad=.3, stripe=(2, 5.0, y))]

def police():
    ex = []
    for sx, col in ((-1, "#ef4444"), (1, "#3b82f6")):
        ex.append(P("box", (sx * 4.2, 27.0, -3), (3.6, 1.7, 3.2), hexc(col), rad=.6, emissive=True))
    return car(hexc("#f1f5f9"), extra=ex) + [P("box", (0, 11.0, 0), (19.15, 3.0, 41.1), hexc("#1d4ed8"), rad=1.0)]

def pickup():
    r = hexc("#16a34a")
    W, Ln = 19.5, 44.0
    o = [P("box", (0, 11.0, 0), (W, 6.0, Ln), r, rad=4.0, spec=.45),
         P("box", (0, 19.0, 15), (W - 2.5, 4.4, 11), GLASS, rad=2.4, spec=.8),
         P("box", (0, 24.2, 15), (W - 3.2, 1.2, 10), r, rad=1.0),
         P("box", (0, 17.5, -14), (W - .6, 3.2, 15), r * .9, rad=.8, cut=((0, 1, 0), -1)),
         P("box", (0, 15.2, -14), (W - 2.2, .6, 13.5), hexc("#14532d"), rad=.3)]
    o += wheels(Ln, W, (-26, 28)) + lights(W, Ln, -Ln)
    return o

def bus():
    W, Ln = 20.0, 54.0
    r = hexc("#dc2626")
    o = [P("box", (0, 17.0, 0), (W, 12.0, Ln), r, rad=4.5, spec=.35),
         P("box", (0, 21.0, 0), (W + .15, 4.5, Ln - 5), GLASS, rad=1.5, spec=.8),
         P("box", (0, 31.5, 0), (W - 1.5, 1.0, Ln - 2), G(.93), rad=.8),
         P("box", (0, 10.0, 0), (W + .1, 3.0, Ln + .1), G(.95), rad=.8)]
    for z in (-17, -2, 13):
        for sx in (-1, 1):
            o.append(P("box", (sx * (W + .2), 17.0, z), (.4, 6.5, 6.0), G(.2)))
    o += wheels(Ln, W, (-33, 33), r=7.5) + lights(W, Ln, -Ln, y=14.5)
    o.append(P("box", (0, 24.5, Ln + .1), (W - 4, 2.4, .5), hexc("#fde68a"), emissive=True))
    return o

VEH = {
    "car_red": lambda: car(hexc("#dc2626")),
    "car_blue": lambda: car(hexc("#2563eb")),
    "car_yellow": taxi,
    "police": police,
    "pickup": pickup,
    "bus": bus,
}

def gen(name):
    sheet = Image.new("RGBA", (480 * 4, 360))
    for d, yaw in enumerate(DIRS_YAW):
        cam = Cam(yaw)
        rgb, al, dp = render(VEH[name](), cam)
        im = to_image(downsample(outline(rgb, al, dp), al))
        sheet.paste(im, (d * 480, 0))
    sheet.save(os.path.join(OUT, name + ".png"), optimize=True)
    print("ok", name, flush=True)

if __name__ == "__main__":
    for n in (sys.argv[1:] or VEH):
        gen(n)
