"use client";
/* Bu kanca, motor (canvas) nesnelerini ve ağ olaylarını zorunlu (imperative) yöneten bir oyun denetleyicisidir; React Compiler'ın ref/değişmezlik kuralları burada bilerek kapalı. */
/* eslint-disable react-hooks/refs, react-hooks/immutability, react-hooks/preserve-manual-memoization */
import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";
import type { GameEngine } from "@/lib/engine";
import type { RoomNetwork } from "@/lib/network";
import type { Player, Profile } from "@/lib/types";
import { sfx } from "@/lib/sfx";
import {
  HAIN_BOTS,
  HAIN_DISCUSS_MS,
  HAIN_INITIAL,
  HAIN_KILL_COOLDOWN_MS,
  HAIN_KILL_RANGE,
  HAIN_MAX_PLAYERS,
  HAIN_MIN_PLAYERS,
  HAIN_REPORT_RANGE,
  HAIN_STATIONS,
  HAIN_TABLE,
  HAIN_TASKS_PER_CREW,
  HAIN_TASK_MS,
  HAIN_TASK_RANGE,
  HAIN_VOTE_MS,
  type HainMsg,
  type HainPlayerPub,
  type HainRole,
  type HainState,
} from "@/lib/hain";

export const HAIN_ROOM = "hain-avi";
const HUB_ROOM = "oyunika";

export interface HainMine {
  role: HainRole;
  tasks: string[];
  done: string[];
  mates: string[];
}

interface Deps {
  engineRef: MutableRefObject<GameEngine | null>;
  netRef: MutableRefObject<RoomNetwork | null>;
  profileRef: MutableRefObject<Profile>;
  myId: string;
  roomSlug: string;
  changeRoom: (slug: string) => Promise<void>;
  notify: (m: string, ms?: number) => void;
  sys: (m: string) => void;
}

const shuffle = <T,>(a: T[]): T[] => {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
};

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

export interface HainNear {
  station: string | null;
  body: string | null;
  table: boolean;
  killTarget: string | null;
}

export function useHainAvi(d: Deps) {
  const { engineRef, netRef, profileRef, myId, roomSlug, changeRoom, notify, sys } = d;

  const [state, setStateRaw] = useState<HainState>(HAIN_INITIAL);
  const stateRef = useRef<HainState>(HAIN_INITIAL);
  const [mine, setMineRaw] = useState<HainMine | null>(null);
  const mineRef = useRef<HainMine | null>(null);
  const [revealUntil, setRevealUntil] = useState(0);
  const [near, setNear] = useState<HainNear>({ station: null, body: null, table: false, killTarget: null });
  const [taskPct, setTaskPct] = useState<{ id: string; pct: number } | null>(null);
  const [killReadyAt, setKillReadyAt] = useState(0);
  const [myVote, setMyVote] = useState<string | null | undefined>(undefined);
  const [, setTick] = useState(0);

  // host tarafı
  const roles = useRef<Map<string, { role: HainRole; tasks: string[]; done: string[] }>>(new Map());
  const killAt = useRef<Map<string, number>>(new Map());
  const votes = useRef<Map<string, string | null>>(new Map());
  const buttonUsed = useRef<Set<string>>(new Set());
  const missing = useRef<Map<string, number>>(new Map());
  const botNext = useRef<Map<string, number>>(new Map());
  const startFinalizing = useRef(false);
  // istemci tarafı
  const taskRef = useRef<{ id: string; start: number } | null>(null);
  const lastHostSeen = useRef(0);
  const myName = () => profileRef.current.username;
  const isHost = () => !!stateRef.current.host && same(stateRef.current.host, myName());

  const setMine = (m: HainMine | null) => {
    mineRef.current = m;
    setMineRaw(m);
  };
  const setStateBoth = (s: HainState) => {
    stateRef.current = s;
    setStateRaw(s);
  };

  const send = useCallback(
    (msg: HainMsg) => {
      netRef.current?.send("action", { id: myId, hain: msg });
    },
    [netRef, myId],
  );

  /** Host: durumu uygula + yayınla */
  const commit = useCallback(
    (patch: Partial<HainState>) => {
      const next: HainState = { ...stateRef.current, ...patch, seq: stateRef.current.seq + 1 };
      setStateBoth(next);
      send({ t: "state", state: next });
      return next;
    },
    [send],
  );

  const humans = () => stateRef.current.players.filter((p) => !p.bot);
  const playerPub = (name: string) => stateRef.current.players.find((p) => same(p.username, name));
  const posOf = (name: string): { gx: number; gy: number } | null => {
    const eng = engineRef.current;
    const pl = eng?.players.find((x) => !x.isNpc && same(x.name, name));
    return pl ? { gx: pl.gx, gy: pl.gy } : null;
  };

  /* ---------------- Görseller (hayalet/ceset/işaretler) ---------------- */
  const applyVisuals = useCallback(() => {
    const eng = engineRef.current;
    if (!eng) return;
    const s = stateRef.current;
    if (roomSlug !== HAIN_ROOM || s.status === "idle" || s.status === "lobby") {
      eng.bodies = [];
      eng.marks = [];
      eng.vision = null;
      for (const pl of eng.players) {
        if (pl.ghost || pl.hidden) {
          pl.ghost = false;
          pl.hidden = false;
        }
      }
      return;
    }
    const mePub = s.players.find((p) => same(p.username, myName()));
    const meAlive = mePub ? mePub.alive : true;
    for (const pl of eng.players) {
      if (pl.isNpc) continue;
      const pub = s.players.find((p) => same(p.username, pl.name));
      pl.ghost = !!pub && !pub.alive;
      pl.hidden = !!pub && !pub.alive && meAlive && pl.id !== myId && s.status !== "finished";
    }
    eng.bodies = s.bodies.map((b) => ({ gx: b.gx, gy: b.gy, name: b.username, color: s.players.find((p) => same(p.username, b.username))?.shirt ?? "#94a3b8" }));
    const m = mineRef.current;
    eng.vision = s.status === "playing" && meAlive && s.players.some((p) => same(p.username, myName())) ? (m?.role === "traitor" ? 7.5 : 5.5) : null;
    eng.marks =
      m && s.status === "playing"
        ? m.tasks
            .map((id) => HAIN_STATIONS.find((x) => x.id === id))
            .filter((x): x is NonNullable<typeof x> => !!x)
            .map((st) => ({ gx: st.gx, gy: st.gy, icon: st.icon, done: m.done.includes(st.id) }))
        : [];
  }, [engineRef, roomSlug, myId]);

  /* ---------------- Host: kazanma kontrolü ve olaylar ---------------- */
  const hostWinCheck = useCallback(
    (players: HainPlayerPub[], tasksDone: number, tasksTotal: number): "crew" | "traitor" | null => {
      const alive = players.filter((p) => p.alive);
      const tAlive = alive.filter((p) => roles.current.get(p.username)?.role === "traitor").length;
      const cAlive = alive.length - tAlive;
      if (tAlive === 0) return "crew";
      if (tAlive >= cAlive) return "traitor";
      if (tasksTotal > 0 && tasksDone >= tasksTotal) return "crew";
      return null;
    },
    [],
  );

  const hostFinish = useCallback(
    (winner: "crew" | "traitor", players: HainPlayerPub[], tasksDone: number, text?: string) => {
      const reveal = players.map((p) => ({ username: p.username, role: (roles.current.get(p.username)?.role ?? "crew") as HainRole }));
      commit({
        status: "finished",
        players,
        tasksDone,
        winner,
        winText: text ?? (winner === "crew" ? "Mürettebat kazandı!" : "Hainler kazandı!"),
        reveal,
        bodies: [],
        meeting: null,
      });
    },
    [commit],
  );

  const hostKill = useCallback(
    (by: string, target: string) => {
      const s = stateRef.current;
      if (s.status !== "playing") return;
      const killer = roles.current.get(by);
      const victim = s.players.find((p) => same(p.username, target));
      const kPub = s.players.find((p) => same(p.username, by));
      if (!killer || killer.role !== "traitor" || !kPub?.alive || !victim?.alive) return;
      if (roles.current.get(victim.username)?.role === "traitor") return;
      if ((killAt.current.get(by) ?? 0) > Date.now()) return;
      const a = posOf(by);
      const b = posOf(target);
      if (!a || !b || Math.hypot(a.gx - b.gx, a.gy - b.gy) > HAIN_KILL_RANGE + 0.8) return;
      killAt.current.set(by, Date.now() + HAIN_KILL_COOLDOWN_MS);
      const players = s.players.map((p) => (same(p.username, target) ? { ...p, alive: false } : p));
      const bodies = [...s.bodies, { username: victim.username, gx: Math.round(b.gx), gy: Math.round(b.gy) }];
      const w = hostWinCheck(players, s.tasksDone, s.tasksTotal);
      if (w) hostFinish(w, players, s.tasksDone, w === "traitor" ? "Hainler mürettebatı etkisiz hale getirdi!" : undefined);
      else commit({ players, bodies });
    },
    [commit, hostFinish, hostWinCheck],
  );

  const hostStartMeeting = useCallback(
    (caller: string, reason: "body" | "button", body?: string) => {
      const s = stateRef.current;
      if (s.status !== "playing") return;
      votes.current.clear();
      commit({
        status: "meeting",
        meeting: { phase: "discuss", endsAt: Date.now() + HAIN_DISCUSS_MS, caller, reason, body, voted: [] },
      });
    },
    [commit],
  );

  const hostResolveVotes = useCallback(() => {
    const s = stateRef.current;
    if (!s.meeting) return;
    const alive = s.players.filter((p) => p.alive);
    const tally = new Map<string, number>();
    let skips = 0;
    for (const p of alive) {
      const v = votes.current.get(p.username);
      if (v === undefined || v === null) skips++;
      else tally.set(v, (tally.get(v) ?? 0) + 1);
    }
    let top: string | null = null;
    let topN = 0;
    let tie = false;
    for (const [name, n] of tally) {
      if (n > topN) {
        top = name;
        topN = n;
        tie = false;
      } else if (n === topN) tie = true;
    }
    if (tie || topN <= skips) top = null;
    const parts = [...tally.entries()].sort((a, b) => b[1] - a[1]).map(([n, c]) => `${n}: ${c}`);
    if (skips) parts.push(`Atla: ${skips}`);
    let text = `📊 Oylar → ${parts.join(" · ") || "kimse oy vermedi"}. `;
    let players = s.players;
    if (top) {
      const wasTraitor = roles.current.get(top)?.role === "traitor";
      players = s.players.map((p) => (same(p.username, top as string) ? { ...p, alive: false } : p));
      text += `${top} dışarı atıldı. ${wasTraitor ? "🔪 Hain'di!" : "😢 Hain değildi."}`;
    } else text += "Kimse atılmadı.";
    commit({ players, meeting: { ...s.meeting, phase: "result", endsAt: Date.now() + 6000, resultText: text } });
  }, [commit]);

  const hostEndMeeting = useCallback(() => {
    const s = stateRef.current;
    const w = hostWinCheck(s.players, s.tasksDone, s.tasksTotal);
    if (w) {
      hostFinish(w, s.players, s.tasksDone, w === "crew" ? "Tüm hainler bulundu!" : "Hainler mürettebatı etkisiz hale getirdi!");
      return;
    }
    for (const [u, r] of roles.current) if (r.role === "traitor") killAt.current.set(u, Date.now() + 10000);
    commit({ status: "playing", meeting: null, bodies: [] });
  }, [commit, hostFinish, hostWinCheck]);

  const sendRoles = useCallback(() => {
    for (const p of humans()) {
      const r = roles.current.get(p.username);
      if (!r) continue;
      const mates = r.role === "traitor" ? [...roles.current].filter(([u, x]) => x.role === "traitor" && !same(u, p.username)).map(([u]) => u) : [];
      if (same(p.username, myName())) continue;
      send({ t: "role", to: p.username, role: r.role, tasks: r.tasks, mates });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [send]);

  const hostTask = useCallback(
    (user: string, task: string) => {
      const s = stateRef.current;
      if (s.status !== "playing" && s.status !== "meeting") return;
      const r = roles.current.get(user);
      if (!r || r.role !== "crew" || !r.tasks.includes(task) || r.done.includes(task)) return;
      r.done.push(task);
      const tasksDone = s.tasksDone + 1;
      const w = hostWinCheck(s.players, tasksDone, s.tasksTotal);
      if (w) hostFinish(w, s.players, tasksDone, "Tüm görevler tamamlandı!");
      else commit({ tasksDone });
    },
    [commit, hostFinish, hostWinCheck],
  );

  /* ---------------- Lobi ---------------- */
  const meAsPub = (): HainPlayerPub => {
    const p = profileRef.current;
    return { username: p.username, shirt: p.shirtColor, hair: p.hairColor, skin: p.skinColor, alive: true };
  };

  const openLobby = () => {
    const s = stateRef.current;
    if (s.status === "lobby" && s.players.some((p) => same(p.username, myName()))) return;
    sfx.play("click");
    commit({ ...HAIN_INITIAL, status: "lobby", host: myName(), players: [meAsPub()], seq: s.seq });
  };

  const join = () => {
    const s = stateRef.current;
    if (s.status !== "lobby") return notify("Lobi açık değil.");
    if (s.players.length >= HAIN_MAX_PLAYERS) return notify("Lobi dolu!");
    if (s.players.some((p) => same(p.username, myName()))) return;
    sfx.play("click");
    send({ t: "join", p: meAsPub() });
  };

  const leave = () => {
    const s = stateRef.current;
    if (isHost() && (s.status === "lobby" || s.status === "finished")) {
      const rest = s.players.filter((p) => !same(p.username, myName()) && !p.bot);
      if (rest.length === 0) commit({ ...HAIN_INITIAL, seq: s.seq });
      else commit({ host: rest[0].username, players: rest });
      return;
    }
    if (isHost()) {
      commit({ ...HAIN_INITIAL, seq: s.seq });
      return;
    }
    send({ t: "leave", user: myName() });
    if (s.status === "lobby") setStateBoth({ ...s, players: s.players.filter((p) => !same(p.username, myName())) });
  };

  const start = (opts?: { test?: boolean; asTraitor?: boolean }) => {
    const s = stateRef.current;
    if (!isHost() || s.status !== "lobby") return;
    let players = s.players;
    if (opts?.test) players = [meAsPub(), ...HAIN_BOTS.map((b) => ({ ...b, alive: true }))];
    else if (players.length < HAIN_MIN_PLAYERS) return notify(`Hain Avı için en az ${HAIN_MIN_PLAYERS} oyuncu gerekli.`);
    players = players.map((p) => ({ ...p, alive: true }));
    const n = players.length;
    const tCount = n >= 7 ? 2 : 1;
    let traitors: string[];
    if (opts?.test) {
      traitors = opts.asTraitor ? [myName()] : [players[1 + Math.floor(Math.random() * 3)].username];
    } else traitors = shuffle(players.map((p) => p.username)).slice(0, tCount);
    roles.current.clear();
    killAt.current.clear();
    votes.current.clear();
    buttonUsed.current.clear();
    missing.current.clear();
    const ids = HAIN_STATIONS.map((x) => x.id);
    for (const p of players) {
      roles.current.set(p.username, {
        role: traitors.some((t) => same(t, p.username)) ? "traitor" : "crew",
        tasks: shuffle(ids).slice(0, HAIN_TASKS_PER_CREW),
        done: [],
      });
      if (traitors.some((t) => same(t, p.username))) killAt.current.set(p.username, Date.now() + 25000);
    }
    const crew = players.length - traitors.length;
    const mine0 = roles.current.get(myName());
    if (mine0)
      setMine({
        role: mine0.role,
        tasks: mine0.tasks,
        done: [],
        mates: mine0.role === "traitor" ? traitors.filter((t) => !same(t, myName())) : [],
      });
    startFinalizing.current = false;
    sfx.play("win");
    commit({
      status: "starting",
      players,
      bodies: [],
      tasksDone: 0,
      tasksTotal: crew * HAIN_TASKS_PER_CREW,
      meeting: null,
      winner: null,
      winText: null,
      reveal: null,
      test: !!opts?.test,
      startedAt: Date.now(),
    });
    void changeRoom(HAIN_ROOM);
  };

  const rematch = () => {
    const s = stateRef.current;
    if (!isHost() || s.status !== "finished") return;
    setMine(null);
    commit({
      status: "lobby",
      players: s.players.map((p) => ({ ...p, alive: true })),
      bodies: [],
      tasksDone: 0,
      tasksTotal: 0,
      meeting: null,
      winner: null,
      winText: null,
      reveal: null,
    });
    void changeRoom(HUB_ROOM).then(() => setTimeout(() => send({ t: "state", state: stateRef.current }), 1800));
  };

  const exitToHub = () => {
    const s = stateRef.current;
    if (s.status === "playing" || s.status === "meeting" || s.status === "starting") leave();
    setMine(null);
    void changeRoom(HUB_ROOM);
  };

  /* ---------------- Oyun içi eylemler ---------------- */
  const doKill = () => {
    if (!near.killTarget || mineRef.current?.role !== "traitor") return;
    if (killReadyAt > Date.now()) return;
    sfx.play("error");
    setKillReadyAt(Date.now() + HAIN_KILL_COOLDOWN_MS);
    if (isHost()) hostKill(myName(), near.killTarget);
    else send({ t: "kill", by: myName(), target: near.killTarget });
  };

  const doReport = () => {
    if (!near.body) return;
    sfx.play("notify");
    if (isHost()) hostStartMeeting(myName(), "body", near.body);
    else send({ t: "report", by: myName(), body: near.body });
  };

  const doButton = () => {
    if (!near.table) return;
    sfx.play("notify");
    if (isHost()) {
      if (buttonUsed.current.has(myName())) return notify("Acil toplantı hakkını kullandın.");
      buttonUsed.current.add(myName());
      hostStartMeeting(myName(), "button");
    } else send({ t: "button", by: myName() });
  };

  const startTask = () => {
    if (!near.station || taskRef.current) return;
    sfx.play("click");
    taskRef.current = { id: near.station, start: Date.now() };
    setTaskPct({ id: near.station, pct: 0 });
  };

  const vote = (target: string | null) => {
    if (stateRef.current.status !== "meeting" || stateRef.current.meeting?.phase !== "vote") return;
    setMyVote(target);
    sfx.play("click");
    if (isHost()) {
      votes.current.set(myName(), target);
      commit({ meeting: { ...(stateRef.current.meeting as NonNullable<HainState["meeting"]>), voted: [...new Set([...(stateRef.current.meeting?.voted ?? []), myName()])] } });
    } else send({ t: "vote", by: myName(), target });
  };

  /* ---------------- Ağ mesajları ---------------- */
  const onNet = useCallback(
    (m: HainMsg) => {
      const s = stateRef.current;
      switch (m.t) {
        case "state": {
          if (!m.state || typeof m.state.status !== "string") return;
          if (m.state.host !== s.host || m.state.seq >= s.seq || s.status === "idle") {
            lastHostSeen.current = Date.now();
            const prev = s;
            setStateBoth(m.state);
            const inGame = m.state.players.some((p) => same(p.username, myName()));
            if (m.state.status === "starting" && inGame && roomSlugNow() !== HAIN_ROOM) void changeRoom(HAIN_ROOM);
            if (m.state.status === "meeting" && prev.status !== "meeting") {
              taskRef.current = null;
              setTaskPct(null);
              setMyVote(undefined);
              sfx.play("notify");
            }
            if (m.state.status === "finished" && prev.status !== "finished") {
              sfx.play(m.state.winner === mineRef.current?.role ? "win" : "error");
              const mePub = m.state.players.find((p) => same(p.username, myName()));
              void mePub;
            }
            if (m.state.status === "idle" && prev.status !== "idle") {
              setMine(null);
              if (roomSlugNow() === HAIN_ROOM) {
                notify("Oyun iptal edildi.");
                void changeRoom(HUB_ROOM);
              }
            }
            applyVisualsRef.current();
          }
          return;
        }
        case "role": {
          if (!same(m.to, myName())) return;
          setMine({ role: m.role, tasks: m.tasks, done: mineRef.current?.done ?? [], mates: m.mates });
          if (!mineRef.current || Date.now() > revealUntilRef.current) {
            revealUntilRef.current = Date.now() + 6000;
            setRevealUntil(revealUntilRef.current);
            sfx.play("level");
          }
          return;
        }
        case "syncReq": {
          if (!isHost()) return;
          if (s.status === "lobby" || s.status === "idle") send({ t: "state", state: s });
          else {
            send({ t: "state", state: s });
            const r = roles.current.get(m.user);
            if (r && s.status !== "starting") {
              const mates = r.role === "traitor" ? [...roles.current].filter(([u, x]) => x.role === "traitor" && !same(u, m.user)).map(([u]) => u) : [];
              send({ t: "role", to: m.user, role: r.role, tasks: r.tasks, mates });
            }
          }
          return;
        }
        default:
          break;
      }
      // Aşağıdakiler sadece host işler
      if (!isHost()) return;
      switch (m.t) {
        case "join": {
          if (s.status !== "lobby" || s.players.length >= HAIN_MAX_PLAYERS) return;
          if (s.players.some((p) => same(p.username, m.p.username))) return;
          commit({ players: [...s.players, { ...m.p, alive: true }] });
          break;
        }
        case "leave": {
          if (s.status === "lobby" || s.status === "finished") commit({ players: s.players.filter((p) => !same(p.username, m.user)) });
          else if (s.status === "playing" || s.status === "meeting" || s.status === "starting") hostPlayerGone(m.user);
          break;
        }
        case "task":
          hostTask(m.user, m.task);
          break;
        case "kill":
          hostKill(m.by, m.target);
          break;
        case "report": {
          const bodyOk = s.bodies.some((b) => same(b.username, m.body));
          if (bodyOk && playerPub(m.by)?.alive) hostStartMeeting(m.by, "body", m.body);
          break;
        }
        case "button": {
          if (!playerPub(m.by)?.alive || buttonUsed.current.has(m.by)) return;
          buttonUsed.current.add(m.by);
          hostStartMeeting(m.by, "button");
          break;
        }
        case "vote": {
          if (s.status !== "meeting" || s.meeting?.phase !== "vote" || !playerPub(m.by)?.alive) return;
          votes.current.set(m.by, m.target);
          commit({ meeting: { ...s.meeting, voted: [...new Set([...s.meeting.voted, m.by])] } });
          break;
        }
        default:
          break;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [changeRoom, commit, hostKill, hostStartMeeting, hostTask, send],
  );

  const applyVisualsRef = useRef(applyVisuals);
  useEffect(() => {
    applyVisualsRef.current = applyVisuals;
  }, [applyVisuals]);
  const roomRef = useRef(roomSlug);
  useEffect(() => {
    roomRef.current = roomSlug;
  }, [roomSlug]);
  const roomSlugNow = () => roomRef.current;
  const revealUntilRef = useRef(0);

  const hostPlayerGone = useCallback(
    (user: string) => {
      const s = stateRef.current;
      const players = s.players.map((p) => (same(p.username, user) ? { ...p, alive: false } : p));
      const w = hostWinCheck(players, s.tasksDone, s.tasksTotal);
      if (w) hostFinish(w, players, s.tasksDone, "Bir oyuncu ayrıldı.");
      else commit({ players });
    },
    [commit, hostFinish, hostWinCheck],
  );

  /** Lobiye/odaya girince mevcut durumu iste (geç gelenler için) */
  useEffect(() => {
    if (roomSlug !== HUB_ROOM && roomSlug !== HAIN_ROOM) return;
    const t = setTimeout(() => send({ t: "syncReq", user: myName() }), 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomSlug, send]);

  /* ---------------- Ana döngü (400 ms) ---------------- */
  useEffect(() => {
    const iv = setInterval(() => {
      const s = stateRef.current;
      const eng = engineRef.current;
      const inHain = roomRef.current === HAIN_ROOM;
      const now = Date.now();
      const me = eng?.me();

      applyVisualsRef.current();

      // Yakınlık (HUD düğmeleri)
      if (inHain && me && (s.status === "playing" || s.status === "meeting")) {
        const m = mineRef.current;
        const mePub = s.players.find((p) => same(p.username, myName()));
        const alive = mePub ? mePub.alive : true;
        let station: string | null = null;
        if (m && s.status === "playing") {
          for (const id of m.tasks) {
            if (m.done.includes(id)) continue;
            const st = HAIN_STATIONS.find((x) => x.id === id);
            if (st && Math.hypot(me.gx - st.gx, me.gy - st.gy) <= HAIN_TASK_RANGE) {
              station = id;
              break;
            }
          }
        }
        let body: string | null = null;
        if (alive && s.status === "playing") for (const b of s.bodies) if (Math.hypot(me.gx - b.gx, me.gy - b.gy) <= HAIN_REPORT_RANGE) body = b.username;
        const table = alive && s.status === "playing" && Math.hypot(me.gx - HAIN_TABLE.gx, me.gy - HAIN_TABLE.gy) <= HAIN_REPORT_RANGE;
        let killTarget: string | null = null;
        if (alive && m?.role === "traitor" && s.status === "playing") {
          let best = 99;
          for (const p of s.players) {
            if (!p.alive || same(p.username, myName()) || m.mates.some((x) => same(x, p.username))) continue;
            const pos = posOf(p.username);
            if (!pos) continue;
            const dd = Math.hypot(me.gx - pos.gx, me.gy - pos.gy);
            if (dd <= HAIN_KILL_RANGE && dd < best) {
              best = dd;
              killTarget = p.username;
            }
          }
        }
        setNear((cur) => (cur.station === station && cur.body === body && cur.table === table && cur.killTarget === killTarget ? cur : { station, body, table, killTarget }));
      } else setNear((cur) => (cur.station || cur.body || cur.table || cur.killTarget ? { station: null, body: null, table: false, killTarget: null } : cur));

      // Görev ilerlemesi
      const tk = taskRef.current;
      if (tk) {
        const st = HAIN_STATIONS.find((x) => x.id === tk.id);
        const fail = !me || !st || s.status !== "playing" || Math.hypot(me.gx - st.gx, me.gy - st.gy) > HAIN_TASK_RANGE + 0.8;
        if (fail) {
          taskRef.current = null;
          setTaskPct(null);
        } else {
          const pct = Math.min(1, (now - tk.start) / HAIN_TASK_MS);
          setTaskPct({ id: tk.id, pct });
          if (pct >= 1) {
            taskRef.current = null;
            setTaskPct(null);
            const m = mineRef.current;
            if (m && !m.done.includes(tk.id)) {
              setMine({ ...m, done: [...m.done, tk.id] });
              sfx.play("coin");
              if (m.role === "crew") {
                if (isHost()) hostTask(myName(), tk.id);
                else send({ t: "task", user: myName(), task: tk.id });
              } else notify("Görev yapıyormuş gibi davrandın 😈", 1800);
            }
          }
        }
      }

      // Meeting sırasında hareket kilidi
      if (inHain && s.status === "meeting" && me && me.path.length) me.path = [];

      // ---- Host döngüsü ----
      if (isHost()) {
        if (s.status === "starting" && inHain && !startFinalizing.current) {
          const present = (n: string) => !!eng?.players.some((p) => !p.isNpc && same(p.name, n));
          const everyone = humans().every((p) => present(p.username));
          if (everyone || now - s.startedAt > 12000) {
            startFinalizing.current = true;
            const gone = humans().filter((p) => !present(p.username)).map((p) => p.username);
            let players = s.players.filter((p) => !gone.some((g) => same(g, p.username)));
            const tCount = players.filter((p) => roles.current.get(p.username)?.role === "traitor").length;
            if (players.length < 2 || tCount === 0) {
              commit({ ...HAIN_INITIAL, seq: s.seq });
              notify("Oyun başlatılamadı (oyuncular eksik).");
              void changeRoom(HUB_ROOM);
            } else {
              const crew = players.length - tCount;
              players = players.map((p) => ({ ...p, alive: true }));
              commit({ status: "playing", players, tasksTotal: crew * HAIN_TASKS_PER_CREW, startedAt: now });
              sendRoles();
              setTimeout(sendRoles, 1200);
              setTimeout(sendRoles, 2800);
              revealUntilRef.current = now + 6000;
              setRevealUntil(revealUntilRef.current);
              setKillReadyAt(now + 25000);
              sfx.play("level");
            }
          }
        }
        if (s.status === "playing" || s.status === "meeting") {
          // ayrılan oyuncular
          for (const p of s.players) {
            if (p.bot || !p.alive || same(p.username, myName())) continue;
            const here = !!eng?.players.some((x) => !x.isNpc && same(x.name, p.username));
            if (here) missing.current.delete(p.username);
            else {
              const t0 = missing.current.get(p.username) ?? now;
              missing.current.set(p.username, t0);
              if (now - t0 > 15000) {
                missing.current.delete(p.username);
                hostPlayerGone(p.username);
                return;
              }
            }
          }
        }
        if (s.status === "meeting" && s.meeting) {
          const mt = s.meeting;
          if (mt.phase === "discuss" && now >= mt.endsAt) commit({ meeting: { ...mt, phase: "vote", endsAt: now + HAIN_VOTE_MS } });
          else if (mt.phase === "vote") {
            const alive = s.players.filter((p) => p.alive);
            if (now >= mt.endsAt || alive.every((p) => votes.current.has(p.username))) hostResolveVotes();
          } else if (mt.phase === "result" && now >= mt.endsAt) hostEndMeeting();
        }
        if (s.test) botsTick(s, now);
      } else if (s.status !== "idle" && s.status !== "lobby" && s.host && inHain) {
        // host kayboldu mu?
        const hostHere = !!eng?.players.some((x) => !x.isNpc && same(x.name, s.host as string));
        if (hostHere) lastHostSeen.current = now;
        else if (lastHostSeen.current && now - lastHostSeen.current > 20000) {
          setStateBoth({ ...HAIN_INITIAL, seq: s.seq + 1 });
          setMine(null);
          notify("Kurucu ayrıldı, oyun iptal edildi.");
          void changeRoom(HUB_ROOM);
        } else if (!lastHostSeen.current) lastHostSeen.current = now;
      }
      setTick((x) => (x + 1) % 1000);
    }, 400);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------- Test botları (host) ---------------- */
  const botsTick = (s: HainState, now: number) => {
    const eng = engineRef.current;
    if (!eng || roomRef.current !== HAIN_ROOM) return;
    for (const b of s.players.filter((p) => p.bot)) {
      let pl = eng.players.find((x) => !x.isNpc && same(x.name, b.username));
      if (!pl) {
        pl = {
          id: `bot_${b.username}`,
          name: b.username,
          gx: 12 + Math.floor(Math.random() * 3),
          gy: 7 + Math.floor(Math.random() * 2),
          path: [],
          shirtColor: b.shirt,
          hairColor: b.hair,
          skinColor: b.skin,
          hat: null,
          glasses: null,
          top: null,
          back: null,
          hairStyle: "hs_short",
          role: "user",
          isSitting: false,
          isDancing: false,
          isRidingHorse: false,
        } as Player;
        eng.players.push(pl);
      }
      if (!b.alive || s.status !== "playing") continue;
      const next = botNext.current.get(b.username) ?? 0;
      if (now < next) continue;
      botNext.current.set(b.username, now + 3500 + Math.random() * 3500);
      const r = roles.current.get(b.username);
      const me = eng.me();
      const alivePlayers = s.players.filter((p) => p.alive && !same(p.username, b.username));
      let to = { gx: 0, gy: 0 };
      if (r?.role === "traitor" && alivePlayers.length) {
        const target = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
        const pos = same(target.username, myName()) ? (me ? { gx: me.gx, gy: me.gy } : null) : posOf(target.username);
        const prey = pos ?? { gx: 13, gy: 8 };
        // yakın kare seç
        to = { gx: Math.round(prey.gx), gy: Math.round(prey.gy) };
        // eleme dene
        const victim = alivePlayers.find((p) => {
          const pp = posOf(p.username);
          return pp && Math.hypot(pl.gx - pp.gx, pl.gy - pp.gy) <= HAIN_KILL_RANGE && roles.current.get(p.username)?.role !== "traitor";
        });
        if (victim && (killAt.current.get(b.username) ?? 0) <= now) {
          hostKill(b.username, victim.username);
          return;
        }
      } else if (r?.role === "crew") {
        const todo = r.tasks.filter((t) => !r.done.includes(t));
        if (todo.length && Math.random() < 0.55) {
          const st = HAIN_STATIONS.find((x) => x.id === todo[0]);
          if (st) {
            to = { gx: st.gx, gy: st.gy };
            if (Math.hypot(pl.gx - st.gx, pl.gy - st.gy) < 2.5) {
              hostTask(b.username, st.id);
              continue;
            }
          }
        } else to = { gx: 1 + Math.floor(Math.random() * 26), gy: 1 + Math.floor(Math.random() * 16) };
      }
      const path = eng.computePath({ gx: Math.round(pl.gx), gy: Math.round(pl.gy) }, to);
      if (path && path.length) pl.path = path;
    }
    // Botlar oylama yapar
    if (s.status === "meeting" && s.meeting?.phase === "vote") {
      const alive = s.players.filter((p) => p.alive);
      for (const b of alive.filter((p) => p.bot)) {
        if (votes.current.has(b.username)) continue;
        const pick = Math.random();
        const cand = alive.filter((p) => !same(p.username, b.username));
        votes.current.set(b.username, pick < 0.35 ? null : cand[Math.floor(Math.random() * cand.length)].username);
      }
    }
  };

  /** Oda değişince: Hain Avı'ndan ayrılan canlı oyuncu oyundan düşer (host değilse bildir) */
  const prevRoom = useRef(roomSlug);
  useEffect(() => {
    const prev = prevRoom.current;
    prevRoom.current = roomSlug;
    if (prev === HAIN_ROOM && roomSlug !== HAIN_ROOM) {
      const s = stateRef.current;
      if (s.status === "playing" || s.status === "meeting") {
        if (!isHost()) send({ t: "leave", user: myName() });
      }
      if (s.status === "finished" || s.status === "idle") setMine(null);
    }
    applyVisualsRef.current();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomSlug]);

  const iAmIn = state.players.some((p) => same(p.username, profileRef.current.username));
  const mePub = state.players.find((p) => same(p.username, profileRef.current.username));
  const locked = roomSlug === HAIN_ROOM && state.status === "meeting";

  void sys;
  return {
    state,
    mine,
    near,
    taskPct,
    killReadyAt,
    revealUntil,
    myVote,
    iAmIn,
    iAmAlive: mePub ? mePub.alive : true,
    isHost: !!state.host && same(state.host, profileRef.current.username),
    locked,
    onNet,
    openLobby,
    join,
    leave,
    start,
    rematch,
    exitToHub,
    doKill,
    doReport,
    doButton,
    startTask,
    vote,
  };
}
