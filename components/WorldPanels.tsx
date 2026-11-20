"use client";

import { useEffect, useState } from "react";
import { BAG_ITEM_LABELS, CROPS, GOODS_PRICES, PICKAXE_PRICE, goodsOf, type GoodsPrefix } from "@/lib/constants";
import type { BjState, DiceResult, FarmPlot, GuildInfo, GuildListItem } from "@/lib/types";

const closeBtn = "text-slate-400 hover:text-white text-xs px-1.5 py-0.5 rounded bg-slate-800";
const input = "bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-amber-400";
const shell = "bg-slate-900/95 backdrop-blur border p-3.5 rounded-2xl w-64 md:w-72 space-y-2.5 shadow-2xl max-h-[75vh] overflow-y-auto";

function Header(props: { title: string; color: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
      <span className={`text-xs font-black tracking-wide ${props.color}`}>{props.title}</span>
      <button onClick={props.onClose} className={closeBtn}>
        ✕
      </button>
    </div>
  );
}

/** Belirli türdeki ürünleri listeler; tek tek ya da hepsini satar. */
export function GoodsSeller(props: { inventory: string[]; prefix: GoodsPrefix; empty: string; onSellAll: () => void; onSellOne: (item: string) => void }) {
  const items = goodsOf(props.inventory, props.prefix);
  const kinds = [...new Set(items)];
  const total = items.reduce((n, k) => n + (GOODS_PRICES[k] ?? 0), 0);
  if (items.length === 0) return <p className="text-[11px] text-slate-400">{props.empty}</p>;
  return (
    <div className="space-y-1.5">
      <div className="space-y-1 max-h-36 overflow-y-auto">
        {kinds.map((k) => (
          <div key={k} className="flex items-center justify-between gap-2 bg-slate-800/80 border border-slate-700 rounded-lg px-2 py-1">
            <span className="text-xs text-white truncate">
              {BAG_ITEM_LABELS[k]?.icon} {BAG_ITEM_LABELS[k]?.name} <span className="text-slate-400">×{items.filter((x) => x === k).length}</span>
            </span>
            <button onClick={() => props.onSellOne(k)} className="shrink-0 text-[11px] font-bold bg-yellow-400 text-slate-950 rounded px-2 py-0.5">
              Sat +{GOODS_PRICES[k]}
            </button>
          </div>
        ))}
      </div>
      <button onClick={props.onSellAll} className="w-full bg-yellow-400 text-slate-950 font-bold text-xs py-1.5 rounded-lg">
        Hepsini Sat (+{total} S)
      </button>
    </div>
  );
}

export function MinerNpcModal(props: {
  inventory: string[];
  coins: number;
  isAdmin: boolean;
  onClose: () => void;
  onBuyPickaxe: () => void;
  onMine: () => void;
  onSellAll: () => void;
  onSellOne: (item: string) => void;
}) {
  const has = props.inventory.includes("pickaxe");
  return (
    <div className={`${shell} border-amber-400/50`}>
      <Header title="⛏️ MADENCİ RECEP" color="text-amber-300" onClose={props.onClose} />
      {!has ? (
        <>
          <p className="text-[11px] text-slate-300">&quot;Kazmasız maden olmaz evlat. {PICKAXE_PRICE} Sanil, hemen al.&quot;</p>
          <button
            onClick={props.onBuyPickaxe}
            disabled={!props.isAdmin && props.coins < PICKAXE_PRICE}
            className="w-full bg-amber-400 text-slate-950 font-bold text-xs py-2 rounded-lg disabled:bg-slate-700 disabled:text-slate-400"
          >
            ⛏️ Kazma Al ({PICKAXE_PRICE} S)
          </button>
        </>
      ) : (
        <>
          <p className="text-[11px] text-slate-300">Bir kayanın yanına git (≤2 kare) ve kaz. Her vuruş ~2,5 sn.</p>
          <button onClick={props.onMine} className="w-full bg-amber-400 text-slate-950 font-bold text-xs py-2 rounded-lg">
            ⛏️ Kaz
          </button>
        </>
      )}
      <GoodsSeller inventory={props.inventory} prefix="ore_" empty="Cevherin yok. Kayalardan kömür, demir, altın ve zümrüt çıkar." onSellAll={props.onSellAll} onSellOne={props.onSellOne} />
    </div>
  );
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export function FarmerNpcModal(props: {
  plots: FarmPlot[] | null;
  fetchedAt: number;
  inventory: string[];
  coins: number;
  isAdmin: boolean;
  onClose: () => void;
  onPlant: (slot: number, crop: string) => void;
  onHarvest: (slot: number) => void;
  onSellAll: () => void;
  onSellOne: (item: string) => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  const [crop, setCrop] = useState<string>(CROPS[0].key);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const left = (p: FarmPlot) => (p.seconds_left === null ? null : Math.max(0, p.seconds_left - Math.floor((now - props.fetchedAt) / 1000)));
  const def = CROPS.find((c) => c.key === crop) ?? CROPS[0];
  return (
    <div className={`${shell} border-lime-400/50`}>
      <Header title="🌾 ÇİFTÇİ AYŞE" color="text-lime-300" onClose={props.onClose} />
      <p className="text-[11px] text-slate-300">Tohum seç, boş tarlaya ek. Olgunlaşınca topla; aşçılıkta kullan ya da sat.</p>
      <div className="flex gap-1">
        {CROPS.map((c) => (
          <button
            key={c.key}
            onClick={() => setCrop(c.key)}
            className={`flex-1 rounded-lg border py-1 text-[10px] leading-tight ${crop === c.key ? "bg-lime-400 text-slate-950 border-lime-300 font-bold" : "bg-slate-800 border-slate-700 text-slate-300"}`}
          >
            {BAG_ITEM_LABELS[c.key]?.icon} {BAG_ITEM_LABELS[c.key]?.name}
            <br />
            {c.seed} S · {fmt(c.seconds)}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {(props.plots ?? Array.from({ length: 6 }, (_, slot) => ({ slot, crop: null, seconds_left: null }))).map((p) => {
          const l = left(p);
          const ready = p.crop !== null && l === 0;
          return (
            <button
              key={p.slot}
              onClick={() => (p.crop === null ? props.onPlant(p.slot, crop) : ready ? props.onHarvest(p.slot) : undefined)}
              disabled={p.crop !== null && !ready}
              className={`rounded-lg border p-1.5 text-center min-h-[54px] ${
                p.crop === null ? "bg-amber-900/30 border-amber-700/50 hover:bg-amber-800/40" : ready ? "bg-lime-400/20 border-lime-400 animate-pulse" : "bg-slate-800/70 border-slate-700"
              }`}
            >
              <div className="text-lg">{p.crop === null ? "🟫" : ready ? BAG_ITEM_LABELS[p.crop]?.icon : "🌱"}</div>
              <div className="text-[9px] text-slate-300">{p.crop === null ? `Ek (${def.seed} S)` : ready ? "Topla!" : fmt(l ?? 0)}</div>
            </button>
          );
        })}
      </div>
      <GoodsSeller inventory={props.inventory} prefix="crop_" empty="Ekinin yok." onSellAll={props.onSellAll} onSellOne={props.onSellOne} />
    </div>
  );
}

const cardLabel = (c: number) => (c === 0 ? "🂠" : c === 1 ? "A" : c === 11 ? "J" : c === 12 ? "Q" : c === 13 ? "K" : String(c));
const Cards = (props: { cards: number[] }) => (
  <div className="flex gap-1 flex-wrap">
    {props.cards.map((c, i) => (
      <span key={i} className="min-w-7 text-center rounded bg-white text-slate-900 font-black text-sm px-1.5 py-1 shadow">
        {cardLabel(c)}
      </span>
    ))}
  </div>
);
const Dice = (props: { v: number[] }) => (
  <span className="text-base font-black">
    {props.v.map((d) => ["", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"][d]).join(" ")} <span className="text-slate-400 text-xs">= {props.v[0] + props.v[1]}</span>
  </span>
);
const RESULT_TEXT: Record<string, string> = { win: "Kazandın! 🎉", lose: "Kaybettin.", push: "Berabere, bahis iade.", blackjack: "BLACKJACK! 🃏" };

export function DealerModal(props: {
  coins: number;
  isAdmin: boolean;
  bj: BjState | null;
  onClose: () => void;
  onDice: (bet: number) => Promise<DiceResult | undefined>;
  onBjStart: (bet: number) => void;
  onBjHit: () => void;
  onBjStand: () => void;
}) {
  const [bet, setBet] = useState(50);
  const [dice, setDice] = useState<DiceResult | null>(null);
  const active = props.bj && !props.bj.done;
  return (
    <div className={`${shell} border-rose-400/50`}>
      <Header title="🎰 KRUPİYE SELİM" color="text-rose-300" onClose={props.onClose} />
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] text-slate-400">Bahis</span>
        <input type="number" min={10} max={500} value={bet} onChange={(e) => setBet(Number(e.target.value))} className={`w-20 ${input} text-yellow-400 font-bold`} />
        <span className="text-[10px] text-slate-500">10–500 S</span>
      </div>

      <div className="space-y-1.5 bg-slate-800/60 rounded-xl p-2">
        <div className="text-[11px] font-bold text-slate-200">🎲 Zar Düellosu</div>
        <div className="text-[10px] text-slate-400">2 zar at; toplamın krupiyeden yüksekse bahsin kadar kazanırsın (%5 komisyon).</div>
        <button
          onClick={async () => setDice((await props.onDice(Math.floor(bet))) ?? null)}
          disabled={!!active}
          className="w-full bg-rose-400 text-slate-950 font-bold text-xs py-1.5 rounded-lg disabled:bg-slate-700 disabled:text-slate-400"
        >
          Zar At
        </button>
        {dice && (
          <div className="text-[11px] space-y-0.5">
            <div>Sen: <Dice v={dice.you} /></div>
            <div>Krupiye: <Dice v={dice.house} /></div>
            <div className={dice.result === "win" ? "text-emerald-300 font-bold" : dice.result === "lose" ? "text-rose-300" : "text-slate-300"}>
              {RESULT_TEXT[dice.result]} ({dice.delta >= 0 ? "+" : ""}
              {dice.delta} S)
            </div>
          </div>
        )}
      </div>

      <div className="space-y-1.5 bg-slate-800/60 rounded-xl p-2">
        <div className="text-[11px] font-bold text-slate-200">🃏 Blackjack</div>
        <div className="text-[10px] text-slate-400">21&apos;e yaklaş, aşma. Blackjack 3:2 öder, krupiye 17&apos;de durur.</div>
        {props.bj && (
          <div className="space-y-1">
            <div className="text-[10px] text-slate-400">Krupiye {props.bj.dealer_total !== null ? `(${props.bj.dealer_total})` : ""}</div>
            <Cards cards={props.bj.dealer} />
            <div className="text-[10px] text-slate-400">Sen ({props.bj.player_total}) · bahis {props.bj.bet}</div>
            <Cards cards={props.bj.player} />
            {props.bj.done && props.bj.result && (
              <div className={props.bj.delta > 0 ? "text-emerald-300 font-bold text-[11px]" : props.bj.delta < 0 ? "text-rose-300 text-[11px]" : "text-slate-300 text-[11px]"}>
                {RESULT_TEXT[props.bj.result]} ({props.bj.delta >= 0 ? "+" : ""}
                {props.bj.delta} S)
              </div>
            )}
          </div>
        )}
        {active ? (
          <div className="flex gap-1.5">
            <button onClick={props.onBjHit} className="flex-1 bg-sky-400 text-slate-950 font-bold text-xs py-1.5 rounded-lg">
              Kart Çek
            </button>
            <button onClick={props.onBjStand} className="flex-1 bg-amber-400 text-slate-950 font-bold text-xs py-1.5 rounded-lg">
              Dur
            </button>
          </div>
        ) : (
          <button onClick={() => props.onBjStart(Math.floor(bet))} className="w-full bg-rose-400 text-slate-950 font-bold text-xs py-1.5 rounded-lg">
            Yeni El Dağıt
          </button>
        )}
      </div>
      <div className="text-[10px] text-slate-500">Kumar eğlence içindir; oyun parası gerçek değildir. Bakiyen: {props.isAdmin ? "∞" : props.coins} S</div>
    </div>
  );
}

export function GuildPanel(props: {
  guild: GuildInfo | null | undefined;
  list: GuildListItem[];
  coins: number;
  onClose: () => void;
  onCreate: (name: string, tag: string) => void;
  onJoin: (name: string) => void;
  onLeave: () => void;
  onKick: (user: string) => void;
  onDonate: (amount: number) => void;
}) {
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [amount, setAmount] = useState(100);
  const g = props.guild;
  return (
    <div className={`${shell} border-indigo-400/50`}>
      <Header title="🛡️ LONCA" color="text-indigo-300" onClose={props.onClose} />
      {g === undefined && <div className="text-[11px] text-slate-400">Yükleniyor...</div>}
      {g && (
        <>
          <div className="bg-slate-800/80 rounded-xl p-2 space-y-0.5">
            <div className="text-sm font-black text-white">
              {g.name} <span className="text-indigo-300">[{g.tag}]</span>
            </div>
            <div className="text-[11px] text-slate-300">
              Seviye {g.level} · Kasa {g.bank} S · Üye {g.members.length}/{g.cap}
            </div>
            <div className="text-[10px] text-slate-500">Lonca seviyesi her üyeye +%{Math.min(25, 5 * (g.level - 1))} XP bonusu verir. Kasaya yapılan bağış seviyeyi yükseltir.</div>
          </div>
          <div className="flex gap-1.5 items-center">
            <input type="number" min={1} value={amount} onChange={(e) => setAmount(Number(e.target.value))} className={`w-20 ${input} text-yellow-400 font-bold`} />
            <button onClick={() => props.onDonate(Math.floor(amount))} className="flex-1 bg-indigo-400 text-slate-950 font-bold text-xs py-1.5 rounded-lg">
              Kasaya Bağış
            </button>
          </div>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {g.members.map((m) => (
              <div key={m.username} className="flex items-center justify-between bg-slate-800/60 rounded px-2 py-1 text-[11px]">
                <span>
                  {m.owner ? "👑 " : ""}
                  {m.username} <span className="text-slate-500">Sv.{m.level}</span>
                </span>
                {g.owner && !m.owner && (
                  <button onClick={() => props.onKick(m.username)} className="text-[10px] text-rose-300 border border-rose-500/40 rounded px-1.5">
                    Çıkar
                  </button>
                )}
              </div>
            ))}
          </div>
          <button onClick={props.onLeave} className="w-full bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold text-xs py-1.5 rounded-lg">
            Loncadan Ayrıl
          </button>
        </>
      )}
      {g === null && (
        <>
          <div className="space-y-1.5">
            <div className="text-[11px] font-semibold text-slate-300">Yeni lonca kur (1000 S)</div>
            <input value={name} maxLength={16} onChange={(e) => setName(e.target.value)} placeholder="Lonca adı (3-16)" className={`w-full ${input}`} />
            <input value={tag} maxLength={4} onChange={(e) => setTag(e.target.value.toUpperCase())} placeholder="Etiket (2-4 harf)" className={`w-full ${input}`} />
            <button onClick={() => props.onCreate(name, tag)} className="w-full bg-indigo-400 text-slate-950 font-bold text-xs py-1.5 rounded-lg">
              🛡️ Kur
            </button>
          </div>
          <div className="border-t border-slate-800 pt-2 space-y-1.5">
            <div className="text-[11px] font-semibold text-slate-300">Loncalar</div>
            {props.list.length === 0 && <div className="text-[11px] text-slate-500">Henüz lonca yok. İlk lonca senin olsun!</div>}
            {props.list.map((l) => (
              <div key={l.name} className="flex items-center justify-between gap-2 bg-slate-800/60 rounded px-2 py-1">
                <span className="text-[11px] truncate">
                  {l.name} <span className="text-indigo-300">[{l.tag}]</span> <span className="text-slate-500">{l.members}/{l.cap} · Sv.{l.level}</span>
                </span>
                <button onClick={() => props.onJoin(l.name)} className="shrink-0 text-[10px] font-bold bg-indigo-400 text-slate-950 rounded px-2 py-0.5">
                  Katıl
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
