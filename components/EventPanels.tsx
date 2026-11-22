"use client";

import { useEffect, useState } from "react";
import { EVENT_THEMES } from "@/lib/constants";
import type { EventTheme, GameEvent } from "@/lib/types";

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function fmtLeft(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}g ${h}sa`;
  if (h > 0) return `${h}sa ${String(m).padStart(2, "0")}dk`;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

/** Üst orta şerit: aktif etkinlik, geri sayım ve ödül butonu */
export function EventBanner(props: { events: GameEvent[]; onOpen: () => void; onClaim: (id: string) => void }) {
  const now = useNow();
  const ev = props.events.find((e) => e.active && new Date(e.endsAt).getTime() > now);
  if (!ev) return null;
  const left = new Date(ev.endsAt).getTime() - now;
  return (
    <div className="pointer-events-auto flex items-center gap-2 bg-gradient-to-r from-fuchsia-600/90 to-amber-500/90 backdrop-blur text-white rounded-full pl-3 pr-1.5 py-1 shadow-lg border border-white/25 text-[11px] font-bold max-w-[92vw]">
      <button onClick={props.onOpen} className="flex items-center gap-1.5 min-w-0">
        <span>🎉</span>
        <span className="truncate">{ev.title}</span>
        {ev.coinMult > 1 && <span className="bg-black/30 rounded-full px-1.5 py-0.5 shrink-0">x{ev.coinMult} Sanil</span>}
        <span className="opacity-90 shrink-0 tabular-nums">⏳ {fmtLeft(left)}</span>
      </button>
      {ev.reward > 0 && !ev.claimed && (
        <button onClick={() => props.onClaim(ev.id)} className="bg-yellow-300 text-slate-900 rounded-full px-2 py-0.5 shrink-0 hover:bg-yellow-200">
          🎁 Al
        </button>
      )}
    </div>
  );
}

export function EventsPanel(props: {
  events: GameEvent[];
  isAdmin: boolean;
  onClose: () => void;
  onClaim: (id: string) => void;
  onCreate: (e: { title: string; description: string; theme: EventTheme; mult: number; reward: number; hours: number; startInMin: number }) => void;
  onEnd: (id: string) => void;
}) {
  const now = useNow();
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [theme, setTheme] = useState<EventTheme>("confetti");
  const [mult, setMult] = useState(2);
  const [reward, setReward] = useState(200);
  const [hours, setHours] = useState(3);
  const [startIn, setStartIn] = useState(0);

  return (
    <div className="bg-slate-900/95 border border-fuchsia-400/40 p-3.5 rounded-2xl w-72 md:w-80 space-y-2.5 max-h-[78vh] overflow-y-auto">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <span className="text-xs font-black text-fuchsia-300 tracking-wide">🎉 ETKİNLİKLER</span>
        <button onClick={props.onClose} className="text-slate-400 hover:text-white text-sm px-1">
          ✕
        </button>
      </div>

      {props.events.length === 0 && <div className="text-[11px] text-slate-400">Şu an planlı etkinlik yok. Takipte kal!</div>}
      {props.events.map((e) => {
        const start = new Date(e.startsAt).getTime();
        const end = new Date(e.endsAt).getTime();
        const live = start <= now && end > now;
        return (
          <div key={e.id} className={`rounded-xl border p-2.5 space-y-1 ${live ? "border-fuchsia-400/50 bg-fuchsia-500/10" : "border-slate-700 bg-slate-800/60"}`}>
            <div className="flex items-center justify-between gap-2">
              <b className="text-[12px] text-white">{e.title}</b>
              <span className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 ${live ? "bg-emerald-400 text-slate-950" : "bg-slate-600 text-slate-100"}`}>{live ? "CANLI" : "YAKINDA"}</span>
            </div>
            {e.description && <div className="text-[11px] text-slate-300">{e.description}</div>}
            <div className="flex flex-wrap gap-1 text-[10px] font-bold">
              {e.coinMult > 1 && <span className="bg-amber-400/20 text-amber-200 rounded px-1.5 py-0.5">x{e.coinMult} Sanil</span>}
              {e.reward > 0 && <span className="bg-sky-400/20 text-sky-200 rounded px-1.5 py-0.5">🎁 {e.reward} Sanil</span>}
              <span className="bg-slate-700 text-slate-200 rounded px-1.5 py-0.5">{live ? `⏳ ${fmtLeft(end - now)} kaldı` : `🕒 ${fmtLeft(start - now)} sonra`}</span>
            </div>
            <div className="flex gap-1.5 pt-0.5">
              {live && e.reward > 0 && (
                <button disabled={e.claimed} onClick={() => props.onClaim(e.id)} className="flex-1 bg-yellow-300 hover:bg-yellow-200 disabled:bg-slate-700 disabled:text-slate-400 text-slate-950 font-black text-[11px] py-1 rounded">
                  {e.claimed ? "Ödül alındı ✓" : "🎁 Ödülü Al"}
                </button>
              )}
              {props.isAdmin && (
                <button onClick={() => props.onEnd(e.id)} className="bg-rose-500/20 hover:bg-rose-500/40 text-rose-200 font-bold text-[11px] px-2 py-1 rounded">
                  Bitir
                </button>
              )}
            </div>
          </div>
        );
      })}

      {props.isAdmin && (
        <div className="border-t border-slate-800 pt-2.5 space-y-1.5">
          <div className="text-[11px] font-black text-amber-300">➕ YENİ ETKİNLİK (Admin)</div>
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} placeholder="Etkinlik adı" className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white" />
          <input value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={200} placeholder="Kısa açıklama" className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white" />
          <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-300">
            <label className="space-y-0.5">
              Tema
              <select value={theme} onChange={(e) => setTheme(e.target.value as EventTheme)} className="w-full bg-slate-800 border border-slate-700 rounded px-1 py-1 text-xs text-white">
                {EVENT_THEMES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-0.5">
              Sanil çarpanı
              <select value={mult} onChange={(e) => setMult(Number(e.target.value))} className="w-full bg-slate-800 border border-slate-700 rounded px-1 py-1 text-xs text-white">
                {[1, 2, 3, 4, 5].map((m) => (
                  <option key={m} value={m}>
                    x{m}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-0.5">
              Ödül (Sanil)
              <input type="number" min={0} max={5000} value={reward} onChange={(e) => setReward(Number(e.target.value))} className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white" />
            </label>
            <label className="space-y-0.5">
              Süre (saat)
              <input type="number" min={1} max={336} value={hours} onChange={(e) => setHours(Number(e.target.value))} className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white" />
            </label>
            <label className="space-y-0.5 col-span-2">
              Başlangıç (dakika sonra, 0 = şimdi)
              <input type="number" min={0} max={10080} value={startIn} onChange={(e) => setStartIn(Number(e.target.value))} className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white" />
            </label>
          </div>
          <button
            disabled={!title.trim()}
            onClick={() => {
              props.onCreate({ title: title.trim(), description: desc.trim(), theme, mult, reward, hours, startInMin: startIn });
              setTitle("");
              setDesc("");
            }}
            className="w-full bg-fuchsia-500 hover:bg-fuchsia-400 disabled:bg-slate-700 disabled:text-slate-400 text-slate-950 font-black text-xs py-1.5 rounded"
          >
            Etkinliği Başlat
          </button>
        </div>
      )}
    </div>
  );
}
