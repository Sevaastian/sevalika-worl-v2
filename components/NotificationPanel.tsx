"use client";
import { notifView, timeAgo } from "@/lib/notif";
import type { NotifItem } from "@/lib/types";

/** Bildirim merkezi: son bildirimler, okunmamışlar vurgulu. */
export function NotificationPanel(props: { items: NotifItem[]; seen: number; onReadAll: () => void; onClose: () => void }) {
  const rows = props.items.map((it) => ({ it, v: notifView(it.kind, it.payload) })).filter((r) => r.v);
  const unread = rows.filter((r) => r.it.id > props.seen).length;
  return (
    <div className="bg-slate-900/95 backdrop-blur border border-slate-700 p-3 rounded-xl w-80 space-y-2 shadow-xl">
      <div className="flex items-center justify-between">
        <div className="text-xs font-black tracking-wide text-slate-100">🔔 BİLDİRİMLER {unread > 0 && <span className="ml-1 text-[10px] bg-rose-500 text-white rounded-full px-1.5">{unread}</span>}</div>
        <button onClick={props.onClose} className="text-slate-400 hover:text-white text-xs w-6 h-6 rounded-md hover:bg-slate-800">
          ✕
        </button>
      </div>
      {unread > 0 && (
        <button onClick={props.onReadAll} className="w-full text-[11px] font-bold py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700">
          ✓ Tümünü okundu yap
        </button>
      )}
      <div className="max-h-80 overflow-y-auto space-y-1.5 pr-0.5">
        {rows.length === 0 && <div className="text-[11px] text-slate-500 py-4 text-center">Henüz bildirimin yok.</div>}
        {rows.map(({ it, v }) => (
          <div key={it.id} className={`flex gap-2 rounded-lg border px-2 py-1.5 ${it.id > props.seen ? "bg-sky-500/10 border-sky-400/40" : "bg-slate-800/60 border-slate-700"}`}>
            <span className="text-base leading-none mt-0.5">{v!.icon}</span>
            <div className="min-w-0">
              <div className="text-[12px] text-slate-100 leading-snug">{v!.text}</div>
              <div className="text-[10px] text-slate-500">{timeAgo(it.created_at)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
