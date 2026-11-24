import { mipDraw } from "./mip";
import { offscreen } from "./view";
/**
 * PNG zemin ve duvar dokuları (tools/gen_tiles.py üretir, public/sprites/tiles).
 * Gri tonlu dokular tema rengiyle çarpılır; renkli kopyalar önbellekte tutulur.
 * Doku yüklenmediyse çağıran taraf eski kodla çizime döner.
 */
export const TILE_W = 256;
export const TILE_H = 128;
export const TILE_VARIANTS = 4;
export const WALL_W = 180;
export const WALL_H = 440;

export type FloorKind = "wood" | "sand" | "grass" | "brick" | "asphalt" | "soil" | "stone" | "marble" | "carpet" | "plain";
export type WallKind = "plaster" | "brick" | "wood" | "tile" | "metal" | "stone";
const FLOORS: FloorKind[] = ["wood", "sand", "grass", "brick", "asphalt", "soil", "stone", "marble", "carpet", "plain"];
const WALLS: WallKind[] = ["plaster", "brick", "wood", "tile", "metal", "stone"];

const imgs = new Map<string, HTMLImageElement>();
function img(name: string): HTMLImageElement | null {
  if (typeof window === "undefined") return null;
  let i = imgs.get(name);
  if (!i) {
    i = new Image();
    i.src = `/sprites/tiles/${name}.png`;
    imgs.set(name, i);
  }
  return i.complete && i.naturalWidth > 0 ? i : null;
}

const tinted = new Map<string, HTMLCanvasElement>();
function tint(key: string, src: HTMLImageElement, sx: number, sy: number, w: number, h: number, color: string): HTMLCanvasElement {
  let c = tinted.get(key);
  if (c) return c;
  c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  g.drawImage(src, sx, sy, w, h, 0, 0, w, h);
  g.globalCompositeOperation = "multiply";
  g.fillStyle = color;
  g.fillRect(0, 0, w, h);
  // doku gri tonlu olduğu için renk soluklaşır: hafifçe aydınlat
  g.globalCompositeOperation = "lighter";
  g.fillStyle = "rgba(255,255,255,0.10)";
  g.fillRect(0, 0, w, h);
  g.globalCompositeOperation = "destination-in";
  g.drawImage(src, sx, sy, w, h, 0, 0, w, h);
  tinted.set(key, c);
  return c;
}

export const isFloorKind = (k: string): k is FloorKind => (FLOORS as string[]).includes(k);

/** Zemin karosunu çizer; doku hazır değilse false döner. (sx,sy) karonun üst köşesi. */
export function drawFloorTex(ctx: CanvasRenderingContext2D, kind: string, color: string, variant: number, sx: number, sy: number, tileW: number, tileH: number): boolean {
  if (!isFloorKind(kind)) return false;
  const im = img(`floor_${kind}`);
  if (!im) return false;
  const v = ((variant % TILE_VARIANTS) + TILE_VARIANTS) % TILE_VARIANTS;
  const c = tint(`f|${kind}|${color}|${v}`, im, v * TILE_W, 0, TILE_W, TILE_H, color);
  mipDraw(ctx, c, 0, 0, c.width, c.height, sx - tileW / 2 - 0.4, sy - 0.2, tileW + 0.8, tileH + 0.4);
  return true;
}

/** Duvar dokusunu bir duvar boyunca çizer. a→b duvarın tabanı, wallH ekran yüksekliği. */
export function drawWallTex(
  ctx: CanvasRenderingContext2D,
  kind: WallKind,
  color: string,
  a: { sx: number; sy: number },
  b: { sx: number; sy: number },
  wallH: number,
  count: number,
): boolean {
  if (!WALLS.includes(kind)) return false;
  const im = img(`wall_${kind}`);
  if (!im) return false;
  const c = tint(`w|${kind}|${color}`, im, 0, 0, WALL_W, WALL_H, color);
  const dx = (b.sx - a.sx) / count;
  const dy = (b.sy - a.sy) / count;
  for (let i = 0; i < count; i++) {
    const x0 = a.sx + dx * i;
    const y0 = a.sy + dy * i - wallH;
    if (offscreen(x0 + dx / 2, y0 + wallH / 2, wallH + Math.abs(dx))) continue;
    ctx.save();
    // doku (0..W, 0..H) → paralelkenar
    ctx.transform(dx / WALL_W, dy / WALL_W, 0, wallH / WALL_H, x0, y0);
    ctx.drawImage(c, 0, 0, WALL_W + 1, WALL_H);
    ctx.restore();
  }
  return true;
}

export function wallKindFor(slug: string): WallKind {
  if (slug === "cadde-1" || slug === "restoran") return "brick";
  if (slug === "sahil-kasabasi" || slug === "iskele" || slug === "ciftlik") return "wood";
  if (slug === "maden") return "stone";
  if (slug === "avm" || slug === "avm-kat2" || slug === "emlak-ofisi") return "tile";
  if (slug === "hain-avi" || slug === "oyunika" || slug === "parti-oyunu" || slug === "tetris-arena") return "metal";
  return "plaster";
}
