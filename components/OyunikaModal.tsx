"use client";

import { useEffect, useState } from "react";
import { OYUNIKA_TRACK } from "@/lib/constants";
import type { OyunikaState } from "@/lib/types";

export function OyunikaLobbyModal({
  state,
  myUsername,
  onClose,
  onJoin,
  onLeave,
  onStart,
}: {
  state: OyunikaState;
  myUsername: string;
  onClose: () => void;
  onJoin: () => void;
  onLeave: () => void;
  onStart: () => void;
}) {
  const joined = state.players.some((p) => p.username.toLowerCase() === myUsername.toLowerCase());
  const isHost = state.host?.toLowerCase() === myUsername.toLowerCase();
  const isFull = state.players.length >= 5;

  return (
    <div className="bg-slate-900/95 backdrop-blur border-2 border-pink-500/80 rounded-2xl p-4 w-80 shadow-2xl space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-black text-pink-300 uppercase tracking-wider">🎉 Parti Oyunu · Lara</span>
        <button onClick={onClose} className="text-slate-400 hover:text-white text-xs px-1.5">
          ✕
        </button>
      </div>

      <p className="text-[11px] text-slate-300 leading-relaxed">
        Arkadaşlarınla (maksimum <strong className="text-pink-300">5 kişi</strong>) 60 karelik dev parkurda çift zar atarak yarış! Zarı 10 saniyede atmazsan otomatik atılır. İlk 3 bitiren liderlik kürsüsüne çıkar!
      </p>

      <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-2.5 space-y-1.5 text-[10px]">
        <div className="flex items-center gap-2 text-slate-200">
          <span className="w-3.5 h-3.5 rounded bg-slate-100 inline-block" /> <span>Düz Kare: Güvenli adım</span>
        </div>
        <div className="flex items-center gap-2 text-red-300">
          <span className="w-3.5 h-3.5 rounded bg-red-600 inline-block" /> <span>Kırmızı Kare: 1 tur bekleme cezası</span>
        </div>
        <div className="flex items-center gap-2 text-emerald-300">
          <span className="w-3.5 h-3.5 rounded bg-emerald-600 inline-block" /> <span>Yeşil Kare: +1 ekstra zar hakkı!</span>
        </div>
        <div className="flex items-center gap-2 text-purple-300">
          <span className="w-3.5 h-3.5 rounded bg-purple-600 inline-block" /> <span>Mor Kare: Rastgele ileri veya geri sürpriz!</span>
        </div>
        <div className="flex items-center gap-2 text-cyan-300">
          <span className="w-3.5 h-3.5 rounded bg-cyan-600 inline-block" /> <span>Mavi Kare: Hız Kuşağı, 5 kare ileri!</span>
        </div>
        <div className="flex items-center gap-2 text-orange-300">
          <span className="w-3.5 h-3.5 rounded bg-orange-600 inline-block" /> <span>Turuncu Kare: Geri Sar, 6 kare geri!</span>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
          <span>Lobideki Oyuncular</span>
          <span className="text-pink-400">{state.players.length} / 5</span>
        </div>
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-2 space-y-1 min-h-[64px]">
          {state.players.length === 0 ? (
            <div className="text-[11px] text-slate-500 text-center py-3">Henüz kimse katılmadı. İlk sen katıl!</div>
          ) : (
            state.players.map((pl, idx) => (
              <div key={pl.username} className="flex items-center justify-between text-xs bg-slate-900/90 px-2.5 py-1 rounded-lg">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: pl.shirtColor }} />
                  {pl.username}
                </span>
                <span className="text-[10px] font-bold text-pink-300">{idx === 0 ? "👑 Kurucu" : `#${idx + 1}`}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="flex gap-2">
        {!joined ? (
          <button
            disabled={isFull || state.status === "playing"}
            onClick={onJoin}
            className="flex-1 bg-pink-600 hover:bg-pink-500 disabled:opacity-40 text-white text-xs font-black py-2 rounded-xl transition"
          >
            {state.status === "playing" ? "Oyun Devam Ediyor" : isFull ? "Lobi Dolu (5/5)" : "🎲 Lobiye Katıl"}
          </button>
        ) : (
          <>
            <button onClick={onLeave} className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold px-3 py-2 rounded-xl">
              Ayrıl
            </button>
            {isHost ? (
              <button
                onClick={onStart}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black py-2 rounded-xl shadow-lg"
              >
                🚀 Oyunu Başlat ({state.players.length})
              </button>
            ) : (
              <div className="flex-1 bg-slate-800/80 text-pink-300 text-[11px] font-bold py-2 px-2 rounded-xl text-center">
                Kurucu başlatıyor...
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const TURN_SECONDS = 10;

/** Zar süresi: etrafında yeşil şeritle dönen yuvarlak sayaç */
function TurnRing({
  state,
  mine,
  rolling,
  onRoll,
  name,
}: {
  state: OyunikaState;
  mine: boolean;
  rolling: boolean;
  onRoll: () => void;
  name: string;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(t);
  }, []);
  const left = state.turnEndsAt ? Math.max(0, Math.min(TURN_SECONDS, (state.turnEndsAt - now) / 1000)) : TURN_SECONDS;
  const frac = left / TURN_SECONDS;
  const R = 42;
  const C = 2 * Math.PI * R;
  const color = frac > 0.5 ? "#22c55e" : frac > 0.25 ? "#f59e0b" : "#ef4444";
  const body = (
    <div className="relative w-[104px] h-[104px] mx-auto">
      <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
        <circle cx="50" cy="50" r={R} fill="none" stroke="rgba(148,163,184,0.25)" strokeWidth="7" />
        <circle
          cx="50"
          cy="50"
          r={R}
          fill="none"
          stroke={color}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - frac)}
          style={{ filter: `drop-shadow(0 0 4px ${color})` }}
        />
      </svg>
      <div className="absolute inset-[11px] rounded-full flex flex-col items-center justify-center bg-gradient-to-br from-pink-600 to-purple-700 text-white shadow-lg">
        <span className="text-2xl leading-none">{rolling ? "🎲" : mine ? "🎲" : "⏳"}</span>
        <span className="text-[11px] font-black mt-0.5">{rolling ? "Atılıyor" : `${Math.ceil(left)} sn`}</span>
      </div>
    </div>
  );
  if (mine) {
    return (
      <button disabled={rolling} onClick={onRoll} className={`block mx-auto ${rolling ? "opacity-70" : "hover:scale-105 transition-transform"}`} title="Zar at">
        {body}
        <div className="text-center text-[11px] font-black text-pink-200 mt-1">Sıra sende! Zar at</div>
      </button>
    );
  }
  return (
    <div>
      {body}
      <div className="text-center text-[11px] font-bold text-slate-300 mt-1">
        Sıra: <span className="text-pink-300">{name}</span>
      </div>
    </div>
  );
}

export function OyunikaHud({
  state,
  myUsername,
  rolling,
  onRoll,
  onReset,
  onLeaveRoom,
}: {
  state: OyunikaState;
  myUsername: string;
  rolling: boolean;
  onRoll: () => void;
  onReset: () => void;
  onLeaveRoom: () => void;
}) {
  const current = state.players[state.turnIndex];
  const isMyTurn = current?.username.toLowerCase() === myUsername.toLowerCase();
  const finishIdx = OYUNIKA_TRACK.length - 1;

  return (
    <div className="bg-slate-900/95 backdrop-blur border-2 border-pink-500/80 rounded-2xl p-3.5 w-80 shadow-2xl space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-black text-pink-300 uppercase tracking-wider">🎉 Parti Oyunu</span>
        <button onClick={onLeaveRoom} className="text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded-lg">
          Oyunika&apos;ya Dön
        </button>
      </div>

      {state.lastDice && (
        <div className="bg-slate-950/80 border border-pink-500/40 rounded-xl p-2 text-center space-y-1">
          <div className="flex items-center justify-center gap-2 text-lg font-black text-white">
            <span className="bg-pink-600/30 border border-pink-400 px-2.5 py-0.5 rounded-lg">🎲 {state.lastDice[0]}</span>
            <span className="text-pink-400">+</span>
            <span className="bg-pink-600/30 border border-pink-400 px-2.5 py-0.5 rounded-lg">🎲 {state.lastDice[1]}</span>
            <span className="text-yellow-300 text-sm">= {state.lastDice[0] + state.lastDice[1]} Adım</span>
          </div>
          {state.lastEventText && <div className="text-[11px] font-bold text-amber-200">{state.lastEventText}</div>}
        </div>
      )}

      <div className="space-y-1">
        {state.players.map((pl, idx) => {
          const active = state.status === "playing" && idx === state.turnIndex;
          return (
            <div
              key={pl.username}
              className={`flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg border ${
                active ? "bg-pink-950/70 border-pink-400 text-white" : "bg-slate-950/50 border-slate-800 text-slate-300"
              }`}
            >
              <span className="font-bold flex items-center gap-1.5 truncate">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: pl.shirtColor }} />
                <span className="truncate">{pl.username}</span>
                {pl.skipTurn && <span className="text-[10px] bg-red-600/80 text-white px-1.5 rounded">⏸️ Bekliyor</span>}
              </span>
              <span className="text-[11px] font-black text-pink-300 shrink-0">
                {pl.finished ? ["🥇", "🥈", "🥉", "🏅"][Math.min(3, state.finishOrder.indexOf(pl.username))] : `${pl.pos}/${finishIdx}`}
              </span>
            </div>
          );
        })}
      </div>

      {state.status === "finished" ? (
        <div className="bg-yellow-500/20 border border-yellow-400 rounded-xl p-2.5 text-center space-y-2">
          <div className="text-xs font-black text-yellow-300">🏆 Oyun bitti! Kürsü:</div>
          <div className="space-y-0.5">
            {state.finishOrder.slice(0, 3).map((n, i) => (
              <div key={n} className="text-xs font-black text-white">
                {["🥇 1.", "🥈 2.", "🥉 3."][i]} {n}
              </div>
            ))}
          </div>
          <button onClick={onReset} className="w-full bg-pink-600 hover:bg-pink-500 text-white text-xs font-black py-2 rounded-xl">
            🔄 Yeni Tur Başlat
          </button>
        </div>
      ) : state.players.length === 0 ? (
        <button onClick={onReset} className="w-full bg-pink-600 hover:bg-pink-500 text-white text-xs font-black py-2 rounded-xl">
          🎲 Tek Kişilik Test Oyunu Başlat
        </button>
      ) : (
        <TurnRing state={state} mine={isMyTurn} rolling={rolling} onRoll={onRoll} name={current?.username ?? "-"} />
      )}
    </div>
  );
}
