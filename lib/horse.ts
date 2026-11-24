/** 4 yönlü süvari atı (tools/gen_horse3d.py): horse.png + rider_legs.png, 8 sütun x 4 satır, kare 320x304. */
export const HORSE_FW = 320;
export const HORSE_FH = 304;
export const HORSE_K = 1.2;
export const HORSE_DRAW_W = 80 * HORSE_K;
export const HORSE_DRAW_H = 76 * HORSE_K;
export const HORSE_FEET = 74 * HORSE_K;

const cache = new Map<string, HTMLImageElement>();
export function horseSheet(name: "horse" | "rider_legs"): HTMLImageElement | null {
  if (typeof window === "undefined") return null;
  let i = cache.get(name);
  if (!i) {
    i = new Image();
    i.src = `/sprites/horse/${name}.png`;
    cache.set(name, i);
  }
  return i.complete && i.naturalWidth > 0 ? i : null;
}

/** Atı ve binici bacaklarını çizer. Hazır değilse false (eski vektör ata dönülür). */
export function drawHorseSprite(ctx: CanvasRenderingContext2D, frame: number, dir: number, flip: number, part: "horse" | "rider_legs"): boolean {
  const img = horseSheet(part);
  if (!img) return false;
  ctx.save();
  if (flip === -1) ctx.scale(-1, 1); // dışarıdaki yatay çevirmeyi geri al (sheet 4 yönlü)
  ctx.drawImage(img, frame * HORSE_FW, dir * HORSE_FH, HORSE_FW, HORSE_FH, -HORSE_DRAW_W / 2, -HORSE_FEET, HORSE_DRAW_W, HORSE_DRAW_H);
  ctx.restore();
  return true;
}
