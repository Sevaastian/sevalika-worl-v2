"""Karakter parçaları (r3d.py kullanır). Her fonksiyon, pose'a göre primitif listesi döndürür."""
import math
import numpy as np
from r3d import P, rot, rx, hexc

W = (1, 1, 1)
G = lambda v: (v, v, v)
HEAD = (0, 41, 0)

def pose(frame):
    """frame 0 duruş, 1-6 yürüyüş, 7 oturuş -> (kol açısı, bacak açısı, oturuyor)"""
    if frame == 0: return 0.0, 0.0, False
    if frame == 7: return 0.0, 0.0, True
    ph = (frame - 1) / 6 * 2 * math.pi
    return math.sin(ph) * 32, math.sin(ph) * 30, False

def body(frame):
    a, _, sit = pose(frame)
    out = [P("ell", HEAD, (9.4, 9.0, 9.0), W, spec=0.15),
           P("ell", (-9.1, 40.5, 0), (1.5, 2.2, 1.3), W), P("ell", (9.1, 40.5, 0), (1.5, 2.2, 1.3), W),
           P("ell", (0, 38.8, 8.9), (1.3, 1.2, 1.3), W),
           P("cap", (0, 0, 0), ((0, 32, 0), (0, 35.5, 0), 3.0), W),
           P("box", (0, 22, 0), (8.6, 9.8, 5.0), W, rad=3.0)]
    for sgn in (-1, 1):
        sh = (sgn * 10.9, 30.2, 0)
        M = rx(math.radians(-a * sgn)) @ rot(0, 0, -sgn * 5)
        arm = P("cap", sh, ((0, 0, 0), (0, -10, 0), 1.7), W)
        hand = P("ell", (sh[0], sh[1] - 11.3, 0), (2.0, 2.3, 2.0), W)
        out += [arm.moved(sh, M), hand.moved(sh, M)]
    return out

def legs_parts(frame, color, with_hip=True):
    a, la, sit = pose(frame)
    out = []
    if with_hip:
        out.append(P("box", (0, 13.8, 0), (7.1, 2.4, 4.3), color, rad=1.5))
    for sgn in (-1, 1):
        hip = (sgn * 3.7, 14.0, 0)
        if sit:
            th = P("cap", (0, 0, 0), ((sgn * 3.7, 14, 0), (sgn * 3.7, 12.6, 9.5), 2.8), color)
            sn = P("cap", (0, 0, 0), ((sgn * 3.7, 12.6, 9.5), (sgn * 3.7, 3.0, 10.5), 2.55), color)
            out += [th, sn]
        else:
            M = rx(math.radians(la * sgn))
            leg = P("cap", (0, 0, 0), ((sgn * 3.7, 13.6, 0), (sgn * 3.7, 3.2, 0), 2.75), color)
            out.append(leg.moved(hip, M))
    return out

def legs(frame):
    return legs_parts(frame, hexc("#55678a"))

def shoes(frame):
    a, la, sit = pose(frame)
    out = []
    for sgn in (-1, 1):
        if sit:
            c = (sgn * 3.7, 3.0, 11.8)
            shoe = P("box", c, (3.1, 2.0, 4.2), G(0.96), rad=1.7)
            sole = P("box", (c[0], c[1] - 1.9, c[2] + .2), (3.2, .7, 4.3), G(0.55), rad=.5)
            out += [shoe, sole]
        else:
            hip = (sgn * 3.7, 14.0, 0)
            M = rx(math.radians(la * sgn))
            shoe = P("box", (sgn * 3.7, 2.0, 1.2), (3.1, 2.0, 4.3), G(0.96), rad=1.7)
            sole = P("box", (sgn * 3.7, 0.7, 1.3), (3.2, .7, 4.4), G(0.55), rad=.5)
            tip = P("ell", (sgn * 3.7, 2.3, 4.8), (2.0, 1.3, 1.0), hexc("#38bdf8"))
            out += [shoe.moved(hip, M), sole.moved(hip, M), tip.moved(hip, M)]
    return out

def sleeves(frame, length, r, color, long_dark=None):
    a, _, sit = pose(frame)
    out = []
    for sgn in (-1, 1):
        sh = (sgn * 10.9, 30.2, 0)
        M = rx(math.radians(-a * sgn)) @ rot(0, 0, -sgn * 5)
        s = P("cap", sh, ((0, 0.5, 0), (0, -length, 0), r), color)
        out.append(s.moved(sh, M))
    return out

def shirt(frame):
    out = [P("box", (0, 22, 0), (9.3, 9.9, 5.7), W, rad=3.3),
           P("box", (0, 13.0, 0), (9.45, 1.1, 5.85), G(0.8), rad=.9),
           P("torus", (0, 32.6, 0), (3.5, 1.0), G(0.85))]
    out += sleeves(frame, 5.5, 2.55, W)
    return out

def top(name, frame):
    out = []
    if name == "tp_hoodie":
        c = hexc("#51617a")
        out = [P("box", (0, 22, 0), (9.4, 10.0, 5.8), c, rad=3.3),
               P("box", (0, 13.0, 0), (9.5, 1.3, 5.9), hexc("#3a475c"), rad=1),
               P("ell", (0, 32.5, -3.8), (7.2, 4.4, 4.2), hexc("#64748b")),
               P("torus", (0, 33.2, 1.6), (4.6, 1.0), hexc("#64748b"), R=rot(30, 0, 0)),
               P("box", (0, 16.5, 5.9), (5.4, 2.8, .7), hexc("#3a475c"), rad=.8),
               P("cap", (0, 0, 0), ((-2.4, 31, 6), (-2.6, 24, 6.4), .45), G(.95)),
               P("cap", (0, 0, 0), ((2.4, 31, 6), (2.6, 24, 6.4), .45), G(.95))]
        out += sleeves(frame, 9.5, 2.65, c)
    elif name == "tp_stripe":
        c = hexc("#f8fafc"); c2 = hexc("#2563eb")
        out = [P("box", (0, 22, 0), (9.4, 9.9, 5.8), c, rad=3.3, stripe=(1, 3.2, c2)),
               P("torus", (0, 32.6, 0), (3.5, 1.0), c2)]
        for s in sleeves(frame, 5.8, 2.6, c):
            s.stripe = (1, 3.2, c2); out.append(s)
    elif name == "tp_suit":
        c = hexc("#1f2937")
        out = [P("box", (0, 22, 0), (9.5, 10.0, 5.9), c, rad=3.0),
               P("box", (0, 26.5, 5.6), (3.4, 5.2, .7), G(.97), rad=.4, cut=((0, 1, 0), -3)),
               P("box", (0, 23.5, 6.2), (1.0, 5.5, .35), hexc("#dc2626"), rad=.3),
               P("ell", (0, 29.6, 6.0), (1.4, 1.0, .5), hexc("#b91c1c")),
               P("box", (-3.3, 25.5, 6.0), (1.1, 5.8, .5), hexc("#0f172a"), R=rot(0, 0, 14), rad=.3),
               P("box", (3.3, 25.5, 6.0), (1.1, 5.8, .5), hexc("#0f172a"), R=rot(0, 0, -14), rad=.3),
               P("cap", (0, 0, 0), ((-2.3, 29, 6.2), (-2.3, 29, 6.3), .8), G(.2))]
        out += sleeves(frame, 10.5, 2.6, c)
    elif name == "tp_jersey":
        c = hexc("#16a34a")
        out = [P("box", (0, 22, 0), (9.4, 9.9, 5.8), c, rad=3.3),
               P("box", (-9.1, 22, 0), (.9, 9.7, 5.5), hexc("#facc15"), rad=.4),
               P("box", (9.1, 22, 0), (.9, 9.7, 5.5), hexc("#facc15"), rad=.4),
               P("ell", (0, 24, 5.7), (3.1, 3.1, .6), G(.98)),
               P("ell", (0, 24, -5.7), (3.1, 3.1, .6), G(.98)),
               P("box", (0, 24, 6.2), (.8, 2.3, .2), c), P("torus", (0, 32.6, 0), (3.5, 1.0), hexc("#facc15"))]
        out += sleeves(frame, 6.5, 2.7, c)
    elif name == "tp_overalls":
        c = hexc("#2563eb")
        out = [P("box", (0, 17.5, 0), (9.5, 5.2, 5.9), c, rad=2.0),
               P("box", (0, 22.6, 5.6), (4.8, 3.2, .8), hexc("#1d4ed8"), rad=.7),
               P("box", (-5.3, 27.5, 5.3), (1.2, 5.3, .7), c, rad=.5), P("box", (5.3, 27.5, 5.3), (1.2, 5.3, .7), c, rad=.5),
               P("box", (-5.3, 27.0, -5.3), (1.2, 5.6, .7), c, rad=.5), P("box", (5.3, 27.0, -5.3), (1.2, 5.6, .7), c, rad=.5),
               P("ell", (-5.4, 22.5, 6.2), (1.0, 1.0, .5), hexc("#facc15")), P("ell", (5.4, 22.5, 6.2), (1.0, 1.0, .5), hexc("#facc15"))]
    elif name == "tp_hawaii":
        c = hexc("#0ea5e9")
        out = [P("box", (0, 22, 0), (9.4, 9.9, 5.8), c, rad=3.3),
               P("torus", (0, 32.6, 0), (3.8, 1.1), hexc("#bae6fd"))]
        for x, y, z in [(-5, 27, 5.8), (2, 25, 5.9), (5.5, 19, 5.6), (-3, 18, 5.9), (0, 21.5, 5.9), (6, 28, 4.8),
                        (-6.5, 22, 5.0), (-4, 26, -5.9), (3, 22, -5.9), (-2, 17, -5.9), (6, 27, -5.0)]:
            out.append(P("ell", (x, y, z), (1.5, 1.5, .5), hexc("#fde047" if (x + y) % 2 else "#fb7185")))
        out += sleeves(frame, 6.2, 2.75, c)
    return out

def face(frame):
    out = []
    for sgn in (-1, 1):
        x = sgn * 3.5
        z = 9.0 * math.sqrt(max(0, 1 - (x / 9.4) ** 2 - (0.9 / 9.0) ** 2)) - 0.3
        out.append(P("ell", (x, 41.9, z), (1.35, 1.9, 1.0), hexc("#111827"), R=rot(0, sgn * 22, 0), spec=.6))
        out.append(P("ell", (x - sgn * -0.3 + 0.2, 42.7, z + 0.55), (.5, .6, .4), G(1), emissive=True, R=rot(0, sgn * 22, 0)))
        zb = 9.0 * math.sqrt(max(0, 1 - (x / 9.4) ** 2 - (4.8 / 9.0) ** 2)) - 0.1
        out.append(P("ell", (x * 1.05, 46.2, zb), (2.0, .45, .5), hexc("#374151"), R=rot(0, sgn * 24, -sgn * 6)))
        zc = 9.0 * math.sqrt(max(0, 1 - ((x * 1.5) / 9.4) ** 2 - (-2.2 / 9.0) ** 2)) - 0.2
        out.append(P("ell", (x * 1.5, 38.7, zc), (1.5, .8, .5), hexc("#fda4af"), R=rot(0, sgn * 40, 0)))
    zm = 9.0 * math.sqrt(max(0, 1 - (-4.6 / 9.0) ** 2)) - 0.2
    out.append(P("ell", (0, 36.4, zm), (1.5, .5, .55), hexc("#9f1239")))
    return out

HAIRCAP = lambda s=1.08, c=HEAD, cut=((0, 1, -0.6), 0): P("ell", c, (9.4 * s, 9.0 * s, 9.0 * s), W, cut=cut, spec=.35)

def hair(style):
    cap = HAIRCAP()
    fringe = P("ell", (0, 46.5, 6.2), (8.2, 3.2, 3.6), W, R=rot(-20, 0, 0), spec=.35)
    side = [P("ell", (sgn * 8.9, 42.5, 2.0), (1.4, 4, 4.5), W, spec=.3) for sgn in (-1, 1)]
    out = [cap]
    if style == "hs_short":
        out += [fringe] + side
    elif style == "hs_long":
        out += [fringe, P("box", (0, 33, -6.4), (9.4, 11.5, 2.6), W, rad=2.2, spec=.3)]
        out += [P("cap", (0, 0, 0), ((sgn * 9.3, 41, 1), (sgn * 9.6, 29, -1), 2.2), W, spec=.3) for sgn in (-1, 1)]
    elif style == "hs_spiky":
        out += side
        for i, (x, z, a, b) in enumerate([(0, 0, 0, 0), (5, 3, 0, -30), (-5, 3, 0, 30), (5.5, -3, 20, -30), (-5.5, -3, -20, 30), (0, -6, 30, 0), (0, 6, -30, 0)]):
            out.append(P("cone", (x, 47.5 if abs(x) < 3 else 46, z), (2.8, .3, 8.0 - abs(x) * .3), W, R=rot(a, 0, b), spec=.3))
    elif style == "hs_bun":
        out += [fringe, P("ell", (0, 53.5, -2.5), (4.6, 4.2, 4.6), W, spec=.35)] + side
    elif style == "hs_afro":
        out = [P("ell", (0, 45, -1.5), (13.5, 13, 13), W, cut=((0, .25, -1), -3.2), spec=.15)]
    elif style == "hs_mohawk":
        out = [P("cap", (0, 0, 0), ((0, 51, 7), (0, 51.5, -8), 2.2), W)]
        for z in range(-8, 8, 3):
            out.append(P("ell", (0, 51 + max(0, 4 - abs(z) * .5), z), (1.6, 4.6 - abs(z) * .15, 2.4), W, spec=.3))
        out.append(P("ell", HEAD, (9.6, 9.2, 9.2), W, cut=((0, 1, -0.6), 5.5)))
    elif style == "hs_pony":
        out += [fringe, P("cap", (0, 0, 0), ((7, 45, -5), (11, 38, -8), 2.6), W, spec=.3), P("ell", (6.4, 45.6, -4.4), (1.3, 1.3, 1.3), hexc("#ef4444")), P("cap", (0, 0, 0), ((11, 38, -8), (10, 32, -9), 1.8), W)] + side
    elif style == "hs_curly":
        out += [fringe]
        rng = np.random.RandomState(4)
        for x, y, z in [(-8, 44, 3), (8, 44, 3), (-6, 49, 4), (6, 49, 4), (0, 51, 2), (-9, 40, -1), (9, 40, -1), (-5, 50, -4), (5, 50, -4), (0, 50, -7), (-8, 44, -5), (8, 44, -5), (-3, 52, 0), (3, 52, 0)]:
            out.append(P("ell", (x, y, z), (3.5, 3.4, 3.5), W, spec=.3))
    return out

def hat(name):
    h = HEAD
    o = []
    if name == "hat_beanie":
        red = hexc("#e11d48")
        o = [P("ell", (0, 44.5, 0), (10.2, 8.4, 10.2), red, cut=((0, 1, -.05), -1.2)),
             P("cyl", (0, 45.4, 0), (10.35, 1.9), hexc("#be123c"), rad=.8),
             P("ell", (0, 54.2, 0), (2.8, 2.8, 2.8), G(.97), spec=.1)]
    elif name == "hat_cap":
        blue = hexc("#2563eb")
        o = [P("ell", (0, 44.5, 0), (9.9, 7.8, 9.9), blue, cut=((0, 1, -.1), -.5), spec=.2),
             P("ell", (0, 45.3, 9.2), (6.4, .9, 5.4), hexc("#1d4ed8"), R=rot(14, 0, 0), spec=.3),
             P("ell", (0, 51.6, 0), (1.1, .8, 1.1), hexc("#1e3a8a")),
             P("cyl", (0, 45.4, 0), (10.0, .55), G(.95), rad=.2)]
    elif name == "hat_tophat":
        o = [P("cyl", (0, 57.5, 0), (7.0, 7.2), hexc("#111827"), rad=.9, spec=.3),
             P("cyl", (0, 50.4, 0), (11.4, .8), hexc("#111827"), rad=.4, spec=.3),
             P("cyl", (0, 52.2, 0), (7.1, 1.1), hexc("#dc2626"), rad=.3)]
    elif name == "hat_cowboy":
        br = hexc("#a16207")
        o = [P("ell", (0, 49.2, 0), (14.5, 1.6, 13.0), br, spec=.15),
             P("ell", (-12.5, 50.6, 0), (3.2, 1.4, 11), br), P("ell", (12.5, 50.6, 0), (3.2, 1.4, 11), br),
             P("ell", (0, 53.0, 0), (8.0, 5.2, 8.0), hexc("#b4730a"), cut=((0, 1, 0), -2.4)),
             P("cyl", (0, 51.0, 0), (8.0, .9), hexc("#451a03"), rad=.3)]
    elif name == "hat_crown":
        g = hexc("#facc15")
        o = [P("cyl", (0, 51.5, 0), (7.6, 2.4), g, rad=.5, spec=.7)]
        for i in range(5):
            a = i / 5 * 2 * math.pi
            x, z = math.sin(a) * 7.0, math.cos(a) * 7.0
            o.append(P("cone", (x, 52.5, z), (1.7, .5, 5.2), g, spec=.7))
            o.append(P("ell", (x, 58.2, z), (1.0, 1.0, 1.0), hexc("#ef4444" if i % 2 else "#38bdf8"), spec=.9))
        o.append(P("ell", (0, 51.5, 7.7), (1.3, 1.3, .7), hexc("#ef4444"), spec=.9))
    elif name == "hat_headphones":
        o = [P("torus", (0, 41.5, 0), (10.4, .95), hexc("#1f2937"), R=rot(90, 0, 0), cut=((0, 0, 1), 0)),
             P("torus", (0, 41.5, 0), (10.4, .95), hexc("#1f2937"), R=rot(90, 0, 0), cut=((0, 0, -1), 0))]
        o = [P("torus", (0, 41.0, 0), (10.6, .95), hexc("#1f2937"), R=rot(0, 0, 0) @ rot(90, 0, 0) @ rot(0, 90, 0), cut=((0, 1, 0), 0))]
        for sgn in (-1, 1):
            o += [P("cyl", (sgn * 10.6, 41, 0), (3.8, 1.9), hexc("#334155"), R=rot(0, 0, 90), rad=1.2, spec=.3),
                  P("cyl", (sgn * 11.9, 41, 0), (2.6, .7), hexc("#ef4444"), R=rot(0, 0, 90), rad=.4, spec=.4)]
    elif name == "hat_beret":
        o = [P("ell", (1.5, 49.6, 0), (10.8, 3.4, 10.4), hexc("#7f1d1d"), R=rot(0, 0, -9), spec=.1),
             P("cap", (0, 0, 0), ((1.0, 52.4, 0), (1.0, 54.3, 0), .8), hexc("#450a0a"))]
    elif name == "hat_bucket":
        k = hexc("#d6c9a1")
        o = [P("cone", (0, 48.2, 0), (9.2, 7.3, 6.6), k, spec=.05),
             P("cyl", (0, 48.4, 0), (13.2, .75), k, rad=.4),
             P("cyl", (0, 50.4, 0), (8.6, .8), hexc("#475569"), rad=.3)]
    elif name == "hat_wizard":
        v = hexc("#6d28d9")
        o = [P("cone", (0, 49.5, 0), (7.4, .5, 24), v, R=rot(0, 0, 0) @ rot(0, 0, 0)),
             P("ell", (0, 49.4, 0), (13.5, 1.2, 13.5), hexc("#5b21b6")),
             P("cyl", (0, 52.5, 0), (7.4, 1.1), hexc("#facc15"), rad=.3, spec=.5)]
        for x, y, z in [(3, 58, 6.3), (-3.5, 63, 4.6), (2, 67, 2.3), (-2, 56, 6.9)]:
            o.append(P("ell", (x, y, z), (1.0, 1.0, .5), hexc("#fde047"), emissive=True))
    elif name == "hat_pirate":
        k = hexc("#111827")
        o = [P("ell", (0, 51.0, 0), (11.6, 4.8, 9.6), k, cut=((0, 1, 0), -1.0)),
             P("ell", (0, 49.0, 0), (13.5, 1.6, 11.0), k),
             P("ell", (-12.8, 51.2, 0), (2.6, 2.6, 9.6), k), P("ell", (12.8, 51.2, 0), (2.6, 2.6, 9.6), k),
             P("cyl", (0, 49.8, 0), (10.0, .55), hexc("#facc15"), rad=.2, spec=.5),
             P("ell", (0, 51.8, 9.6), (2.0, 2.0, .8), G(.97)),
             P("ell", (-.8, 52.2, 10.2), (.5, .5, .3), G(.05)), P("ell", (.8, 52.2, 10.2), (.5, .5, .3), G(.05)),
             P("ell", (0, 50.4, 9.9), (1.2, .45, .4), G(.97))]
    elif name == "hat_flower":
        o = [P("torus", (0, 47.5, 0), (9.6, .9), hexc("#16a34a"), R=rot(-6, 0, 0))]
        cols = ["#f472b6", "#fde047", "#ffffff", "#fb7185", "#c084fc", "#fde047", "#f472b6", "#ffffff"]
        for i in range(8):
            a = i / 8 * 2 * math.pi
            x, z = math.sin(a) * 9.8, math.cos(a) * 9.8
            o.append(P("ell", (x, 47.8 + z * -.1, z), (2.0, 1.8, 2.0), hexc(cols[i]), spec=.2))
            o.append(P("ell", (x * 1.01, 47.9 + z * -.1, z * 1.01), (.9, .9, .9), hexc("#f59e0b")))
    elif name == "hat_catears":
        o = [P("torus", (0, 41.0, 0), (9.7, .8), hexc("#111827"), R=rot(90, 0, 0) @ rot(0, 90, 0), cut=((0, 1, 0), 3.5))]
        o = [P("torus", (0, 41.0, 0), (9.7, .8), hexc("#111827"), R=rot(0, 0, 0) @ rot(90, 0, 0) @ rot(0, 90, 0), cut=((0, 1, 0), 2.0))]
        for sgn in (-1, 1):
            o.append(P("cone", (sgn * 6.2, 48.6, -.5), (3.6, .4, 7.2), hexc("#111827"), R=rot(0, 0, -sgn * 20)))
            o.append(P("cone", (sgn * 6.1, 48.9, .9), (2.3, .3, 5.2), hexc("#f9a8d4"), R=rot(0, 0, -sgn * 20)))
    return o

def glasses(name):
    o = []
    def ring(x, z, R, r, col, y=42.0, spec=.4):
        return P("torus", (x, y, z), (R, r), col, R=rot(90, 0, 0) @ rot(0, 0, 0), spec=spec)
    zf = lambda x, y: 9.0 * math.sqrt(max(0, 1 - (x / 9.4) ** 2 - ((y - 41) / 9.0) ** 2))
    def temples(col, r=.45):
        return [P("cap", (0, 0, 0), ((sgn * 8.4, 42, zf(8.4, 42) - .5), (sgn * 9.5, 41.8, 1.5), r), col) for sgn in (-1, 1)]
    if name == "gl_nerd":
        k = hexc("#111827")
        for sgn in (-1, 1):
            o.append(ring(sgn * 3.7, zf(3.7, 42) + .8, 2.9, .6, k))
            o.append(P("ell", (sgn * 3.7, 42, zf(3.7, 42) + .5), (2.9, 2.9, .15), G(.95), emissive=False))
        o.append(P("cap", (0, 0, 0), ((-1, 42.4, zf(0, 42.4) + 1.2), (1, 42.4, zf(0, 42.4) + 1.2), .45), k))
        o += temples(k)
    elif name == "gl_round":
        k = hexc("#d4a017")
        for sgn in (-1, 1):
            o.append(ring(sgn * 3.8, zf(3.8, 42) + .7, 3.0, .3, k, spec=.8))
        o.append(P("cap", (0, 0, 0), ((-1, 42.6, zf(0, 42.6) + 1.2), (1, 42.6, zf(0, 42.6) + 1.2), .3), k))
        o += temples(k, .3)
    elif name == "gl_shades":
        k = hexc("#0b0f19")
        for sgn in (-1, 1):
            o.append(P("ell", (sgn * 3.9, 42.0, zf(3.9, 42) + .7), (3.5, 2.6, .8), k, spec=.9, R=rot(0, sgn * 20, 0)))
        o.append(P("cap", (0, 0, 0), ((-1.2, 42.9, zf(0, 42.9) + 1.0), (1.2, 42.9, zf(0, 42.9) + 1.0), .5), k))
        o += temples(k, .55)
    elif name == "gl_neon":
        for i, x in enumerate((-6.5, -3.2, 0, 3.2, 6.5)):
            pass
        pts = [(-8.2, 4.6), (-4.1, 7.6), (0, 8.3), (4.1, 7.6), (8.2, 4.6)]
        pts = [(x, zf(x, 42.2) + .6) for x in (-8.0, -5.0, -2.5, 0, 2.5, 5.0, 8.0)]
        for (x1, z1), (x2, z2) in zip(pts[:-1], pts[1:]):
            o.append(P("cap", (0, 0, 0), ((x1, 42.2, z1), (x2, 42.2, z2), 2.0), hexc("#22d3ee"), emissive=True))
        for (x1, z1), (x2, z2) in zip(pts[:-1], pts[1:]):
            o.append(P("cap", (0, 0, 0), ((x1, 42.9, z1 + .1), (x2, 42.9, z2 + .1), .55), hexc("#e879f9"), emissive=True))
        o += temples(hexc("#e879f9"), .5)
    elif name == "gl_star":
        y = hexc("#facc15")
        for sgn in (-1, 1):
            c = (sgn * 3.9, 42, zf(3.9, 42) + .7)
            for i in range(5):
                o.append(P("ell", c, (1.0, 3.5, .7), y, R=rot(0, sgn * 20, 0) @ rot(0, 0, i * 36), spec=.7))
            o.append(P("ell", c, (1.5, 1.5, .8), hexc("#fde68a"), R=rot(0, sgn * 20, 0)))
        o.append(P("cap", (0, 0, 0), ((-1.2, 42.6, zf(0, 42.6) + 1.0), (1.2, 42.6, zf(0, 42.6) + 1.0), .45), y))
        o += temples(y, .45)
    elif name == "gl_heart":
        pk = hexc("#ec4899")
        for sgn in (-1, 1):
            c = (sgn * 3.9, 42.2, zf(3.9, 42) + .7)
            R_ = rot(0, sgn * 20, 0)
            o.append(P("ell", (c[0] - 1.2, c[1] + 1.0, c[2]), (1.9, 1.9, .8), pk, R=R_, spec=.6))
            o.append(P("ell", (c[0] + 1.2, c[1] + 1.0, c[2]), (1.9, 1.9, .8), pk, R=R_, spec=.6))
            o.append(P("box", (c[0], c[1] - .6, c[2]), (1.9, 1.9, .7), pk, R=R_ @ rot(0, 0, 45), rad=.3, spec=.6))
        o.append(P("cap", (0, 0, 0), ((-1.2, 42.6, zf(0, 42.6) + 1.0), (1.2, 42.6, zf(0, 42.6) + 1.0), .4), pk))
        o += temples(pk, .4)
    elif name == "gl_visor":
        o = [P("ell", (0, 42.2, 0.3), (9.9, 2.9, 9.5), hexc("#0891b2"), emissive=True, cut=((0, 0, 1), 2.0)),
             P("ell", (0, 43.9, 0.3), (9.95, .55, 9.55), hexc("#0e7490"), cut=((0, 0, 1), 2.0), spec=.5),
             P("ell", (0, 40.5, 0.3), (9.95, .55, 9.55), hexc("#0e7490"), cut=((0, 0, 1), 2.0), spec=.5)]
    return o

def back(name):
    o = []
    if name == "bk_backpack":
        r = hexc("#ea580c")
        o = [P("box", (0, 23.5, -8.4), (6.4, 8.4, 3.2), r, rad=2.2, spec=.15),
             P("box", (0, 20.0, -11.9), (4.6, 3.2, .9), hexc("#c2410c"), rad=.8),
             P("box", (0, 31.5, -8.4), (3.0, .9, 1.6), hexc("#9a3412"), rad=.5)]
        for sgn in (-1, 1):
            o.append(P("box", (sgn * 5.6, 26.5, 5.9), (1.0, 6.2, .5), hexc("#7c2d12"), rad=.3))
            o.append(P("box", (sgn * 5.6, 31.4, 0), (1.0, .5, 6.0), hexc("#7c2d12"), rad=.3))
    elif name == "bk_cape":
        r = hexc("#dc2626")
        o = [P("box", (0, 21.5, -6.9), (10.4, 14.2, .8), r, rad=.7, R=rot(7, 0, 0), spec=.2),
             P("box", (0, 21.5, -7.6), (10.5, 14.4, .4), hexc("#b91c1c"), rad=.3, R=rot(7, 0, 0)),
             P("ell", (-4.4, 30.8, 5.0), (1.2, 1.2, .8), hexc("#facc15"), spec=.8), P("ell", (4.4, 30.8, 5.0), (1.2, 1.2, .8), hexc("#facc15"), spec=.8),
             P("torus", (0, 32.5, -.3), (4.6, 1.1), hexc("#b91c1c"))]
        o.append(P("cap", (0, 0, 0), ((-4.4, 30.8, 4.8), (4.4, 30.8, 4.8), .4), hexc("#facc15")))
    elif name == "bk_angel":
        for sgn in (-1, 1):
            My = rot(0, -sgn * 20, 0)
            root = np.array((sgn * 5.0, 29.0, -8.8))
            for L, w, a in [(21, 5.2, 64), (21, 5.2, 48), (19, 5.0, 32), (16.5, 4.6, 16), (13, 4.2, 0)]:
                loc = np.array((sgn * math.cos(math.radians(a)), math.sin(math.radians(a)), 0)) * (L / 2)
                q = P("ell", tuple(root + My @ loc), (L / 2, w / 2, .9), hexc("#fffbeb"), spec=.2)
                q.R = My @ rot(0, 0, sgn * a)
                o.append(q)
            tip = P("ell", tuple(root + My @ np.array((sgn * 2.0, 3.0, 0))), (3.5, 3.2, 1.0), hexc("#fde68a"))
            o.append(tip)
    elif name == "bk_butterfly":
        for sgn in (-1, 1):
            My = rot(0, -sgn * 24, 0)
            root = np.array((sgn * 5.0, 28.0, -8.8))
            for L, w, a, col in [(24, 16, 34, "#fb923c"), (17, 12, -22, "#f472b6")]:
                loc = np.array((sgn * math.cos(math.radians(a)), math.sin(math.radians(a)), 0)) * (L / 2)
                q = P("ell", tuple(root + My @ loc), (L / 2, w / 2, .9), hexc(col), spec=.2)
                q.R = My @ rot(0, 0, sgn * a)
                o.append(q)
                dot = P("ell", tuple(root + My @ (loc * 1.25 + np.array((0, 0, -.6)))), (2.3, 2.3, .5), hexc("#fef3c7"))
                dot.R = q.R
                o.append(dot)
    elif name == "bk_devil":
        d = hexc("#7f1d1d"); m = hexc("#dc2626")
        for sgn in (-1, 1):
            M = rot(0, -sgn * 25, 0)
            tips = [(sgn * 14, 41, -6.5), (sgn * 20, 33, -7), (sgn * 18, 22, -7)]
            root = (sgn * 3.5, 30, -6.0)
            for t in tips:
                o.append(P("cap", (0, 0, 0), (root, t, .8), d))
            for t1, t2 in zip(tips[:-1], tips[1:]):
                c = (np.array(root) + np.array(t1) + np.array(t2)) / 3
                tri = P("ell", tuple(c), (6.5, 4.2, .35), m, R=rot(0, 0, sgn * -25), spec=.2)
                o.append(tri)
            o.append(P("cone", (sgn * 14, 41, -6.5), (.9, .2, 3.0), d, R=rot(0, 0, -sgn * 8)))
    return o
