export type UserRole = "user" | "vip" | "suvari" | "admin";

export type FurniType =
  | "fish_hut"
  | "mine_entrance"
  | "ore_cart"
  | "bus_stop"
  | "store_fashion"
  | "store_tech"
  | "store_food"
  | "mannequin"
  | "bed"
  | "clock_tower"
  | "fountain_big"
  | "food_truck"
  | "stall_red"
  | "stall_blue"
  | "billboard"
  | "car_red"
  | "car_blue"
  | "car_yellow"
  | "flower_bed"
  | "phone_booth"
  | "casino_bar"
  | "kitchen_block"
  | "barn"
  | "sofa"
  | "lamp"
  | "plant"
  | "table"
  | "rug"
  | "chair"
  | "bookshelf"
  | "tv"
  | "fountain"
  | "streetlight"
  | "bench"
  | "tree"
  | "bin"
  | "kiosk"
  | "palm"
  | "lounger"
  | "counter"
  | "casinotable"
  | "campfire"
  | "umbrella"
  | "logseat"
  | "beanbag"
  | "surfboard"
  | "beach_cafe"
  | "dj_booth"
  | "tiki_bar";

export interface FurniItem {
  id: string;
  type: FurniType;
  gx: number;
  gy: number;
  rot: number;
  owner?: string | null;
  /** Serbest konum: 1x pikseliyle kaydırma ve yüzde ölçek (50–200) */
  ox?: number;
  oy?: number;
  sc?: number;
}

export interface Tile {
  gx: number;
  gy: number;
}

/** Sunucuda `set_look` ile değiştirilen renkler */
export interface ColorLook {
  shirtColor: string;
  hairColor: string;
  skinColor: string;
}

/** Renkler + mağazadan alınan kozmetikler */
export interface Look extends ColorLook {
  hat: string | null;
  glasses: string | null;
  top: string | null;
  back: string | null;
  status?: string | null;
  hairStyle: string;
}

export interface Profile extends Look {
  id: string;
  username: string;
  role: UserRole;
  isFounder: boolean;
  coins: number;
  inventory: string[];
  wardrobe: string[];
  /** Kuşanılan alet (şimdilik sadece olta) */
  tool: string | null;
  xp: number;
  pet: string | null;
  /** Son bulunduğu oda (kaldığın yerden devam için) */
  room: string | null;
  canClaimDaily: boolean;
  /** Rehber Yağmur hoş geldin hediyesi alındı mı */
  guideGift?: boolean;
  kickedUntil: string | null;
  mutedUntil: string | null;
}

export type NpcKind = "fisher" | "chef" | "farmer" | "miner" | "dealer" | "oyunika" | "stylist" | "barber" | "accessory" | "furnisher" | "costume" | "realtor" | "guide";

export interface Player extends Look {
  id: string;
  /** Sunucudaki hesap kimliği (sohbet balonu eşleştirmesi için) */
  uid?: string;
  name: string;
  gx: number;
  gy: number;
  path: Tile[];
  role: UserRole;
  isSitting: boolean;
  isDancing: boolean;
  isRidingHorse: boolean;
  tool?: string | null;
  pet?: string | null;
  isFishing?: boolean;
  /** Katmanlı (PNG parça) karakter görünümü */
  layered?: boolean;
  /** Bakış yönü: 0=GD(+gx) 1=GB(+gy) 2=KB(-gx) 3=KD(-gy) */
  dir?: number;
  /** Oturulan eşyanın türü/yönü (motor her karede hesaplar) */
  seatType?: string;
  seatRot?: number;
  isNpc?: boolean;
  npcKind?: NpcKind;
}

export interface ChatBubble {
  id: string;
  sender: string;
  uid?: string;
  text: string;
  createdAt: number;
}

export interface Emote {
  id: string;
  playerId: string;
  emoji: string;
  createdAt: number;
}

export interface ChatLine {
  sender: string;
  text: string;
  time: string;
  role?: UserRole;
  isWhisper?: boolean;
  whisperTarget?: string;
  isSystem?: boolean;
}

export interface RoomTheme {
  floorA: string;
  floorB: string;
  wallLeft: string;
  wallRight: string;
  accent: string;
  /** Ev odası zemin dokusu (wood|marble|carpet|grass|plain) */
  floorKind?: string;
}

export interface Portal extends Tile {
  to: string;
  label: string;
}

export interface RoomDef {
  slug: string;
  name: string;
  minRole: UserRole;
  /** Odaya özel genişlik (gx sınırı) ve yükseklik (gy sınırı). Verilmezse varsayılan 12 kullanılır. */
  cols?: number;
  rows?: number;
  theme: RoomTheme;
  spawn: Tile;
  portals: Portal[];
  defaultFurni: FurniItem[];
}

export interface AdminEvent {
  id: number;
  kind: "announce" | "kick" | "gift" | "role" | "dance" | "clear_room" | "quiz" | "quiz_end" | "tournament" | "tournament_end" | "flag" | "flag_end" | "hide" | "hide_end";
  room: string | null;
  target: string | null;
  payload: Record<string, unknown>;
  by_username: string;
}

export interface PublicProfile {
  id?: string;
  username: string;
  role: UserRole;
}

/** `messages` tablosundan gelen satır (gönderici sunucuda doğrulanmıştır) */
export interface ChatRow {
  id: number;
  kind: "chat" | "whisper";
  room: string | null;
  sender_id: string;
  sender: string;
  target_id: string | null;
  target: string | null;
  text: string;
}

export interface UserEvent {
  id: number;
  kind: string;
  payload: Record<string, unknown>;
}

export type FriendRelation = "friend" | "incoming" | "outgoing";

export interface Friend {
  username: string;
  role: UserRole;
  relation: FriendRelation;
  online: boolean;
  room: string | null;
  home: string | null;
}

export interface Report {
  id: number;
  reporter: string;
  target: string;
  reason: string;
  room: string | null;
  context: { text: string; at: string }[];
  created_at: string;
}

export interface AdminLogEntry {
  id: number;
  admin: string;
  action: string;
  target: string | null;
  detail: string | null;
  created_at: string;
}

export interface ActiveQuiz {
  question: string;
  reward: number;
  endsAt: number;
}

export type HomeAccess = "open" | "friends" | "closed";

export interface Quest {
  key: string;
  goal: number;
  progress: number;
  claimed: boolean;
  coins: number;
  xp: number;
}

export interface Listing {
  id: number;
  seller: string;
  item: string;
  price: number;
  mine: boolean;
  for_user: string | null;
}

export interface TournamentState {
  active: boolean;
  ends_at?: string;
  top?: { username: string; score: number }[];
  me?: number;
}

export interface ProfileCard {
  username: string;
  role: UserRole;
  xp: number;
  level: number;
  fish_caught: number;
  joined: string;
  friends: number;
  guild?: string | null;
  status_text?: string | null;
  achievements: string[];
  badges?: BadgeState;
}

export interface PopularHome {
  slug: string;
  owner: string;
  size: number;
  likes: number;
}

export interface BadgeState {
  tiers: { key: string; count: number; tier: number }[];
  owned: string[];
}

export type WeatherMode = "auto" | "none" | "rain" | "snow";

export interface GuildInfo {
  name: string;
  tag: string;
  bank: number;
  level: number;
  cap: number;
  owner: boolean;
  members: { username: string; level: number; owner: boolean }[];
}
export interface GuildListItem {
  name: string;
  tag: string;
  bank: number;
  level: number;
  members: number;
  cap: number;
}
export interface FarmPlot {
  slot: number;
  crop: string | null;
  seconds_left: number | null;
}
export interface BjState {
  bet: number;
  player: number[];
  dealer: number[];
  player_total: number;
  dealer_total: number | null;
  done: boolean;
  result: "win" | "lose" | "push" | "blackjack" | null;
  coins: number;
  delta: number;
}
export interface DiceResult {
  you: [number, number];
  house: [number, number];
  result: "win" | "lose" | "push";
  delta: number;
  coins: number;
}
export interface FlagState {
  active: boolean;
  room?: string;
  gx?: number;
  gy?: number;
  prize?: number;
  ends_at?: string;
}
export interface HideState {
  active: boolean;
  room?: string;
  seeker?: string;
  ends_at?: string;
  me_seeker?: boolean;
}

export type OyunikaCellKind = "start" | "normal" | "red" | "green" | "purple" | "finish";

export interface OyunikaCell extends Tile {
  index: number;
  kind: OyunikaCellKind;
}

export interface OyunikaPlayerState {
  username: string;
  pos: number;
  skipTurn: boolean;
  shirtColor: string;
  hairColor: string;
  skinColor: string;
}

export interface OyunikaState {
  status: "idle" | "lobby" | "playing" | "finished";
  host: string | null;
  players: OyunikaPlayerState[];
  turnIndex: number;
  lastDice: [number, number] | null;
  lastEventText: string | null;
  winner: string | null;
}
