"use client";

import { useState } from "react";
import { PROFESSIONS } from "@/lib/constants";
import type { Profession, ProfFxKind } from "@/lib/types";

const ART_STYLES: { key: string; label: string }[] = [
  { key: "art_landscape", label: "🏔️ Manzara" },
  { key: "art_portrait", label: "🖼️ Portre" },
  { key: "art_abstract", label: "🎨 Soyut" },
  { key: "art_sea", label: "🌊 Deniz" },
];

/** Meslek paneli: el eşyasını kuşan, mesleğe özel aktif düğmeler (Flaş patlat, Klaket vur, Müzik çal...). */
export default function ProfessionDock(props: {
  profession: Profession;
  tool: string | null;
  points: number;
  playing: boolean;
  shootCast: number;
  onToggleTool: () => void;
  onAction: (kind: ProfFxKind) => void;
  onPaint: (style: string) => void;
  onSnapshot: () => void;
  onWriteNews: () => void;
  onFinishShoot: () => void;
}) {
  const [open, setOpen] = useState(false);
  const d = PROFESSIONS[props.profession];
  const equipped = props.tool === d.tool;
  const btn = "text-[11px] font-bold py-1.5 px-2 rounded-lg border transition";
  return (
    <div className="pointer-events-auto">
      <button
        onClick={() => setOpen((o) => !o)}
        className="bg-slate-900/90 backdrop-blur border px-3 py-1.5 rounded-xl text-xs font-bold shadow-lg flex items-center gap-1.5"
        style={{ borderColor: `${d.color}88`, color: d.color }}
        aria-label="Meslek paneli"
      >
        <span>{d.icon}</span>
        <span>{d.name}</span>
        {equipped && <span className="text-[10px] text-emerald-300">● aktif</span>}
      </button>
      {open && (
        <div className="mt-1.5 bg-slate-900/95 backdrop-blur border p-3 rounded-xl w-60 space-y-2 shadow-xl" style={{ borderColor: `${d.color}66` }}>
          <div className="text-[11px] text-slate-300 leading-snug">{d.desc}</div>
          <div className="text-[10px] text-slate-400">
            Meslek puanı: <b style={{ color: d.color }}>{props.points}</b>
          </div>
          <button
            onClick={props.onToggleTool}
            className={`${btn} w-full`}
            style={{ background: equipped ? "rgba(30,41,59,1)" : `${d.color}22`, borderColor: `${d.color}66`, color: equipped ? "#cbd5e1" : d.color }}
          >
            {equipped ? `🎒 ${d.toolName} cebine koy` : `✋ ${d.toolName} kuşan`}
          </button>

          {equipped && props.profession === "suvari" && (
            <button onClick={() => props.onAction("banner")} className={`${btn} w-full bg-sky-500/20 text-sky-200 border-sky-400/50`}>
              {d.action}
            </button>
          )}
          {equipped && props.profession === "rehber" && (
            <>
              <button onClick={() => props.onAction("marker")} className={`${btn} w-full bg-yellow-400/20 text-yellow-200 border-yellow-400/50`}>
                {d.action}
              </button>
              <div className="text-[10px] text-slate-500 leading-snug">Yanındaki yeni oyuncuya (Seviye 1-3) tıkla ve “Rehber turunu tamamla”: ikiniz de Sanil + XP kazanırsınız.</div>
            </>
          )}
          {equipped && props.profession === "sanatci" && (
            <>
              <div className="text-[10px] text-slate-400">Tablo çiz (4 dk&apos;da bir). Çantana girer; eve asabilir, Pazarda satabilirsin.</div>
              <div className="grid grid-cols-2 gap-1.5">
                {ART_STYLES.map((a) => (
                  <button key={a.key} onClick={() => props.onPaint(a.key)} className={`${btn} bg-pink-500/15 text-pink-200 border-pink-400/40`}>
                    {a.label}
                  </button>
                ))}
              </div>
            </>
          )}
          {equipped && props.profession === "muzisyen" && (
            <>
              <button onClick={() => props.onAction("music")} className={`${btn} w-full ${props.playing ? "bg-violet-500 text-white border-violet-300" : "bg-violet-500/20 text-violet-200 border-violet-400/50"}`}>
                {props.playing ? "⏹ Müziği Bitir" : d.action}
              </button>
              <div className="text-[10px] text-slate-500 leading-snug">Çalarken yakınındaki oyuncular dans eder; bahşiş ve alkış alırsın.</div>
            </>
          )}
          {equipped && props.profession === "gazeteci" && (
            <div className="grid grid-cols-1 gap-1.5">
              <button onClick={() => props.onAction("flash")} className={`${btn} bg-slate-200/15 text-slate-100 border-slate-300/40`}>
                {d.action}
              </button>
              <button onClick={props.onSnapshot} className={`${btn} bg-slate-200/10 text-slate-200 border-slate-300/30`}>
                🖼️ Kare Yakala (PNG kaydet)
              </button>
              <button onClick={props.onWriteNews} className={`${btn} bg-sky-500/20 text-sky-200 border-sky-400/50`}>
                ✍️ Haber Yaz
              </button>
            </div>
          )}
          {equipped && props.profession === "yonetmen" && (
            <>
              <button onClick={() => props.onAction("clap")} className={`${btn} w-full bg-rose-500/20 text-rose-200 border-rose-400/50`}>
                {d.action}
              </button>
              <div className="text-[10px] text-slate-400">Oyunculara tıkla → “Figüran davet et”. Kabul eden: <b className="text-rose-200">{props.shootCast}</b></div>
              <button onClick={props.onFinishShoot} className={`${btn} w-full bg-emerald-500/20 text-emerald-200 border-emerald-400/50`}>
                ✅ Çekimi Bitir (toplu ödül)
              </button>
            </>
          )}
          {!equipped && <div className="text-[10px] text-slate-500">Önce {d.toolName.toLowerCase()} kuşan; aktif düğmeler açılır.</div>}
        </div>
      )}
    </div>
  );
}
