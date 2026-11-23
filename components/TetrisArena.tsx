"use client";
/* Oyun döngüsü ve tuş işleyicileri ref tabanlıdır; React Compiler ref kuralı bu bileşende bilerek kapalı. */
/* eslint-disable react-hooks/refs */

import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";
import { sfx } from "@/lib/sfx";
import {
  PIECE_COLORS,
  T_COLS,
  T_ROWS,
  TETRIS_DAILY_CAP,
  TETRIS_DUEL_WIN,
  TETRIS_SANIL_PER_1000,
  TetrisEngine,
  parseSnapshot,
  pieceCells,
  pieceId,
  type PieceType,
  type TetMsg,
} from "@/lib/tetris";

export interface TetrisBoardData {
  solo: { username: string; score: number }[];
  duel: { username: string; wins: number }[];
}
export interface TetrisSubmitResult {
  prize: number;
  coins: number;
  best: number;
  capped: boolean;
}

interface Opp {
  s: string;
  score: number;
  lines: number;
  alive: boolean;
  last: number;
}

type View = "menu" | "lobby" | "count" | "solo" | "duel" | "spectate" | "over";

const W = 620;
const H = 500;
const CELL = 24;
const BX = 120;
const BY = 10;

function drawCell(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, id: number, alpha = 1) {
  const col = PIECE_COLORS[id] ?? "#94a3b8";
  ctx.globalAlpha = alpha;
  ctx.fillStyle = col;
  ctx.fillRect(x, y, size, size);
  if (size >= 12) {
    ctx.fillStyle = "rgba(255,255,255,0.28)";
    ctx.fillRect(x, y, size, Math.max(2, size * 0.14));
    ctx.fillRect(x, y, Math.max(2, size * 0.14), size);
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(x, y + size - Math.max(2, size * 0.14), size, Math.max(2, size * 0.14));
  }
  ctx.globalAlpha = 1;
}

function drawGrid(ctx: CanvasRenderingContext2D, grid: number[][], x0: number, y0: number, size: number) {
  ctx.fillStyle = "#0b1020";
  ctx.fillRect(x0, y0, T_COLS * size, T_ROWS * size);
  ctx.strokeStyle = "rgba(148,163,184,0.08)";
  ctx.lineWidth = 1;
  if (size >= 12) {
    for (let x = 1; x < T_COLS; x++) {
      ctx.beginPath();
      ctx.moveTo(x0 + x * size, y0);
      ctx.lineTo(x0 + x * size, y0 + T_ROWS * size);
      ctx.stroke();
    }
    for (let y = 1; y < T_ROWS; y++) {
      ctx.beginPath();
      ctx.moveTo(x0, y0 + y * size);
      ctx.lineTo(x0 + T_COLS * size, y0 + y * size);
      ctx.stroke();
    }
  }
  for (let y = 0; y < T_ROWS; y++) for (let x = 0; x < T_COLS; x++) if (grid[y][x]) drawCell(ctx, x0 + x * size, y0 + y * size, size, grid[y][x]);
  ctx.strokeStyle = "#a78bfa";
  ctx.lineWidth = 2;
  ctx.strokeRect(x0 - 1, y0 - 1, T_COLS * size + 2, T_ROWS * size + 2);
}

function drawPiecePreview(ctx: CanvasRenderingContext2D, t: PieceType, cx: number, cy: number, size: number, alpha = 1) {
  const cells = pieceCells(t, 0);
  const minX = Math.min(...cells.map((c) => c[0]));
  const maxX = Math.max(...cells.map((c) => c[0]));
  const minY = Math.min(...cells.map((c) => c[1]));
  const maxY = Math.max(...cells.map((c) => c[1]));
  const w = (maxX - minX + 1) * size;
  const h = (maxY - minY + 1) * size;
  for (const [x, y] of cells) drawCell(ctx, cx - w / 2 + (x - minX) * size, cy - h / 2 + (y - minY) * size, size, pieceId(t), alpha);
}

export default function TetrisArena({
  me,
  send,
  netHandlerRef,
  submit,
  fetchBoard,
  onLeave,
  onActive,
  notify,
}: {
  me: string;
  send: (m: TetMsg) => void;
  netHandlerRef: MutableRefObject<((m: TetMsg) => void) | null>;
  submit: (mode: "solo" | "duel", score: number, lines: number, secs: number) => Promise<TetrisSubmitResult | null>;
  fetchBoard: () => Promise<TetrisBoardData>;
  onLeave: () => void;
  onActive: (active: boolean) => void;
  notify: (t: string) => void;
}) {
  const [view, setView] = useState<View>("menu");
  const viewRef = useRef<View>("menu");
  const [lobby, setLobby] = useState<string[]>([]);
  const lobbyRef = useRef<string[]>([]);
  const [board, setBoard] = useState<TetrisBoardData | null>(null);
  const [result, setResult] = useState<{ title: string; lines: string[] } | null>(null);
  const [countLeft, setCountLeft] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engRef = useRef<TetrisEngine | null>(null);
  const oppsRef = useRef<Map<string, Opp>>(new Map());
  const playersRef = useRef<string[]>([]);
  const startAtRef = useRef(0);
  const modeRef = useRef<"solo" | "duel">("solo");
  const finishedRef = useRef(false);
  const flashRef = useRef<{ text: string; at: number } | null>(null);
  const lastSendRef = useRef(0);
  const lastFlashRef = useRef(0);
  const meL = me.toLowerCase();

  const setViewBoth = useCallback((v: View) => {
    viewRef.current = v;
    setView(v);
  }, []);

  const loadBoard = useCallback(() => {
    void fetchBoard().then(setBoard).catch(() => {});
  }, [fetchBoard]);

  useEffect(() => {
    loadBoard();
    send({ t: "sync" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const active = view === "solo" || view === "duel" || view === "count";
    onActive(active);
    return () => onActive(false);
  }, [view, onActive]);

  const setLobbyBoth = (l: string[]) => {
    lobbyRef.current = l;
    setLobby(l);
  };

  /* ---------------- Oyun başlatma / bitirme ---------------- */

  const beginCountdown = useCallback(
    (seed: number, players: string[], at: number, mode: "solo" | "duel") => {
      modeRef.current = mode;
      playersRef.current = players;
      startAtRef.current = at;
      finishedRef.current = false;
      oppsRef.current = new Map();
      for (const p of players) if (p.toLowerCase() !== meL) oppsRef.current.set(p.toLowerCase(), { s: "0".repeat(T_COLS * T_ROWS), score: 0, lines: 0, alive: true, last: Date.now() });
      engRef.current = players.some((p) => p.toLowerCase() === meL) ? new TetrisEngine(seed) : null;
      setResult(null);
      setViewBoth(engRef.current ? "count" : "spectate");
    },
    [meL, setViewBoth],
  );

  const finish = useCallback(
    async (winner: string | null) => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      const eng = engRef.current;
      const mode = modeRef.current;
      const lines: string[] = [];
      let title = "Oyun bitti";
      if (eng) {
        const secs = Math.max(1, Math.round(eng.elapsed / 1000));
        lines.push(`Skor: ${eng.score} · Satır: ${eng.lines} · Seviye: ${eng.level}`);
        if (mode === "solo") {
          title = "Oyun bitti!";
          const r = await submit("solo", eng.score, eng.lines, secs).catch((e) => {
            notify(String((e as Error).message ?? e));
            return null;
          });
          if (r) lines.push(r.prize > 0 ? `💰 +${r.prize} Sanil kazandın!` : r.capped ? "Günlük Sanil sınırına ulaştın." : "Sanil için en az 1.000 puan gerekir.", `🏆 En iyi skorun: ${r.best}`);
        } else if (winner && winner.toLowerCase() === meL) {
          title = "🏆 Düelloyu kazandın!";
          const r = await submit("duel", eng.score, eng.lines, secs).catch((e) => {
            notify(String((e as Error).message ?? e));
            return null;
          });
          if (r) lines.push(r.prize > 0 ? `💰 +${r.prize} Sanil kazandın!` : "Günlük Sanil sınırına ulaştın.");
          sfx.play("win");
        } else {
          title = winner ? `Kazanan: ${winner}` : "Berabere";
        }
      } else {
        title = winner ? `Kazanan: ${winner}` : "Düello bitti";
      }
      setResult({ title, lines });
      setViewBoth("over");
      setLobbyBoth([]);
      loadBoard();
    },
    [loadBoard, meL, notify, setViewBoth, submit],
  );

  /* ---------------- Ağ ---------------- */

  useEffect(() => {
    netHandlerRef.current = (m: TetMsg) => {
      switch (m.t) {
        case "sync":
          if (lobbyRef.current[0]?.toLowerCase() === meL) send({ t: "lobby", players: lobbyRef.current });
          break;
        case "lobby":
          if (viewRef.current === "menu" || viewRef.current === "lobby" || viewRef.current === "over") setLobbyBoth(m.players);
          break;
        case "join":
          if (!lobbyRef.current.some((p) => p.toLowerCase() === m.u.toLowerCase())) setLobbyBoth([...lobbyRef.current, m.u].slice(0, 4));
          break;
        case "leave":
          setLobbyBoth(lobbyRef.current.filter((p) => p.toLowerCase() !== m.u.toLowerCase()));
          break;
        case "start":
          if (viewRef.current === "solo" || viewRef.current === "duel" || viewRef.current === "count") break;
          beginCountdown(m.seed, m.players, m.at, "duel");
          break;
        case "board": {
          const o = oppsRef.current.get(m.u.toLowerCase());
          if (o) {
            o.s = m.s;
            o.score = m.score;
            o.lines = m.lines;
            o.last = Date.now();
          }
          break;
        }
        case "garbage":
          if (m.to.toLowerCase() === meL) engRef.current?.addGarbage(m.n);
          break;
        case "dead": {
          const o = oppsRef.current.get(m.u.toLowerCase());
          if (o) o.alive = false;
          break;
        }
      }
    };
    return () => {
      netHandlerRef.current = null;
    };
  }, [beginCountdown, meL, netHandlerRef, send]);

  /* ---------------- Ana döngü ---------------- */

  useEffect(() => {
    if (view !== "count" && view !== "solo" && view !== "duel" && view !== "spectate") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    let prev = performance.now();
    let aliveMe = true;
    const loop = (now: number) => {
      const dt = Math.min(64, now - prev);
      prev = now;
      const eng = engRef.current;
      const mode = modeRef.current;
      const cur = viewRef.current;

      if (cur === "count") {
        const left = startAtRef.current - Date.now();
        setCountLeft(Math.max(0, Math.ceil(left / 1000)));
        if (left <= 0) setViewBoth(mode === "solo" ? "solo" : "duel");
      } else if ((cur === "solo" || cur === "duel") && eng && !finishedRef.current) {
        if (!eng.gameOver) {
          eng.step(dt);
          if (eng.outGarbage > 0) {
            if (mode === "duel") {
              const targets = [...oppsRef.current.entries()].filter(([, o]) => o.alive);
              if (targets.length) {
                const [name] = targets[Math.floor(Math.random() * targets.length)];
                const real = playersRef.current.find((p) => p.toLowerCase() === name) ?? name;
                send({ t: "garbage", from: me, to: real, n: eng.outGarbage });
              }
            }
            eng.outGarbage = 0;
          }
          if (eng.lastClear && eng.lastClear.at !== lastFlashRef.current) {
            lastFlashRef.current = eng.lastClear.at;
            flashRef.current = { text: eng.lastClear.label, at: performance.now() };
            sfx.play(eng.lastClear.lines >= 4 ? "win" : "pop");
          }
        } else if (aliveMe) {
          aliveMe = false;
          sfx.play("error");
          if (mode === "duel") send({ t: "dead", u: me });
          else void finish(null);
        }
        if (mode === "duel" && Date.now() - lastSendRef.current > 350) {
          lastSendRef.current = Date.now();
          send({ t: "board", u: me, s: eng.snapshot(), score: eng.score, lines: eng.lines });
        }
      }
      // Düello sonucu: hayatta kalan sayısı
      if ((cur === "duel" || cur === "spectate") && !finishedRef.current) {
        const nowMs = Date.now();
        let aliveCount = 0;
        let last: string | null = null;
        const meIn = playersRef.current.some((p) => p.toLowerCase() === meL);
        if (meIn && eng && !eng.gameOver) {
          aliveCount++;
          last = me;
        }
        for (const [name, o] of oppsRef.current) {
          if (o.alive && nowMs - o.last > 12000 && nowMs - startAtRef.current > 12000) o.alive = false;
          if (o.alive) {
            aliveCount++;
            last = playersRef.current.find((p) => p.toLowerCase() === name) ?? name;
          }
        }
        if (aliveCount <= 1 && nowMs - startAtRef.current > 1500) void finish(last);
      }

      draw(ctx);
      raf = requestAnimationFrame(loop);
    };
    const draw = (c: CanvasRenderingContext2D) => {
      c.clearRect(0, 0, W, H);
      const eng = engRef.current;
      const grid = eng ? eng.grid.map((r) => r.slice()) : Array.from({ length: T_ROWS }, () => Array(T_COLS).fill(0));
      if (eng && !eng.gameOver) {
        const gy = eng.ghostY();
        for (const [cx, cy] of pieceCells(eng.cur.type, eng.cur.rot)) {
          const x = eng.cur.x + cx;
          const y = gy + cy;
          if (y >= 0 && y < T_ROWS && grid[y][x] === 0) grid[y][x] = -1;
        }
      }
      drawGrid(c, grid.map((r) => r.map((v) => (v > 0 ? v : 0))), BX, BY, CELL);
      if (eng && !eng.gameOver) {
        const gy = eng.ghostY();
        for (const [cx, cy] of pieceCells(eng.cur.type, eng.cur.rot)) {
          const x = eng.cur.x + cx;
          if (gy + cy >= 0) drawCell(c, BX + x * CELL, BY + (gy + cy) * CELL, CELL, pieceId(eng.cur.type), 0.22);
        }
        for (const [cx, cy] of pieceCells(eng.cur.type, eng.cur.rot)) {
          const y = eng.cur.y + cy;
          if (y >= 0) drawCell(c, BX + (eng.cur.x + cx) * CELL, BY + y * CELL, CELL, pieceId(eng.cur.type));
        }
        if (eng.pendingGarbage > 0) {
          c.fillStyle = "#ef4444";
          c.fillRect(BX - 8, BY + (T_ROWS - Math.min(T_ROWS, eng.pendingGarbage)) * CELL, 5, Math.min(T_ROWS, eng.pendingGarbage) * CELL);
        }
      }
      c.fillStyle = "#e2e8f0";
      c.font = "bold 12px sans-serif";
      c.textAlign = "center";
      c.fillText("TUT (C)", 60, 24);
      c.strokeStyle = "#475569";
      c.strokeRect(20, 32, 80, 64);
      if (eng?.hold) drawPiecePreview(c, eng.hold, 60, 64, 16, eng.canHold ? 1 : 0.4);
      c.fillText("SIRADAKİ", 430, 24);
      eng?.next(3).forEach((t, i) => drawPiecePreview(c, t, 430, 62 + i * 54, 16));
      c.textAlign = "left";
      c.font = "bold 13px sans-serif";
      c.fillStyle = "#cbd5e1";
      c.fillText("SKOR", 380, 244);
      c.font = "900 22px sans-serif";
      c.fillStyle = "#fde68a";
      c.fillText(String(eng?.score ?? 0), 380, 268);
      c.font = "bold 12px sans-serif";
      c.fillStyle = "#cbd5e1";
      c.fillText(`Satır: ${eng?.lines ?? 0}`, 380, 292);
      c.fillText(`Seviye: ${eng?.level ?? 1}`, 380, 310);
      // Rakipler
      const opps = [...oppsRef.current.entries()];
      const sz = opps.length <= 2 ? 11 : 8;
      opps.forEach(([name, o], i) => {
        const real = playersRef.current.find((p) => p.toLowerCase() === name) ?? name;
        const ox = opps.length <= 2 ? 500 : 480 + (i % 2) * 70;
        const oy = opps.length <= 2 ? 40 + i * 230 : 30 + Math.floor(i / 2) * 230;
        c.save();
        c.globalAlpha = o.alive ? 1 : 0.4;
        drawGrid(c, parseSnapshot(o.s), ox, oy, sz);
        c.fillStyle = "#e2e8f0";
        c.font = "bold 11px sans-serif";
        c.textAlign = "left";
        c.fillText(`${o.alive ? "" : "💀 "}${real}`.slice(0, 12), ox, oy - 6);
        c.fillStyle = "#fde68a";
        c.fillText(String(o.score), ox, oy + T_ROWS * sz + 14);
        c.restore();
      });
      const fl = flashRef.current;
      if (fl && performance.now() - fl.at < 1100) {
        c.save();
        c.globalAlpha = 1 - (performance.now() - fl.at) / 1100;
        c.font = "900 26px sans-serif";
        c.textAlign = "center";
        c.fillStyle = "#fde047";
        c.strokeStyle = "#7c2d12";
        c.lineWidth = 4;
        c.strokeText(fl.text, BX + (T_COLS * CELL) / 2, BY + 150);
        c.fillText(fl.text, BX + (T_COLS * CELL) / 2, BY + 150);
        c.restore();
      }
      if (viewRef.current === "count") {
        c.fillStyle = "rgba(2,6,23,0.6)";
        c.fillRect(BX, BY, T_COLS * CELL, T_ROWS * CELL);
        c.fillStyle = "#fff";
        c.font = "900 80px sans-serif";
        c.textAlign = "center";
        const left = Math.max(1, Math.ceil((startAtRef.current - Date.now()) / 1000));
        c.fillText(String(left), BX + (T_COLS * CELL) / 2, BY + 260);
      }
      if (eng?.gameOver && viewRef.current === "duel") {
        c.fillStyle = "rgba(2,6,23,0.6)";
        c.fillRect(BX, BY, T_COLS * CELL, T_ROWS * CELL);
        c.fillStyle = "#fca5a5";
        c.font = "900 24px sans-serif";
        c.textAlign = "center";
        c.fillText("ELENDİN", BX + (T_COLS * CELL) / 2, BY + 240);
        c.font = "bold 12px sans-serif";
        c.fillStyle = "#cbd5e1";
        c.fillText("Diğerlerini izle...", BX + (T_COLS * CELL) / 2, BY + 262);
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [view, finish, me, meL, send, setViewBoth]);

  /* ---------------- Klavye ---------------- */

  useEffect(() => {
    if (view !== "solo" && view !== "duel") return;
    const down = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      const eng = engRef.current;
      if (!eng || eng.gameOver) return;
      const k = e.key.toLowerCase();
      let handled = true;
      if (k === "arrowleft" || k === "a") eng.move(-1);
      else if (k === "arrowright" || k === "d") eng.move(1);
      else if (k === "arrowup" || k === "x" || k === "w") eng.rotate(1);
      else if (k === "z") eng.rotate(-1);
      else if (k === "arrowdown" || k === "s") eng.setSoft(true);
      else if (k === " ") {
        if (!e.repeat) eng.hardDrop();
      } else if (k === "c" || k === "shift") eng.doHold();
      else handled = false;
      if (handled) e.preventDefault();
    };
    const up = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "arrowdown" || k === "s") engRef.current?.setSoft(false);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [view]);

  /* ---------------- Dokunmatik tuşlar ---------------- */

  const holdTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const press = (fn: () => void, repeat = false) => (e: React.PointerEvent) => {
    e.preventDefault();
    fn();
    if (repeat) {
      if (holdTimer.current) clearInterval(holdTimer.current);
      holdTimer.current = setInterval(fn, 95);
    }
  };
  const release = () => {
    if (holdTimer.current) clearInterval(holdTimer.current);
    holdTimer.current = null;
    engRef.current?.setSoft(false);
  };
  useEffect(() => () => release(), []);

  /* ---------------- Menü eylemleri ---------------- */

  const startSolo = () => {
    const seed = Math.floor(Math.random() * 2 ** 31);
    beginCountdown(seed, [me], Date.now() + 3200, "solo");
  };
  const joinLobby = () => {
    if (!lobbyRef.current.some((p) => p.toLowerCase() === meL)) {
      setLobbyBoth([...lobbyRef.current, me].slice(0, 4));
      send({ t: "join", u: me });
    }
    setViewBoth("lobby");
  };
  const leaveLobby = () => {
    send({ t: "leave", u: me });
    setLobbyBoth(lobbyRef.current.filter((p) => p.toLowerCase() !== meL));
    setViewBoth("menu");
  };
  const startDuel = () => {
    const players = lobbyRef.current;
    if (players.length < 2) return notify("Düello için en az 2 oyuncu gerekir.");
    const seed = Math.floor(Math.random() * 2 ** 31);
    const at = Date.now() + 3500;
    send({ t: "start", seed, players, at });
    beginCountdown(seed, players, at, "duel");
  };
  const quitGame = () => {
    if (viewRef.current === "duel" && engRef.current && !engRef.current.gameOver) send({ t: "dead", u: me });
    if (engRef.current) engRef.current.gameOver = true;
    finishedRef.current = true;
    send({ t: "leave", u: me });
    setLobbyBoth(lobbyRef.current.filter((p) => p.toLowerCase() !== meL));
    setViewBoth("menu");
  };

  const inLobby = lobby.some((p) => p.toLowerCase() === meL);
  const leader = lobby[0]?.toLowerCase() === meL;
  const playing = view === "solo" || view === "duel" || view === "count" || view === "spectate";

  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[60] bg-slate-950/88 backdrop-blur-sm flex items-center justify-center p-2 overflow-auto">
      <div className="w-full max-w-[660px] bg-slate-900 border-2 border-violet-500/70 rounded-2xl p-3 shadow-2xl space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-black text-violet-300 tracking-wide">🧱 BLOK RÜZGÂRI</span>
          {playing ? (
            <button onClick={quitGame} className="text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded-lg">
              Çık
            </button>
          ) : (
            <button onClick={onLeave} className="text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded-lg">
              Oyunika&apos;ya Dön
            </button>
          )}
        </div>

        {playing && (
          <>
            <canvas ref={canvasRef} width={W} height={H} className="w-full max-h-[62vh] rounded-xl bg-slate-950 mx-auto" style={{ aspectRatio: `${W}/${H}` }} />
            {(view === "solo" || view === "duel") && (
              <div className="grid grid-cols-6 gap-1.5 select-none touch-none">
                <button className="tbtn" onPointerDown={press(() => engRef.current?.move(-1), true)} onPointerUp={release} onPointerLeave={release}>◀</button>
                <button className="tbtn" onPointerDown={press(() => engRef.current?.move(1), true)} onPointerUp={release} onPointerLeave={release}>▶</button>
                <button className="tbtn" onPointerDown={press(() => engRef.current?.rotate(1))}>⟳</button>
                <button className="tbtn" onPointerDown={press(() => engRef.current?.setSoft(true))} onPointerUp={release} onPointerLeave={release}>▼</button>
                <button className="tbtn" onPointerDown={press(() => engRef.current?.hardDrop())}>⬇</button>
                <button className="tbtn" onPointerDown={press(() => engRef.current?.doHold())}>Tut</button>
              </div>
            )}
            {view === "count" && <div className="text-center text-xs text-slate-400">Hazır ol… {countLeft > 0 ? countLeft : ""}</div>}
            {view === "spectate" && <div className="text-center text-xs text-slate-300">👀 Düelloyu izliyorsun</div>}
            <div className="text-[10px] text-slate-500 text-center">
              ← → hareket · ↑/X döndür · Z ters döndür · ↓ yavaş indir · Boşluk hızlı bırak · C tut
            </div>
          </>
        )}

        {view === "menu" && (
          <div className="space-y-2.5">
            <p className="text-xs text-slate-300">
              Klasik blok düşürme oyunu. Satırları doldur, puan topla; düelloda çoklu satır silince rakiplerine çöp satır gönder.
              Tek kişilik skorun her 1.000 puanında <b className="text-yellow-300">{TETRIS_SANIL_PER_1000} Sanil</b> kazanırsın (günlük en fazla {TETRIS_DAILY_CAP}). Düello galibine{" "}
              <b className="text-yellow-300">{TETRIS_DUEL_WIN} Sanil</b>.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={startSolo} className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:brightness-110 text-white text-sm font-black py-3 rounded-xl">
                🎮 Tek Kişilik
              </button>
              <button onClick={joinLobby} className="bg-gradient-to-r from-rose-600 to-orange-500 hover:brightness-110 text-white text-sm font-black py-3 rounded-xl">
                ⚔️ Düello Lobisi {lobby.length > 0 && `(${lobby.length}/4)`}
              </button>
            </div>
            <Leaderboard board={board} />
          </div>
        )}

        {view === "lobby" && (
          <div className="space-y-2.5">
            <div className="text-xs font-black text-orange-300">⚔️ Düello Lobisi ({lobby.length}/4)</div>
            <div className="space-y-1">
              {lobby.map((p, i) => (
                <div key={p} className="flex items-center justify-between text-xs bg-slate-950/70 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200">
                  <span className="font-bold">{p}</span>
                  {i === 0 && <span className="text-[10px] text-yellow-300">👑 Kurucu</span>}
                </div>
              ))}
              {lobby.length === 0 && <div className="text-xs text-slate-500">Henüz kimse yok.</div>}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={leaveLobby} className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-black py-2.5 rounded-xl">
                Lobiden Çık
              </button>
              {leader ? (
                <button onClick={startDuel} disabled={lobby.length < 2} className="bg-gradient-to-r from-rose-600 to-orange-500 disabled:opacity-40 text-white text-xs font-black py-2.5 rounded-xl">
                  ▶ Düelloyu Başlat
                </button>
              ) : (
                <div className="text-center text-[11px] text-slate-400 py-2.5">Kurucunun başlatması bekleniyor…</div>
              )}
            </div>
            {!inLobby && <div className="text-[11px] text-slate-500">Lobiye katılmadın.</div>}
          </div>
        )}

        {view === "over" && result && (
          <div className="space-y-2.5 text-center">
            <div className="text-lg font-black text-yellow-300">{result.title}</div>
            {result.lines.map((l) => (
              <div key={l} className="text-xs text-slate-200">{l}</div>
            ))}
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setViewBoth("menu")} className="bg-violet-600 hover:bg-violet-500 text-white text-xs font-black py-2.5 rounded-xl">
                Menüye Dön
              </button>
              <button onClick={startSolo} className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-black py-2.5 rounded-xl">
                🎮 Tekrar Oyna
              </button>
            </div>
            <Leaderboard board={board} />
          </div>
        )}
      </div>
      <style jsx>{`
        .tbtn {
          background: #1e293b;
          border: 1px solid #475569;
          color: #e2e8f0;
          font-weight: 900;
          font-size: 16px;
          padding: 12px 0;
          border-radius: 12px;
        }
        .tbtn:active {
          background: #7c3aed;
        }
      `}</style>
    </div>,
    document.body,
  );
}

function Leaderboard({ board }: { board: TetrisBoardData | null }) {
  if (!board) return null;
  return (
    <div className="grid grid-cols-2 gap-2 text-[11px]">
      <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-2">
        <div className="font-black text-violet-300 mb-1">🏆 En Yüksek Skor</div>
        {board.solo.length === 0 && <div className="text-slate-500">Henüz yok</div>}
        {board.solo.slice(0, 5).map((r, i) => (
          <div key={r.username} className="flex justify-between text-slate-200">
            <span>{i + 1}. {r.username}</span>
            <span className="text-yellow-300 font-bold">{r.score}</span>
          </div>
        ))}
      </div>
      <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-2">
        <div className="font-black text-orange-300 mb-1">⚔️ Düello Galibiyeti</div>
        {board.duel.length === 0 && <div className="text-slate-500">Henüz yok</div>}
        {board.duel.slice(0, 5).map((r, i) => (
          <div key={r.username} className="flex justify-between text-slate-200">
            <span>{i + 1}. {r.username}</span>
            <span className="text-yellow-300 font-bold">{r.wins}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

