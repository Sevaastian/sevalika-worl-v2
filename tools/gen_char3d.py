#!/usr/bin/env python3
"""3B karakter katmanlarını public/sprites/avatar3/ altına üretir (4 yön x 8 kare sheet).
Kullanım: python3 gen_char3d.py [dinamik|statik|hepsi]
Sheet: 8 sütun (0 duruş, 1-6 yürüyüş, 7 oturuş) x 4 satır (yön: 0 GD, 1 GB, 2 KB, 3 KD), kare 224x304 px, 1 birim = 4px,
ayak noktası karenin alt-ortasından 8px yukarıda. Parçalar beyaz/gri tonludur, oyun renk çarpar (tint)."""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
import numpy as np
from PIL import Image
from r3d import *
import char3d as C

OUT = os.path.join(os.path.dirname(__file__), "..", "public", "sprites", "avatar3")
os.makedirs(OUT, exist_ok=True)
HAIR = ["hs_short", "hs_long", "hs_spiky", "hs_bun", "hs_afro", "hs_mohawk", "hs_pony", "hs_curly"]
TOPS = ["tp_hoodie", "tp_stripe", "tp_suit", "tp_jersey", "tp_overalls", "tp_hawaii"]
HATS = ["hat_beanie", "hat_cap", "hat_tophat", "hat_cowboy", "hat_crown", "hat_headphones", "hat_beret", "hat_bucket", "hat_wizard", "hat_pirate", "hat_flower", "hat_catears"]
GLASS = ["gl_nerd", "gl_shades", "gl_neon", "gl_star", "gl_round", "gl_heart", "gl_visor"]
BACKS = ["bk_backpack", "bk_cape", "bk_angel", "bk_butterfly", "bk_devil"]
cams = [Cam(y) for y in DIRS_YAW]
_base = {}

def base_depth(d, f):
    f = 0 if f == 7 else f
    k = (d, f)
    if k not in _base:
        _base[k] = render(C.body(f), cams[d])
    return _base[k]

def tile(L):
    rgb, al, dp = L
    return to_image(downsample(outline(rgb, al, dp), al))

def save(sheet, name):
    sheet.save(os.path.join(OUT, name + ".png"), optimize=True)
    print("ok", name, flush=True)

def dynamic(name, fn, own_base=False):
    sheet = Image.new("RGBA", (FW * 8, FH * 4))
    for d in range(4):
        cache = {}
        for f in range(8):
            parts = fn(f)
            key = f if f in (1, 2, 3, 4, 5, 6) else (7 if name in ("legs", "shoes") and f == 7 else 0)
            if key not in cache:
                L = render(parts, cams[d])
                if not own_base:
                    L = composite_visible(L, base_depth(d, f)[2])
                cache[key] = tile(L)
            sheet.paste(cache[key], (f * FW, d * FH))
    save(sheet, name)

def static(name, fn):
    sheet = Image.new("RGBA", (FW * 8, FH * 4))
    for d in range(4):
        L = composite_visible(render(fn(), cams[d]), base_depth(d, 0)[2])
        t = tile(L)
        for f in range(8):
            sheet.paste(t, (f * FW, d * FH))
    save(sheet, name)

if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "hepsi"
    only = sys.argv[2:] if len(sys.argv) > 2 else None
    want = lambda n: only is None or n in only
    if mode in ("statik", "hepsi"):
        if want("face"): static("face", lambda: C.face(0))
        for h in HAIR:
            if want(h): static(h, lambda h=h: C.hair(h))
        for h in HATS:
            if want(h): static(h, lambda h=h: C.hat(h))
        for h in GLASS:
            if want(h): static(h, lambda h=h: C.glasses(h))
        for h in BACKS:
            if want(h): static(h, lambda h=h: C.back(h))
    if mode in ("dinamik", "hepsi"):
        if want("body"): dynamic("body", C.body, own_base=True)
        if want("legs"): dynamic("legs", C.legs)
        if want("shoes"): dynamic("shoes", C.shoes)
        if want("shirt"): dynamic("shirt", C.shirt)
        for t in TOPS:
            if want(t): dynamic(t, lambda f, t=t: C.top(t, f))
