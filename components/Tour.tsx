"use client";
import { useState } from "react";

const KEY = "sw_tour_done";

export function tourDone(): boolean {
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

const STEPS = [
  { icon: "🚶", title: "Yürümek", text: "Yere tıkla, karakterin oraya yürür. Eşyalara tıklayarak oturabilir, kapı oklarına (portal) basarak başka mekânlara geçebilirsin." },
  { icon: "💬", title: "Sohbet", text: "Alttaki kutudan yaz, herkes görsün. /dans, /otur gibi komutlar için /yardim yaz. Birine tıklayıp kartından fısıldayabilir, arkadaş ekleyebilir veya engelleyebilirsin." },
  { icon: "🎁", title: "Günlük ödül", text: "Üst bardaki 🎁 butonundan her gün ödülünü al; art arda 7 gün girersen ödül büyür. 🎡 Çark da günde bir kez döner." },
  { icon: "🏠", title: "Evin ve eşyaların", text: "Emlak Ofisi'nden ev al, 🛠️ Düzenle ile eşya yerleştir. Çantan 🎒 ve gardırobun 👕 burada." },
  { icon: "🌍", title: "Keşfet", text: "Cadde 1'den AVM, Sahil, Kış Köyü ve daha fazlasına yürüyerek git. Balık tut, maden kaz, etkinliklere katıl. İyi eğlenceler!" },
];

export function Tour({ onClose }: { onClose: () => void }) {
  const [i, setI] = useState(0);
  const s = STEPS[i];
  const finish = () => {
    try {
      window.localStorage.setItem(KEY, "1");
    } catch {
      /* yoksay */
    }
    onClose();
  };
  return (
    <div className="fixed inset-x-0 bottom-20 z-[70] flex justify-center px-3 pointer-events-none">
      <div className="pointer-events-auto w-full max-w-md bg-slate-900/95 backdrop-blur border border-amber-400/50 rounded-2xl p-4 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.8)] space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 shrink-0 rounded-xl bg-amber-400/15 border border-amber-400/40 flex items-center justify-center text-2xl">{s.icon}</div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold tracking-widest text-amber-300">REHBER {i + 1}/{STEPS.length}</div>
            <div className="text-sm font-extrabold text-white">{s.title}</div>
            <p className="text-xs text-slate-300 leading-relaxed mt-0.5">{s.text}</p>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex gap-1" aria-hidden>
            {STEPS.map((_, k) => (
              <span key={k} className={`h-1.5 rounded-full transition-all ${k === i ? "w-5 bg-amber-400" : "w-1.5 bg-slate-600"}`} />
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={finish} className="text-[11px] text-slate-400 hover:text-white px-2">
              Atla
            </button>
            {i > 0 && (
              <button onClick={() => setI(i - 1)} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200">
                Geri
              </button>
            )}
            <button
              onClick={() => (i === STEPS.length - 1 ? finish() : setI(i + 1))}
              className="text-xs font-black px-3 py-1.5 rounded-lg bg-gradient-to-b from-amber-300 to-amber-500 text-slate-950"
            >
              {i === STEPS.length - 1 ? "Başla" : "İleri"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
