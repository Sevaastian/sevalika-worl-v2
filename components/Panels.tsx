"use client";

import { useState } from "react";
import { BAG_ITEM_LABELS, EMOTES, FISH_PRICES, FURNI_CATALOG, GOODS_PRICES, HAIR_COLORS, RECIPES, ROD_PRICE, SHIRT_COLORS, SKIN_COLORS, isFishItem, isFurniType } from "@/lib/constants";
import type { ColorLook, FurniType, Profile, UserRole, WeatherMode } from "@/lib/types";
import RoleBadge from "./RoleBadge";
import { GoodsSeller } from "./WorldPanels";

const closeBtn = "text-slate-400 hover:text-white text-xs px-1.5 py-0.5 rounded bg-slate-800";

/* ------------------------------------------------------------------ */

function ColorRow({ label, colors, value, onPick }: { label: string; colors: string[]; value: string; onPick: (c: string) => void }) {
  return (
    <div className="flex items-center justify-between text-xs text-slate-400 gap-2">
      <span className="shrink-0">{label}</span>
      <div className="flex flex-wrap justify-end gap-1.5">
        {colors.map((c) => (
          <button
            key={c}
            aria-label={`${label} ${c}`}
            onClick={() => onPick(c)}
            style={{ backgroundColor: c }}
            className={`w-4 h-4 rounded-full border ${value === c ? "border-white scale-110" : "border-slate-600"}`}
          />
        ))}
      </div>
    </div>
  );
}

export function AvatarPanel(props: {
  profile: Profile;
  canRide: boolean;
  riding: boolean;
  onClose: () => void;
  onLook: (l: ColorLook) => void;
  onToggleHorse: () => void;
  onEmote: (emoji: string) => void;
  onShop: () => void;
  onStatus: (text: string) => void;
  onPhoto: () => void;
  layered: boolean;
  onToggleLayered: () => void;
  music: boolean;
  onToggleMusic: () => void;
  weather: WeatherMode;
  onWeather: () => void;
  sfxOn: boolean;
  onToggleSfx: () => void;
  onDance: () => void;
  onSit: () => void;
  onLogout: () => void;
}) {
  const { profile: p } = props;
  const look: ColorLook = { shirtColor: p.shirtColor, hairColor: p.hairColor, skinColor: p.skinColor };
  const [status, setStatus] = useState(p.status ?? "");
  return (
    <div className="bg-slate-900/95 backdrop-blur border border-slate-800 p-3 rounded-xl w-56 md:w-60 space-y-2.5 shadow-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 min-w-0">
          <span className="text-xs font-bold text-yellow-400 truncate">{p.username}</span>
          <RoleBadge role={p.role} />
        </div>
        <button onClick={props.onClose} className={closeBtn}>
          ✕
        </button>
      </div>
      <ColorRow label="Tişört" colors={SHIRT_COLORS} value={p.shirtColor} onPick={(c) => props.onLook({ ...look, shirtColor: c })} />
      <ColorRow label="Saç" colors={HAIR_COLORS} value={p.hairColor} onPick={(c) => props.onLook({ ...look, hairColor: c })} />
      <ColorRow label="Ten" colors={SKIN_COLORS} value={p.skinColor} onPick={(c) => props.onLook({ ...look, skinColor: c })} />

      <form
        className="flex gap-1"
        onSubmit={(e) => {
          e.preventDefault();
          props.onStatus(status);
        }}
      >
        <input
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          maxLength={40}
          placeholder="💬 Durum mesajın..."
          className="flex-1 min-w-0 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-white focus:outline-none focus:border-yellow-400"
        />
        <button type="submit" className="text-[11px] font-bold bg-yellow-400 text-slate-950 rounded-lg px-2">
          Kaydet
        </button>
      </form>

      {props.canRide && (
        <button
          onClick={props.onToggleHorse}
          className={`w-full py-1.5 rounded-lg text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
            props.riding ? "bg-amber-400 text-slate-950 border-amber-300" : "bg-slate-800 text-amber-300 border-amber-500/40 hover:bg-slate-700"
          }`}
        >
          <span>🐎</span>
          <span>{props.riding ? "Süvari Atından İn" : "Süvari Atına Bin"}</span>
        </button>
      )}

      <div className="flex items-center justify-between gap-1 pt-0.5">
        {EMOTES.map((e) => (
          <button key={e} onClick={() => props.onEmote(e)} className="text-base leading-none bg-slate-800 hover:bg-slate-700 rounded-lg w-8 h-8 flex items-center justify-center">
            {e}
          </button>
        ))}
      </div>

      <div className="flex gap-1.5">
        <button onClick={props.onShop} className="flex-1 bg-fuchsia-500/15 hover:bg-fuchsia-500/25 text-fuchsia-200 border border-fuchsia-400/40 text-xs py-1.5 rounded font-medium">
          👕 Gardırop
        </button>
        <button
          onClick={props.onToggleMusic}
          className={`flex-1 text-xs py-1.5 rounded font-medium border ${props.music ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/40" : "bg-slate-800 text-slate-300 border-slate-700"}`}
        >
          {props.music ? "🔊 Müzik" : "🔇 Müzik"}
        </button>
      </div>
      <button onClick={props.onToggleLayered} className={`w-full text-xs py-1.5 rounded font-medium border ${props.layered ? "bg-violet-500/20 text-violet-200 border-violet-400/40" : "bg-slate-800 text-slate-300 border-slate-700"}`}>
        🎨 Karakter: {props.layered ? "Katmanlı (PNG)" : "Klasik"}
      </button>
      <button onClick={props.onPhoto} className="w-full bg-sky-500/15 hover:bg-sky-500/25 text-sky-200 border border-sky-400/40 text-xs py-1.5 rounded font-medium">
        📸 Fotoğraf Çek
      </button>

      <div className="flex gap-1.5">
        <button onClick={props.onWeather} className="flex-1 bg-slate-800 hover:bg-slate-700 text-xs py-1.5 rounded font-medium border border-slate-700">
          {{ auto: "🌤️ Hava: Oto", none: "☀️ Hava: Açık", rain: "🌧️ Hava: Yağmur", snow: "❄️ Hava: Kar" }[props.weather]}
        </button>
        <button
          onClick={props.onToggleSfx}
          className={`flex-1 text-xs py-1.5 rounded font-medium border ${props.sfxOn ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/40" : "bg-slate-800 text-slate-300 border-slate-700"}`}
        >
          {props.sfxOn ? "🔔 Efekt" : "🔕 Efekt"}
        </button>
      </div>

      <div className="flex gap-1.5">
        <button onClick={props.onDance} className="flex-1 bg-slate-800 hover:bg-slate-700 text-xs py-1.5 rounded font-medium">
          🕺 Dans
        </button>
        <button onClick={props.onSit} className="flex-1 bg-slate-800 hover:bg-slate-700 text-xs py-1.5 rounded font-medium">
          🪑 Otur
        </button>
      </div>
      <button
        onClick={props.onLogout}
        className="w-full bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-[11px] py-1 rounded-lg font-medium transition"
      >
        Çıkış Yap
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function BagPanel(props: { inventory: string[]; riding: boolean; tool: string | null; onClose: () => void; onUse: (key: string) => void }) {
  return (
    <div className="bg-slate-900/95 backdrop-blur border border-sky-400/50 p-3.5 rounded-2xl w-64 md:w-72 space-y-2.5 shadow-2xl">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <span className="text-xs font-black text-sky-400 tracking-wide">🎒 EŞYA ÇANTAM</span>
        <button onClick={props.onClose} className={closeBtn}>
          ✕
        </button>
      </div>

      {props.inventory.length === 0 ? (
        <div className="text-center py-5 space-y-1">
          <div className="text-xs text-slate-400">Çantan şu an boş.</div>
          <div className="text-[11px] text-slate-500">Düzenle modunda &quot;Kaldır&quot; aracıyla kendi eşyalarını çantana alabilirsin.</div>
        </div>
      ) : (
        <div className="space-y-1.5 max-h-60 overflow-y-auto">
          {props.inventory.map((key, idx) => {
            const meta = BAG_ITEM_LABELS[key] ?? { name: key, icon: "📦", desc: "Özel eşya" };
            const isHorse = key === "suvari_ati";
            const isRod = key === "fishing_rod";
            const rodOn = isRod && props.tool === "fishing_rod";
            const isFish = isFishItem(key);
            const canUse = isHorse || isRod || isFurniType(key);
            return (
              <div
                key={`${key}-${idx}`}
                className={`p-2 rounded-xl border flex items-center justify-between gap-2 ${
                  isHorse ? "bg-amber-500/10 border-amber-400/40" : "bg-slate-800/80 border-slate-700"
                }`}
              >
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white flex items-center gap-1 truncate">
                    <span>{meta.icon}</span>
                    <span className="truncate">{meta.name}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 line-clamp-1">{meta.desc}</div>
                </div>
                {canUse ? (
                  <button
                    onClick={() => props.onUse(key)}
                    className={`shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                      (isHorse && props.riding) || rodOn
                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                        : isHorse || isRod
                          ? "bg-amber-400 text-slate-950"
                          : "bg-sky-400 text-slate-950"
                    }`}
                  >
                    {isHorse ? (props.riding ? "İn" : "Bin") : isRod ? (rodOn ? "Çıkar" : "Kuşan") : "Koy"}
                  </button>
                ) : isFish ? (
                  <span className="text-[10px] font-bold text-orange-300 shrink-0">+{FISH_PRICES[key]} S</span>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function BuildPanel(props: {
  isAdmin: boolean;
  tool: "place" | "remove" | "nudge";
  selected: FurniType;
  onTool: (t: "place" | "remove" | "nudge") => void;
  onSelect: (t: FurniType) => void;
  onRotate: () => void;
}) {
  return (
    <div className="bg-slate-900/95 backdrop-blur border border-yellow-500/40 p-2.5 md:p-3 rounded-xl w-60 md:w-64 space-y-2 shadow-2xl">
      <div className="grid grid-cols-3 gap-1 bg-slate-800 p-1 rounded-lg text-[11px] font-bold">
        <button onClick={() => props.onTool("place")} className={`py-1 rounded ${props.tool === "place" ? "bg-yellow-400 text-slate-950" : "text-slate-300"}`}>
          ➕ Yerleştir
        </button>
        <button onClick={() => props.onTool("remove")} className={`py-1 rounded ${props.tool === "remove" ? "bg-rose-400 text-slate-950" : "text-slate-300"}`}>
          🗑️ Kaldır
        </button>
        <button onClick={() => props.onTool("nudge")} className={`py-1 rounded ${props.tool === "nudge" ? "bg-sky-400 text-slate-950" : "text-slate-300"}`}>
          ✋ Hizala
        </button>
      </div>

      {props.tool === "place" ? (
        <>
          <div className="flex items-center justify-between">
            <span className="text-[11px] md:text-xs font-bold text-yellow-400">EŞYA KATALOĞU</span>
            <button onClick={props.onRotate} className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-200 border border-slate-700">
              ↻ Döndür (R)
            </button>
          </div>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {FURNI_CATALOG.map((item) => (
              <button
                key={item.type}
                onClick={() => props.onSelect(item.type)}
                className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-[11px] md:text-xs border transition ${
                  props.selected === item.type ? "bg-yellow-400/15 border-yellow-400 text-white" : "bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800"
                }`}
              >
                <span className="font-medium truncate">
                  {item.icon} {item.name}
                </span>
                <span className="text-yellow-400 font-bold shrink-0 ml-1">{props.isAdmin ? "Ücretsiz" : `${item.price} S`}</span>
              </button>
            ))}
          </div>
        </>
      ) : props.tool === "nudge" ? (
        <div className="text-[11px] text-slate-300 leading-relaxed space-y-1">
          <div><b className="text-sky-300">Serbest yerleştirme:</b> eşyayı tutup istediğin noktaya sürükle. Bırakınca en yakın kareye oturur, içinden geçilmez.</div>
          <div>🖱️ Tekerlek veya <b>+ / −</b>: boyutu değiştir.</div>
          <div><b>0</b> tuşu: konumu ve boyutu sıfırla.</div>
        </div>
      ) : (
        <div className="text-[11px] text-slate-400 leading-relaxed">Kaldırmak istediğin eşyaya tıkla. Eşya çantana gelir. Sadece kendi koyduğun eşyaları kaldırabilirsin (admin hepsini).</div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

const REPORT_REASONS = ["Küfür / hakaret", "Spam", "Taciz", "Hile / dolandırıcılık", "Diğer"];

export function PlayerCard(props: {
  name: string;
  role: UserRole;
  isFriend: boolean;
  inventory: string[];
  canWhisper: boolean;
  isAdmin: boolean;
  onClose: () => void;
  onWhisper: () => void;
  onAddFriend: () => void;
  onGiftCoins: (amount: number) => void;
  onGiftItem: (item: string) => void;
  onProfile: () => void;
  onTag?: () => void;
  onReport: (reason: string) => void;
  onBlock?: () => void;
  onGift: (amount: number) => void;
  onRole: (role: UserRole) => void;
  onKick: () => void;
  onMute: (minutes: number) => void;
  onBan: (hours: number) => void;
}) {
  const [sub, setSub] = useState<"gift" | "report" | null>(null);
  const [amount, setAmount] = useState(50);
  const btn = "text-[11px] font-bold py-1.5 rounded-lg border transition";
  const giftable = props.inventory.filter((i) => isFurniType(i));

  return (
    <div className="bg-slate-900/95 backdrop-blur border border-slate-700 p-3 rounded-xl w-56 md:w-60 space-y-2 shadow-xl max-h-[70vh] overflow-y-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 min-w-0">
          <RoleBadge role={props.role} />
          <span className="text-xs font-bold text-white truncate">{props.name}</span>
        </div>
        <button onClick={props.onClose} className={closeBtn}>
          ✕
        </button>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {props.canWhisper && (
          <button onClick={props.onWhisper} className={`${btn} bg-purple-500/15 text-purple-200 border-purple-400/40`}>
            🔒 Fısılda
          </button>
        )}
        {!props.isFriend && (
          <button onClick={props.onAddFriend} className={`${btn} bg-sky-500/15 text-sky-200 border-sky-400/40`}>
            ➕ Arkadaş
          </button>
        )}
        <button onClick={props.onProfile} className={`${btn} bg-slate-800 text-slate-200 border-slate-700`}>
          👤 Profil
        </button>
        {props.onTag && (
          <button onClick={props.onTag} className={`${btn} bg-rose-500/20 text-rose-300 border-rose-500/40`}>
            🙈 Yakala!
          </button>
        )}
        <button onClick={() => setSub(sub === "gift" ? null : "gift")} className={`${btn} bg-emerald-500/15 text-emerald-200 border-emerald-400/40`}>
          🎁 Hediye
        </button>
        <button onClick={() => setSub(sub === "report" ? null : "report")} className={`${btn} bg-slate-800 text-slate-300 border-slate-700`}>
          🚩 Şikayet
        </button>
        {props.onBlock && (
          <button onClick={props.onBlock} className={`${btn} bg-slate-800 text-rose-300 border-slate-700`}>
            🚫 Engelle
          </button>
        )}
      </div>
      {!props.canWhisper && <div className="text-[10px] text-slate-500">Özel mesaj (/pm) VIP ve üstü içindir.</div>}

      {sub === "gift" && (
        <div className="space-y-1.5 border-t border-slate-800 pt-1.5">
          <div className="flex gap-1.5">
            <input
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-20 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-yellow-400 font-bold"
            />
            <button onClick={() => props.onGiftCoins(amount)} className={`${btn} flex-1 bg-yellow-400 text-slate-950 border-yellow-300`}>
              Sanil gönder
            </button>
          </div>
          {giftable.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {giftable.map((it, i) => (
                <button key={`${it}-${i}`} onClick={() => props.onGiftItem(it)} className="text-[11px] bg-slate-800 border border-slate-700 rounded-lg px-2 py-1">
                  {BAG_ITEM_LABELS[it]?.icon ?? "📦"} {BAG_ITEM_LABELS[it]?.name ?? it}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-[10px] text-slate-500">Çantanda hediye edilebilir eşya yok.</div>
          )}
        </div>
      )}

      {sub === "report" && (
        <div className="space-y-1 border-t border-slate-800 pt-1.5">
          <div className="text-[10px] text-slate-400">Neden şikayet ediyorsun?</div>
          {REPORT_REASONS.map((r) => (
            <button
              key={r}
              onClick={() => {
                props.onReport(r);
                setSub(null);
              }}
              className="w-full text-left text-[11px] bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg px-2 py-1"
            >
              {r}
            </button>
          ))}
        </div>
      )}

      {props.isAdmin && (
        <div className="space-y-1.5 pt-1.5 border-t border-slate-800">
          <div className="text-[10px] font-semibold text-amber-300">Yönetici işlemleri</div>
          <div className="grid grid-cols-2 gap-1.5">
            <button onClick={() => props.onGift(100)} className={`${btn} bg-emerald-500/15 text-emerald-300 border-emerald-500/40`}>
              +100 S
            </button>
            <button onClick={() => props.onGift(1000)} className={`${btn} bg-emerald-500/15 text-emerald-300 border-emerald-500/40`}>
              +1000 S
            </button>
            <button onClick={() => props.onRole("vip")} className={`${btn} bg-slate-800 text-purple-300 border-slate-700`}>
              💎 VIP
            </button>
            <button onClick={() => props.onRole("suvari")} className={`${btn} bg-slate-800 text-sky-300 border-slate-700`}>
              ⚔️ Süvari
            </button>
            <button onClick={() => props.onRole("user")} className={`${btn} bg-slate-800 text-slate-300 border-slate-700`}>
              👤 Üye yap
            </button>
            <button onClick={props.onKick} className={`${btn} bg-rose-500/15 text-rose-300 border-rose-500/40`}>
              🚪 At
            </button>
            <button onClick={() => props.onMute(10)} className={`${btn} bg-slate-800 text-amber-300 border-slate-700`}>
              🔇 Sustur 10dk
            </button>
            <button onClick={() => props.onBan(24)} className={`${btn} bg-rose-500/15 text-rose-300 border-rose-500/40`}>
              ⛔ Yasakla 24s
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* NPC pencereleri: Balıkçı Hasan & Şef Kemal                           */
/* ------------------------------------------------------------------ */

export function FisherNpcModal(props: { hasRod: boolean; coins: number; isAdmin: boolean; onClose: () => void; onBuyRod: () => void }) {
  const canAfford = props.isAdmin || props.coins >= ROD_PRICE;
  return (
    <div className="bg-slate-900/95 backdrop-blur border border-emerald-400/50 p-3.5 rounded-2xl w-64 md:w-72 space-y-2.5 shadow-2xl">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <span className="text-xs font-black text-emerald-300 tracking-wide">🎣 BALIKÇI HASAN</span>
        <button onClick={props.onClose} className={closeBtn}>
          ✕
        </button>
      </div>
      <p className="text-[11px] text-slate-300 leading-relaxed">
        &quot;Hoş geldin evlat! Denize bak, bol balık var. Oltanı kuşan, iskelede suya tıkla; tuttuğunu restorandaki Şef Kemal&apos;e sat.&quot;
      </p>
      {props.hasRod ? (
        <div className="text-[11px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-2">
          ✅ Oltan var. Çantandan <b>Kuşan</b> diyerek kullan.
        </div>
      ) : (
        <button
          onClick={props.onBuyRod}
          disabled={!canAfford}
          className="w-full bg-emerald-400 disabled:bg-slate-700 disabled:text-slate-400 text-slate-950 font-bold text-xs py-2 rounded-lg"
        >
          🎣 Ahşap Olta Al ({ROD_PRICE} S)
        </button>
      )}
    </div>
  );
}

export function ChefNpcModal(props: {
  inventory: string[];
  onClose: () => void;
  onSellAll: () => void;
  onSellOne: (item: string) => void;
  onCook: (dish: string) => void;
  onSellDishes: () => void;
  onSellDish: (item: string) => void;
}) {
  const fishes = props.inventory.filter(isFishItem);
  const total = fishes.reduce((n, k) => n + (FISH_PRICES[k] ?? 0), 0);
  const kinds = [...new Set(fishes)];
  const count = (k: string) => props.inventory.filter((x) => x === k).length;
  return (
    <div className="bg-slate-900/95 backdrop-blur border border-orange-400/50 p-3.5 rounded-2xl w-64 md:w-72 space-y-2.5 shadow-2xl max-h-[75vh] overflow-y-auto">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <span className="text-xs font-black text-orange-300 tracking-wide">👨‍🍳 ŞEF KEMAL</span>
        <button onClick={props.onClose} className={closeBtn}>
          ✕
        </button>
      </div>
      {fishes.length === 0 ? (
        <p className="text-[11px] text-slate-400">&quot;Taze balık getirirsen iyi para veririm. Şimdilik elin boş görünüyor.&quot;</p>
      ) : (
        <>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {kinds.map((k) => {
              const meta = BAG_ITEM_LABELS[k];
              return (
                <div key={k} className="flex items-center justify-between gap-2 bg-slate-800/80 border border-slate-700 rounded-lg px-2 py-1">
                  <span className="text-xs text-white truncate">
                    {meta?.icon} {meta?.name} <span className="text-slate-400">×{count(k)}</span>
                  </span>
                  <button onClick={() => props.onSellOne(k)} className="shrink-0 text-[11px] font-bold bg-orange-400 text-slate-950 rounded px-2 py-0.5">
                    Sat +{FISH_PRICES[k]}
                  </button>
                </div>
              );
            })}
          </div>
          <button onClick={props.onSellAll} className="w-full bg-yellow-400 text-slate-950 font-bold text-xs py-2 rounded-lg">
            Balıkları Sat (+{total} S)
          </button>
        </>
      )}
      <div className="border-t border-slate-800 pt-2 space-y-1.5">
        <div className="text-[11px] font-semibold text-orange-200">🍳 Tarifler (balık + çiftlik ürünü)</div>
        {RECIPES.map((r) => {
          const can = r.needs.every((n) => count(n) >= r.needs.filter((x) => x === n).length);
          return (
            <div key={r.dish} className="flex items-center justify-between gap-2 bg-slate-800/60 rounded-lg px-2 py-1">
              <div className="min-w-0">
                <div className="text-xs truncate">
                  {BAG_ITEM_LABELS[r.dish]?.icon} {BAG_ITEM_LABELS[r.dish]?.name} <span className="text-yellow-300">({GOODS_PRICES[r.dish]} S)</span>
                </div>
                <div className="text-[10px] text-slate-400 truncate">{r.needs.map((n) => BAG_ITEM_LABELS[n]?.icon).join(" ")}</div>
              </div>
              <button
                onClick={() => props.onCook(r.dish)}
                disabled={!can}
                className="shrink-0 text-[11px] font-bold rounded px-2 py-0.5 bg-orange-400 text-slate-950 disabled:bg-slate-700 disabled:text-slate-500"
              >
                Pişir
              </button>
            </div>
          );
        })}
        <GoodsSeller inventory={props.inventory} prefix="dish_" empty="Henüz yemeğin yok." onSellAll={props.onSellDishes} onSellOne={props.onSellDish} />
      </div>
    </div>
  );
}
