import type { FurniType } from "./types";

export interface SpriteMeta {
  /** public/sprites/ altındaki dosya yolu */
  src: string;
  /** İzometrik ızgarada kapladığı genişlik (gx yönünde kare sayısı) */
  wTiles: number;
  /** İzometrik ızgarada kapladığı derinlik (gy yönünde kare sayısı) */
  hTiles: number;
  /** Ekranda çizilecek baz genişlik (px, 1x ölçekte) */
  drawW: number;
  /** Ekranda çizilecek baz yükseklik (px, 1x ölçekte) */
  drawH: number;
  /** Ayak noktasından X kaydırması (px) */
  offsetX?: number;
  /** Ayak noktasından yukarı doğru Y kaydırması (px) */
  offsetY?: number;
}

/**
 * PNG Sprite Tanımları:
 * Tüm görseller yüklenirken etraflarındaki şeffaf boşluklar otomatik kırpılır (auto-trim).
 * Böylece şezlonglar, banklar ve binalar zemine milimetrik olarak oturur.
 */
export const FURNI_SPRITES: Partial<Record<FurniType, SpriteMeta>> = {
  // Çok kareli (Multi-tile) büyük binalar
  beach_cafe: { src: "/sprites/beach_cafe.png", wTiles: 4, hTiles: 3, drawW: 270, drawH: 230, offsetX: -4, offsetY: 6 },
  dj_booth: { src: "/sprites/dj_booth.png", wTiles: 3, hTiles: 2, drawW: 235, drawH: 205, offsetX: 4, offsetY: 6 },
  tiki_bar: { src: "/sprites/tiki_bar.png", wTiles: 2, hTiles: 2, drawW: 215, drawH: 205, offsetX: -4, offsetY: 4 },

  fish_hut: { src: "/sprites/fish_hut.png", wTiles: 3, hTiles: 2, drawW: 152, drawH: 115, offsetX: -1, offsetY: 7 },
  mine_entrance: { src: "/sprites/mine_entrance.png", wTiles: 4, hTiles: 2, drawW: 170, drawH: 155, offsetX: -3, offsetY: 13 },
  ore_cart: { src: "/sprites/ore_cart.png", wTiles: 1, hTiles: 1, drawW: 47, drawH: 41, offsetX: -1, offsetY: 12 },
  store_fashion: { src: "/sprites/store_fashion.png", wTiles: 4, hTiles: 2, drawW: 161, drawH: 139, offsetX: 11, offsetY: -1 },
  store_tech: { src: "/sprites/store_tech.png", wTiles: 4, hTiles: 2, drawW: 161, drawH: 139, offsetX: 11, offsetY: -1 },
  store_food: { src: "/sprites/store_food.png", wTiles: 4, hTiles: 2, drawW: 161, drawH: 139, offsetX: 11, offsetY: -1 },
  mannequin: { src: "/sprites/mannequin.png", wTiles: 1, hTiles: 1, drawW: 27, drawH: 61, offsetX: 0, offsetY: 7 },
  bed: { src: "/sprites/bed.png", wTiles: 2, hTiles: 1, drawW: 90, drawH: 76, offsetX: -2, offsetY: 11 },
  clock_tower: { src: "/sprites/clock_tower.png", wTiles: 2, hTiles: 2, drawW: 85, drawH: 210, offsetX: 0, offsetY: 16 },
  fountain_big: { src: "/sprites/fountain_big.png", wTiles: 3, hTiles: 3, drawW: 123, drawH: 109, offsetX: 0, offsetY: -1 },
  food_truck: { src: "/sprites/food_truck.png", wTiles: 3, hTiles: 1, drawW: 125, drawH: 96, offsetX: -3, offsetY: 9 },
  stall_red: { src: "/sprites/stall_red.png", wTiles: 2, hTiles: 1, drawW: 91, drawH: 90, offsetX: 0, offsetY: 13 },
  stall_blue: { src: "/sprites/stall_blue.png", wTiles: 2, hTiles: 1, drawW: 91, drawH: 90, offsetX: 0, offsetY: 13 },
  billboard: { src: "/sprites/billboard.png", wTiles: 3, hTiles: 1, drawW: 97, drawH: 128, offsetX: 0, offsetY: 3 },
  car_red: { src: "/sprites/car_red.png", wTiles: 2, hTiles: 1, drawW: 81, drawH: 67, offsetX: 0, offsetY: 10 },
  car_blue: { src: "/sprites/car_blue.png", wTiles: 2, hTiles: 1, drawW: 81, drawH: 67, offsetX: 0, offsetY: 10 },
  car_yellow: { src: "/sprites/car_yellow.png", wTiles: 2, hTiles: 1, drawW: 81, drawH: 67, offsetX: 0, offsetY: 10 },
  flower_bed: { src: "/sprites/flower_bed.png", wTiles: 3, hTiles: 1, drawW: 116, drawH: 68, offsetX: 0, offsetY: 13 },
  bus_stop: { src: "/sprites/bus_stop.png", wTiles: 3, hTiles: 1, drawW: 132, drawH: 108, offsetX: 4, offsetY: 14 },
  phone_booth: { src: "/sprites/phone_booth.png", wTiles: 1, hTiles: 1, drawW: 43, drawH: 65, offsetX: 0, offsetY: 10 },
  casino_bar: { src: "/sprites/casino_bar.png", wTiles: 4, hTiles: 2, drawW: 175, drawH: 137, offsetX: 4, offsetY: 9 },
  kitchen_block: { src: "/sprites/kitchen_block.png", wTiles: 4, hTiles: 2, drawW: 171, drawH: 137, offsetX: 6, offsetY: 7 },
  barn: { src: "/sprites/barn.png", wTiles: 4, hTiles: 3, drawW: 207, drawH: 153, offsetX: -4, offsetY: 11 },

  // Tek kareli yüksek kaliteli eşyalar
  palm: { src: "/sprites/palm.png", wTiles: 1, hTiles: 1, drawW: 96, drawH: 122, offsetY: 2 },
  tree: { src: "/sprites/tree.png", wTiles: 1, hTiles: 1, drawW: 102, drawH: 118, offsetY: 2 },
  lounger: { src: "/sprites/lounger.png", wTiles: 1, hTiles: 1, drawW: 78, drawH: 52, offsetY: -2 },
  umbrella: { src: "/sprites/umbrella.png", wTiles: 1, hTiles: 1, drawW: 84, drawH: 98, offsetY: 2 },
  campfire: { src: "/sprites/campfire.png", wTiles: 1, hTiles: 1, drawW: 72, drawH: 64, offsetY: -2 },
  kiosk: { src: "/sprites/kiosk.png", wTiles: 1, hTiles: 1, drawW: 138, drawH: 146, offsetY: 2 },

  // v8: Claude tarafından çizilen piksel-art sprite'lar (public/sprites)
  sofa: { src: "/sprites/sofa.png", wTiles: 1, hTiles: 1, drawW: 62, drawH: 54, offsetX: 0, offsetY: 16 },
  chair: { src: "/sprites/chair.png", wTiles: 1, hTiles: 1, drawW: 38, drawH: 44, offsetX: 0, offsetY: 10 },
  table: { src: "/sprites/table.png", wTiles: 1, hTiles: 1, drawW: 46, drawH: 41, offsetX: 0, offsetY: 7 },
  counter: { src: "/sprites/counter.png", wTiles: 1, hTiles: 1, drawW: 75, drawH: 61, offsetX: 0, offsetY: 18 },
  casinotable: { src: "/sprites/casinotable.png", wTiles: 1, hTiles: 1, drawW: 76, drawH: 62, offsetX: 0, offsetY: 12 },
  bin: { src: "/sprites/bin.png", wTiles: 1, hTiles: 1, drawW: 32, drawH: 38, offsetX: 0, offsetY: 7 },
  bookshelf: { src: "/sprites/bookshelf.png", wTiles: 1, hTiles: 1, drawW: 59, drawH: 75, offsetX: 0, offsetY: 15 },
  tv: { src: "/sprites/tv.png", wTiles: 1, hTiles: 1, drawW: 40, drawH: 50, offsetX: 0, offsetY: 5 },
  plant: { src: "/sprites/plant.png", wTiles: 1, hTiles: 1, drawW: 46, drawH: 62, offsetX: 0, offsetY: 6 },
  lamp: { src: "/sprites/lamp.png", wTiles: 1, hTiles: 1, drawW: 22, drawH: 60, offsetX: 0, offsetY: 6 },
  logseat: { src: "/sprites/logseat.png", wTiles: 1, hTiles: 1, drawW: 48, drawH: 34, offsetX: 0, offsetY: 12 },
  beanbag: { src: "/sprites/beanbag.png", wTiles: 1, hTiles: 1, drawW: 46, drawH: 38, offsetX: -1, offsetY: 12 },
  surfboard: { src: "/sprites/surfboard.png", wTiles: 1, hTiles: 1, drawW: 23, drawH: 58, offsetX: 0, offsetY: 6 },
  fountain: { src: "/sprites/fountain.png", wTiles: 1, hTiles: 1, drawW: 51, drawH: 54, offsetX: 0, offsetY: 13 },
  streetlight: { src: "/sprites/streetlight.png", wTiles: 1, hTiles: 1, drawW: 30, drawH: 118, offsetY: 4 },
  bench: { src: "/sprites/bench.png", wTiles: 1, hTiles: 1, drawW: 76, drawH: 56, offsetY: -2 },
};

type CacheEntry = {
  source: CanvasImageSource | null;
  status: "loading" | "ready" | "error";
};

/**
 * PNG görselinin etrafındaki gereksiz şeffaf pikselleri keserek
 * alt kenarının doğrudan izometrik zemine basmasını sağlar.
 */
function trimTransparentPadding(img: HTMLImageElement): CanvasImageSource {
  try {
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (!w || !h) return img;

    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    if (!ctx) return img;

    ctx.drawImage(img, 0, 0);
    const { data } = ctx.getImageData(0, 0, w, h);

    let minX = w;
    let minY = h;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < h; y++) {
      const rowOffset = y * w * 4;
      for (let x = 0; x < w; x++) {
        if (data[rowOffset + x * 4 + 3] > 12) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (maxX < minX || maxY < minY) return img;

    const trimW = maxX - minX + 1;
    const trimH = maxY - minY + 1;
    const out = document.createElement("canvas");
    out.width = trimW;
    out.height = trimH;
    const outCtx = out.getContext("2d");
    if (!outCtx) return img;

    outCtx.drawImage(c, minX, minY, trimW, trimH, 0, 0, trimW, trimH);
    return out;
  } catch {
    return img;
  }
}

class SpriteManager {
  private cache = new Map<string, CacheEntry>();

  /** Görseli getirir; henüz yüklenmediyse arka planda yüklemeyi başlatır ve null döner. */
  get(src: string): CanvasImageSource | null {
    if (typeof window === "undefined") return null;

    let entry = this.cache.get(src);
    if (!entry) {
      const img = new Image();
      entry = { source: null, status: "loading" };
      img.onload = () => {
        entry!.source = trimTransparentPadding(img);
        entry!.status = "ready";
      };
      img.onerror = () => {
        entry!.status = "error";
      };
      img.src = src;
      this.cache.set(src, entry);
    }

    return entry.status === "ready" ? entry.source : null;
  }

  /** Önceden yükleme (preload) başlatır */
  preloadAll() {
    for (const meta of Object.values(FURNI_SPRITES)) {
      if (meta) this.get(meta.src);
    }
  }
}

export const sprites = new SpriteManager();
