import { mipDraw } from "./mip";
/**
 * Katmanlı karakter sistemi (v27: 3D'den üretilmiş, 4 yönlü).
 * public/sprites/avatar3/ altındaki PNG sheet'leri üst üste çizilir:
 *   body (ten), face, legs, shoes, shirt (tişört rengi), tp_* (kıyafet), hs_* (saç), hat_*, gl_*, bk_*.
 * Her sheet 8 sütun x 4 satırdır (kare 224x304 px): sütun 0 duruş, 1-6 yürüyüş, 7 oturuş; satır = yön (0 GD, 1 GB, 2 KB, 3 KD).
 * Gri tonlu parçalar oyunda renkle çarpılır (tint). Üretici: tools/gen_char3d.py; kendi PNG'lerini aynı ad/ölçüyle koyabilirsin.
 */
export const LAYER_FRAME_W = 224;
export const LAYER_FRAME_H = 304;
export const LAYER_FRAMES = 8;
/** 1x ölçekte çizim boyutu (kare/4) ve ayak noktası */
export const LAYER_DRAW_W = 56;
export const LAYER_DRAW_H = 76;
export const LAYER_FEET = 74;

const KEY = "sw_layered_avatar";
export function getLayeredPref(): boolean {
  try {
    return typeof window === "undefined" || window.localStorage.getItem(KEY) !== "0";
  } catch {
    return true;
  }
}
export function setLayeredPref(v: boolean) {
  try {
    window.localStorage.setItem(KEY, v ? "1" : "0");
  } catch {
    /* gizli sekme vb. */
  }
}

type Entry = { img: HTMLImageElement | null; status: "loading" | "ready" | "error" };
const images = new Map<string, Entry>();
const tinted = new Map<string, HTMLCanvasElement>();

function load(src: string): HTMLImageElement | null {
  if (typeof window === "undefined") return null;
  let e = images.get(src);
  if (!e) {
    const img = new Image();
    e = { img, status: "loading" };
    const entry = e;
    img.onload = () => (entry.status = "ready");
    img.onerror = () => (entry.status = "error");
    img.src = src;
    images.set(src, e);
  }
  return e.status === "ready" ? e.img : null;
}

/** Rengi çarparak boyanmış sheet (önbellekli) */
function tintedSheet(src: string, color: string | null): CanvasImageSource | null {
  const img = load(src);
  if (!img) return null;
  if (!color) return img;
  const key = `${src}|${color}`;
  let c = tinted.get(key);
  if (!c) {
    c = document.createElement("canvas");
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const g = c.getContext("2d");
    if (!g) return img;
    g.drawImage(img, 0, 0);
    g.globalCompositeOperation = "multiply";
    g.fillStyle = color;
    g.fillRect(0, 0, c.width, c.height);
    g.globalCompositeOperation = "destination-in";
    g.drawImage(img, 0, 0);
    tinted.set(key, c);
  }
  return c;
}

export interface LayerSpec {
  src: string;
  tint: string | null;
}

/** Tüm parçalar yüklendi mi? (hazır değilse klasik çizime dönülür) */
export function layersReady(specs: LayerSpec[]): boolean {
  let ok = true;
  for (const s of specs) if (!load(s.src)) ok = false;
  return ok;
}

/** frame: 0 duruş, 1-6 yürüyüş, 7 oturuş; dir: 0 GD, 1 GB, 2 KB, 3 KD */
export function drawLayer(ctx: CanvasRenderingContext2D, spec: LayerSpec, frame: number, dir: number, ay: number) {
  const sheet = tintedSheet(spec.src, spec.tint);
  if (!sheet) return;
  mipDraw(ctx, sheet, frame * LAYER_FRAME_W, dir * LAYER_FRAME_H, LAYER_FRAME_W, LAYER_FRAME_H, -LAYER_DRAW_W / 2, ay - LAYER_FEET, LAYER_DRAW_W, LAYER_DRAW_H);
}

const KNOWN_HAIR = ["hs_short", "hs_long", "hs_spiky", "hs_bun", "hs_afro", "hs_mohawk", "hs_pony", "hs_curly"];
const LAYERED_TOPS = ["tp_hoodie", "tp_stripe", "tp_suit", "tp_jersey", "tp_overalls", "tp_hawaii"];
const LAYERED_HATS = ["hat_beanie", "hat_cap", "hat_tophat", "hat_cowboy", "hat_crown", "hat_headphones", "hat_beret", "hat_bucket", "hat_wizard", "hat_pirate", "hat_flower", "hat_catears"];
const LAYERED_GLASSES = ["gl_nerd", "gl_shades", "gl_neon", "gl_star", "gl_round", "gl_heart", "gl_visor"];
const LAYERED_BACKS = ["bk_backpack", "bk_cape", "bk_angel", "bk_butterfly", "bk_devil"];
const inList = (l: string[], id: string | null | undefined) => !!id && l.includes(id);
export const hasLayeredTop = (id: string | null | undefined) => inList(LAYERED_TOPS, id);
export const hasLayeredHat = (id: string | null | undefined) => inList(LAYERED_HATS, id);
export const hasLayeredGlasses = (id: string | null | undefined) => inList(LAYERED_GLASSES, id);
export const hasLayeredBack = (id: string | null | undefined) => inList(LAYERED_BACKS, id);

export function bodyLayers(opts: {
  skin: string; shirt: string; hair: string; hairStyle: string; legs: boolean; faceFront: boolean;
  top?: string | null; hat?: string | null; glasses?: string | null; back?: string | null;
}): LayerSpec[] {
  const base = "/sprites/avatar3/";
  const style = KNOWN_HAIR.includes(opts.hairStyle) ? opts.hairStyle : "hs_short";
  const out: LayerSpec[] = [];
  if (hasLayeredBack(opts.back)) out.push({ src: `${base}${opts.back}.png`, tint: null });
  if (opts.legs) {
    out.push({ src: base + "legs.png", tint: null });
    out.push({ src: base + "shoes.png", tint: null });
  }
  out.push({ src: base + "body.png", tint: opts.skin });
  out.push({ src: base + "shirt.png", tint: opts.shirt });
  if (hasLayeredTop(opts.top)) out.push({ src: `${base}${opts.top}.png`, tint: null });
  if (opts.faceFront) out.push({ src: base + "face.png", tint: null });
  out.push({ src: `${base}${style}.png`, tint: opts.hair });
  if (hasLayeredHat(opts.hat)) out.push({ src: `${base}${opts.hat}.png`, tint: null });
  if (opts.faceFront && hasLayeredGlasses(opts.glasses)) out.push({ src: `${base}${opts.glasses}.png`, tint: null });
  return out;
}
