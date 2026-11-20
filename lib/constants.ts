import type { FurniItem, FurniType, NpcKind, OyunikaCell, OyunikaCellKind, RoomDef, UserRole } from "./types";

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

/** Oyunika: Sağa-sola kıvrılarak ilerleyen 37 karelik kutu oyunu parkuru */
const RAW_OYUNIKA_PATH: [number, number, OyunikaCellKind][] = [
  [1, 1, "start"],
  [2, 1, "normal"],
  [3, 1, "normal"],
  [4, 1, "green"],
  [5, 1, "normal"],
  [6, 1, "purple"],
  [7, 1, "normal"],
  [8, 1, "red"],
  [9, 1, "normal"],
  [10, 1, "normal"],
  [11, 1, "normal"],
  [12, 1, "green"],
  [12, 2, "normal"],
  [12, 3, "normal"],
  [11, 3, "purple"],
  [10, 3, "normal"],
  [9, 3, "normal"],
  [8, 3, "red"],
  [7, 3, "normal"],
  [6, 3, "normal"],
  [5, 3, "purple"],
  [4, 3, "normal"],
  [3, 3, "normal"],
  [2, 3, "green"],
  [2, 4, "normal"],
  [2, 5, "normal"],
  [3, 5, "purple"],
  [4, 5, "normal"],
  [5, 5, "red"],
  [6, 5, "normal"],
  [7, 5, "normal"],
  [8, 5, "green"],
  [9, 5, "normal"],
  [10, 5, "purple"],
  [11, 5, "red"],
  [12, 5, "normal"],
  [13, 5, "finish"],
];

export const OYUNIKA_TRACK: OyunikaCell[] = RAW_OYUNIKA_PATH.map(([gx, gy, kind], index) => ({
  index,
  gx,
  gy,
  kind,
}));

export const oyunikaCellAt = (gx: number, gy: number): OyunikaCell | undefined =>
  OYUNIKA_TRACK.find((c) => c.gx === gx && c.gy === gy);

const f = (id: string, type: FurniType, gx: number, gy: number, rot = 0): FurniItem => ({ id, type, gx, gy, rot, owner: null });

export const ROOMS: RoomDef[] = [
  {
    slug: "cadde-1",
    name: "Cadde 1 - Meydan Bulvarı",
    minRole: "user",
    cols: 22,
    rows: 14,
    theme: { floorA: "#d9ccb0", floorB: "#cdbf9f", wallLeft: "#c9785a", wallRight: "#e9d9b8", accent: "#38bdf8" },
    spawn: { gx: 10, gy: 6 },
    portals: [
      { gx: 19, gy: 0, to: "monako-kulup", label: "Monako Kulüp" },
      { gx: 11, gy: 13, to: "vip-cati-kati", label: "VIP Çatı" },
      { gx: 0, gy: 6, to: "iskele", label: "İskele" },
      { gx: 0, gy: 10, to: "sahil-kasabasi", label: "🌴 Sahil Kasabası" },
      { gx: 11, gy: 0, to: "avm", label: "🛍️ Sevalika AVM" },
    ],
    defaultFurni: [
      f("c1", "table", 3, 2),
      f("c2", "chair", 2, 2),
      f("c3", "chair", 4, 2),
      f("c4", "table", 6, 2),
      f("c5", "chair", 5, 2),
      f("c6", "chair", 7, 2),
      f("c7", "plant", 1, 1),
      f("c8", "plant", 1, 3),
      f("c9", "plant", 9, 1),
      f("c10", "plant", 13, 1),
      f("c11", "streetlight", 8, 3),
      f("c12", "streetlight", 14, 3),
      f("c13", "bench", 17, 2),
      f("c14", "plant", 18, 1),
      f("c15", "plant", 21, 1),
      f("c16", "streetlight", 20, 3),
      f("c17", "bin", 12, 3),
      f("c18", "bin", 4, 3),
      f("c19", "bench", 3, 8, 1),
      f("c20", "bench", 7, 8, 1),
      f("c21", "bus_stop", 14, 8),
      f("c22", "phone_booth", 19, 8),
      f("c23", "bench", 10, 8, 1),
      f("c24", "streetlight", 2, 9),
      f("c25", "streetlight", 6, 9),
      f("c26", "streetlight", 12, 9),
      f("c27", "streetlight", 18, 9),
      f("c28", "bin", 9, 9),
      f("c29", "bin", 21, 9),
      f("c30", "fountain", 11, 11),
      f("c31", "bench", 10, 10),
      f("c32", "bench", 12, 10),
      f("c35", "tree", 1, 11),
      f("c36", "tree", 5, 13),
      f("c39", "tree", 17, 13),
      f("c40", "tree", 20, 11),
      f("c44", "plant", 18, 10),
      f("c45", "plant", 14, 13),
      f("c46", "plant", 8, 13),
      f("c49", "bench", 3, 10, 1),
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
    portals: [{ gx: 13, gy: 19, to: "cadde-1", label: "Cadde 1'e Çık" }],
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
    slug: "sahil-kasabasi",
    name: "🌴 Sahil Kasabası",
    minRole: "user",
    cols: 20,
    rows: 16,
    theme: { floorA: "#f1dca6", floorB: "#e8d09a", wallLeft: "#6ec3d4", wallRight: "#8fd3e0", accent: "#f472b6" },
    spawn: { gx: 2, gy: 9 },
    portals: [{ gx: 0, gy: 9, to: "cadde-1", label: "Cadde 1" }],
    defaultFurni: [
      // Sol üst: Çok kareli Sahil Kafesi (4x3) ve oturma alanı
      f("sk_cafe", "beach_cafe", 2, 0),
      f("sk_bar", "tiki_bar", 0, 3),
      f("sk4", "table", 7, 2),
      f("sk5", "chair", 6, 2),
      f("sk6", "chair", 8, 2),
      f("sk7", "umbrella", 7, 1),
      f("sk8", "palm", 0, 1),
      f("sk9", "palm", 0, 7),
      // Plaj şezlongları, şemsiyeleri ve banklar
      f("sk11", "lounger", 3, 6),
      f("sk12", "umbrella", 4, 6),
      f("sk13", "lounger", 5, 6),
      f("sk15", "lounger", 3, 9),
      f("sk17", "umbrella", 4, 9),
      f("sk16", "lounger", 5, 9),
      f("sk18", "bench", 6, 4),
      f("sk19", "streetlight", 8, 3),
      f("sk20", "streetlight", 1, 6),
      // Sol alt: Akşam kamp ateşi ve oturma kütükleri
      f("sk21", "campfire", 4, 13),
      f("sk22", "logseat", 3, 12),
      f("sk23", "logseat", 5, 12, 1),
      f("sk24", "logseat", 3, 14),
      f("sk25", "logseat", 5, 14, 1),
      f("sk26", "palm", 1, 11),
      f("sk27", "palm", 7, 12),
      // Sağ üst: Çok kareli DJ Kabini (3x2) & dans pisti
      f("sk_dj", "dj_booth", 10, 0),
      f("sk29", "palm", 9, 1),
      f("sk30", "palm", 15, 3),
      f("sk31", "bench", 15, 6),
      f("sk32", "streetlight", 14, 6),
      // Sağ alt: Deniz kenarı romantik oturma alanı
      f("sk33", "beanbag", 12, 12),
      f("sk34", "beanbag", 14, 12, 1),
      f("sk35", "beanbag", 13, 13),
      f("sk36", "table", 13, 12),
      f("sk37", "palm", 15, 11),
    ],
  },
  {
    slug: "oyunika",
    name: "🎲 Oyunika Parkuru",
    minRole: "user",
    cols: 15,
    rows: 8,
    theme: { floorA: "#5a47a8", floorB: "#503f9a", wallLeft: "#7a5bd0", wallRight: "#6a4cc0", accent: "#f472b6" },
    spawn: { gx: 1, gy: 1 },
    portals: [{ gx: 0, gy: 7, to: "cadde-1", label: "Cadde 1'e Dön" }],
    defaultFurni: [
      f("oy1", "lamp", 0, 0),
      f("oy2", "lamp", 14, 0),
      f("oy3", "plant", 14, 6),
      f("oy4", "palm", 3, 0),
      f("oy5", "palm", 11, 0),
      f("oy6", "lamp", 7, 0),
      f("oy7", "plant", 2, 7),
      f("oy8", "plant", 5, 7),
      f("oy9", "plant", 9, 7),
      f("oy10", "plant", 12, 7),
      f("oy11", "bench", 7, 7),
      f("oy12", "lamp", 14, 7),
    ],
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
  avm: [{ kind: "stylist", name: "Stilist Defne", gx: 3, gy: 4, shirt: "#a855f7", hair: "#78350f", skin: "#fdba74" }],
  "cadde-1": [{ kind: "oyunika", name: "Oyunika Mert", gx: 15, gy: 2 shirt: "#ec4899", hair: "#facc15", skin: "#fed7aa" }],
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

export function resolveRoom(slug: string): RoomDef | undefined {
  const fixed = ROOM_BY_SLUG[slug];
  if (fixed) return fixed;
  if (!isHomeSlug(slug)) return undefined;
  return {
    slug,
    name: `🏠 ${slug.slice(5)} odası`,
    minRole: "user",
    theme: { floorA: "#dfae6e", floorB: "#d2a05f", wallLeft: "#f2c7d6", wallRight: "#e8b9ca", accent: "#f59e0b" },
    spawn: { gx: 6, gy: 7 },
    portals: [{ gx: 11, gy: 6, to: "cadde-1", label: "Cadde 1" }],
    defaultFurni: [],
  };
}

export type CosmeticSlot = "hat" | "glasses" | "top" | "hair" | "pet";

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
