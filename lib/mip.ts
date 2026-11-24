/** Büyük sprite sheet'lerini ekranda küçük çizerken her karede ağır küçültme yapmamak için yarım boyutlu (mip) kopyalar. */
type Src = HTMLImageElement | HTMLCanvasElement;
type AnySrc = CanvasImageSource;
const frames = new WeakMap<object, Map<string, HTMLCanvasElement>>();
const cache = new WeakMap<object, HTMLCanvasElement[]>();

function level(src: Src, L: number): HTMLCanvasElement | null {
  let arr = cache.get(src);
  if (!arr) { arr = []; cache.set(src, arr); }
  for (let i = arr.length; i < L; i++) {
    const prev: Src = i === 0 ? src : arr[i - 1];
    const w = Math.max(1, Math.round((src.width || (src as HTMLImageElement).naturalWidth) / 2 ** (i + 1)));
    const h = Math.max(1, Math.round((src.height || (src as HTMLImageElement).naturalHeight) / 2 ** (i + 1)));
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const g = c.getContext("2d");
    if (!g) return null;
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = "high";
    g.drawImage(prev, 0, 0, w, h);
    arr.push(c);
  }
  return arr[L - 1] ?? null;
}

/** drawImage(src, sx,sy,sw,sh, dx,dy,dw,dh) ile aynı; kaynak hedefin 1.4 katından büyükse mip kullanır. */
export function mipDraw(ctx: CanvasRenderingContext2D, src0: AnySrc, sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number) {
  const src = src0 as Src;
  if (!(src instanceof HTMLImageElement) && !(src instanceof HTMLCanvasElement)) { ctx.drawImage(src0, sx, sy, sw, sh, dx, dy, dw, dh); return; }
  const t = ctx.getTransform();
  const need = (dw * Math.hypot(t.a, t.b)) / sw; // kaynak pikseli başına çıktı pikseli
  let L = 0;
  if (need > 0 && need < 0.7) L = Math.min(4, Math.floor(Math.log2(1 / need)));
  const m: Src | null = L > 0 ? level(src, L) : src;
  if (!m) { ctx.drawImage(src, sx, sy, sw, sh, dx, dy, dw, dh); return; }
  const mw = m.width || (m as HTMLImageElement).naturalWidth;
  const k = mw / (src.width || (src as HTMLImageElement).naturalWidth);
  const rx = Math.round(sx * k), ry = Math.round(sy * k), rw = Math.max(1, Math.round(sw * k)), rh = Math.max(1, Math.round(sh * k));
  const mh = m.height || (m as HTMLImageElement).naturalHeight;
  // Sheet'in küçük bir parçasıysa: parçayı kendi küçük canvas'ına bir kez kopyala (büyük sheet'ten her karede alt-dikdörtgen çizmek yavaş)
  if (rw * rh < mw * mh * 0.5) {
    let fm = frames.get(m);
    if (!fm) { fm = new Map(); frames.set(m, fm); }
    const key = rx + "," + ry + "," + rw + "," + rh;
    let fc = fm.get(key);
    if (!fc) {
      fc = document.createElement("canvas");
      fc.width = rw; fc.height = rh;
      fc.getContext("2d")?.drawImage(m, rx, ry, rw, rh, 0, 0, rw, rh);
      fm.set(key, fc);
    }
    ctx.drawImage(fc, 0, 0, rw, rh, dx, dy, dw, dh);
    return;
  }
  ctx.drawImage(m, rx, ry, rw, rh, dx, dy, dw, dh);
}
