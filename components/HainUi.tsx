"use client";
import { useEffect, useState } from "react";
import { HAIN_MAX_PLAYERS, HAIN_MIN_PLAYERS, HAIN_STATIONS, HAIN_TASKS_PER_CREW, type HainState } from "@/lib/hain";
import type { useHainAvi } from "./useHainAvi";

type Hain = ReturnType<typeof useHainAvi>;
const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

const card = "bg-slate-900/95 backdrop-blur border-2 rounded-2xl shadow-2xl";

function useNow(ms = 250) {
  const [n, setN] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setN(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return n;
}

/* ---------------- Lobi (Komutan Demir) ---------------- */
export function HainLobbyModal({
  h,
  me,
  isAdmin,
  onClose,
}: {
  h: Hain;
  me: string;
  isAdmin: boolean;
  onClose: () => void;
}) {
  const s = h.state;
  const inLobby = s.status === "lobby";
  const joined = h.iAmIn && inLobby;
  const busy = !inLobby && s.status !== "idle" && s.status !== "finished" && !h.iAmIn;
  return (
    <div className={`${card} border-sky-500/80 p-4 w-80 space-y-3`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-black text-sky-300 uppercase tracking-wider">🚀 Hain Avı · Komutan Demir</span>
        <button onClick={onClose} className="text-slate-400 hover:text-white text-xs px-1.5">
          ✕
        </button>
      </div>
      <p className="text-[11px] text-slate-300 leading-relaxed">
        Uzay gemisinde aramızda <strong className="text-rose-300">hain</strong> var! Mürettebat görevleri tamamlayıp haini bulur, hain ise sessizce herkesi eler. Karanlık gemide yalnızca yakınını görürsün (duvar ardını göremezsin; hainin görüşü biraz daha geniş).
        <br />
        <span className="text-slate-400">
          {HAIN_MIN_PLAYERS}-{HAIN_MAX_PLAYERS} oyuncu · ceset bulunca toplantı, oylamayla atma.
        </span>
      </p>

      {inLobby ? (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
            <span>Lobi</span>
            <span className="text-sky-400">
              {s.players.length} / {HAIN_MAX_PLAYERS}
            </span>
          </div>
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-2 space-y-1 min-h-[60px]">
            {s.players.map((p, i) => (
              <div key={p.username} className="flex items-center justify-between text-xs bg-slate-900/90 px-2.5 py-1 rounded-lg">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: p.shirt }} />
                  {p.username}
                </span>
                <span className="text-[10px] font-bold text-sky-300">{i === 0 ? "👑 Kurucu" : `#${i + 1}`}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            {!joined ? (
              <button onClick={h.join} className="flex-1 bg-sky-600 hover:bg-sky-500 text-white text-xs font-black py-2 rounded-xl">
                🚀 Lobiye Katıl
              </button>
            ) : (
              <>
                <button onClick={h.leave} className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold px-3 py-2 rounded-xl">
                  Ayrıl
                </button>
                {h.isHost ? (
                  <button
                    disabled={s.players.length < HAIN_MIN_PLAYERS}
                    onClick={() => h.start()}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-black py-2 rounded-xl"
                  >
                    {s.players.length < HAIN_MIN_PLAYERS ? `En az ${HAIN_MIN_PLAYERS} kişi gerek` : `🚀 Başlat (${s.players.length})`}
                  </button>
                ) : (
                  <div className="flex-1 bg-slate-800/80 text-sky-300 text-[11px] font-bold py-2 px-2 rounded-xl text-center">Kurucu başlatıyor...</div>
                )}
              </>
            )}
          </div>
        </div>
      ) : (
        <>
          {busy && <div className="text-[11px] text-amber-200 bg-amber-500/10 border border-amber-500/30 rounded-lg px-2 py-1.5">Başka bir tur oynanıyor olabilir; yine de kendi lobini açabilirsin.</div>}
          <button onClick={h.openLobby} className="w-full bg-sky-600 hover:bg-sky-500 text-white text-xs font-black py-2 rounded-xl">
            🚀 Yeni Lobi Aç
          </button>
        </>
      )}

      {isAdmin && (
        <div className="border-t border-slate-800 pt-2 space-y-1.5">
          <div className="text-[10px] text-slate-500">🛠️ Yönetici test modu (3 bot)</div>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => {
                if (!(h.state.status === "lobby" && h.isHost)) h.openLobby();
                setTimeout(() => h.start({ test: true, asTraitor: false }), 150);
              }}
              className="text-[11px] font-bold py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700"
            >
              🧑‍🚀 Mürettebat olarak
            </button>
            <button
              onClick={() => {
                if (!(h.state.status === "lobby" && h.isHost)) h.openLobby();
                setTimeout(() => h.start({ test: true, asTraitor: true }), 150);
              }}
              className="text-[11px] font-bold py-1.5 rounded-lg bg-rose-500/15 border border-rose-500/40 text-rose-200 hover:bg-rose-500/25"
            >
              🔪 Hain olarak
            </button>
          </div>
        </div>
      )}
      <div className="hidden">{me}</div>
    </div>
  );
}

/* ---------------- Oyun HUD'u ---------------- */
export function HainHud({ h }: { h: Hain }) {
  const s = h.state;
  const now = useNow();
  const m = h.mine;
  const pct = s.tasksTotal ? Math.round((s.tasksDone / s.tasksTotal) * 100) : 0;
  const killLeft = Math.max(0, Math.ceil((h.killReadyAt - now) / 1000));
  const isTraitor = m?.role === "traitor";
  const playing = s.status === "playing";

  if (s.status === "finished") {
    return (
      <div className={`${card} border-yellow-400/80 p-3.5 w-80 space-y-2`}>
        <div className="text-xs font-black text-yellow-300">{s.winner === "crew" ? "🧑‍🚀 MÜRETTEBAT KAZANDI" : "🔪 HAİNLER KAZANDI"}</div>
        <div className="text-[11px] text-slate-300">{s.winText}</div>
        <div className="space-y-1">
          {(s.reveal ?? []).map((r) => (
            <div key={r.username} className="flex items-center justify-between text-xs bg-slate-950/60 border border-slate-800 rounded-lg px-2 py-1">
              <span className="text-slate-200 font-bold">{r.username}</span>
              <span className={r.role === "traitor" ? "text-rose-300 font-black" : "text-sky-300"}>{r.role === "traitor" ? "🔪 Hain" : "🧑‍🚀 Mürettebat"}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={h.exitToHub} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold py-2 rounded-xl">
            Salona Dön
          </button>
          {h.isHost && (
            <button onClick={h.rematch} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black py-2 rounded-xl">
              🔄 Yeni Tur
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`${card} ${isTraitor ? "border-rose-500/80" : "border-sky-500/80"} p-3 w-80 space-y-2.5`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-black text-sky-300 uppercase tracking-wider">🚀 Hain Avı</span>
        <button onClick={h.exitToHub} className="text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded-lg">
          Oyundan Çık
        </button>
      </div>

      {s.status === "starting" && <div className="text-xs text-slate-300 bg-slate-800/70 rounded-lg px-2 py-2 text-center">⏳ Roller dağıtılıyor...</div>}

      {(playing || s.status === "meeting") && (
        <>
          <div>
            <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
              <span>Ortak görev ilerlemesi</span>
              <span className="text-emerald-300 font-bold">%{pct}</span>
            </div>
            <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>

          {m && (
            <div className={`rounded-xl border px-2.5 py-2 space-y-1 ${isTraitor ? "bg-rose-950/50 border-rose-500/40" : "bg-slate-950/60 border-slate-800"}`}>
              <div className={`text-[11px] font-black ${isTraitor ? "text-rose-300" : "text-sky-300"}`}>
                {isTraitor ? "🔪 HAİNSİN" : "🧑‍🚀 MÜRETTEBATSIN"}
                {isTraitor && m.mates.length > 0 && <span className="text-rose-200 font-bold"> · Ortak: {m.mates.join(", ")}</span>}
                {!h.iAmAlive && <span className="text-slate-400"> · 👻 Hayalet</span>}
              </div>
              <div className="text-[10px] text-slate-400">{isTraitor ? "Sahte görevler (yapıyormuş gibi davran):" : `Görevlerin (${m.done.length}/${HAIN_TASKS_PER_CREW}):`}</div>
              <div className="space-y-0.5">
                {m.tasks.map((id) => {
                  const st = HAIN_STATIONS.find((x) => x.id === id);
                  if (!st) return null;
                  const done = m.done.includes(id);
                  return (
                    <div key={id} className={`text-[11px] flex items-center gap-1.5 ${done ? "text-slate-500 line-through" : "text-slate-200"}`}>
                      <span>{done ? "✅" : st.icon}</span>
                      <span className="font-bold">{st.name}</span>
                      <span className="text-slate-500">· {st.zone}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {playing && (
            <div className="space-y-1.5">
              {h.taskPct && (
                <div className="h-3 rounded-full bg-slate-800 overflow-hidden border border-amber-400/50">
                  <div className="h-full bg-amber-400 transition-all" style={{ width: `${Math.round(h.taskPct.pct * 100)}%` }} />
                </div>
              )}
              {h.near.station && !h.taskPct && (
                <button onClick={h.startTask} className="w-full bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black py-2 rounded-xl animate-pulse">
                  🛠️ {HAIN_STATIONS.find((x) => x.id === h.near.station)?.name} — Görevi Yap
                </button>
              )}
              {h.near.body && (
                <button onClick={h.doReport} className="w-full bg-rose-600 hover:bg-rose-500 text-white text-xs font-black py-2 rounded-xl animate-pulse">
                  🚨 Cesedi Bildir ({h.near.body})
                </button>
              )}
              {h.near.table && h.iAmAlive && (
                <button onClick={h.doButton} className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-100 text-xs font-bold py-2 rounded-xl">
                  📢 Acil Toplantı Çağır
                </button>
              )}
              {isTraitor && h.iAmAlive && (
                <button
                  disabled={!h.near.killTarget || killLeft > 0}
                  onClick={h.doKill}
                  className="w-full bg-rose-700 hover:bg-rose-600 disabled:opacity-40 text-white text-xs font-black py-2 rounded-xl"
                >
                  🔪 Ele {killLeft > 0 ? `(${killLeft} sn)` : h.near.killTarget ? `(${h.near.killTarget})` : "(yakında kimse yok)"}
                </button>
              )}
            </div>
          )}
        </>
      )}

      <div className="flex flex-wrap gap-1">
        {s.players.map((p) => (
          <span key={p.username} className={`text-[10px] px-1.5 py-0.5 rounded-full border ${p.alive ? "border-slate-700 text-slate-200" : "border-slate-800 text-slate-600 line-through"}`}>
            <span className="inline-block w-2 h-2 rounded-full mr-1 align-middle" style={{ backgroundColor: p.shirt }} />
            {p.username}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Toplantı ---------------- */
export function HainMeeting({ h, me }: { h: Hain; me: string }) {
  const s: HainState = h.state;
  const now = useNow();
  const mt = s.meeting;
  if (s.status !== "meeting" || !mt) return null;
  const left = Math.max(0, Math.ceil((mt.endsAt - now) / 1000));
  const alive = s.players.filter((p) => p.alive);
  const iAmAlive = h.iAmAlive;
  const voting = mt.phase === "vote";
  return (
    <div className="fixed inset-x-0 top-20 z-[60] flex justify-center px-3 pointer-events-none">
      <div className={`${card} border-amber-400/80 w-full max-w-md p-4 space-y-3 pointer-events-auto`}>
        <div className="flex items-center justify-between">
          <div className="text-sm font-black text-amber-300">
            {mt.reason === "body" ? `🚨 ${mt.body} bulundu!` : "📢 Acil Toplantı"}
          </div>
          <div className="text-xs font-black text-white bg-slate-800 rounded-lg px-2 py-1">
            {mt.phase === "discuss" ? "Tartışma" : mt.phase === "vote" ? "Oylama" : "Sonuç"} · {left} sn
          </div>
        </div>
        <div className="text-[11px] text-slate-400">Çağıran: {mt.caller}. {mt.phase === "discuss" ? "Alttaki sohbet kutusundan konuşun, şüphelileri sorgulayın." : ""}</div>

        {mt.phase === "result" ? (
          <div className="text-sm text-slate-100 bg-slate-950/70 border border-slate-700 rounded-xl p-3 leading-relaxed">{mt.resultText}</div>
        ) : (
          <div className="grid grid-cols-2 gap-1.5">
            {alive.map((p) => {
              const picked = h.myVote === p.username;
              const hasVoted = mt.voted.some((v) => same(v, p.username));
              return (
                <button
                  key={p.username}
                  disabled={!voting || !iAmAlive || h.myVote !== undefined || same(p.username, me)}
                  onClick={() => h.vote(p.username)}
                  className={`flex items-center justify-between text-xs px-2.5 py-2 rounded-xl border transition ${
                    picked ? "bg-rose-600 border-rose-300 text-white" : "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 disabled:hover:bg-slate-800"
                  } disabled:opacity-70`}
                >
                  <span className="flex items-center gap-1.5 truncate">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.shirt }} />
                    <span className="truncate font-bold">{p.username}</span>
                  </span>
                  {hasVoted && <span title="Oy kullandı">🗳️</span>}
                </button>
              );
            })}
            <button
              disabled={!voting || !iAmAlive || h.myVote !== undefined}
              onClick={() => h.vote(null)}
              className={`col-span-2 text-xs font-bold py-2 rounded-xl border ${h.myVote === null ? "bg-sky-600 border-sky-300 text-white" : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"} disabled:opacity-70`}
            >
              ⏭️ Atla (kimseyi atma)
            </button>
          </div>
        )}
        {!iAmAlive && <div className="text-[11px] text-slate-500 text-center">👻 Hayaletler oy veremez.</div>}
      </div>
    </div>
  );
}

/* ---------------- Rol açıklama perdesi ---------------- */
export function HainRoleOverlay({ h }: { h: Hain }) {
  const now = useNow(300);
  const m = h.mine;
  if (!m || now > h.revealUntil) return null;
  const t = m.role === "traitor";
  return (
    <div
      className="fixed inset-0 z-[80] flex flex-col items-center justify-center text-center px-6"
      style={{ background: t ? "radial-gradient(circle at center, #7f1d1d 0%, #020617 75%)" : "radial-gradient(circle at center, #0c4a6e 0%, #020617 75%)" }}
    >
      <div className="text-6xl mb-3">{t ? "🔪" : "🧑‍🚀"}</div>
      <div className={`text-3xl font-black tracking-wide ${t ? "text-rose-300" : "text-sky-300"}`}>{t ? "HAİN SENSİN" : "MÜRETTEBATSIN"}</div>
      <div className="mt-2 text-sm text-slate-300 max-w-sm">
        {t ? "Kimseye sezdirmeden herkesi ele. Yakınındaki mürettebata Ele düğmesi ile saldır." : "Görevleri tamamla, hainin kim olduğunu bul. Ceset görürsen bildir!"}
      </div>
      {t && m.mates.length > 0 && <div className="mt-2 text-xs text-rose-200">Ortağın: {m.mates.join(", ")}</div>}
    </div>
  );
}
