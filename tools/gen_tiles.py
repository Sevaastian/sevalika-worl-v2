#!/usr/bin/env python3
"""Zemin karoları ve duvar dokularını PNG olarak üretir (public/sprites/tiles).
Zemin: floor_<tür>.png = 4 varyant yan yana, her biri 256x128 eşkenar dörtgen (2:1), gri tonlu (oyun renk çarpar), dikişsiz.
Duvar: wall_<tür>.png = 180x440 düz doku (bir kare uzunluğu x duvar yüksekliği), gri tonlu, yatayda dikişsiz.
Kullanım: python3 gen_tiles.py [zemin|duvar|hepsi]"""
import os, sys, math
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

OUT = os.path.join(os.path.dirname(__file__), "..", "public", "sprites", "tiles")
os.makedirs(OUT, exist_ok=True)
N = 256
TW, TH, VAR = 256, 128, 4


def pnoise(n, beta, seed, m=None):
    rng = np.random.RandomState(seed)
    m = m or n
    fy = np.fft.fftfreq(n)[:, None]
    fx = np.fft.fftfreq(m)[None, :]
    f = np.sqrt(fx ** 2 + fy ** 2)
    f[0, 0] = 1
    amp = 1 / f ** beta
    amp[0, 0] = 0
    ph = rng.uniform(0, 2 * np.pi, (n, m))
    a = np.real(np.fft.ifft2(amp * np.exp(1j * ph)))
    a = (a - a.min()) / (a.max() - a.min() + 1e-9)
    return a


def grid(n=N):
    v, u = np.mgrid[0:n, 0:n] / n  # satır = v, sütun = u
    return u, v


def dwrap(a, b):
    d = np.abs(a - b)
    return np.minimum(d, 1 - d)


# ---------------------------- zemin dokuları (u,v periyodik) ----------------------------
def t_wood(seed):
    rng = np.random.RandomState(seed)
    u, v = grid()
    pl = 4
    pid = np.floor(v * pl).astype(int)
    f = (v * pl) % 1
    off = rng.uniform(-0.07, 0.07, pl)[pid]
    warp = pnoise(N, 2.2, seed) * 0.25
    grain = np.sin(2 * np.pi * (v * 26 + warp * 5 + pid * .37))
    fine = pnoise(N, 1.0, seed + 1)
    T = 0.80 + off + 0.05 * grain + 0.07 * (fine - .5)
    for p in range(pl):  # tahta uç derzi
        j = rng.uniform(0, 1)
        m = (pid == p) & (dwrap(u, j) < 0.010)
        T = np.where(m, 0.45, T)
        m2 = (pid == p) & (dwrap(u, j + 0.012) < 0.008)
        T = np.where(m2, T + 0.08, T)
    T = np.where(f < 0.05, 0.42, T)
    T = np.where((f >= 0.05) & (f < 0.10), T + 0.07, T)
    for _ in range(2):  # düğüm
        cu, cv = rng.uniform(0, 1), rng.uniform(.1, .9)
        d = np.sqrt((dwrap(u, cu) * 2.2) ** 2 + dwrap(v, cv) ** 2) * 18
        T -= 0.16 * np.exp(-d ** 2) + 0.05 * (np.sin(d * 5) > .7) * (d < 2.2)
    return T


def t_sand(seed):
    rng = np.random.RandomState(seed)
    u, v = grid()
    lo = pnoise(N, 2.3, seed)
    hi = pnoise(N, 0.6, seed + 3)
    rip = np.sin(2 * np.pi * (u * 2 + v * 3 + lo * 2.5))
    T = 0.90 + 0.05 * (lo - .5) + 0.05 * (hi - .5) + 0.025 * rip
    sp = rng.rand(N, N)
    T = np.where(sp > .992, T - 0.14, T)
    T = np.where(sp < .004, T + 0.06, T)
    return T


def blades(T, rng, count, dark, light, ln=(5, 11)):
    im = Image.fromarray((T * 255).astype(np.uint8), "L")
    d = ImageDraw.Draw(im)
    for _ in range(count):
        x, y = rng.uniform(0, N), rng.uniform(0, N)
        a = rng.uniform(-0.5, 0.5) - math.pi / 2
        L = rng.uniform(*ln)
        val = int(255 * (dark if rng.rand() < .5 else light) + rng.uniform(-10, 10))
        for dx in (-N, 0, N):
            for dy in (-N, 0, N):
                d.line([(x + dx, y + dy), (x + dx + math.cos(a) * L, y + dy + math.sin(a) * L)], fill=max(0, min(255, val)), width=2 if rng.rand() < .3 else 1)
    return np.asarray(im).astype(float) / 255


def t_grass(seed):
    rng = np.random.RandomState(seed)
    lo = pnoise(N, 2.0, seed)
    T = 0.82 + 0.10 * (lo - .5) + 0.04 * (pnoise(N, 0.8, seed + 1) - .5)
    T = blades(T, rng, 900, 0.62, 0.99)
    T = blades(T, rng, 500, 0.74, 1.0, (3, 7))
    return T


def t_brick(seed):
    rng = np.random.RandomState(seed)
    u, v = grid()
    rows, cols = 3, 2
    rid = np.floor(v * rows).astype(int)
    uu = (u * cols + (rid % 2) * 0.5) % cols
    cid = np.floor(uu).astype(int)
    fu = uu % 1
    fv = (v * rows) % 1
    base = rng.uniform(0.80, 0.98, (rows, cols))[rid, cid]
    n1 = pnoise(N, 1.4, seed)
    T = base + 0.08 * (n1 - .5) + 0.06 * (pnoise(N, .5, seed + 2) - .5)
    ed = np.minimum(np.minimum(fu, 1 - fu) * 0.5, np.minimum(fv, 1 - fv) * (rows / 2.0 / 1.0) * 0.5)
    ed = np.minimum(np.minimum(fu, 1 - fu) / (1.0), np.minimum(fv, 1 - fv))
    T = np.where(ed < 0.045, 0.50, T)
    T = np.where((ed >= 0.045) & (ed < 0.11) & ((fu < .5) | (fv < .5)), T + 0.06, T)
    T = np.where((ed >= 0.045) & (ed < 0.11) & ((fu >= .5) & (fv >= .5)), T - 0.07, T)
    return T


def t_asphalt(seed):
    rng = np.random.RandomState(seed)
    lo = pnoise(N, 2.0, seed)
    T = 0.80 + 0.06 * (lo - .5) + 0.10 * (pnoise(N, 0.3, seed + 1) - .5)
    sp = rng.rand(N, N)
    T = np.where(sp > .985, T + 0.10, T)
    T = np.where(sp < .01, T - 0.10, T)
    if seed % 2 == 0:
        im = Image.fromarray((T * 255).astype(np.uint8), "L"); d = ImageDraw.Draw(im)
        x, y = rng.uniform(40, 200), rng.uniform(40, 200)
        pts = [(x, y)]
        for _ in range(7):
            x += rng.uniform(-14, 18); y += rng.uniform(-8, 14); pts.append((x, y))
        d.line(pts, fill=int(0.35 * 255), width=2)
        T = np.asarray(im).astype(float) / 255
    return T


def t_soil(seed):
    rng = np.random.RandomState(seed)
    u, v = grid()
    warp = pnoise(N, 2.4, seed)
    fur = np.sin(2 * np.pi * (v * 5 + warp * 0.6))
    T = 0.78 + 0.13 * fur + 0.10 * (pnoise(N, 1.0, seed + 1) - .5)
    cl = pnoise(N, 0.2, seed + 2)
    T = np.where(cl > .86, T + 0.09, T)
    T = np.where(cl < .08, T - 0.1, T)
    return T


def voronoi(seed, k=7):
    rng = np.random.RandomState(seed)
    pts = rng.uniform(0, 1, (k, 2))
    u, v = grid()
    best1 = np.full((N, N), 9.0); best2 = np.full((N, N), 9.0); idx = np.zeros((N, N), int)
    for i, (pu, pv) in enumerate(pts):
        d = np.sqrt(dwrap(u, pu) ** 2 + dwrap(v, pv) ** 2)
        m = d < best1
        best2 = np.where(m, best1, np.minimum(best2, d))
        idx = np.where(m, i, idx)
        best1 = np.where(m, d, best1)
    return idx, best2 - best1


def t_stone(seed):
    rng = np.random.RandomState(seed)
    idx, gap = voronoi(seed, 8)
    base = rng.uniform(0.72, 0.95, 8)[idx]
    T = base + 0.08 * (pnoise(N, 1.5, seed) - .5) + 0.05 * (pnoise(N, .5, seed + 1) - .5)
    T = np.where(gap < 0.025, 0.40, T)
    T = np.where((gap >= 0.025) & (gap < 0.06), T + 0.06 * (1 - (gap - .025) / .035), T)
    return T


def t_marble(seed):
    rng = np.random.RandomState(seed)
    u, v = grid()
    lo = pnoise(N, 2.4, seed)
    T = 0.93 + 0.05 * (lo - .5) + 0.03 * (pnoise(N, .8, seed + 1) - .5)
    w = pnoise(N, 2.6, seed + 4)
    vein = np.abs(np.sin(2 * np.pi * (u * 1 + v * 2 + w * 1.6)))
    T = np.where(vein < 0.05, T - 0.14 * (1 - vein / .05), T)
    vein2 = np.abs(np.sin(2 * np.pi * (u * 2 - v * 1 + w * 1.2 + .3)))
    T = np.where(vein2 < 0.025, T - 0.07, T)
    return T


def t_carpet(seed):
    u, v = grid()
    ck = (np.floor(u * 64) + np.floor(v * 64)) % 2
    T = 0.86 + 0.05 * ck + 0.04 * (pnoise(N, .4, seed) - .5) + 0.02 * np.sin(2 * np.pi * (u * 64 + v * 64))
    return T


def t_plain(seed):
    T = 0.94 + 0.04 * (pnoise(N, 2.0, seed) - .5) + 0.02 * (pnoise(N, .6, seed + 1) - .5)
    return T


KINDS = {"wood": t_wood, "sand": t_sand, "grass": t_grass, "brick": t_brick, "asphalt": t_asphalt, "soil": t_soil,
         "stone": t_stone, "marble": t_marble, "carpet": t_carpet, "plain": t_plain}
# yalnızca kenarında bevel/koyu çizgi olan (karo olarak okunan) türler
EDGED = {"marble": .10, "plain": .08, "carpet": .06, "stone": .0, "brick": .0, "wood": .0}


def sample_diamond(T, ss=2):
    w, h = TW * ss, TH * ss
    py, px = np.mgrid[0:h, 0:w]
    x = (px + .5 - w / 2) / (w / 2)
    yy = (py + .5 - h / 2) / (h / 2)
    inside = (np.abs(x) + np.abs(yy)) <= 1.0
    u = ((x + yy) / 2 + .5) % 1
    v = ((yy - x) / 2 + .5) % 1
    # bilinear periyodik örnekleme
    fu = u * N; fv = v * N
    u0 = np.floor(fu).astype(int) % N; v0 = np.floor(fv).astype(int) % N
    u1 = (u0 + 1) % N; v1 = (v0 + 1) % N
    au = fu - np.floor(fu); av = fv - np.floor(fv)
    val = (T[v0, u0] * (1 - au) * (1 - av) + T[v0, u1] * au * (1 - av) + T[v1, u0] * (1 - au) * av + T[v1, u1] * au * av)
    # kenar derinliği (karo okunurluğu)
    edge = np.minimum(np.minimum(u, 1 - u), np.minimum(v, 1 - v))
    return val, inside.astype(float), edge, u, v


def make_floor(kind):
    out = Image.new("LA", (TW * VAR, TH), (0, 0))
    for var in range(VAR):
        T = KINDS[kind](100 + var * 17 + hash(kind) % 50)
        val, inside, edge, u, v = sample_diamond(T)
        bw = EDGED.get(kind, None)
        if bw:
            # iç kenarda ışık+gölge: üst-sol kenarlar açık, alt-sağ kenarlar koyu
            hl = np.clip(1 - np.minimum(u, v) / (bw * .6), 0, 1)
            sh = np.clip(1 - np.minimum(1 - u, 1 - v) / (bw * .6), 0, 1)
            val = val + 0.10 * hl - 0.14 * sh
            val = np.where(edge < 0.012, val * 0.78, val)
        val = np.clip(val, 0, 1)
        ss = 2
        a = inside.reshape(TH, ss, TW, ss).mean(axis=(1, 3))
        g = (val * inside).reshape(TH, ss, TW, ss).mean(axis=(1, 3)) / np.maximum(a, 1e-4)
        arr = np.dstack([g * 255, a * 255]).astype(np.uint8)
        out.paste(Image.fromarray(arr, "LA"), (var * TW, 0))
    out.convert("RGBA").save(os.path.join(OUT, f"floor_{kind}.png"), optimize=True)
    print("ok floor", kind, flush=True)


# ---------------------------- duvar dokuları (180x440, x periyodik) ----------------------------
WW, WH = 180, 440


def wnoise(beta, seed, sx=1.0):
    return pnoise(WH, beta, seed, WW)


def band(T, y0, y1, val, add=False):
    T[y0:y1, :] = (T[y0:y1, :] + val) if add else val


def crown_base(T, rail=True, wainscot=True, base=0.62):
    """taç silme (üst 28px) + süpürgelik (alt 24px) + isteğe bağlı lambri"""
    band(T, 0, 6, 1.0); band(T, 6, 12, 0.88); band(T, 12, 20, 0.70); band(T, 20, 26, 0.92); band(T, 26, 28, 0.78)
    band(T, 416, 440, base); band(T, 416, 419, 0.88)
    if wainscot:
        T[308:416, :] *= 0.86
        band(T, 296, 300, 0.10, True); band(T, 300, 308, -0.0, True); band(T, 308, 311, -0.16, True)
        for x0 in (6, 96):
            x1 = x0 + 78
            T[326:404, x0:x1] += 0.02
            T[326:329, x0:x1] += 0.10; T[326:404, x0:x0 + 3] += 0.08
            T[401:404, x0:x1] -= 0.14; T[326:404, x1 - 3:x1] -= 0.10
    return T


def w_plaster(seed):
    T = 0.92 + 0.04 * (wnoise(2.2, seed) - .5) + 0.02 * (wnoise(.7, seed + 1) - .5)
    yy = np.arange(WH)[:, None]
    T = T * (1 + 0.0 * yy)
    return crown_base(T)


def w_brick(seed):
    rng = np.random.RandomState(seed)
    T = np.full((WH, WW), 0.5)
    bh, bw = 20, 45
    rows = (WH - 52) // bh
    for r in range(rows):
        y0 = 28 + r * bh
        offx = (r % 2) * (bw // 2)
        for c in range(-1, WW // bw + 1):
            x0 = c * bw + offx
            val = rng.uniform(0.74, 0.98)
            for y in range(y0 + 2, min(y0 + bh, 416)):
                xs = np.arange(x0 + 2, x0 + bw)
                xs = xs % WW
                T[y, xs] = val + 0.05 * (rng.rand(len(xs)) - .5)
            T[y0 + 2:y0 + 4, (np.arange(x0 + 2, x0 + bw) % WW)] += 0.08
            T[min(y0 + bh - 2, 415):min(y0 + bh, 416), (np.arange(x0 + 2, x0 + bw) % WW)] -= 0.10
    T += 0.05 * (wnoise(1.0, seed) - .5)
    T = crown_base(T, wainscot=False, base=0.55)
    return T


def w_wood(seed):
    rng = np.random.RandomState(seed)
    T = np.zeros((WH, WW))
    bw = 30
    for i in range(WW // bw):
        x0 = i * bw
        base = rng.uniform(0.78, 0.95)
        gr = np.sin(2 * np.pi * (np.arange(WH)[:, None] * 0.011 + np.arange(bw)[None, :] * 0.18 + rng.rand() * 6 + 1.2 * wnoise(2.4, seed + i)[:, :bw]))
        T[:, x0:x0 + bw] = base + 0.05 * gr + 0.05 * (wnoise(1.0, seed + 9 + i)[:, :bw] - .5)
        T[:, x0:x0 + 2] = 0.45
        T[:, x0 + 2:x0 + 4] += 0.08
    return crown_base(T, wainscot=False, base=0.58)


def w_tile(seed):
    rng = np.random.RandomState(seed)
    T = np.zeros((WH, WW))
    ts = 36
    for r in range(0, 416 - 28, ts):
        for c in range(WW // ts):
            y0 = 28 + r; x0 = c * ts
            val = 0.90 + rng.uniform(-.04, .04)
            T[y0:y0 + ts, x0:x0 + ts] = val
            T[y0:y0 + 2, x0:x0 + ts] = 0.50 if False else val
            T[y0:y0 + ts, x0:x0 + 2] = 0.58
            T[y0:y0 + 2, x0:x0 + ts] = 0.58
            T[y0 + 2:y0 + 5, x0 + 2:x0 + ts] += 0.07
            T[y0 + ts - 4:y0 + ts, x0 + 2:x0 + ts] -= 0.06
            yy, xx = np.mgrid[0:ts, 0:ts]
            T[y0:y0 + ts, x0:x0 + ts] += 0.05 * np.clip(1 - np.abs((xx - yy * 0.6) - 12) / 6, 0, 1)
    T[416:, :] = 0
    return crown_base(T, wainscot=False, base=0.55)


def w_metal(seed):
    rng = np.random.RandomState(seed)
    T = 0.80 + 0.05 * (wnoise(1.4, seed) - .5)
    for x0 in (0, 90):
        T[40:408, x0:x0 + 3] = 0.45
        T[40:408, x0 + 3:x0 + 6] += 0.08
    for y0 in (40, 408):
        T[y0:y0 + 3, :] = 0.45
    for x0 in (10, 80, 100, 170):
        for y0 in (52, 396):
            yy, xx = np.mgrid[-5:6, -5:6]
            m = (yy ** 2 + xx ** 2) <= 20
            T[y0 - 5:y0 + 6, x0 - 5:x0 + 6] = np.where(m, 0.55 + 0.25 * (xx < 0), T[y0 - 5:y0 + 6, x0 - 5:x0 + 6])
    for k in range(7):  # havalandırma ızgarası
        T[140 + k * 12:146 + k * 12, 20:70] = 0.38
        T[146 + k * 12:148 + k * 12, 20:70] += 0.10
    T[320:400, :] = np.where(((np.arange(180)[None, :] + np.arange(80)[:, None]) // 18) % 2 == 0, 0.88, 0.40)
    return crown_base(T, wainscot=False, base=0.48)


def w_stone(seed):
    rng = np.random.RandomState(seed)
    T = np.full((WH, WW), 0.45)
    y = 28
    while y < 416:
        h = int(rng.choice([56, 64, 72, 80]))
        h = min(h, 416 - y)
        x = 0
        widths = []
        total = 0
        while total < WW:
            w = int(rng.choice([36, 45, 60, 75]))
            w = min(w, WW - total)
            if WW - total - w < 28: w = WW - total
            widths.append(w); total += w
        for w in widths:
            val = rng.uniform(0.70, 0.96)
            T[y + 3:y + h, x + 3:x + w] = val
            T[y + 3:y + 7, x + 3:x + w] += 0.08; T[y + 3:y + h, x + 3:x + 6] += 0.06
            T[y + h - 4:y + h, x + 3:x + w] -= 0.10
            x += w
        y += h
    T += 0.07 * (wnoise(1.3, seed) - .5)
    T[416:, :] = 0
    return crown_base(T, wainscot=False, base=0.5)


WALLS = {"plaster": w_plaster, "brick": w_brick, "wood": w_wood, "tile": w_tile, "metal": w_metal, "stone": w_stone}


def make_wall(kind):
    T = np.clip(WALLS[kind](7 + len(kind)), 0, 1)
    g = (T * 255).astype(np.uint8)
    Image.fromarray(np.dstack([g, g, g, np.full_like(g, 255)]), "RGBA").save(os.path.join(OUT, f"wall_{kind}.png"), optimize=True)
    print("ok wall", kind, flush=True)


if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "hepsi"
    if mode in ("zemin", "hepsi"):
        for k in KINDS:
            make_floor(k)
    if mode in ("duvar", "hepsi"):
        for k in WALLS:
            make_wall(k)
