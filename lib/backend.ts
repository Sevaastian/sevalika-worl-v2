import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  CROPS,
  GOODS_PRICES,
  MINE_REACH,
  PICKAXE_PRICE,
  RECIPES,
  ROOM_ROCKS,
  type GoodsPrefix,
  AUTH_EMAIL_DOMAIN,
  BADGE_BY_KEY,
  BADGE_REWARDS,
  badgeTier,
  BUNDLE_BY_ID,
  HOME_SALE_SIZES,
  homeExpandPrice,
  homePrice,
  registerHomeSize,
  COSMETIC_BY_ID,
  HOME_FLOORS,
  HOME_WALLS,
  type CosmeticSlot,
  FISH_PRICES,
  ROD_PRICE,
  isFurniType,
  levelOf,
  FURNI_BY_TYPE,
  ROLE_RANK,
  homeSlug,
  isHomeSlug,
  resolveRoom,
  WHEEL_PRIZES,
  DAILY_REWARDS,
} from "./constants";
import type {
  GameEvent,
  EventTheme,
  BjState,
  DiceResult,
  FarmPlot,
  FlagState,
  GuildInfo,
  GuildListItem,
  HideState,
  AdminEvent,
  AdminLogEntry,
  ChatRow,
  ColorLook,
  Friend,
  FurniItem,
  FurniType,
  HomeAccess,
  Listing,
  Profile,
  BadgeState,
  PopularHome,
  ProfileCard,
  PublicProfile,
  Quest,
  Report,
  TournamentState,
  UserEvent,
  UserRole,
} from "./types";

export interface Backend {
  readonly online: boolean;
  restoreSession(): Promise<Profile | null>;
  signIn(username: string, password: string): Promise<Profile>;
  signUp(username: string, password: string): Promise<Profile>;
  enterDemo(username: string): Profile;
  signOut(): Promise<void>;
  getProfile(): Promise<Profile>;
  claimDaily(): Promise<number>;
  activeEvents(): Promise<GameEvent[]>;
  claimEventReward(id: string): Promise<number>;
  adminCreateEvent(e: { title: string; description: string; theme: EventTheme; mult: number; reward: number; hours: number; startInMin: number }): Promise<void>;
  adminEndEvent(id: string): Promise<void>;
  wheelStatus(): Promise<{ ready: boolean; seconds: number }>;
  spinWheel(): Promise<{ index: number; prize: number; coins: number }>;
  tetrisSubmit(mode: "solo" | "duel", score: number, lines: number, secs: number): Promise<{ prize: number; coins: number; best: number; capped: boolean }>;
  tetrisBoard(): Promise<{ solo: { username: string; score: number }[]; duel: { username: string; wins: number }[] }>;
  setLook(look: ColorLook): Promise<void>;

  // Oda / eşya
  buyAndPlace(room: string, type: FurniType, gx: number, gy: number, rot: number): Promise<number>;
  placeFromBag(room: string, type: FurniType, gx: number, gy: number, rot: number): Promise<string[]>;
  pickup(room: string, id: string): Promise<string[]>;
  nudgeFurni(room: string, id: string, ox: number, oy: number, sc: number, gx?: number, gy?: number): Promise<void>;
  loadRoom(slug: string): Promise<FurniItem[]>;
  enterRoom(slug: string): Promise<void>;
  ensureHome(): Promise<string>;
  setHomeAccess(access: HomeAccess): Promise<void>;
  getRoomStyle(slug: string): Promise<{ wall: string; floor: string; likes: number; size: number }>;
  /** Emlakçıdan ev al (boyut = kenar) */
  buyHome(size: number): Promise<{ coins: number; slug: string; size: number; price: number }>;
  /** Evi genişlet (düzenleme modu) */
  expandHome(size: number): Promise<{ coins: number; size: number; price: number }>;
  /** Evin var mı? (sahip olunan boyut ya da null) */
  getMyHomeSize(): Promise<number | null>;
  claimGuideGift(): Promise<{ coins: number; reward: number }>;
  getBadges(): Promise<BadgeState>;
  popularHomes(): Promise<PopularHome[]>;
  buyBadge(key: string): Promise<{ coins: number; key: string }>;
  setHomeStyle(wall: string, floor: string): Promise<number>;
  likeHome(slug: string): Promise<number>;
  setStatus(text: string): Promise<void>;

  // Sohbet
  sendChat(room: string, text: string, target?: string): Promise<void>;
  rollDice(room: string): Promise<number>;
  heartbeat(room: string): Promise<{ kickedUntil: string | null; mutedUntil: string | null }>;
  publicProfiles(names: string[]): Promise<PublicProfile[]>;

  // Arkadaşlar / hediye
  getFriends(): Promise<Friend[]>;
  friendRequest(username: string): Promise<void>;
  friendRespond(username: string, accept: boolean): Promise<void>;
  friendRemove(username: string): Promise<void>;
  giftCoins(username: string, amount: number): Promise<number>;
  giftItem(username: string, item: string): Promise<string[]>;

  // Mağaza
  buyCosmetic(id: string): Promise<{ coins: number; wardrobe: string[] }>;
  buyBundle(id: string): Promise<{ coins: number; price: number; inventory?: string[]; wardrobe?: string[] }>;
  equipCosmetic(slot: CosmeticSlot, id: string | null): Promise<void>;

  // Olta / balık
  buyFishingRod(): Promise<{ coins: number; inventory: string[]; tool: string | null }>;
  equipTool(tool: string | null): Promise<string | null>;
  catchFish(room: string): Promise<{ item: string; value: number; inventory: string[] }>;
  sellFish(item?: string): Promise<{ earned: number; sold: number; coins: number; inventory: string[] }>;

  // Görev, pazar, turnuva, profil
  getQuests(): Promise<Quest[]>;
  claimQuest(key: string): Promise<{ coins: number; xp: number }>;
  getProfileCard(username: string): Promise<ProfileCard>;
  marketGet(): Promise<Listing[]>;
  marketList(item: string, price: number, forUser?: string): Promise<string[]>;
  marketBuy(id: number): Promise<{ coins: number; inventory: string[] }>;
  marketCancel(id: number): Promise<string[]>;
  getTournament(): Promise<TournamentState>;
  adminStartTournament(minutes: number): Promise<void>;

  // v5: konum, maden, çiftlik, aşçılık, lonca, masalar, mini oyunlar
  reportPos(room: string, gx: number, gy: number): Promise<{ ok: boolean; gx: number; gy: number }>;
  buyPickaxe(): Promise<{ coins: number; inventory: string[] }>;
  mineOre(): Promise<{ item: string; value: number; inventory: string[] }>;
  sellGoods(prefix: GoodsPrefix, item?: string): Promise<{ earned: number; sold: number; coins: number; inventory: string[] }>;
  farmGet(): Promise<FarmPlot[]>;
  farmPlant(slot: number, crop: string): Promise<number>;
  farmHarvest(slot: number): Promise<string[]>;
  cook(dish: string): Promise<string[]>;
  guildGet(): Promise<GuildInfo | null>;
  guildList(): Promise<GuildListItem[]>;
  guildCreate(name: string, tag: string): Promise<GuildInfo | null>;
  guildJoin(name: string): Promise<GuildInfo | null>;
  guildLeave(): Promise<void>;
  guildKick(username: string): Promise<void>;
  guildDonate(amount: number): Promise<{ coins: number; guild: GuildInfo | null }>;
  dicePlay(bet: number): Promise<DiceResult>;
  bjState(): Promise<BjState | null>;
  bjStart(bet: number): Promise<BjState>;
  bjHit(): Promise<BjState>;
  bjStand(): Promise<BjState>;
  getFlag(): Promise<FlagState>;
  flagGrab(room: string): Promise<{ coins: number; prize: number }>;
  adminStartFlag(room: string, prize: number, seconds: number): Promise<void>;
  getHide(): Promise<HideState>;
  hideTag(username: string): Promise<{ tagged: string; prize: number }>;
  adminStartHide(room: string, seconds: number): Promise<void>;

  // Yarışma / şikayet
  answerQuiz(text: string): Promise<{ correct: boolean; reward?: number }>;
  reportPlayer(username: string, reason: string): Promise<void>;
  blockUser(username: string): Promise<void>;
  unblockUser(username: string): Promise<void>;
  myBlocks(): Promise<string[]>;

  // Admin
  adminSetRole(username: string, role: UserRole): Promise<void>;
  adminGift(username: string, amount: number): Promise<void>;
  adminKick(username: string): Promise<void>;
  adminAnnounce(text: string): Promise<void>;
  adminDance(room: string, on: boolean): Promise<void>;
  adminClearRoom(room: string): Promise<void>;
  adminMute(username: string, minutes: number): Promise<void>;
  adminUnmute(username: string): Promise<void>;
  adminBan(username: string, hours: number): Promise<void>;
  adminUnban(username: string): Promise<void>;
  adminStartQuiz(question: string, answer: string, reward: number, seconds: number): Promise<void>;
  adminReports(): Promise<Report[]>;
  adminCloseReport(id: number): Promise<void>;
  adminLog(): Promise<AdminLogEntry[]>;

  // Canlı abonelikler
  subscribeRoom(slug: string, cb: (furni: FurniItem[]) => void): () => void;
  subscribeAdminEvents(cb: (e: AdminEvent) => void): () => void;
  subscribeChat(slug: string, uid: string, onChat: (m: ChatRow) => void, onWhisper: (m: ChatRow) => void): () => void;
  subscribeUserEvents(uid: string, cb: (e: UserEvent) => void): () => void;
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const supabase: SupabaseClient | null =
  url && anon
    ? createClient(url, anon, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
        realtime: { params: { eventsPerSecond: 10 } },
      })
    : null;

export const toEmail = (username: string) => `${username.toLowerCase()}@${AUTH_EMAIL_DOMAIN}`;

export function isBlocked(until: string | null): boolean {
  if (!until) return false;
  if (until === "infinity") return true;
  return new Date(until).getTime() > Date.now();
}

interface ProfileRow {
  id: string;
  username: string;
  role: UserRole;
  is_founder: boolean;
  coins: number;
  shirt_color: string;
  hair_color: string;
  skin_color: string;
  hat: string | null;
  glasses: string | null;
  top_style: string | null;
  back_style: string | null;
  status_text: string | null;
  guide_gift?: boolean;
  hair_style: string;
  wardrobe: string[];
  inventory: string[];
  tool: string | null;
  xp: number;
  pet: string | null;
  room: string | null;
  can_claim_daily: boolean;
  daily_streak?: number;
  streak_next?: number;
  kicked_until: string | null;
  muted_until: string | null;
}

const mapProfile = (r: ProfileRow): Profile => ({
  id: r.id,
  username: r.username,
  role: r.role,
  isFounder: r.is_founder,
  coins: r.coins,
  shirtColor: r.shirt_color,
  hairColor: r.hair_color,
  skinColor: r.skin_color,
  hat: r.hat,
  glasses: r.glasses,
  top: r.top_style ?? null,
  back: r.back_style ?? null,
  status: r.status_text ?? null,
  guideGift: r.guide_gift ?? false,
  hairStyle: r.hair_style,
  wardrobe: r.wardrobe ?? [],
  inventory: r.inventory ?? [],
  tool: r.tool ?? null,
  xp: r.xp ?? 0,
  pet: r.pet ?? null,
  room: r.room ?? null,
  canClaimDaily: r.can_claim_daily,
  dailyStreak: r.daily_streak ?? 0,
  streakNext: r.streak_next ?? 1,
  kickedUntil: r.kicked_until,
  mutedUntil: r.muted_until,
});

function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login")) return "Kullanıcı adı veya şifre hatalı.";
  if (m.includes("already registered") || m.includes("already been registered")) return "Bu kullanıcı adı zaten alınmış! Başka bir nick seç veya Giriş Yap.";
  if (m.includes("password")) return "Şifre en az 6 karakter olmalı.";
  if (m.includes("email") && m.includes("invalid"))
    return "Supabase bu sahte e-posta alan adını reddetti. README'deki 'NEXT_PUBLIC_AUTH_EMAIL_DOMAIN' bölümüne bak.";
  if (m.includes("rate limit")) return "Çok fazla deneme yaptın, biraz bekleyip tekrar dene.";
  return message;
}

function createSupabaseBackend(sb: SupabaseClient): Backend {
  const rpc = async <T = void>(fn: string, args?: Record<string, unknown>): Promise<T> => {
    const { data, error } = await sb.rpc(fn, args);
    if (error) throw new Error(error.message);
    return data as T;
  };
  const rid = () => Math.random().toString(36).slice(2, 8);

  const getProfile = async () => mapProfile(await rpc<ProfileRow>("get_my_profile"));

  const checkBlocked = (p: Profile) => {
    if (isBlocked(p.kickedUntil)) {
      throw new Error(p.kickedUntil === "infinity" ? "Hesabın yasaklandı." : "Yetkili tarafından uzaklaştırıldın. Birkaç dakika sonra tekrar dene.");
    }
  };

  return {
    online: true,

    async restoreSession() {
      const { data } = await sb.auth.getSession();
      if (!data.session) return null;
      try {
        const p = await getProfile();
        checkBlocked(p);
        return p;
      } catch {
        await sb.auth.signOut();
        return null;
      }
    },

    async signIn(username, password) {
      const { error } = await sb.auth.signInWithPassword({ email: toEmail(username), password });
      if (error) throw new Error(friendlyAuthError(error.message));
      const p = await getProfile();
      try {
        checkBlocked(p);
      } catch (e) {
        await sb.auth.signOut();
        throw e;
      }
      return p;
    },

    async signUp(username, password) {
      const { data: free } = await sb.rpc("username_available", { p_username: username });
      if (free === false) throw new Error("Bu kullanıcı adı zaten alınmış! Başka bir nick seç veya Giriş Yap.");
      const { data, error } = await sb.auth.signUp({
        email: toEmail(username),
        password,
        options: { data: { username } },
      });
      if (error) throw new Error(friendlyAuthError(error.message));
      if (!data.session) {
        throw new Error("Hesap oluşturuldu ama oturum açılmadı: Supabase'de 'Confirm email' seçeneğini kapatman gerekiyor (README).");
      }
      return getProfile();
    },

    enterDemo() {
      throw new Error("Demo modu yalnızca Supabase ayarlanmadığında çalışır.");
    },

    async signOut() {
      await sb.auth.signOut();
    },

    getProfile,
    claimDaily: () => rpc<number>("claim_daily"),
    activeEvents: () => rpc<GameEvent[]>("active_events"),
    claimEventReward: (id) => rpc<number>("claim_event_reward", { p_id: id }),
    adminCreateEvent: async (e) => {
      await rpc("admin_create_event", {
        p_title: e.title,
        p_desc: e.description,
        p_theme: e.theme,
        p_mult: e.mult,
        p_reward: e.reward,
        p_start: new Date(Date.now() + e.startInMin * 60000).toISOString(),
        p_hours: e.hours,
      });
    },
    adminEndEvent: async (id) => {
      await rpc("admin_end_event", { p_id: id });
    },
    wheelStatus: () => rpc<{ ready: boolean; seconds: number }>("wheel_status"),
    spinWheel: () => rpc<{ index: number; prize: number; coins: number }>("spin_wheel"),
    tetrisSubmit: (mode, score, lines, secs) =>
      rpc<{ prize: number; coins: number; best: number; capped: boolean }>("tetris_submit", { p_mode: mode, p_score: Math.round(score), p_lines: Math.round(lines), p_secs: Math.round(secs) }),
    tetrisBoard: () => rpc<{ solo: { username: string; score: number }[]; duel: { username: string; wins: number }[] }>("tetris_board"),
    async setLook(l) {
      await rpc("set_look", { p_shirt: l.shirtColor, p_hair: l.hairColor, p_skin: l.skinColor });
    },

    async buyAndPlace(room, type, gx, gy, rot) {
      const r = await rpc<{ coins: number }>("buy_and_place_furni", { p_room: room, p_type: type, p_gx: gx, p_gy: gy, p_rot: rot });
      return r.coins;
    },
    async placeFromBag(room, type, gx, gy, rot) {
      const r = await rpc<{ inventory: string[] }>("place_from_bag", { p_room: room, p_type: type, p_gx: gx, p_gy: gy, p_rot: rot });
      return r.inventory;
    },
    async pickup(room, id) {
      const r = await rpc<{ inventory: string[] }>("pickup_furni", { p_room: room, p_id: id });
      return r.inventory;
    },
    async nudgeFurni(room, id, ox, oy, sc, gx, gy) {
      await rpc("nudge_furni", { p_room: room, p_id: id, p_ox: Math.round(ox), p_oy: Math.round(oy), p_sc: Math.round(sc), p_gx: gx ?? null, p_gy: gy ?? null });
    },
    async loadRoom(slug) {
      const { data, error } = await sb.from("rooms").select("furni").eq("slug", slug).maybeSingle();
      if (error) throw new Error(error.message);
      // Satır hiç yoksa (şema çalıştırılmamış) varsayılan yerleşim; satır varsa boş olsa bile o geçerlidir
      // (admin "tüm eşyaları kaldır" yaptıysa oda gerçekten boş kalmalı).
      if (!Array.isArray(data?.furni)) {
        return isHomeSlug(slug) ? [] : structuredClone(resolveRoom(slug)?.defaultFurni ?? []);
      }
      return data.furni as FurniItem[];
    },
    async enterRoom(slug) {
      try {
        await rpc("enter_room", { p_slug: slug });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "";
        if (msg.toLowerCase().includes("oda bulunamadı") && slug === "oyunika") {
          throw new Error("Supabase 'rooms' tablosunda 'oyunika' odası eksik. supabase/schema.sql dosyasını SQL Editor'de yeniden çalıştır.");
        }
        throw e;
      }
    },
    ensureHome: () => rpc<string>("ensure_home"),
    setHomeAccess: (a) => rpc("set_home_access", { p_access: a }),
    async getRoomStyle(slug) {
      const { data } = await sb.from("rooms").select("wall_style, floor_style, like_count, cols").eq("slug", slug).maybeSingle();
      return { wall: data?.wall_style ?? "w_pink", floor: data?.floor_style ?? "f_wood", likes: data?.like_count ?? 0, size: data?.cols ?? 12 };
    },
    buyHome: (size) => rpc("buy_home", { p_size: size }),
    expandHome: (size) => rpc("expand_home", { p_size: size }),
    async getMyHomeSize() {
      const uid = (await sb.auth.getUser()).data.user?.id;
      if (!uid) return null;
      const { data } = await sb.from("rooms").select("cols").eq("owner_id", uid).maybeSingle();
      return data?.cols ?? null;
    },
    claimGuideGift: () => rpc("claim_guide_gift"),
    getBadges: () => rpc("get_badges"),
    popularHomes: () => rpc("popular_homes"),
    buyBadge: (key) => rpc("buy_badge", { p_key: key }),
    async setHomeStyle(wall, floor) {
      const r = await rpc<{ coins: number }>("set_home_style", { p_wall: wall, p_floor: floor });
      return r.coins;
    },
    likeHome: (slug) => rpc<number>("like_home", { p_slug: slug }),
    setStatus: (text) => rpc("set_status", { p_text: text }),

    sendChat: (room, text, target) => rpc("send_chat", { p_room: room, p_text: text, p_target: target ?? null }),
    rollDice: (room) => rpc<number>("roll_dice", { p_room: room }),
    async heartbeat(room) {
      const r = await rpc<{ kicked_until: string | null; muted_until: string | null }>("heartbeat", { p_room: room });
      return { kickedUntil: r.kicked_until, mutedUntil: r.muted_until };
    },

    async publicProfiles(names) {
      if (!names.length) return [];
      const { data } = await sb.from("public_profiles").select("id, username, role").in("username", names);
      return (data ?? []).map((r) => ({ id: r.id as string, username: r.username as string, role: r.role as UserRole }));
    },

    getFriends: () => rpc<Friend[]>("get_friends"),
    friendRequest: (u) => rpc("friend_request", { p_username: u }),
    friendRespond: (u, accept) => rpc("friend_respond", { p_username: u, p_accept: accept }),
    friendRemove: (u) => rpc("friend_remove", { p_username: u }),
    giftCoins: (u, n) => rpc<number>("gift_coins", { p_username: u, p_amount: n }),
    async giftItem(u, item) {
      const r = await rpc<{ inventory: string[] }>("gift_item", { p_username: u, p_item: item });
      return r.inventory;
    },

    buyCosmetic: (id) => rpc("buy_cosmetic", { p_id: id }),
    buyBundle: (id) => rpc("buy_bundle", { p_id: id }),
    equipCosmetic: (slot, id) => rpc("equip_cosmetic", { p_slot: slot, p_id: id }),

    buyFishingRod: () => rpc("buy_fishing_rod"),
    equipTool: (tool) => rpc<string | null>("equip_tool", { p_tool: tool }),
    catchFish: (room) => rpc("catch_fish", { p_room: room }),
    sellFish: (item) => rpc("sell_fish", { p_item: item ?? null }),

    getQuests: () => rpc("get_quests"),
    claimQuest: (key) => rpc("claim_quest", { p_key: key }),
    getProfileCard: (u) => rpc("get_profile_card", { p_username: u }),
    marketGet: () => rpc("market_get"),
    async marketList(item, price, forUser) {
      const r = await rpc<{ inventory: string[] }>("market_list_item", { p_item: item, p_price: price, p_for: forUser?.trim() || null });
      return r.inventory;
    },
    marketBuy: (id) => rpc("market_buy", { p_id: id }),
    async marketCancel(id) {
      const r = await rpc<{ inventory: string[] }>("market_cancel", { p_id: id });
      return r.inventory;
    },
    getTournament: () => rpc("get_tournament"),
    adminStartTournament: (m) => rpc("admin_start_tournament", { p_minutes: m }),

    reportPos: (room, gx, gy) => rpc("report_pos", { p_room: room, p_gx: gx, p_gy: gy }),
    buyPickaxe: () => rpc("buy_pickaxe"),
    mineOre: () => rpc("mine_ore"),
    sellGoods: (prefix, item) => rpc("sell_goods", { p_prefix: prefix, p_item: item ?? null }),
    farmGet: () => rpc("farm_get"),
    async farmPlant(slot, crop) {
      const r = await rpc<{ coins: number }>("farm_plant", { p_slot: slot, p_crop: crop });
      return r.coins;
    },
    async farmHarvest(slot) {
      const r = await rpc<{ inventory: string[] }>("farm_harvest", { p_slot: slot });
      return r.inventory;
    },
    async cook(dish) {
      const r = await rpc<{ inventory: string[] }>("cook", { p_dish: dish });
      return r.inventory;
    },
    guildGet: () => rpc("guild_get"),
    guildList: () => rpc("guild_list"),
    guildCreate: (name, tag) => rpc("guild_create", { p_name: name, p_tag: tag }),
    guildJoin: (name) => rpc("guild_join", { p_name: name }),
    async guildLeave() {
      await rpc("guild_leave");
    },
    async guildKick(u) {
      await rpc("guild_kick", { p_username: u });
    },
    guildDonate: (n) => rpc("guild_donate", { p_amount: n }),
    dicePlay: (bet) => rpc("dice_play", { p_bet: bet }),
    bjState: () => rpc("bj_state"),
    bjStart: (bet) => rpc("bj_start", { p_bet: bet }),
    bjHit: () => rpc("bj_hit"),
    bjStand: () => rpc("bj_stand"),
    getFlag: () => rpc("get_flag"),
    flagGrab: (room) => rpc("flag_grab", { p_room: room }),
    async adminStartFlag(room, prize, seconds) {
      await rpc("admin_start_flag", { p_room: room, p_prize: prize, p_seconds: seconds });
    },
    getHide: () => rpc("get_hide"),
    hideTag: (u) => rpc("hide_tag", { p_username: u }),
    async adminStartHide(room, seconds) {
      await rpc("admin_start_hide", { p_room: room, p_seconds: seconds });
    },

    answerQuiz: (text) => rpc("answer_quiz", { p_text: text }),
    reportPlayer: (u, reason) => rpc("report_player", { p_username: u, p_reason: reason }),
    blockUser: (u) => rpc("block_user", { p_username: u }),
    unblockUser: (u) => rpc("unblock_user", { p_username: u }),
    myBlocks: () => rpc<string[]>("my_blocks"),

    adminSetRole: (u, role) => rpc("admin_set_role", { p_username: u, p_role: role }),
    adminGift: (u, n) => rpc("admin_gift", { p_username: u, p_amount: n }),
    adminKick: (u) => rpc("admin_kick", { p_username: u }),
    adminAnnounce: (text) => rpc("admin_announce", { p_text: text }),
    adminDance: (room, on) => rpc("admin_dance", { p_room: room, p_on: on }),
    adminClearRoom: (room) => rpc("admin_clear_room", { p_room: room }),
    adminMute: (u, m) => rpc("admin_mute", { p_username: u, p_minutes: m }),
    adminUnmute: (u) => rpc("admin_unmute", { p_username: u }),
    adminBan: (u, h) => rpc("admin_ban", { p_username: u, p_hours: h }),
    adminUnban: (u) => rpc("admin_unban", { p_username: u }),
    adminStartQuiz: (q, a, reward, seconds) => rpc("admin_start_quiz", { p_question: q, p_answer: a, p_reward: reward, p_seconds: seconds }),
    adminReports: () => rpc<Report[]>("admin_list_reports"),
    adminCloseReport: (id) => rpc("admin_close_report", { p_id: id }),
    adminLog: () => rpc<AdminLogEntry[]>("admin_get_log"),

    subscribeRoom(slug, cb) {
      const ch = sb
        .channel(`db-room:${slug}:${rid()}`)
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "rooms", filter: `slug=eq.${slug}` }, (payload) => {
          const f = (payload.new as { furni?: unknown }).furni;
          if (Array.isArray(f)) {
            if (f.length === 0 && !isHomeSlug(slug)) {
              cb(structuredClone(resolveRoom(slug)?.defaultFurni ?? []));
            } else {
              cb(f as FurniItem[]);
            }
          }
        })
        .subscribe();
      return () => void sb.removeChannel(ch);
    },

    subscribeAdminEvents(cb) {
      const ch = sb
        .channel(`db-admin-events:${rid()}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "admin_events" }, (payload) => cb(payload.new as AdminEvent))
        .subscribe();
      return () => void sb.removeChannel(ch);
    },

    subscribeChat(slug, uid, onChat, onWhisper) {
      const ch = sb
        .channel(`db-chat:${slug}:${rid()}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `room=eq.${slug}` }, (p) => onChat(p.new as ChatRow))
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `target_id=eq.${uid}` }, (p) => onWhisper(p.new as ChatRow))
        .subscribe();
      return () => void sb.removeChannel(ch);
    },

    subscribeUserEvents(uid, cb) {
      const ch = sb
        .channel(`db-user-events:${rid()}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "user_events", filter: `target_id=eq.${uid}` }, (p) => cb(p.new as UserEvent))
        .subscribe();
      return () => void sb.removeChannel(ch);
    },
  };
}

function createDemoBackend(): Backend {
  let me: Profile | null = null;
  const rooms: Record<string, FurniItem[]> = {};
  const roomListeners = new Map<string, Set<(f: FurniItem[]) => void>>();
  const eventListeners = new Set<(e: AdminEvent) => void>();
  let eventSeq = 0;

  const known: Record<string, UserRole> = { cemre: "vip", deniz: "user" };
  let friends: Friend[] = [];
  let quiz: { question: string; answer: string; reward: number; endsAt: number; active: boolean } | null = null;
  let reports: Report[] = [];
  let log: AdminLogEntry[] = [];
  let reportSeq = 0;
  const homeAccess: HomeAccess[] = ["open"];
  let demoHomeSize: number | null = null;
  const homeStyles = new Map<string, { wall: string; floor: string }>();
  const homeLikes = new Map<string, number>();
  const homeLiked = new Set<string>();
  const userListeners = new Set<(e: UserEvent) => void>();
  let userSeq = 0;
  const userEmit = (kind: string, payload: Record<string, unknown>) => {
    const ev: UserEvent = { id: ++userSeq, kind, payload };
    setTimeout(() => userListeners.forEach((cb) => cb(ev)), 0);
  };
  const QUEST_DEFS: Record<string, { goal: number; coins: number; xp: number }> = {
    fish_5: { goal: 5, coins: 150, xp: 40 },
    sell_1: { goal: 1, coins: 60, xp: 20 },
    chat_5: { goal: 5, coins: 50, xp: 15 },
    gift_1: { goal: 1, coins: 100, xp: 30 },
    room_3: { goal: 3, coins: 40, xp: 10 },
  };
  let fishCaught = 0;
  const questProgress: Record<string, number> = {};
  const questClaimed = new Set<string>();
  const achieved = new Set<string>();
  let listings: (Listing & { sellerIsMe: boolean })[] = [
    { id: 1, seller: "Cemre", item: "lamp", price: 120, mine: false, for_user: null, sellerIsMe: false },
    { id: 2, seller: "Cemre", item: "fish_levrek", price: 70, mine: false, for_user: null, sellerIsMe: false },
  ];
  let listingSeq = 2;
  let tournament: { endsAt: number; scores: Record<string, number> } | null = null;
  let demoPos = { gx: 6, gy: 6 };
  const farm: Record<number, { crop: string; readyAt: number }> = {};
  let guild: { name: string; tag: string; bank: number; members: string[] } | null = null;
  const guildLevel = (bank: number) => Math.floor(Math.sqrt(bank / 500)) + 1;
  const guildView = (): GuildInfo | null =>
    guild
      ? {
          name: guild.name,
          tag: guild.tag,
          bank: guild.bank,
          level: guildLevel(guild.bank),
          cap: 10 + 5 * (guildLevel(guild.bank) - 1),
          owner: guild.members[0] === me?.username,
          members: guild.members.map((u, i) => ({ username: u, level: 1, owner: i === 0 })),
        }
      : null;
  let flag: { room: string; gx: number; gy: number; prize: number; endsAt: number } | null = null;
  let bj: { bet: number; player: number[]; dealer: number[] } | null = null;
  const card = () => 1 + Math.floor(Math.random() * 13);
  const bjTotal = (a: number[]) => {
    let t = 0;
    let aces = 0;
    for (const c of a) {
      if (c === 1) {
        aces++;
        t += 11;
      } else t += Math.min(c, 10);
    }
    while (t > 21 && aces > 0) {
      t -= 10;
      aces--;
    }
    return t;
  };
  const bjView = (done: boolean, result: BjState["result"], delta: number): BjState => ({
    bet: bj!.bet,
    player: [...bj!.player],
    dealer: done ? [...bj!.dealer] : [bj!.dealer[0], 0],
    player_total: bjTotal(bj!.player),
    dealer_total: done ? bjTotal(bj!.dealer) : null,
    done,
    result,
    coins: me?.coins ?? 0,
    delta,
  });
  const bjFinish = (result: NonNullable<BjState["result"]>): BjState => {
    const p = need();
    const g = bj!;
    const payout = result === "blackjack" ? Math.floor((g.bet * 5) / 2) : result === "win" ? g.bet * 2 : result === "push" ? g.bet : 0;
    p.coins += payout;
    const view = bjView(true, result, payout - g.bet);
    bj = null;
    if (result === "win" || result === "blackjack") addXp(8);
    return view;
  };
  const demoStand = (): BjState => {
    const g = bj!;
    while (bjTotal(g.dealer) < 17) g.dealer.push(card());
    const pt = bjTotal(g.player);
    const dt = bjTotal(g.dealer);
    return bjFinish(dt > 21 || pt > dt ? "win" : pt === dt ? "push" : "lose");
  };
  const prog = (key: string, n = 1) => {
    const def = QUEST_DEFS[key];
    if (def && !questClaimed.has(key)) questProgress[key] = Math.min(def.goal, (questProgress[key] ?? 0) + n);
  };
  const ach = (key: string) => {
    if (achieved.has(key)) return;
    achieved.add(key);
    need().coins += 50;
    userEmit("achievement", { key, reward: 50 });
  };
  const badgeCount = new Map<string, number>();
  const badgeOwned: string[] = [];
  let wheelAt = 0;
  const tetrisDemo = { day: "", earned: 0, best: 0, wins: 0 };
  const demoBlocks = new Set<string>();
  const demoEvents: (GameEvent & { ended: boolean })[] = [];
  const demoClaims = new Set<string>();
  const evMult = () => {
    const now = Date.now();
    return demoEvents.reduce((m, e) => (!e.ended && new Date(e.startsAt).getTime() <= now && new Date(e.endsAt).getTime() > now ? Math.max(m, e.coinMult) : m), 1);
  };
  const bump = (key: string, n = 1) => {
    const th = BADGE_BY_KEY[key]?.thresholds;
    if (!th) return;
    const old = badgeTier(th, badgeCount.get(key) ?? 0);
    const cnt = (badgeCount.get(key) ?? 0) + n;
    badgeCount.set(key, cnt);
    const nt = badgeTier(th, cnt);
    if (nt > old) {
      let reward = 0;
      for (let i = old + 1; i <= nt; i++) reward += BADGE_REWARDS[i - 1];
      need().coins += reward;
      userEmit("badge", { key, tier: nt, reward });
    }
  };
  const grantBadge = (key: string) => {
    if (badgeOwned.includes(key)) return;
    badgeOwned.push(key);
    userEmit("badge", { key, tier: 0, reward: 0 });
  };
  const badgeState = (): BadgeState => ({
    tiers: [...badgeCount.entries()].map(([key, count]) => ({ key, count, tier: badgeTier(BADGE_BY_KEY[key]?.thresholds ?? [], count) })),
    owned: [...badgeOwned],
  });
  const addXp = (n: number) => {
    const p = need();
    const lo = levelOf(p.xp);
    p.xp += n;
    const ln = levelOf(p.xp);
    if (ln > lo) {
      userEmit("level_up", { level: ln });
      if (ln >= 5) ach("lvl_5");
      if (ln >= 10) ach("lvl_10");
    }
  };
  const closeTournament = () => {
    if (!tournament || tournament.endsAt > Date.now()) return;
    const top = Object.entries(tournament.scores).sort((a, b) => b[1] - a[1])[0];
    const p = need();
    if (top && top[0] === p.username) {
      p.coins += 500;
      addXp(100);
      ach("tournament_win");
      userEmit("tournament_prize", { place: 1, prize: 500 });
    }
    emit("tournament_end", null, null, { winner: top?.[0] ?? null, score: top?.[1] ?? null });
    tournament = null;
  };

  const uid = () => Math.random().toString(36).slice(2, 10);
  const need = () => {
    if (!me) throw new Error("Giriş yapmalısın.");
    return me;
  };
  const room = (slug: string) => (rooms[slug] ??= structuredClone(resolveRoom(slug)?.defaultFurni ?? []));
  const pushRoom = (slug: string) => roomListeners.get(slug)?.forEach((cb) => cb(structuredClone(room(slug))));
  const emit = (kind: AdminEvent["kind"], roomSlug: string | null, target: string | null, payload: Record<string, unknown>) => {
    const ev: AdminEvent = { id: ++eventSeq, kind, room: roomSlug, target, payload, by_username: need().username };
    setTimeout(() => eventListeners.forEach((cb) => cb(ev)), 0);
  };
  const addLog = (action: string, target: string | null, detail: string | null) => {
    log = [{ id: log.length + 1, admin: need().username, action, target, detail, created_at: new Date().toISOString() }, ...log].slice(0, 30);
  };
  const fp = (type: FurniType, rot: number) => {
    const d = FURNI_BY_TYPE[type];
    const w = d.wTiles ?? 1;
    const h = d.hTiles ?? 1;
    return rot === 1 ? { w: h, h: w } : { w, h };
  };
  /** Çok kareli eşyalar dahil dikdörtgen kesişim kontrolü (sunucudaki _tile_free ile aynı mantık) */
  const tileFree = (list: FurniItem[], type: FurniType, gx: number, gy: number, rot = 0) => {
    const n = fp(type, rot);
    return !list.some((f) => {
      const o = fp(f.type, f.rot ?? 0);
      return (
        f.gx < gx + n.w && gx < f.gx + o.w && f.gy < gy + n.h && gy < f.gy + o.h && FURNI_BY_TYPE[f.type].floor === FURNI_BY_TYPE[type].floor
      );
    });
  };
  const checkPlace = (slug: string, type: FurniType, gx: number, gy: number, rot = 0) => {
    const r = resolveRoom(slug);
    if (!r) throw new Error("Oda bulunamadı.");
    const p = need();
    if (ROLE_RANK[p.role] < ROLE_RANK[r.minRole]) throw new Error("Bu odaya erişimin yok.");
    if (isHomeSlug(slug) && slug !== homeSlug(p.username) && p.role !== "admin") throw new Error("Bu oda sana ait değil.");
    if (!tileFree(room(slug), type, gx, gy, rot)) throw new Error("Bu kare dolu.");
    if (room(slug).length >= 80) throw new Error("Oda dolu (en fazla 80 eşya).");
  };
  const requireSelf = (username: string) => {
    if (username.toLowerCase() !== need().username.toLowerCase()) throw new Error("Demo modunda sadece kendi hesabına işlem yapabilirsin.");
  };
  const requireKnown = (username: string) => {
    if (!(username.toLowerCase() in known)) throw new Error("Bu kullanıcı adına sahip hesap bulunamadı. (Demo'da: Cemre, Deniz)");
  };
  const demoOnly = (): never => {
    throw new Error("Bu işlem demo modunda kullanılamıyor.");
  };

  return {
    online: false,
    async restoreSession() {
      return null;
    },
    async signIn() {
      throw new Error("Sunucu bağlantısı yapılandırılmamış. Demo'yu kullan.");
    },
    async signUp() {
      throw new Error("Sunucu bağlantısı yapılandırılmamış. Demo'yu kullan.");
    },
    enterDemo(username) {
      me = {
        id: "demo-me",
        xp: 0,
        pet: null,
        room: null,
        username,
        role: "admin",
        isFounder: true,
        coins: 1250,
        shirtColor: "#2563eb",
        hairColor: "#1e293b",
        skinColor: "#fed7aa",
        hat: null,
        glasses: null,
        top: null,
        back: null,
        status: null,
        hairStyle: "hs_short",
        wardrobe: [],
        inventory: ["suvari_ati"],
        tool: null,
        canClaimDaily: true,
        dailyStreak: 0,
        streakNext: 1,
        kickedUntil: null,
        mutedUntil: null,
      };
      friends = [
        { username: "Cemre", role: "vip", relation: "friend", online: true, room: "cadde-1", home: null },
        { username: "Deniz", role: "user", relation: "incoming", online: false, room: null, home: null },
      ];
      return { ...me };
    },
    async signOut() {
      me = null;
    },
    async getProfile() {
      return { ...need() };
    },
    async activeEvents() {
      const now = Date.now();
      return demoEvents
        .filter((e) => !e.ended && new Date(e.endsAt).getTime() > now)
        .map(({ ended: _ended, ...e }) => ({ ...e, active: new Date(e.startsAt).getTime() <= now, claimed: demoClaims.has(e.id) }));
    },
    async claimEventReward(id) {
      const p = need();
      const e = demoEvents.find((x) => x.id === id);
      if (!e || e.ended || new Date(e.startsAt).getTime() > Date.now()) throw new Error("Etkinlik şu an aktif değil.");
      if (e.reward <= 0) throw new Error("Bu etkinliğin ödülü yok.");
      if (demoClaims.has(id)) throw new Error("Etkinlik ödülünü zaten aldın.");
      demoClaims.add(id);
      p.coins += e.reward;
      return p.coins;
    },
    async adminCreateEvent(e) {
      const p = need();
      if (p.role !== "admin") throw new Error("Bu işlem için admin yetkisi gerekli.");
      const start = Date.now() + e.startInMin * 60000;
      demoEvents.push({
        id: `ev_${Date.now()}`,
        title: e.title.slice(0, 60),
        description: e.description.slice(0, 200),
        theme: e.theme,
        coinMult: Math.max(1, Math.min(5, e.mult)),
        reward: Math.max(0, Math.min(5000, e.reward)),
        startsAt: new Date(start).toISOString(),
        endsAt: new Date(start + e.hours * 3600000).toISOString(),
        active: false,
        claimed: false,
        ended: false,
      });
    },
    async adminEndEvent(id) {
      const e = demoEvents.find((x) => x.id === id);
      if (e) e.ended = true;
    },
    async wheelStatus() {
      const left = Math.max(0, Math.ceil((wheelAt + 86400000 - Date.now()) / 1000));
      return { ready: left === 0, seconds: left };
    },
    async tetrisSubmit(mode, score, lines, secs) {
      const p = need();
      if (secs < 5 || score > secs * 400 || lines > secs * 0.9 + 4) throw new Error("Geçersiz skor.");
      const day = new Date().toISOString().slice(0, 10);
      if (tetrisDemo.day !== day) {
        tetrisDemo.day = day;
        tetrisDemo.earned = 0;
      }
      let prize = mode === "solo" ? Math.floor(score / 1000) * 25 : 200;
      prize = Math.min(prize, Math.max(0, 800 - tetrisDemo.earned));
      prize = prize * evMult();
      tetrisDemo.earned += prize;
      p.coins += prize;
      if (mode === "solo") tetrisDemo.best = Math.max(tetrisDemo.best, score);
      else tetrisDemo.wins++;
      return { prize, coins: p.coins, best: tetrisDemo.best, capped: tetrisDemo.earned >= 800 };
    },
    async tetrisBoard() {
      const p = need();
      return {
        solo: [{ username: "Cemre", score: 14200 }, { username: "Kaan", score: 9800 }, ...(tetrisDemo.best ? [{ username: p.username, score: tetrisDemo.best }] : [])].sort((a, b) => b.score - a.score),
        duel: [{ username: "Cemre", wins: 7 }, ...(tetrisDemo.wins ? [{ username: p.username, wins: tetrisDemo.wins }] : [])].sort((a, b) => b.wins - a.wins),
      };
    },
    async spinWheel() {
      const p = need();
      if (Date.now() - wheelAt < 86400000) throw new Error("Çarkı bugün zaten çevirdin.");
      const weights = [20, 18, 14, 8, 4, 1, 20, 15];
      let r = Math.random() * 100;
      let index = 0;
      for (let i = 0; i < weights.length; i++) {
        r -= weights[i];
        if (r < 0) {
          index = i;
          break;
        }
      }
      const prize = WHEEL_PRIZES[index] * evMult();
      p.coins += prize;
      wheelAt = Date.now();
      return { index, prize, coins: p.coins };
    },
    async claimDaily() {
      const p = need();
      if (!p.canClaimDaily) throw new Error("Günlük ödülü zaten aldın.");
      p.coins += DAILY_REWARDS[(p.streakNext ?? 1) - 1] * evMult();
      p.dailyStreak = p.streakNext ?? 1;
      p.streakNext = (p.dailyStreak % 7) + 1;
      p.canClaimDaily = false;
      bump("login");
      return p.coins;
    },
    async setLook(l) {
      Object.assign(need(), l);
    },

    async buyAndPlace(slug, type, gx, gy, rot) {
      const p = need();
      checkPlace(slug, type, gx, gy, rot);
      const price = FURNI_BY_TYPE[type].price;
      if (p.role !== "admin") {
        if (p.coins < price) throw new Error("Yeterli Sanilin yok.");
        p.coins -= price;
      }
      room(slug).push({ id: uid(), type, gx, gy, rot, owner: p.username });
      pushRoom(slug);
      return p.coins;
    },
    async placeFromBag(slug, type, gx, gy, rot) {
      const p = need();
      const idx = p.inventory.indexOf(type);
      if (idx < 0) throw new Error("Bu eşya çantanda yok.");
      checkPlace(slug, type, gx, gy, rot);
      p.inventory.splice(idx, 1);
      room(slug).push({ id: uid(), type, gx, gy, rot, owner: p.username });
      pushRoom(slug);
      return [...p.inventory];
    },
    async nudgeFurni(slug, id, ox, oy, sc, gx, gy) {
      const p = need();
      const item = room(slug).find((f) => f.id === id);
      if (!item) throw new Error("Eşya bulunamadı.");
      const ownsRoom = slug === homeSlug(p.username);
      if (p.role !== "admin" && !ownsRoom && item.owner !== p.username) throw new Error("Bu eşya sana ait değil.");
      item.ox = Math.max(-200, Math.min(200, Math.round(ox)));
      item.oy = Math.max(-200, Math.min(200, Math.round(oy)));
      item.sc = Math.max(50, Math.min(200, Math.round(sc)));
      if (gx !== undefined) item.gx = gx;
      if (gy !== undefined) item.gy = gy;
    },
    async pickup(slug, id) {
      const p = need();
      const list = room(slug);
      const item = list.find((f) => f.id === id);
      if (!item) throw new Error("Eşya bulunamadı.");
      const ownsRoom = slug === homeSlug(p.username);
      if (p.role !== "admin" && !ownsRoom && item.owner !== p.username) throw new Error("Bu eşya sana ait değil.");
      rooms[slug] = list.filter((f) => f.id !== id);
      p.inventory.push(item.type);
      pushRoom(slug);
      return [...p.inventory];
    },
    async loadRoom(slug) {
      return structuredClone(room(slug));
    },
    async enterRoom(slug) {
      const r = resolveRoom(slug);
      if (!r) throw new Error("Oda bulunamadı.");
      if (ROLE_RANK[need().role] < ROLE_RANK[r.minRole]) throw new Error("Bu odaya erişimin yok.");
      prog("room_3");
    },
    async ensureHome() {
      const p = need();
      if (demoHomeSize === null) throw new Error("Henüz bir evin yok. Cadde 1'deki Emlak Ofisi'nden ev satın alabilirsin.");
      return homeSlug(p.username);
    },
    async getMyHomeSize() {
      return demoHomeSize;
    },
    async buyHome(size) {
      const p = need();
      if (!HOME_SALE_SIZES.includes(size)) throw new Error("Bu boyutta satılık ev yok.");
      if (demoHomeSize !== null) throw new Error("Zaten bir evin var. Büyütmek için evinde düzenleme modunu kullan.");
      const price = p.role === "admin" ? 0 : homePrice(size);
      if (p.coins < price) throw new Error("Yeterli Sanilin yok.");
      p.coins -= price;
      const slug = homeSlug(p.username);
      const mk = (type: FurniType, gx: number, gy: number): FurniItem => ({ id: uid(), type, gx, gy, rot: 0, owner: p.username });
      const m = Math.floor(size / 2);
      const list = [mk("rug", m, m), mk("sofa", 1, 1), mk("plant", size - 1, 0), mk("lamp", 0, size - 1)];
      if (size >= 6) list.push(mk("bookshelf", m, 0), mk("tv", size - 2, 0));
      rooms[slug] = list;
      demoHomeSize = size;
      registerHomeSize(slug, size);
      grantBadge("sp_homeowner");
      return { coins: p.coins, slug, size, price };
    },
    async expandHome(size) {
      const p = need();
      if (demoHomeSize === null) throw new Error("Henüz bir evin yok.");
      if (!homePrice(size) || size <= demoHomeSize) throw new Error("Geçersiz genişletme boyutu.");
      const price = p.role === "admin" ? 0 : homeExpandPrice(demoHomeSize, size);
      if (p.coins < price) throw new Error("Yeterli Sanilin yok.");
      p.coins -= price;
      demoHomeSize = size;
      registerHomeSize(homeSlug(p.username), size);
      grantBadge("sp_expander");
      return { coins: p.coins, size, price };
    },
    async getBadges() {
      return badgeState();
    },
    async popularHomes() {
      const list: PopularHome[] = [
        { slug: "home-cemre", owner: "Cemre", size: 8, likes: 42 },
        { slug: "home-deniz", owner: "Deniz", size: 12, likes: 17 },
      ];
      const p = need();
      if (demoHomeSize !== null) list.push({ slug: homeSlug(p.username), owner: p.username, size: demoHomeSize, likes: homeLikes.get(homeSlug(p.username)) ?? 0 });
      return list.sort((a, b) => b.likes - a.likes);
    },
    async buyBadge(key) {
      const p = need();
      const price = BADGE_BY_KEY[key]?.price;
      if (!price) throw new Error("Bu rozet satılmıyor.");
      if (badgeOwned.includes(key)) throw new Error("Bu rozete zaten sahipsin.");
      if (p.role !== "admin") {
        if (p.coins < price) throw new Error("Yeterli Sanilin yok.");
        p.coins -= price;
      }
      badgeOwned.push(key);
      return { coins: p.coins, key };
    },
    async claimGuideGift() {
      const p = need();
      if (p.guideGift) throw new Error("Hoş geldin hediyeni zaten aldın.");
      p.guideGift = true;
      p.coins += 300;
      grantBadge("sp_welcome");
      return { coins: p.coins, reward: 300 };
    },
    async setHomeAccess(a) {
      homeAccess[0] = a;
    },
    async getRoomStyle(slug) {
      const st = homeStyles.get(slug);
      const own = slug === homeSlug(need().username);
      return { wall: st?.wall ?? "w_pink", floor: st?.floor ?? "f_wood", likes: homeLikes.get(slug) ?? 0, size: own && demoHomeSize !== null ? demoHomeSize : 12 };
    },
    async setHomeStyle(wall, floor) {
      const p = need();
      const cur = homeStyles.get(homeSlug(p.username)) ?? { wall: "w_pink", floor: "f_wood" };
      const price = (id: string, list: { id: string; price: number }[]) => list.find((x) => x.id === id)?.price;
      const w = price(wall, HOME_WALLS);
      const f = price(floor, HOME_FLOORS);
      if (w === undefined || f === undefined) throw new Error("Geçersiz stil.");
      const cost = p.role === "admin" ? 0 : (wall !== cur.wall ? w : 0) + (floor !== cur.floor ? f : 0);
      if (p.coins < cost) throw new Error("Yeterli Sanilin yok.");
      p.coins -= cost;
      homeStyles.set(homeSlug(p.username), { wall, floor });
      for (const cb of roomListeners.get(homeSlug(p.username)) ?? []) cb(structuredClone(room(homeSlug(p.username))));
      return p.coins;
    },
    async likeHome(slug) {
      const p = need();
      if (slug === homeSlug(p.username)) throw new Error("Kendi odanı beğenemezsin.");
      const key = `${p.username}:${slug}`;
      if (!homeLiked.has(key)) {
        homeLiked.add(key);
        homeLikes.set(slug, (homeLikes.get(slug) ?? 0) + 1);
        bump("like");
      }
      return homeLikes.get(slug) ?? 0;
    },
    async setStatus(text) {
      const p = need();
      p.status = text.replace(/[\u0000-\u001f]/g, "").trim().slice(0, 40) || null;
    },

    async sendChat(_room, text, target) {
      const p = need();
      const t = text.trim();
      if (t.length < 1 || t.length > 140) throw new Error("Mesaj 1-140 karakter olmalı.");
      if (target) {
        if (ROLE_RANK[p.role] < 1) throw new Error("Özel mesaj (/pm) sadece VIP ve üstü içindir.");
        requireKnown(target);
      } else prog("chat_5");
    },
    async rollDice() {
      return 1 + Math.floor(Math.random() * 6);
    },
    async heartbeat() {
      return { kickedUntil: null, mutedUntil: null };
    },
    async publicProfiles(names) {
      const out: PublicProfile[] = [];
      for (const n of names) {
        if (me && n === me.username) out.push({ id: me.id, username: n, role: me.role });
        else if (n.toLowerCase() in known) out.push({ username: n, role: known[n.toLowerCase()] });
      }
      return out;
    },

    async getFriends() {
      return structuredClone(friends);
    },
    async friendRequest(username) {
      requireKnown(username);
      if (friends.some((f) => f.username.toLowerCase() === username.toLowerCase())) throw new Error("Zaten listende.");
      friends.push({ username, role: known[username.toLowerCase()], relation: "outgoing", online: false, room: null, home: null });
    },
    async friendRespond(username, accept) {
      const f = friends.find((x) => x.username.toLowerCase() === username.toLowerCase() && x.relation === "incoming");
      if (!f) throw new Error("Bekleyen istek bulunamadı.");
      if (accept) f.relation = "friend";
      else friends = friends.filter((x) => x !== f);
    },
    async friendRemove(username) {
      friends = friends.filter((x) => x.username.toLowerCase() !== username.toLowerCase());
    },
    async giftCoins(username, amount) {
      const p = need();
      requireKnown(username);
      if (amount < 1) throw new Error("Geçersiz miktar.");
      if (p.role !== "admin") {
        if (p.coins < amount) throw new Error("Yeterli Sanilin yok.");
        p.coins -= amount;
      }
      prog("gift_1");
      return p.coins;
    },
    async giftItem(username, item) {
      const p = need();
      requireKnown(username);
      if (!isFurniType(item)) throw new Error("Bu eşya hediye edilemez.");
      const idx = p.inventory.indexOf(item);
      if (idx < 0) throw new Error("Bu eşya çantanda yok.");
      p.inventory.splice(idx, 1);
      prog("gift_1");
      return [...p.inventory];
    },

    async buyCosmetic(id) {
      const p = need();
      const c = COSMETIC_BY_ID[id];
      if (!c || c.price === 0) throw new Error("Bilinmeyen ürün.");
      if (p.wardrobe.includes(id)) throw new Error("Bu ürüne zaten sahipsin.");
      if (p.role !== "admin") {
        if (p.coins < c.price) throw new Error("Yeterli Sanilin yok.");
        p.coins -= c.price;
      }
      p.wardrobe.push(id);
      return { coins: p.coins, wardrobe: [...p.wardrobe] };
    },
    async buyBundle(id) {
      const p = need();
      const bd = BUNDLE_BY_ID[id];
      if (!bd) throw new Error("Bilinmeyen paket.");
      const furniPack = id.startsWith("fp_");
      let total = 0;
      let fresh: string[] = bd.items;
      if (furniPack) {
        if (p.inventory.length + bd.items.length > 60) throw new Error("Çantanda yer yok (en fazla 60 eşya).");
        for (const t of bd.items) total += FURNI_BY_TYPE[t as keyof typeof FURNI_BY_TYPE].price;
      } else {
        fresh = bd.items.filter((i) => !p.wardrobe.includes(i));
        if (!fresh.length) throw new Error("Bu setin hepsine zaten sahipsin.");
        for (const i of fresh) total += COSMETIC_BY_ID[i].price;
      }
      const price = Math.floor(total * 0.8);
      if (p.role !== "admin") {
        if (p.coins < price) throw new Error("Yeterli Sanilin yok.");
        p.coins -= price;
      }
      if (furniPack) {
        p.inventory.push(...bd.items);
        bump("shop");
        return { coins: p.coins, price, inventory: [...p.inventory] };
      }
      p.wardrobe.push(...fresh);
      bump("shop");
      return { coins: p.coins, price, wardrobe: [...p.wardrobe] };
    },
    async equipCosmetic(slot, id) {
      const p = need();
      if (id === null) {
        if (slot === "hat") p.hat = null;
        else if (slot === "glasses") p.glasses = null;
        else if (slot === "top") p.top = null;
        else if (slot === "back") p.back = null;
        else if (slot === "pet") p.pet = null;
        else p.hairStyle = "hs_short";
        return;
      }
      if (id !== "hs_short" && !p.wardrobe.includes(id)) throw new Error("Bu ürüne sahip değilsin.");
      if (slot === "hat") p.hat = id;
      else if (slot === "glasses") p.glasses = id;
      else if (slot === "top") p.top = id;
      else if (slot === "back") p.back = id;
      else if (slot === "pet") p.pet = id;
      else p.hairStyle = id;
    },

    async buyFishingRod() {
      const p = need();
      if (p.inventory.includes("fishing_rod")) throw new Error("Zaten bir oltan var.");
      if (p.role !== "admin") {
        if (p.coins < ROD_PRICE) throw new Error("Yeterli Sanilin yok (olta 200 Sanil).");
        p.coins -= ROD_PRICE;
      }
      p.inventory.push("fishing_rod");
      p.tool = "fishing_rod";
      return { coins: p.coins, inventory: [...p.inventory], tool: p.tool };
    },
    async equipTool(tool) {
      const p = need();
      if (tool === "fishing_rod" && !p.inventory.includes("fishing_rod")) throw new Error("Oltan yok.");
      if (tool !== null && tool !== "fishing_rod" && tool !== "newspaper") throw new Error("Geçersiz alet.");
      p.tool = tool;
      return tool;
    },
    async catchFish(slug) {
      const p = need();
      if (slug !== "iskele") throw new Error("Burada balık tutamazsın; iskeleye git.");
      if (p.tool !== "fishing_rod") throw new Error("Önce oltanı kuşan.");
      const roll = Math.floor(Math.random() * 100);
      const item = roll < 15 ? "fish_boot" : roll < 45 ? "fish_hamsi" : roll < 70 ? "fish_cipura" : roll < 88 ? "fish_levrek" : roll < 96 ? "fish_shark" : "fish_treasure";
      p.inventory.push(item);
      closeTournament();
      if (tournament) tournament.scores[p.username] = (tournament.scores[p.username] ?? 0) + FISH_PRICES[item];
      prog("fish_5");
      addXp({ fish_boot: 2, fish_hamsi: 5, fish_cipura: 8, fish_levrek: 12, fish_shark: 30, fish_treasure: 60 }[item] ?? 5);
      fishCaught += 1;
      bump("fish");
      ach("first_fish");
      if (item === "fish_shark") ach("shark");
      if (item === "fish_treasure") ach("treasure");
      if (fishCaught >= 50) ach("fish_50");
      return { item, value: FISH_PRICES[item], inventory: [...p.inventory] };
    },
    async sellFish(item) {
      const p = need();
      let earned = 0;
      let sold = 0;
      const kept: string[] = [];
      for (const k of p.inventory) {
        const price = FISH_PRICES[k];
        if (price !== undefined && (!item || (k === item && sold === 0))) {
          earned += price;
          sold += 1;
        } else kept.push(k);
      }
      if (sold === 0) throw new Error("Satacak balığın yok.");
      p.inventory = kept;
      p.coins += earned;
      prog("sell_1");
      addXp(Math.max(1, Math.floor(earned / 10)));
      return { earned, sold, coins: p.coins, inventory: [...kept] };
    },

    async answerQuiz(text) {
      const p = need();
      if (!quiz || !quiz.active || quiz.endsAt <= Date.now()) throw new Error("Şu an aktif bir yarışma yok.");
      const norm = (s: string) => s.trim().toLocaleLowerCase("tr");
      if (norm(text) !== norm(quiz.answer)) return { correct: false };
      quiz.active = false;
      p.coins += quiz.reward;
      addXp(50);
      ach("quiz_win");
      emit("quiz_end", null, null, { winner: p.username, reward: quiz.reward, answer: text.trim() });
      return { correct: true, reward: quiz.reward };
    },
    async blockUser(username) {
      need();
      requireKnown(username);
      demoBlocks.add(username);
    },
    async unblockUser(username) {
      demoBlocks.delete(username);
    },
    async myBlocks() {
      return [...demoBlocks];
    },
    async reportPlayer(username, reason) {
      const p = need();
      requireKnown(username);
      reports = [
        { id: ++reportSeq, reporter: p.username, target: username, reason, room: null, context: [{ text: "(demo) örnek mesaj", at: new Date().toISOString() }], created_at: new Date().toISOString() },
        ...reports,
      ];
    },

    async adminSetRole(username, role) {
      requireSelf(username);
      const p = need();
      p.role = role;
      p.inventory = role === "suvari" || role === "admin" ? (p.inventory.includes("suvari_ati") ? p.inventory : ["suvari_ati", ...p.inventory]) : p.inventory.filter((i) => i !== "suvari_ati");
      addLog("role", username, role);
      emit("role", null, p.username, { role });
    },
    async adminGift(username, amount) {
      requireSelf(username);
      need().coins += amount;
      addLog("gift", username, String(amount));
      emit("gift", null, username, { amount });
    },
    async adminKick() {
      demoOnly();
    },
    async adminAnnounce(text) {
      emit("announce", null, null, { text: text.slice(0, 140) });
    },
    async adminDance(slug, on) {
      emit("dance", slug, null, { on });
    },
    async adminClearRoom(slug) {
      rooms[slug] = [];
      pushRoom(slug);
      addLog("clear_room", slug, null);
      emit("clear_room", slug, null, {});
    },
    async adminMute() {
      demoOnly();
    },
    async adminUnmute() {
      demoOnly();
    },
    async adminBan() {
      demoOnly();
    },
    async adminUnban() {
      demoOnly();
    },
    async getQuests(): Promise<Quest[]> {
      need();
      return Object.entries(QUEST_DEFS).map(([key, d]) => ({
        key,
        goal: d.goal,
        progress: questProgress[key] ?? 0,
        claimed: questClaimed.has(key),
        coins: d.coins,
        xp: d.xp,
      }));
    },
    async claimQuest(key) {
      const p = need();
      const d = QUEST_DEFS[key];
      if (!d || questClaimed.has(key) || (questProgress[key] ?? 0) < d.goal) throw new Error("Görev tamamlanmadı ya da ödül zaten alındı.");
      questClaimed.add(key);
      p.coins += d.coins;
      addXp(d.xp);
      return { coins: p.coins, xp: p.xp };
    },
    async getProfileCard(username): Promise<ProfileCard> {
      const p = need();
      const self = username.toLowerCase() === p.username.toLowerCase();
      if (!self) requireKnown(username);
      const role = self ? p.role : known[username.toLowerCase()];
      const xp = self ? p.xp : 420;
      return {
        username: self ? p.username : username[0].toUpperCase() + username.slice(1).toLowerCase(),
        role,
        xp,
        level: levelOf(xp),
        fish_caught: self ? fishCaught : 37,
        joined: new Date().toISOString(),
        status_text: self ? (p.status ?? null) : null,
        friends: self ? friends.filter((f) => f.relation === "friend").length : 4,
        achievements: self ? [...achieved] : ["first_fish", "lvl_5"],
        badges: self ? { ...badgeState(), tiers: badgeState().tiers.filter((t) => t.tier > 0) } : { tiers: [{ key: "fish", count: 37, tier: 1 }, { key: "shop", count: 3, tier: 1 }], owned: ["b_autumn"] },
      };
    },
    async marketGet(): Promise<Listing[]> {
      const p = need();
      return listings
        .filter((l) => !l.for_user || l.for_user.toLowerCase() === p.username.toLowerCase() || l.sellerIsMe)
        .map(({ sellerIsMe, ...l }) => ({ ...l, mine: sellerIsMe }))
        .reverse();
    },
    async marketList(item, price, forUser) {
      const p = need();
      const isCos = (COSMETIC_BY_ID[item]?.price ?? 0) > 0;
      if (!isCos && (item === "suvari_ati" || (!isFurniType(item) && FISH_PRICES[item] === undefined))) throw new Error("Bu eşya satılamaz.");
      if (!Number.isFinite(price) || price < 1 || price > 100000) throw new Error("Fiyat 1 ile 100.000 Sanil arasında olmalı.");
      const idx = isCos ? p.wardrobe.indexOf(item) : p.inventory.indexOf(item);
      if (idx < 0) throw new Error(isCos ? "Bu kıyafet gardırobunda yok." : "Bu eşya çantanda yok.");
      if (listings.filter((l) => l.sellerIsMe).length >= 10) throw new Error("En fazla 10 ilanın olabilir.");
      if (forUser?.trim()) requireKnown(forUser.trim());
      if (isCos) {
        p.wardrobe.splice(idx, 1);
        if (p.hat === item) p.hat = null;
        if (p.glasses === item) p.glasses = null;
        if (p.top === item) p.top = null;
        if (p.back === item) p.back = null;
        if (p.pet === item) p.pet = null;
        if (p.hairStyle === item) p.hairStyle = "hs_short";
      } else p.inventory.splice(idx, 1);
      listings.push({ id: ++listingSeq, seller: p.username, item, price, mine: true, for_user: forUser?.trim() || null, sellerIsMe: true });
      return [...p.inventory];
    },
    async marketBuy(id) {
      const p = need();
      const l = listings.find((x) => x.id === id);
      if (!l) throw new Error("İlan artık yok (satılmış olabilir).");
      if (l.sellerIsMe) throw new Error("Kendi ilanını alamazsın; iptal et.");
      if (p.coins < l.price) throw new Error("Yeterli Sanilin yok.");
      const buyCos = (COSMETIC_BY_ID[l.item]?.price ?? 0) > 0;
      if (buyCos && p.wardrobe.includes(l.item)) throw new Error("Bu kıyafete zaten sahipsin.");
      p.coins -= l.price;
      if (buyCos) p.wardrobe.push(l.item);
      else p.inventory.push(l.item);
      listings = listings.filter((x) => x.id !== id);
      addXp(10);
      ach("first_trade");
      return { coins: p.coins, inventory: [...p.inventory] };
    },
    async marketCancel(id) {
      const p = need();
      const l = listings.find((x) => x.id === id && x.sellerIsMe);
      if (!l) throw new Error("İlan bulunamadı.");
      listings = listings.filter((x) => x.id !== id);
      if ((COSMETIC_BY_ID[l.item]?.price ?? 0) > 0) {
        if (!p.wardrobe.includes(l.item)) p.wardrobe.push(l.item);
      } else p.inventory.push(l.item);
      return [...p.inventory];
    },
    async getTournament(): Promise<TournamentState> {
      need();
      closeTournament();
      if (!tournament) return { active: false };
      const top = Object.entries(tournament.scores)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([username, score]) => ({ username, score }));
      return { active: true, ends_at: new Date(tournament.endsAt).toISOString(), top, me: tournament.scores[need().username] ?? 0 };
    },
    async adminStartTournament(minutes) {
      closeTournament();
      if (tournament) throw new Error("Zaten aktif bir turnuva var.");
      const m = Math.min(120, Math.max(1, Math.floor(minutes) || 10));
      tournament = { endsAt: Date.now() + m * 60000, scores: {} };
      addLog("tournament", null, `${m} dk`);
      emit("tournament", null, null, { ends_at: new Date(tournament.endsAt).toISOString(), minutes: m });
    },
    async reportPos(_room, gx, gy) {
      need();
      demoPos = { gx, gy };
      return { ok: true, gx, gy };
    },
    async buyPickaxe() {
      const p = need();
      if (p.inventory.includes("pickaxe")) throw new Error("Zaten kazman var.");
      if (p.role !== "admin" && p.coins < PICKAXE_PRICE) throw new Error(`Yetersiz bakiye (${PICKAXE_PRICE} Sanil).`);
      if (p.role !== "admin") p.coins -= PICKAXE_PRICE;
      p.inventory.push("pickaxe");
      return { coins: p.coins, inventory: [...p.inventory] };
    },
    async mineOre() {
      const p = need();
      if (!p.inventory.includes("pickaxe")) throw new Error("Önce kazma almalısın.");
      const rocks = ROOM_ROCKS.maden;
      if (!rocks.some(([x, y]) => Math.hypot(demoPos.gx - x, demoPos.gy - y) <= MINE_REACH)) throw new Error("Buraya yeterince yakın değilsin.");
      const roll = Math.floor(Math.random() * 100);
      const item = roll < 45 ? "ore_coal" : roll < 75 ? "ore_iron" : roll < 93 ? "ore_gold" : "ore_gem";
      p.inventory.push(item);
      bump("ore");
      addXp({ ore_coal: 3, ore_iron: 6, ore_gold: 14, ore_gem: 40 }[item] ?? 3);
      if (item === "ore_gem") ach("gem");
      return { item, value: GOODS_PRICES[item], inventory: [...p.inventory] };
    },
    async sellGoods(prefix, item) {
      const p = need();
      let earned = 0;
      let sold = 0;
      const kept: string[] = [];
      for (const k of p.inventory) {
        const price = k.startsWith(prefix) ? GOODS_PRICES[k] : undefined;
        if (price !== undefined && (!item || (k === item && sold === 0))) {
          earned += price;
          sold += 1;
        } else kept.push(k);
      }
      if (sold === 0) throw new Error("Satacak ürünün yok.");
      p.inventory = kept;
      p.coins += earned;
      prog("sell_1");
      addXp(Math.max(1, Math.floor(earned / 10)));
      return { earned, sold, coins: p.coins, inventory: [...kept] };
    },
    async farmGet() {
      need();
      return Array.from({ length: 6 }, (_, slot) => {
        const f = farm[slot];
        return { slot, crop: f?.crop ?? null, seconds_left: f ? Math.max(0, Math.ceil((f.readyAt - Date.now()) / 1000)) : null };
      });
    },
    async farmPlant(slot, crop) {
      const p = need();
      const def = CROPS.find((c) => c.key === crop);
      if (!def) throw new Error("Geçersiz tohum.");
      if (farm[slot]) throw new Error("Bu tarla dolu.");
      if (p.role !== "admin" && p.coins < def.seed) throw new Error(`Yetersiz bakiye (${def.seed} Sanil).`);
      if (p.role !== "admin") p.coins -= def.seed;
      farm[slot] = { crop, readyAt: Date.now() + (def.seconds * 1000) / 10 };
      return p.coins;
    },
    async farmHarvest(slot) {
      const p = need();
      const f = farm[slot];
      if (!f) throw new Error("Bu tarlada ekin yok.");
      if (f.readyAt > Date.now()) throw new Error("Ekin henüz olgunlaşmadı.");
      delete farm[slot];
      p.inventory.push(f.crop);
      addXp(f.crop === "crop_wheat" ? 8 : f.crop === "crop_tomato" ? 20 : 50);
      ach("harvest");
      bump("harvest");
      return [...p.inventory];
    },
    async cook(dish) {
      const p = need();
      const r = RECIPES.find((x) => x.dish === dish);
      if (!r) throw new Error("Geçersiz tarif.");
      const inv = [...p.inventory];
      for (const n of r.needs) {
        const i = inv.indexOf(n);
        if (i < 0) throw new Error("Malzeme eksik.");
        inv.splice(i, 1);
      }
      inv.push(dish);
      p.inventory = inv;
      addXp(25);
      ach("cook");
      bump("cook");
      return [...inv];
    },
    async guildGet() {
      need();
      return guild ? guildView() : null;
    },
    async guildList() {
      need();
      const list: GuildListItem[] = [{ name: "Neon Tilkileri", tag: "NTK", bank: 1500, level: 2, members: 4, cap: 15 }];
      if (guild) list.unshift({ name: guild.name, tag: guild.tag, bank: guild.bank, level: guildLevel(guild.bank), members: guild.members.length, cap: 10 + 5 * (guildLevel(guild.bank) - 1) });
      return list;
    },
    async guildCreate(name, tag) {
      const p = need();
      if (guild) throw new Error("Zaten bir loncadasın.");
      if (!/^[A-Za-z0-9ÇĞİÖŞÜçğıöşü ]{3,16}$/.test(name.trim())) throw new Error("Lonca adı 3-16 harf/rakam olmalı.");
      if (!/^[A-Za-z0-9]{2,4}$/.test(tag.trim())) throw new Error("Etiket 2-4 harf/rakam olmalı.");
      if (p.role !== "admin" && p.coins < 1000) throw new Error("Lonca kurmak 1000 Sanil.");
      if (p.role !== "admin") p.coins -= 1000;
      guild = { name: name.trim(), tag: tag.trim().toUpperCase(), bank: 0, members: [p.username] };
      ach("guild");
      return guildView();
    },
    async guildJoin(name) {
      const p = need();
      if (guild) throw new Error("Zaten bir loncadasın.");
      if (name.trim().toLowerCase() !== "neon tilkileri") throw new Error("Lonca bulunamadı.");
      guild = { name: "Neon Tilkileri", tag: "NTK", bank: 1500, members: ["Cemre", "Deniz", p.username] };
      ach("guild");
      return guildView();
    },
    async guildLeave() {
      need();
      if (!guild) throw new Error("Bir loncada değilsin.");
      guild = null;
    },
    async guildKick(username) {
      need();
      if (!guild || guild.members[0] !== need().username) throw new Error("Sadece lonca lideri çıkarabilir.");
      if (!guild.members.includes(username)) throw new Error("Bu kişi loncanda değil.");
      guild.members = guild.members.filter((m) => m !== username);
    },
    async guildDonate(n) {
      const p = need();
      if (!guild) throw new Error("Bir loncada değilsin.");
      if (!Number.isFinite(n) || n < 1) throw new Error("Geçersiz miktar.");
      if (p.role !== "admin" && p.coins < n) throw new Error("Yeterli bakiye.");
      if (p.role !== "admin") p.coins -= n;
      guild.bank += n;
      addXp(Math.max(1, Math.floor(n / 20)));
      return { coins: p.coins, guild: guildView() };
    },
    async dicePlay(bet) {
      const p = need();
      if (!Number.isFinite(bet) || bet < 10 || bet > 500) throw new Error("Bahis 10-500 Sanil olmalı.");
      if (p.role !== "admin" && p.coins < bet) throw new Error("Yetersiz bakiye.");
      const d = () => 1 + Math.floor(Math.random() * 6);
      const you: [number, number] = [d(), d()];
      const house: [number, number] = [d(), d()];
      const ys = you[0] + you[1];
      const hs = house[0] + house[1];
      const result = ys > hs ? "win" : ys < hs ? "lose" : "push";
      let delta = result === "win" ? Math.floor((bet * 95) / 100) : result === "lose" ? -bet : 0;
      if (p.role === "admin" && delta < 0) delta = 0;
      p.coins += delta;
      if (result === "win") addXp(5);
      return { you, house, result, delta, coins: p.coins };
    },
    async bjState() {
      need();
      return bj ? bjView(false, null, 0) : null;
    },
    async bjStart(bet) {
      const p = need();
      if (bj) throw new Error("Devam eden bir elin var.");
      if (!Number.isFinite(bet) || bet < 10 || bet > 500) throw new Error("Bahis 10-500 Sanil olmalı.");
      if (p.role !== "admin" && p.coins < bet) throw new Error("Yetersiz bakiye.");
      if (p.role !== "admin") p.coins -= bet;
      bj = { bet, player: [card(), card()], dealer: [card(), card()] };
      if (bjTotal(bj.player) === 21) return bjFinish(bjTotal(bj.dealer) === 21 ? "push" : "blackjack");
      return bjView(false, null, 0);
    },
    async bjHit() {
      need();
      if (!bj) throw new Error("Aktif el yok.");
      bj.player.push(card());
      const t = bjTotal(bj.player);
      if (t > 21) return bjFinish("lose");
      if (t === 21) return demoStand();
      return bjView(false, null, 0);
    },
    async bjStand() {
      need();
      if (!bj) throw new Error("Aktif el yok.");
      return demoStand();
    },
    async getFlag() {
      need();
      if (flag && flag.endsAt <= Date.now()) {
        emit("flag_end", flag.room, null, { winner: null });
        flag = null;
      }
      return flag ? { active: true, room: flag.room, gx: flag.gx, gy: flag.gy, prize: flag.prize, ends_at: new Date(flag.endsAt).toISOString() } : { active: false };
    },
    async flagGrab(roomSlug) {
      const p = need();
      if (!flag || flag.room !== roomSlug || flag.endsAt <= Date.now()) throw new Error("Bu odada aktif bayrak yok.");
      if (Math.hypot(demoPos.gx - flag.gx, demoPos.gy - flag.gy) > 1.6) throw new Error("Buraya yeterince yakın değilsin.");
      const prize = flag.prize;
      flag = null;
      p.coins += prize;
      addXp(30);
      ach("flag_win");
      emit("flag_end", roomSlug, null, { winner: p.username, prize });
      return { coins: p.coins, prize };
    },
    async adminStartFlag(roomSlug, prize, seconds) {
      if (need().role !== "admin") throw new Error("Bu işlem için admin yetkisi gerekli.");
      if (flag && flag.endsAt > Date.now()) throw new Error("Zaten aktif bir bayrak oyunu var.");
      const gx = 2 + Math.floor(Math.random() * 8);
      const gy = 2 + Math.floor(Math.random() * 8);
      flag = { room: roomSlug, gx, gy, prize, endsAt: Date.now() + Math.min(600, Math.max(10, seconds)) * 1000 };
      addLog("start_flag", null, roomSlug);
      emit("flag", roomSlug, null, { gx, gy, prize, ends_at: new Date(flag.endsAt).toISOString() });
    },
    async getHide() {
      need();
      return { active: false };
    },
    async hideTag() {
      throw new Error("Ebelemece demo modunda kullanılamaz (en az iki gerçek oyuncu gerekir).");
    },
    async adminStartHide() {
      throw new Error("Ebelemece demo modunda kullanılamaz (en az iki gerçek oyuncu gerekir).");
    },
    async adminStartQuiz(question, answer, reward, seconds) {
      if (!question.trim() || !answer.trim()) throw new Error("Soru ve cevap boş olamaz.");
      const endsAt = Date.now() + Math.min(600, Math.max(10, seconds)) * 1000;
      quiz = { question: question.trim().slice(0, 140), answer, reward, endsAt, active: true };
      addLog("quiz", null, question.slice(0, 60));
      emit("quiz", null, null, { question: quiz.question, reward, ends_at: new Date(endsAt).toISOString() });
    },
    async adminReports() {
      return structuredClone(reports);
    },
    async adminCloseReport(id) {
      reports = reports.filter((r) => r.id !== id);
    },
    async adminLog() {
      return structuredClone(log);
    },

    subscribeRoom(slug, cb) {
      const set = roomListeners.get(slug) ?? new Set();
      set.add(cb);
      roomListeners.set(slug, set);
      return () => void set.delete(cb);
    },
    subscribeAdminEvents(cb) {
      eventListeners.add(cb);
      return () => void eventListeners.delete(cb);
    },
    subscribeChat() {
      return () => {};
    },
    subscribeUserEvents(_uid, cb) {
      userListeners.add(cb);
      return () => void userListeners.delete(cb);
    },
  };
}

export const backend: Backend = supabase ? createSupabaseBackend(supabase) : createDemoBackend();
