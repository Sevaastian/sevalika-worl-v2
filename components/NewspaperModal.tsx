"use client";

import { useEffect, useMemo, useState } from "react";
import type { GameEvent, PopularHome } from "@/lib/types";
import type { TetrisBoardData } from "./TetrisArena";

const HEADLINES = [
  "İskelede Dev Balık Tartışması: \"Bu Boyda Değildi\" Diyenler Çoğunlukta",
  "Cadde 1'de Taksiler Artık Tek Yönlü: Sürücüler Rahat, Yayalar Şaşkın",
  "Oyunika Salonu Hafta Sonu Doldu Taştı; Kürsüde Kıran Kırana Yarış",
  "Maden Ocağında Parlak Taş Bulundu: Kazıcılar \"Bu Seferki Başka\" Diyor",
  "Sahil Kasabası'nda Voleybol Turnuvası: Kum Fırtınası Maçı Etkilemedi",
  "Çiftlikte Rekor Hasat: Domatesler Bu Yıl Ağır Çıktı",
  "Hain Avı'nda Şüphe Büyüyor: \"Ben Elektrikteydim\" Diyen Çok, Gören Yok",
  "Yeni Ev Sahipleri Emlak Ofisi'nde Kuyrukta: Küçük Bahçeli Evler Kapış Kapış",
  "Kış Köyü'nde Kardan Adam Festivali: Havuçlar Tükendi",
  "Blok Rüzgârı Arenasında Sıra Dışı Maç: Son Blok Son Saniyede Yerine Oturdu",
  "AVM'de Yeni Sezon Kostümleri Raflarda: Stilistler \"Mor Bu Yılın Rengi\" Diyor",
  "Meydan Bulvarı'nda Sokak Müzisyenleri Konser Verdi, Güvercinler Eşlik Etti",
  "Gizemli Hediye Kutuları Şehre Dağıldı: Sahibi Henüz Bulunamadı",
  "Parti Oyunu'nda Mor Kareler Çok Konuşuldu: \"Sürpriz mi, Şanssızlık mı?\"",
];

const TIPS = [
  "Günlük ödülünü her gün al: 7 günlük seri tamamlanınca büyük ödül seni bekliyor.",
  "Şans Çarkı her 24 saatte bir çevrilir; ödülü kaçırma.",
  "Bir evin kaç beğeni aldığını Emlak Ofisi'ndeki Popüler Evler listesinden takip edebilirsin.",
  "Blok Rüzgârı'nda 4 satırı aynı anda silmek (TETRİS) en yüksek puanı ve çöp satırı verir.",
  "Hain Avı'nda sis var: duvar arkasını göremezsin, odalar arası dolaşırken yalnız kalma!",
  "İskelede olta kuşanıp denize tıkla; şans güzel balıkları getirir.",
  "Çiftlikte tohum ekmeyi unutma; hasat zamanı geldiğinde aynı gün sat, fiyat dalgalanabilir.",
  "Parti Oyunu'nda ⚡ Hız Kuşağı 5 kare ileri atar, ⏪ Geri Sar 6 kare geri; riske değer mi?",
  "Rozetlerini profil kartında sergile; mevsimlik rozetler sınırlı sürede alınır.",
  "Arkadaş ekle, birbirinize hediye gönderin; birlikte oynamak daha eğlenceli.",
];

const SIGNS = ["Koç", "Boğa", "İkizler", "Yengeç", "Aslan", "Başak", "Terazi", "Akrep", "Yay", "Oğlak", "Kova", "Balık"];
const HOROSCOPE = [
  "Bugün Oyunika'da şansın yaver gidiyor; zarlar senden yana.",
  "Eski bir arkadaşınla beklenmedik bir yerde karşılaşabilirsin.",
  "Cüzdanına dikkat: AVM'de gördüğün şey seni çok cezbedecek.",
  "Sakin bir gün seni bekliyor; iskelede balık tutmak iyi gelir.",
  "Yeni bir maceraya atılma zamanı; haritada henüz gitmediğin yere uğra.",
  "Bugün söylediklerin çok dikkat çekecek; sohbette cömert ol.",
  "Beklediğin haber geliyor; ama önce çevreni dinle.",
  "Birlikte oynamak bugün sana puan kazandırır, takım ruhu öne çıkıyor.",
];

const ADS = [
  "SATILIK: Az kullanılmış sahil şemsiyesi. Rüzgâra karşı dayanıklıdır. Soran Cemre'ye.",
  "ARANIYOR: Tetris düellosu için sabırlı rakip. Kaybedene dondurma. — Kaan",
  "KAYIP: Mavi şapkalı kedi (veya şapkalı mavi kedi). Gören iskeleye haber versin.",
  "ORTAK ARANIYOR: Çiftlikte ikiz domates yarışması için. Gönüllü tohum sahibi olmalı.",
  "KİRALIK: Çatı katında manzaralı koltuk. Sadece akşamları, sadece gün batarken.",
  "DUYURU: Hain Avı'nda \"ben görev yapıyordum\" cümlesini kullanmak artık şüpheli sayılır.",
];

const WORDS = ["SANIL", "ISKELE", "CADDE", "OYUNIKA", "BALIK", "PALMIYE", "KUMSAL", "ROZET", "HASAT", "KURSU", "MADEN", "GAZETE"];

function scramble(word: string, seed: number): string {
  const a = word.split("");
  let s = seed + 7;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  const out = a.join("");
  return out === word ? scramble(word, seed + 1) : out;
}

const trUp = (s: string) => s.replace(/i/g, "İ").replace(/ı/g, "I").toUpperCase();

export default function NewspaperModal({
  me,
  events,
  fetchHomes,
  fetchTetris,
  holding,
  onToggleHold,
  onClose,
}: {
  me: string;
  events: GameEvent[];
  fetchHomes: () => Promise<PopularHome[]>;
  fetchTetris: () => Promise<TetrisBoardData>;
  holding: boolean;
  onToggleHold: () => void;
  onClose: () => void;
}) {
  const [homes, setHomes] = useState<PopularHome[]>([]);
  const [tetris, setTetris] = useState<TetrisBoardData | null>(null);
  const [sign, setSign] = useState(0);
  const [guess, setGuess] = useState("");
  const [solved, setSolved] = useState<boolean | null>(null);

  useEffect(() => {
    void fetchHomes().then(setHomes).catch(() => {});
    void fetchTetris().then(setTetris).catch(() => {});
  }, [fetchHomes, fetchTetris]);

  const [day] = useState(() => Math.floor(Date.now() / 86400000));
  const date = useMemo(() => new Date().toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }), []);
  const word = WORDS[day % WORDS.length];
  const scr = useMemo(() => scramble(word, day), [word, day]);
  const live = events.find((e) => e.active);
  const headline = live ? `${live.title}: ${live.description || "Şehir bu etkinlikle çalkalanıyor!"}` : HEADLINES[day % HEADLINES.length];

  return (
    <div className="fixed inset-0 z-[55] bg-slate-950/70 backdrop-blur-[2px] flex items-start sm:items-center justify-center p-2 overflow-auto" onClick={onClose}>
      <div
        className="relative w-full max-w-[760px] text-stone-900 shadow-2xl rounded-sm border border-stone-400"
        style={{ background: "linear-gradient(135deg,#f6efdc 0%,#efe4c6 100%)", fontFamily: "Georgia, 'Times New Roman', serif" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute right-2 top-2 text-xs bg-stone-800 text-stone-100 rounded px-2 py-0.5 font-sans font-bold">
          ✕ Kapat
        </button>

        <div className="px-4 pt-4 text-center">
          <div className="flex items-center justify-between pr-16 text-[10px] tracking-widest uppercase text-stone-600 font-sans">
            <span>Sayı {day - 20000}</span>
            <span>{date}</span>
            <span>Fiyat: Bedava</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight border-y-4 border-double border-stone-800 py-1 my-1" style={{ fontVariant: "small-caps" }}>
            Sevalika Günlüğü
          </h1>
          <div className="text-[11px] italic text-stone-600">&ldquo;Şehrin sesi, sokağın gazetesi&rdquo; — Başyazar Alper</div>
        </div>

        <div className="px-4 py-3 grid sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2 space-y-2.5">
            <div className="border-b-2 border-stone-700 pb-2">
              <div className="text-[10px] font-sans font-bold uppercase text-red-700 tracking-widest">{live ? "Son Dakika" : "Manşet"}</div>
              <h2 className="text-2xl font-black leading-tight">{headline}</h2>
              <p className="text-[13px] leading-snug mt-1 text-stone-800">
                Şehir bu haberi konuşuyor. Muhabirimiz Alper sahadan bildirdi: herkes bir şeyler gördü, kimse tam olarak ne olduğunu bilmiyor.
                Gelişmeleri takip etmeye devam edeceğiz; bu arada çayınızı tazeleyin.
              </p>
            </div>

            <div>
              <div className="text-[11px] font-sans font-black uppercase tracking-widest text-stone-700">🧱 Blok Rüzgârı Rekorları</div>
              <div className="text-[13px] mt-0.5">
                {tetris && tetris.solo.length > 0 ? (
                  tetris.solo.slice(0, 3).map((r, i) => (
                    <div key={r.username} className="flex justify-between border-b border-dotted border-stone-400">
                      <span>{["🥇", "🥈", "🥉"][i]} {r.username}</span>
                      <b>{r.score}</b>
                    </div>
                  ))
                ) : (
                  <span className="italic text-stone-600">Henüz rekor yok; ilk adı sen yaz!</span>
                )}
              </div>
            </div>

            <div>
              <div className="text-[11px] font-sans font-black uppercase tracking-widest text-stone-700">🏡 Semtin En Beğenilen Evleri</div>
              <div className="text-[13px] mt-0.5">
                {homes.length > 0 ? (
                  homes.slice(0, 3).map((h) => (
                    <div key={h.slug} className="flex justify-between border-b border-dotted border-stone-400">
                      <span>{h.owner}&apos;in evi ({h.size}x{h.size})</span>
                      <b>❤ {h.likes}</b>
                    </div>
                  ))
                ) : (
                  <span className="italic text-stone-600">Henüz beğenilen ev yok.</span>
                )}
              </div>
            </div>

            <div className="bg-amber-100/70 border border-stone-400 p-2">
              <div className="text-[11px] font-sans font-black uppercase tracking-widest text-stone-700">💡 Alper&apos;in Köşesi</div>
              <p className="text-[13px] italic">{TIPS[day % TIPS.length]}</p>
            </div>
          </div>

          <div className="space-y-2.5 sm:border-l sm:border-stone-500 sm:pl-3">
            <div>
              <div className="text-[11px] font-sans font-black uppercase tracking-widest text-stone-700">🔮 Burç Yorumu</div>
              <select value={sign} onChange={(e) => setSign(Number(e.target.value))} className="w-full text-xs bg-transparent border border-stone-500 rounded px-1 py-0.5 font-sans mt-0.5">
                {SIGNS.map((s, i) => (
                  <option key={s} value={i}>{s}</option>
                ))}
              </select>
              <p className="text-[12.5px] leading-snug mt-1">{HOROSCOPE[(day + sign * 3) % HOROSCOPE.length]}</p>
            </div>

            <div className="border-t border-stone-500 pt-2">
              <div className="text-[11px] font-sans font-black uppercase tracking-widest text-stone-700">🧩 Günün Bulmacası</div>
              <p className="text-[12px] mt-0.5">Harfleri karışık kelimeyi bul:</p>
              <div className="text-xl font-black tracking-[0.3em] text-center my-1">{scr}</div>
              <div className="text-[11px] text-stone-600 text-center">İpucu: {word.length} harf, &ldquo;{word[0]}&rdquo; ile başlar</div>
              <form
                className="flex gap-1 mt-1"
                onSubmit={(e) => {
                  e.preventDefault();
                  setSolved(trUp(guess.trim()) === word);
                }}
              >
                <input value={guess} onChange={(e) => setGuess(e.target.value)} maxLength={12} className="flex-1 min-w-0 text-xs border border-stone-500 bg-white/60 px-1.5 py-1 font-sans" placeholder="Cevabın" />
                <button className="text-xs bg-stone-800 text-white px-2 font-sans font-bold">Tamam</button>
              </form>
              {solved !== null && <div className={`text-xs mt-1 font-sans font-bold ${solved ? "text-green-700" : "text-red-700"}`}>{solved ? "🎉 Doğru! Aferin " + me + "." : "Olmadı, tekrar dene."}</div>}
            </div>

            <div className="border-t border-stone-500 pt-2">
              <div className="text-[11px] font-sans font-black uppercase tracking-widest text-stone-700">📌 Küçük İlanlar</div>
              {[0, 1, 2].map((i) => (
                <p key={i} className="text-[11.5px] leading-snug border-b border-dotted border-stone-400 py-1">
                  {ADS[(day + i * 2) % ADS.length]}
                </p>
              ))}
            </div>
          </div>
        </div>

        <div className="px-4 pb-3 flex gap-2 font-sans">
          <button onClick={onToggleHold} className="flex-1 bg-stone-800 hover:bg-stone-700 text-stone-50 text-sm font-black py-2 rounded">
            {holding ? "📰 Gazeteyi Bırak" : "📰 Gazeteyi Elime Al"}
          </button>
          <button onClick={onClose} className="px-4 bg-stone-300 hover:bg-stone-200 text-stone-900 text-sm font-bold rounded">
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
