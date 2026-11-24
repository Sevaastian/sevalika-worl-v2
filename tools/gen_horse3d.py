#!/usr/bin/env python3
"""Süvari atını 3D'den 4 yönlü PNG olarak üretir: public/sprites/horse/horse.png ve rider_legs.png
Sheet: 8 sütun (0 duruş, 1-6 dörtnala, 7 boş) x 4 satır (yön: 0 GD, 1 GB, 2 KB, 3 KD), kare 320x304 px, 1 birim = 4 px,
ayak (zemin) noktası kare alt-ortasının 8 px üstü. rider_legs: binicinin bacak+ayakkabısı (karakter gövdesinin altına/önüne binmesi için)."""
import os, sys, math
sys.path.insert(0, os.path.dirname(__file__))
import numpy as np
from PIL import Image
import r3d
r3d.FW = 320
from r3d import P, Cam, rot, rx, hexc, render, outline, downsample, to_image, composite_visible, DIRS_YAW

FW, FH = 320, 304
r3d.FH = 304
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "sprites", "horse")
os.makedirs(OUT, exist_ok=True)
COAT = hexc("#8a4b2a"); COAT_D = hexc("#6b381d"); MANE = hexc("#241610"); WHITE = hexc("#f1ebe3")
SIDE = (-1, 1)

def leg(hip, ang, bend, front, sgn):
    """iki parçalı at bacağı (üst + alt), hip etrafında salınır"""
    hx, hy, hz = hip
    upper = P("cap", (0, 0, 0), ((hx, hy, hz), (hx, hy - 9.5, hz + (0.8 if front else -1.2)), 2.9 if front else 3.3), COAT)
    knee = np.array((hx, hy - 9.5, hz + (0.8 if front else -1.2)))
    lower = P("cap", (0, 0, 0), ((knee[0], knee[1], knee[2]), (knee[0], knee[1] - 9.0, knee[2]), 1.7), COAT_D)
    hoof = P("cyl", (knee[0], knee[1] - 9.4, knee[2]), (2.3, 1.0), hexc("#1c1917"), rad=.5)
    sock = P("cap", (0, 0, 0), ((knee[0], knee[1] - 6.0, knee[2]), (knee[0], knee[1] - 8.6, knee[2]), 1.85), WHITE) if sgn > 0 else None
    parts = [upper, lower, hoof] + ([sock] if sock else [])
    M1 = rx(math.radians(ang))
    out = []
    for q in parts:
        q = q.moved(hip, M1)
        out.append(q)
    # alt parça diz etrafında ek bükülme (hesaplanan diz konumu)
    kn2 = np.array(hip) + M1 @ (knee - np.array(hip))
    M2 = rx(math.radians(bend))
    res = [out[0]]
    for q in out[1:]:
        res.append(q.moved(tuple(kn2), M2))
    return res

def horse(frame):
    ph = (frame - 1) / 6 * 2 * math.pi if frame else 0
    g = frame > 0
    breathe = 0.0 if g else 0.25
    bob = (math.sin(ph * 2) * 0.6) if g else 0
    o = [P("ell", (0, 21 + bob, 0), (7.4, 7.6, 16.5), COAT, spec=.25),
         P("ell", (0, 22.5 + bob, 10.5), (7.0, 8.2, 8.0), COAT, spec=.25),
         P("ell", (0, 22.5 + bob, -11.5), (7.3, 8.0, 8.0), COAT, spec=.25),
         P("ell", (0, 16.0 + bob, 2), (6.2, 3.0, 12), COAT_D)]
    # boyun + kafa
    neck = P("cone", (0, 24 + bob, 14), (5.2, 3.3, 16), COAT, R=rx(math.radians(38)), spec=.2)
    head = P("ell", (0, 42.5 + bob, 24.5), (3.9, 3.8, 7.6), COAT, R=rx(math.radians(52)), spec=.25)
    muzzle = P("ell", (0, 38.2 + bob, 29.6), (3.1, 2.9, 3.6), COAT_D, R=rx(math.radians(60)))
    blaze = P("ell", (0, 43.4 + bob, 25.2), (1.1, .5, 6.2), WHITE, R=rx(math.radians(52)))
    nostril = [P("ell", (s * 1.3, 37.0 + bob, 31.9), (.5, .5, .4), G0) for s in SIDE]
    eyes = [P("ell", (s * 3.4, 43.6 + bob, 23.2), (.7, .9, .7), hexc("#111827"), spec=.8) for s in SIDE]
    ears = [P("cone", (s * 2.2, 45.5 + bob, 20.8), (1.4, .35, 3.6), COAT_D, R=rot(-10, 0, -s * 12)) for s in SIDE]
    o += [neck, head, muzzle, blaze] + nostril + eyes + ears
    # yele
    for i in range(7):
        t = i / 6
        y = 30 + bob + t * 12; z = 13 + t * 9.5
        o.append(P("ell", (0, y + 3.2, z - 1.6), (1.5, 2.6, 2.3), MANE, spec=.3))
    o.append(P("ell", (0, 47.2 + bob, 22.0), (1.9, 1.5, 2.0), MANE, spec=.3))
    # kuyruk (kareye göre sallanır)
    sw = math.sin(ph) * 4 if g else math.sin(0.6) * 1.5
    t1 = (0, 26 + bob, -17.5)
    t2 = (sw * .5, 19 + bob, -23 - (3 if g else 0))
    t3 = (sw, 10 + bob, -24.5 - (4 if g else 0))
    o += [P("cap", (0, 0, 0), (t1, t2, 2.2), MANE, spec=.3), P("cap", (0, 0, 0), (t2, t3, 1.7), MANE, spec=.3), P("ell", t3, (1.3, 2.3, 1.3), MANE)]
    # bacaklar: çapraz yürüyüş
    for sgn_i, s in enumerate(SIDE):
        a_f = math.sin(ph + (0 if s > 0 else math.pi)) * 36 if g else 0
        a_h = math.sin(ph + (math.pi if s > 0 else 0)) * 36 if g else 0
        bf = max(0, -math.sin(ph + (0 if s > 0 else math.pi) + .7)) * 38 if g else 0
        bh = max(0, math.sin(ph + (math.pi if s > 0 else 0) + .7)) * 38 if g else 0
        o += leg((s * 4.3, 17.5 + bob, 10.2), a_f, -bf, True, s)
        o += leg((s * 4.4, 17.5 + bob, -11.2), a_h, bh, False, s)
    # eyer takımı
    red = hexc("#b91c1c")
    o += [P("box", (0, 28.6 + bob, 0.5), (6.9, 1.0, 6.8), hexc("#7f1d1d"), rad=.6),
          P("box", (0, 29.9 + bob, 0.5), (5.4, 1.1, 5.4), red, rad=.9, spec=.3),
          P("ell", (0, 31.4 + bob, 5.2), (2.0, 1.0, 1.6), red), P("ell", (0, 31.8 + bob, -4.6), (3.2, 1.3, 1.6), red)]
    for s in SIDE:
        o.append(P("cap", (0, 0, 0), ((s * 7.4, 27.5 + bob, 0.5), (s * 8.0, 19.5 + bob, 1.0), .45), hexc("#3f2a14")))
        o.append(P("box", (s * 8.2, 18.6 + bob, 1.0), (1.4, .35, 1.0), hexc("#cbd5e1"), spec=.8))
    # dizgin
    o += [P("cap", (0, 0, 0), ((-3.2, 43.2 + bob, 22.0), (3.2, 43.2 + bob, 22.0), .35), hexc("#1f2937")),
          P("torus", (0, 38.0 + bob, 29.7), (3.1, .35), hexc("#1f2937"), R=rx(math.radians(60))),
          P("cap", (0, 0, 0), ((3.1, 38.4 + bob, 29.5), (4.0, 32 + bob, 16), .3), hexc("#1f2937")),
          P("cap", (0, 0, 0), ((-3.1, 38.4 + bob, 29.5), (-4.0, 32 + bob, 16), .3), hexc("#1f2937"))]
    return o

G0 = np.array([0.05, 0.05, 0.05])

def rider_legs(frame):
    trs = hexc("#55678a")
    bob = 0
    o = []
    for s in SIDE:
        thigh = P("cap", (0, 0, 0), ((s * 4.0, 29.5, 0), (s * 9.4, 24.5, 3.8), 3.0), trs)
        shin = P("cap", (0, 0, 0), ((s * 9.4, 24.5, 3.8), (s * 9.2, 15.0, 2.4), 2.6), trs)
        shoe = P("box", (s * 9.2, 13.4, 3.4), (3.0, 1.9, 4.2), G0 + .9, rad=1.6)
        sole = P("box", (s * 9.2, 12.0, 3.5), (3.1, .6, 4.3), G0 + .5, rad=.4)
        o += [thigh, shin, shoe, sole]
    return o

def tile(L):
    rgb, al, dp = L
    return to_image(downsample(outline(rgb, al, dp), al))

def main():
    cams = [Cam(y) for y in DIRS_YAW]
    for name, fn, frames in (("horse", horse, range(7)), ("rider_legs", rider_legs, [0])):
        sheet = Image.new("RGBA", (FW * 8, FH * 4))
        for d in range(4):
            cache = {}
            base0 = None
            for f in range(8):
                key = f if f < 7 else 0
                if name == "rider_legs": key = 0
                if key not in cache:
                    L = render(fn(key), cams[d])
                    if name == "rider_legs":
                        hb = render(horse(0), cams[d])
                        L = composite_visible(L, hb[2])
                    cache[key] = tile(L)
                sheet.paste(cache[key], (f * FW, d * FH))
            print(name, d, flush=True)
        sheet.save(os.path.join(OUT, name + ".png"), optimize=True)

if __name__ == "__main__":
    main()
