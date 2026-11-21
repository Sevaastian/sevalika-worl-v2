"use client";

import { useEffect, useState } from "react";
import { ACHIEVEMENTS, BADGES, BADGE_BY_KEY, BADGE_REWARDS, BAG_ITEM_LABELS, COSMETIC_BY_ID, QUEST_LABELS, ROLE_LABEL, isFishItem, isFurniType, levelOf, xpFloor } from "@/lib/constants";
import { useDrag } from "./useDrag";
import type { BadgeState, Listing, Profile, ProfileCard, Quest, TournamentState } from "@/lib/types";

const closeBtn = "text-slate-400 hover:text-white text-xs px-1.5 py-0.5 rounded bg-slate-800";

const fmtClock = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

/** Kalan süreyi saniyede bir güncelleyen sayaç. */
function useCountdown(endsAt: number | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!endsAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [endsAt]);
  return endsAt ? Math.max(0, endsAt - now) : 0;
}

/** Geri sayımlı küçük durum rozeti (turnuva, bayrak, ebelemece). */
export function CountChip(props: { label: string; endsAt: number; tone: string; onClick?: () => void; onExpire: () => void }) {
  const left = useCountdown(props.endsAt);
  const { onExpire } = props;
  useEffect(() => {
    if (left <= 0) onExpire();
  }, [left, onExpire]);
  return (
    <button onClick={props.onClick} className={`bg-slate-900/90 border ${props.tone} text-[11px] font-bold rounded-full px-3 py-1 shadow-lg whitespace-nowrap`}>
      {props.label} · {fmtClock(left)}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Görevler, seviye, turnuva, başarımlar                                */
/* ------------------------------------------------------------------ */

export function QuestsPanel(props: {
  profile: Profile;
  quests: Quest[] | null;
  tournament: TournamentState | null;
  card: ProfileCard | null;
  onClose: () => void;
  onClaim: (key: string) => void;
}) {
  const { xp } = props.profile;
  const level = levelOf(xp);
  const lo = xpFloor(level);
  const hi = xpFloor(level + 1);
  const pct = Math.min(100, Math.round(((xp - lo) / (hi - lo)) * 100));
  const t = props.tournament;
  const endsAt = t?.active && t.ends_at ? Date.parse(t.ends_at) : null;
  const left = useCountdown(endsAt);
  const done = new Set(props.card?.achievements ?? []);

  return (
    <div className="bg-slate-900/95 backdrop-blur border border-sky-400/50 p-3.5 rounded-2xl w-64 md:w-72 space-y-3 shadow-2xl max-h-[75vh] overflow-y-auto">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <span className="text-xs font-black text-sky-300 tracking-wide">📜 GÖREVLER & İLERLEME</span>
        <button onClick={props.onClose} className={closeBtn}>
          ✕
        </button>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-[11px] font-bold">
          <span className="text-yellow-300">⭐ Seviye {level}</span>
          <span className="text-slate-400">
            {xp - lo} / {hi - lo} XP
          </span>
        </div>
        <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-yellow-400 to-amber-500" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="text-[11px] font-semibold text-slate-300">Günlük görevler (gece yarısı yenilenir)</div>
        {props.quests === null && <div className="text-[11px] text-slate-400">Yükleniyor...</div>}
        {props.quests?.map((q) => {
          const meta = QUEST_LABELS[q.key];
          const ready = q.progress >= q.goal && !q.claimed;
          return (
            <div key={q.key} className="bg-slate-800/80 border border-slate-700 rounded-xl p-2 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium">
                  {meta?.icon} {meta?.text ?? q.key}
                </span>
                <span className="text-[10px] text-slate-400 shrink-0">
                  {q.progress}/{q.goal}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden">
                <div className={`h-full ${q.claimed ? "bg-slate-500" : "bg-emerald-400"}`} style={{ width: `${Math.round((q.progress / q.goal) * 100)}%` }} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-yellow-300">
                  +{q.coins} S · +{q.xp} XP
                </span>
                <button
                  onClick={() => props.onClaim(q.key)}
                  disabled={!ready}
                  className={`text-[11px] font-bold rounded-lg px-2.5 py-0.5 ${ready ? "bg-emerald-400 text-slate-950" : "bg-slate-700 text-slate-400"}`}
                >
                  {q.claimed ? "Alındı ✓" : ready ? "Ödülü Al" : "Devam"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="space-y-1.5 border-t border-slate-800 pt-2">
        <div className="text-[11px] font-semibold text-orange-300">🏆 Balık Turnuvası</div>
        {!t?.active ? (
          <div className="text-[11px] text-slate-400">Şu an aktif turnuva yok. Yetkililer başlatınca duyuru gelir.</div>
        ) : (
          <>
            <div className="text-[11px] text-slate-300">
              Kalan: <b className="text-orange-200">{fmtClock(left)}</b> · Puanın: <b>{t.me ?? 0}</b>
            </div>
            <div className="text-[10px] text-slate-500">Puan = tuttuğun balıkların Sanil değeri. Ödül: 500 / 250 / 100 Sanil.</div>
            {t.top?.length ? (
              <ol className="space-y-0.5">
                {t.top.slice(0, 5).map((r, i) => (
                  <li key={r.username} className="flex justify-between text-[11px] bg-slate-800/60 rounded px-2 py-0.5">
                    <span>
                      {["🥇", "🥈", "🥉", "4.", "5."][i]} {r.username}
                    </span>
                    <b className="text-orange-200">{r.score}</b>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="text-[11px] text-slate-500">Henüz kimse balık tutmadı.</div>
            )}
          </>
        )}
      </div>

      <div className="space-y-1.5 border-t border-slate-800 pt-2">
        <div className="text-[11px] font-semibold text-slate-300">
          🏅 Başarımlar ({done.size}/{Object.keys(ACHIEVEMENTS).length})
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {Object.entries(ACHIEVEMENTS).map(([key, a]) => (
            <div key={key} title={`${a.name}: ${a.desc}`} className={`rounded-lg border p-1.5 text-center ${done.has(key) ? "bg-yellow-400/10 border-yellow-400/40" : "bg-slate-800/50 border-slate-700 opacity-40 grayscale"}`}>
              <div className="text-lg">{a.icon}</div>
              <div className="text-[9px] leading-tight text-slate-300">{a.name}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Pazar / takas                                                       */
/* ------------------------------------------------------------------ */

const itemLabel = (k: string) => BAG_ITEM_LABELS[k] ?? (COSMETIC_BY_ID[k] ? { name: COSMETIC_BY_ID[k].name, icon: COSMETIC_BY_ID[k].icon } : undefined);
const input = "bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-amber-400";

export function MarketPanel(props: {
  profile: Profile;
  listings: Listing[] | null;
  onClose: () => void;
  onBuy: (id: number) => void;
  onCancel: (id: number) => void;
  onList: (item: string, price: number, forUser?: string) => Promise<boolean>;
}) {
  const [tab, setTab] = useState<"buy" | "sell">("buy");
  const sellable = [
    ...new Set(props.profile.inventory.filter((i) => i !== "suvari_ati" && (isFurniType(i) || isFishItem(i)))),
    ...props.profile.wardrobe.filter((i) => (COSMETIC_BY_ID[i]?.price ?? 0) > 0),
  ];
  const [item, setItem] = useState("");
  const [price, setPrice] = useState(50);
  const [forUser, setForUser] = useState("");
  const chosen = sellable.includes(item) ? item : (sellable[0] ?? "");

  return (
    <div className="bg-slate-900/95 backdrop-blur border border-amber-400/50 p-3.5 rounded-2xl w-64 md:w-72 space-y-2.5 shadow-2xl max-h-[75vh] overflow-y-auto">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <span className="text-xs font-black text-amber-300 tracking-wide">🏪 PAZAR YERİ</span>
        <button onClick={props.onClose} className={closeBtn}>
          ✕
        </button>
      </div>
      <div className="flex gap-1 bg-slate-800 p-1 rounded-lg">
        {(["buy", "sell"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 py-1 rounded text-[11px] font-bold ${tab === t ? "bg-amber-400 text-slate-950" : "text-slate-300"}`}>
            {t === "buy" ? "İlanlar" : "Sat / İlanlarım"}
          </button>
        ))}
      </div>

      {tab === "buy" && (
        <div className="space-y-1.5">
          {props.listings === null && <div className="text-[11px] text-slate-400">Yükleniyor...</div>}
          {props.listings?.length === 0 && <div className="text-[11px] text-slate-400">Şu an ilan yok. İlk satıcı sen ol!</div>}
          {props.listings
            ?.filter((l) => !l.mine)
            .map((l) => {
              const meta = itemLabel(l.item);
              return (
                <div key={l.id} className="flex items-center justify-between gap-2 bg-slate-800/80 border border-slate-700 rounded-lg px-2 py-1.5">
                  <div className="min-w-0">
                    <div className="text-xs font-medium truncate">
                      {meta?.icon} {meta?.name ?? l.item}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {l.seller}
                      {l.for_user ? " · 🔒 sana özel" : ""}
                    </div>
                  </div>
                  <button
                    onClick={() => props.onBuy(l.id)}
                    disabled={props.profile.coins < l.price}
                    className="shrink-0 text-[11px] font-bold rounded-lg px-2.5 py-1 bg-yellow-400 text-slate-950 disabled:bg-slate-700 disabled:text-slate-400"
                  >
                    {l.price} S
                  </button>
                </div>
              );
            })}
        </div>
      )}

      {tab === "sell" && (
        <div className="space-y-2">
          {sellable.length === 0 ? (
            <div className="text-[11px] text-slate-400">Satılabilir eşyan yok (mobilya, balık veya satın aldığın kıyafetler). At ve olta satılamaz.</div>
          ) : (
            <form
              className="space-y-1.5"
              onSubmit={async (e) => {
                e.preventDefault();
                const ok = await props.onList(chosen, Math.floor(price), forUser.trim() || undefined);
                if (ok) setForUser("");
              }}
            >
              <select value={chosen} onChange={(e) => setItem(e.target.value)} className={`w-full ${input}`}>
                {sellable.map((k) => (
                  <option key={k} value={k}>
                    {itemLabel(k)?.icon} {itemLabel(k)?.name ?? k}{COSMETIC_BY_ID[k] ? " (kıyafet)" : ` (×${props.profile.inventory.filter((x) => x === k).length})`}
                  </option>
                ))}
              </select>
              <div className="flex gap-1.5 items-center">
                <input type="number" min={1} max={100000} value={price} onChange={(e) => setPrice(Number(e.target.value))} className={`w-24 ${input} text-yellow-400 font-bold`} />
                <span className="text-[10px] text-slate-500">Sanil (%5 komisyon)</span>
              </div>
              <input value={forUser} onChange={(e) => setForUser(e.target.value)} placeholder="Sadece şu kişiye (opsiyonel, takas)" className={`w-full ${input}`} />
              <button type="submit" className="w-full bg-amber-400 text-slate-950 font-bold text-xs py-1.5 rounded-lg">
                İlan Ver
              </button>
            </form>
          )}
          <div className="border-t border-slate-800 pt-1.5 space-y-1.5">
            <div className="text-[11px] font-semibold text-slate-300">İlanlarım</div>
            {props.listings?.filter((l) => l.mine).length === 0 && <div className="text-[11px] text-slate-500">İlanın yok.</div>}
            {props.listings
              ?.filter((l) => l.mine)
              .map((l) => (
                <div key={l.id} className="flex items-center justify-between gap-2 bg-slate-800/80 border border-slate-700 rounded-lg px-2 py-1.5">
                  <span className="text-xs truncate">
                    {itemLabel(l.item)?.icon} {itemLabel(l.item)?.name ?? l.item} · {l.price} S{l.for_user ? ` → ${l.for_user}` : ""}
                  </span>
                  <button onClick={() => props.onCancel(l.id)} className="shrink-0 text-[11px] font-bold rounded-lg px-2 py-1 bg-rose-500/20 text-rose-300 border border-rose-500/40">
                    İptal
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Profil kartı                                                        */
/* ------------------------------------------------------------------ */

/** Rozet rozeti: ikon + yıldızlar */
function BadgeChip(props: { k: string; tier?: number; selected?: boolean; onClick?: () => void }) {
  const d = BADGE_BY_KEY[props.k];
  if (!d) return null;
  const t = props.tier ?? 0;
  return (
    <button
      onClick={props.onClick}
      title={d.name + (t ? " " + "★".repeat(t) : "")}
      className={`flex flex-col items-center leading-none rounded-lg px-1.5 py-1 border transition ${
        props.selected ? "bg-amber-400/20 border-amber-300" : "bg-slate-800/80 border-slate-700 hover:border-slate-500"
      }`}
    >
      <span className="text-xl">{d.icon}</span>
      <span className="text-[9px] text-amber-300 h-2.5 mt-0.5">{t > 0 ? "★".repeat(t) : ""}</span>
    </button>
  );
}

export function ProfileCardModal(props: { name: string; card: ProfileCard | null; error: string; onClose: () => void }) {
  const c = props.card;
  const { style, handleProps } = useDrag(336);
  const [sel, setSel] = useState<string | null>(null);
  const tiers = (c?.badges?.tiers ?? []).filter((t) => t.tier > 0);
  const owned = c?.badges?.owned ?? [];
  const selDef = sel ? BADGE_BY_KEY[sel] : null;
  const selTier = tiers.find((t) => t.key === sel);
  const nextAt = selDef?.thresholds && selTier ? selDef.thresholds[selTier.tier] : undefined;
  return (
    <div style={style} className="bg-slate-900/95 backdrop-blur border border-slate-600 rounded-2xl w-72 md:w-80 shadow-2xl max-h-[80vh] overflow-y-auto">
      <div {...handleProps} className="flex items-center justify-between border-b border-slate-800 px-3.5 py-2.5 sticky top-0 bg-slate-900 rounded-t-2xl" style={handleProps.style}>
        <span className="text-xs font-black text-white tracking-wide">👤 {props.name} <span className="text-slate-500 font-normal">· sürükle</span></span>
        <button onClick={props.onClose} className={closeBtn}>
          ✕
        </button>
      </div>
      <div className="p-3.5 space-y-2">
        {props.error && <div className="text-[11px] text-rose-300">{props.error}</div>}
        {!c && !props.error && <div className="text-[11px] text-slate-400">Yükleniyor...</div>}
        {c && (
          <>
            {c.status_text && <div className="text-[11px] italic text-slate-300 bg-slate-800/60 rounded-lg px-2 py-1">“{c.status_text}”</div>}
            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              <div className="bg-slate-800/80 rounded-lg p-1.5">⭐ Seviye <b className="text-yellow-300">{c.level}</b></div>
              <div className="bg-slate-800/80 rounded-lg p-1.5">🎣 Balık <b>{c.fish_caught}</b></div>
              <div className="bg-slate-800/80 rounded-lg p-1.5">👥 Arkadaş <b>{c.friends}</b></div>
              <div className="bg-slate-800/80 rounded-lg p-1.5">🏷️ <b>{ROLE_LABEL[c.role]}</b></div>
            </div>
            {c.guild && <div className="text-[11px] text-indigo-300">🛡️ {c.guild}</div>}
            <div className="text-[10px] text-slate-500">Üyelik: {new Date(c.joined).toLocaleDateString("tr-TR")}</div>
            <div className="flex flex-wrap gap-1">
              {c.achievements.length === 0 && <span className="text-[11px] text-slate-500">Henüz başarım yok.</span>}
              {c.achievements.map((k) => (
                <span key={k} title={ACHIEVEMENTS[k]?.name} className="text-lg bg-yellow-400/10 border border-yellow-400/30 rounded-lg px-1.5">
                  {ACHIEVEMENTS[k]?.icon ?? "🏅"}
                </span>
              ))}
            </div>
            <div className="border-t border-slate-800 pt-2 space-y-1.5">
              <div className="text-[11px] font-black text-amber-300 tracking-wide">🎖️ ROZETLER ({tiers.length + owned.length})</div>
              {tiers.length + owned.length === 0 && <div className="text-[11px] text-slate-500">Henüz rozet yok.</div>}
              <div className="flex flex-wrap gap-1.5">
                {tiers.map((t) => (
                  <BadgeChip key={t.key} k={t.key} tier={t.tier} selected={sel === t.key} onClick={() => setSel(sel === t.key ? null : t.key)} />
                ))}
                {owned.map((k) => (
                  <BadgeChip key={k} k={k} selected={sel === k} onClick={() => setSel(sel === k ? null : k)} />
                ))}
              </div>
              {selDef && (
                <div className="text-[11px] bg-slate-800/70 rounded-lg px-2 py-1.5 text-slate-200 leading-snug">
                  <b>{selDef.icon} {selDef.name}</b>
                  {selTier ? <span className="text-amber-300"> {"★".repeat(selTier.tier)}</span> : null}
                  <div className="text-slate-400">{selDef.desc}</div>
                  {selTier && selDef.unit && (
                    <div className="text-slate-300">
                      {selTier.count} {selDef.unit}
                      {nextAt ? ` · sonraki yıldız: ${nextAt}` : " · tüm yıldızlar tamam!"}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/** Kendi rozetlerim: ilerleme, mağaza, özel rozetler */
export function BadgesPanel(props: { profile: Profile; state: BadgeState | null; onClose: () => void; onBuy: (key: string) => void }) {
  const st = props.state;
  const isAdmin = props.profile.role === "admin";
  const prog = (k: string) => st?.tiers.find((t) => t.key === k);
  const has = (k: string) => !!st?.owned.includes(k);
  const [tab, setTab] = useState<"tier" | "shop" | "special">("tier");
  const list = BADGES.filter((b) => b.kind === tab);
  return (
    <div className="bg-slate-900/95 backdrop-blur border border-amber-400/50 p-3.5 rounded-2xl w-72 md:w-80 space-y-2.5 shadow-2xl max-h-[78vh] overflow-y-auto">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <span className="text-xs font-black text-amber-300 tracking-wide">🎖️ ROZETLER</span>
        <button onClick={props.onClose} className={closeBtn}>
          ✕
        </button>
      </div>
      <div className="flex gap-1">
        {([["tier", "Başarım"], ["shop", "Mağaza"], ["special", "Özel"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`flex-1 text-[11px] font-bold py-1 rounded-lg border ${tab === k ? "bg-amber-400 text-slate-950 border-amber-300" : "bg-slate-800 text-slate-300 border-slate-700"}`}>
            {l}
          </button>
        ))}
      </div>
      {!st && <div className="text-[11px] text-slate-400">Yükleniyor...</div>}
      {tab === "tier" && <p className="text-[10px] text-slate-400">İlk başarıda rozeti kazanırsın, sonraki eşiklerde ★ yıldız alırsın. Her yıldızda Sanil ödülü var: {BADGE_REWARDS.map((r) => `🪙${r}`).join(" · ")}</p>}
      {st &&
        list.map((b) => {
          const p = prog(b.key);
          const t = p?.tier ?? 0;
          const cnt = p?.count ?? 0;
          if (b.kind === "tier" && b.thresholds) {
            const next = b.thresholds[t];
            const prev = t > 0 ? b.thresholds[t - 1] : 0;
            const pct = next ? Math.min(100, Math.round(((cnt - prev) / (next - prev)) * 100)) : 100;
            return (
              <div key={b.key} className={`bg-slate-800/70 rounded-xl p-2.5 space-y-1 ${t === 0 ? "opacity-70" : ""}`}>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{b.icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-black text-slate-100">
                      {b.name} <span className="text-amber-300">{"★".repeat(t)}<span className="text-slate-600">{"★".repeat(3 - t)}</span></span>
                    </div>
                    <div className="text-[10px] text-slate-400">{b.desc}</div>
                  </div>
                </div>
                <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden">
                  <div className="h-full bg-amber-400" style={{ width: `${pct}%` }} />
                </div>
                <div className="text-[10px] text-slate-400">
                  {cnt} {b.unit}
                  {next ? ` / ${next} · sonraki: 🪙${BADGE_REWARDS[t]} Sanil` : " · tamamlandı 🎉"}
                </div>
              </div>
            );
          }
          const own = has(b.key);
          return (
            <div key={b.key} className="bg-slate-800/70 rounded-xl p-2.5 flex items-center gap-2">
              <span className={`text-2xl ${own ? "" : "grayscale opacity-60"}`}>{b.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-black text-slate-100">{b.name}</div>
                <div className="text-[10px] text-slate-400 leading-tight">{b.desc}</div>
              </div>
              {b.kind === "shop" ? (
                own ? (
                  <span className="text-[10px] font-black text-emerald-300">✓ Sende</span>
                ) : (
                  <button
                    onClick={() => props.onBuy(b.key)}
                    disabled={!isAdmin && props.profile.coins < (b.price ?? 0)}
                    className="text-[11px] font-black px-2 py-1 rounded-lg bg-amber-400 text-slate-950 disabled:opacity-40 whitespace-nowrap"
                  >
                    {isAdmin ? "Al" : `🪙 ${b.price}`}
                  </button>
                )
              ) : (
                <span className={`text-[10px] font-black ${own ? "text-emerald-300" : "text-slate-500"}`}>{own ? "✓ Kazanıldı" : "🔒"}</span>
              )}
            </div>
          );
        })}
    </div>
  );
}
