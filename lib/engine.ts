import { BASE_TILE_H, BASE_TILE_W, FURNI_BY_TYPE, GRID_SIZE, isWaterTile } from "./constants";
import { drawAvatar, drawBubble, drawFlag, drawFurni, drawPet, drawRock, drawRoom, drawRug, roomRocks } from "./draw";
import { getLayout, gridToScreen, inGrid, screenToGrid, type Layout } from "./iso";
import { findPath } from "./pathfinding";
import { FURNI_SPRITES, sprites } from "./sprites";
import type { ChatBubble, Emote, FurniItem, Player, RoomDef, Tile, WeatherMode } from "./types";

const WALK_SPEED = 3.4; // kare/sn
const HORSE_SPEED = 5.4;
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
  private pets = new Map<string, { gx: number; gy: number; moving: boolean }>();
  private flakes: { x: number; y: number; v: number; r: number }[] = [];
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
    return {
      wTiles: sp?.wTiles ?? def?.wTiles ?? 1,
      hTiles: sp?.hTiles ?? def?.hTiles ?? 1,
    };
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
    const s = Math.max(0.75, this.layout.scale);
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
      let step = (riding ? HORSE_SPEED : WALK_SPEED) * dt;

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

    const t = performance.now();
    this.bubbles = this.bubbles.filter((b) => t - b.createdAt < BUBBLE_LIFETIME_MS);
    this.emotes = this.emotes.filter((e) => t - e.createdAt < EMOTE_LIFETIME_MS);
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

    const scale = this.width < 768 ? 0.85 : 1.05;
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
    if (slug === "restoran" || slug === "avm" || slug === "oyunika" || slug === "sahil-kasabasi" || slug.startsWith("home-")) return "none";
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
  private drawNight(ctx: CanvasRenderingContext2D, l: Layout, width: number, height: number) {
    if (!this.nightEnabled || this.room.slug === "oyunika" || this.room.slug === "avm") return;
    const d = new Date();
    const h = d.getHours() + d.getMinutes() / 60;
    let a = 0;
    if (h >= 21 || h < 5) a = 0.22;
    else if (h >= 19) a = ((h - 19) / 2) * 0.22;
    else if (h < 7) a = ((7 - h) / 2) * 0.22;
    if (a < 0.02) return;
    ctx.fillStyle = `rgba(6, 12, 44, ${a})`;
    ctx.fillRect(0, 0, width, height);
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
      g.addColorStop(0, `rgba(${col}, ${a * 0.95})`);
      g.addColorStop(1, `rgba(${col}, 0)`);
      ctx.fillStyle = g;
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    }
  }

  private render(time: number) {
    this.resize();
    const { ctx, layout: l, width, height } = this;
    const now = performance.now();

    ctx.fillStyle = "#1f2a44";
    ctx.fillRect(0, 0, width, height);

    drawRoom(ctx, l, this.room.slug, this.room.theme, this.room.portals, this.hover, this.buildMode ? "rgba(250, 204, 21, 0.55)" : "rgba(56, 189, 248, 0.35)", time);

    for (const f of this.furni) if (FURNI_BY_TYPE[f.type]?.floor) drawRug(ctx, f, l);

    type Renderable = { depth: number; draw: () => void };
    const items: Renderable[] = [];
    for (const f of this.furni) {
      if (FURNI_BY_TYPE[f.type]?.floor) continue;
      const { wTiles, hTiles } = this.getFurniFootprint(f);
      // Çok kareli yapıların derinliği kapladığı alanın merkezine göre sıralanır
      const depth = f.gx + (wTiles - 1) / 2 + (f.gy + (hTiles - 1) / 2);
      items.push({ depth, draw: () => drawFurni(ctx, f, l, time) });
    }
    for (const [rx, ry] of roomRocks(this.room.slug)) items.push({ depth: rx + ry, draw: () => drawRock(ctx, rx, ry, l) });
    if (this.flag) {
      const fl = this.flag;
      items.push({ depth: fl.gx + fl.gy + 0.05, draw: () => drawFlag(ctx, fl.gx, fl.gy, l, time) });
    }
    for (const p of this.players) {
      const pet = this.pets.get(p.id);
      if (p.pet && pet) items.push({ depth: pet.gx + pet.gy + 0.05, draw: () => drawPet(ctx, p.pet as string, pet.gx, pet.gy, l, time, pet.moving) });
    }
    for (const p of this.players) {
      if (p.isSitting && p.path.length === 0) {
        const seat = this.furniAt({ gx: Math.round(p.gx), gy: Math.round(p.gy) }, false);
        const def = seat ? FURNI_BY_TYPE[seat.type] : undefined;
        p.seatType = seat && def?.sittable ? seat.type : undefined;
        p.seatRot = seat?.rot ?? 0;
      } else {
        p.seatType = undefined;
      }
      items.push({ depth: p.gx + p.gy + (p.seatType ? 0.7 : 0.1), draw: () => drawAvatar(ctx, p, l, p.id === this.myId, time) });
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

    this.drawNight(ctx, l, width, height);
    this.drawWeather(ctx, width, height);
  }
}
