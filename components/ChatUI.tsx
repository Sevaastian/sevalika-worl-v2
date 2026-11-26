"use client";

import { useEffect, useRef } from "react";
import { MAX_CHAT_LENGTH } from "@/lib/constants";
import type { ChatLine } from "@/lib/types";
import RoleBadge from "./RoleBadge";

export function ChatLog({ lines, open, onToggle }: { lines: ChatLine[]; open: boolean; onToggle: () => void }) {
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines, open]);

  return (
    <div className="flex flex-col items-end w-full">
      <button
        onClick={onToggle}
        className="mb-1.5 bg-slate-900/95 border border-slate-700 hover:border-slate-500 px-3 py-1 rounded-full text-[11px] font-medium text-slate-200 shadow"
      >
        {open ? "▾ Sohbeti Gizle" : `▴ Sohbet Geçmişi (${lines.length})`}
      </button>
      {open && (
        <div className="w-full h-24 md:h-44 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl p-2.5 overflow-y-auto shadow-2xl space-y-1.5 select-text">
          {lines.map((m, i) => (
            <div key={i} className={`text-xs leading-relaxed break-words ${m.isWhisper ? "bg-purple-500/15 border border-purple-400/30 rounded-lg px-2 py-1" : ""}`}>
              <span className="text-slate-500 text-[10px] mr-1.5">[{m.time}]</span>
              {m.isWhisper && (
                <span className="text-[9px] bg-purple-500/30 text-purple-200 px-1.5 rounded mr-1 font-bold">
                  🔒 FISILTI ({m.sender} → {m.whisperTarget})
                </span>
              )}
              {!m.isWhisper && !m.isSystem && <RoleBadge role={m.role} />}
              {!m.isWhisper && (
                <span className={`font-bold ${m.isSystem ? "text-sky-300" : m.role === "admin" || m.role === "suvari" ? "text-amber-300" : m.role === "vip" ? "text-purple-300" : "text-yellow-400"}`}>
                  {m.sender}:{" "}
                </span>
              )}
              <span className={m.isWhisper ? "text-purple-100" : "text-slate-100"}>{m.text}</span>
            </div>
          ))}
          <div ref={endRef} />
        </div>
      )}
    </div>
  );
}

export function ChatBar(props: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  warning: string;
  canWhisper: boolean;
}) {
  const remaining = MAX_CHAT_LENGTH - props.value.length;
  return (
    <div className="bg-slate-900 border-t border-slate-800 z-20 pb-[env(safe-area-inset-bottom)]">
      {props.warning && (
        <div className="bg-rose-500/20 border-b border-rose-500/40 text-rose-300 text-[11px] font-semibold px-4 py-1 text-center">⚠️ {props.warning}</div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          props.onSubmit();
        }}
        className="flex items-center gap-2 px-3 md:px-4 py-2"
      >
        <div className="relative flex-1 min-w-0 flex items-center">
          <input
            type="text"
            maxLength={MAX_CHAT_LENGTH}
            value={props.value}
            onChange={(e) => props.onChange(e.target.value)}
            placeholder={props.canWhisper ? "Mesaj yaz... (/pm nick mesaj, /dans, /otur, /yardim)" : "Sohbete yaz... (/dans, /otur, /yardim)"}
            className="w-full bg-slate-800 border border-slate-700 rounded-full pl-3.5 pr-12 py-1.5 text-xs md:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-yellow-400"
          />
          <span className={`absolute right-3 text-[10px] font-bold pointer-events-none ${remaining <= 20 ? "text-rose-400" : "text-slate-500"}`}>{remaining}</span>
        </div>
        <button type="submit" className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold text-xs px-4 md:px-5 py-2 rounded-full transition shrink-0">
          Gönder
        </button>
      </form>
    </div>
  );
}
