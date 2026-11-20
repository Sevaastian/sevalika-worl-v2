"use client";

import { useEffect, useState } from "react";
import { COSMETICS, ROOM_BY_SLUG, type CosmeticSlot } from "@/lib/constants";
import type { ActiveQuiz, Friend, HomeAccess, Profile } from "@/lib/types";
import RoleBadge from "./RoleBadge";

const closeBtn = "text-slate-400 hover:text-white text-xs px-1.5 py-0.5 rounded bg-slate-800";

/* ------------------------------------------------------------------ */
/* Arkadaşlar + Odam                                                   */
/* ------------------------------------------------------------------ */

const roomLabel = (slug: string | null) => {
  if (!slug) return "";
  if (slug.startsWith("home-")) return `🏠 ${slug.slice(5)}`;
  return ROOM_BY_SLUG[slug]?.name ?? slug;
};

export function FriendsPanel(props: {
  friends: Friend[];
  onClose: () => void;
  onAdd: (name: string) => void;
  onRespond: (name: string, accept: boolean) => void;
  onRemove: (name: string) => void;
  onGoto: (slug: string) => void;
  onWhisper: (name: string) => void;
  canWhisper: boolean;
  onMyHome: () => void;
  onHomeAccess: (a: HomeAccess) => void;
}) {
  const [name, setName] = useState("");
  const friends = props.friends.filter((f) => f.relation === "friend").sort((a, b) => Number(b.online) - Number(a.online));
  const incoming = props.friends.filter((f) => f.relation === "incoming");
  const outgoing = props.friends.filter((f) => f.relation === "outgoing");

  return (
    <div className="bg-slate-900/95 backdrop-blur border border-sky-400/50 p-3.5 rounded-2xl w-64 md:w-72 space-y-2.5 shadow-2xl max-h-[75vh] overflow-y-auto">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <span className="text-xs font-black text-sky-400 tracking-wide">👥 ARKADAŞLAR</span>
        <button onClick={props.onClose} className={closeBtn}>
          ✕
        </button>
      </div>

      <div className="space-y-1.5 rounded-xl bg-slate-800/60 border border-slate-700 p-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-amber-300">🏠 Odam</span>
          <button onClick={props.onMyHome} className="text-[11px] bg-amber-400 text-slate-950 font-bold rounded-lg px-2.5 py-1">
            Git
          </button>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-slate-400">
          <span>Kimler girebilir:</span>
          {(
            [
              ["open", "Herkes"],
              ["friends", "Arkadaşlar"],
              ["closed", "Sadece ben"],
            ] as [HomeAccess, string][]
          ).map(([a, label]) => (
            <button key={a} onClick={() => props.onHomeAccess(a)} className="bg-slate-700 hover:bg-slate-600 rounded px-1.5 py-0.5 text-slate-200">
              {label}
            </button>
          ))}
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) props.onAdd(name.trim());
          setName("");
        }}
        className="flex gap-1.5"
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Kullanıcı adı ekle..."
          maxLength={15}
          className="flex-1 min-w-0 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-sky-400"
        />
        <button type="submit" className="bg-sky-400 text-slate-950 font-bold text-xs px-2.5 rounded-lg">
          Ekle
        </button>
      </form>

      {incoming.length > 0 && (
        <div className="space-y-1">
          <div className="text-[10px] font-bold text-emerald-300">GELEN İSTEKLER</div>
          {incoming.map((f) => (
            <div key={f.username} className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-2 py-1">
              <span className="text-xs font-bold truncate">{f.username}</span>
              <div className="flex gap-1">
                <button onClick={() => props.onRespond(f.username, true)} className="text-[11px] bg-emerald-400 text-slate-950 font-bold rounded px-2">
                  ✓
                </button>
                <button onClick={() => props.onRespond(f.username, false)} className="text-[11px] bg-slate-700 rounded px-2">
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-1">
        <div className="text-[10px] font-bold text-slate-400">ARKADAŞLAR ({friends.length})</div>
        {friends.length === 0 && <div className="text-[11px] text-slate-500">Henüz arkadaşın yok. Bir oyuncuya dokunup ➕ Arkadaş&apos;a bas veya yukarıdan adını yaz.</div>}
        {friends.map((f) => (
          <div key={f.username} className="bg-slate-800/80 border border-slate-700 rounded-xl p-2 space-y-1">
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1 min-w-0">
                <span className={`w-2 h-2 rounded-full shrink-0 ${f.online ? "bg-emerald-400" : "bg-slate-600"}`} />
                <RoleBadge role={f.role} />
                <span className="text-xs font-bold truncate">{f.username}</span>
              </div>
              <button onClick={() => props.onRemove(f.username)} className="text-[10px] text-slate-500 hover:text-rose-300">
                kaldır
              </button>
            </div>
            <div className="text-[10px] text-slate-400 truncate">{f.online ? `📍 ${roomLabel(f.room)}` : "Çevrimdışı"}</div>
            <div className="flex gap-1">
              {f.online && f.room && (
                <button onClick={() => props.onGoto(f.room!)} className="flex-1 text-[10px] bg-sky-500/20 text-sky-200 border border-sky-400/30 rounded py-1">
                  Yanına git
                </button>
              )}
              {f.home && (
                <button onClick={() => props.onGoto(f.home!)} className="flex-1 text-[10px] bg-amber-500/15 text-amber-200 border border-amber-400/30 rounded py-1">
                  🏠 Odası
                </button>
              )}
              {props.canWhisper && (
                <button onClick={() => props.onWhisper(f.username)} className="text-[10px] bg-purple-500/15 text-purple-200 border border-purple-400/30 rounded px-2">
                  🔒
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {outgoing.length > 0 && (
        <div className="space-y-1">
          <div className="text-[10px] font-bold text-slate-500">BEKLEYEN İSTEKLERİN</div>
          {outgoing.map((f) => (
            <div key={f.username} className="flex items-center justify-between text-xs text-slate-400 px-1">
              <span>{f.username}</span>
              <button onClick={() => props.onRemove(f.username)} className="text-[10px] text-slate-500 hover:text-rose-300">
                iptal
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Kozmetik mağazası                                                   */
/* ------------------------------------------------------------------ */

const SLOT_LABEL: Record<CosmeticSlot, string> = { hat: "Şapka", glasses: "Gözlük", top: "Üst", hair: "Saç", pet: "Evcil" };

export function ShopPanel(props: {
  profile: Profile;
  onClose: () => void;
  onBuy: (id: string) => void;
  onEquip: (slot: CosmeticSlot, id: string | null) => void;
  /** shop: AVM'deki Stilist'te satın al • wardrobe: sadece sahip olduklarını tak */
  mode?: "shop" | "wardrobe";
}) {
  const wardrobeMode = props.mode === "wardrobe";
  const [slot, setSlot] = useState<CosmeticSlot>("hat");
  const p = props.profile;
  const equipped: Record<CosmeticSlot, string | null> = { hat: p.hat, glasses: p.glasses, top: p.top, hair: p.hairStyle, pet: p.pet };
  const isAdmin = p.role === "admin";

  return (
    <div className="bg-slate-900/95 backdrop-blur border border-fuchsia-400/50 p-3.5 rounded-2xl w-64 md:w-72 space-y-2.5 shadow-2xl max-h-[75vh] overflow-y-auto">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <span className="text-xs font-black text-fuchsia-300 tracking-wide">{wardrobeMode ? "👕 GARDIROBUM" : "👗 STİLİST DEFNE · KIYAFETLER"}</span>
        <button onClick={props.onClose} className={closeBtn}>
          ✕
        </button>
      </div>

      <div className="flex gap-1 bg-slate-800 p-1 rounded-lg">
        {(Object.keys(SLOT_LABEL) as CosmeticSlot[]).map((s) => (
          <button key={s} onClick={() => setSlot(s)} className={`flex-1 py-1 rounded text-[11px] font-bold ${slot === s ? "bg-fuchsia-400 text-slate-950" : "text-slate-300"}`}>
            {SLOT_LABEL[s]}
          </button>
        ))}
      </div>

      <div className="space-y-1.5">
        {slot !== "hair" && (
          <button
            onClick={() => props.onEquip(slot, null)}
            className={`w-full text-left text-[11px] rounded-lg px-2 py-1.5 border ${equipped[slot] === null ? "bg-fuchsia-500/15 border-fuchsia-400/50 text-white" : "bg-slate-800/80 border-slate-700 text-slate-300"}`}
          >
            ✖ Çıkar (hiçbiri)
          </button>
        )}
        {wardrobeMode && (
          <p className="text-[10px] text-slate-400 leading-snug">Yeni kıyafetler için 🛍️ Sevalika AVM&apos;deki Stilist Defne&apos;ye uğra (Cadde 1 → AVM kapısı).</p>
        )}
        {COSMETICS.filter((c) => c.slot === slot && (!wardrobeMode || c.price === 0 || p.wardrobe.includes(c.id))).map((c) => {
          const owned = c.price === 0 || p.wardrobe.includes(c.id);
          const on = equipped[slot] === c.id;
          return (
            <div key={c.id} className={`flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 border ${on ? "bg-fuchsia-500/15 border-fuchsia-400/50" : "bg-slate-800/80 border-slate-700"}`}>
              <span className="text-xs font-medium truncate">
                {c.icon} {c.name}
              </span>
              {owned || wardrobeMode ? (
                <button
                  onClick={() => props.onEquip(slot, c.id)}
                  disabled={on}
                  className={`shrink-0 text-[11px] font-bold rounded-lg px-2.5 py-1 ${on ? "bg-slate-700 text-slate-400" : "bg-fuchsia-400 text-slate-950"}`}
                >
                  {on ? "Takılı" : "Tak"}
                </button>
              ) : (
                <button onClick={() => props.onBuy(c.id)} className="shrink-0 text-[11px] font-bold rounded-lg px-2.5 py-1 bg-yellow-400 text-slate-950">
                  {isAdmin ? "Ücretsiz" : `${c.price} S`}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Bilgi yarışması                                                     */
/* ------------------------------------------------------------------ */

export function QuizBanner(props: { quiz: ActiveQuiz; onAnswer: (text: string) => Promise<boolean>; onExpire: () => void }) {
  const [answer, setAnswer] = useState("");
  const [left, setLeft] = useState(() => Math.max(0, Math.ceil((props.quiz.endsAt - Date.now()) / 1000)));
  const [wrong, setWrong] = useState(false);
  const { onExpire, quiz } = props;

  useEffect(() => {
    const id = setInterval(() => {
      const s = Math.ceil((quiz.endsAt - Date.now()) / 1000);
      if (s <= 0) {
        clearInterval(id);
        onExpire();
      } else setLeft(s);
    }, 500);
    return () => clearInterval(id);
  }, [quiz.endsAt, onExpire]);

  return (
    <div className="absolute top-24 left-1/2 -translate-x-1/2 z-20 w-[92%] max-w-md bg-slate-900/95 border-2 border-fuchsia-400 rounded-2xl p-3 shadow-2xl space-y-2">
      <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-fuchsia-300">
        <span>🎯 Bilgi Yarışması · {quiz.reward} Sanil</span>
        <span>{left} sn</span>
      </div>
      <div className="text-xs md:text-sm font-bold text-white">{quiz.question}</div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!answer.trim()) return;
          const ok = await props.onAnswer(answer);
          if (!ok) {
            setWrong(true);
            setTimeout(() => setWrong(false), 1200);
          }
          setAnswer("");
        }}
        className="flex gap-1.5"
      >
        <input
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Cevabını yaz (herkes görmez)..."
          className={`flex-1 min-w-0 bg-slate-800 border rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none ${wrong ? "border-rose-400" : "border-slate-700 focus:border-fuchsia-400"}`}
        />
        <button type="submit" className="bg-fuchsia-400 text-slate-950 font-bold text-xs px-3 rounded-lg">
          Gönder
        </button>
      </form>
      {wrong && <div className="text-[11px] text-rose-300">Yanlış cevap, tekrar dene!</div>}
    </div>
  );
}
