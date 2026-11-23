/**
 * Hain Avı (Among Us tarzı oyun) harita ve görev verileri.
 * Bu dosya constants.ts tarafından içe aktarılır; constants'tan bir şey import etmez.
 */
import type { FurniItem, FurniType } from "./types";

export const HAIN_COLS = 28;
export const HAIN_ROWS = 18;
export const HAIN_SPAWN = { gx: 13, gy: 8 };
/** Acil toplantı masası (bu karenin yanında düğmeye basılır) */
export const HAIN_TABLE = { gx: 13, gy: 10 };

const DOORS_R6 = new Set([4, 13, 14, 23]);
const DOORS_R12 = new Set([3, 13, 14, 24]);

function buildWalls(): [number, number][] {
  const w: [number, number][] = [];
  for (let x = 0; x < HAIN_COLS; x++) {
    if (!DOORS_R6.has(x)) w.push([x, 6]);
    if (!DOORS_R12.has(x)) w.push([x, 12]);
  }
  const vert = (x: number, y0: number, y1: number, door: number) => {
    for (let y = y0; y <= y1; y++) if (y !== door) w.push([x, y]);
  };
  vert(9, 0, 5, 3);
  vert(18, 0, 5, 3);
  vert(6, 7, 11, 9);
  vert(21, 7, 11, 9);
  vert(9, 13, 17, 15);
  vert(18, 13, 17, 15);
  return w;
}
export const HAIN_WALLS = buildWalls();
const WALL_SET = new Set(HAIN_WALLS.map(([x, y]) => `${x},${y}`));
export const isHainWall = (x: number, y: number) => WALL_SET.has(`${x},${y}`);

export interface HainStation {
  id: string;
  name: string;
  icon: string;
  zone: string;
  gx: number;
  gy: number;
}

export const HAIN_STATIONS: HainStation[] = [
  { id: "rota", name: "Rota Çizimi", icon: "🧭", zone: "Kokpit", gx: 4, gy: 2 },
  { id: "kablo", name: "Kablo Tamiri", icon: "🔌", zone: "Elektrik", gx: 13, gy: 2 },
  { id: "reaktor", name: "Reaktör Soğutma", icon: "☢️", zone: "Reaktör", gx: 23, gy: 2 },
  { id: "revir", name: "Sağlık Taraması", icon: "🩺", zone: "Revir", gx: 3, gy: 9 },
  { id: "kamera", name: "Kameraları Kontrol Et", icon: "📹", zone: "Güvenlik", gx: 24, gy: 9 },
  { id: "yemek", name: "Yemek Hazırla", icon: "🍲", zone: "Mutfak", gx: 4, gy: 15 },
  { id: "numune", name: "Numune Analizi", icon: "🧪", zone: "Laboratuvar", gx: 13, gy: 15 },
  { id: "kargo", name: "Kargo Düzenle", icon: "📦", zone: "Depo", gx: 23, gy: 15 },
];
export const HAIN_TASKS_PER_CREW = 4;
export const HAIN_TASK_MS = 3000;
export const HAIN_KILL_COOLDOWN_MS = 20000;
export const HAIN_KILL_RANGE = 1.9;
export const HAIN_REPORT_RANGE = 2.6;
export const HAIN_TASK_RANGE = 1.9;
export const HAIN_DISCUSS_MS = 25000;
export const HAIN_VOTE_MS = 20000;
export const HAIN_MIN_PLAYERS = 3;
export const HAIN_MAX_PLAYERS = 8;

export interface HainZone {
  name: string;
  tint: string;
}

/** Bölge adı ve zemin rengi (koridor/kapı kareleri nötr) */
export function hainZone(gx: number, gy: number): HainZone | null {
  if (gy === 6 || gy === 12) return null;
  if (gy <= 5) {
    if (gx <= 8) return { name: "KOKPİT", tint: "#1e3a8a" };
    if (gx >= 10 && gx <= 17) return { name: "ELEKTRİK", tint: "#854d0e" };
    if (gx >= 19) return { name: "REAKTÖR", tint: "#7f1d1d" };
  } else if (gy <= 11) {
    if (gx <= 5) return { name: "REVİR", tint: "#14532d" };
    if (gx >= 7 && gx <= 20) return { name: "ANA SALON", tint: "#334155" };
    if (gx >= 22) return { name: "GÜVENLİK", tint: "#4c1d95" };
  } else {
    if (gx <= 8) return { name: "MUTFAK", tint: "#9a3412" };
    if (gx >= 10 && gx <= 17) return { name: "LABORATUVAR", tint: "#155e75" };
    if (gx >= 19) return { name: "DEPO", tint: "#3f3f46" };
  }
  return null;
}

/** Bölge etiketlerinin yazılacağı kareler */
export const HAIN_ZONE_LABELS: { name: string; gx: number; gy: number }[] = [
  { name: "KOKPİT", gx: 4, gy: 4 },
  { name: "ELEKTRİK", gx: 13, gy: 4 },
  { name: "REAKTÖR", gx: 23, gy: 4 },
  { name: "REVİR", gx: 3, gy: 11 },
  { name: "ANA SALON", gx: 13, gy: 7 },
  { name: "GÜVENLİK", gx: 24, gy: 11 },
  { name: "MUTFAK", gx: 4, gy: 17 },
  { name: "LABORATUVAR", gx: 13, gy: 17 },
  { name: "DEPO", gx: 23, gy: 17 },
];

const fi = (id: string, type: FurniType, gx: number, gy: number, rot = 0): FurniItem => ({ id, type, gx, gy, rot, owner: null });

/** İstasyonların yanına dekor (istasyon kareleri boş kalır) */
export const HAIN_FURNI: FurniItem[] = [
  fi("h1", "tv", 3, 1), fi("h2", "tv", 5, 1), fi("h3", "tv", 7, 1), fi("h4", "chair", 4, 3),
  fi("h5", "bookshelf", 11, 1), fi("h6", "bookshelf", 15, 1), fi("h7", "plant", 16, 4), fi("h8", "ore_cart", 12, 4),
  fi("h9", "tv", 21, 1), fi("h10", "tv", 25, 1), fi("h11", "lamp", 20, 4), fi("h12", "lamp", 26, 4),
  fi("h13", "bed", 1, 8), fi("h14", "bed", 1, 10), fi("h15", "plant", 5, 7), fi("h16", "bin", 5, 11),
  fi("h17", "casinotable", HAIN_TABLE.gx, HAIN_TABLE.gy), fi("h18", "sofa", 10, 8, 1), fi("h19", "sofa", 17, 8),
  fi("h20", "plant", 8, 7), fi("h21", "plant", 19, 7), fi("h22", "plant", 8, 11), fi("h23", "plant", 19, 11),
  fi("h24", "tv", 23, 8), fi("h25", "tv", 25, 8), fi("h26", "lamp", 26, 10),
  fi("h27", "counter", 2, 14), fi("h28", "kitchen_block", 5, 14), fi("h29", "bin", 8, 16), fi("h30", "plant", 1, 16),
  fi("h31", "table", 11, 14), fi("h32", "table", 15, 14), fi("h33", "bookshelf", 16, 16), fi("h34", "plant", 10, 16),
  fi("h35", "ore_cart", 21, 14), fi("h36", "ore_cart", 25, 14), fi("h38", "lamp", 26, 16),
];

/* ------------------------------------------------------------------ */
/* Oyun durumu tipleri                                                 */
/* ------------------------------------------------------------------ */

export type HainRole = "crew" | "traitor";

export interface HainPlayerPub {
  username: string;
  shirt: string;
  hair: string;
  skin: string;
  alive: boolean;
  bot?: boolean;
}

export interface HainMeeting {
  phase: "discuss" | "vote" | "result";
  endsAt: number;
  caller: string;
  reason: "body" | "button";
  body?: string;
  voted: string[];
  resultText?: string;
}

export interface HainState {
  status: "idle" | "lobby" | "starting" | "playing" | "meeting" | "finished";
  host: string | null;
  players: HainPlayerPub[];
  bodies: { username: string; gx: number; gy: number }[];
  tasksDone: number;
  tasksTotal: number;
  meeting: HainMeeting | null;
  winner: "crew" | "traitor" | null;
  winText: string | null;
  reveal: { username: string; role: HainRole }[] | null;
  test: boolean;
  startedAt: number;
  seq: number;
}

export const HAIN_INITIAL: HainState = {
  status: "idle",
  host: null,
  players: [],
  bodies: [],
  tasksDone: 0,
  tasksTotal: 0,
  meeting: null,
  winner: null,
  winText: null,
  reveal: null,
  test: false,
  startedAt: 0,
  seq: 0,
};

export const HAIN_BOTS: HainPlayerPub[] = [
  { username: "Bot Kaan", shirt: "#ef4444", hair: "#1e293b", skin: "#fed7aa", alive: true, bot: true },
  { username: "Bot Selin", shirt: "#22c55e", hair: "#7c2d12", skin: "#fdba74", alive: true, bot: true },
  { username: "Bot Efe", shirt: "#eab308", hair: "#0f172a", skin: "#d99a6c", alive: true, bot: true },
];

export type HainMsg =
  | { t: "state"; state: HainState }
  | { t: "role"; to: string; role: HainRole; tasks: string[]; mates: string[] }
  | { t: "syncReq"; user: string }
  | { t: "join"; p: HainPlayerPub }
  | { t: "leave"; user: string }
  | { t: "task"; user: string; task: string }
  | { t: "kill"; by: string; target: string }
  | { t: "report"; by: string; body: string }
  | { t: "button"; by: string }
  | { t: "vote"; by: string; target: string | null };
