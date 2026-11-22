/**
 * Katmanlı karakter sistemi.
 * public/sprites/avatar/ altındaki PNG parçaları üst üste çizilir:
 *   legs, body (ten rengi), shirt (tişört rengi), hs_<stil> (saç rengi; _b = arkadan), face.
 * Her dosya 5 kareli yatay sheet'tir (kare 160x240 px): kare 0 duruş, 1–4 yürüyüş.
 * Parçalar gri tonlu çizilir; oyun ten/saç/tişört rengini çarparak uygular (tint).
 * Yeni parça eklemek için aynı ölçülerde PNG koyman yeterli (bkz. docs/SPRITE-REHBERI.md).
 */
export const LAYER_FRAME_W = 160;
export const LAYER_FRAME_H = 240;
export const LAYER_FRAMES = 5;
/** 1x ölçekte çizim boyutu (kare/4) ve ayak noktası kaydırması */
export const LAYER_DRAW_W = 40;
export const LAYER_DRAW_H = 60;
export const LAYER_FEET = 58;

const KEY = "sw_layered_avatar";
export function getLayeredPref(): boolean {
  try {
    return typeof window !== "undefined" && window.localStorage.getItem(KEY) === "1";
  } catch {
    return false;
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
  /** hareketli parça: kare yürüyüşle değişir; false ise hep kare 0 */
  animated: boolean;
}

/** Tüm parçalar yüklendi mi? (hazır değilse klasik çizime dönülür) */
export function layersReady(specs: LayerSpec[]): boolean {
  let ok = true;
  for (const s of specs) if (!load(s.src)) ok = false;
  return ok;
}

export function drawLayer(ctx: CanvasRenderingContext2D, spec: LayerSpec, frame: number, ay: number) {
  const sheet = tintedSheet(spec.src, spec.tint);
  if (!sheet) return;
  const f = spec.animated ? frame : 0;
  ctx.drawImage(sheet, f * LAYER_FRAME_W, 0, LAYER_FRAME_W, LAYER_FRAME_H, -LAYER_DRAW_W / 2, ay - LAYER_FEET, LAYER_DRAW_W, LAYER_DRAW_H);
}

const KNOWN_HAIR = ["hs_short", "hs_long", "hs_spiky", "hs_bun", "hs_afro", "hs_mohawk", "hs_pony", "hs_curly"];

export function bodyLayers(opts: { skin: string; shirt: string; hair: string; hairStyle: string; back: boolean; legs: boolean }): { under: LayerSpec[]; over: LayerSpec[] } {
  const base = "/sprites/avatar/";
  const style = KNOWN_HAIR.includes(opts.hairStyle) ? opts.hairStyle : "hs_short";
  const under: LayerSpec[] = [];
  if (opts.legs) under.push({ src: base + "legs.png", tint: null, animated: true });
  under.push({ src: base + "body.png", tint: opts.skin, animated: true });
  under.push({ src: base + "shirt.png", tint: opts.shirt, animated: true });
  const over: LayerSpec[] = [{ src: base + `${style}${opts.back ? "_b" : ""}.png`, tint: opts.hair, animated: false }];
  if (!opts.back) over.push({ src: base + "face.png", tint: null, animated: true });
  return { under, over };
}
