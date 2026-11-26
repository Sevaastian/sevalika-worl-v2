#!/usr/bin/env python3
"""Cadde 2 arka plan resmi (resimli/toon stil). Çıktı: public/sprites/rooms/cadde-2.png
Izgara izdüşümü oyunla aynı: tile(gx,gy) üst köşesi = ((gx-gy)*32, (gx+gy)*16) @1x.
Resim 2x çözünürlükte; OX = ROWS*32 (1x px), HEAD = üst boşluk (1x px). lib/backdrop.ts aynı sabitleri kullanır."""
import os, random, math
from PIL import Image, ImageDraw, ImageFont

COLS, ROWS = 26, 18
HEAD = 230          # binalar için üst pay (1x px)
SLAB = 14
S = 4               # çizim süpersample
OUTW = 2            # çıktı = 2x
OX = ROWS * 32
W1 = (COLS + ROWS) * 32
H1 = (COLS + ROWS) * 16 + HEAD + SLAB + 6
OUTLINE = (38, 42, 74, 255)
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

img = Image.new("RGBA", (W1 * S, H1 * S), (0, 0, 0, 0))
d = ImageDraw.Draw(img)
rnd = random.Random(7)


def P(gx, gy, z=0):
    return ((OX + (gx - gy) * 32) * S, (HEAD + (gx + gy) * 16 - z) * S)


def poly(pts, fill, outline=OUTLINE, w=2.2):
    d.polygon(pts, fill=fill)
    if outline:
        d.line(pts + [pts[0]], fill=outline, width=int(w * S), joint="curve")


def rect(gx0, gy0, gx1, gy1, fill, z=0, outline=None, w=2.0):
    poly([P(gx0, gy0, z), P(gx1, gy0, z), P(gx1, gy1, z), P(gx0, gy1, z)], fill, outline, w)


def shade(c, k):
    return tuple(max(0, min(255, int(v * k))) for v in c[:3]) + (255,)


# ---------------- zemin tabanı ----------------
# kalınlık (alt iki kenar)
base_c = (143, 108, 66, 255)
poly([P(0, ROWS), P(COLS, ROWS), (P(COLS, ROWS)[0], P(COLS, ROWS)[1] + SLAB * S), (P(0, ROWS)[0], P(0, ROWS)[1] + SLAB * S)], shade(base_c, 0.85))
poly([P(COLS, 0), P(COLS, ROWS), (P(COLS, ROWS)[0], P(COLS, ROWS)[1] + SLAB * S), (P(COLS, 0)[0], P(COLS, 0)[1] + SLAB * S)], shade(base_c, 0.7))
rect(0, 0, COLS, ROWS, (122, 196, 82, 255), 0, OUTLINE, 3)

GRASS = [(122, 196, 82), (113, 187, 74), (132, 205, 92)]
for gx in range(COLS):
    for gy in range(ROWS):
        c = GRASS[(gx * 7 + gy * 3) % 3] + (255,)
        rect(gx, gy, gx + 1, gy + 1, c, 0)

# kaldırım / plaza (kum-bej)
SAND = [(244, 224, 170), (238, 216, 160)]


def sand(gx0, gy0, gx1, gy1):
    for gx in range(gx0, gx1):
        for gy in range(gy0, gy1):
            c = SAND[(gx + gy) % 2] + (255,)
            rect(gx, gy, gx + 1, gy + 1, c, 0)


sand(0, 4, COLS, 8)      # üst kaldırım
sand(0, 12, COLS, 14)    # alt kaldırım
sand(11, 14, 16, 18)     # aşağı inen yaya yolu
sand(3, 1, 4, 4)         # (bina önü boş)

# yol
for gx in range(COLS):
    for gy in range(8, 12):
        c = (108, 115, 128, 255) if (gx + gy) % 2 else (102, 109, 122, 255)
        rect(gx, gy, gx + 1, gy + 1, c, 0)
# orta çizgi kesikleri
for k in range(0, COLS * 2, 2):
    gx = k * 0.5
    rect(gx + 0.1, 9.93, gx + 0.7, 10.07, (250, 250, 250, 255), 0)

# sarı-beyaz çizgili bordürler (yol kenarları)
for gy0 in (7.78, 12.0):
    for k in range(COLS * 2):
        gx = k * 0.5
        col = (255, 207, 40, 255) if k % 2 == 0 else (250, 250, 250, 255)
        rect(gx, gy0, gx + 0.5, gy0 + 0.22, col, 0, OUTLINE, 1.2)

# yaya geçitleri
for cx in (4.0, 12.0, 19.5):
    for k in range(7):
        gx = cx + k * 0.42
        rect(gx, 8.2, gx + 0.26, 11.8, (252, 252, 252, 255), 0)

# çim üzerindeki toprak/kum yamaları ve patika
for (a, b, c2, e) in [(0, 14, 4, 18), (22, 14, 26, 18)]:
    pass
for _ in range(120):
    gx, gy = rnd.uniform(0.3, COLS - 0.5), rnd.choice([rnd.uniform(14.2, 17.7), rnd.uniform(0.2, 3.8)])
    if (gy < 4 and 2 <= gx <= 22) or (11 <= gx <= 16 and gy > 14):
        continue
    x, y = P(gx, gy)
    d.line([(x, y), (x - 3 * S, y - 7 * S)], fill=(84, 152, 56, 255), width=2 * S)
    d.line([(x, y), (x + 3 * S, y - 6 * S)], fill=(84, 152, 56, 255), width=2 * S)


# ---------------- bina çizim yardımcıları ----------------
def quad_pt(face, u, v):
    kind, c0, c1, z0, z1, fixed = face
    if kind == "R":   # gx=fixed düzlemi, gy boyunca (c0..c1), sağ-yukarı = gy azalır
        return P(fixed, c0 + u * (c1 - c0), z0 + v * (z1 - z0))
    return P(c0 + u * (c1 - c0), fixed, z0 + v * (z1 - z0))


def face_poly(face, u0, v0, u1, v1, fill, outline=OUTLINE, w=1.8):
    pts = [quad_pt(face, u0, v0), quad_pt(face, u1, v0), quad_pt(face, u1, v1), quad_pt(face, u0, v1)]
    poly(pts, fill, outline, w)


def face_text(face, u0, v0, u1, v1, text, color, bg=None):
    """Metni yüzeye eğik (affine) basar. R yüzünde okuma yönü sağ-yukarı (gy azalan)."""
    kind = face[0]
    x0, y0 = quad_pt(face, u0, v0)
    xr, yr = quad_pt(face, u1, v0)
    xt, yt = quad_pt(face, u0, v1)
    if kind == "R":   # u arttıkça gy artar => sola-aşağı; okuma yönünü ters çevir
        x0, y0 = quad_pt(face, u1, v0)
        xr, yr = quad_pt(face, u0, v0)
    ux, uy = xr - x0, yr - y0
    hv = y0 - yt
    tw, th = 600, 150
    t = Image.new("RGBA", (tw, th), (0, 0, 0, 0))
    td = ImageDraw.Draw(t)
    if bg:
        td.rectangle([0, 0, tw, th], fill=bg)
    fs = 100
    f = ImageFont.truetype(FONT, fs)
    while td.textlength(text, font=f) > tw - 30 and fs > 20:
        fs -= 4
        f = ImageFont.truetype(FONT, fs)
    td.text((tw / 2, th / 2), text, font=f, fill=color, anchor="mm")
    # çıktı (px,py) -> kaynak: s=(px-x0)/ux ; tt=(s*uy-(py-y0))/hv ; sx=tw*s ; sy=th*(1-tt)
    a = tw / ux
    b = 0.0
    c = -tw * x0 / ux
    # s = (px-x0)/ux ; tt = ((px-x0)*uy/ux - (py-y0))/hv
    # sy = th*(1 - tt) = th - th*((px-x0)*uy/ux - py + y0)/hv
    dd = -th * (uy / ux) / hv
    ee = th / hv
    ff = th - th * (-(x0) * uy / ux + y0) / hv
    bx0 = int(min(x0, xr, xt) - 4 * S)
    by0 = int(min(y0, yr, yt, y0 - hv, yr - hv) - 4 * S)
    bw = int(abs(xr - x0) + 12 * S)
    bh = int(hv + abs(uy) + 12 * S)
    layer = Image.new("RGBA", (bw, bh), (0, 0, 0, 0))
    # bbox ofseti
    ox, oy = bx0, by0
    # (px,py) = (qx+ox, qy+oy)
    a2, b2, c2 = a, b, c + a * ox
    d2, e2, f2 = dd, ee, ff + dd * ox + ee * oy
    t2 = t.transform((bw, bh), Image.AFFINE, (a2, b2, c2, d2, e2, f2), resample=Image.BICUBIC)
    # affine ters eşleme; kapsama dışını temizle
    img.alpha_composite(t2, (ox, oy)) if ox >= 0 and oy >= 0 else None


def building(gx0, gy0, gx1, gy1, h, wall, roof, brick=False, lines=True):
    FR = ("R", gy0, gy1, 0, h, gx1)      # sağ yüz (gx=gx1)
    FL = ("L", gx0, gx1, 0, h, gy1)      # sol yüz (gy=gy1)
    # gölge
    sh = [P(gx1 + 0.1, gy0 + 0.2), P(gx1 + 1.2, gy0 + 0.8), P(gx1 + 1.2, gy1 + 0.6), P(gx0 + 0.6, gy1 + 0.6), P(gx0 + 0.2, gy1 + 0.1), P(gx1 + 0.1, gy1 + 0.1)]
    lay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ImageDraw.Draw(lay).polygon(sh, fill=(20, 60, 30, 70))
    img.alpha_composite(lay)
    face_poly(FL, 0, 0, 1, 1, shade(wall, 1.0))
    face_poly(FR, 0, 0, 1, 1, shade(wall, 0.82))
    if brick:
        for face, k in ((FL, 1.0), (FR, 0.82)):
            n = int(h / 7)
            for i in range(1, n):
                v = i / n
                d.line([quad_pt(face, 0, v), quad_pt(face, 1, v)], fill=shade(wall, 0.78 * k), width=int(1.1 * S))
            seg = 14
            for i in range(n):
                v0, v1 = i / n, (i + 1) / n
                for j in range(seg):
                    u = (j + (0.5 if i % 2 else 0)) / seg
                    if 0 < u < 1:
                        d.line([quad_pt(face, u, v0), quad_pt(face, u, v1)], fill=shade(wall, 0.8 * k), width=int(0.9 * S))
    # çatı
    rt = [P(gx0, gy0, h), P(gx1, gy0, h), P(gx1, gy1, h), P(gx0, gy1, h)]
    poly(rt, roof)
    # çatı bordür (parapet)
    poly([P(gx0, gy1, h), P(gx1, gy1, h), P(gx1, gy1, h + 4), P(gx0, gy1, h + 4)], shade(roof, 1.15))
    poly([P(gx1, gy0, h), P(gx1, gy1, h), P(gx1, gy1, h + 4), P(gx1, gy0, h + 4)], shade(roof, 0.95))
    return FL, FR


def windows(face, cols, rows, u0=0.07, u1=0.93, v0=0.28, v1=0.9, glass=(120, 196, 236, 255)):
    cw = (u1 - u0) / cols
    ch = (v1 - v0) / rows
    for r in range(rows):
        for c in range(cols):
            a = u0 + c * cw + cw * 0.14
            b = u0 + (c + 1) * cw - cw * 0.14
            e = v0 + r * ch + ch * 0.16
            f = v0 + (r + 1) * ch - ch * 0.16
            face_poly(face, a, e, b, f, glass, (60, 80, 120, 255), 1.4)
            # parıltı
            pts = [quad_pt(face, a + (b - a) * 0.12, e + (f - e) * 0.15), quad_pt(face, a + (b - a) * 0.5, e + (f - e) * 0.15),
                   quad_pt(face, a + (b - a) * 0.2, f - (f - e) * 0.15)]
            d.polygon(pts, fill=(220, 244, 255, 255))


def solar(gx0, gy0, gx1, gy1, h, nx, ny):
    gxs = (gx1 - gx0)
    gys = (gy1 - gy0)
    for i in range(nx):
        for j in range(ny):
            a = gx0 + gxs * (0.08 + 0.84 * i / nx) + 0.05
            b = gx0 + gxs * (0.08 + 0.84 * (i + 1) / nx) - 0.05
            c = gy0 + gys * (0.12 + 0.76 * j / ny) + 0.05
            e = gy0 + gys * (0.12 + 0.76 * (j + 1) / ny) - 0.05
            poly([P(a, c, h + 5), P(b, c, h + 5), P(b, e, h + 5), P(a, e, h + 5)], (36, 64, 138, 255), (20, 30, 70, 255), 1.4)
            # hücre çizgileri
            for k in (1, 2):
                t = k / 3
                d.line([P(a + (b - a) * t, c, h + 5), P(a + (b - a) * t, e, h + 5)], fill=(110, 150, 220, 255), width=int(0.8 * S))
            d.line([P(a, c + (e - c) / 2, h + 5), P(b, c + (e - c) / 2, h + 5)], fill=(110, 150, 220, 255), width=int(0.8 * S))


def awning(face, u0, u1, v, hgt, c1, c2, n=6):
    for i in range(n):
        a = u0 + (u1 - u0) * i / n
        b = u0 + (u1 - u0) * (i + 1) / n
        col = c1 if i % 2 == 0 else c2
        face_poly(face, a, v, b, v + hgt, col, OUTLINE, 1.4)


def bush(gx, gy, r=0.45, col=(70, 160, 70, 255)):
    x, y = P(gx, gy)
    rr = r * 32 * S
    d.ellipse([x - rr, y - rr * 0.9, x + rr, y + rr * 0.35], fill=col, outline=OUTLINE, width=int(2 * S))
    d.ellipse([x - rr * 0.5, y - rr * 0.8, x + rr * 0.1, y - rr * 0.2], fill=shade(col, 1.2))


# ---------------- Bina A: SOLARİS OFİS (tuğla, çatıda güneş paneli, cam lobi) ----------------
FA_L, FA_R = building(2, 0, 11, 4, 150, (201, 90, 66, 255), (150, 158, 172, 255), brick=True)
windows(FA_L, 7, 3, v0=0.36, v1=0.88)
windows(FA_R, 3, 3, v0=0.36, v1=0.88)
# cam lobi (zemin kat, sol yüz ortası)
face_poly(FA_L, 0.34, 0.0, 0.66, 0.30, (150, 222, 240, 255), (50, 70, 110, 255), 2)
face_poly(FA_L, 0.48, 0.0, 0.52, 0.30, (60, 90, 130, 255), (50, 70, 110, 255), 1.2)
face_poly(FA_L, 0.34, 0.30, 0.66, 0.34, (240, 240, 245, 255), OUTLINE, 1.6)
face_text(FA_L, 0.30, 0.89, 0.70, 0.99, "SOLARİS", (255, 255, 255, 255), bg=(40, 60, 120, 255))
awning(FA_L, 0.34, 0.66, 0.30, 0.05, (255, 207, 40, 255), (250, 250, 250, 255), 8)
solar(2, 0, 11, 4, 150, 4, 2)
# çatıda küçük bina ve bayrak
poly([P(8.5, 0.6, 150), P(10.2, 0.6, 150), P(10.2, 1.8, 150), P(8.5, 1.8, 150)], (200, 205, 215, 255), None)
for gx, col in ((3.5, (230, 60, 60, 255)), (4.6, (255, 207, 40, 255)), (5.7, (50, 150, 230, 255))):
    x0, y0 = P(gx, 3.7, 8)
    x1, y1 = P(gx, 3.7, 52)
    d.line([(x0, y0), (x1, y1)], fill=(240, 240, 240, 255), width=int(2 * S))
    d.polygon([(x1, y1), (x1 + 22 * S, y1 + 6 * S), (x1, y1 + 14 * S)], fill=col, outline=OUTLINE)

# ---------------- Bina B: FİDAN LAB (krem, mavi şerit, cam ön) ----------------
FB_L, FB_R = building(14, 0, 22, 4, 112, (250, 232, 170, 255), (110, 190, 190, 255))
face_poly(FB_L, 0, 0.0, 1, 0.1, (60, 160, 190, 255))
face_poly(FB_R, 0, 0.0, 1, 0.1, shade((60, 160, 190), 0.82))
face_poly(FB_L, 0.08, 0.14, 0.62, 0.62, (150, 222, 240, 255), (50, 70, 110, 255), 2)
for k in range(1, 4):
    u = 0.08 + 0.54 * k / 4
    d.line([quad_pt(FB_L, u, 0.14), quad_pt(FB_L, u, 0.62)], fill=(50, 70, 110, 255), width=int(1.6 * S))
windows(FB_L, 2, 1, u0=0.68, u1=0.94, v0=0.14, v1=0.62)
windows(FB_R, 3, 2, v0=0.2, v1=0.86)
face_text(FB_L, 0.12, 0.70, 0.86, 0.94, "FİDAN LAB", (255, 255, 255, 255), bg=(232, 110, 70, 255))
awning(FB_L, 0.08, 0.62, 0.62, 0.05, (230, 90, 90, 255), (250, 250, 250, 255), 8)
# çatıda mini seralar (cam kutular)
for i in range(3):
    gx = 15 + i * 2.4
    poly([P(gx, 0.8, 112), P(gx + 1.8, 0.8, 112), P(gx + 1.8, 2.4, 112), P(gx, 2.4, 112)], (200, 235, 245, 255), None)
    rect(gx, 0.8, gx + 1.8, 2.4, (170, 225, 240, 255), 122, OUTLINE, 1.6)
    poly([P(gx, 2.4, 112), P(gx + 1.8, 2.4, 112), P(gx + 1.8, 2.4, 122), P(gx, 2.4, 122)], (190, 235, 248, 255))
    poly([P(gx + 1.8, 0.8, 112), P(gx + 1.8, 2.4, 112), P(gx + 1.8, 2.4, 122), P(gx + 1.8, 0.8, 122)], (160, 215, 232, 255))

# ---------------- Bina C: KAFE SEVA (küçük, turuncu tente) ----------------
FC_L, FC_R = building(0, 4, 3, 7, 70, (252, 246, 232, 255), (222, 90, 60, 255))
windows(FC_L, 2, 1, v0=0.3, v1=0.78)
windows(FC_R, 2, 1, v0=0.3, v1=0.78)
awning(FC_L, 0.0, 1.0, 0.8, 0.12, (255, 150, 50, 255), (250, 250, 250, 255), 9)
face_text(FC_L, 0.1, 0.58, 0.9, 0.78, "KAFE SEVA", (150, 60, 30, 255), bg=(255, 244, 214, 255))

# ---------------- Mini park: çiçeklik, çalılar, çardak ----------------
for gx in (2.2, 4.6, 6.8, 9.0, 11.6, 14.0, 16.2, 18.4, 20.8):
    bush(gx, 4.3, 0.34)
for gx, gy in ((1, 15), (3, 16), (5.5, 14.8), (7, 17), (9, 15.5), (22, 15), (24, 16.5), (18, 17.2)):
    bush(gx, gy, 0.5)

# çardak (pergola): ahşap direkler ve kirişler
px0, py0, px1, py1 = 19, 14.2, 24, 17.2
POST = (170, 120, 70, 255)
for (gx, gy) in ((px0, py0), (px1, py0), (px0, py1), (px1, py1)):
    xb, yb = P(gx, gy, 0)
    xt, yt = P(gx, gy, 58)
    d.line([(xb, yb), (xt, yt)], fill=OUTLINE, width=int(7 * S))
    d.line([(xb, yb), (xt, yt)], fill=POST, width=int(4.5 * S))
n = 7
for k in range(n + 1):
    gx = px0 + (px1 - px0) * k / n
    d.line([P(gx, py0, 58), P(gx, py1, 58)], fill=OUTLINE, width=int(5 * S))
    d.line([P(gx, py0, 58), P(gx, py1, 58)], fill=(196, 146, 90, 255), width=int(3 * S))
for gy in (py0, py1):
    d.line([P(px0, gy, 58), P(px1, gy, 58)], fill=OUTLINE, width=int(6 * S))
    d.line([P(px0, gy, 58), P(px1, gy, 58)], fill=(150, 104, 60, 255), width=int(4 * S))
# asma bitkiler
for k in range(0, n + 1, 2):
    gx = px0 + (px1 - px0) * k / n
    x, y = P(gx, py1, 58)
    d.ellipse([x - 6 * S, y - 2 * S, x + 6 * S, y + 12 * S], fill=(80, 170, 80, 255), outline=OUTLINE, width=int(1.4 * S))

# ---------------- Kaldırım detayı: yaya çizgisi, kare derzler ----------------
for gx in range(0, COLS + 1):
    for gy in (4, 5, 6, 7, 12, 13):
        pass

# bitir: küçült, kuantize, kaydet
out = img.resize((W1 * OUTW, H1 * OUTW), Image.LANCZOS)
dst = os.path.join(os.path.dirname(__file__), "..", "public", "sprites", "rooms")
os.makedirs(dst, exist_ok=True)
q = out.quantize(colors=200, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE)
q.save(os.path.join(dst, "cadde-2.png"), optimize=True)
print("OK", out.size, os.path.getsize(os.path.join(dst, "cadde-2.png")) // 1024, "KB", "OX", OX, "HEAD", HEAD)
