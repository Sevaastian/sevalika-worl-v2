/**
 * Ortam ışığı: günün saatine göre gökyüzü tonu, lamba parlaması ve yönlü gölge ayarları.
 * Her karede motor `updateLighting()` çağırır; çizim kodu `lighting` nesnesini okur.
 */
export interface Lighting {
  /** Ekranı kaplayan ton (r,g,b) ve opaklık */
  tint: [number, number, number];
  tintAlpha: number;
  /** 0 = gündüz, 1 = tam gece: lamba/ateş parlaklığı */
  dark: number;
  /** Yönlü gölge: opaklık, yana yatma (güneş yönü) ve boy kısalığı */
  shadowAlpha: number;
  shadowSkew: number;
  shadowSquash: number;
}

export const lighting: Lighting = { tint: [0, 0, 0], tintAlpha: 0, dark: 0, shadowAlpha: 0.16, shadowSkew: 0.6, shadowSquash: 0.3 };

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const mix = (a: [number, number, number], b: [number, number, number], t: number): [number, number, number] => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

const NIGHT: [number, number, number] = [6, 12, 44];
const DAWN: [number, number, number] = [255, 160, 120];
const GOLD: [number, number, number] = [255, 150, 60];
const DUSK: [number, number, number] = [120, 70, 150];

/** h: yerel saat (0–24) */
export function updateLighting(h: number) {
  let tint = NIGHT;
  let a = 0.22;
  let dark = 1;
  if (h >= 5 && h < 7) {
    const t = (h - 5) / 2; // gece -> şafak
    tint = t < 0.5 ? mix(NIGHT, DAWN, t * 2) : DAWN;
    a = t < 0.5 ? lerp(0.22, 0.1, t * 2) : lerp(0.1, 0, (t - 0.5) * 2);
    dark = 1 - t;
  } else if (h >= 7 && h < 17) {
    tint = DAWN;
    a = 0;
    dark = 0;
  } else if (h >= 17 && h < 19) {
    const t = (h - 17) / 2; // gündüz -> altın saat
    tint = GOLD;
    a = lerp(0, 0.13, t);
    dark = 0.1 * t;
  } else if (h >= 19 && h < 21) {
    const t = (h - 19) / 2; // altın saat -> alacakaranlık -> gece
    tint = t < 0.5 ? mix(GOLD, DUSK, t * 2) : mix(DUSK, NIGHT, (t - 0.5) * 2);
    a = lerp(0.13, 0.22, t);
    dark = 0.1 + 0.9 * t;
  }
  lighting.tint = tint;
  lighting.tintAlpha = a;
  lighting.dark = dark;
  // Güneş doğudan (sabah) batıya (akşam): gölge karşı yöne yatar; öğlen kısa, sabah/akşam uzun
  const sunT = Math.max(0, Math.min(1, (h - 6) / 13)); // 06:00 -> 19:00
  const elev = Math.sin(sunT * Math.PI);
  lighting.shadowSkew = lerp(-0.9, 0.9, sunT);
  lighting.shadowSquash = lerp(0.46, 0.2, elev);
  lighting.shadowAlpha = h >= 6 && h <= 19.5 ? 0.17 * Math.min(1, elev * 2.2 + 0.25) : 0;
}

const silhouettes = new WeakMap<object, HTMLCanvasElement>();
/** Görselin siyah silüeti (önbellekli) */
export function silhouette(img: CanvasImageSource & { width: number; height: number }): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null;
  let c = silhouettes.get(img);
  if (!c) {
    c = document.createElement("canvas");
    c.width = img.width;
    c.height = img.height;
    const g = c.getContext("2d");
    if (!g) return null;
    g.drawImage(img, 0, 0);
    g.globalCompositeOperation = "source-in";
    g.fillStyle = "#000";
    g.fillRect(0, 0, c.width, c.height);
    silhouettes.set(img, c);
  }
  return c;
}
