"""Küçük SDF ışın izleyici (numpy): ortografik izometrik kamera ile parça katmanları üretir.
Birim: 1 birim = oyunda 1x ölçekte 1px; sprite'ta K=4 px. y yukarı, +z karakterin baktığı yön."""
import math
import numpy as np
from PIL import Image
from scipy import ndimage

FW, FH, K, SS = 224, 304, 4, 2
FEET_PX = FH - 8
ELEV = math.radians(26)
LIGHT = np.array([-0.55, 0.8, 0.55]); LIGHT /= np.linalg.norm(LIGHT)
DIRS_YAW = [45, -45, -135, 135]  # 0 GD(SE) 1 GB(SW) 2 KB(NW) 3 KD(NE)


def rx(a):
    c, s = math.cos(a), math.sin(a)
    return np.array([[1, 0, 0], [0, c, -s], [0, s, c]])


def ry(a):
    c, s = math.cos(a), math.sin(a)
    return np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]])


def rz(a):
    c, s = math.cos(a), math.sin(a)
    return np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]])


def rot(x=0, y=0, z=0):
    return rz(math.radians(z)) @ ry(math.radians(y)) @ rx(math.radians(x))


def hexc(h):
    h = h.lstrip("#")
    return np.array([int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)])


class P:
    """Primitif. kind: ell, box, cap, cyl, cone, torus."""

    def __init__(self, kind, c, size, color=(1, 1, 1), R=None, rad=0.0, emissive=False,
                 cut=None, spec=0.0, stripe=None, c2=None):
        self.kind = kind
        self.c = np.array(c, float)
        self.size = size
        self.color = np.array(color, float) if not isinstance(color, str) else hexc(color)
        self.R = np.eye(3) if R is None else R
        self.rad = rad
        self.emissive = emissive
        self.cut = cut  # (n, d) yerel uzayda: n·q > d kalır
        self.spec = spec
        self.stripe = stripe  # (eksen, periyot, renk2)
        self.c2 = c2

    def moved(self, pivot, M):
        """pivot etrafında M ile döndürülmüş kopya"""
        q = P.__new__(P)
        q.__dict__ = dict(self.__dict__)
        pivot = np.array(pivot, float)
        q.c = pivot + M @ (self.c - pivot)
        q.R = M @ self.R
        return q

    def bound(self):
        s = self.size
        if self.kind in ("ell", "box"):
            r = float(np.linalg.norm(s)) + self.rad
        elif self.kind == "cap":
            r = float(np.linalg.norm(s[0]) + np.linalg.norm(s[1])) + s[2]
        elif self.kind == "cyl":
            r = math.hypot(s[0], s[1]) + self.rad
        elif self.kind == "cone":
            r = max(s[0], s[1], s[2]) + s[2]
            r = float(r) * 1.2 + 2
        else:  # torus
            r = s[0] + s[1]
        return r + 1.0

    def sdf(self, Pm):
        q = (Pm - self.c) @ self.R  # R^T (p-c)
        k = self.kind
        s = self.size
        if k == "ell":
            r = np.array(s)
            k0 = np.linalg.norm(q / r, axis=1)
            k1 = np.linalg.norm(q / (r * r), axis=1)
            d = np.where(k1 > 1e-9, k0 * (k0 - 1) / np.maximum(k1, 1e-9), -np.min(r))
        elif k == "box":
            h = np.array(s)
            qq = np.abs(q) - h + self.rad
            d = np.linalg.norm(np.maximum(qq, 0), axis=1) + np.minimum(qq.max(axis=1), 0) - self.rad
        elif k == "cap":
            a = np.array(s[0]); b = np.array(s[1]); r = s[2]
            pa = q - a; ba = b - a
            h = np.clip((pa @ ba) / (ba @ ba), 0, 1)
            d = np.linalg.norm(pa - h[:, None] * ba, axis=1) - r
        elif k == "cyl":  # y ekseni, (r, yarım yükseklik)
            r, hh = s[0], s[1]
            dx = np.hypot(q[:, 0], q[:, 2]) - r + self.rad
            dy = np.abs(q[:, 1]) - hh + self.rad
            d = np.minimum(np.maximum(dx, dy), 0) + np.hypot(np.maximum(dx, 0), np.maximum(dy, 0)) - self.rad
        elif k == "cone":  # yuvarlak koni: y=0'da r1, y=h'de r2
            r1, r2, h = s
            qx = np.hypot(q[:, 0], q[:, 2]); qy = q[:, 1]
            b = (r1 - r2) / h
            a = math.sqrt(1 - b * b)
            kk = qx * (-b) + qy * a
            c1 = np.hypot(qx, qy) - r1
            c2 = np.hypot(qx, qy - h) - r2
            c3 = kk * 0 + (qx * a + qy * b) - r1
            d = np.where(kk < 0, c1, np.where(kk > a * h, c2, c3))
        else:  # torus: y ekseni (R, r)
            Rr, r = s
            d = np.hypot(np.hypot(q[:, 0], q[:, 2]) - Rr, q[:, 1]) - r
        if self.cut is not None:
            n, dd = self.cut
            n = np.array(n, float); n /= np.linalg.norm(n)
            d = np.maximum(d, -(q @ n - dd))
        return d

    def albedo(self, Pm):
        if self.stripe is None:
            return None
        q = (Pm - self.c) @ self.R
        ax, per, c2 = self.stripe
        m = (np.floor(q[:, ax] / per).astype(int) % 2) == 0
        out = np.tile(self.color, (len(Pm), 1))
        out[~m] = c2
        return out


def scene_sdf(prims, Pm):
    best = np.full(len(Pm), 1e9)
    idx = np.zeros(len(Pm), int)
    for i, p in enumerate(prims):
        d = p.sdf(Pm)
        m = d < best
        best = np.where(m, d, best)
        idx = np.where(m, i, idx)
    return best, idx


class Cam:
    def __init__(self, yaw_deg):
        self.yaw = math.radians(yaw_deg)
        e = ELEV
        self.d = np.array([0, -math.sin(e), -math.cos(e)])
        self.r = np.array([1, 0, 0])
        self.u = np.array([0, math.cos(e), -math.sin(e)])
        self.Ry = ry(self.yaw)

    def screen(self, Pm):
        W = Pm @ self.Ry.T
        return W @ self.r, W @ self.u, W @ self.d


def render(prims, cam, bbox=None):
    """Döner: rgb(H,W,3), alpha(H,W), depth(H,W), w*h SS çözünürlükte (FW*SS x FH*SS)"""
    Wd, Hd = FW * SS, FH * SS
    rgb = np.zeros((Hd, Wd, 3)); alpha = np.zeros((Hd, Wd)); depth = np.full((Hd, Wd), 1e9)
    if not prims:
        return rgb, alpha, depth
    # sınırlayıcı küre -> ekran kutusu
    cs = []; rs = []
    for p in prims:
        cs.append(p.c); rs.append(p.bound())
    cs = np.array(cs); rs = np.array(rs)
    sx, sy, sd = cam.screen(cs)
    x0 = float((sx - rs).min()); x1 = float((sx + rs).max())
    y0 = float((sy - rs).min()); y1 = float((sy + rs).max())
    px0 = max(0, int((FW / 2 + x0 * K) * SS) - 2); px1 = min(Wd, int((FW / 2 + x1 * K) * SS) + 3)
    py0 = max(0, int((FEET_PX - y1 * K) * SS) - 2); py1 = min(Hd, int((FEET_PX - y0 * K) * SS) + 3)
    if px1 <= px0 or py1 <= py0:
        return rgb, alpha, depth
    jj, ii = np.mgrid[py0:py1, px0:px1]
    scx = ((ii + 0.5) / SS - FW / 2) / K
    scy = (FEET_PX - (jj + 0.5) / SS) / K
    scx = scx.ravel(); scy = scy.ravel()
    n = len(scx)
    # ışın: dünya uzayında başlangıç O = sx*r + sy*u - T*d ; model uzayına çevir
    Tback = float(np.abs(sd).max() + rs.max() + 5)
    RyT = cam.Ry  # model = Ry^-1 W => satır vektörleri için W @ Ry
    Ow = scx[:, None] * cam.r[None] + scy[:, None] * cam.u[None] - Tback * cam.d[None]
    Om = Ow @ cam.Ry
    Dm = cam.d @ cam.Ry
    t = np.zeros(n)
    active = np.ones(n, bool)
    hit = np.zeros(n, bool)
    tmax = Tback * 2
    for _ in range(70):
        ids = np.nonzero(active)[0]
        if len(ids) == 0:
            break
        pts = Om[ids] + t[ids, None] * Dm[None]
        d, _i = scene_sdf(prims, pts)
        h = d < 0.02
        hit[ids[h]] = True
        t[ids] += np.maximum(d, 0.02) * 0.9
        active[ids[h]] = False
        active[ids[t[ids] > tmax]] = False
    hid = np.nonzero(hit)[0]
    if len(hid) == 0:
        return rgb, alpha, depth
    pts = Om[hid] + t[hid, None] * Dm[None]
    # normal (tetrahedron)
    e = 0.05
    ks = [np.array(v) for v in ([1, -1, -1], [-1, -1, 1], [-1, 1, -1], [1, 1, 1])]
    nrm = np.zeros_like(pts)
    for kv in ks:
        dd, _ = scene_sdf(prims, pts + kv[None] * e)
        nrm += kv[None] * dd[:, None]
    nrm /= np.maximum(np.linalg.norm(nrm, axis=1, keepdims=True), 1e-9)
    _, pid = scene_sdf(prims, pts)
    nw = nrm @ cam.Ry.T  # dünya
    diff = np.maximum(0, nw @ LIGHT)
    view = -cam.d
    ndv = np.clip(nw @ view, 0, 1)
    col = np.zeros((len(hid), 3)); emi = np.zeros(len(hid), bool); spec = np.zeros(len(hid))
    for i, p in enumerate(prims):
        m = pid == i
        if not m.any():
            continue
        a = p.albedo(pts[m])
        col[m] = a if a is not None else p.color[None]
        emi[m] = p.emissive
        spec[m] = p.spec
    sh = 0.50 + 0.55 * diff + 0.10 * (1 - ndv) ** 2
    hl = spec * (np.maximum(0, (nw @ ((LIGHT + view) / np.linalg.norm(LIGHT + view)))) ** 24)
    out = col * np.minimum(sh, 1.12)[:, None] + hl[:, None] * 0.55
    out = np.where(emi[:, None], np.minimum(col * 1.05, 1), out)
    out = np.clip(out, 0, 1)
    dep = (pts @ cam.Ry.T) @ cam.d
    H = py1 - py0; Wc = px1 - px0
    flat = np.zeros((n, 3)); flat[hid] = out
    fa = np.zeros(n); fa[hid] = 1
    fd = np.full(n, 1e9); fd[hid] = dep
    rgb[py0:py1, px0:px1] = flat.reshape(H, Wc, 3)
    alpha[py0:py1, px0:px1] = fa.reshape(H, Wc)
    depth[py0:py1, px0:px1] = fd.reshape(H, Wc)
    return rgb, alpha, depth


def outline(rgb, alpha, depth, strength=0.8, dark=0.16):
    """Siluet ve derinlik süreksizliklerine koyu çizgi (SS çözünürlükte)"""
    m = alpha > 0.5
    er = ndimage.binary_erosion(m, iterations=SS, border_value=0)
    edge = m & ~er
    dz = np.zeros_like(depth, bool)
    dd = np.where(m, depth, depth[m].max() if m.any() else 0)
    gx = np.abs(np.diff(dd, axis=1, prepend=dd[:, :1])) > 2.2
    gy = np.abs(np.diff(dd, axis=0, prepend=dd[:1])) > 2.2
    e2 = (gx | gy) & m
    e2 = e2 & ~ndimage.binary_erosion(e2, iterations=1) | (e2 & ndimage.binary_dilation(~e2, iterations=0))
    edge = edge | (gx | gy) & m & ndimage.binary_erosion(m, iterations=1, border_value=0)
    out = rgb.copy()
    out[edge] = out[edge] * (1 - strength) + dark * strength
    return out


def downsample(rgb, alpha):
    h, w = alpha.shape
    a = alpha.reshape(h // SS, SS, w // SS, SS).mean(axis=(1, 3))
    pm = (rgb * alpha[..., None]).reshape(h // SS, SS, w // SS, SS, 3).mean(axis=(1, 3))
    c = np.where(a[..., None] > 1e-4, pm / np.maximum(a[..., None], 1e-4), 0)
    return np.dstack([np.clip(c, 0, 1), a])


def composite_visible(layer, base_depth, tol=0.3):
    """Katman piksellerinden yalnızca gövdeden daha önde olanları tut"""
    rgb, alpha, depth = layer
    vis = (alpha > 0.5) & (depth < base_depth + tol)
    return rgb, np.where(vis, alpha, 0.0), np.where(vis, depth, 1e9)


def to_image(rgba):
    return Image.fromarray((rgba * 255 + 0.5).astype(np.uint8), "RGBA")
