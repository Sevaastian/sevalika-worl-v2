import { HAIN_COLS, HAIN_ROWS, HAIN_SPAWN, HAIN_FURNI, HAIN_WALLS } from "./hain";
import type { FurniItem, FurniType, NpcKind, OyunikaCell, OyunikaCellKind, RoomDef, RoomTheme, UserRole } from "./types";

export const BASE_TILE_W = 64;
export const BASE_TILE_H = 32;
export const GRID_SIZE = 12;

export const MAX_CHAT_LENGTH = 140;
export const CHAT_COOLDOWN_MS = 1200;

/** Kullanıcı adından sahte e-posta üretmek için kullanılan alan adı (Supabase Auth e-posta ister). */
export const AUTH_EMAIL_DOMAIN = process.env.NEXT_PUBLIC_AUTH_EMAIL_DOMAIN || "sevalika.game";

export const ROLE_RANK: Record<UserRole, number> = { user: 0, vip: 1, suvari: 2, admin: 3 };

export const ROLE_LABEL: Record<UserRole, string> = {
  user: "ÜYE",
  vip: "VIP",
  suvari: "SÜVARİ",
  admin: "ADMIN",
};

export const canRideHorse = (role: UserRole) => ROLE_RANK[role] >= ROLE_RANK.suvari;
export const canWhisper = (role: UserRole) => ROLE_RANK[role] >= ROLE_RANK.vip;

export interface FurniDef {
  type: FurniType;
  name: string;
  icon: string;
  desc: string;
  price: number;
  /** Üzerinden geçilemez */
  blocks: boolean;
  /** Üstüne gelince karakter oturur */
  sittable: boolean;
  /** Halı gibi zemin katmanı */
  floor: boolean;
  /** Çok kareli yapılar için genişlik (gx) ve derinlik (gy) */
  wTiles?: number;
  hTiles?: number;
}

export const FURNI_CATALOG: FurniDef[] = [
  { type: "sofa", name: "VIP Deri Koltuk", icon: "🛋️", desc: "Üstüne gelince oturursun.", price: 150, blocks: false, sittable: true, floor: false },
  { type: "chair", name: "Bar Sandalyesi", icon: "🪑", desc: "Tek kişilik oturak.", price: 70, blocks: false, sittable: true, floor: false },
  { type: "bench", name: "Park Bankı", icon: "🪑", desc: "Cadde ve park bankı, oturulabilir.", price: 110, blocks: false, sittable: true, floor: false },
  { type: "lounger", name: "Sahil Şezlongu", icon: "🏖️", desc: "Güneşlenmek için şezlong.", price: 130, blocks: false, sittable: true, floor: false },
  { type: "logseat", name: "Kamp Kütüğü", icon: "🪵", desc: "Ateş başı oturma kütüğü.", price: 95, blocks: false, sittable: true, floor: false },
  { type: "beanbag", name: "Armut Koltuk", icon: "🛋️", desc: "Rahat sahil armut koltuğu.", price: 145, blocks: false, sittable: true, floor: false },
  { type: "campfire", name: "Kamp Ateşi", icon: "🔥", desc: "Akşamları etrafı ısıtan ateş.", price: 240, blocks: true, sittable: false, floor: false },
  { type: "umbrella", name: "Plaj Şemsiyesi", icon: "⛱️", desc: "Mavi-beyaz çizgili sahil şemsiyesi.", price: 115, blocks: true, sittable: false, floor: false },
  { type: "surfboard", name: "Sörf Tahtası", icon: "🏄", desc: "Renkli sahil sörf tahtası.", price: 125, blocks: true, sittable: false, floor: false },
  { type: "lamp", name: "Sarı Neon Lamba", icon: "💡", desc: "Parlayan neon lamba.", price: 80, blocks: true, sittable: false, floor: false },
  { type: "streetlight", name: "Sokak Lambası", icon: "🏮", desc: "Gece caddeyi aydınlatır.", price: 140, blocks: true, sittable: false, floor: false },
  { type: "plant", name: "Monstera Saksı", icon: "🪴", desc: "Dekoratif bitki.", price: 60, blocks: true, sittable: false, floor: false },
  { type: "tree", name: "Çınar Ağacı", icon: "🌳", desc: "Büyük gölgeli sokak ağacı.", price: 180, blocks: true, sittable: false, floor: false },
  { type: "palm", name: "Palmiye Ağacı", icon: "🌴", desc: "Sahil ve çatı palmiyesi.", price: 210, blocks: true, sittable: false, floor: false },
  { type: "table", name: "Modern Sehpa", icon: "🍸", desc: "Cam sehpa.", price: 100, blocks: true, sittable: false, floor: false },
  { type: "counter", name: "Bar & Mutfak Tezgahı", icon: "🍽️", desc: "Şık servis tezgahı.", price: 160, blocks: true, sittable: false, floor: false },
  { type: "casinotable", name: "Oyun Masası", icon: "🎰", desc: "Yeşil çuhalı VIP oyun masası.", price: 280, blocks: true, sittable: false, floor: false },
  { type: "bin", name: "Çöp Kutusu", icon: "🗑️", desc: "Belediye çöp kutusu.", price: 40, blocks: true, sittable: false, floor: false },
  { type: "kiosk", name: "Gazete Büfesi", icon: "🏪", desc: "Cadde büfesi.", price: 320, blocks: true, sittable: false, floor: false },
  { type: "rug", name: "Kırmızı Halı", icon: "🟥", desc: "Zemin halısı, üstünden geçilir.", price: 50, blocks: false, sittable: false, floor: true },
  { type: "bookshelf", name: "Kitaplık", icon: "📚", desc: "Rengarenk kitaplı raf.", price: 120, blocks: true, sittable: false, floor: false },
  { type: "tv", name: "Plazma TV", icon: "📺", desc: "Canlı renkli ekran.", price: 200, blocks: true, sittable: false, floor: false },
  { type: "fountain", name: "Neon Havuz", icon: "⛲", desc: "Akan sulu süs havuzu.", price: 250, blocks: true, sittable: false, floor: false },
  // Çok kareli (Multi-Tile) özel binalar
  { type: "beach_cafe", name: "Sahil Kafesi (4x3)", icon: "🛖", desc: "Büyük ahşap sahil kafesi.", price: 950, blocks: true, sittable: false, floor: false, wTiles: 4, hTiles: 3 },
  { type: "dj_booth", name: "DJ Sahnesi (3x2)", icon: "🎧", desc: "Neon kulaklıklı DJ kabini.", price: 850, blocks: true, sittable: false, floor: false, wTiles: 3, hTiles: 2 },
  { type: "tiki_bar", name: "Tropikal Bar (2x2)", icon: "🍹", desc: "Neon ışıklı kokteyl barı.", price: 650, blocks: true, sittable: false, floor: false, wTiles: 2, hTiles: 2 },
  { type: "casino_bar", name: "Casino Barı (4x2)", icon: "🍸", desc: "Raflı, tabureli büyük casino barı.", price: 900, blocks: true, sittable: false, floor: false, wTiles: 4, hTiles: 2 },
  { type: "fish_hut", name: "Balıkçı Kulübesi (3x2)", icon: "🛖", desc: "Fıçı ve balık askılı iskele kulübesi.", price: 600, blocks: true, sittable: false, floor: false, wTiles: 3, hTiles: 2 },
  { type: "mine_entrance", name: "Maden Girişi (4x2)", icon: "⛏️", desc: "Kaya duvarlı, ahşap destekli maden ağzı.", price: 1000, blocks: true, sittable: false, floor: false, wTiles: 4, hTiles: 2 },
  { type: "ore_cart", name: "Maden Arabası", icon: "🛒", desc: "Cevher dolu vagon.", price: 250, blocks: true, sittable: false, floor: false, wTiles: 1, hTiles: 1 },
  { type: "bus_stop", name: "Otobüs Durağı (3x1)", icon: "🚏", desc: "Camlı, banklı durak.", price: 500, blocks: true, sittable: false, floor: false, wTiles: 3, hTiles: 1 },
  { type: "store_fashion", name: "Moda Mağazası (4x2)", icon: "👗", desc: "AVM tarzı butik cephesi.", price: 1500, blocks: true, sittable: false, floor: false, wTiles: 4, hTiles: 2 },
  { type: "store_tech", name: "Teknoloji Mağazası (4x2)", icon: "📱", desc: "AVM tarzı elektronik mağazası.", price: 1500, blocks: true, sittable: false, floor: false, wTiles: 4, hTiles: 2 },
  { type: "store_food", name: "Yemek Dükkanı (4x2)", icon: "🍔", desc: "AVM tarzı yiyecek dükkanı.", price: 1500, blocks: true, sittable: false, floor: false, wTiles: 4, hTiles: 2 },
  { type: "mannequin", name: "Manken", icon: "👚", desc: "Vitrin mankeni.", price: 90, blocks: true, sittable: false, floor: false },
  { type: "bed", name: "Yatak (2x1)", icon: "🛏️", desc: "Rahat çift kişilik yatak.", price: 220, blocks: true, sittable: false, floor: false, wTiles: 2, hTiles: 1 },
  { type: "clock_tower", name: "Saat Kulesi (2x2)", icon: "🕰️", desc: "Meydanın simgesi.", price: 1200, blocks: true, sittable: false, floor: false, wTiles: 2, hTiles: 2 },
  { type: "fountain_big", name: "Büyük Çeşme (3x3)", icon: "⛲", desc: "Meydan çeşmesi.", price: 1800, blocks: true, sittable: false, floor: false, wTiles: 3, hTiles: 3 },
  { type: "food_truck", name: "Yemek Aracı (3x2)", icon: "🚚", desc: "Sokak lezzetleri.", price: 900, blocks: true, sittable: false, floor: false, wTiles: 3, hTiles: 2 },
  { type: "stall_red", name: "Pazar Tezgâhı (kırmızı)", icon: "🍎", desc: "Tente altında tezgâh.", price: 300, blocks: true, sittable: false, floor: false, wTiles: 2, hTiles: 1 },
  { type: "stall_blue", name: "Pazar Tezgâhı (mavi)", icon: "🫐", desc: "Tente altında tezgâh.", price: 300, blocks: true, sittable: false, floor: false, wTiles: 2, hTiles: 1 },
  { type: "billboard", name: "Reklam Panosu (3x1)", icon: "📺", desc: "Büyük pano.", price: 700, blocks: true, sittable: false, floor: false, wTiles: 3, hTiles: 1 },
  { type: "car_red", name: "Araba (kırmızı)", icon: "🚗", desc: "Park halinde araba.", price: 500, blocks: true, sittable: false, floor: false, wTiles: 2, hTiles: 1 },
  { type: "car_blue", name: "Araba (mavi)", icon: "🚙", desc: "Park halinde araba.", price: 500, blocks: true, sittable: false, floor: false, wTiles: 2, hTiles: 1 },
  { type: "car_yellow", name: "Taksi (sarı)", icon: "🚕", desc: "Sarı taksi.", price: 500, blocks: true, sittable: false, floor: false, wTiles: 2, hTiles: 1 },
  { type: "flower_bed", name: "Çiçeklik (3x1)", icon: "🌷", desc: "Renkli çiçek tarhı.", price: 200, blocks: true, sittable: false, floor: false, wTiles: 3, hTiles: 1 },
  { type: "phone_booth", name: "Telefon Kulübesi", icon: "☎️", desc: "Kırmızı telefon kulübesi.", price: 300, blocks: true, sittable: false, floor: false, wTiles: 1, hTiles: 1 },
  { type: "kitchen_block", name: "Profesyonel Mutfak (4x2)", icon: "🍳", desc: "Ocaklı, aspiratörlü mutfak bloğu.", price: 700, blocks: true, sittable: false, floor: false, wTiles: 4, hTiles: 2 },
  { type: "barn", name: "Kırmızı Ambar (4x3)", icon: "🏚️", desc: "Silo ve saman balyalı çiftlik ambarı.", price: 1200, blocks: true, sittable: false, floor: false, wTiles: 4, hTiles: 3 },
];

export const FURNI_BY_TYPE = Object.fromEntries(FURNI_CATALOG.map((f) => [f.type, f])) as Record<FurniType, FurniDef>;

export const isFurniType = (s: string): s is FurniType => s in FURNI_BY_TYPE;

export const BAG_ITEM_LABELS: Record<string, { name: string; icon: string; desc: string; special?: boolean }> = {
  suvari_ati: {
    name: "Süvari Atı",
    icon: "🐎",
    desc: "Sadece Süvari ve Admin rütbesine özel asil siyah binek.",
    special: true,
  },
  fishing_rod: { name: "Ahşap Olta", icon: "🎣", desc: "Kuşan, iskelede denize tıkla. Balıkçı Hasan'dan alınır." },
  fish_boot: { name: "Eski Çizme", icon: "👢", desc: "Restoranda Şef Kemal'e sat • 5 Sanil" },
  fish_hamsi: { name: "Hamsi", icon: "🐟", desc: "Restoranda Şef Kemal'e sat • 15 Sanil" },
  fish_cipura: { name: "Çipura", icon: "🐠", desc: "Restoranda Şef Kemal'e sat • 30 Sanil" },
  fish_levrek: { name: "Levrek", icon: "🐡", desc: "Restoranda Şef Kemal'e sat • 55 Sanil" },
  fish_shark: { name: "Köpekbalığı", icon: "🦈", desc: "Nadir av! Restoranda sat • 120 Sanil" },
  fish_treasure: { name: "Batık Hazine", icon: "💎", desc: "Efsanevi av! Restoranda sat • 250 Sanil" },
  pickaxe: { name: "Kazma", icon: "⛏️", desc: "Taş Ocağı Madeni'nde kayalara yaklaşıp Kaz butonuna bas." },
  ore_coal: { name: "Kömür", icon: "⚫", desc: "Madende Madenci Recep'e sat • 8 Sanil" },
  ore_iron: { name: "Demir Cevheri", icon: "🔩", desc: "Madende sat • 25 Sanil" },
  ore_gold: { name: "Altın Külçe", icon: "🥇", desc: "Madende sat • 70 Sanil" },
  ore_gem: { name: "Zümrüt", icon: "💚", desc: "Efsanevi buluntu! Madende sat • 200 Sanil" },
  crop_wheat: { name: "Buğday", icon: "🌾", desc: "Çiftlikte sat • 30 Sanil. Aşçılıkta malzeme." },
  crop_tomato: { name: "Domates", icon: "🍅", desc: "Çiftlikte sat • 70 Sanil. Aşçılıkta malzeme." },
  crop_pumpkin: { name: "Bal Kabağı", icon: "🎃", desc: "Çiftlikte sat • 180 Sanil. Aşçılıkta malzeme." },
  dish_balik_ekmek: { name: "Balık Ekmek", icon: "🥪", desc: "Restoranda sat • 90 Sanil" },
  dish_levrek_izgara: { name: "Levrek Izgara", icon: "🍽️", desc: "Restoranda sat • 220 Sanil" },
  dish_kabak_corbasi: { name: "Kabak Çorbası", icon: "🍲", desc: "Restoranda sat • 520 Sanil" },
  ...Object.fromEntries(FURNI_CATALOG.map((f) => [f.type, { name: f.name, icon: f.icon, desc: `Odaya yerleştirilebilir. ${f.desc}` }])),
};

export const FISH_PRICES: Record<string, number> = {
  fish_boot: 5,
  fish_hamsi: 15,
  fish_cipura: 30,
  fish_levrek: 55,
  fish_shark: 120,
  fish_treasure: 250,
};
export const isFishItem = (key: string) => key in FISH_PRICES;
export const ROD_PRICE = 200;
export const PICKAXE_PRICE = 300;

export const GOODS_PRICES: Record<string, number> = {
  ore_coal: 8, ore_iron: 25, ore_gold: 70, ore_gem: 200,
  crop_wheat: 30, crop_tomato: 70, crop_pumpkin: 180,
  dish_balik_ekmek: 90, dish_levrek_izgara: 220, dish_kabak_corbasi: 520,
};
export type GoodsPrefix = "ore_" | "crop_" | "dish_";
export const goodsOf = (inv: string[], prefix: GoodsPrefix) => inv.filter((k) => k.startsWith(prefix) && k in GOODS_PRICES);

export const CROPS = [
  { key: "crop_wheat", seed: 10, seconds: 120 },
  { key: "crop_tomato", seed: 25, seconds: 300 },
  { key: "crop_pumpkin", seed: 60, seconds: 600 },
] as const;

export const RECIPES: { dish: string; needs: string[] }[] = [
  { dish: "dish_balik_ekmek", needs: ["fish_hamsi", "fish_hamsi", "crop_wheat"] },
  { dish: "dish_levrek_izgara", needs: ["fish_levrek", "crop_tomato"] },
  { dish: "dish_kabak_corbasi", needs: ["crop_pumpkin", "crop_pumpkin"] },
];

export const ROOM_ROCKS: Record<string, [number, number][]> = {
  maden: [[3, 3], [3, 8], [8, 3], [8, 8], [5, 5]],
};
export const MINE_REACH = 2.2;
export const MINE_COOLDOWN_MS = 2600;
export const REPORT_POS_MS = 2500;
export const FISH_COOLDOWN_MS = 2600;

/**
 * Parti Oyunu: 31x27'lik büyük salonda 6 sıra halinde kıvrılan, 60 numaralı kareden oluşan parkur.
 * Kareler arası bağlantı yolu karoları (OYUNIKA_ROUTE) vardır; oyuncular zar sonrası bu yoldan yürür.
 * Kare türleri: kırmızı (1 tur bekle), yeşil (ekstra zar), mor (±2-4 sürpriz),
 * mavi (Hız Kuşağı: +5 ileri), turuncu (Geri Sar: -6).
 */
export const PARTI_COLS = 31;
export const PARTI_ROWS = 27;
export const PARTI_CELL_COUNT = 60;
export const PARTI_PODIUM: { gx: number; gy: number }[] = [
  { gx: 9, gy: 25 },
  { gx: 7, gy: 25 },
  { gx: 11, gy: 25 },
];

const buildPartiRoute = (): { gx: number; gy: number }[] => {
  const route: { gx: number; gy: number }[] = [];
  const rowsY = [2, 6, 10, 14, 18, 22];
  const x0 = 2;
  const x1 = 28;
  rowsY.forEach((y, ri) => {
    if (ri % 2 === 0) for (let x = x0; x <= x1; x++) route.push({ gx: x, gy: y });
    else for (let x = x1; x >= x0; x--) route.push({ gx: x, gy: y });
    if (ri < rowsY.length - 1) for (let k = 1; k <= 3; k++) route.push({ gx: ri % 2 === 0 ? x1 : x0, gy: y + k });
  });
  return route;
};
export const OYUNIKA_ROUTE = buildPartiRoute();
const ROUTE_KEYS = new Set(OYUNIKA_ROUTE.map((t) => `${t.gx},${t.gy}`));
export const isPartiRoute = (gx: number, gy: number) => ROUTE_KEYS.has(`${gx},${gy}`);

const buildPartiTrack = (): OyunikaCell[] => {
  const L = OYUNIKA_ROUTE.length;
  const last = PARTI_CELL_COUNT - 1;
  const out: OyunikaCell[] = [];
  for (let i = 0; i < PARTI_CELL_COUNT; i++) {
    const route = i === last ? L - 1 : Math.round((i * (L - 1)) / last);
    let kind: OyunikaCellKind = "normal";
    if (i === 0) kind = "start";
    else if (i === last) kind = "finish";
    else if (i > 1 && i < last - 1) {
      if (i % 13 === 10) kind = "blue";
      else if (i % 17 === 14) kind = "orange";
      else if (i % 11 === 8) kind = "red";
      else if (i % 9 === 4) kind = "green";
      else if (i % 7 === 6) kind = "purple";
    }
    out.push({ index: i, gx: OYUNIKA_ROUTE[route].gx, gy: OYUNIKA_ROUTE[route].gy, kind, route });
  }
  return out;
};

export const OYUNIKA_TRACK: OyunikaCell[] = buildPartiTrack();

export const oyunikaCellAt = (gx: number, gy: number): OyunikaCell | undefined =>
  OYUNIKA_TRACK.find((c) => c.gx === gx && c.gy === gy);

const f = (id: string, type: FurniType, gx: number, gy: number, rot = 0): FurniItem => ({ id, type, gx, gy, rot, owner: null });

const PARTI_FURNI: FurniItem[] = (() => {
  const out: FurniItem[] = [];
  let n = 1;
  const kinds: FurniType[] = ["plant", "palm", "lamp", "bench", "plant", "palm"];
  [4, 8, 12, 16, 20].forEach((y, ri) => {
    for (let x = 5; x <= 25; x += 4) out.push(f(`pt${n++}`, kinds[(x / 4 + ri) % kinds.length | 0], x, y));
  });
  for (const x of [15, 19, 23, 27]) out.push(f(`pt${n++}`, x % 8 === 3 ? "lamp" : "plant", x, 26));
  for (const y of [8, 14, 20]) out.push(f(`pt${n++}`, "lamp", 0, y));
  out.push(f(`pt${n++}`, "palm", 29, 25), f(`pt${n++}`, "palm", 29, 0), f(`pt${n++}`, "lamp", 0, 0));
  return out;
})();

export const ROOMS: RoomDef[] = [
  {
    slug: "cadde-1",
    name: "Cadde 1 - Meydan Bulvarı",
    minRole: "user",
    cols: 34,
    rows: 22,
    theme: { floorA: "#d9ccb0", floorB: "#cdbf9f", wallLeft: "#c9785a", wallRight: "#e9d9b8", accent: "#38bdf8" },
    spawn: { gx: 16, gy: 10 },
    portals: [
      { gx: 28, gy: 0, to: "monako-kulup", label: "Monako Kulüp" },
      { gx: 16, gy: 21, to: "vip-cati-kati", label: "VIP Çatı" },
      { gx: 0, gy: 7, to: "iskele", label: "İskele" },
      { gx: 0, gy: 15, to: "sahil-kasabasi", label: "🌴 Sahil Kasabası" },
      { gx: 11, gy: 0, to: "avm", label: "🛍️ Sevalika AVM" },
      { gx: 6, gy: 21, to: "emlak-ofisi", label: "🏡 Emlak Ofisi" },
      { gx: 33, gy: 17, to: "kis-koyu", label: "❄️ Kış Köyü" },
      { gx: 20, gy: 0, to: "oyunika", label: "🎮 Oyunika" },
    ],
    defaultFurni: [
      f("c1", "table", 3, 1),
      f("c2", "chair", 2, 1),
      f("c3", "chair", 4, 1),
      f("c4", "table", 3, 3),
      f("c5", "chair", 2, 3),
      f("c6", "chair", 4, 3),
      f("c7", "table", 6, 1),
      f("c8", "chair", 5, 1),
      f("c9", "chair", 7, 1),
      f("c10", "table", 6, 3),
      f("c11", "chair", 5, 3),
      f("c12", "chair", 7, 3),
      f("c13", "plant", 1, 1),
      f("c14", "plant", 1, 5),
      f("c15", "plant", 8, 2),
      f("c16", "plant", 8, 4),
      f("c17", "bench", 4, 5, 1),
      f("c18", "bench", 6, 5, 1),
      f("c19", "lamp", 9, 3),
      f("c20", "lamp", 14, 3),
      f("c21", "flower_bed", 10, 4),
      f("c22", "stall_red", 9, 5),
      f("c23", "stall_blue", 12, 5),
      f("c24", "kiosk", 14, 2),
      f("c25", "plant", 15, 1),
      f("c26", "plant", 17, 1),
      f("c27", "bench", 15, 5, 1),
      f("c28", "bench", 17, 5, 1),
      f("c29", "billboard", 18, 2),
      f("c30", "counter", 20, 4),
      f("c31", "lamp", 19, 4),
      f("c32", "lamp", 21, 4),
      f("c33", "stall_red", 18, 5),
      f("c34", "stall_blue", 21, 5),
      f("c35", "bench", 23, 5, 1),
      f("c36", "bin", 24, 5),
      f("c37", "bench", 25, 5, 1),
      f("c38", "plant", 25, 1),
      f("c39", "lamp", 26, 3),
      f("c40", "food_truck", 27, 4),
      f("c41", "table", 31, 2),
      f("c42", "chair", 30, 2),
      f("c43", "chair", 32, 2),
      f("c44", "lamp", 31, 4),
      f("c45", "bin", 32, 5),
      f("c46", "plant", 33, 1),
      f("c47", "car_red", 4, 6),
      f("c48", "car_blue", 10, 9),
      f("c49", "car_yellow", 22, 6),
      f("c50", "car_red", 27, 9),
      f("c51", "car_blue", 31, 6),
      f("c52", "car_yellow", 1, 9),
      f("c53", "bus_stop", 6, 10),
      f("c54", "phone_booth", 25, 10),
      f("c55", "bench", 13, 10, 1),
      f("c56", "bench", 19, 10, 1),
      f("c57", "bench", 29, 10),
      f("c58", "lamp", 3, 10),
      f("c59", "lamp", 11, 10),
      f("c60", "lamp", 21, 10),
      f("c61", "lamp", 30, 10),
      f("c62", "bin", 28, 11),
      f("c63", "bin", 1, 11),
      f("c64", "kiosk", 32, 11),
      f("c65", "clock_tower", 16, 12),
      f("c66", "fountain_big", 15, 15),
      f("c67", "bench", 14, 14),
      f("c68", "bench", 18, 14),
      f("c69", "bench", 14, 19, 1),
      f("c70", "bench", 18, 19, 1),
      f("c71", "bench", 13, 15),
      f("c72", "bench", 19, 15),
      f("c73", "bench", 13, 17),
      f("c74", "bench", 19, 17),
      f("c75", "flower_bed", 11, 14),
      f("c76", "flower_bed", 21, 14),
      f("c77", "flower_bed", 11, 18),
      f("c78", "flower_bed", 21, 18),
      f("c79", "lamp", 10, 12),
      f("c80", "lamp", 23, 12),
      f("c81", "lamp", 10, 20),
      f("c82", "lamp", 23, 20),
      f("c83", "lamp", 12, 16),
      f("c84", "lamp", 20, 16),
      f("c85", "tree", 2, 14),
      f("c86", "tree", 7, 19),
      f("c87", "tree", 4, 17),
      f("c88", "bench", 5, 13),
      f("c89", "bench", 8, 16, 1),
      f("c90", "plant", 2, 12),
      f("c91", "plant", 8, 12),
      f("c92", "plant", 3, 20),
      f("c93", "flower_bed", 2, 16),
      f("c94", "campfire", 6, 15),
      f("c95", "logseat", 6, 14),
      f("c96", "logseat", 7, 15),
      f("c97", "logseat", 6, 16),
      f("c98", "table", 2, 19),
      f("c99", "chair", 1, 19),
      f("c100", "chair", 3, 19),
      f("c101", "tree", 28, 14),
      f("c102", "tree", 31, 19),
      f("c103", "tree", 29, 17),
      f("c104", "bench", 27, 13),
      f("c105", "bench", 25, 16, 1),
      f("c106", "plant", 25, 12),
      f("c107", "plant", 32, 12),
      f("c108", "plant", 32, 20),
      f("c109", "flower_bed", 29, 20),
      f("c110", "campfire", 28, 16),
      f("c111", "logseat", 28, 15),
      f("c112", "logseat", 27, 16),
      f("c113", "logseat", 28, 17),
      f("c114", "table", 31, 15),
      f("c115", "chair", 30, 15),
      f("c116", "chair", 32, 15),
    ],
  },
  {
    slug: "emlak-ofisi",
    name: "🏡 Emlak Ofisi",
    minRole: "user",
    cols: 16,
    rows: 12,
    theme: { floorA: "#e9dfcf", floorB: "#dccfba", wallLeft: "#a7d8d0", wallRight: "#8cc7be", accent: "#14b8a6" },
    spawn: { gx: 8, gy: 10 },
    portals: [{ gx: 8, gy: 11, to: "cadde-1", label: "Cadde 1'e Çık" }],
    defaultFurni: [
      f("em1", "counter", 6, 4),
      f("em2", "counter", 7, 4),
      f("em3", "counter", 8, 4),
      f("em4", "counter", 9, 4),
      f("em5", "counter", 10, 4),
      f("em6", "billboard", 7, 1),
      f("em7", "bookshelf", 1, 1),
      f("em8", "bookshelf", 2, 1),
      f("em9", "bookshelf", 13, 1),
      f("em10", "bookshelf", 14, 1),
      f("em11", "lamp", 5, 3),
      f("em12", "lamp", 11, 3),
      f("em13", "sofa", 2, 7),
      f("em14", "sofa", 3, 7),
      f("em15", "table", 2, 8),
      f("em16", "sofa", 12, 7),
      f("em17", "sofa", 13, 7),
      f("em18", "table", 13, 8),
      f("em19", "plant", 0, 2),
      f("em20", "plant", 15, 2),
      f("em21", "plant", 0, 10),
      f("em22", "plant", 15, 10),
      f("em23", "plant", 5, 8),
      f("em24", "plant", 10, 8),
      f("em25", "rug", 7, 8),
      f("em26", "rug", 8, 8),
      f("em27", "rug", 9, 8),
      f("em28", "rug", 7, 9),
      f("em29", "rug", 8, 9),
      f("em30", "rug", 9, 9),
    ],
  },
  {
    slug: "avm",
    name: "🛍️ Sevalika AVM",
    minRole: "user",
    cols: 28,
    rows: 20,
    theme: { floorA: "#f3efe8", floorB: "#e6e0d6", wallLeft: "#c4b5fd", wallRight: "#ddd6fe", accent: "#a855f7" },
    spawn: { gx: 13, gy: 17 },
    portals: [
      { gx: 13, gy: 19, to: "cadde-1", label: "Cadde 1'e Çık" },
      { gx: 27, gy: 10, to: "avm-kat2", label: "⬆️ 2. Kat" },
    ],
    defaultFurni: [
      f("av_s0", "store_fashion", 1, 0),
      f("av_s1", "store_tech", 6, 0),
      f("av_s2", "store_food", 11, 0),
      f("av_s3", "store_fashion", 16, 0),
      f("av_s4", "store_tech", 21, 0),
      f("av_p0", "plant", 0, 2),
      f("av_p1", "plant", 5, 2),
      f("av_p2", "plant", 10, 2),
      f("av_p3", "plant", 15, 2),
      f("av_p4", "plant", 20, 2),
      f("av_p5", "plant", 25, 2),
      f("av_p6", "plant", 27, 2),
      f("av_m1", "mannequin", 0, 3),
      f("av_m2", "mannequin", 5, 3),
      f("av_m3", "mannequin", 16, 3),
      f("av_m4", "mannequin", 21, 3),
      f("av_f1", "fountain", 13, 9),
      f("av_b0", "bench", 11, 8, 1),
      f("av_b1", "bench", 15, 8, 1),
      f("av_b2", "bench", 11, 11, 1),
      f("av_b3", "bench", 15, 11, 1),
      f("av_b4", "bench", 8, 5, 1),
      f("av_b5", "bench", 19, 5, 1),
      f("av_b6", "bench", 8, 14, 1),
      f("av_b7", "bench", 19, 14, 1),
      f("av_pl0", "plant", 7, 9),
      f("av_pl1", "plant", 20, 9),
      f("av_pl2", "plant", 9, 16),
      f("av_pl3", "plant", 18, 16),
      f("av_pl4", "plant", 7, 17),
      f("av_pl5", "plant", 20, 17),
      f("av_l0", "lamp", 6, 3),
      f("av_l1", "lamp", 22, 3),
      f("av_l2", "lamp", 10, 6),
      f("av_l3", "lamp", 17, 6),
      f("av_l4", "lamp", 3, 9),
      f("av_l5", "lamp", 24, 9),
      f("av_l6", "lamp", 3, 15),
      f("av_l7", "lamp", 24, 15),
      f("av_l8", "lamp", 12, 13),
      f("av_l9", "lamp", 14, 13),
      f("av_t1", "table", 24, 6),
      f("av_c1", "chair", 23, 6),
      f("av_c2", "chair", 25, 6),
      f("av_t2", "table", 3, 6),
      f("av_c3", "chair", 2, 6),
      f("av_c4", "chair", 4, 6),
    ],
  },
  {
    slug: "avm-kat2",
    name: "🛍️ AVM · 2. Kat",
    minRole: "user",
    cols: 26,
    rows: 18,
    theme: { floorA: "#f6efe4", floorB: "#e8dccb", wallLeft: "#f9a8d4", wallRight: "#fbcfe8", accent: "#ec4899" },
    spawn: { gx: 2, gy: 8 },
    portals: [{ gx: 0, gy: 8, to: "avm", label: "⬇️ Zemin Kat" }],
    defaultFurni: [
      f("k2_s0", "store_fashion", 1, 0),
      f("k2_s1", "store_tech", 6, 0),
      f("k2_s2", "store_food", 11, 0),
      f("k2_s3", "store_fashion", 16, 0),
      f("k2_s4", "store_food", 21, 0),
      f("k2_p0", "plant", 0, 2),
      f("k2_p1", "plant", 5, 2),
      f("k2_p2", "plant", 10, 2),
      f("k2_p3", "plant", 15, 2),
      f("k2_p4", "plant", 20, 2),
      f("k2_p5", "plant", 25, 2),
      f("k2_m1", "mannequin", 9, 3),
      f("k2_m2", "mannequin", 15, 3),
      f("k2_f1", "fountain", 12, 10),
      f("k2_b0", "bench", 10, 9),
      f("k2_b1", "bench", 14, 9),
      f("k2_b2", "bench", 10, 11, 1),
      f("k2_b3", "bench", 14, 11, 1),
      f("k2_b4", "bench", 7, 6, 1),
      f("k2_b5", "bench", 18, 6, 1),
      f("k2_b6", "bench", 7, 13, 1),
      f("k2_b7", "bench", 18, 13, 1),
      f("k2_pl0", "plant", 3, 7),
      f("k2_pl1", "plant", 22, 7),
      f("k2_pl2", "plant", 3, 14),
      f("k2_pl3", "plant", 22, 14),
      f("k2_pl4", "plant", 8, 16),
      f("k2_pl5", "plant", 17, 16),
      f("k2_l0", "lamp", 2, 3),
      f("k2_l1", "lamp", 7, 3),
      f("k2_l2", "lamp", 13, 3),
      f("k2_l3", "lamp", 18, 3),
      f("k2_l4", "lamp", 23, 3),
      f("k2_l5", "lamp", 5, 9),
      f("k2_l6", "lamp", 20, 9),
      f("k2_l7", "lamp", 5, 12),
      f("k2_l8", "lamp", 20, 12),
      f("k2_l9", "lamp", 12, 15),
      f("k2_l10", "lamp", 13, 15),
      f("k2_t1", "table", 23, 9),
      f("k2_c1", "chair", 22, 9),
      f("k2_c2", "chair", 24, 9),
      f("k2_t2", "table", 2, 10),
      f("k2_c3", "chair", 1, 10),
      f("k2_c4", "chair", 3, 10),
    ],
  },
  {
    slug: "kis-koyu",
    name: "❄️ Kış Köyü",
    minRole: "user",
    cols: 22,
    rows: 16,
    theme: { floorA: "#eef4fb", floorB: "#e2ecf7", wallLeft: "#7f95b8", wallRight: "#93a8c8", accent: "#7dd3fc" },
    spawn: { gx: 2, gy: 8 },
    portals: [{ gx: 0, gy: 8, to: "cadde-1", label: "Cadde 1" }],
    defaultFurni: [
      // Merkez: kamp ateşi ve çevresi
      f("kk1", "campfire", 6, 8),
      f("kk2", "logseat", 6, 7),
      f("kk3", "logseat", 5, 8),
      f("kk4", "logseat", 7, 8),
      f("kk5", "logseat", 6, 9),
      // Çam ağaçları (kuzey sırası ve köşeler)
      f("kk6", "tree", 1, 1),
      f("kk7", "tree", 4, 1),
      f("kk8", "tree", 8, 1),
      f("kk9", "tree", 12, 1),
      f("kk10", "tree", 16, 1),
      f("kk11", "tree", 20, 1),
      f("kk12", "tree", 1, 14),
      f("kk13", "tree", 20, 14),
      f("kk14", "tree", 9, 13),
      f("kk15", "tree", 3, 5),
      // Sıcak içecek köşesi
      f("kk16", "kiosk", 3, 11),
      f("kk17", "stall_red", 5, 12),
      f("kk18", "table", 8, 11),
      f("kk19", "chair", 7, 11),
      f("kk20", "chair", 9, 11),
      f("kk21", "table", 11, 10),
      f("kk22", "chair", 10, 10),
      f("kk23", "chair", 12, 10),
      // Buz pateni pisti kenarı: banklar ve lambalar
      f("kk24", "bench", 11, 3),
      f("kk25", "bench", 13, 3),
      f("kk26", "bench", 15, 3),
      f("kk27", "bench", 17, 3),
      f("kk28", "bench", 12, 12, 1),
      f("kk29", "bench", 14, 12, 1),
      f("kk30", "bench", 16, 12, 1),
      f("kk31", "lamp", 10, 4),
      f("kk32", "lamp", 19, 4),
      f("kk33", "lamp", 10, 11),
      f("kk34", "lamp", 19, 11),
      f("kk35", "streetlight", 2, 6),
      f("kk36", "streetlight", 2, 10),
      f("kk37", "streetlight", 9, 7),
      f("kk38", "streetlight", 9, 9),
      f("kk39", "bin", 20, 7),
      f("kk40", "bin", 4, 12),
      f("kk41", "plant", 20, 9),
      f("kk42", "plant", 18, 14),
      f("kk43", "fountain", 21, 8),
    ],
  },
  {
    slug: "sahil-kasabasi",
    name: "🌴 Sahil Kasabası",
    minRole: "user",
    cols: 20,
    rows: 16,
    theme: { floorA: "#f1dca6", floorB: "#e8d09a", wallLeft: "#6ec3d4", wallRight: "#8fd3e0", accent: "#f472b6" },
    spawn: { gx: 2, gy: 9 },
    portals: [{ gx: 0, gy: 9, to: "cadde-1", label: "Cadde 1" }],
    defaultFurni: [
      // Sol üst: Sahil Kafesi (4x3), tropikal bar, çiçeklik ve oturma alanı
      f("sk_cafe", "beach_cafe", 2, 0),
      f("sk_bar", "tiki_bar", 0, 3),
      f("sk_fl1", "flower_bed", 6, 0),
      f("sk4", "table", 7, 2),
      f("sk5", "chair", 6, 2),
      f("sk6", "chair", 8, 2),
      f("sk7", "umbrella", 7, 1),
      f("sk8", "palm", 0, 1),
      f("sk9", "palm", 0, 7),
      f("sk18", "bench", 6, 4),
      f("sk19", "streetlight", 8, 3),
      f("sk20", "streetlight", 1, 6),
      // Sol orta: şezlong sıraları (şemsiyeli)
      f("sk11", "lounger", 3, 6),
      f("sk12", "umbrella", 4, 6),
      f("sk13", "lounger", 5, 6),
      f("sk15", "lounger", 3, 9),
      f("sk17", "umbrella", 4, 9),
      f("sk16", "lounger", 5, 9),
      f("sk44", "lounger", 3, 11),
      f("sk45", "lounger", 5, 11),
      // Sol alt: kamp ateşi, kütükler, çiçeklik
      f("sk21", "campfire", 4, 14),
      f("sk22", "logseat", 3, 13),
      f("sk23", "logseat", 5, 13, 1),
      f("sk24", "logseat", 3, 15),
      f("sk25", "logseat", 5, 15, 1),
      f("sk26", "palm", 1, 12),
      f("sk27", "palm", 7, 12),
      f("sk_fl2", "flower_bed", 0, 15),
      // Sağ üst: DJ Kabini (3x2), dans pisti ve palmiyeler
      f("sk_dj", "dj_booth", 10, 0),
      f("sk29", "palm", 9, 1),
      f("sk30", "palm", 14, 1),
      f("sk46", "palm", 14, 4),
      f("sk47", "streetlight", 9, 4),
      f("sk48", "streetlight", 14, 3),
      // Orta: voleybol sahasının kuzeyinde sörf tahtası standı
      f("sk42", "surfboard", 8, 5),
      f("sk43", "surfboard", 9, 5),
      f("sk49", "surfboard", 11, 5),
      f("sk50", "streetlight", 12, 5),
      // Sağ: balıkçı kulübesi iskelenin yanında, sahil banklari
      f("sk_fish", "fish_hut", 13, 6),
      f("sk31", "bench", 15, 10),
      f("sk51", "bench", 15, 12),
      f("sk32", "streetlight", 14, 9),
      f("sk52", "bin", 14, 10),
      // Alt orta: yemek aracı ve dondurma büfesi
      f("sk40", "food_truck", 8, 13),
      f("sk41", "kiosk", 11, 10),
      f("sk53", "table", 7, 14),
      f("sk54", "plant", 6, 13),
      f("sk55", "bin", 11, 13),
      // Sağ alt: deniz kenarı romantik oturma alanı
      f("sk33", "beanbag", 12, 12),
      f("sk34", "beanbag", 14, 12, 1),
      f("sk35", "beanbag", 13, 13),
      f("sk36", "table", 13, 12),
      f("sk37", "palm", 15, 14),
      f("sk56", "plant", 11, 15),
    ],
  },
  {
    slug: "oyunika",
    name: "🎮 Oyunika",
    minRole: "user",
    cols: 18,
    rows: 12,
    theme: { floorA: "#3b2d7a", floorB: "#2e2262", wallLeft: "#7a5bd0", wallRight: "#6a4cc0", accent: "#f472b6" },
    spawn: { gx: 1, gy: 10 },
    portals: [{ gx: 0, gy: 10, to: "cadde-1", label: "Cadde 1'e Dön" }],
    defaultFurni: [
      f("oyk1", "rug", 4, 4), f("oyk2", "rug", 5, 4), f("oyk3", "rug", 6, 4),
      f("oyk4", "rug", 12, 4), f("oyk5", "rug", 13, 4), f("oyk6", "rug", 14, 4),
      f("oyk7", "tv", 2, 0), f("oyk8", "tv", 4, 0), f("oyk9", "tv", 6, 0),
      f("oyk10", "tv", 11, 0), f("oyk11", "tv", 13, 0), f("oyk12", "tv", 15, 0),
      f("oyk13", "lamp", 0, 0), f("oyk14", "lamp", 17, 0), f("oyk15", "lamp", 9, 0),
      f("oyk16", "plant", 2, 5), f("oyk17", "plant", 8, 5), f("oyk18", "plant", 10, 5), f("oyk19", "plant", 16, 5),
      f("oyk20", "bench", 5, 7), f("oyk21", "bench", 13, 7),
      f("oyk22", "sofa", 8, 8), f("oyk23", "sofa", 10, 8),
      f("oyk24", "table", 9, 8),
      f("oyk25", "palm", 17, 11), f("oyk26", "palm", 17, 7), f("oyk27", "lamp", 0, 6),
      f("oyk28", "plant", 3, 11), f("oyk29", "plant", 14, 11),
    ],
  },
  {
    slug: "parti-oyunu",
    name: "🎉 Parti Oyunu",
    minRole: "user",
    cols: PARTI_COLS,
    rows: PARTI_ROWS,
    theme: { floorA: "#5a47a8", floorB: "#503f9a", wallLeft: "#7a5bd0", wallRight: "#6a4cc0", accent: "#f472b6" },
    spawn: { gx: 2, gy: 2 },
    portals: [{ gx: 0, gy: 26, to: "oyunika", label: "Oyunika'ya Dön" }],
    defaultFurni: PARTI_FURNI,
  },
  {
    slug: "tetris-arena",
    name: "🧱 Blok Rüzgârı Arenası",
    minRole: "user",
    cols: 20,
    rows: 14,
    theme: { floorA: "#4c3a9c", floorB: "#43338f", wallLeft: "#6d28d9", wallRight: "#5b21b6", accent: "#22d3ee" },
    spawn: { gx: 2, gy: 11 },
    portals: [{ gx: 0, gy: 13, to: "oyunika", label: "Oyunika'ya Dön" }],
    defaultFurni: [
      f("tt1", "lamp", 0, 0), f("tt2", "lamp", 19, 0), f("tt3", "lamp", 19, 13), f("tt4", "lamp", 0, 6),
      f("tt5", "sofa", 5, 4), f("tt6", "sofa", 9, 4), f("tt7", "sofa", 13, 4),
      f("tt8", "table", 7, 8), f("tt9", "table", 12, 8),
      f("tt10", "plant", 3, 0), f("tt11", "plant", 8, 0), f("tt12", "plant", 12, 0), f("tt13", "plant", 16, 0),
      f("tt14", "palm", 17, 11), f("tt15", "palm", 17, 6), f("tt16", "plant", 3, 13), f("tt17", "plant", 10, 13), f("tt18", "plant", 15, 13),
      f("tt19", "bench", 5, 11), f("tt20", "bench", 9, 11),
    ],
  },
  {
    slug: "hain-avi",
    name: "🚀 Hain Avı",
    minRole: "user",
    cols: HAIN_COLS,
    rows: HAIN_ROWS,
    theme: { floorA: "#475569", floorB: "#3f4b5c", wallLeft: "#334155", wallRight: "#2b3648", accent: "#38bdf8" },
    spawn: HAIN_SPAWN,
    portals: [],
    defaultFurni: HAIN_FURNI,
  },
  {
    slug: "vip-cati-kati",
    name: "VIP Çatı Katı",
    minRole: "vip",
    cols: 18,
    rows: 14,
    theme: { floorA: "#ebe8f2", floorB: "#d9d4e6", wallLeft: "#8b6cc4", wallRight: "#7a5cb4", accent: "#c084fc" },
    spawn: { gx: 8, gy: 8 },
    portals: [{ gx: 17, gy: 7, to: "cadde-1", label: "Cadde 1" }],
    defaultFurni: [
      f("v1", "fountain", 9, 3),
      f("v2", "rug", 9, 7),
      f("v3", "rug", 10, 7),
      f("v4", "table", 9, 7),
      f("v5", "sofa", 7, 7),
      f("v6", "sofa", 12, 7, 1),
      f("v7", "palm", 2, 2),
      f("v8", "palm", 15, 2),
      f("v9", "palm", 2, 11),
      f("v10", "palm", 15, 11),
      f("v11", "lounger", 3, 7),
      f("v12", "lounger", 5, 7),
      f("v13", "lounger", 3, 11),
      f("v14", "lounger", 5, 11),
      f("v15", "umbrella", 4, 7),
      f("v16", "umbrella", 4, 11),
      f("v17", "tiki_bar", 13, 2),
      f("v18", "chair", 13, 4),
      f("v19", "chair", 14, 4),
      f("v20", "lamp", 6, 2),
      f("v21", "lamp", 11, 2),
      f("v22", "lamp", 8, 12),
      f("v23", "lamp", 12, 12),
      f("v24", "plant", 1, 6),
      f("v25", "plant", 1, 8),
      f("v26", "plant", 8, 5),
      f("v27", "plant", 10, 5),
      f("v28", "bench", 12, 11, 1),
      f("v29", "bench", 14, 11, 1),
      f("v30", "beanbag", 15, 7),
      f("v31", "beanbag", 15, 8),
    ],
  },
  {
    slug: "monako-kulup",
    name: "Monako Kulüp",
    minRole: "user",
    cols: 18,
    rows: 14,
    theme: { floorA: "#a63048", floorB: "#932a40", wallLeft: "#8a2438", wallRight: "#7a1f31", accent: "#fb7185" },
    spawn: { gx: 8, gy: 10 },
    portals: [{ gx: 8, gy: 13, to: "cadde-1", label: "Cadde 1" }],
    defaultFurni: [
      f("mk1", "casinotable", 5, 6),
      f("mk2", "casinotable", 11, 6),
      f("mk3", "casinotable", 5, 9),
      f("mk4", "casinotable", 11, 9),
      f("mk5", "rug", 5, 6),
      f("mk6", "rug", 11, 6),
      f("mk7", "rug", 5, 9),
      f("mk8", "rug", 11, 9),
      f("mk9", "rug", 8, 12),
      f("mk10", "rug", 8, 11),
      f("mk11", "rug", 8, 10),
      f("mk20", "tv", 14, 1),
      f("mk22", "sofa", 13, 3),
      f("mk23", "sofa", 15, 3, 1),
      f("mk24", "table", 14, 3),
      f("mk25", "sofa", 13, 12),
      f("mk26", "sofa", 15, 12, 1),
      f("mk27", "table", 14, 12),
      f("mk28", "plant", 1, 1),
      f("mk29", "plant", 16, 1),
      f("mk30", "plant", 1, 12),
      f("mk31", "plant", 16, 12),
      f("mk32", "plant", 4, 12),
      f("mk33", "plant", 12, 12),
      f("mk34", "lamp", 5, 2),
      f("mk35", "lamp", 12, 2),
      f("mk36", "lamp", 3, 8),
      f("mk37", "lamp", 13, 8),
      f("mon1", "casino_bar", 6, 0),
      f("mon2", "bookshelf", 3, 0),
      f("mon3", "bookshelf", 12, 0),
      f("mon4", "sofa", 1, 4),
      f("mon5", "sofa", 1, 7),
      f("mon6", "table", 2, 6),
    ],
  },
  {
    slug: "iskele",
    name: "Sahil İskelesi",
    minRole: "user",
    cols: 15,
    rows: 15,
    theme: { floorA: "#c98c52", floorB: "#b97d45", wallLeft: "#79c2e0", wallRight: "#a5d8ee", accent: "#38bdf8" },
    spawn: { gx: 5, gy: 7 },
    portals: [
      { gx: 0, gy: 7, to: "cadde-1", label: "Cadde 1" },
      { gx: 6, gy: 14, to: "restoran", label: "Restoran" },
    ],
    defaultFurni: [
      f("is1", "palm", 1, 2),
      f("is2", "palm", 1, 12),
      f("is3", "lounger", 2, 4),
      f("is4", "lounger", 2, 6),
      f("is5", "bench", 4, 11),
      f("is6", "streetlight", 7, 1),
      f("is7", "streetlight", 7, 6),
      f("is8", "streetlight", 7, 12),
      f("is9", "kiosk", 3, 1),
      f("is10", "bin", 5, 2),
      f("isz1", "fish_hut", 3, 12),
    ],
  },
  {
    slug: "restoran",
    name: "Sahil Restoranı",
    minRole: "user",
    cols: 16,
    rows: 14,
    theme: { floorA: "#f3dfbb", floorB: "#e6cb9a", wallLeft: "#e49a5e", wallRight: "#eeae72", accent: "#fb923c" },
    spawn: { gx: 7, gy: 7 },
    portals: [
      { gx: 7, gy: 0, to: "iskele", label: "İskele" },
      { gx: 15, gy: 7, to: "ciftlik", label: "Çiftlik" },
    ],
    defaultFurni: [
      f("rs7", "table", 9, 4),
      f("rs8", "chair", 8, 4),
      f("rs9", "chair", 10, 4, 1),
      f("rs10", "table", 12, 4),
      f("rs11", "chair", 11, 4),
      f("rs12", "chair", 13, 4, 1),
      f("rs13", "table", 9, 7),
      f("rs14", "chair", 8, 7),
      f("rs15", "chair", 10, 7, 1),
      f("rs16", "table", 12, 9),
      f("rs17", "chair", 11, 9),
      f("rs18", "chair", 13, 9, 1),
      f("rs19", "table", 9, 10),
      f("rs20", "chair", 8, 10),
      f("rs21", "chair", 10, 10, 1),
      f("rs22", "table", 12, 12),
      f("rs23", "chair", 11, 12),
      f("rs24", "chair", 13, 12, 1),
      f("rs25", "rug", 9, 4),
      f("rs26", "rug", 12, 4),
      f("rs27", "rug", 9, 7),
      f("rs28", "rug", 12, 9),
      f("rs29", "rug", 9, 10),
      f("rs30", "rug", 12, 12),
      f("rs31", "sofa", 2, 9),
      f("rs32", "sofa", 2, 11),
      f("rs33", "table", 3, 10),
      f("rs35", "plant", 14, 1),
      f("rs36", "plant", 1, 12),
      f("rs37", "plant", 14, 12),
      f("rs38", "plant", 1, 5),
      f("rs39", "plant", 6, 12),
      f("rs40", "lamp", 13, 6),
      f("rs41", "lamp", 6, 6),
      f("rs42", "lamp", 6, 10),
      f("rs43", "bookshelf", 1, 6),
      f("rs44", "bookshelf", 1, 7),
      f("rs45", "tv", 12, 0),
      f("rs46", "tv", 9, 0),
      f("ren1", "kitchen_block", 1, 0),
    ],
  },
  {
    slug: "ciftlik",
    name: "Sevalika Çiftliği",
    minRole: "user",
    cols: 16,
    rows: 14,
    theme: { floorA: "#72bf4e", floorB: "#68b246", wallLeft: "#b9533a", wallRight: "#c8624a", accent: "#a3e635" },
    spawn: { gx: 6, gy: 6 },
    portals: [
      { gx: 0, gy: 6, to: "restoran", label: "Restoran" },
      { gx: 8, gy: 13, to: "maden", label: "Maden" },
    ],
    defaultFurni: [
      f("cf1", "tree", 2, 2),
      f("cf2", "tree", 13, 12),
      f("cf4", "tree", 14, 9),
      f("cf7", "bench", 5, 2),
      f("cf8", "bench", 7, 11, 1),
      f("cf9", "kiosk", 6, 1),
      f("cf11", "streetlight", 11, 9),
      f("cf12", "streetlight", 4, 3),
      f("cf13", "streetlight", 11, 3),
      f("cf14", "plant", 8, 1),
      f("cf15", "plant", 11, 1),
      f("cf17", "plant", 12, 8),
      f("cf18", "plant", 9, 12),
      f("cf20", "campfire", 13, 7),
      f("cf21", "logseat", 12, 7),
      f("cf22", "logseat", 14, 7, 1),
      f("cf23", "bin", 10, 9),
      f("cf24", "lamp", 3, 5),
      f("cin1", "barn", 1, 8),
    ],
  },
  {
    slug: "maden",
    name: "Taş Ocağı Madeni",
    minRole: "user",
    cols: 15,
    rows: 14,
    theme: { floorA: "#a0958a", floorB: "#92877c", wallLeft: "#756759", wallRight: "#85766a", accent: "#fbbf24" },
    spawn: { gx: 6, gy: 2 },
    portals: [{ gx: 6, gy: 0, to: "ciftlik", label: "Çiftlik" }],
    defaultFurni: [
      f("md1", "streetlight", 2, 2),
      f("md2", "streetlight", 13, 4),
      f("md3", "streetlight", 2, 10),
      f("md4", "streetlight", 11, 10),
      f("md5", "bench", 9, 5),
      f("md6", "bin", 8, 2),
      f("md7", "campfire", 6, 11),
      f("md8", "logseat", 5, 11),
      f("md9", "logseat", 7, 11, 1),
      f("maz1", "mine_entrance", 9, 0),
      f("maz2", "ore_cart", 7, 10),
    ],
  },
];

export const ROOM_NPCS: Record<string, { kind: NpcKind; name: string; gx: number; gy: number; shirt: string; hair: string; skin: string }[]> = {
  "avm-kat2": [
    { kind: "barber", name: "Kuaför Selin", gx: 4, gy: 4, shirt: "#0ea5e9", hair: "#be185d", skin: "#fdba74" },
    { kind: "accessory", name: "Aksesuarcı Mina", gx: 21, gy: 4, shirt: "#f472b6", hair: "#1f2937", skin: "#fed7aa" },
  ],
  avm: [
    { kind: "stylist", name: "Stilist Defne", gx: 3, gy: 4, shirt: "#a855f7", hair: "#78350f", skin: "#fdba74" },
    { kind: "costume", name: "Kostüm Evi Lale", gx: 13, gy: 4, shirt: "#f43f5e", hair: "#7c2d12", skin: "#fed7aa" },
    { kind: "furnisher", name: "Mobilyacı Kerem", gx: 24, gy: 4, shirt: "#f97316", hair: "#292524", skin: "#d99a6c" },
  ],
  "cadde-1": [
    { kind: "guide", name: "Rehber Yağmur", gx: 18, gy: 11, shirt: "#facc15", hair: "#0f172a", skin: "#fed7aa" },
  ],
  oyunika: [
    { kind: "lara", name: "Parti Lara", gx: 5, gy: 3, shirt: "#ec4899", hair: "#7c2d12", skin: "#fed7aa" },
    { kind: "demir", name: "Komutan Demir", gx: 13, gy: 3, shirt: "#0ea5e9", hair: "#0f172a", skin: "#d99a6c" },
    { kind: "ali", name: "Oyuncu Ali", gx: 9, gy: 3, shirt: "#7c3aed", hair: "#1c1917", skin: "#e0ac85" },
  ],
  "emlak-ofisi": [{ kind: "realtor", name: "Emlakçı Orhan", gx: 8, gy: 3, shirt: "#0f766e", hair: "#475569", skin: "#fdba74" }],
  iskele: [{ kind: "fisher", name: "Balıkçı Hasan", gx: 7, gy: 3, shirt: "#0e7490", hair: "#e2e8f0", skin: "#d99a6c" }],
  restoran: [{ kind: "chef", name: "Şef Kemal", gx: 3, gy: 3, shirt: "#f8fafc", hair: "#1e293b", skin: "#fdba74" }],
  ciftlik: [{ kind: "farmer", name: "Çiftçi Ayşe", gx: 3, gy: 4, shirt: "#65a30d", hair: "#92400e", skin: "#fdba74" }],
  maden: [{ kind: "miner", name: "Madenci Recep", gx: 6, gy: 4, shirt: "#a16207", hair: "#1e293b", skin: "#d99a6c" }],
  "monako-kulup": [{ kind: "dealer", name: "Krupiye Selim", gx: 8, gy: 8, shirt: "#111827", hair: "#0f172a", skin: "#fed7aa" }],
};

export const isWaterTile = (slug: string, gx: number, gy = 0) => {
  if (slug === "iskele") return gx >= 9;
  if (slug === "sahil-kasabasi") {
    if (gx < 16) return false;
    if ((gy === 5 || gy === 8) && gx <= 18) return false;
    return true;
  }
  return false;
};

export const ROOM_BY_SLUG = Object.fromEntries(ROOMS.map((r) => [r.slug, r])) as Record<string, RoomDef>;

export const homeSlug = (username: string) => `home-${username.toLowerCase()}`;
export const isHomeSlug = (slug: string) => slug.startsWith("home-");

/* Evlerin boyutu (kenar) — sunucudan okunur, resolveRoom bunu kullanır. Varsayılan: eski evler 12x12 */
const homeSizes = new Map<string, number>();
export const registerHomeSize = (slug: string, n: number) => {
  homeSizes.set(slug, n);
};
export const getHomeSize = (slug: string) => homeSizes.get(slug) ?? 12;

export function resolveRoom(slug: string): RoomDef | undefined {
  const fixed = ROOM_BY_SLUG[slug];
  if (fixed) return fixed;
  if (!isHomeSlug(slug)) return undefined;
  const n = getHomeSize(slug);
  const m = Math.floor(n / 2);
  return {
    slug,
    name: `🏠 ${slug.slice(5)} odası`,
    minRole: "user",
    cols: n,
    rows: n,
    theme: { floorA: "#dfae6e", floorB: "#d2a05f", wallLeft: "#f2c7d6", wallRight: "#e8b9ca", accent: "#f59e0b" },
    spawn: { gx: m, gy: Math.min(n - 1, m + 1) },
    portals: [{ gx: n - 1, gy: m, to: "cadde-1", label: "Cadde 1" }],
    defaultFurni: [],
  };
}

/* Emlak: satılık ev boyutları (sunucudaki home_price ile aynı). 14 ve 16 sadece genişletmeyle. */
export interface HomeTier { size: number; name: string; icon: string; price: number; desc: string }
export const HOME_TIERS: HomeTier[] = [
  { size: 4, name: "Mini Stüdyo", icon: "🏠", price: 500, desc: "4x4 · tek kişilik sevimli köşe" },
  { size: 6, name: "Daire", icon: "🏢", price: 1200, desc: "6x6 · rahat bir oturma odası" },
  { size: 8, name: "Dubleks", icon: "🏘️", price: 2500, desc: "8x8 · arkadaşlarla parti" },
  { size: 10, name: "Villa", icon: "🏡", price: 4500, desc: "10x10 · geniş salon ve bahçe hissi" },
  { size: 12, name: "Malikane", icon: "🏰", price: 7000, desc: "12x12 · gerçek bir saray" },
  { size: 14, name: "Konak", icon: "🕌", price: 10000, desc: "14x14 · sadece genişletmeyle" },
  { size: 16, name: "Saray", icon: "👑", price: 14000, desc: "16x16 · sadece genişletmeyle" },
];
export const HOME_SALE_SIZES = [4, 6, 8, 10, 12];
export const homePrice = (size: number) => HOME_TIERS.find((t) => t.size === size)?.price ?? 0;
/** Genişletme bedeli: fiyat farkı + %10 tadilat */
export const homeExpandPrice = (from: number, to: number) => Math.floor((homePrice(to) - homePrice(from)) * 1.1);

export const GUIDE_TOPICS: { icon: string; title: string; text: string }[] = [
  { icon: "🖱️", title: "Hareket", text: "Yere tıkla, karakterin yürür. Bir oyuncuya tıklarsan profil kartını görürsün. Alt çubuktan yazı yazıp sohbet edebilirsin (/yardim ile komutlar)." },
  { icon: "🚪", title: "Odalar arası geçiş", text: "Yerdeki ok işaretleri kapıdır. Üzerine gelince yerin adı çıkar, tıklayıp üstüne basınca o odaya geçersin. Üstteki harita menüsü de var." },
  { icon: "🪙", title: "Sanil kazanmak", text: "Günlük ödülünü al, görevleri yap, İskele'de balık tut, Madende cevher çıkar, Çiftlikte ek, mini oyunlara katıl. Bilgi yarışmalarını kaçırma!" },
  { icon: "🏡", title: "Ev sahibi olmak", text: "Kimse evle başlamaz. Cadde 1'deki alt kapıdan Emlak Ofisi'ne gir, Emlakçı Orhan'dan bütçene uygun bir ev al. Sonradan düzenleme modundan evini genişletebilirsin." },
  { icon: "👗", title: "Kıyafet & stil", text: "AVM'de Stilist, Kuaför, Aksesuarcı ve Kostüm Evi var. Aldıklarını Gardırop'tan takarsın, istersen Pazar'da başkalarına satarsın." },
  { icon: "🛋️", title: "Eşya ve dekor", text: "Mobilyacı Kerem'den eşya paketleri al, evinde Düzenle moduyla yerleştir. Duvar ve zemin rengini Arkadaşlar panelindeki Oda Dekoru'ndan değiştirebilirsin." },
  { icon: "🎲", title: "Eğlence", text: "Arena Görevlisi Mert ile Oyunika kutu parkuruna gir, Monako Kulüp'te zar ve blackjack oyna, Lonca kurup arkadaşlarınla yarış." },
  { icon: "🤝", title: "Kurallar", text: "Saygılı ol, spam yapma. Sorun yaşarsan oyuncuya tıklayıp şikayet et. Moderatörler odaları izler." },
];

export interface HomeStyleDef { id: string; name: string; price: number; a: string; b: string; kind?: string }
export const HOME_WALLS: HomeStyleDef[] = [
  { id: "w_pink", name: "Pembe", price: 0, a: "#f2c7d6", b: "#e8b9ca" },
  { id: "w_blue", name: "Gök Mavisi", price: 60, a: "#bcd8f2", b: "#a9c9e8" },
  { id: "w_green", name: "Nane Yeşili", price: 60, a: "#bfe6c9", b: "#a9d8b5" },
  { id: "w_cream", name: "Krem", price: 80, a: "#f3e7c9", b: "#e6d7b0" },
  { id: "w_dark", name: "Gece Mavisi", price: 120, a: "#3b4a6b", b: "#2f3d5a" },
  { id: "w_brick", name: "Tuğla", price: 150, a: "#b5654a", b: "#a2563d" },
  { id: "w_neon", name: "Neon Mor", price: 250, a: "#7c3aed", b: "#6d28d9" },
];
export const HOME_FLOORS: HomeStyleDef[] = [
  { id: "f_wood", name: "Ahşap", price: 0, a: "#dfae6e", b: "#d2a05f", kind: "wood" },
  { id: "f_sand", name: "Kum", price: 80, a: "#efe0b8", b: "#e5d3a4", kind: "sand" },
  { id: "f_marble", name: "Mermer", price: 100, a: "#f1efe9", b: "#dedad0", kind: "marble" },
  { id: "f_checker", name: "Dama", price: 100, a: "#f8fafc", b: "#334155", kind: "plain" },
  { id: "f_red", name: "Kırmızı Halı", price: 120, a: "#b91c1c", b: "#a11818", kind: "carpet" },
  { id: "f_dark", name: "Koyu Parke", price: 120, a: "#5a4030", b: "#4d3527", kind: "wood" },
  { id: "f_grass", name: "Çimen", price: 140, a: "#7cc65a", b: "#6db84d", kind: "grass" },
];
export function applyHomeStyle(theme: RoomTheme, wall?: string | null, floor?: string | null): RoomTheme {
  const w = HOME_WALLS.find((x) => x.id === wall) ?? HOME_WALLS[0];
  const f = HOME_FLOORS.find((x) => x.id === floor) ?? HOME_FLOORS[0];
  return { ...theme, wallLeft: w.a, wallRight: w.b, floorA: f.a, floorB: f.b, floorKind: f.kind };
}

export type CosmeticSlot = "hat" | "glasses" | "top" | "back" | "hair" | "pet";

export interface CosmeticDef {
  id: string;
  slot: CosmeticSlot;
  name: string;
  icon: string;
  price: number;
}

export const COSMETICS: CosmeticDef[] = [
  { id: "hat_beanie", slot: "hat", name: "Bere", icon: "🧶", price: 100 },
  { id: "hat_cap", slot: "hat", name: "Şapka (Kep)", icon: "🧢", price: 120 },
  { id: "hat_cowboy", slot: "hat", name: "Kovboy Şapkası", icon: "🤠", price: 250 },
  { id: "hat_tophat", slot: "hat", name: "Silindir Şapka", icon: "🎩", price: 300 },
  { id: "hat_crown", slot: "hat", name: "Altın Taç", icon: "👑", price: 600 },
  { id: "hat_headphones", slot: "hat", name: "DJ Kulaklığı", icon: "🎧", price: 180 },
  { id: "gl_nerd", slot: "glasses", name: "Okuma Gözlüğü", icon: "🤓", price: 80 },
  { id: "gl_shades", slot: "glasses", name: "Güneş Gözlüğü", icon: "🕶️", price: 90 },
  { id: "gl_neon", slot: "glasses", name: "Neon Gözlük", icon: "🥽", price: 200 },
  { id: "gl_star", slot: "glasses", name: "Yıldız Gözlük", icon: "🤩", price: 160 },
  { id: "hat_beret", slot: "hat", name: "Fransız Bere", icon: "🎨", price: 140 },
  { id: "hat_bucket", slot: "hat", name: "Balıkçı Şapkası", icon: "🪣", price: 130 },
  { id: "hat_wizard", slot: "hat", name: "Büyücü Şapkası", icon: "🧙", price: 350 },
  { id: "hat_pirate", slot: "hat", name: "Korsan Şapkası", icon: "🏴‍☠️", price: 320 },
  { id: "hat_flower", slot: "hat", name: "Çiçek Tacı", icon: "🌸", price: 160 },
  { id: "hat_catears", slot: "hat", name: "Kedi Kulağı", icon: "😺", price: 200 },
  { id: "gl_round", slot: "glasses", name: "Yuvarlak Gözlük", icon: "👓", price: 110 },
  { id: "gl_heart", slot: "glasses", name: "Kalpli Gözlük", icon: "😍", price: 170 },
  { id: "gl_visor", slot: "glasses", name: "Siber Vizör", icon: "🤖", price: 240 },
  { id: "tp_hoodie", slot: "top", name: "Kapüşonlu", icon: "🧥", price: 180 },
  { id: "tp_stripe", slot: "top", name: "Çizgili Tişört", icon: "👕", price: 140 },
  { id: "tp_suit", slot: "top", name: "Takım Elbise", icon: "🤵", price: 400 },
  { id: "tp_jersey", slot: "top", name: "Forma", icon: "⚽", price: 220 },
  { id: "tp_overalls", slot: "top", name: "Salopet", icon: "👖", price: 200 },
  { id: "tp_hawaii", slot: "top", name: "Hawai Gömleği", icon: "🌺", price: 160 },
  { id: "bk_backpack", slot: "back", name: "Sırt Çantası", icon: "🎒", price: 150 },
  { id: "bk_cape", slot: "back", name: "Süper Kahraman Pelerini", icon: "🦸", price: 260 },
  { id: "bk_angel", slot: "back", name: "Melek Kanatları", icon: "😇", price: 500 },
  { id: "bk_butterfly", slot: "back", name: "Kelebek Kanatları", icon: "🦋", price: 450 },
  { id: "bk_devil", slot: "back", name: "Şeytan Kanatları", icon: "😈", price: 480 },
  { id: "hs_mohawk", slot: "hair", name: "Mohawk", icon: "🦔", price: 160 },
  { id: "hs_pony", slot: "hair", name: "At Kuyruğu", icon: "🐴", price: 130 },
  { id: "hs_curly", slot: "hair", name: "Kıvırcık", icon: "🌀", price: 140 },
  { id: "pet_cat", slot: "pet", name: "Kedi Pamuk", icon: "🐱", price: 250 },
  { id: "pet_dog", slot: "pet", name: "Köpek Karabaş", icon: "🐶", price: 250 },
  { id: "pet_duck", slot: "pet", name: "Ördek", icon: "🦆", price: 150 },
  { id: "pet_fox", slot: "pet", name: "Tilki", icon: "🦊", price: 400 },
  { id: "hs_short", slot: "hair", name: "Kısa Saç", icon: "💇", price: 0 },
  { id: "hs_long", slot: "hair", name: "Uzun Saç", icon: "💁", price: 100 },
  { id: "hs_spiky", slot: "hair", name: "Dikenli Saç", icon: "⚡", price: 100 },
  { id: "hs_bun", slot: "hair", name: "Topuz", icon: "🎀", price: 120 },
  { id: "hs_afro", slot: "hair", name: "Afro", icon: "🌀", price: 150 },
];

export const COSMETIC_BY_ID = Object.fromEntries(COSMETICS.map((c) => [c.id, c])) as Record<string, CosmeticDef>;

export const EMOTES = ["👋", "❤️", "😂", "👏", "😮", "😎"];

export const SHIRT_COLORS = ["#09090b", "#2563eb", "#e11d48", "#16a34a", "#facc15", "#ffffff", "#9333ea", "#f97316"];
export const HAIR_COLORS = ["#09090b", "#1e293b", "#78350f", "#b45309", "#facc15", "#e11d48", "#38bdf8", "#e2e8f0"];
export const SKIN_COLORS = ["#fed7aa", "#fdba74", "#d99a6c", "#a16207", "#7c4a2d", "#5b3a29"];

export const levelOf = (xp: number) => Math.floor(Math.sqrt(Math.max(0, xp) / 50)) + 1;
export const xpFloor = (level: number) => 50 * (level - 1) * (level - 1);

export const QUEST_LABELS: Record<string, { icon: string; text: string }> = {
  fish_5: { icon: "🎣", text: "5 balık tut" },
  sell_1: { icon: "💰", text: "Şef Kemal'e balık sat" },
  chat_5: { icon: "💬", text: "5 mesaj yaz" },
  gift_1: { icon: "🎁", text: "Bir oyuncuya hediye gönder" },
  room_3: { icon: "🚪", text: "3 kez oda değiştir" },
};

export const ACHIEVEMENTS: Record<string, { icon: string; name: string; desc: string }> = {
  first_fish: { icon: "🎣", name: "İlk Av", desc: "İlk balığını tuttun" },
  fish_50: { icon: "🐟", name: "Usta Balıkçı", desc: "Toplam 50 balık tuttun" },
  shark: { icon: "🦈", name: "Köpekbalığı Avcısı", desc: "Bir köpekbalığı yakaladın" },
  treasure: { icon: "💎", name: "Hazine Avcısı", desc: "Batık hazine buldun" },
  lvl_5: { icon: "⭐", name: "Seviye 5", desc: "5. seviyeye ulaştın" },
  lvl_10: { icon: "🌟", name: "Seviye 10", desc: "10. seviyeye ulaştın" },
  first_trade: { icon: "🤝", name: "İlk Takas", desc: "Pazarda ilk alışveriş" },
  tournament_win: { icon: "🏆", name: "Turnuva Şampiyonu", desc: "Balık turnuvasını kazandın" },
  quiz_win: { icon: "🧠", name: "Bilge", desc: "Bilgi yarışmasını kazandın" },
  gem: { icon: "💚", name: "Zümrüt Avcısı", desc: "Madende zümrüt buldun" },
  harvest: { icon: "🌾", name: "Çiftçi", desc: "İlk ekinini topladın" },
  cook: { icon: "👨‍🍳", name: "Aşçı", desc: "İlk yemeğini pişirdin" },
  guild: { icon: "🛡️", name: "Loncalı", desc: "Bir loncaya katıldın" },
  flag_win: { icon: "🚩", name: "Bayrak Kapan", desc: "Bayrak kapma oyununu kazandın" },
};

/* AVM paket dükkanları (sunucudaki _bundle_items ile aynı olmalı; fiyat %20 indirimli) */
export interface BundleDef { id: string; name: string; icon: string; desc: string; items: string[] }
export const FURNI_BUNDLES: BundleDef[] = [
  { id: "fp_salon", name: "Salon Seti", icon: "🛋️", desc: "2 koltuk, sehpa, lamba, saksı", items: ["sofa", "sofa", "table", "lamp", "plant"] },
  { id: "fp_garden", name: "Bahçe Seti", icon: "🌳", desc: "Ağaç, 2 bank, çiçeklik, sokak lambası", items: ["tree", "bench", "bench", "flower_bed", "streetlight"] },
  { id: "fp_beach", name: "Sahil Seti", icon: "🏖️", desc: "2 şezlong, şemsiye, sörf tahtası, palmiye", items: ["lounger", "lounger", "umbrella", "surfboard", "palm"] },
  { id: "fp_cafe", name: "Kafe Seti", icon: "☕", desc: "Tezgah, masa, 4 sandalye, saksı", items: ["table", "chair", "chair", "chair", "chair", "counter", "plant"] },
  { id: "fp_street", name: "Sokak Seti", icon: "🚗", desc: "2 sokak lambası, çöp kutusu, bank, kırmızı araba", items: ["streetlight", "streetlight", "bin", "bench", "car_red"] },
];
export const OUTFIT_BUNDLES: BundleDef[] = [
  { id: "os_football", name: "Futbolcu Kombini", icon: "⚽", desc: "Forma, kep, güneş gözlüğü", items: ["tp_jersey", "hat_cap", "gl_shades"] },
  { id: "os_hero", name: "Süper Kahraman", icon: "🦸", desc: "Pelerin, çizgili tişört, güneş gözlüğü", items: ["bk_cape", "tp_stripe", "gl_shades"] },
  { id: "os_angel", name: "Kraliyet Melek", icon: "😇", desc: "Melek kanatları, altın taç", items: ["bk_angel", "hat_crown"] },
  { id: "os_summer", name: "Yaz Tatili", icon: "🌺", desc: "Hawai gömleği, güneş gözlüğü, kovboy şapkası", items: ["tp_hawaii", "gl_shades", "hat_cowboy"] },
  { id: "os_gentle", name: "Centilmen", icon: "🤵", desc: "Takım elbise, silindir şapka, okuma gözlüğü", items: ["tp_suit", "hat_tophat", "gl_nerd"] },
  { id: "os_rocker", name: "Rockçı", icon: "🤘", desc: "Kapüşonlu, mohawk saç, güneş gözlüğü, şeytan kanatları", items: ["tp_hoodie", "hs_mohawk", "gl_shades", "bk_devil"] },
];
export const BUNDLE_BY_ID = Object.fromEntries([...FURNI_BUNDLES, ...OUTFIT_BUNDLES].map((b) => [b.id, b])) as Record<string, BundleDef>;

/* ---------------- Rozetler ---------------- */
export type BadgeKind = "tier" | "shop" | "special";
export interface BadgeDef {
  key: string;
  icon: string;
  name: string;
  desc: string;
  kind: BadgeKind;
  /** kademeli rozet: 1., 2., 3. yıldız için gereken sayılar (sunucudaki _badge_tiers ile aynı) */
  thresholds?: number[];
  unit?: string;
  price?: number;
}
/** Yıldız başına Sanil ödülü (sunucudaki _badge_reward ile aynı) */
export const BADGE_REWARDS = [50, 250, 1000];
export const BADGES: BadgeDef[] = [
  { key: "fish", icon: "🎣", name: "Balıkçı", desc: "İskele'de balık tut", kind: "tier", thresholds: [1, 100, 1000], unit: "balık" },
  { key: "ore", icon: "⛏️", name: "Madenci", desc: "Madende cevher çıkar", kind: "tier", thresholds: [1, 100, 1000], unit: "cevher" },
  { key: "harvest", icon: "🌾", name: "Çiftçi", desc: "Çiftlikte ürün hasat et", kind: "tier", thresholds: [1, 100, 1000], unit: "hasat" },
  { key: "cook", icon: "🍳", name: "Aşçı", desc: "Yemek pişir", kind: "tier", thresholds: [1, 50, 500], unit: "yemek" },
  { key: "trade", icon: "🤝", name: "Tüccar", desc: "Pazar'da alım-satım yap", kind: "tier", thresholds: [1, 25, 250], unit: "işlem" },
  { key: "shop", icon: "🛍️", name: "Alışverişkolik", desc: "AVM'den alışveriş yap", kind: "tier", thresholds: [1, 20, 200], unit: "alışveriş" },
  { key: "quiz", icon: "🧠", name: "Bilge", desc: "Bilgi yarışması kazan", kind: "tier", thresholds: [1, 10, 100], unit: "yarışma" },
  { key: "win", icon: "🏆", name: "Şampiyon", desc: "Bayrak oyunu ve turnuva kazan", kind: "tier", thresholds: [1, 10, 100], unit: "zafer" },
  { key: "friend", icon: "👥", name: "Sosyal Kelebek", desc: "Arkadaş edin", kind: "tier", thresholds: [1, 10, 50], unit: "arkadaş" },
  { key: "like", icon: "❤️", name: "Gönül Fatihi", desc: "Başkalarının evlerini beğen", kind: "tier", thresholds: [1, 25, 250], unit: "beğeni" },
  { key: "event", icon: "🎉", name: "Şenlik Ruhu", desc: "Etkinlik ödüllerini topla", kind: "tier", thresholds: [1, 5, 20], unit: "etkinlik" },
  { key: "login", icon: "📅", name: "Sadık Oyuncu", desc: "Günlük ödülünü al", kind: "tier", thresholds: [1, 30, 100], unit: "gün" },
  { key: "b_spring", icon: "🌸", name: "İlkbahar", desc: "Çiçek açan mevsim rozeti", kind: "shop", price: 300 },
  { key: "b_summer", icon: "☀️", name: "Yaz", desc: "Güneşli yaz rozeti", kind: "shop", price: 300 },
  { key: "b_autumn", icon: "🍂", name: "Sonbahar", desc: "Kuru yaprak sonbahar rozeti", kind: "shop", price: 300 },
  { key: "b_winter", icon: "❄️", name: "Kış", desc: "Karlı kış rozeti", kind: "shop", price: 300 },
  { key: "b_halloween", icon: "🎃", name: "Cadılar Bayramı", desc: "Ürpertici bal kabağı", kind: "shop", price: 400 },
  { key: "b_newyear", icon: "🎄", name: "Yılbaşı", desc: "Yeni yıl coşkusu", kind: "shop", price: 400 },
  { key: "b_republic", icon: "🇹🇷", name: "Cumhuriyet", desc: "29 Ekim gururu", kind: "shop", price: 400 },
  { key: "b_heart", icon: "💘", name: "Sevgili", desc: "Aşıklara özel", kind: "shop", price: 400 },
  { key: "b_paw", icon: "🐾", name: "Pati Sever", desc: "Hayvan dostları için", kind: "shop", price: 250 },
  { key: "b_music", icon: "🎵", name: "Müzikseverler", desc: "Ritmi hisset", kind: "shop", price: 250 },
  { key: "b_fire", icon: "🔥", name: "Ateş", desc: "Yanıp sönen alev", kind: "shop", price: 600 },
  { key: "b_rainbow", icon: "🌈", name: "Gökkuşağı", desc: "Rengarenk bir rozet", kind: "shop", price: 900 },
  { key: "b_diamond", icon: "💎", name: "Elmas", desc: "Nadir ve parlak", kind: "shop", price: 2000 },
  { key: "b_crown", icon: "👑", name: "Kral/Kraliçe", desc: "En prestijli rozet", kind: "shop", price: 5000 },
  { key: "sp_welcome", icon: "🧭", name: "Yeni Gözde", desc: "Rehber Yağmur'dan hoş geldin hediyesini al", kind: "special" },
  { key: "sp_homeowner", icon: "🏡", name: "Ev Sahibi", desc: "Emlakçıdan ilk evini satın al", kind: "special" },
  { key: "sp_expander", icon: "🏗️", name: "Mimar", desc: "Evini genişlet", kind: "special" },
];
export const BADGE_BY_KEY = Object.fromEntries(BADGES.map((b) => [b.key, b])) as Record<string, BadgeDef>;
export const badgeTier = (th: number[], count: number) => th.filter((t) => count >= t).length;

/** Günlük Şans Çarkı dilimleri (sıra sunucudaki ile aynı olmalı) */
export const WHEEL_PRIZES = [20, 50, 100, 200, 500, 1000, 30, 75];

export const EVENT_THEMES: { id: "none" | "confetti" | "fireworks" | "lanterns" | "balloons" | "snow"; label: string }[] = [
  { id: "confetti", label: "🎊 Konfeti" },
  { id: "fireworks", label: "🎆 Havai Fişek" },
  { id: "lanterns", label: "🏮 Fener" },
  { id: "balloons", label: "🎈 Balon" },
  { id: "snow", label: "❄️ Kar" },
  { id: "none", label: "Süs yok" },
];

/** 7 günlük giriş serisi ödülleri (schema.sql `_streak_reward` ile aynı olmalı) */
export const DAILY_REWARDS = [500, 550, 650, 750, 900, 1100, 2000];

/** Hain Avı: harita duvarları (hareketi engeller, istemcide çizilir) */
export const ROOM_WALLS: Record<string, [number, number][]> = { "hain-avi": HAIN_WALLS };
