import { FURNI3D } from "./furni3d";
import { gfx } from "./settings";

/** 4 yönlü 3D eşya sheet'leri (tools/gen_furni3d.py): public/sprites/f3/<tür>.png, 4 sütun = rot 0..3. */
const sheets = new Map<string, HTMLImageElement>();
const frames = new Map<string, HTMLCanvasElement>();

export interface F3Frame {
  canvas: HTMLCanvasElement;
  fw: number;
  fh: number;
  feet: number;
}

/** Bu eşya+yön için 3D kare; kullanılmıyorsa/yüklenmediyse null. rot 0-1'de yalnız "3D eşyalar" açıkken kullanılır. */
export function f3Frame(type: string, rot: number): F3Frame | null {
  const m = FURNI3D[type];
  if (!m || typeof window === "undefined") return null;
  const r = ((rot ?? 0) % 4 + 4) % 4;
  if (r < 2 && !gfx.f3d) return null;
  let img = sheets.get(type);
  if (!img) {
    img = new Image();
    img.src = `/sprites/f3/${type}.png`;
    sheets.set(type, img);
  }
  if (!img.complete || img.naturalWidth === 0) return null;
  const key = `${type}|${r}`;
  let c = frames.get(key);
  if (!c) {
    c = document.createElement("canvas");
    c.width = m.fw;
    c.height = m.fh;
    c.getContext("2d")!.drawImage(img, r * m.fw, 0, m.fw, m.fh, 0, 0, m.fw, m.fh);
    frames.set(key, c);
  }
  return { canvas: c, fw: m.fw, fh: m.fh, feet: m.feet };
}
