"use client";

import { EventBanner, EventsPanel } from "./EventPanels";
import { getLayeredPref, setLayeredPref } from "@/lib/avatarLayers";
import { useCallback, useEffect, useRef, useState } from "react";
import { backend, isBlocked, supabase } from "@/lib/backend";
import {
  ACHIEVEMENTS,
  BAG_ITEM_LABELS,
  MINE_COOLDOWN_MS,
  OYUNIKA_TRACK,
  REPORT_POS_MS,
  type GoodsPrefix,
  COSMETIC_BY_ID,
  EMOTES,
  FURNI_BY_TYPE,
  GRID_SIZE,
  MAX_CHAT_LENGTH,
  ROLE_LABEL,
  ROLE_RANK,
  ROOM_NPCS,
  BADGE_BY_KEY,
  BUNDLE_BY_ID,
  registerHomeSize,
  getHomeSize,
  FURNI_BUNDLES,
  OUTFIT_BUNDLES,
  canRideHorse,
  canWhisper,
  isFurniType,
  applyHomeStyle,
  homeSlug,
  isHomeSlug,
  resolveRoom,
  type CosmeticSlot,
} from "@/lib/constants";
import { GameEngine } from "@/lib/engine";
import { inGrid } from "@/lib/iso";
import { AmbientMusic } from "@/lib/music";
import { RoomNetwork, type ConnStatus, type NetHandlers, type PresenceState } from "@/lib/network";
import type {
  GameEvent,
  ActiveQuiz,
  AdminEvent,
  BjState,
  FarmPlot,
  FlagState,
  GuildInfo,
  GuildListItem,
  HideState,
  ChatLine,
  ChatRow,
  ColorLook,
  Friend,
  FurniType,
  HomeAccess,
  Listing,
  NpcKind,
  OyunikaState,
  Player,
  Profile,
  BadgeState,
  PopularHome,
  ProfileCard,
  PublicProfile,
  Quest,
  Tile,
  TournamentState,
  UserEvent,
  UserRole,
  WeatherMode,
} from "@/lib/types";
import AdminPanel from "./AdminPanel";
import { ChatBar, ChatLog } from "./ChatUI";
import { OyunikaHud, OyunikaLobbyModal } from "./OyunikaModal";
import { AvatarPanel, BagPanel, BuildPanel, ChefNpcModal, FisherNpcModal, PlayerCard } from "./Panels";
import RoleBadge from "./RoleBadge";
import { BundleShopPanel, ExpandHomePanel, FriendsPanel, GuidePanel, QuizBanner, RealtorPanel, ShopPanel, WheelPanel } from "./SocialPanels";
import { BadgesPanel, CountChip, MarketPanel, ProfileCardModal, QuestsPanel } from "./ProgressPanels";
import { DealerModal, FarmerNpcModal, GuildPanel, MinerNpcModal } from "./WorldPanels";
import { sfx } from "@/lib/sfx";
import TopBar, { type PanelKey } from "./TopBar";
import { usePanelDock } from "./usePanelDock";
import RoomLoader from "./RoomLoader";

const timeStr = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

const cleanTile = (t: unknown, cols = 40, rows = 40): Tile | null => {
  const o = t as Partial<Tile> | null;
  if (!o || typeof o.gx !== "number" || typeof o.gy !== "number") return null;
  const gx = Math.round(o.gx);
  const gy = Math.round(o.gy);
  return inGrid(gx, gy, cols, rows) ? { gx, gy } : null;
};

const hex = (v: unknown, fallback: string) => (typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v) ? v : fallback);
const cosmetic = (id: unknown, slot: CosmeticSlot): string | null =>
  typeof id === "string" && COSMETIC_BY_ID[id]?.slot === slot ? id : null;

const HELP_LINES = [
  "🌟 Sevalika World: arkadaşlarınla gezip sohbet ettiğin, odanı dekore ettiğin, balık tutup kazı yaptığın izometrik bir sosyal dünya. Yere tıklayıp yürü, parlayan kapı karelerinden odalara geç.",
  "🎲 Oyunika: Cadde 1'deki Oyunika Mert'e tıklayıp en fazla 5 arkadaşınla lobiye katıl; kıvrımlı parkurda çift zar atarak yarış!",
  "💰 Para kazan: iskelede balık tut (Hasan'dan olta al), madende kazı yap (Recep'ten kazma), çiftlikte ekin yetiştir (Ayşe), Şef Kemal'e balık/ekin/yemek sat. Her gün 🎁 ödülünü al.",
  "📈 İlerle: 📜 Görevler günlük Sanil+XP verir; seviye atla, 14 başarım topla, 🏆 balık turnuvasına katıl.",
  "🍳 Aşçılık: restoranda Şef Kemal'e balık + çiftlik ürünü verip yemek pişir; ham maddeden çok daha pahalıya satılır.",
  "🛡️ Sosyal: Lonca kur/katıl (kasa lonca seviyesini ve XP bonusunu yükseltir), 👥 arkadaş ekle, hediye gönder, 🏪 Pazar'da eşya sat/takas et, 👤 profil kartlarına bak.",
  "🗺️ Büyük haritalar: kamera seni takip eder; Cadde 1, 🌴 Sahil Kasabası ve diğer odalar ekrandan büyüktür, yürüdükçe yeni alanlar görünür.",
  "🎰 Eğlence: Monako Kulüp'te oyun masalarına veya Krupiye Selim'e tıklayıp zar düellosu ve blackjack oyna.",
] as const;
const ROOMS_NAME = (slug: string | null) => (slug ? (resolveRoom(slug)?.name ?? slug) : "bir");
const DEFAULT_SPAWN_ROOM = "cadde-1";
const CAST_MS = 3800;

const INITIAL_OYUNIKA: OyunikaState = {
  status: "idle",
  host: null,
  players: [],
  turnIndex: 0,
  lastDice: null,
  lastEventText: null,
  winner: null,
};

export default function Game({ initialProfile, onLogout }: { initialProfile: Profile; onLogout: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dockL = useRef<HTMLDivElement | null>(null);
  const dockR = useRef<HTMLDivElement | null>(null);
  usePanelDock(dockL);
  usePanelDock(dockR);
  const engineRef = useRef<GameEngine | null>(null);
  const netRef = useRef<RoomNetwork | null>(null);
  const profileRef = useRef<Profile>(initialProfile);
  const roomSlugRef = useRef(DEFAULT_SPAWN_ROOM);

  const switching = useRef(false);
  const profileCache = useRef(new Map<string, PublicProfile>());
  const announceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fishTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingFish = useRef(false);
  const pendingNpc = useRef<NpcKind | null>(null);
  const [myId] = useState(() => "player_" + Math.random().toString(36).slice(2, 10));
  const [music] = useState(() => new AmbientMusic());

  const [profile, setProfile] = useState<Profile>(initialProfile);
  const [roomSlug, setRoomSlug] = useState(() => {
    const r = initialProfile.room;
    const def = r ? resolveRoom(r) : undefined;
    return r && def && !isHomeSlug(r) && ROLE_RANK[initialProfile.role] >= ROLE_RANK[def.minRole] ? r : DEFAULT_SPAWN_ROOM;
  });
  const [conn, setConn] = useState<ConnStatus>("connecting");
  const [onlineCount, setOnlineCount] = useState(1);
  const [riding, setRiding] = useState(false);
  const [musicOn, setMusicOn] = useState(false);

  const [panel, setPanel] = useState<PanelKey | null>(null);
  const [showAvatar, setShowAvatar] = useState(() => typeof window !== "undefined" && window.innerWidth >= 768);
  const [showChat, setShowChat] = useState(true);
  const [buildMode, setBuildMode] = useState(false);
  const [nudgeSel, setNudgeSel] = useState<string | null>(null);
  const [buildTool, setBuildTool] = useState<"place" | "remove" | "nudge">("place");
  const [selectedFurni, setSelectedFurni] = useState<FurniType>("sofa");
  const [rotation, setRotation] = useState(0);
  const [selected, setSelected] = useState<{ name: string; role: UserRole } | null>(null);
  const [activeNpc, setActiveNpc] = useState<NpcKind | null>(null);
  const [popularHomes, setPopularHomes] = useState<PopularHome[]>([]);
  const [badgeState, setBadgeState] = useState<BadgeState | null>(null);
  const [myHomeSize, setMyHomeSize] = useState<number | null>(null);
  const [roomStyle, setRoomStyle] = useState<{ wall: string; floor: string; likes: number; size: number } | null>(null);
  const [oyunika, setOyunika] = useState<OyunikaState>(INITIAL_OYUNIKA);
  const oyunikaRef = useRef<OyunikaState>(INITIAL_OYUNIKA);
  const [oyunikaRolling, setOyunikaRolling] = useState(false);
  const [farmPlots, setFarmPlots] = useState<FarmPlot[] | null>(null);
  const [farmAt, setFarmAt] = useState(0);
  const [bj, setBj] = useState<BjState | null>(null);
  const [guild, setGuild] = useState<GuildInfo | null | undefined>(undefined);
  const [guildList, setGuildList] = useState<GuildListItem[]>([]);
  const [flag, setFlag] = useState<FlagState | null>(null);
  const [hide, setHide] = useState<HideState | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [quiz, setQuiz] = useState<ActiveQuiz | null>(null);
  const [quests, setQuests] = useState<Quest[] | null>(null);
  const [listings, setListings] = useState<Listing[] | null>(null);
  const [tournament, setTournament] = useState<TournamentState | null>(null);
  const [ownCard, setOwnCard] = useState<ProfileCard | null>(null);
  const [cardView, setCardView] = useState<{ name: string; card: ProfileCard | null; error: string } | null>(null);
  const [weather, setWeather] = useState<WeatherMode>("auto");
  const [sfxOn, setSfxOn] = useState(true);

  const [announcement, setAnnouncement] = useState<{ sender: string; text: string } | null>(null);
  const [toast, setToast] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [chat, setChat] = useState<ChatLine[]>([
    { sender: "Sistem", text: "Hoş geldin! Yere tıklayarak yürü, yer oklarından odalara geç. Rehber Yağmur'a konuş, Emlak Ofisi'nden ev al. /yardim yaz.", time: timeStr(), isSystem: true },
  ]);

  const isAdmin = profile.role === "admin";
  const room = resolveRoom(roomSlug) ?? resolveRoom(DEFAULT_SPAWN_ROOM)!;

  /* ---------------- Yardımcılar ---------------- */

  const notify = useCallback((msg: string, ms = 2600) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), ms);
  }, []);

  const sys = useCallback((text: string) => {
    setChat((prev) => [...prev.slice(-60), { sender: "Sistem", text, time: timeStr(), isSystem: true }]);
  }, []);

  const addChat = useCallback((line: Omit<ChatLine, "time">) => {
    setChat((prev) => [...prev.slice(-60), { ...line, time: timeStr() }]);
  }, []);

  const showAnnouncement = useCallback((sender: string, text: string, ms = 8000) => {
    setAnnouncement({ sender, text });
    if (announceTimer.current) clearTimeout(announceTimer.current);
    announceTimer.current = setTimeout(() => setAnnouncement(null), ms);
  }, []);

  const buildPresence = useCallback((): PresenceState => {
    const me = engineRef.current?.me();
    const p = profileRef.current;
    return {
      uid: p.id,
      name: p.username,
      gx: Math.round(me?.gx ?? 6),
      gy: Math.round(me?.gy ?? 6),
      shirtColor: p.shirtColor,
      hairColor: p.hairColor,
      skinColor: p.skinColor,
      hat: p.hat,
      glasses: p.glasses,
      top: p.top,
      back: p.back,
      status: p.status ?? null,
      hairStyle: p.hairStyle,
      tool: p.tool,
      pet: p.pet,
      isRidingHorse: me?.isRidingHorse ?? false,
      isSitting: me?.isSitting ?? false,
      isDancing: me?.isDancing ?? false,
      isFishing: me?.isFishing ?? false,
      lay: me?.layered ?? false,
    };
  }, []);

  const [wheelStatus, setWheelStatus] = useState<{ ready: boolean; seconds: number } | null>(null);
  const [layeredOn, setLayeredOn] = useState(() => getLayeredPref());
  const toggleLayered = () => {
    const v = !layeredOn;
    setLayeredOn(v);
    setLayeredPref(v);
    const me = engineRef.current?.me();
    if (me) me.layered = v;
    netRef.current?.track(buildPresence());
  };

  const trackPresence = useCallback(() => netRef.current?.track(buildPresence()), [buildPresence]);

  /** Profil durumunu ref'e + state'e yazar ve motordaki karakterimi günceller. */
  const updateProfile = useCallback(
    (patch: Partial<Profile>) => {
      const next = { ...profileRef.current, ...patch };
      profileRef.current = next;
      setProfile(next);
      const me = engineRef.current?.me();
      if (me) {
        me.role = next.role;
        me.shirtColor = next.shirtColor;
        me.hairColor = next.hairColor;
        me.skinColor = next.skinColor;
        me.hat = next.hat;
        me.glasses = next.glasses;
        me.top = next.top;
        me.back = next.back;
        me.status = next.status ?? null;
        me.hairStyle = next.hairStyle;
        me.tool = next.tool;
        me.pet = next.pet;
        if (me.isRidingHorse && !canRideHorse(next.role)) {
          me.isRidingHorse = false;
          setRiding(false);
          netRef.current?.send("action", { id: myId, isRidingHorse: false });
        }
      }
      trackPresence();
    },
    [myId, trackPresence],
  );

  const refreshProfile = useCallback(async () => {
    try {
      updateProfile(await backend.getProfile());
    } catch {
      /* sessiz geç */
    }
  }, [updateProfile]);

  /** Konumumu sunucuya bildirir; sunucu ışınlanma/hız ihlalinde beni geri çeker. */
  const syncPos = useCallback(async () => {
    const me = engineRef.current?.me();
    if (!me) return;
    const room = roomSlugRef.current;
    try {
      const r = await backend.reportPos(room, Math.round(me.gx), Math.round(me.gy));
      // Yanıt gelene kadar oda değiştiyse (eski istek) düzeltmeyi uygulama
      if (roomSlugRef.current !== room) return;
      if (!r.ok) {
        me.gx = r.gx;
        me.gy = r.gy;
        me.path = [];
      }
    } catch {
      /* sessiz geç */
    }
  }, []);

  const refreshFriends = useCallback(async () => {
    try {
      setFriends(await backend.getFriends());
    } catch {
      /* sessiz geç */
    }
  }, []);

  const resolveProfiles = useCallback(
    (names: string[]) => {
      const cache = profileCache.current;
      const need = [...new Set(names)].filter((n) => !cache.has(n));
      if (!need.length) return;
      for (const n of need) cache.set(n, { username: n, role: "user" });
      backend
        .publicProfiles(need)
        .then((list) => {
          for (const pp of list) cache.set(pp.username, pp);
          const engine = engineRef.current;
          if (!engine) return;
          for (const p of engine.players) {
            const c = cache.get(p.name);
            if (c && p.id !== myId && !p.isNpc) {
              p.role = c.role;
              p.uid = c.id;
            }
          }
        })
        .catch(() => {
          for (const n of need) cache.delete(n);
        });
    },
    [myId],
  );

  /* ---------------- Balık tutma ---------------- */

  const stopFishing = useCallback(() => {
    pendingFish.current = false;
    pendingNpc.current = null;
    if (fishTimer.current) {
      clearTimeout(fishTimer.current);
      fishTimer.current = null;
    }
    const me = engineRef.current?.me();
    if (me?.isFishing) {
      me.isFishing = false;
      netRef.current?.send("action", { id: myId, isFishing: false });
      trackPresence();
    }
  }, [myId, trackPresence]);

  const startFishingCast = useCallback(() => {
    const p = profileRef.current;
    if (roomSlugRef.current !== "iskele") {
      notify("Balık tutmak için Sahil İskelesi'nde olmalısın.");
      return;
    }
    if (p.tool !== "fishing_rod" || !p.inventory.includes("fishing_rod")) {
      notify("Önce Balıkçı Hasan'dan olta alıp çantandan kuşan!");
      return;
    }
    const me = engineRef.current?.me();
    if (!me || me.isFishing) return;
    me.isFishing = true;
    me.isDancing = false;
    me.isSitting = false;
    netRef.current?.send("action", { id: myId, isFishing: true, isDancing: false, isSitting: false });
    trackPresence();
    notify("🎣 Olta suya atıldı, balık bekleniyor...", CAST_MS);

    fishTimer.current = setTimeout(async () => {
      fishTimer.current = null;
      const cur = engineRef.current?.me();
      if (cur) cur.isFishing = false;
      netRef.current?.send("action", { id: myId, isFishing: false });
      trackPresence();
      try {
        await syncPos();
        const res = await backend.catchFish(roomSlugRef.current);
        const meta = BAG_ITEM_LABELS[res.item];
        const next = { ...profileRef.current, inventory: res.inventory };
        profileRef.current = next;
        setProfile(next);
        sys(`🎣 ${meta?.name ?? res.item} yakaladın! (Restoranda ${res.value} Sanil eder)`);
        notify(`${meta?.icon ?? "🎣"} ${meta?.name ?? "Balık"} yakalandı!`, 3200);
        sfx.play("catch");
        void refreshProfile();
      } catch (e) {
        notify(e instanceof Error ? e.message : "Balık kaçtı!");
      }
    }, CAST_MS);
  }, [myId, notify, sys, trackPresence, refreshProfile, syncPos]);

  /* ---------------- Oda değiştirme ---------------- */

  const changeRoom = useCallback(
    async (slug: string) => {
      if (slug === roomSlugRef.current || switching.current) return;
      if (isHomeSlug(slug)) {
        try {
          registerHomeSize(slug, (await backend.getRoomStyle(slug)).size);
        } catch {
          /* varsayılan boyut */
        }
      }
      const target = resolveRoom(slug);
      if (!target) {
        notify("Oda bulunamadı.");
        return;
      }
      switching.current = true;
      try {
        await backend.enterRoom(slug);
      } catch (e) {
        notify(e instanceof Error ? e.message : "Odaya girilemedi.");
        return;
      } finally {
        switching.current = false;
      }
      stopFishing();
      setActiveNpc(null);
      setSelected(null);
      roomSlugRef.current = slug;
      setRoomSlug(slug);
      sys(`${target.name} odasına girdin.`);
    },
    [notify, sys, stopFishing],
  );

  /* ---------------- Oyunika Çok Oyunculu & Kutu Oyunu Mantığı ---------------- */

  const setOyunikaBoth = useCallback((next: OyunikaState) => {
    oyunikaRef.current = next;
    setOyunika(next);
  }, []);

  /** Bir oyuncunun parkur karesinden diğerine tek tek zıplayarak yürümesini sağlar */
  const animateOyunikaWalk = useCallback((username: string, fromIdx: number, toIdx: number) => {
    const engine = engineRef.current;
    if (!engine) return;
    const pl = engine.players.find((x) => x.name.toLowerCase() === username.toLowerCase());
    if (!pl) return;
    const steps: Tile[] = [];
    if (toIdx > fromIdx) {
      for (let i = fromIdx + 1; i <= toIdx; i++) {
        const cell = OYUNIKA_TRACK[i];
        if (cell) steps.push({ gx: cell.gx, gy: cell.gy });
      }
    } else if (toIdx < fromIdx) {
      for (let i = fromIdx - 1; i >= toIdx; i--) {
        const cell = OYUNIKA_TRACK[i];
        if (cell) steps.push({ gx: cell.gx, gy: cell.gy });
      }
    }
    if (steps.length > 0) {
      pl.path = steps;
      pl.isSitting = false;
      pl.isDancing = false;
    }
  }, []);

  const broadcastOyunika = useCallback(
    (next: OyunikaState, moveAnim?: { username: string; from: number; to: number }) => {
      setOyunikaBoth(next);
      netRef.current?.send("action", {
        id: myId,
        oyunikaState: next,
        oyunikaMove: moveAnim ?? null,
      });
    },
    [myId, setOyunikaBoth],
  );

  const oyunikaJoin = () => {
    const cur = oyunikaRef.current;
    const p = profileRef.current;
    if (cur.status === "playing") return notify("Oyun şu an devam ediyor!");
    if (cur.players.length >= 5) return notify("Oyunika lobisi dolu (5/5)!");
    if (cur.players.some((x) => x.username.toLowerCase() === p.username.toLowerCase())) return;
    const players = [
      ...cur.players,
      { username: p.username, pos: 0, skipTurn: false, shirtColor: p.shirtColor, hairColor: p.hairColor, skinColor: p.skinColor },
    ];
    const next: OyunikaState = {
      status: "lobby",
      host: cur.host ?? p.username,
      players,
      turnIndex: 0,
      lastDice: null,
      lastEventText: null,
      winner: null,
    };
    sfx.play("click");
    broadcastOyunika(next);
  };

  const oyunikaLeave = () => {
    const cur = oyunikaRef.current;
    const p = profileRef.current;
    const players = cur.players.filter((x) => x.username.toLowerCase() !== p.username.toLowerCase());
    const next: OyunikaState =
      players.length === 0
        ? INITIAL_OYUNIKA
        : {
            ...cur,
            host: players[0].username,
            players,
          };
    broadcastOyunika(next);
  };

  const oyunikaStart = async () => {
    const cur = oyunikaRef.current;
    const p = profileRef.current;
    const list =
      cur.players.length > 0
        ? cur.players.map((x) => ({ ...x, pos: 0, skipTurn: false }))
        : [{ username: p.username, pos: 0, skipTurn: false, shirtColor: p.shirtColor, hairColor: p.hairColor, skinColor: p.skinColor }];

    const next: OyunikaState = {
      status: "playing",
      host: list[0].username,
      players: list,
      turnIndex: 0,
      lastDice: null,
      lastEventText: "🎲 Oyun başladı! İlk zar bekleniyor...",
      winner: null,
    };
    sfx.play("win");
    broadcastOyunika(next);
    setActiveNpc(null);
    await changeRoom("oyunika");
  };

  const oyunikaRollDice = () => {
    const cur = oyunikaRef.current;
    const p = profileRef.current;
    if (cur.status !== "playing" || oyunikaRolling) return;
    const actor = cur.players[cur.turnIndex];
    if (!actor || actor.username.toLowerCase() !== p.username.toLowerCase()) return;

    setOyunikaRolling(true);
    sfx.play("click");

    setTimeout(() => {
      setOyunikaRolling(false);
      const d1 = 1 + Math.floor(Math.random() * 6);
      const d2 = 1 + Math.floor(Math.random() * 6);
      const sum = d1 + d2;
      const maxIdx = OYUNIKA_TRACK.length - 1;

      const startPos = actor.pos;
      let targetPos = Math.min(maxIdx, startPos + sum);
      const landedCell = OYUNIKA_TRACK[targetPos];

      let eventText = `${actor.username} [${d1} + ${d2} = ${sum}] attı ve ${targetPos}. kareye ilerledi.`;
      let extraTurn = false;
      let setSkip = false;

      if (targetPos >= maxIdx) {
        eventText = `🏆 ${actor.username} bitiş karesine ulaştı ve oyunu kazandı!`;
      } else if (landedCell.kind === "red") {
        setSkip = true;
        eventText = `🟥 ${actor.username} kırmızı tuzağa bastı! Gelecek 1 tur bekleyecek.`;
        sfx.play("error");
      } else if (landedCell.kind === "green") {
        extraTurn = true;
        eventText = `🟩 ${actor.username} yeşil şans karesine bastı! Ekstra 1 zar hakkı kazandı!`;
        sfx.play("win");
      } else if (landedCell.kind === "purple") {
        const forward = Math.random() < 0.55;
        const delta = (2 + Math.floor(Math.random() * 3)) * (forward ? 1 : -1); // +2..+4 veya -2..-4
        targetPos = Math.max(0, Math.min(maxIdx, targetPos + delta));
        eventText = forward
          ? `🟪 Mor Sürpriz! ${actor.username} +${delta} adım ileri fırladı (${targetPos}. kare)!`
          : `🟪 Mor Sürpriz! ${actor.username} ${Math.abs(delta)} adım geri gönderildi (${targetPos}. kare)!`;
        sfx.play(forward ? "win" : "error");
      }

      const players = cur.players.map((pl, i) =>
        i === cur.turnIndex ? { ...pl, pos: targetPos, skipTurn: setSkip } : pl,
      );

      // Bitişe ulaşıldıysa oyunu bitir
      if (targetPos >= maxIdx) {
        sfx.play("win");
        const fin: OyunikaState = {
          ...cur,
          status: "finished",
          players,
          lastDice: [d1, d2],
          lastEventText: eventText,
          winner: actor.username,
        };
        animateOyunikaWalk(actor.username, startPos, targetPos);
        broadcastOyunika(fin, { username: actor.username, from: startPos, to: targetPos });
        sys(eventText);
        return;
      }

      // Sıradaki oyuncuyu belirle (kırmızı cezası olan 1 tur atlanır ve cezası silinir)
      let nextTurn = cur.turnIndex;
      if (!extraTurn) {
        for (let step = 1; step <= players.length; step++) {
          const cand = (cur.turnIndex + step) % players.length;
          if (players[cand].skipTurn) {
            players[cand] = { ...players[cand], skipTurn: false };
            eventText += ` (${players[cand].username} kırmızı cezası nedeniyle bu tur bekledi)`;
          } else {
            nextTurn = cand;
            break;
          }
        }
      }

      const next: OyunikaState = {
        ...cur,
        players,
        turnIndex: nextTurn,
        lastDice: [d1, d2],
        lastEventText: eventText,
      };
      animateOyunikaWalk(actor.username, startPos, targetPos);
      broadcastOyunika(next, { username: actor.username, from: startPos, to: targetPos });
      sys(eventText);
    }, 450);
  };

  /* ---------------- Motor ---------------- */

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = new GameEngine(canvas, resolveRoom(roomSlugRef.current)!);
    engine.myId = myId;
    engine.onArrive = (tile) => {
      const portal = engine.portalAt(tile);
      if (portal) void changeRoom(portal.to);
      else {
        trackPresence();
        if (pendingFish.current) {
          pendingFish.current = false;
          startFishingCast();
        }
        if (pendingNpc.current) {
          const kind = pendingNpc.current;
          pendingNpc.current = null;
          setSelected(null);
          setPanel(null);
          setActiveNpc(kind);
          if (kind === "dealer") void backend.bjState().then(setBj).catch(() => {});
        }
      }
    };
    engineRef.current = engine;
    if (window.location.search.includes("debug")) (window as unknown as { __sw?: unknown }).__sw = engine;
    engine.start();
    return () => {
      engine.stop();
      engineRef.current = null;
    };
  }, [myId, changeRoom, trackPresence, startFishingCast]);

  useEffect(() => {
    if (engineRef.current) engineRef.current.buildMode = buildMode;
  }, [buildMode]);

  useEffect(() => () => music.stop(), [music]);

  /* ---------------- Oda: yükleme + gerçek zamanlı kanal ---------------- */

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const def = resolveRoom(roomSlug);
    if (!def) return;
    const cols = def.cols ?? GRID_SIZE;
    const rows = def.rows ?? GRID_SIZE;
    const p = profileRef.current;
    const wasRiding = engine.me()?.isRidingHorse ?? false;

    music.setRoom(roomSlug);
    engine.setRoom(def);
    engine.bubbles = [];
    engine.emotes = [];
    engine.furni = [];
    const mk = (over: Partial<Player> & Pick<Player, "id" | "name">): Player => ({
      gx: def.spawn.gx,
      gy: def.spawn.gy,
      path: [],
      shirtColor: "#2563eb",
      hairColor: "#1e293b",
      skinColor: "#fed7aa",
      hat: null,
      glasses: null,
      top: null,
      back: null,
      hairStyle: "hs_short",
      role: "user",
      isSitting: false,
      isDancing: false,
      isRidingHorse: false,
      ...over,
    });
    engine.players = [
      mk({
        id: myId,
        uid: p.id,
        name: p.username,
        shirtColor: p.shirtColor,
        hairColor: p.hairColor,
        skinColor: p.skinColor,
        hat: p.hat,
        glasses: p.glasses,
        top: p.top,
        back: p.back,
        status: p.status ?? null,
        hairStyle: p.hairStyle,
        tool: p.tool,
        pet: p.pet,
        role: p.role,
        layered: getLayeredPref(),
        isRidingHorse: wasRiding && canRideHorse(p.role),
      }),
      ...(ROOM_NPCS[roomSlug] ?? []).map((n) =>
        mk({ id: `npc_${n.kind}`, name: n.name, gx: n.gx, gy: n.gy, shirtColor: n.shirt, hairColor: n.hair, skinColor: n.skin, isNpc: true, npcKind: n.kind }),
      ),
    ];

    // Demo modunda odayı canlı göstermek için gezinen bir bot (Oyunika parkuru hariç)
    let wander: ReturnType<typeof setInterval> | undefined;
    if (!backend.online && roomSlug !== "oyunika") {
      const bot = mk({
        id: "bot_cemre",
        name: "Cemre",
        gx: 3,
        gy: 8,
        shirtColor: "#e11d48",
        hairColor: "#78350f",
        skinColor: "#fdba74",
        hairStyle: "hs_long",
        hat: "hat_cap",
        role: "vip",
      });
      engine.players.push(bot);
      wander = setInterval(() => {
        const to = { gx: Math.floor(Math.random() * cols), gy: Math.floor(Math.random() * rows) };
        const path = engine.computePath({ gx: Math.round(bot.gx), gy: Math.round(bot.gy) }, to);
        if (path && path.length && !engine.portalAt(to)) bot.path = path;
      }, 4000);
    }

    let cancelled = false;
    const applyStyle = async () => {
      if (!isHomeSlug(roomSlug)) {
        setRoomStyle(null);
        return;
      }
      try {
        const st = await backend.getRoomStyle(roomSlug);
        if (cancelled) return;
        if (st.size !== getHomeSize(roomSlug)) {
          registerHomeSize(roomSlug, st.size);
          const nd = resolveRoom(roomSlug);
          if (nd) engine.setRoom(nd);
        }
        const base = resolveRoom(roomSlug)?.theme;
        if (base) engine.setTheme(applyHomeStyle(base, st.wall, st.floor));
        setRoomStyle(st);
      } catch {
        /* sessiz geç */
      }
    };
    styleRefresh.current = () => void applyStyle();
    void applyStyle();
    backend
      .loadRoom(roomSlug)
      .then((f) => {
        if (!cancelled) engine.furni = f;
      })
      .catch(() => notify("Oda yüklenemedi."));
    const unsubRoom = backend.subscribeRoom(roomSlug, (f) => {
      engine.furni = f;
      void applyStyle();
    });

    const roleOf = (uid: string, name: string): UserRole =>
      engine.players.find((x) => x.uid === uid)?.role ?? profileCache.current.get(name)?.role ?? "user";

    const unsubChat = backend.subscribeChat(
      roomSlug,
      p.id,
      (row: ChatRow) => {
        if (row.kind !== "chat" || row.sender_id === profileRef.current.id) return;
        const body = String(row.text ?? "").slice(0, MAX_CHAT_LENGTH);
        if (!body) return;
        sfx.play("pop");
        engine.bubbles.push({ id: String(row.id), sender: row.sender, uid: row.sender_id, text: body, createdAt: performance.now() });
        addChat({ sender: row.sender, text: body, role: roleOf(row.sender_id, row.sender) });
      },
      (row: ChatRow) => {
        if (row.kind !== "whisper" || row.sender_id === profileRef.current.id) return;
        const body = String(row.text ?? "").slice(0, MAX_CHAT_LENGTH);
        if (!body) return;
        addChat({ sender: row.sender, text: body, role: roleOf(row.sender_id, row.sender), isWhisper: true, whisperTarget: profileRef.current.username });
      },
    );

    const missingSince = new Map<string, number>();
    const sweep = setInterval(() => {
      const t = performance.now();
      for (const [id, since] of missingSince) {
        if (t - since >= 10000) {
          missingSince.delete(id);
          engine.players = engine.players.filter((pl) => pl.id !== id || pl.id === myId);
        }
      }
    }, 2000);
    const handlers: NetHandlers = {
      onStatus: setConn,

      onPresence: (list) => {
        setOnlineCount(Math.max(1, list.length));
        const ids = new Set(list.map((s) => s.id));
        // Anlık bağlantı titremesinde oyuncu hemen silinmesin: 10 sn tolerans
        const nowMs = performance.now();
        for (const id of ids) missingSince.delete(id);
        engine.players = engine.players.filter((pl) => {
          if (pl.id === myId || pl.isNpc || pl.id.startsWith("bot_") || ids.has(pl.id)) return true;
          const since = missingSince.get(pl.id) ?? nowMs;
          missingSince.set(pl.id, since);
          return nowMs - since < 10000;
        });
        const names: string[] = [];
        for (const s of list) {
          if (s.id === myId) continue;
          const name = String(s.name).slice(0, 15);
          let pl = engine.players.find((x) => x.id === s.id);
          if (!pl) {
            const tile = cleanTile(s, cols, rows) ?? def.spawn;
            pl = mk({ id: s.id, name, gx: tile.gx, gy: tile.gy, isSitting: Boolean(s.isSitting), isDancing: Boolean(s.isDancing) });
            engine.players.push(pl);
          }
          pl.name = name;
          pl.shirtColor = hex(s.shirtColor, pl.shirtColor);
          pl.hairColor = hex(s.hairColor, pl.hairColor);
          pl.skinColor = hex(s.skinColor, pl.skinColor);
          pl.hat = cosmetic(s.hat, "hat");
          pl.glasses = cosmetic(s.glasses, "glasses");
          pl.top = cosmetic(s.top, "top");
          pl.back = cosmetic(s.back, "back");
          pl.status = typeof s.status === "string" && s.status ? s.status.replace(/[\u0000-\u001f]/g, "").slice(0, 40) : null;
          pl.hairStyle = cosmetic(s.hairStyle, "hair") ?? "hs_short";
          pl.tool = s.tool === "fishing_rod" ? "fishing_rod" : null;
          pl.pet = cosmetic(s.pet, "pet");
          pl.isFishing = Boolean(s.isFishing);
          pl.layered = Boolean(s.lay);
          pl.isRidingHorse = Boolean(s.isRidingHorse);
          const cached = profileCache.current.get(name);
          pl.role = cached?.role ?? "user";
          pl.uid = cached?.id;
          names.push(name);
        }
        resolveProfiles(names);
      },

      onMove: ({ id, from, path }) => {
        if (id === myId) return;
        const pl = engine.players.find((x) => x.id === id);
        if (!pl || pl.isNpc || !Array.isArray(path)) return;
        const start = cleanTile(from, cols, rows);
        if (start && Math.hypot(pl.gx - start.gx, pl.gy - start.gy) > 1.5) {
          pl.gx = start.gx;
          pl.gy = start.gy;
        }
        pl.path = path.slice(0, 60).map((pt) => cleanTile(pt, cols, rows)).filter((t): t is Tile => t !== null);
        pl.isDancing = false;
        pl.isSitting = false;
        pl.isFishing = false;
      },

      onAction: (a) => {
        if (a.id === myId) return;
        // Oyunika çok oyunculu senkronizasyonu
        const oy = (a as { oyunikaState?: OyunikaState }).oyunikaState;
        if (oy && typeof oy.status === "string") {
          const prevStatus = oyunikaRef.current.status;
          const wasInLobby = oyunikaRef.current.players.some(
            (x) => x.username.toLowerCase() === profileRef.current.username.toLowerCase(),
          );
          setOyunikaBoth(oy);
          const mv = (a as { oyunikaMove?: { username: string; from: number; to: number } | null }).oyunikaMove;
          if (mv) animateOyunikaWalk(mv.username, mv.from, mv.to);
          // Lobi kurucusu oyunu başlattıysa lobideki diğer oyuncuları da Oyunika odasına geçir
          if (
            prevStatus === "lobby" &&
            wasInLobby &&
            oy.status === "playing" &&
            oy.players.some((x) => x.username.toLowerCase() === profileRef.current.username.toLowerCase()) &&
            roomSlugRef.current !== "oyunika"
          ) {
            void changeRoom("oyunika");
          }
          return;
        }

        const pl = engine.players.find((x) => x.id === a.id);
        if (!pl || pl.isNpc) return;
        if (typeof a.isDancing === "boolean") pl.isDancing = a.isDancing;
        if (typeof a.isSitting === "boolean") pl.isSitting = a.isSitting;
        if (typeof a.isRidingHorse === "boolean") pl.isRidingHorse = a.isRidingHorse;
        if (typeof a.isFishing === "boolean") pl.isFishing = a.isFishing;
      },

      onEmote: ({ id, emoji }) => {
        if (id === myId || !EMOTES.includes(emoji) || engine.emotes.length > 40) return;
        if (!engine.players.some((x) => x.id === id)) return;
        engine.emotes.push({ id: Math.random().toString(36).slice(2), playerId: id, emoji, createdAt: performance.now() });
      },
    };

    const net = new RoomNetwork(supabase, roomSlug, myId, handlers);
    netRef.current = net;
    net.join(buildPresence());

    return () => {
      cancelled = true;
      if (wander) clearInterval(wander);
      clearInterval(sweep);
      unsubRoom();
      unsubChat();
      net.leave();
      if (netRef.current === net) netRef.current = null;
    };
  }, [roomSlug, myId, music, buildPresence, resolveProfiles, notify, addChat, animateOyunikaWalk, setOyunikaBoth, changeRoom]);

  /* ---------------- Kalp atışı: uzaklaştırma / susturma kontrolü ---------------- */

  useEffect(() => {
    let alive = true;
    const beat = async () => {
      try {
        const r = await backend.heartbeat(roomSlug);
        if (!alive) return;
        if (isBlocked(r.kickedUntil)) {
          alert(r.kickedUntil === "infinity" ? "Hesabın yasaklandı." : "Yetkili tarafından uzaklaştırıldın.");
          void backend.signOut().finally(onLogout);
          return;
        }
        if (r.mutedUntil !== profileRef.current.mutedUntil) updateProfile({ mutedUntil: r.mutedUntil });
      } catch {
        /* ağ hatası */
      }
    };
    void beat();
    const t = setInterval(beat, 25000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [roomSlug, onLogout, updateProfile]);

  /* ---------------- Konum raporu ---------------- */

  useEffect(() => {
    void syncPos();
    const t = setInterval(() => void syncPos(), REPORT_POS_MS);
    return () => clearInterval(t);
  }, [roomSlug, syncPos]);

  /* ---------------- Arkadaş listesi ---------------- */

  useEffect(() => {
    let alive = true;
    const load = () =>
      backend
        .getFriends()
        .then((f) => alive && setFriends(f))
        .catch(() => {});
    load();
    const t = setInterval(load, 45000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  /* ---------------- Bana özel olaylar ---------------- */

  useEffect(() => {
    return backend.subscribeUserEvents(initialProfile.id, (ev: UserEvent) => {
      const from = String(ev.payload.from ?? "");
      switch (ev.kind) {
        case "friend_request":
          notify(`👥 ${from} sana arkadaşlık isteği gönderdi.`, 4000);
          sys(`${from} sana arkadaşlık isteği gönderdi (Arkadaşlar paneli).`);
          void refreshFriends();
          break;
        case "friend_accepted":
          sys(`${from} arkadaşlık isteğini kabul etti.`);
          void refreshFriends();
          break;
        case "gift_coins":
          sys(`🎁 ${from} sana ${Number(ev.payload.amount ?? 0)} Sanil gönderdi!`);
          notify(`🎁 ${from} sana Sanil gönderdi!`, 4000);
          void refreshProfile();
          break;
        case "gift_item": {
          const name = BAG_ITEM_LABELS[String(ev.payload.item)]?.name ?? "bir eşya";
          sys(`🎁 ${from} sana ${name} hediye etti!`);
          notify(`🎁 ${from} sana hediye gönderdi!`, 4000);
          void refreshProfile();
          break;
        }
        case "level_up":
          sfx.play("level");
          notify(`⭐ Seviye ${Number(ev.payload.level ?? 0)}'e yükseldin!`, 4500);
          sys(`⭐ Tebrikler! Seviye ${Number(ev.payload.level ?? 0)} oldun.`);
          void refreshProfile();
          break;
        case "achievement": {
          const a = ACHIEVEMENTS[String(ev.payload.key ?? "")];
          sfx.play("win");
          notify(`${a?.icon ?? "🏅"} Başarım: ${a?.name ?? "yeni başarım"}!`, 4500);
          sys(`🏅 Başarım kazandın: ${a?.name ?? String(ev.payload.key ?? "")}`);
          setOwnCard(null);
          break;
        }
        case "badge": {
          const d = BADGE_BY_KEY[String(ev.payload.key ?? "")];
          const tier = Number(ev.payload.tier ?? 0);
          const reward = Number(ev.payload.reward ?? 0);
          sfx.play("win");
          notify(`${d?.icon ?? "🎖️"} ${d?.name ?? "Rozet"} rozeti${tier ? " " + "★".repeat(tier) : ""} kazandın!${reward ? ` +${reward} Sanil` : ""}`, 5000);
          sys(`🎖️ Rozet: ${d?.name ?? ""}${tier ? " " + "★".repeat(tier) : ""}${reward ? ` (+${reward} Sanil)` : ""}`);
          setOwnCard(null);
          void refreshProfile();
          break;
        }
        case "tournament_prize":
          sfx.play("win");
          sys(`🏆 Turnuvada ${Number(ev.payload.place ?? 0)}. oldun! +${Number(ev.payload.prize ?? 0)} Sanil`);
          notify("🏆 Turnuva ödülü hesabına eklendi!", 4500);
          void refreshProfile();
          break;
        case "market_offer":
          sys(`🏪 ${from} sana özel bir ilan verdi (Pazar paneli).`);
          notify(`🏪 ${from} sana özel ilan verdi.`, 4000);
          break;
        case "market_sold":
          sfx.play("coin");
          sys(`🏪 ${from} ilanını satın aldı! +${Number(ev.payload.net ?? 0)} Sanil`);
          notify("🏪 Bir ilanın satıldı!", 4000);
          void refreshProfile();
          break;
        case "hide_tagged":
          sfx.play("error");
          notify(`🙈 ${from} seni yakaladı!`, 4000);
          sys(`🙈 ${from} seni yakaladı, bu turda elendin.`);
          break;
        case "hide_survived":
          sfx.play("win");
          sys(`🙈 Ebelemecede sağ kaldın! +${Number(ev.payload.prize ?? 0)} Sanil`);
          void refreshProfile();
          break;
        case "muted":
          notify(`🔇 ${from || "Yetkili"} seni ${Number(ev.payload.minutes ?? 0)} dakika susturdu.`, 5000);
          void refreshProfile();
          break;
      }
    });
  }, [initialProfile.id, notify, sys, refreshFriends, refreshProfile]);

  /* ---------------- Admin olayları ---------------- */

  useEffect(() => {
    return backend.subscribeAdminEvents((ev: AdminEvent) => {
      const myName = profileRef.current.username.toLowerCase();
      const toMe = ev.target?.toLowerCase() === myName;
      const engine = engineRef.current;

      switch (ev.kind) {
        case "announce":
          showAnnouncement(ev.by_username, String(ev.payload.text ?? ""));
          break;
        case "kick":
          if (toMe) {
            alert(`Yetkili ${ev.by_username} tarafından odadan uzaklaştırıldın.`);
            void backend.signOut().finally(onLogout);
          }
          break;
        case "gift":
          if (toMe) {
            void refreshProfile();
            showAnnouncement(ev.by_username, `${profileRef.current.username} hesabına +${Number(ev.payload.amount ?? 0)} Sanil tanımlandı!`, 6000);
          }
          break;
        case "role": {
          const role = ev.payload.role as UserRole;
          if (ev.target) {
            profileCache.current.delete(ev.target);
            const pl = engine?.players.find((p) => p.name.toLowerCase() === ev.target?.toLowerCase());
            if (pl) pl.role = role;
          }
          if (toMe) {
            void refreshProfile();
            showAnnouncement(ev.by_username, `${profileRef.current.username} rütben ${ROLE_LABEL[role] ?? role} olarak güncellendi!`, 6500);
          }
          break;
        }
        case "dance":
          if (engine && ev.room === roomSlugRef.current) {
            const on = Boolean(ev.payload.on);
            for (const p of engine.players) {
              if (p.isNpc) continue;
              p.isDancing = on;
              if (on) {
                p.isSitting = false;
                p.path = [];
              }
            }
          }
          break;
        case "clear_room":
          if (engine && ev.room === roomSlugRef.current) engine.furni = [];
          break;
        case "quiz": {
          const endsAt = Date.parse(String(ev.payload.ends_at ?? ""));
          setQuiz({
            question: String(ev.payload.question ?? ""),
            reward: Number(ev.payload.reward ?? 0),
            endsAt: Number.isFinite(endsAt) ? endsAt : Date.now() + 60000,
          });
          showAnnouncement("YARIŞMA", `🎯 ${String(ev.payload.question ?? "")} (${Number(ev.payload.reward ?? 0)} Sanil)`, 7000);
          break;
        }
        case "tournament": {
          const endsAt = String(ev.payload.ends_at ?? "");
          setTournament({ active: true, ends_at: endsAt, top: [], me: 0 });
          showAnnouncement("TURNUVA", `🏆 Balık turnuvası başladı! ${Number(ev.payload.minutes ?? 0)} dakika içinde en değerli balıkları tut (İskele).`, 8000);
          sys("🏆 Balık turnuvası başladı! İskele'ye git, olta at.");
          break;
        }
        case "flag": {
          const f: FlagState = { active: true, room: ev.room ?? undefined, gx: Number(ev.payload.gx), gy: Number(ev.payload.gy), prize: Number(ev.payload.prize ?? 0), ends_at: String(ev.payload.ends_at ?? "") };
          setFlag(f);
          showAnnouncement("BAYRAK", `🚩 ${ROOMS_NAME(ev.room)} odasında bayrak çıktı! İlk kapan ${f.prize} Sanil kazanır.`, 7000);
          sys(`🚩 Bayrak kapma başladı: ${ROOMS_NAME(ev.room)} (${f.prize} Sanil). "🚩 Bayrağı Kap" butonuna basmak için bayrağa yaklaş.`);
          break;
        }
        case "flag_end": {
          setFlag({ active: false });
          const winner = String(ev.payload.winner ?? "");
          sys(winner ? `🚩 Bayrağı ${winner} kaptı! (+${Number(ev.payload.prize ?? 0)} Sanil)` : "🚩 Bayrak süresi doldu, kimse kapamadı.");
          if (winner.toLowerCase() === myName) {
            sfx.play("win");
            void refreshProfile();
          }
          break;
        }
        case "hide": {
          setHide({ active: true, room: ev.room ?? undefined, seeker: String(ev.payload.seeker ?? ""), ends_at: String(ev.payload.ends_at ?? ""), me_seeker: String(ev.payload.seeker ?? "").toLowerCase() === myName });
          showAnnouncement("EBELEMECE", `🙈 ${ROOMS_NAME(ev.room)} odasında ebelemece! Ebe: ${String(ev.payload.seeker ?? "")}. Yakalanmadan sağ kal!`, 7000);
          sys(`🙈 Ebelemece başladı (${ROOMS_NAME(ev.room)}). Ebe: ${String(ev.payload.seeker ?? "")}.`);
          break;
        }
        case "hide_end":
          setHide({ active: false });
          sys(`🙈 Ebelemece bitti! Ebe ${String(ev.payload.seeker ?? "")} ${Number(ev.payload.tagged ?? 0)} kişi yakaladı, ${Number(ev.payload.survivors ?? 0)} kişi sağ kaldı.`);
          void refreshProfile();
          break;
        case "tournament_end": {
          setTournament({ active: false });
          const winner = String(ev.payload.winner ?? "");
          sys(winner ? `🏆 Turnuva bitti! Birinci: ${winner} (${Number(ev.payload.score ?? 0)} puan)` : "🏆 Turnuva bitti, kimse balık tutmadı.");
          showAnnouncement("TURNUVA", winner ? `🏆 Turnuva bitti! Kazanan: ${winner}` : "🏆 Turnuva bitti.", 7000);
          void refreshProfile();
          break;
        }
        case "quiz_end": {
          setQuiz(null);
          const winner = String(ev.payload.winner ?? "");
          if (winner) {
            sys(`🎯 Yarışma bitti! ${winner} doğru cevabı bildi: "${String(ev.payload.answer ?? "")}" (+${Number(ev.payload.reward ?? 0)} Sanil)`);
            if (winner.toLowerCase() === myName) void refreshProfile();
          } else sys("🎯 Yarışma süresi doldu, kimse bilemedi.");
          break;
        }
      }
    });
  }, [onLogout, refreshProfile, showAnnouncement, sys]);

  /* ---------------- Bayrak / ebelemece / turnuva açılış kontrolü ---------------- */

  useEffect(() => {
    let alive = true;
    backend
      .getFlag()
      .then((f) => alive && f.active && setFlag(f))
      .catch(() => {});
    backend
      .getHide()
      .then((h) => alive && h.active && setHide(h))
      .catch(() => {});
    backend
      .getTournament()
      .then((t) => alive && t.active && setTournament(t))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const e = engineRef.current;
    if (e) e.flag = flag?.active && flag.room === roomSlug && flag.gx !== undefined && flag.gy !== undefined ? { gx: flag.gx, gy: flag.gy } : null;
  }, [flag, roomSlug]);

  const reloadRoom = useCallback(async () => {
    const f = await backend.loadRoom(roomSlugRef.current);
    if (engineRef.current) engineRef.current.furni = f;
  }, []);

  const saveNudge = useCallback(
    async (id: string, revert?: { ox: number; oy: number }) => {
      const engine = engineRef.current;
      const it = engine?.furni.find((f) => f.id === id);
      if (!engine || !it) return;
      // Bırakılan noktaya en yakın kareye geç: kapladığı kare görünen yerle aynı olur
      const spot = engine.settleFurni(it);
      if (!spot) {
        it.ox = revert?.ox ?? 0;
        it.oy = revert?.oy ?? 0;
        notify("Buraya taşınamaz (dolu, deniz veya kapı karesi).");
        return;
      }
      const moved = spot.gx !== it.gx || spot.gy !== it.gy;
      it.gx = spot.gx;
      it.gy = spot.gy;
      it.ox = spot.ox;
      it.oy = spot.oy;
      try {
        await backend.nudgeFurni(roomSlugRef.current, id, spot.ox, spot.oy, it.sc ?? 100, moved ? spot.gx : undefined, moved ? spot.gy : undefined);
      } catch (err) {
        notify(err instanceof Error ? err.message : "Kaydedilemedi.");
        await reloadRoom();
      }
    },
    [reloadRoom], // eslint-disable-line react-hooks/exhaustive-deps
  );

  /* ---------------- Klavye ---------------- */

  useEffect(() => {
    if (!buildMode) return;
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement) return;
      if (e.key.toLowerCase() === "r") setRotation((r) => (r === 0 ? 1 : 0));
      if (buildTool === "nudge" && nudgeSel) {
        const it = engineRef.current?.furni.find((f) => f.id === nudgeSel);
        if (!it) return;
        if (e.key === "+" || e.key === "=") it.sc = Math.min(200, (it.sc ?? 100) + 5);
        else if (e.key === "-" || e.key === "_") it.sc = Math.max(50, (it.sc ?? 100) - 5);
        else if (e.key === "0") {
          it.ox = 0;
          it.oy = 0;
          it.sc = 100;
        } else return;
        void saveNudge(nudgeSel);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [buildMode, buildTool, nudgeSel, saveNudge]);

  /* ---------------- Oyuncu eylemleri ---------------- */

  const act = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
      try {
        return await fn();
      } catch (e) {
        notify(e instanceof Error ? e.message : "İşlem başarısız.");
        return undefined;
      }
    },
    [notify],
  );

  /* ---------------- Etkinlikler ---------------- */
  const [events, setEvents] = useState<GameEvent[]>([]);
  const seenEvents = useRef<Set<string> | null>(null);
  const refreshEvents = useCallback(async () => {
    try {
      const list = await backend.activeEvents();
      setEvents(list);
      const live = list.filter((e) => e.active).map((e) => e.id);
      if (seenEvents.current) for (const e of list) if (e.active && !seenEvents.current.has(e.id)) notify(`🎉 Etkinlik başladı: ${e.title}`);
      seenEvents.current = new Set(live);
      if (engineRef.current) engineRef.current.eventTheme = list.find((e) => e.active)?.theme ?? null;
    } catch {
      /* ağ hatası: sonraki turda tekrar dene */
    }
  }, [notify]);

  useEffect(() => {
    const first = window.setTimeout(() => void refreshEvents(), 400);
    const id = window.setInterval(() => void refreshEvents(), 45000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, [refreshEvents]);

  const claimEvent = async (id: string) => {
    const coins = await act(() => backend.claimEventReward(id));
    if (coins !== undefined) {
      updateProfile({ coins });
      notify("🎁 Etkinlik ödülü hesabına eklendi!");
      void refreshEvents();
    }
  };

  const styleRefresh = useRef<() => void>(() => {});

  const handleCanvasClick = async (e: React.MouseEvent<HTMLCanvasElement>) => {
    const engine = engineRef.current;
    if (!engine) return;
    if (buildMode && buildTool === "nudge") return;
    const tile = engine.tileAtClient(e.clientX, e.clientY);
    if (!tile) return;
    const slug = roomSlugRef.current;

    if (buildMode) {
      if (engine.isWaterTile(tile)) return notify("Denize eşya konamaz.");
      if (room.portals.some((p) => p.gx === tile.gx && p.gy === tile.gy)) return notify("Kapı karesine eşya konamaz.");
      await act(async () => {
        if (buildTool === "remove") {
          const item = engine.furniAt(tile, false) ?? engine.furniAt(tile, true);
          if (!item) return;
          updateProfile({ inventory: await backend.pickup(slug, item.id) });
        } else {
          updateProfile({ coins: await backend.buyAndPlace(slug, selectedFurni, tile.gx, tile.gy, rotation) });
        }
        await reloadRoom();
      });
      return;
    }

    const hit = engine.playerAtClient(e.clientX, e.clientY);
    if (hit) {
      if (hit.isNpc && hit.npcKind) {
        setSelected(null);
        setPanel(null);
        setActiveNpc(hit.npcKind);
        if (hit.npcKind === "farmer") void loadFarm();
        if (hit.npcKind === "realtor") {
          void backend.getMyHomeSize().then(setMyHomeSize).catch(() => {});
          void backend.popularHomes().then(setPopularHomes).catch(() => {});
        }
        if (hit.npcKind === "dealer") void backend.bjState().then(setBj).catch(() => {});
        return;
      }
      setActiveNpc(null);
      setSelected({ name: hit.name, role: hit.role });
      return;
    }
    setSelected(null);
    setActiveNpc(null);

    const me = engine.me();
    if (!me) return;
    const from = { gx: Math.round(me.gx), gy: Math.round(me.gy) };

    // Monako Kulüp oyun masalarına tıklayınca yanına yürü ve oyun panelini aç
    const clickedFurni = engine.furniAt(tile, false);
    if (clickedFurni?.type === "casinotable") {
      stopFishing();
      const openDealer = () => {
        setSelected(null);
        setPanel(null);
        setActiveNpc("dealer");
        void backend.bjState().then(setBj).catch(() => {});
      };
      if (Math.max(Math.abs(from.gx - tile.gx), Math.abs(from.gy - tile.gy)) <= 1) {
        openDealer();
        return;
      }
      const neighbors: Tile[] = [
        { gx: tile.gx, gy: tile.gy + 1 },
        { gx: tile.gx + 1, gy: tile.gy },
        { gx: tile.gx - 1, gy: tile.gy },
        { gx: tile.gx, gy: tile.gy - 1 },
        { gx: tile.gx + 1, gy: tile.gy + 1 },
        { gx: tile.gx - 1, gy: tile.gy + 1 },
        { gx: tile.gx + 1, gy: tile.gy - 1 },
        { gx: tile.gx - 1, gy: tile.gy - 1 },
      ];
      let bestPath: Tile[] | null = null;
      for (const nb of neighbors) {
        const p = engine.computePath(from, nb);
        if (p && (!bestPath || p.length < bestPath.length)) bestPath = p;
      }
      if (!bestPath) return notify("Masaya yaklaşılamıyor.");
      pendingNpc.current = "dealer";
      me.path = bestPath;
      me.isDancing = false;
      me.isSitting = false;
      netRef.current?.send("move", { id: myId, from: { gx: me.gx, gy: me.gy }, path: bestPath });
      return;
    }

    // Denize tıklama: olta kuşanıldıysa iskelenin kenarına yürü ve at
    if (engine.isWaterTile(tile)) {
      const p = profileRef.current;
      if (p.tool !== "fishing_rod" || !p.inventory.includes("fishing_rod")) {
        return notify("Balık tutmak için Balıkçı Hasan'dan olta alıp çantandan kuşan!");
      }
      if (me.isFishing) return;
      const dock: Tile = { gx: 8, gy: tile.gy };
      if (from.gx === dock.gx && from.gy === dock.gy) {
        startFishingCast();
        return;
      }
      const path = engine.computePath(from, dock);
      if (!path) return notify("İskelenin o kenarına ulaşılamıyor.");
      pendingFish.current = true;
      me.path = path;
      me.isDancing = false;
      me.isSitting = false;
      netRef.current?.send("move", { id: myId, from: { gx: me.gx, gy: me.gy }, path });
      return;
    }

    stopFishing();
    const path = engine.computePath(from, tile);
    if (!path) return notify("Oraya gidemezsin.");
    if (path.length === 0) {
      const portal = engine.portalAt(tile);
      if (portal) void changeRoom(portal.to);
      return;
    }
    me.path = path;
    me.isDancing = false;
    me.isSitting = false;
    netRef.current?.send("move", { id: myId, from: { gx: me.gx, gy: me.gy }, path });
  };

  const nudgeRef = useRef<{ id: string; startX: number; startY: number; ox: number; oy: number } | null>(null);

  const handleCanvasDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!buildMode || buildTool !== "nudge") return;
    const engine = engineRef.current;
    if (!engine) return;
    const it = engine.furniPickAt(e.clientX, e.clientY);
    if (!it) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    nudgeRef.current = { id: it.id, startX: e.clientX, startY: e.clientY, ox: it.ox ?? 0, oy: it.oy ?? 0 };
    setNudgeSel(it.id);
  };

  const handleCanvasUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = nudgeRef.current;
    if (!d) return;
    nudgeRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    void saveNudge(d.id, { ox: d.ox, oy: d.oy });
  };

  const handleCanvasMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const engine = engineRef.current;
    const d = nudgeRef.current;
    if (engine && d) {
      const it = engine.furni.find((f) => f.id === d.id);
      const scale = Math.max(0.3, engine.scaleNow());
      if (it) {
        it.ox = Math.max(-200, Math.min(200, Math.round(d.ox + (e.clientX - d.startX) / scale)));
        it.oy = Math.max(-200, Math.min(200, Math.round(d.oy + (e.clientY - d.startY) / scale)));
      }
      return;
    }
    if (engine) engine.hover = engine.tileAtClient(e.clientX, e.clientY);
  };

  const toggleDance = () => {
    const me = engineRef.current?.me();
    if (!me) return;
    stopFishing();
    me.isDancing = !me.isDancing;
    if (me.isDancing) {
      me.isSitting = false;
      me.path = [];
    }
    netRef.current?.send("action", { id: myId, isDancing: me.isDancing, isSitting: me.isSitting });
    trackPresence();
  };

  const toggleSit = () => {
    const me = engineRef.current?.me();
    if (!me) return;
    stopFishing();
    if (me.isRidingHorse) {
      me.isRidingHorse = false;
      setRiding(false);
    }
    me.isSitting = !me.isSitting;
    me.path = [];
    netRef.current?.send("action", { id: myId, isSitting: me.isSitting, isRidingHorse: false });
    trackPresence();
  };

  const toggleHorse = () => {
    const p = profileRef.current;
    if (!canRideHorse(p.role) || !p.inventory.includes("suvari_ati")) {
      notify("Süvari Atı sadece Süvari ve Admin rütbesine sahip yetkililer içindir!");
      return;
    }
    const me = engineRef.current?.me();
    if (!me) return;
    const next = !me.isRidingHorse;
    me.isRidingHorse = next;
    if (next) me.isSitting = false;
    setRiding(next);
    netRef.current?.send("action", { id: myId, isRidingHorse: next, isSitting: false });
    trackPresence();
  };

  const sendEmote = (emoji: string) => {
    if (!EMOTES.includes(emoji)) return;
    const engine = engineRef.current;
    if (!engine || engine.emotes.filter((x) => x.playerId === myId).length > 3) return;
    engine.emotes.push({ id: Math.random().toString(36).slice(2), playerId: myId, emoji, createdAt: performance.now() });
    netRef.current?.send("emote", { id: myId, emoji });
  };

  const toggleMusic = () => {
    if (music.running) {
      music.stop();
      setMusicOn(false);
    } else {
      music.start(roomSlugRef.current);
      setMusicOn(music.running);
    }
  };

  const changeLook = (look: ColorLook) => {
    updateProfile(look);
    void act(() => backend.setLook(look));
  };

  const claimDaily = async () => {
    const coins = await act(() => backend.claimDaily());
    if (coins === undefined) return;
    updateProfile({ coins, canClaimDaily: false });
    sfx.play("coin");
    sys("Günlük ödülün olan +500 Sanil hesabına eklendi!");
  };

  const goHome = () =>
    void act(async () => {
      const slug = await backend.ensureHome();
      await changeRoom(slug);
    });

  const findFreeTileNear = (type: FurniType): Tile | null => {
    const engine = engineRef.current;
    const me = engine?.me();
    if (!engine || !me) return null;
    const def = resolveRoom(roomSlugRef.current);
    const cols = def?.cols ?? GRID_SIZE;
    const rows = def?.rows ?? GRID_SIZE;
    const floor = FURNI_BY_TYPE[type].floor;
    const cx = Math.round(me.gx);
    const cy = Math.round(me.gy);
    for (let r = 1; r <= 4; r++) {
      for (let dx = -r; dx <= r; dx++) {
        for (let dy = -r; dy <= r; dy++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const t = { gx: cx + dx, gy: cy + dy };
          if (!inGrid(t.gx, t.gy, cols, rows)) continue;
          if (engine.portalAt(t) || engine.isWaterTile(t)) continue;
          if (engine.furniAt(t, floor)) continue;
          return t;
        }
      }
    }
    return null;
  };

  const useBagItem = async (key: string) => {
    if (key === "suvari_ati") {
      toggleHorse();
      return;
    }
    if (key === "fishing_rod") {
      const next = profileRef.current.tool === "fishing_rod" ? null : "fishing_rod";
      if (!next) stopFishing();
      await act(async () => {
        const tool = await backend.equipTool(next);
        updateProfile({ tool });
        notify(tool ? "🎣 Olta kuşandı! İskelede denize tıkla." : "Olta çantaya kaldırıldı.");
      });
      return;
    }
    if (!isFurniType(key)) return;
    const tile = findFreeTileNear(key);
    if (!tile) {
      notify("Yakınında boş kare yok.");
      return;
    }
    await act(async () => {
      updateProfile({ inventory: await backend.placeFromBag(roomSlugRef.current, key, tile.gx, tile.gy, 0) });
      await reloadRoom();
    });
  };

  /* ---------------- NPC: olta al / balık sat ---------------- */

  const buyRod = () =>
    void act(async () => {
      const r = await backend.buyFishingRod();
      updateProfile({ coins: r.coins, inventory: r.inventory, tool: r.tool });
      setActiveNpc(null);
      notify("🎣 Olta alındı ve kuşandı! İskelede denize tıkla.", 4000);
    });

  const sellFish = (item?: string) =>
    void act(async () => {
      await syncPos();
      const r = await backend.sellFish(item);
      updateProfile({ coins: r.coins, inventory: r.inventory });
      notify(`💰 ${r.sold} balık satıldı: +${r.earned} Sanil`, 3200);
    });

  /* ---------------- Maden / çiftlik / aşçılık ---------------- */

  const lastMine = useRef(0);
  const buyPickaxe = () =>
    void act(async () => {
      await syncPos();
      const r = await backend.buyPickaxe();
      updateProfile({ coins: r.coins, inventory: r.inventory });
      sfx.play("coin");
      notify("⛏️ Kazma alındı! Bir kayanın yanına gidip Kaz'a bas.", 4000);
    });

  const mine = () =>
    void act(async () => {
      if (performance.now() - lastMine.current < MINE_COOLDOWN_MS) return notify("Kazma henüz hazır değil.");
      lastMine.current = performance.now();
      await syncPos();
      const r = await backend.mineOre();
      updateProfile({ inventory: r.inventory });
      const meta = BAG_ITEM_LABELS[r.item];
      sfx.play(r.item === "ore_gem" ? "win" : "catch");
      notify(`${meta?.icon ?? "⛏️"} ${meta?.name ?? "Cevher"} çıkardın! (${r.value} S)`, 2500);
      void refreshProfile();
    });

  const sellGoods = (prefix: GoodsPrefix, item?: string) =>
    void act(async () => {
      await syncPos();
      const r = await backend.sellGoods(prefix, item);
      updateProfile({ coins: r.coins, inventory: r.inventory });
      sfx.play("coin");
      notify(`💰 ${r.sold} ürün satıldı: +${r.earned} Sanil`, 3200);
      void refreshProfile();
    });

  const loadFarm = useCallback(async () => {
    try {
      const plots = await backend.farmGet();
      setFarmPlots(plots);
      setFarmAt(Date.now());
    } catch {
      /* sessiz geç */
    }
  }, []);

  const farmPlant = (slot: number, crop: string) =>
    void act(async () => {
      await syncPos();
      updateProfile({ coins: await backend.farmPlant(slot, crop) });
      sfx.play("click");
      await loadFarm();
    });

  const farmHarvest = (slot: number) =>
    void act(async () => {
      await syncPos();
      updateProfile({ inventory: await backend.farmHarvest(slot) });
      sfx.play("catch");
      notify("🌾 Ekin toplandı!");
      await loadFarm();
      void refreshProfile();
    });

  const cookDish = (dish: string) =>
    void act(async () => {
      await syncPos();
      updateProfile({ inventory: await backend.cook(dish) });
      sfx.play("win");
      notify(`${BAG_ITEM_LABELS[dish]?.icon ?? "🍽️"} ${BAG_ITEM_LABELS[dish]?.name ?? "Yemek"} hazır!`);
      void refreshProfile();
    });

  /* ---------------- Masalar ---------------- */

  const dicePlay = async (bet: number) => {
    await syncPos();
    const r = await act(() => backend.dicePlay(bet));
    if (!r) return undefined;
    updateProfile({ coins: r.coins });
    sfx.play(r.result === "win" ? "win" : r.result === "lose" ? "error" : "click");
    return r;
  };
  const bjRun = (fn: () => Promise<BjState>) =>
    void act(async () => {
      await syncPos();
      const r = await fn();
      setBj(r);
      updateProfile({ coins: r.coins });
      if (r.done) {
        sfx.play(r.delta > 0 ? "win" : r.delta < 0 ? "error" : "click");
        void refreshProfile();
      } else sfx.play("click");
    });

  /* ---------------- Lonca ---------------- */

  const loadGuild = useCallback(async () => {
    try {
      const g = await backend.guildGet();
      setGuild(g);
      if (!g) setGuildList(await backend.guildList());
    } catch {
      /* sessiz geç */
    }
  }, []);

  const guildAct = (fn: () => Promise<unknown>, msg?: string) =>
    void act(async () => {
      await fn();
      if (msg) notify(msg);
      await loadGuild();
      void refreshProfile();
    });

  /* ---------------- Bayrak / ebelemece ---------------- */

  const grabFlag = () =>
    void act(async () => {
      await syncPos();
      const r = await backend.flagGrab(roomSlugRef.current);
      updateProfile({ coins: r.coins });
      sfx.play("win");
    });

  const tagPlayer = (name: string) =>
    void act(async () => {
      await syncPos();
      const r = await backend.hideTag(name);
      sfx.play("catch");
      notify(`🙈 ${r.tagged} yakalandı! +${r.prize} Sanil`);
      void refreshProfile();
    });

  /* ---------------- Mağaza ---------------- */

  const buyCosmetic = (id: string) =>
    void act(async () => {
      const r = await backend.buyCosmetic(id);
      updateProfile({ coins: r.coins, wardrobe: r.wardrobe });
      notify(`${COSMETIC_BY_ID[id]?.icon ?? "🛍️"} ${COSMETIC_BY_ID[id]?.name ?? "Ürün"} alındı!`);
    });

  const buyBadge = (key: string) =>
    void act(async () => {
      const r = await backend.buyBadge(key);
      updateProfile({ coins: r.coins });
      setBadgeState(await backend.getBadges());
      notify(`${BADGE_BY_KEY[key]?.icon ?? "🎖️"} ${BADGE_BY_KEY[key]?.name ?? "Rozet"} rozeti senin!`);
    });

  const buyHome = (size: number) =>
    void act(async () => {
      const r = await backend.buyHome(size);
      registerHomeSize(r.slug, r.size);
      updateProfile({ coins: r.coins });
      setMyHomeSize(r.size);
      notify(`🏡 ${r.size}x${r.size} evin hazır! (${r.price === 0 ? "ücretsiz" : `-${r.price} Sanil`}) "Evim" ile gidebilirsin.`);
    });

  const expandHome = (size: number) =>
    void act(async () => {
      const r = await backend.expandHome(size);
      registerHomeSize(roomSlugRef.current, r.size);
      const nd = resolveRoom(roomSlugRef.current);
      if (nd) engineRef.current?.setRoom(nd);
      updateProfile({ coins: r.coins });
      setMyHomeSize(r.size);
      setRoomStyle((st) => (st ? { ...st, size: r.size } : st));
      styleRefresh.current();
      notify(`🏗️ Evin ${r.size}x${r.size} oldu! (${r.price === 0 ? "ücretsiz" : `-${r.price} Sanil`})`);
    });

  const claimGuideGift = () =>
    void act(async () => {
      const r = await backend.claimGuideGift();
      updateProfile({ coins: r.coins, guideGift: true });
      sfx.play("coin");
      notify(`🎁 Hoş geldin hediyesi: +${r.reward} Sanil!`);
    });

  const buyBundle = (id: string) =>
    void act(async () => {
      const r = await backend.buyBundle(id);
      updateProfile({ coins: r.coins, ...(r.inventory ? { inventory: r.inventory } : {}), ...(r.wardrobe ? { wardrobe: r.wardrobe } : {}) });
      notify(`${BUNDLE_BY_ID[id]?.icon ?? "🛍️"} ${BUNDLE_BY_ID[id]?.name ?? "Paket"} alındı! (-${r.price} Sanil)`);
    });

  const equipCosmetic = (slot: CosmeticSlot, id: string | null) =>
    void act(async () => {
      await backend.equipCosmetic(slot, id);
      updateProfile(slot === "hat" ? { hat: id } : slot === "glasses" ? { glasses: id } : slot === "top" ? { top: id } : slot === "back" ? { back: id } : slot === "pet" ? { pet: id } : { hairStyle: id ?? "hs_short" });
    });

  /* ---------------- Görevler / pazar / profil kartı / turnuva ---------------- */

  const loadQuests = useCallback(async () => {
    try {
      const [q, t] = await Promise.all([backend.getQuests(), backend.getTournament()]);
      setQuests(q);
      setTournament(t);
      setOwnCard(await backend.getProfileCard(profileRef.current.username));
    } catch {
      /* sessiz geç */
    }
  }, []);

  const claimQuest = (key: string) =>
    void act(async () => {
      const r = await backend.claimQuest(key);
      sfx.play("coin");
      notify(`📜 Görev ödülü: +${r.coins} Sanil, +${r.xp} XP`, 3500);
      await refreshProfile();
      setQuests(await backend.getQuests());
    });

  const loadMarket = useCallback(async () => {
    try {
      setListings(await backend.marketGet());
    } catch {
      /* sessiz geç */
    }
  }, []);

  const marketBuy = (id: number) =>
    void act(async () => {
      const r = await backend.marketBuy(id);
      updateProfile({ coins: r.coins, inventory: r.inventory });
      await refreshProfile();
      sfx.play("coin");
      notify("🏪 Satın alındı!");
      await loadMarket();
    });

  const marketCancel = (id: number) =>
    void act(async () => {
      updateProfile({ inventory: await backend.marketCancel(id) });
      await refreshProfile();
      notify("İlan iptal edildi, eşya çantana döndü.");
      await loadMarket();
    });

  const marketList = async (item: string, price: number, forUser?: string) => {
    const inv = await act(() => backend.marketList(item, price, forUser));
    if (!inv) return false;
    updateProfile({ inventory: inv });
    await refreshProfile();
    notify("🏪 İlan verildi!");
    await loadMarket();
    return true;
  };

  const showProfileCard = (name: string) => {
    setCardView({ name, card: null, error: "" });
    backend
      .getProfileCard(name)
      .then((card) => setCardView((v) => (v && v.name === name ? { ...v, card } : v)))
      .catch((e) => setCardView((v) => (v && v.name === name ? { ...v, error: e instanceof Error ? e.message : "Profil yüklenemedi." } : v)));
  };

  const cycleWeather = () => {
    const order: WeatherMode[] = ["auto", "rain", "snow", "none"];
    const next = order[(order.indexOf(weather) + 1) % order.length];
    setWeather(next);
    if (engineRef.current) engineRef.current.weather = next;
  };

  const toggleSfx = () => {
    sfx.enabled = !sfx.enabled;
    setSfxOn(sfx.enabled);
    if (sfx.enabled) sfx.play("click");
  };

  const questBadge = quests ? quests.filter((q) => q.progress >= q.goal && !q.claimed).length : 0;

  /* ---------------- Arkadaş / hediye / şikayet ---------------- */

  const friendRequest = (name: string) =>
    void act(async () => {
      await backend.friendRequest(name);
      notify(`👥 ${name} adlı oyuncuya istek gönderildi.`);
      await refreshFriends();
    });

  const friendRespond = (name: string, accept: boolean) =>
    void act(async () => {
      await backend.friendRespond(name, accept);
      await refreshFriends();
    });

  const friendRemove = (name: string) =>
    void act(async () => {
      await backend.friendRemove(name);
      await refreshFriends();
    });

  const setHomeAccess = (a: HomeAccess) =>
    void act(async () => {
      await backend.setHomeAccess(a);
      notify(a === "open" ? "Odan herkese açık." : a === "friends" ? "Odan sadece arkadaşlarına açık." : "Odan sadece sana açık.");
    });

  const changeHomeStyle = (wall: string, floor: string) =>
    void act(async () => {
      const coins = await backend.setHomeStyle(wall, floor);
      updateProfile({ coins });
      styleRefresh.current();
      notify("🎨 Oda dekoru güncellendi!");
    });

  const likeRoom = () =>
    void act(async () => {
      const n = await backend.likeHome(roomSlugRef.current);
      setRoomStyle((s) => (s ? { ...s, likes: n } : s));
      sfx.play("coin");
      notify("❤️ Odayı beğendin!");
    });

  const saveStatus = (text: string) =>
    void act(async () => {
      await backend.setStatus(text);
      await refreshProfile();
      notify(text.trim() ? "💬 Durum mesajın güncellendi." : "Durum mesajın temizlendi.");
    });

  const takePhoto = () => {
    const canvas = document.querySelector("canvas");
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sevalika-${roomSlugRef.current}-${Date.now()}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      sfx.play("pop");
      notify("📸 Fotoğraf indirildi!");
    }, "image/png");
  };

  const giftCoins = (name: string, amount: number) =>
    void act(async () => {
      const coins = await backend.giftCoins(name, Math.floor(amount));
      updateProfile({ coins });
      sys(`🎁 ${name} adlı oyuncuya ${Math.floor(amount)} Sanil gönderdin.`);
    });

  const giftItem = (name: string, item: string) =>
    void act(async () => {
      updateProfile({ inventory: await backend.giftItem(name, item) });
      sys(`🎁 ${name} adlı oyuncuya ${BAG_ITEM_LABELS[item]?.name ?? item} hediye ettin.`);
    });

  const reportPlayer = (name: string, reason: string) =>
    void act(async () => {
      await backend.reportPlayer(name, reason);
      notify("🚩 Şikayetin yetkililere iletildi.");
    });

  /* ---------------- Admin ---------------- */

  const needTarget = (t: string) => {
    if (!t.trim()) {
      notify("Hedef kullanıcı adı yaz.");
      return false;
    }
    return true;
  };
  const adminGrantRole = (target: string, role: UserRole) => {
    if (!needTarget(target)) return;
    void act(async () => {
      await backend.adminSetRole(target.trim(), role);
      sys(`${target.trim()} → ${ROLE_LABEL[role]} yapıldı.`);
    });
  };
  const adminGift = (target: string, amount: number) => {
    if (!needTarget(target)) return;
    void act(async () => {
      await backend.adminGift(target.trim(), Math.floor(amount));
      sys(`${target.trim()} hesabına +${Math.floor(amount)} Sanil verildi.`);
    });
  };
  const adminKick = (target: string) => {
    if (!needTarget(target)) return;
    void act(async () => {
      await backend.adminKick(target.trim());
      sys(`${target.trim()} uzaklaştırıldı.`);
    });
  };
  const adminMute = (target: string, minutes: number) => {
    if (!needTarget(target)) return;
    void act(async () => {
      await backend.adminMute(target.trim(), Math.floor(minutes));
      sys(`${target.trim()} ${Math.floor(minutes)} dk susturuldu.`);
    });
  };
  const adminUnmute = (target: string) => {
    if (!needTarget(target)) return;
    void act(async () => {
      await backend.adminUnmute(target.trim());
      sys(`${target.trim()} susturması kaldırıldı.`);
    });
  };
  const adminBan = (target: string, hours: number) => {
    if (!needTarget(target)) return;
    void act(async () => {
      await backend.adminBan(target.trim(), Math.floor(hours));
      sys(`${target.trim()} yasaklandı${hours > 0 ? ` (${Math.floor(hours)} saat)` : " (süresiz)"}.`);
    });
  };
  const adminUnban = (target: string) => {
    if (!needTarget(target)) return;
    void act(async () => {
      await backend.adminUnban(target.trim());
      sys(`${target.trim()} yasağı kaldırıldı.`);
    });
  };
  const adminDanceAll = (on: boolean) => void act(() => backend.adminDance(roomSlugRef.current, on));
  const adminClearRoom = () => {
    if (!confirm("Bu odadaki tüm eşyalar silinecek. Emin misin?")) return;
    void act(() => backend.adminClearRoom(roomSlugRef.current));
  };
  const loadReports = useCallback(() => backend.adminReports(), []);
  const loadLog = useCallback(() => backend.adminLog(), []);

  const answerQuiz = async (text: string): Promise<boolean> => {
    const r = await act(() => backend.answerQuiz(text));
    if (!r) return false;
    if (!r.correct) {
      notify("❌ Yanlış cevap, tekrar dene!");
      return false;
    }
    setQuiz(null);
    void refreshProfile();
    return true;
  };

  /* ---------------- Sohbet ---------------- */

  const submitChat = async () => {
    const raw = chatInput.trim();
    if (!raw) return;
    if (raw.length > MAX_CHAT_LENGTH) return notify(`Mesaj en fazla ${MAX_CHAT_LENGTH} karakter olabilir.`);

    const lower = raw.toLowerCase();
    const p = profileRef.current;
    const slug = roomSlugRef.current;
    const emoteCmd: Record<string, string> = { "/el": "👋", "/kalp": "❤️", "/gul": "😂", "/alkis": "👏" };

    if (lower === "/yardim" || lower === "/help") {
      for (const line of HELP_LINES) sys(line);
      sys(
        "⌨️ Komutlar: /dans, /otur, /zar, /ev, /el, /kalp, /gul, /alkis" +
          (canWhisper(p.role) ? ", /pm nick mesaj" : "") +
          (p.role === "admin" ? ", /duyuru metin, /kick nick, /herkesdans, /dansdurdur" : ""),
      );
    } else if (lower === "/dans") toggleDance();
    else if (lower === "/otur") toggleSit();
    else if (lower === "/ev") goHome();
    else if (lower in emoteCmd) sendEmote(emoteCmd[lower]);
    else if (lower === "/zar") {
      const n = await act(() => backend.rollDice(slug));
      if (n === undefined) return;
      const text = `🎲 zar attı: ${n}`;
      engineRef.current?.bubbles.push({ id: Math.random().toString(36).slice(2), sender: p.username, uid: p.id, text, createdAt: performance.now() });
      addChat({ sender: p.username, text, role: p.role });
    } else if (lower.startsWith("/pm ")) {
      if (!canWhisper(p.role)) return notify("Özel mesaj (/pm) sadece VIP ve üstü içindir.");
      const [target, ...rest] = raw.slice(4).trim().split(" ");
      const body = rest.join(" ").trim();
      if (!target || !body) return notify("Kullanım: /pm kullaniciadi mesaj");
      const ok = await act(async () => {
        await backend.sendChat(slug, body, target);
        return true;
      });
      if (!ok) return;
      addChat({ sender: p.username, text: body, role: p.role, isWhisper: true, whisperTarget: target });
    } else if (lower.startsWith("/duyuru ") || lower.startsWith("/kick ") || lower === "/herkesdans" || lower === "/dansdurdur") {
      if (p.role !== "admin") return notify("Bu komut için admin yetkisi gerekli.");
      if (lower.startsWith("/duyuru ")) void act(() => backend.adminAnnounce(raw.slice(8).trim()));
      else if (lower.startsWith("/kick ")) adminKick(raw.slice(6));
      else adminDanceAll(lower === "/herkesdans");
    } else if (raw.startsWith("/")) {
      return notify("Bilinmeyen komut. /yardim yaz.");
    } else {
      if (isBlocked(p.mutedUntil)) return notify("🔇 Susturuldun, şu an yazamazsın.");
      const ok = await act(async () => {
        await backend.sendChat(slug, raw);
        return true;
      });
      if (!ok) return;
      engineRef.current?.bubbles.push({ id: Math.random().toString(36).slice(2), sender: p.username, uid: p.id, text: raw, createdAt: performance.now() });
      addChat({ sender: p.username, text: raw, role: p.role });
    }
    setChatInput("");
  };

  const logout = async () => {
    await backend.signOut();
    onLogout();
  };

  const incomingRequests = friends.filter((f) => f.relation === "incoming").length;
  const isFriend = (name: string) => friends.some((f) => f.relation === "friend" && f.username.toLowerCase() === name.toLowerCase());

  /* ---------------- Arayüz ---------------- */

  return (
    <div className="flex flex-col h-[100dvh] bg-slate-950 text-slate-100 select-none overflow-hidden font-sans">
      <div className="pointer-events-none fixed top-[52px] left-0 right-0 z-30 flex justify-center">
        <EventBanner events={events} onOpen={() => setPanel("events")} onClaim={claimEvent} />
      </div>
      <TopBar
        profile={profile}
        roomSlug={roomSlug}
        roomName={room.name}
        conn={conn}
        onlineCount={onlineCount}
        isAdmin={isAdmin}
        panel={panel}
        buildMode={buildMode}
        friendBadge={incomingRequests}
        questBadge={questBadge}
        onChangeRoom={(s) => void changeRoom(s)}
        onGoHome={goHome}
        onClaimDaily={claimDaily}
        onTogglePanel={(k) => {
          if (k === "friends") void refreshFriends();
          if (k === "quests") void loadQuests();
          if (k === "wheel") void backend.wheelStatus().then(setWheelStatus).catch(() => {});
          if (k === "badges") void backend.getBadges().then(setBadgeState).catch(() => {});
          if (k === "market") void loadMarket();
          if (k === "guild") void loadGuild();
          setPanel((cur) => (cur === k ? null : k));
        }}
        onToggleBuild={() => setBuildMode((b) => !b)}
      />

      <div className="relative flex-1 min-h-0 overflow-hidden">
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          onPointerDown={handleCanvasDown}
          onPointerUp={handleCanvasUp}
          onPointerCancel={handleCanvasUp}
          onWheel={(e) => {
            if (!buildMode || buildTool !== "nudge" || !nudgeSel) return;
            const it = engineRef.current?.furni.find((f) => f.id === nudgeSel);
            if (!it) return;
            it.sc = Math.max(50, Math.min(200, (it.sc ?? 100) + (e.deltaY < 0 ? 5 : -5)));
            void saveNudge(nudgeSel);
          }}
          onMouseMove={handleCanvasMove}
          onMouseLeave={() => {
            if (engineRef.current) engineRef.current.hover = null;
          }}
          className="absolute inset-0 cursor-pointer touch-manipulation"
        />

        {announcement && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 w-[92%] max-w-md bg-slate-900/95 border-2 border-yellow-400 rounded-2xl p-3 shadow-2xl text-center animate-bounce">
            <div className="text-[10px] font-black uppercase tracking-widest text-yellow-400">⚔️ DUYURU ({announcement.sender})</div>
            <div className="text-xs md:text-sm font-bold text-white mt-0.5">{announcement.text}</div>
          </div>
        )}

        <div className="absolute top-14 right-2.5 z-20 flex flex-col items-end gap-1.5">
          {tournament?.active && tournament.ends_at && (
            <CountChip
              label="🏆 Balık Turnuvası"
              endsAt={Date.parse(tournament.ends_at)}
              tone="border-orange-400/60 text-orange-200"
              onClick={() => {
                void loadQuests();
                setPanel("quests");
              }}
              onExpire={() => setTournament({ active: false })}
            />
          )}
          {flag?.active && flag.ends_at && (
            <>
              <CountChip label={`🚩 Bayrak (${ROOMS_NAME(flag.room ?? null)})`} endsAt={Date.parse(flag.ends_at)} tone="border-red-400/60 text-red-200" onExpire={() => setFlag({ active: false })} />
              {flag.room === roomSlug && (
                <button onClick={grabFlag} className="bg-red-500 text-white text-xs font-black rounded-full px-4 py-1.5 shadow-lg animate-pulse">
                  🚩 Bayrağı Kap! (+{flag.prize} S)
                </button>
              )}
            </>
          )}
          {hide?.active && hide.ends_at && (
            <CountChip
              label={hide.me_seeker ? "🙈 Sen ebesin!" : `🙈 Ebe: ${hide.seeker}`}
              endsAt={Date.parse(hide.ends_at)}
              tone="border-fuchsia-400/60 text-fuchsia-200"
              onExpire={() => setHide({ active: false })}
            />
          )}
        </div>

        <RoomLoader key={roomSlug} name={resolveRoom(roomSlug)?.name ?? "Oda"} />
        {quiz && <QuizBanner quiz={quiz} onAnswer={answerQuiz} onExpire={() => setQuiz(null)} />}

        <div ref={dockL} className="sw-dock absolute top-2.5 left-2.5 z-10 flex flex-col gap-2 items-start pointer-events-none">
          {!showAvatar ? (
            <button
              onClick={() => setShowAvatar(true)}
              className="bg-slate-900/90 backdrop-blur border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold text-white shadow-lg flex items-center gap-1.5"
            >
              <RoleBadge role={profile.role} />
              {profile.username}
            </button>
          ) : (
            <AvatarPanel
              profile={profile}
              canRide={canRideHorse(profile.role)}
              riding={riding}
              onClose={() => setShowAvatar(false)}
              onLook={changeLook}
              onToggleHorse={toggleHorse}
              onEmote={sendEmote}
              onShop={() => setPanel("shop")}
              onStatus={saveStatus}
              onPhoto={takePhoto}
              layered={layeredOn}
              onToggleLayered={toggleLayered}
              music={musicOn}
              onToggleMusic={toggleMusic}
              onDance={toggleDance}
              onSit={toggleSit}
              weather={weather}
              onWeather={cycleWeather}
              sfxOn={sfxOn}
              onToggleSfx={toggleSfx}
              onLogout={logout}
            />
          )}
          {cardView && <ProfileCardModal name={cardView.name} card={cardView.card} error={cardView.error} onClose={() => setCardView(null)} />}
          {selected && (
            <PlayerCard
              name={selected.name}
              role={selected.role}
              isFriend={isFriend(selected.name)}
              inventory={profile.inventory}
              canWhisper={canWhisper(profile.role)}
              isAdmin={isAdmin}
              onClose={() => setSelected(null)}
              onWhisper={() => {
                setChatInput(`/pm ${selected.name} `);
                setSelected(null);
              }}
              onAddFriend={() => friendRequest(selected.name)}
              onGiftCoins={(n) => giftCoins(selected.name, n)}
              onGiftItem={(it) => giftItem(selected.name, it)}
              onProfile={() => showProfileCard(selected.name)}
              onTag={hide?.active && hide.me_seeker && hide.room === roomSlug ? () => tagPlayer(selected.name) : undefined}
              onReport={(reason) => reportPlayer(selected.name, reason)}
              onGift={(n) => adminGift(selected.name, n)}
              onRole={(r) => adminGrantRole(selected.name, r)}
              onKick={() => adminKick(selected.name)}
              onMute={(m) => adminMute(selected.name, m)}
              onBan={(h) => adminBan(selected.name, h)}
            />
          )}
        </div>

        <div ref={dockR} className="sw-dock absolute top-2.5 right-2.5 z-20 flex flex-col gap-2 items-end pointer-events-none">
          {roomSlug === "oyunika" && (
            <OyunikaHud
              state={oyunika}
              myUsername={profile.username}
              rolling={oyunikaRolling}
              onRoll={oyunikaRollDice}
              onReset={() => void oyunikaStart()}
              onLeaveRoom={() => void changeRoom("cadde-1")}
            />
          )}
          {activeNpc === "oyunika" && (
            <OyunikaLobbyModal
              state={oyunika}
              myUsername={profile.username}
              onClose={() => setActiveNpc(null)}
              onJoin={oyunikaJoin}
              onLeave={oyunikaLeave}
              onStart={() => void oyunikaStart()}
            />
          )}
          {activeNpc === "fisher" && (
            <FisherNpcModal
              hasRod={profile.inventory.includes("fishing_rod")}
              coins={profile.coins}
              isAdmin={isAdmin}
              onClose={() => setActiveNpc(null)}
              onBuyRod={buyRod}
            />
          )}
          {activeNpc === "chef" && (
            <ChefNpcModal
              inventory={profile.inventory}
              onClose={() => setActiveNpc(null)}
              onSellAll={() => sellFish()}
              onSellOne={(k) => sellFish(k)}
              onCook={cookDish}
              onSellDishes={() => sellGoods("dish_")}
              onSellDish={(k) => sellGoods("dish_", k)}
            />
          )}
          {activeNpc === "miner" && (
            <MinerNpcModal
              inventory={profile.inventory}
              coins={profile.coins}
              isAdmin={isAdmin}
              onClose={() => setActiveNpc(null)}
              onBuyPickaxe={buyPickaxe}
              onMine={mine}
              onSellAll={() => sellGoods("ore_")}
              onSellOne={(k) => sellGoods("ore_", k)}
            />
          )}
          {activeNpc === "farmer" && (
            <FarmerNpcModal
              plots={farmPlots}
              fetchedAt={farmAt}
              inventory={profile.inventory}
              coins={profile.coins}
              isAdmin={isAdmin}
              onClose={() => setActiveNpc(null)}
              onPlant={farmPlant}
              onHarvest={farmHarvest}
              onSellAll={() => sellGoods("crop_")}
              onSellOne={(k) => sellGoods("crop_", k)}
            />
          )}
          {activeNpc === "dealer" && (
            <DealerModal
              coins={profile.coins}
              isAdmin={isAdmin}
              bj={bj}
              onClose={() => setActiveNpc(null)}
              onDice={dicePlay}
              onBjStart={(b) => bjRun(() => backend.bjStart(b))}
              onBjHit={() => bjRun(() => backend.bjHit())}
              onBjStand={() => bjRun(() => backend.bjStand())}
            />
          )}
          {panel === "guild" && (
            <GuildPanel
              guild={guild}
              list={guildList}
              coins={profile.coins}
              onClose={() => setPanel(null)}
              onCreate={(n, t) => guildAct(() => backend.guildCreate(n, t), "🛡️ Lonca kuruldu!")}
              onJoin={(n) => guildAct(() => backend.guildJoin(n), "🛡️ Loncaya katıldın!")}
              onLeave={() => guildAct(() => backend.guildLeave(), "Loncadan ayrıldın.")}
              onKick={(u) => guildAct(() => backend.guildKick(u), `${u} loncadan çıkarıldı.`)}
              onDonate={(n) => guildAct(() => backend.guildDonate(n).then((r) => updateProfile({ coins: r.coins })), "🛡️ Bağış yapıldı!")}
            />
          )}
          {panel === "bag" && <BagPanel inventory={profile.inventory} riding={riding} tool={profile.tool} onClose={() => setPanel(null)} onUse={useBagItem} />}
          {panel === "friends" && (
            <FriendsPanel
              friends={friends}
              onClose={() => setPanel(null)}
              onAdd={friendRequest}
              onRespond={friendRespond}
              onRemove={friendRemove}
              onGoto={(s) => {
                if (isAdmin || s.startsWith("home-")) void changeRoom(s);
                else notify("Bu odaya kapılardan yürüyerek gitmelisin.");
              }}
              onWhisper={(n) => {
                setChatInput(`/pm ${n} `);
                setPanel(null);
              }}
              canWhisper={canWhisper(profile.role)}
              onMyHome={goHome}
              onHomeAccess={setHomeAccess}
              homeStyle={roomStyle && roomSlug === homeSlug(profile.username) ? roomStyle : undefined}
              onHomeStyle={changeHomeStyle}
            />
          )}
          {panel === "quests" && (
            <QuestsPanel profile={profile} quests={quests} tournament={tournament} card={ownCard} onClose={() => setPanel(null)} onClaim={claimQuest} />
          )}
          {panel === "events" && (
            <EventsPanel
              events={events}
              isAdmin={isAdmin}
              onClose={() => setPanel(null)}
              onClaim={claimEvent}
              onCreate={async (e) => {
                const ok = await act(async () => {
                  await backend.adminCreateEvent(e);
                  return true;
                });
                if (ok) void refreshEvents();
              }}
              onEnd={async (id) => {
                await act(() => backend.adminEndEvent(id));
                void refreshEvents();
              }}
            />
          )}
          {panel === "wheel" && (
            <WheelPanel
              status={wheelStatus}
              onClose={() => setPanel(null)}
              onSpin={async () => {
                const r = await act(() => backend.spinWheel());
                if (r) {
                  window.setTimeout(() => {
                    updateProfile({ coins: r.coins });
                    setWheelStatus({ ready: false, seconds: 86400 });
                  }, 4200);
                }
                return r;
              }}
            />
          )}
          {panel === "badges" && <BadgesPanel profile={profile} state={badgeState} onClose={() => setPanel(null)} onBuy={buyBadge} />}
          {panel === "market" && (
            <MarketPanel profile={profile} listings={listings} onClose={() => setPanel(null)} onBuy={marketBuy} onCancel={marketCancel} onList={marketList} />
          )}
          {panel === "shop" && <ShopPanel mode="wardrobe" profile={profile} onClose={() => setPanel(null)} onBuy={buyCosmetic} onEquip={equipCosmetic} />}
          {activeNpc === "stylist" && <ShopPanel mode="shop" slots={["hat", "glasses", "top"]} profile={profile} onClose={() => setActiveNpc(null)} onBuy={buyCosmetic} onEquip={equipCosmetic} />}
          {activeNpc === "barber" && <ShopPanel mode="shop" slots={["hair"]} title="✂️ KUAFÖR SELİN · SAÇ STİLLERİ" profile={profile} onClose={() => setActiveNpc(null)} onBuy={buyCosmetic} onEquip={equipCosmetic} />}
          {activeNpc === "realtor" && <RealtorPanel profile={profile} homeSize={myHomeSize} popular={popularHomes} onClose={() => setActiveNpc(null)} onBuy={buyHome} onGoHome={() => { setActiveNpc(null); goHome(); }} onVisit={(slug) => { setActiveNpc(null); void changeRoom(slug); }} />}
          {activeNpc === "guide" && <GuidePanel profile={profile} onClose={() => setActiveNpc(null)} onGift={claimGuideGift} />}
          {activeNpc === "furnisher" && <BundleShopPanel kind="furni" bundles={FURNI_BUNDLES} profile={profile} onClose={() => setActiveNpc(null)} onBuy={buyBundle} />}
          {activeNpc === "costume" && <BundleShopPanel kind="outfit" bundles={OUTFIT_BUNDLES} profile={profile} onClose={() => setActiveNpc(null)} onBuy={buyBundle} />}
          {activeNpc === "accessory" && <ShopPanel mode="shop" slots={["back", "pet"]} title="🎀 AKSESUARCI MİNA · KANAT & EVCİL" profile={profile} onClose={() => setActiveNpc(null)} onBuy={buyCosmetic} onEquip={equipCosmetic} />}
          {panel === "admin" && isAdmin && (
            <AdminPanel
              onClose={() => setPanel(null)}
              onAnnounce={(t) => void act(() => backend.adminAnnounce(t))}
              onGrantRole={adminGrantRole}
              onGift={adminGift}
              onKick={adminKick}
              onMute={adminMute}
              onUnmute={adminUnmute}
              onBan={adminBan}
              onUnban={adminUnban}
              onDanceAll={adminDanceAll}
              onClearRoom={adminClearRoom}
              onStartQuiz={(q, a, reward, seconds) => void act(async () => {
                await backend.adminStartQuiz(q, a, Math.floor(reward), Math.floor(seconds));
                notify("🎯 Yarışma başlatıldı!");
              })}
              onStartTournament={(m) => void act(async () => {
                await backend.adminStartTournament(m);
                notify("🏆 Turnuva başlatıldı!");
              })}
              onStartFlag={(prize, seconds) => void act(async () => {
                await syncPos();
                await backend.adminStartFlag(roomSlugRef.current, prize, seconds);
              })}
              onStartHide={(seconds) => void act(async () => {
                await syncPos();
                await backend.adminStartHide(roomSlugRef.current, seconds);
              })}
              loadReports={loadReports}
              loadLog={loadLog}
              onCloseReport={async (id) => {
                await act(() => backend.adminCloseReport(id));
              }}
              onTarget={(n) => setSelected({ name: n, role: "user" })}
            />
          )}
          {buildMode && (
            <BuildPanel
              isAdmin={isAdmin}
              tool={buildTool}
              selected={selectedFurni}
              onTool={setBuildTool}
              onSelect={setSelectedFurni}
              onRotate={() => setRotation((r) => (r === 0 ? 1 : 0))}
            />
          )}
          {buildMode && roomStyle && roomSlug === homeSlug(profile.username) && <ExpandHomePanel profile={profile} size={roomStyle.size} onExpand={expandHome} />}
        </div>

        {roomStyle && roomSlug !== homeSlug(profile.username) && (
          <button
            onClick={likeRoom}
            className="absolute bottom-16 left-3 z-10 bg-rose-500/90 hover:bg-rose-400 text-white text-xs font-bold rounded-full px-3 py-1.5 shadow-lg"
          >
            ❤️ Odayı Beğen · {roomStyle.likes}
          </button>
        )}
        {roomStyle && roomSlug === homeSlug(profile.username) && (
          <div className="absolute bottom-16 left-3 z-10 bg-slate-900/80 border border-rose-400/40 text-rose-200 text-xs font-bold rounded-full px-3 py-1.5">
            ❤️ {roomStyle.likes} beğeni
          </div>
        )}
        <div className="absolute bottom-2.5 right-2.5 left-2.5 md:left-auto md:w-80 z-10">
          <ChatLog lines={chat} open={showChat} onToggle={() => setShowChat((s) => !s)} />
        </div>
      </div>

      <ChatBar value={chatInput} onChange={setChatInput} onSubmit={() => void submitChat()} warning={toast} canWhisper={canWhisper(profile.role)} />
    </div>
  );
}
