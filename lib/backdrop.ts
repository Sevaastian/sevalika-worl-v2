/** Resimli (toon) arka planlı odalar. Zemin/duvar ızgaradan değil, tek bir PNG'den çizilir.
 *  Resim 2x çözünürlüktedir: ızgaranın (0,0) üst köşesi görüntüde (ox, head) noktasındadır (1x px). */
import type { Layout } from "./iso";

type Backdrop = { src: string; ox: number; head: number };

export const BACKDROPS: Record<string, Backdrop> = {
  // tools/gen_backdrop_cadde2.py ile üretilir (OX = rows*32, HEAD = 230)
  "cadde-2": { src: "/sprites/rooms/cadde-2.png", ox: 18 * 32, head: 230 },
};

const cache = new Map<string, HTMLImageElement>();

export function hasBackdrop(slug: string) {
  return slug in BACKDROPS;
}

/** Resim yüklendiyse çizer ve true döner (yüklenene kadar false: oda ızgaradan çizilir). */
export function drawBackdrop(ctx: CanvasRenderingContext2D, l: Layout, slug: string, vw: number, vh: number): boolean {
  const bd = BACKDROPS[slug];
  if (!bd || typeof Image === "undefined") return false;
  let im = cache.get(slug);
  if (!im) {
    im = new Image();
    im.src = bd.src;
    cache.set(slug, im);
  }
  if (!im.complete || im.naturalWidth === 0) return false;
  const k = l.scale / 2; // resim 2x
  const dx = l.originX - bd.ox * l.scale;
  const dy = l.originY - bd.head * l.scale;
  const dw = im.naturalWidth * k;
  const dh = im.naturalHeight * k;
  // yalnızca görünen dilimi çiz (büyük resim)
  const x0 = Math.max(0, -dx);
  const y0 = Math.max(0, -dy);
  const x1 = Math.min(dw, vw - dx);
  const y1 = Math.min(dh, vh - dy);
  if (x1 <= x0 || y1 <= y0) return true;
  ctx.drawImage(im, x0 / k, y0 / k, (x1 - x0) / k, (y1 - y0) / k, dx + x0, dy + y0, x1 - x0, y1 - y0);
  return true;
}
