"use client";
import { useEffect, useState } from "react";

const TIPS = [
  "İpucu: Düzenle modunda ✋ Hizala ile eşyaları piksel piksel yerleştirebilirsin.",
  "İpucu: Her gün 🎡 Şans Çarkı'nı çevirmeyi unutma.",
  "İpucu: Paneller başlık şeridinden sürüklenebilir.",
  "İpucu: /yardim yazarak tüm komutları görebilirsin.",
  "İpucu: Etkinliklerde Sanil kazancı katlanır!",
  "İpucu: Rehber Yağmur sana oyunu anlatır.",
];

/** Oda/giriş yükleme perdesi. `key={roomSlug}` ile oda değişince yeniden başlar. */
let seen = false; // ilk giriş mi? (oturum boyunca)

export default function RoomLoader({ name }: { name: string }) {
  const [first] = useState(() => !seen);
  useEffect(() => {
    seen = true;
  }, []);
  const total = first ? 3400 : 2200;
  const [pct, setPct] = useState(0);
  const [phase, setPhase] = useState<"in" | "out" | "gone">("in");
  const [tip] = useState(() => TIPS[Math.floor(Math.random() * TIPS.length)]);

  useEffect(() => {
    const t0 = performance.now();
    const iv = setInterval(() => {
      const f = Math.min(1, (performance.now() - t0) / total);
      setPct(Math.round((1 - Math.pow(1 - f, 1.3)) * 100));
      if (f >= 1) {
        clearInterval(iv);
        setPhase("out");
      }
    }, 50);
    return () => clearInterval(iv);
  }, [total]);

  useEffect(() => {
    if (phase !== "out") return;
    const t = setTimeout(() => setPhase("gone"), 450);
    return () => clearTimeout(t);
  }, [phase]);

  if (phase === "gone") return null;
  return (
    <div
      className="fixed inset-0 z-[90] flex flex-col items-center justify-center bg-slate-950 text-white px-6 transition-opacity duration-500"
      style={{ opacity: phase === "out" ? 0 : 1, pointerEvents: phase === "out" ? "none" : "auto" }}
    >
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage:
            "linear-gradient(30deg, rgba(148,163,184,.5) 1px, transparent 1px), linear-gradient(150deg, rgba(148,163,184,.5) 1px, transparent 1px)",
          backgroundSize: "64px 37px",
          maskImage: "radial-gradient(ellipse at center, black 20%, transparent 70%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 20%, transparent 70%)",
        }}
      />
      <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-300 to-amber-500 text-slate-950 font-black text-4xl flex items-center justify-center shadow-[0_10px_40px_-8px_rgba(251,191,36,0.7)] animate-bounce">
        S
      </div>
      <div className="relative mt-6 text-xs tracking-[0.3em] text-amber-300 font-bold">{first ? "SEVALIKA WORLD" : "YÜKLENİYOR"}</div>
      <div className="relative mt-1 text-xl font-extrabold text-center">{name}</div>
      <div className="relative mt-5 w-64 max-w-full h-2 rounded-full bg-slate-800 overflow-hidden">
        <div className="h-full rounded-full bg-gradient-to-r from-amber-300 to-amber-500 transition-[width] duration-100" style={{ width: `${pct}%` }} />
      </div>
      <div className="relative mt-2 text-[11px] text-slate-500 tabular-nums">%{pct}</div>
      <div className="relative mt-8 max-w-sm text-center text-xs text-slate-400">{tip}</div>
    </div>
  );
}
