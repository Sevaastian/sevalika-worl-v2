#!/usr/bin/env python3
"""Orijinal katmanlı karakter parçalarını üretir (public/sprites/avatar/*.png).
Her parça: 5 kareli yatay sheet (kare0 = duruş, kare1-4 = yürüyüş), kare 160x240 px (1x'te 40x60).
Ayak ortası karenin alt-orta noktasıdır. Parçalar beyaz/gri tonlu çizilir, oyun rengi uygular (tint).
Kendi çizimlerini aynı dosya adı ve boyutlarla bu klasöre koyarak değiştirebilirsin."""
import math, os
from PIL import Image, ImageDraw
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "sprites", "avatar")
FW, FH, N, SS = 160, 240, 5, 4          # kare boyutu, kare sayısı, süpersample
X0, Y0, K = FW // 2, FH - 8, 4          # 1x birim -> 4px; ayak noktası
def P(x, y): return ((X0 + x * K) * SS, (Y0 + y * K) * SS)
def new(): return Image.new("RGBA", (FW * N * SS, FH * SS), (0, 0, 0, 0))
def frame(img, i):
    d = ImageDraw.Draw(img); return d, i * FW * SS
def shift(pt, off): return (pt[0] + off, pt[1])
def rect(d, off, x, y, w, h, fill, r=0):
    a = shift(P(x, y), off); b = shift(P(x + w, y + h), off)
    if r: d.rounded_rectangle([a, b], radius=r * K * SS, fill=fill)
    else: d.rectangle([a, b], fill=fill)
def circ(d, off, cx, cy, r, fill):
    c = shift(P(cx, cy), off); rr = r * K * SS
    d.ellipse([c[0] - rr, c[1] - rr, c[0] + rr, c[1] + rr], fill=fill)
def ell(d, off, cx, cy, rx, ry, fill):
    c = shift(P(cx, cy), off)
    d.ellipse([c[0] - rx * K * SS, c[1] - ry * K * SS, c[0] + rx * K * SS, c[1] + ry * K * SS], fill=fill)
def poly(d, off, pts, fill): d.polygon([shift(P(x, y), off) for x, y in pts], fill=fill)
def save(img, name):
    img.resize((FW * N, FH), Image.LANCZOS).save(os.path.join(OUT, name))
W, G1, G2, DK = (255,255,255,255), (232,232,236,255), (208,208,214,255), (150,150,160,255)
phases = [0, math.pi / 2, math.pi, 3 * math.pi / 2, 0]

def legs():
    img = new()
    for i in range(N):
        d, off = frame(img, i); ph = phases[i] if i else 0; mv = i > 0
        stride = math.sin(ph) * 8 if mv else 0
        liftL = max(0, math.sin(ph)) * 4 if mv else 0
        liftR = max(0, -math.sin(ph)) * 4 if mv else 0
        for x, lift in ((-6 + stride * .45, liftL), (1 - stride * .45, liftR)):
            rect(d, off, x, -14 - lift, 5, 14, (30, 41, 59, 255), 1)
            rect(d, off, x, -14 - lift, 1.4, 14, (51, 65, 85, 255), 0.6)
            rect(d, off, x - .3, -3.2 - lift, 5.6, 3.2, (226, 232, 240, 255), 1)
    save(img, "legs.png")

def body():
    img = new()
    for i in range(N):
        d, off = frame(img, i); sw = math.sin(phases[i]) * 6 if i else 0
        rect(d, off, -11.5, -30 - sw * .5, 2.6, 11, G1, 1.2)
        rect(d, off, 8.9, -30 + sw * .5, 2.6, 11, G1, 1.2)
        circ(d, off, 0, -41, 9, W)
        ell(d, off, 1.5, -37.5, 6.5, 3.2, G1)           # çene gölgesi
        ell(d, off, -4.5, -45, 3, 2, (255, 255, 255, 255))
    save(img, "body.png")

def shirt():
    img = new()
    for i in range(N):
        d, off = frame(img, i); sw = math.sin(phases[i]) * 6 if i else 0
        rect(d, off, -9, -32, 18, 20, W, 4)
        rect(d, off, 3.5, -32, 5.5, 20, G1, 3)             # yan gölge
        rect(d, off, -9, -14.5, 18, 2.5, G2, 1)            # etek
        poly(d, off, [(-3, -32), (3, -32), (0, -27.5)], G2)  # yaka
        rect(d, off, -11.8, -31 - sw * .5, 3.2, 6, W, 1.2) # kısa kollar
        rect(d, off, 8.6, -31 + sw * .5, 3.2, 6, G1, 1.2)
    save(img, "shirt.png")

def hair(style, back=False):
    img = new(); d = ImageDraw.Draw(img); off = 0
    strand = G2
    def cap(cy=-43, r=9.5):
        # üst yarım daire
        c = P(0, cy); rr = r * K * SS
        d.pieslice([c[0] - rr, c[1] - rr, c[0] + rr, c[1] + rr], 180, 360, fill=W)
    if style == "hs_afro": circ(d, off, 0, -45, 13, W); circ(d, off, -4, -50, 5, G1)
    else: cap()
    if style != "hs_afro": circ(d, off, -3, -48, 2.2, G1)
    if style == "hs_long": rect(d, off, -10, -44, 3.6, 21, W, 1.6); rect(d, off, 6.4, -44, 3.6, 21, G1, 1.6)
    elif style == "hs_spiky":
        for i in range(-2, 3): poly(d, off, [(i * 4 - 2.4, -50), (i * 4, -58 + abs(i) * 1.8), (i * 4 + 2.4, -50)], W if i % 2 == 0 else G1)
    elif style == "hs_mohawk":
        for i in range(-3, 4): rect(d, off, i * 1.9 - 1, -53 - (3 - abs(i)) * 1.6, 2, 10 + (3 - abs(i)) * 1.6, W if i % 2 == 0 else G1)
    elif style == "hs_pony": ell(d, off, 8.5, -41, 3.2, 8, G1)
    elif style == "hs_curly":
        for x, y in [(-8, -42), (8, -42), (-5, -50), (5, -50), (0, -52), (-9.5, -36), (9.5, -36)]: circ(d, off, x, y, 3.4, W if x <= 0 else G1)
    elif style == "hs_bun": circ(d, off, 0, -55, 4.6, W); circ(d, off, -1.2, -56, 1.6, G1)
    if back: circ(d, off, 0, -42, 9.4, W); circ(d, off, 3, -40, 6, G1)
    # tek kare; diğer karelere aynı görsel çizilir
    full = new()
    one = img.crop((0, 0, FW * SS, FH * SS))
    for i in range(N): full.paste(one, (i * FW * SS, 0))
    save(full, f"{style}{'_b' if back else ''}.png")

def face():
    img = new(); d = ImageDraw.Draw(img)
    for i in range(N):
        off = i * FW * SS
        rect(d, off, -1, -42, 2, 2, (15, 23, 42, 255), .4); rect(d, off, 4, -42, 2, 2, (15, 23, 42, 255), .4)
        rect(d, off, 1, -37.2, 3, .9, (120, 60, 60, 200), .4)
    save(img, "face.png")

os.makedirs(OUT, exist_ok=True)
legs(); body(); shirt(); face()
for s in ["hs_short", "hs_long", "hs_spiky", "hs_bun", "hs_afro", "hs_mohawk", "hs_pony", "hs_curly"]:
    hair(s); hair(s, True)
print("tamam")
