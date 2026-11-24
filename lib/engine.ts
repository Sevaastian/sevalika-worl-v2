import { mipDraw } from "./mip";
import { BASE_TILE_H, BASE_TILE_W, FURNI_BY_TYPE, GRID_SIZE, isWaterTile, PARTI_PODIUM } from "./constants";
import { setView, offscreen } from "./view";
import { drawAvatar, drawBubble, drawFlag, drawFurni, drawHainBody, drawHainMark, drawHainWall, drawPet, drawPodiumBlock, podiumLift, drawRock, drawRoom, drawRug, roomRocks, roomWalls } from "./draw";
import { VEH_FW, VEH_FH, VEH_FEET, vehicleSheet } from "./vehicles";
import { CHAR_K, WORLD_ZOOM_LARGE, WORLD_ZOOM_LARGE_MOBILE, getLayout, gridToScreen, inGrid, screenToGrid, type Layout } from "./iso";
import { lighting, updateLighting } from "./ambience";
import { gfx } from "./settings";
import { findPath } from "./pathfinding";
import { FURNI_SPRITES, sprites } from "./sprites";
import type { ChatBubble, Emote, FurniItem, Player, RoomDef, Tile, WeatherMode } from "./types";

const WALK_SPEED = 3.4; // kare/sn
const HORSE_SPEED = 6.4; // süvari atı: yürümeden ~%90 hızlı (sunucu limiti 7 kare/sn + tolerans)
const BUBBLE_LIFETIME_MS = 6500;
const EMOTE_LIFETIME_MS = 2400;

/**
 * Canvas oyun motoru. React'ten bağımsızdır: Game bileşeni bunu oluşturur,
 * `players`, `furni`, `bubbles` alanlarını günceller ve `onArrive` ile bilgilendirilir.
 */
export class GameEngine {
  players: Player[] = [];
  bubbles: ChatBubble[] = [];
  emotes: Emote[] = [];
  /** Gerçek saate göre gece/gündüz tonlaması */
  nightEnabled = true;
  weather: WeatherMode = "auto";
  flag: Tile | null = null;
  /** Hain Avı: ceset ve görev işaretleri (bu istemciye özel) */
  /** Hain Avı: görüş yarıçapı (kare); null = sınırsız */
  vision: number | null = null;
  private wallCache: { slug: string; set: Set<number> } | null = null;
  bodies: { gx: number; gy: number; color: string; name: string }[] = [];
  marks: { gx: number; gy: number; icon: string; done: boolean }[] = [];
  private pets = new Map<string, { gx: number; gy: number; moving: boolean }>();
  private flakes: { x: number; y: number; v: number; r: number }[] = [];
  /** Mevsim parçacıkları (sonbahar yaprağı, bahar yaprağı/çiçek) */
  private motes: { x: number; y: number; v: number; r: number; ph: number; c: number }[] = [];
  /** Gökyüzünden geçen kuşlar */
  private birds: { x: number; y: number; v: number; ph: number }[] = [];
  private nextBird = 0;
  /** Etkinlik teması (konfeti, havai fişek, fener, balon, kar) */
  eventTheme: string | null = null;
  private fx: { x: number; y: number; vx: number; vy: number; life: number; max: number; c: string; r: number; k: number }[] = [];
  private nextBurst = 0;
  /** Caddede yavaşça geçen süs araçları (çarpışma yok; yaya önlerindeyse bekler) */
  private traffic: { type: string; lane: number; x: number; dir: 1 | -1; v: number }[] = [];

  furni: FurniItem[] = [];
  hover: Tile | null = null;
  buildMode = false;
  myId = "";

  /** Benim karakterim bir yolun sonuna vardığında çağrılır. */
  onArrive: ((tile: Tile) => void) | null = null;

  private ctx: CanvasRenderingContext2D;
  private room: RoomDef;
  private raf = 0;
  private lastTs = 0;
  private width = 0;
  private height = 0;
  private layout: Layout = getLayout(900, 600);

  /** Akıcı kamera koordinatları (izometrik dünya uzayında) */
  private camX = 0;
  private camY = 0;
  private camReady = false;

  constructor(
    private canvas: HTMLCanvasElement,
    room: RoomDef,
  ) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas desteklenmiyor");
    this.ctx = ctx;
    this.room = room;
    sprites.preloadAll();
  }

  private get cols() {
    return this.room.cols ?? GRID_SIZE;
  }

  private get rows() {
    return this.room.rows ?? GRID_SIZE;
  }

  /** Kamerayı sıfırlamadan sadece renk temasını değiştirir (ev dekoru) */
  setTheme(theme: RoomDef["theme"]) {
    this.room = { ...this.room, theme };
  }

  setRoom(room: RoomDef) {
    this.room = room;
    this.hover = null;
    this.camReady = false;
  }

  start() {
    const loop = (ts: number) => {
      const dt = this.lastTs ? Math.min(0.1, (ts - this.lastTs) / 1000) : 0;
      this.lastTs = ts;
      this.update(dt);
      this.render(ts);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    cancelAnimationFrame(this.raf);
  }

  /* ---------------- Oyuncu yönetimi ---------------- */

  me(): Player | undefined {
    return this.players.find((p) => p.id === this.myId);
  }

  /* ---------------- Izgara / yol bulma ---------------- */

  /** Bir eşyanın kapladığı tüm kareleri (çok kareli binalar dahil) hesaplar */
  private getFurniFootprint(f: FurniItem): { wTiles: number; hTiles: number } {
    const def = FURNI_BY_TYPE[f.type];
    const sp = FURNI_SPRITES[f.type];
    const w = sp?.wTiles ?? def?.wTiles ?? 1;
    const h = sp?.hTiles ?? def?.hTiles ?? 1;
    // Döndürülmüş (rot=1) çok kareli eşyalarda genişlik ve derinlik yer değiştirir
    return (f.rot ?? 0) % 2 === 1 ? { wTiles: h, hTiles: w } : { wTiles: w, hTiles: h };
  }

  private blockedTiles(goal?: Tile) {
    const cols = this.cols;
    const rows = this.rows;
    const set = new Set<number>();
    for (const f of this.furni) {
      if (!FURNI_BY_TYPE[f.type]?.blocks) continue;
      const { wTiles, hTiles } = this.getFurniFootprint(f);
      for (let dx = 0; dx < wTiles; dx++) {
        for (let dy = 0; dy < hTiles; dy++) {
          const tx = f.gx + dx;
          const ty = f.gy + dy;
          if (tx < cols && ty < rows) set.add(ty * cols + tx);
        }
      }
    }
    for (const pl of this.players) if (pl.isNpc) set.add(Math.round(pl.gy) * cols + Math.round(pl.gx));
    for (const [rx, ry] of roomRocks(this.room.slug)) set.add(ry * cols + rx);
    for (const [wx, wy] of roomWalls(this.room.slug)) set.add(wy * cols + wx);
    for (let gx = 0; gx < cols; gx++) {
      for (let gy = 0; gy < rows; gy++) {
        if (isWaterTile(this.room.slug, gx, gy)) set.add(gy * cols + gx);
      }
    }
    for (const p of this.room.portals) {
      if (!goal || goal.gx !== p.gx || goal.gy !== p.gy) set.add(p.gy * cols + p.gx);
    }
    return set;
  }

  /** `from` -> `to` yolu; yoksa null. Başlangıç karesi dahil değil. */
  computePath(from: Tile, to: Tile): Tile[] | null {
    const cols = this.cols;
    const rows = this.rows;
    if (!inGrid(to.gx, to.gy, cols, rows)) return null;
    const blocked = this.blockedTiles(to);
    return findPath(from, to, (gx, gy) => blocked.has(gy * cols + gx), cols, rows);
  }

  isWaterTile(tile: Tile): boolean {
    return isWaterTile(this.room.slug, tile.gx, tile.gy);
  }

  portalAt(tile: Tile) {
    return this.room.portals.find((p) => p.gx === tile.gx && p.gy === tile.gy);
  }

  tileAtClient(clientX: number, clientY: number): Tile | null {
    const rect = this.canvas.getBoundingClientRect();
    const { gx, gy } = screenToGrid(clientX - rect.left, clientY - rect.top, this.layout);
    return inGrid(gx, gy, this.cols, this.rows) ? { gx, gy } : null;
  }

  /** Tıklanan noktadaki (kendim hariç) oyuncu; en öndeki döner. */
  playerAtClient(clientX: number, clientY: number): Player | undefined {
    const rect = this.canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const s = Math.max(0.75, this.layout.scale) * CHAR_K;
    let best: Player | undefined;
    for (const p of this.players) {
      if (p.id === this.myId) continue;
      const { sx, sy } = gridToScreen(p.gx, p.gy, this.layout);
      const feetY = sy + this.layout.tileH / 2;
      const lift = p.isRidingHorse ? 14 : 0;
      if (Math.abs(x - sx) <= 17 * s && y >= feetY - (52 + lift) * s && y <= feetY + 8 * s) {
        if (!best || p.gx + p.gy > best.gx + best.gy) best = p;
      }
    }
    return best;
  }

  /**
   * Sürükleme bırakılınca: eşyanın görsel konumuna en yakın kareyi bulur, eşyayı o kareye taşır ve
   * kalan farkı piksel kaydırması olarak bırakır (böylece kapladığı kare ile göründüğü yer uyuşur,
   * karakterler eşyanın içinden geçemez). Yeni kare geçersizse null döner (eşya değişmez).
   */
  settleFurni(f: FurniItem): { gx: number; gy: number; ox: number; oy: number } | null {
    const ox = f.ox ?? 0;
    const oy = f.oy ?? 0;
    const hw = BASE_TILE_W / 2;
    const hh = BASE_TILE_H / 2;
    const dgx = Math.round((ox / hw + oy / hh) / 2);
    const dgy = Math.round((oy / hh - ox / hw) / 2);
    if (dgx === 0 && dgy === 0) return { gx: f.gx, gy: f.gy, ox, oy };
    const gx = f.gx + dgx;
    const gy = f.gy + dgy;
    const { wTiles, hTiles } = this.getFurniFootprint(f);
    if (gx < 0 || gy < 0 || gx + wTiles > this.cols || gy + hTiles > this.rows) return null;
    const isFloor = FURNI_BY_TYPE[f.type]?.floor ?? false;
    for (let x = gx; x < gx + wTiles; x++) {
      for (let y = gy; y < gy + hTiles; y++) {
        if (isWaterTile(this.room.slug, x, y)) return null;
        if (this.room.portals.some((p) => p.gx === x && p.gy === y)) return null;
      }
    }
    for (const o of this.furni) {
      if (o.id === f.id || (FURNI_BY_TYPE[o.type]?.floor ?? false) !== isFloor) continue;
      const fp = this.getFurniFootprint(o);
      if (o.gx < gx + wTiles && gx < o.gx + fp.wTiles && o.gy < gy + hTiles && gy < o.gy + fp.hTiles) return null;
    }
    return { gx, gy, ox: ox - (dgx - dgy) * hw, oy: oy - (dgx + dgy) * hh };
  }

  scaleNow(): number {
    return this.layout.scale;
  }

  /** Ekran noktasındaki eşya (görsel kutusuna göre, serbest konum ve ölçek dahil); en öndeki döner. */
  furniPickAt(clientX: number, clientY: number): FurniItem | undefined {
    const rect = this.canvas.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    const l = this.layout;
    let best: FurniItem | undefined;
    let bestDepth = -Infinity;
    for (const f of this.furni) {
      const { wTiles, hTiles } = this.getFurniFootprint(f);
      const c = gridToScreen(f.gx + (wTiles - 1) / 2, f.gy + (hTiles - 1) / 2, l);
      const sp = FURNI_SPRITES[f.type];
      const sc = (f.sc ?? 100) / 100;
      const w = (sp?.drawW ?? l.tileW * wTiles) * l.scale * sc;
      const h = (sp?.drawH ?? l.tileH * 2.5) * l.scale * sc;
      const ax = c.sx + (f.ox ?? 0) * l.scale;
      const ay = c.sy + l.tileH * ((wTiles + hTiles) / 4) + (f.oy ?? 0) * l.scale + (sp ? (sp.offsetY ?? 6) * l.scale * sc : 0);
      const axx = ax + (sp ? (sp.offsetX ?? 0) * l.scale * sc : 0);
      if (px < axx - w / 2 || px > axx + w / 2 || py < ay - h || py > ay + l.tileH * 0.6) continue;
      const depth = f.gx + f.gy + wTiles + hTiles + ((FURNI_BY_TYPE[f.type]?.floor ?? false) ? -100 : 0);
      if (depth >= bestDepth) {
        bestDepth = depth;
        best = f;
      }
    }
    return best;
  }

  furniAt(tile: Tile, floorLayer: boolean | null = null): FurniItem | undefined {
    for (let i = this.furni.length - 1; i >= 0; i--) {
      const f = this.furni[i];
      const { wTiles, hTiles } = this.getFurniFootprint(f);
      const inFootprint = tile.gx >= f.gx && tile.gx < f.gx + wTiles && tile.gy >= f.gy && tile.gy < f.gy + hTiles;
      if (!inFootprint) continue;
      const isFloor = FURNI_BY_TYPE[f.type]?.floor ?? false;
      if (floorLayer === null || floorLayer === isFloor) return f;
    }
    return undefined;
  }

  /* ---------------- Güncelleme ---------------- */

  private update(dt: number) {
    for (const p of this.players) {
      const riding = p.isRidingHorse;
      let step = (riding ? HORSE_SPEED : WALK_SPEED) * (p.speedMul ?? 1) * dt;
      if (p.path.length === 0 && p.speedMul) p.speedMul = undefined;

      while (step > 0 && p.path.length > 0) {
        p.isSitting = false;
        const next = p.path[0];
        const dx = next.gx - p.gx;
        const dy = next.gy - p.gy;
        const dist = Math.hypot(dx, dy);
        if (dist > 0.001) p.dir = Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 0 : 2) : dy > 0 ? 1 : 3;
        if (dist <= step) {
          p.gx = next.gx;
          p.gy = next.gy;
          p.path.shift();
          step -= dist;
          if (p.path.length === 0) this.arrived(p);
        } else {
          p.gx += (dx / dist) * step;
          p.gy += (dy / dist) * step;
          step = 0;
        }
      }
    }

    // Evcil hayvanlar sahiplerini takip eder
    for (const p of this.players) {
      if (!p.pet) {
        this.pets.delete(p.id);
        continue;
      }
      const pet = this.pets.get(p.id) ?? { gx: p.gx - 1, gy: p.gy, moving: false };
      const dx = p.gx - pet.gx;
      const dy = p.gy - pet.gy;
      const dist = Math.hypot(dx, dy);
      if (dist > 8) {
        pet.gx = p.gx - 1;
        pet.gy = p.gy;
      } else if (dist > 1.2) {
        const stepLen = Math.min(dist - 1.1, 4.6 * dt);
        pet.gx += (dx / dist) * stepLen;
        pet.gy += (dy / dist) * stepLen;
        pet.moving = true;
      } else pet.moving = false;
      this.pets.set(p.id, pet);
    }
    for (const id of this.pets.keys()) if (!this.players.some((p) => p.id === id)) this.pets.delete(id);

    // Akıcı kamera takibi
    this.updateCamera(dt);

    // Hava durumu parçacıkları
    const mode = this.effectiveWeather();
    const want = mode === "rain" ? 90 : mode === "snow" ? 70 : 0;
    while (this.flakes.length < want) this.flakes.push({ x: Math.random(), y: Math.random(), v: 0.5 + Math.random() * 0.8, r: 1 + Math.random() * 1.8 });
    if (this.flakes.length > want) this.flakes.length = want;
    for (const f of this.flakes) {
      f.y += (mode === "rain" ? 1.6 : 0.18) * f.v * dt;
      if (mode === "snow") f.x += Math.sin(f.y * 12 + f.r) * 0.02 * dt;
      if (f.y > 1) {
        f.y = -0.02;
        f.x = Math.random();
      }
    }

    this.updateAmbient(dt, mode);
    this.updateEventFx(dt);
    for (const p of this.players) p.emoteAnim = null;
    for (const e of this.emotes) {
      const pl = this.players.find((x) => x.id === e.playerId);
      if (pl) pl.emoteAnim = e.emoji;
    }

    const t = performance.now();
    this.bubbles = this.bubbles.filter((b) => t - b.createdAt < BUBBLE_LIFETIME_MS);
    this.emotes = this.emotes.filter((e) => t - e.createdAt < EMOTE_LIFETIME_MS);
  }

  private isOutdoor(): boolean {
    const slug = this.room.slug;
    return !(slug === "restoran" || slug === "avm" || slug === "avm-kat2" || slug === "emlak-ofisi" || slug === "oyunika" || slug === "parti-oyunu" || slug === "tetris-arena" || slug === "hain-avi" || slug === "monako-kulup" || slug.startsWith("home-"));
  }

  private season(): "autumn" | "spring" | "winter" | "summer" {
    const m = new Date().getMonth();
    if (m >= 8 && m <= 10) return "autumn";
    if (m >= 2 && m <= 4) return "spring";
    if (m === 11 || m <= 1) return "winter";
    return "summer";
  }

  private updateAmbient(dt: number, weather: "none" | "rain" | "snow") {
    const outdoor = this.isOutdoor();
    // Mevsim parçacıkları
    const season = this.season();
    const wantMotes = !gfx.low && outdoor && weather === "none" && (season === "autumn" || season === "spring") ? 26 : 0;
    while (this.motes.length < wantMotes) this.motes.push({ x: Math.random(), y: Math.random(), v: 0.05 + Math.random() * 0.07, r: 2 + Math.random() * 2.2, ph: Math.random() * 6.28, c: Math.floor(Math.random() * 4) });
    if (this.motes.length > wantMotes) this.motes.length = wantMotes;
    for (const m of this.motes) {
      m.y += m.v * dt;
      m.x += Math.sin(m.y * 9 + m.ph) * 0.012 * dt + 0.01 * dt;
      m.ph += dt * 2.2;
      if (m.y > 1.03) {
        m.y = -0.03;
        m.x = Math.random();
      }
      if (m.x > 1.02) m.x = -0.02;
    }

    // Kuşlar: gündüz, açık havada arada bir geçer
    const nowMs = performance.now();
    const day = lighting.dark < 0.4;
    if (!gfx.low && outdoor && day && weather === "none" && nowMs > this.nextBird && this.birds.length < 4) {
      const n = 2 + Math.floor(Math.random() * 3);
      const y0 = 0.08 + Math.random() * 0.25;
      for (let i = 0; i < n; i++) this.birds.push({ x: -0.05 - i * 0.035, y: y0 + i * 0.012 * (i % 2 ? 1 : -1), v: 0.07 + Math.random() * 0.01, ph: Math.random() * 6 });
      this.nextBird = nowMs + 14000 + Math.random() * 22000;
    }
    for (const b of this.birds) {
      b.x += b.v * dt;
      b.ph += dt * 9;
    }
    this.birds = this.birds.filter((b) => b.x < 1.08);

    // Cadde trafiği
    if (this.room.slug === "cadde-1") {
      if (this.traffic.length === 0) {
        // İki yönlü trafik: şerit 8 güneydoğuya (+x), şerit 7 kuzeybatıya (-x) akar
        this.traffic.push(
          { type: "car_blue", lane: 8, x: 3, dir: 1, v: 1.7 },
          { type: "bus", lane: 8, x: 20, dir: 1, v: 1.2 },
          { type: "car_yellow", lane: 7, x: 14, dir: -1, v: 1.5 },
          { type: "police", lane: 7, x: 30, dir: -1, v: 1.9 },
          { type: "car_red", lane: 8, x: 31, dir: 1, v: 1.3 },
          { type: "pickup", lane: 7, x: 4, dir: -1, v: 1.4 },
        );
      }
      for (const c of this.traffic) {
        let sp = c.v;
        for (const p of this.players) {
          const ahead = (p.gx - c.x) * c.dir;
          if (ahead > -0.5 && ahead < 3.2 && Math.abs(p.gy - c.lane) < 1.1) sp = 0;
        }
        c.x += c.dir * sp * dt;
        if (c.dir === 1 && c.x > this.cols + 3) c.x = -4;
        if (c.dir === -1 && c.x < -4) c.x = this.cols + 3;
      }
    } else if (this.traffic.length) this.traffic = [];
  }

  private updateEventFx(dt: number) {
    const theme = this.eventTheme;
    if (!theme || theme === "none" || !this.isOutdoor()) {
      this.fx.length = 0;
      return;
    }
    const COLS = ["#f43f5e", "#f59e0b", "#22c55e", "#38bdf8", "#a855f7", "#facc15", "#fb7185"];
    const now = performance.now();
    if (theme === "confetti") {
      while (this.fx.length < 70) this.fx.push({ x: Math.random(), y: -0.05 - Math.random() * 0.4, vx: (Math.random() - 0.5) * 0.04, vy: 0.12 + Math.random() * 0.14, life: 0, max: 99, c: COLS[Math.floor(Math.random() * COLS.length)], r: 3 + Math.random() * 3, k: Math.random() * 6 });
    } else if (theme === "balloons" || theme === "lanterns") {
      const want = theme === "balloons" ? 14 : 18;
      while (this.fx.length < want) this.fx.push({ x: Math.random(), y: 1.05 + Math.random() * 0.5, vx: (Math.random() - 0.5) * 0.01, vy: -(0.035 + Math.random() * 0.04), life: 0, max: 99, c: theme === "balloons" ? COLS[Math.floor(Math.random() * COLS.length)] : "#fbbf24", r: theme === "balloons" ? 9 + Math.random() * 5 : 6 + Math.random() * 3, k: Math.random() * 6 });
    } else if (theme === "fireworks" && now > this.nextBurst) {
      const cx = 0.15 + Math.random() * 0.7;
      const cy = 0.1 + Math.random() * 0.3;
      const col = COLS[Math.floor(Math.random() * COLS.length)];
      for (let i = 0; i < 38; i++) {
        const a = (i / 38) * Math.PI * 2;
        const sp = 0.12 + Math.random() * 0.1;
        this.fx.push({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0, max: 1.3, c: col, r: 2, k: 0 });
      }
      this.nextBurst = now + 1400 + Math.random() * 2200;
    }
    for (const f of this.fx) {
      f.life += dt;
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.k += dt * 4;
      if (theme === "fireworks") f.vy += 0.1 * dt;
      if (theme === "confetti") f.x += Math.sin(f.k) * 0.006 * dt;
      if (theme === "balloons" || theme === "lanterns") f.x += Math.sin(f.k * 0.6) * 0.004 * dt;
    }
    this.fx = this.fx.filter((f) => {
      if (theme === "fireworks") return f.life < f.max;
      if (theme === "confetti") return f.y < 1.06;
      return f.y > -0.1;
    });
  }

  private drawEventFx(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const theme = this.eventTheme;
    if (!theme || theme === "none" || !this.fx.length) return;
    ctx.save();
    for (const f of this.fx) {
      const x = f.x * width;
      const y = f.y * height;
      if (theme === "fireworks") {
        const a = Math.max(0, 1 - f.life / f.max);
        ctx.globalAlpha = a;
        ctx.fillStyle = f.c;
        ctx.beginPath();
        ctx.arc(x, y, 2.2 * a + 0.6, 0, Math.PI * 2);
        ctx.fill();
      } else if (theme === "confetti") {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(f.k);
        ctx.fillStyle = f.c;
        ctx.fillRect(-f.r / 2, -f.r / 4, f.r, f.r / 2);
        ctx.restore();
      } else if (theme === "balloons") {
        ctx.strokeStyle = "rgba(226,232,240,0.7)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, y + f.r * 1.2);
        ctx.quadraticCurveTo(x + 4, y + f.r * 2.4, x, y + f.r * 3.4);
        ctx.stroke();
        ctx.fillStyle = f.c;
        ctx.beginPath();
        ctx.ellipse(x, y, f.r * 0.82, f.r, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.4)";
        ctx.beginPath();
        ctx.ellipse(x - f.r * 0.28, y - f.r * 0.32, f.r * 0.18, f.r * 0.3, 0.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (theme === "lanterns") {
        const g = ctx.createRadialGradient(x, y, 1, x, y, f.r * 3);
        g.addColorStop(0, "rgba(251,191,36,0.55)");
        g.addColorStop(1, "rgba(251,191,36,0)");
        ctx.fillStyle = g;
        ctx.fillRect(x - f.r * 3, y - f.r * 3, f.r * 6, f.r * 6);
        ctx.fillStyle = "#f59e0b";
        ctx.beginPath();
        ctx.roundRect(x - f.r * 0.55, y - f.r * 0.7, f.r * 1.1, f.r * 1.4, 2);
        ctx.fill();
        ctx.fillStyle = "#fde68a";
        ctx.fillRect(x - f.r * 0.3, y - f.r * 0.35, f.r * 0.6, f.r * 0.7);
      }
    }
    ctx.restore();
  }

  private drawMotes(ctx: CanvasRenderingContext2D, width: number, height: number) {
    if (!this.motes.length) return;
    const autumn = this.season() === "autumn";
    const cols = autumn ? ["#d97706", "#b45309", "#dc2626", "#ca8a04"] : ["#f9a8d4", "#fbcfe8", "#fde68a", "#86efac"];
    for (const m of this.motes) {
      ctx.save();
      ctx.translate(m.x * width, m.y * height);
      ctx.rotate(m.ph);
      ctx.fillStyle = cols[m.c % cols.length];
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.ellipse(0, 0, m.r, m.r * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawBirds(ctx: CanvasRenderingContext2D, width: number, height: number) {
    if (!this.birds.length) return;
    ctx.strokeStyle = "rgba(15, 23, 42, 0.7)";
    ctx.lineWidth = 1.6;
    for (const b of this.birds) {
      const x = b.x * width;
      const y = b.y * height + Math.sin(b.ph * 0.4) * 3;
      const w = Math.sin(b.ph) * 4;
      ctx.beginPath();
      ctx.moveTo(x - 7, y - w);
      ctx.quadraticCurveTo(x - 3, y - 3 - w * 0.4, x, y);
      ctx.quadraticCurveTo(x + 3, y - 3 - w * 0.4, x + 7, y - w);
      ctx.stroke();
    }
  }

  private updateCamera(dt: number) {
    const me = this.me();
    if (!me) return;
    const cols = this.cols;
    const rows = this.rows;
    const isLarge = cols > 14 || rows > 14;
    if (!isLarge) {
      this.camX = 0;
      this.camY = 0;
      return;
    }

    const scale = this.width < 768 ? WORLD_ZOOM_LARGE_MOBILE : WORLD_ZOOM_LARGE;
    const tileW = BASE_TILE_W * scale;
    const tileH = BASE_TILE_H * scale;

    let targetX = (me.gx - me.gy) * (tileW / 2);
    let targetY = (me.gx + me.gy) * (tileH / 2) - 20 * scale;

    const minX = -rows * (tileW / 2) + this.width * 0.35;
    const maxX = cols * (tileW / 2) - this.width * 0.35;
    const minY = -80 * scale + this.height * 0.35;
    const maxY = (cols + rows) * (tileH / 2) - this.height * 0.35;

    if (minX < maxX) targetX = Math.max(minX, Math.min(maxX, targetX));
    else targetX = (minX + maxX) / 2;

    if (minY < maxY) targetY = Math.max(minY, Math.min(maxY, targetY));
    else targetY = (minY + maxY) / 2;

    if (!this.camReady || dt === 0) {
      this.camX = targetX;
      this.camY = targetY;
      this.camReady = true;
    } else {
      const smooth = 1 - Math.exp(-7.5 * dt);
      this.camX += (targetX - this.camX) * smooth;
      this.camY += (targetY - this.camY) * smooth;
    }
  }

  private arrived(p: Player) {
    const tile = { gx: Math.round(p.gx), gy: Math.round(p.gy) };
    if (!p.isRidingHorse) {
      const seat = this.furni.find((f) => f.gx === tile.gx && f.gy === tile.gy && FURNI_BY_TYPE[f.type]?.sittable);
      if (seat) p.isSitting = true;
    }
    if (p.id === this.myId) this.onArrive?.(tile);
  }

  /* ---------------- Çizim ---------------- */

  private resize() {
    const parent = this.canvas.parentElement;
    const w = parent?.clientWidth || 900;
    const h = parent?.clientHeight || 600;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (w !== this.width || h !== this.height || this.canvas.width !== Math.round(w * dpr)) {
      this.width = w;
      this.height = h;
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
      this.canvas.style.width = `${w}px`;
      this.canvas.style.height = `${h}px`;
    }
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.layout = getLayout(w, h, this.cols, this.rows, this.camX, this.camY);
  }

  private effectiveWeather(): "none" | "rain" | "snow" {
    const slug = this.room.slug;
    if (slug === "restoran" || slug === "avm" || slug === "avm-kat2" || slug === "emlak-ofisi" || slug === "oyunika" || slug === "parti-oyunu" || slug === "tetris-arena" || slug === "hain-avi" || slug === "sahil-kasabasi" || slug.startsWith("home-")) return "none";
    if (this.eventTheme === "snow" && this.isOutdoor()) return "snow";
    if (slug === "kis-koyu") return this.weather === "none" ? "none" : "snow";
    if (this.weather !== "auto") return this.weather;
    const d = new Date();
    const m = d.getMonth();
    if (m === 11 || m <= 1) return "snow";
    if ((m >= 9 && m <= 10) || m === 2 || m === 3) return d.getDate() % 3 !== 0 ? "rain" : "none";
    return "none";
  }

  private drawWeather(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const mode = this.effectiveWeather();
    if (mode === "none") return;
    if (mode === "rain") {
      ctx.fillStyle = "rgba(15, 23, 42, 0.12)";
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = "rgba(186, 230, 253, 0.55)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (const f of this.flakes) {
        const x = f.x * width;
        const y = f.y * height;
        ctx.moveTo(x, y);
        ctx.lineTo(x - 3, y + 9 * f.v);
      }
      ctx.stroke();
    } else {
      ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
      for (const f of this.flakes) {
        ctx.beginPath();
        ctx.arc(f.x * width, f.y * height, f.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  /** Yerel saate göre karartma; lamba/sokak lambası/TV/havuz/kamp ateşi çevresi parlar. */
  private hasLos(ax: number, ay: number, bx: number, by: number): boolean {
    const slug = this.room.slug;
    if (!this.wallCache || this.wallCache.slug !== slug) {
      const set = new Set<number>();
      for (const [wx, wy] of roomWalls(slug)) set.add(wy * 1000 + wx);
      this.wallCache = { slug, set };
    }
    const set = this.wallCache.set;
    const dist = Math.hypot(bx - ax, by - ay);
    const n = Math.ceil(dist / 0.25);
    for (let i = 1; i < n; i++) {
      const t = i / n;
      if (set.has(Math.round(ay + (by - ay) * t) * 1000 + Math.round(ax + (bx - ax) * t))) return false;
    }
    return true;
  }

  private canSee(gx: number, gy: number): boolean {
    if (this.vision == null) return true;
    const me = this.players.find((p) => p.id === this.myId);
    if (!me) return true;
    if (Math.hypot(gx - me.gx, gy - me.gy) > this.vision) return false;
    return this.hasLos(me.gx, me.gy, gx, gy);
  }

  private drawVision(ctx: CanvasRenderingContext2D, l: Layout, width: number, height: number) {
    if (this.vision == null) return;
    const me = this.players.find((p) => p.id === this.myId);
    if (!me) return;
    const { sx, sy } = gridToScreen(me.gx, me.gy, l);
    const cx = sx;
    const cy = sy + l.tileH / 2 - 14 * l.scale;
    const r = this.vision * l.tileW * 0.5;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, 0.58);
    const g = ctx.createRadialGradient(0, 0, r * 0.5, 0, 0, r);
    g.addColorStop(0, "rgba(2,6,23,0)");
    g.addColorStop(0.75, "rgba(2,6,23,0.55)");
    g.addColorStop(1, "rgba(2,6,23,0.96)");
    ctx.fillStyle = g;
    ctx.fillRect(-width * 3, -height * 6, width * 6, height * 12);
    ctx.restore();
  }

  private drawNight(ctx: CanvasRenderingContext2D, l: Layout, width: number, height: number) {
    if (!this.nightEnabled || this.room.slug === "oyunika" || this.room.slug === "parti-oyunu" || this.room.slug === "tetris-arena" || this.room.slug === "hain-avi" || this.room.slug === "avm" || this.room.slug === "avm-kat2" || this.room.slug === "emlak-ofisi") return;
    const a = lighting.tintAlpha;
    const glow = lighting.dark;
    if (a >= 0.01) {
      const [tr, tg, tb] = lighting.tint;
      ctx.fillStyle = `rgba(${Math.round(tr)}, ${Math.round(tg)}, ${Math.round(tb)}, ${a})`;
      ctx.fillRect(0, 0, width, height);
    }
    if (glow < 0.15) return;
    for (const f of this.furni) {
      if (f.type !== "lamp" && f.type !== "streetlight" && f.type !== "tv" && f.type !== "fountain" && f.type !== "campfire" && f.type !== "dj_booth") continue;
      const { sx, sy } = gridToScreen(f.gx, f.gy, l);
      const cx = sx;
      const cy = sy + l.tileH / 2 - (f.type === "streetlight" ? 55 : f.type === "campfire" ? 12 : 30) * l.scale;
      const r = (f.type === "streetlight" || f.type === "campfire" || f.type === "dj_booth" ? 135 : 70) * l.scale;
      const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, r);
      const col =
        f.type === "campfire"
          ? "251, 146, 60"
          : f.type === "dj_booth"
            ? "236, 72, 153"
            : f.type === "lamp" || f.type === "streetlight"
              ? "250, 204, 21"
              : f.type === "tv"
                ? "125, 211, 252"
                : "56, 189, 248";
      g.addColorStop(0, `rgba(${col}, ${0.21 * glow})`);
      g.addColorStop(1, `rgba(${col}, 0)`);
      ctx.fillStyle = g;
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    }
  }

  private render(time: number) {
    const dn = new Date();
    updateLighting(dn.getHours() + dn.getMinutes() / 60);
    this.resize();
    const { ctx, layout: l, width, height } = this;
    const now = performance.now();

    ctx.fillStyle = "#1f2a44";
    ctx.fillRect(0, 0, width, height);
    setView(width, height);

    drawRoom(ctx, l, this.room.slug, this.room.theme, this.room.portals, this.hover, this.buildMode ? "rgba(250, 204, 21, 0.55)" : "rgba(56, 189, 248, 0.35)", time);

    const CM = 380 * l.scale; // büyük yapılar için geniş kenar payı
    for (const f of this.furni) {
      if (!FURNI_BY_TYPE[f.type]?.floor) continue;
      const q = gridToScreen(f.gx, f.gy, l);
      if (offscreen(q.sx, q.sy, CM)) continue;
      drawRug(ctx, f, l);
    }

    type Renderable = { depth: number; draw: () => void };
    const items: Renderable[] = [];
    for (const f of this.furni) {
      if (FURNI_BY_TYPE[f.type]?.floor) continue;
      const { wTiles, hTiles } = this.getFurniFootprint(f);
      // Çok kareli yapıların derinliği kapladığı alanın merkezine göre sıralanır
      // Üstünden geçilebilen (blocks:false) eşyalarda karakter eşyanın altında kalıp kaybolmasın:
      // eşya en arka köşesine göre sıralanır, böylece kapladığı karelerdeki karakter hep önde çizilir.
      const passable = FURNI_BY_TYPE[f.type]?.blocks === false;
      const depth = passable ? f.gx + f.gy - 0.3 : f.gx + (wTiles - 1) / 2 + (f.gy + (hTiles - 1) / 2);
      const fc = gridToScreen(f.gx + wTiles / 2, f.gy + hTiles / 2, l);
      if (offscreen(fc.sx, fc.sy, CM)) continue;
      items.push({ depth, draw: () => drawFurni(ctx, f, l, time) });
    }
    for (const c of this.traffic) {
      const tc = gridToScreen(c.x + 0.5, c.lane + 0.5, l);
      if (offscreen(tc.sx, tc.sy, CM)) continue;
      items.push({
        depth: c.x + c.lane + 1.2,
        draw: () => {
          const img = vehicleSheet(c.type);
          if (!img) return;
          // 4 yönlü sheet: 0 GD(+x), 1 GB(+y), 2 KB(-x), 3 KD(-y)
          const col = c.dir === 1 ? 0 : 2;
          const { sx, sy } = gridToScreen(c.x + 0.5, c.lane + 0.5, l);
          const w = (VEH_FW / 4) * l.scale;
          const h = (VEH_FH / 4) * l.scale;
          mipDraw(ctx, img, col * VEH_FW, 0, VEH_FW, VEH_FH, sx - w / 2, sy - (VEH_FEET / 4) * l.scale, w, h);
        },
      });
    }
    for (const [rx, ry] of roomRocks(this.room.slug)) items.push({ depth: rx + ry, draw: () => drawRock(ctx, rx, ry, l) });
    for (const [wx, wy] of roomWalls(this.room.slug)) items.push({ depth: wx + wy + 0.2, draw: () => drawHainWall(ctx, wx, wy, l) });
    if (this.room.slug === "parti-oyunu") PARTI_PODIUM.forEach((q, i) => items.push({ depth: q.gx + q.gy + 0.05, draw: () => drawPodiumBlock(ctx, q.gx, q.gy, i + 1, l, time) }));
    for (const b of this.bodies) if (this.canSee(b.gx, b.gy)) items.push({ depth: b.gx + b.gy + 0.05, draw: () => drawHainBody(ctx, b.gx, b.gy, b.color, b.name, l, time) });
    for (const m of this.marks) items.push({ depth: m.gx + m.gy - 0.2, draw: () => drawHainMark(ctx, m.gx, m.gy, m.icon, m.done, l, time) });
    if (this.flag) {
      const fl = this.flag;
      items.push({ depth: fl.gx + fl.gy + 0.05, draw: () => drawFlag(ctx, fl.gx, fl.gy, l, time) });
    }
    for (const p of this.players) {
      const pet = this.pets.get(p.id);
      if (p.pet && pet) items.push({ depth: pet.gx + pet.gy + 0.05, draw: () => drawPet(ctx, p.pet as string, pet.gx, pet.gy, l, time, pet.moving) });
    }
    for (const p of this.players) {
      if (p.hidden) continue;
      if (this.vision != null && p.id !== this.myId && !this.canSee(p.gx, p.gy)) continue;
      if (p.isSitting && p.path.length === 0) {
        const seat = this.furniAt({ gx: Math.round(p.gx), gy: Math.round(p.gy) }, false);
        const def = seat ? FURNI_BY_TYPE[seat.type] : undefined;
        p.seatType = seat && def?.sittable ? seat.type : undefined;
        p.seatRot = seat?.rot ?? 0;
      } else {
        p.seatType = undefined;
      }
      p.lift = this.room.slug === "parti-oyunu" ? podiumLift(p.gx, p.gy) : 0;
      items.push({ depth: p.gx + p.gy + (p.seatType ? 0.7 : 0.1), draw: () => {
        if (p.ghost) ctx.globalAlpha = 0.42;
        drawAvatar(ctx, p, l, p.id === this.myId, time);
        ctx.globalAlpha = 1;
      } });
    }
    items.sort((a, b) => a.depth - b.depth);
    for (const it of items) it.draw();

    const stack = new Map<string, number>();
    for (const b of this.bubbles) {
      if (now - b.createdAt >= BUBBLE_LIFETIME_MS) continue;
      const speaker = (b.uid ? this.players.find((p) => p.uid === b.uid) : undefined) ?? this.players.find((p) => p.name === b.sender);
      const used = stack.get(b.sender) ?? 0;
      const h = drawBubble(ctx, l, width, speaker, b.sender, b.text, speaker?.role ?? "user", used);
      stack.set(b.sender, used + h);
    }

    // Emote'lar: başın üstünde yükselip solar
    for (const e of this.emotes) {
      const pl = this.players.find((p) => p.id === e.playerId);
      if (!pl) continue;
      const age = (now - e.createdAt) / EMOTE_LIFETIME_MS;
      const { sx, sy } = gridToScreen(pl.gx, pl.gy, l);
      const rise = age * 26;
      ctx.globalAlpha = age < 0.6 ? 1 : Math.max(0, 1 - (age - 0.6) / 0.4);
      ctx.font = `${Math.round(22 * Math.max(0.8, l.scale))}px sans-serif`;
      ctx.textAlign = "left";
      const w = ctx.measureText(e.emoji).width;
      ctx.fillStyle = "#ffffff";
      ctx.fillText(e.emoji, sx - w / 2, sy - 58 * l.scale - rise);
      ctx.globalAlpha = 1;
    }

    this.drawVision(ctx, l, width, height);
    this.drawNight(ctx, l, width, height);
    this.drawMotes(ctx, width, height);
    this.drawEventFx(ctx, width, height);
    this.drawBirds(ctx, width, height);
    this.drawWeather(ctx, width, height);
  }
}
