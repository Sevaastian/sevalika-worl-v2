"use client";
import type { Settings } from "@/lib/settings";

const closeBtn = "text-slate-400 hover:text-white text-xs w-6 h-6 rounded-md hover:bg-slate-800";

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs font-bold text-slate-100">{label}</div>
          {hint && <div className="text-[10px] text-slate-500 leading-snug">{hint}</div>}
        </div>
        {children}
      </div>
    </div>
  );
}

function Toggle({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onClick}
      className={`relative w-10 h-5 rounded-full border transition shrink-0 ${on ? "bg-emerald-500 border-emerald-300" : "bg-slate-700 border-slate-600"}`}
    >
      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${on ? "left-5" : "left-0.5"}`} />
    </button>
  );
}

function Slider({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <input
      type="range"
      min={0}
      max={100}
      value={Math.round(value * 100)}
      aria-label={label}
      onChange={(e) => onChange(Number(e.target.value) / 100)}
      className="w-full accent-amber-400"
    />
  );
}

export function SettingsPanel(props: {
  settings: Settings;
  sfxOn: boolean;
  musicOn: boolean;
  layered: boolean;
  blocks: string[];
  onChange: (s: Settings) => void;
  onToggleSfx: () => void;
  onToggleMusic: () => void;
  onToggleLayered: () => void;
  onUnblock: (name: string) => void;
  onLogout: () => void;
  onTour: () => void;
  onClose: () => void;
}) {
  const s = props.settings;
  return (
    <div className="bg-slate-900/95 backdrop-blur border border-slate-700 p-3 rounded-xl w-72 space-y-3 shadow-xl">
      <div className="flex items-center justify-between">
        <div className="text-xs font-black tracking-wide text-slate-100">⚙️ AYARLAR</div>
        <button onClick={props.onClose} className={closeBtn}>
          ✕
        </button>
      </div>

      <section className="space-y-2.5">
        <div className="text-[10px] font-bold uppercase tracking-wider text-amber-300">Ses</div>
        <Row label="Ses efektleri">
          <Toggle on={props.sfxOn} onClick={props.onToggleSfx} label="Ses efektleri" />
        </Row>
        <Slider value={s.sfxVol} onChange={(v) => props.onChange({ ...s, sfxVol: v })} label="Efekt ses seviyesi" />
        <Row label="Müzik" hint="Mekâna göre değişir; tarayıcı için bir kez açman gerekir.">
          <Toggle on={props.musicOn} onClick={props.onToggleMusic} label="Müzik" />
        </Row>
        <Slider value={s.musicVol} onChange={(v) => props.onChange({ ...s, musicVol: v })} label="Müzik ses seviyesi" />
      </section>

      <section className="space-y-2.5 border-t border-slate-800 pt-2.5">
        <div className="text-[10px] font-bold uppercase tracking-wider text-amber-300">Görüntü</div>
        <Row label="Düşük kalite modu" hint="Parçacık, kuş ve yönlü gölgeleri kapatır. Telefonda pil ve akıcılık için.">
          <Toggle on={s.low} onClick={() => props.onChange({ ...s, low: !s.low })} label="Düşük kalite" />
        </Row>
        <Row label="Katmanlı karakter" hint="Yeni PNG karakter çizimi (deneysel).">
          <Toggle on={props.layered} onClick={props.onToggleLayered} label="Katmanlı karakter" />
        </Row>
      </section>

      <section className="space-y-1.5 border-t border-slate-800 pt-2.5">
        <div className="text-[10px] font-bold uppercase tracking-wider text-amber-300">Engellenenler ({props.blocks.length})</div>
        {props.blocks.length === 0 && <div className="text-[11px] text-slate-500">Kimseyi engellemedin.</div>}
        <div className="space-y-1 max-h-28 overflow-y-auto">
          {props.blocks.map((n) => (
            <div key={n} className="flex items-center justify-between bg-slate-800/70 border border-slate-700 rounded-lg px-2 py-1">
              <span className="text-[11px] text-slate-200 truncate">{n}</span>
              <button onClick={() => props.onUnblock(n)} className="text-[10px] font-bold text-sky-300 hover:text-sky-200">
                Kaldır
              </button>
            </div>
          ))}
        </div>
      </section>

      <button onClick={props.onTour} className="w-full text-xs font-bold py-2 rounded-lg bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 transition">
        📖 Rehberi tekrar göster
      </button>
      <button
        onClick={props.onLogout}
        className="w-full text-xs font-bold py-2 rounded-lg bg-rose-500/15 text-rose-200 border border-rose-500/40 hover:bg-rose-500/25 transition"
      >
        Çıkış Yap
      </button>
    </div>
  );
}
