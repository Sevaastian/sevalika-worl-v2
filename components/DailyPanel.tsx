"use client";
import { DAILY_REWARDS } from "@/lib/constants";

/** 7 günlük giriş serisi takvimi. */
export function DailyPanel(props: {
  streak: number; // tamamlanan gün (0-7)
  next: number; // bugün alınacak gün (1-7)
  canClaim: boolean;
  onClaim: () => void;
  onClose: () => void;
}) {
  return (
    <div className="bg-slate-900/95 backdrop-blur border border-slate-700 p-3 rounded-xl w-72 space-y-3 shadow-xl">
      <div className="flex items-center justify-between">
        <div className="text-xs font-black tracking-wide text-slate-100">🎁 GÜNLÜK ÖDÜL</div>
        <button onClick={props.onClose} className="text-slate-400 hover:text-white text-xs w-6 h-6 rounded-md hover:bg-slate-800">
          ✕
        </button>
      </div>
      <div className="text-[11px] text-slate-400 leading-snug">
        Her gün girdikçe ödül büyür. Bir günü kaçırırsan seri başa döner. 7. gün büyük ödül!
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {DAILY_REWARDS.map((r, i) => {
          const day = i + 1;
          const done = props.canClaim ? day < props.next : day <= props.streak;
          const today = props.canClaim && day === props.next;
          return (
            <div
              key={day}
              className={`rounded-lg border px-1 py-1.5 text-center ${day === 7 ? "col-span-1" : ""} ${
                today
                  ? "bg-emerald-500/20 border-emerald-400 animate-pulse"
                  : done
                    ? "bg-slate-800/50 border-slate-700 opacity-60"
                    : "bg-slate-800 border-slate-700"
              }`}
            >
              <div className="text-[9px] text-slate-400">Gün {day}</div>
              <div className="text-base leading-none my-0.5">{done ? "✅" : day === 7 ? "🏆" : "🪙"}</div>
              <div className="text-[10px] font-bold text-yellow-300">{r}</div>
            </div>
          );
        })}
      </div>
      {props.canClaim ? (
        <button onClick={props.onClaim} className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black py-2 rounded-lg shadow">
          Gün {props.next} ödülünü al (+{DAILY_REWARDS[props.next - 1]})
        </button>
      ) : (
        <div className="text-[11px] text-center text-slate-400 bg-slate-800/60 border border-slate-700 rounded-lg py-2">
          Bugünün ödülünü aldın. 🔥 Seri: {props.streak} gün. Yarın tekrar gel!
        </div>
      )}
    </div>
  );
}
