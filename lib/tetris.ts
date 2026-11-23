/**
 * Blok Rüzgârı — Tetris benzeri blok düşürme oyunu motoru (saf mantık, React'e bağımlı değil).
 * Tohumlu 7'li torba kullanır: aynı tohumla başlayan oyuncular aynı blok sırasını alır (düello adaleti).
 */

export const T_COLS = 10;
export const T_ROWS = 20;
export const GARBAGE = 8;

export type PieceType = "I" | "O" | "T" | "S" | "Z" | "J" | "L";
export const PIECE_ORDER: PieceType[] = ["I", "O", "T", "S", "Z", "J", "L"];
export const PIECE_COLORS: Record<number, string> = {
  1: "#22d3ee", // I
  2: "#facc15", // O
  3: "#a855f7", // T
  4: "#22c55e", // S
  5: "#ef4444", // Z
  6: "#3b82f6", // J
  7: "#f97316", // L
  8: "#64748b", // çöp
};

const BASE: Record<PieceType, { size: number; cells: [number, number][] }> = {
  I: { size: 4, cells: [[0, 1], [1, 1], [2, 1], [3, 1]] },
  O: { size: 2, cells: [[0, 0], [1, 0], [0, 1], [1, 1]] },
  T: { size: 3, cells: [[1, 0], [0, 1], [1, 1], [2, 1]] },
  S: { size: 3, cells: [[1, 0], [2, 0], [0, 1], [1, 1]] },
  Z: { size: 3, cells: [[0, 0], [1, 0], [1, 1], [2, 1]] },
  J: { size: 3, cells: [[0, 0], [0, 1], [1, 1], [2, 1]] },
  L: { size: 3, cells: [[2, 0], [0, 1], [1, 1], [2, 1]] },
};

const SHAPES: Record<PieceType, [number, number][][]> = (() => {
  const out = {} as Record<PieceType, [number, number][][]>;
  for (const t of PIECE_ORDER) {
    const { size, cells } = BASE[t];
    const rots: [number, number][][] = [cells];
    for (let r = 1; r < 4; r++) {
      const prev = rots[r - 1];
      rots.push(prev.map(([x, y]) => [size - 1 - y, x] as [number, number]));
    }
    out[t] = rots;
  }
  return out;
})();

export const pieceCells = (t: PieceType, rot: number) => SHAPES[t][((rot % 4) + 4) % 4];
export const pieceId = (t: PieceType) => PIECE_ORDER.indexOf(t) + 1;

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Active {
  type: PieceType;
  rot: number;
  x: number;
  y: number;
}

export interface ClearInfo {
  lines: number;
  label: string;
  at: number;
}

const LINE_SCORE = [0, 100, 300, 500, 800];

export class TetrisEngine {
  grid: number[][] = Array.from({ length: T_ROWS }, () => Array(T_COLS).fill(0));
  cur!: Active;
  hold: PieceType | null = null;
  canHold = true;
  queue: PieceType[] = [];
  score = 0;
  lines = 0;
  level = 1;
  combo = -1;
  b2b = false;
  gameOver = false;
  pendingGarbage = 0;
  lastClear: ClearInfo | null = null;
  startedAt = 0;
  elapsed = 0;
  /** Rakiplere gönderilecek çöp satır sayısı (dışarıdan tüketilir) */
  outGarbage = 0;
  private rng: () => number;
  private dropAcc = 0;
  private lockAcc = 0;
  private lockResets = 0;
  private soft = false;

  constructor(seed: number) {
    this.rng = mulberry32(seed);
    this.fillQueue();
    this.spawn();
  }

  private fillQueue() {
    while (this.queue.length < 8) {
      const bag = [...PIECE_ORDER];
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(this.rng() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
      this.queue.push(...bag);
    }
  }

  next(n = 3): PieceType[] {
    return this.queue.slice(0, n);
  }

  private collides(a: Active): boolean {
    for (const [cx, cy] of pieceCells(a.type, a.rot)) {
      const x = a.x + cx;
      const y = a.y + cy;
      if (x < 0 || x >= T_COLS || y >= T_ROWS) return true;
      if (y >= 0 && this.grid[y][x]) return true;
    }
    return false;
  }

  private spawn(type?: PieceType) {
    this.fillQueue();
    const t = type ?? (this.queue.shift() as PieceType);
    this.cur = { type: t, rot: 0, x: t === "O" ? 4 : 3, y: t === "I" ? -1 : 0 };
    this.dropAcc = 0;
    this.lockAcc = 0;
    this.lockResets = 0;
    if (this.collides(this.cur)) this.gameOver = true;
  }

  private grounded(): boolean {
    return this.collides({ ...this.cur, y: this.cur.y + 1 });
  }

  private touch() {
    if (this.grounded() && this.lockResets < 15) {
      this.lockAcc = 0;
      this.lockResets++;
    }
  }

  move(dx: number): boolean {
    if (this.gameOver) return false;
    const n = { ...this.cur, x: this.cur.x + dx };
    if (this.collides(n)) return false;
    this.cur = n;
    this.touch();
    return true;
  }

  rotate(dir: 1 | -1): boolean {
    if (this.gameOver || this.cur.type === "O") return false;
    const rot = (this.cur.rot + dir + 4) % 4;
    const kicks: [number, number][] = [[0, 0], [-1, 0], [1, 0], [0, -1], [-2, 0], [2, 0], [-1, -1], [1, -1]];
    for (const [kx, ky] of kicks) {
      const n = { ...this.cur, rot, x: this.cur.x + kx, y: this.cur.y + ky };
      if (!this.collides(n)) {
        this.cur = n;
        this.touch();
        return true;
      }
    }
    return false;
  }

  setSoft(on: boolean) {
    this.soft = on;
  }

  ghostY(): number {
    let y = this.cur.y;
    while (!this.collides({ ...this.cur, y: y + 1 })) y++;
    return y;
  }

  hardDrop() {
    if (this.gameOver) return;
    const gy = this.ghostY();
    this.score += (gy - this.cur.y) * 2;
    this.cur = { ...this.cur, y: gy };
    this.lock();
  }

  doHold() {
    if (this.gameOver || !this.canHold) return;
    const prev = this.hold;
    this.hold = this.cur.type;
    this.spawn(prev ?? undefined);
    this.canHold = false;
  }

  private lock() {
    for (const [cx, cy] of pieceCells(this.cur.type, this.cur.rot)) {
      const x = this.cur.x + cx;
      const y = this.cur.y + cy;
      if (y < 0) {
        this.gameOver = true;
        return;
      }
      this.grid[y][x] = pieceId(this.cur.type);
    }
    // Dolu satırları temizle
    let cleared = 0;
    for (let y = T_ROWS - 1; y >= 0; y--) {
      if (this.grid[y].every((c) => c !== 0)) {
        this.grid.splice(y, 1);
        this.grid.unshift(Array(T_COLS).fill(0));
        cleared++;
        y++;
      }
    }
    if (cleared > 0) {
      this.combo++;
      const hard = cleared === 4;
      let pts = LINE_SCORE[cleared] * this.level;
      if (hard && this.b2b) pts = Math.round(pts * 1.5);
      pts += Math.max(0, this.combo) * 50 * this.level;
      this.score += pts;
      this.lines += cleared;
      this.level = 1 + Math.floor(this.lines / 10);
      let send = [0, 0, 1, 2, 4][cleared];
      if (hard && this.b2b) send += 1;
      if (this.combo >= 2) send += 1;
      if (this.combo >= 5) send += 1;
      this.b2b = hard;
      const label = hard ? (this.b2b ? "TETRİS!" : "TETRİS!") : cleared === 3 ? "ÜÇLÜ" : cleared === 2 ? "İKİLİ" : "TEK";
      this.lastClear = { lines: cleared, label: this.combo >= 1 ? `${label} · ${this.combo + 1}x kombo` : label, at: performance.now() };
      // Önce gelen çöpü sil
      if (this.pendingGarbage > 0) {
        const cancel = Math.min(this.pendingGarbage, send);
        this.pendingGarbage -= cancel;
        send -= cancel;
      }
      this.outGarbage += send;
    } else {
      this.combo = -1;
      if (this.pendingGarbage > 0) this.applyGarbage();
    }
    this.canHold = true;
    if (!this.gameOver) this.spawn();
  }

  addGarbage(n: number) {
    this.pendingGarbage += Math.max(0, Math.min(12, n));
  }

  private applyGarbage() {
    const n = Math.min(this.pendingGarbage, 8);
    this.pendingGarbage -= n;
    const hole = Math.floor(Math.random() * T_COLS);
    for (let i = 0; i < n; i++) {
      const topRow = this.grid.shift() as number[];
      if (topRow.some((c) => c !== 0)) this.gameOver = true;
      this.grid.push(Array.from({ length: T_COLS }, (_, x) => (x === hole ? 0 : GARBAGE)));
    }
  }

  /** Oyun ilerletme: dt milisaniye */
  step(dt: number) {
    if (this.gameOver) return;
    this.elapsed += dt;
    const base = Math.max(45, 900 * Math.pow(0.82, this.level - 1));
    const interval = this.soft ? Math.min(base, 45) : base;
    if (this.grounded()) {
      this.lockAcc += dt;
      if (this.lockAcc >= 500) this.lock();
      return;
    }
    this.lockAcc = 0;
    this.dropAcc += dt;
    while (this.dropAcc >= interval && !this.grounded()) {
      this.dropAcc -= interval;
      this.cur = { ...this.cur, y: this.cur.y + 1 };
      if (this.soft) this.score += 1;
    }
  }

  /** Ağa gönderilecek sıkıştırılmış tahta (kilitli bloklar + aktif parça) */
  snapshot(): string {
    const g = this.grid.map((r) => r.slice());
    if (!this.gameOver) {
      for (const [cx, cy] of pieceCells(this.cur.type, this.cur.rot)) {
        const x = this.cur.x + cx;
        const y = this.cur.y + cy;
        if (y >= 0 && y < T_ROWS && x >= 0 && x < T_COLS) g[y][x] = pieceId(this.cur.type);
      }
    }
    return g.map((r) => r.join("")).join("");
  }
}

export function parseSnapshot(s: string): number[][] {
  const rows: number[][] = [];
  for (let y = 0; y < T_ROWS; y++) {
    const row: number[] = [];
    for (let x = 0; x < T_COLS; x++) row.push(Number(s[y * T_COLS + x] ?? 0) || 0);
    rows.push(row);
  }
  return rows;
}

/* ---------------- Ağ mesajları ---------------- */

export type TetMsg =
  | { t: "join"; u: string }
  | { t: "leave"; u: string }
  | { t: "sync" }
  | { t: "lobby"; players: string[] }
  | { t: "start"; seed: number; players: string[]; at: number }
  | { t: "board"; u: string; s: string; score: number; lines: number }
  | { t: "garbage"; from: string; to: string; n: number }
  | { t: "dead"; u: string };

/** Düello ödül/puan sabitleri (sunucu RPC'siyle aynı olmalı) */
export const TETRIS_SANIL_PER_1000 = 25;
export const TETRIS_DAILY_CAP = 800;
export const TETRIS_DUEL_WIN = 200;
