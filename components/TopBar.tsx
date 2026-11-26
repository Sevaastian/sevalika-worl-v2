"use client";

import { useState } from "react";
import { ROLE_RANK, ROOMS, isHomeSlug, levelOf } from "@/lib/constants";
import type { ConnStatus } from "@/lib/network";
import type { Profile } from "@/lib/types";
import RoleBadge from "./RoleBadge";

export type PanelKey = "bag" | "friends" | "shop" | "quests" | "badges" | "wheel" | "events" | "market" | "guild" | "admin" | "settings" | "daily" | "notifs";

type ConnKey = "connected" | "connecting" | "demo" | "error";

const CONN_DOT: Record<ConnKey, { color: string; text: string }> = {
  connected: { color: "bg-emerald-400", text: "Canlı" },
  connecting: { color: "bg-amber-400 animate-pulse", text: "Bağlanıyor" },
  demo: { color: "bg-sky-400", text: "Demo" },
  error: { color: "bg-red-500", text: "Çevrimdışı" },
};

function resolveConnDot(conn: ConnStatus): { color: string; text: string } {
  return CONN_DOT[conn] ?? CONN_DOT.error;
}

export default function TopBar({
  profile,
  roomSlug,
  roomName,
  conn,
  onlineCount,
  isAdmin,
  panel,
  buildMode,
  friendBadge,
  questBadge,
  onChangeRoom,
  onGoHome,
  onClaimDaily,
  onTogglePanel,
  unread,
  onToggleBuild,
}: {
  profile: Profile;
  roomSlug: string;
  roomName: string;
  conn: ConnStatus;
  onlineCount: number;
  isAdmin: boolean;
  panel: PanelKey | null;
  buildMode: boolean;
  friendBadge: number;
  questBadge: number;
  onChangeRoom: (slug: string) => void;
  onGoHome: () => void;
  onClaimDaily: () => void;
  onTogglePanel: (p: PanelKey) => void;
  unread?: number;
  onToggleBuild: () => void;
}) {
  const dot = resolveConnDot(conn);
  const visibleRooms = ROOMS.filter((r) => r.slug !== "cadde-1" && ROLE_RANK[profile.role] >= ROLE_RANK[r.minRole]);
  const inHome = isHomeSlug(roomSlug);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuItems: { key: PanelKey | "home" | "build"; icon: string; label: string; badge?: number; active?: boolean }[] = [
    { key: "home", icon: "🏠", label: "Evim" },
    { key: "friends", icon: "👥", label: "Arkadaşlar", badge: friendBadge, active: panel === "friends" },
    { key: "quests", icon: "📜", label: "Görevler", badge: questBadge, active: panel === "quests" },
    { key: "badges", icon: "🎖️", label: "Rozetler", active: panel === "badges" },
    { key: "events", icon: "🎉", label: "Etkinlik", active: panel === "events" },
    { key: "wheel", icon: "🎡", label: "Çark", active: panel === "wheel" },
    { key: "guild", icon: "🛡️", label: "Lonca", active: panel === "guild" },
    { key: "market", icon: "🏪", label: "Pazar", active: panel === "market" },
    { key: "settings", icon: "⚙️", label: "Ayarlar", active: panel === "settings" },
    { key: "build", icon: "🛠️", label: buildMode ? "Düzenlemeyi bitir" : "Düzenle", active: buildMode },
    ...(isAdmin ? [{ key: "admin" as const, icon: "⚔️", label: "Admin", active: panel === "admin" }] : []),
  ];
  const menuBadge = friendBadge + questBadge;
  const pick = (k: PanelKey | "home" | "build") => {
    setMenuOpen(false);
    if (k === "home") onGoHome();
    else if (k === "build") onToggleBuild();
    else onTogglePanel(k);
  };

  return (
    <header style={{ paddingLeft: "max(0.5rem, env(safe-area-inset-left))", paddingRight: "max(0.5rem, env(safe-area-inset-right))" }} className="relative h-12 bg-slate-900/95 border-b border-slate-800 md:px-4 flex items-center justify-between gap-2 shrink-0 z-20">
      {/* Marka + aktif oda */}
      <div className="flex items-center gap-2 min-w-0 shrink-0">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-yellow-400 to-orange-500 flex items-center justify-center font-black text-slate-950 text-xs shadow">
          S
        </div>
        <div className="leading-tight">
          <div className="text-xs font-black tracking-wide text-white hidden sm:block">SEVALİKA WORLD</div>
          <div className="text-[11px] font-bold text-sky-400 truncate max-w-[140px] sm:max-w-[180px] flex items-center gap-1.5">
            <span className="truncate">{roomName}</span>
            <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 font-normal shrink-0">
              <span className={`w-1.5 h-1.5 rounded-full ${dot.color}`} />
              {dot.text} ({onlineCount})
            </span>
          </div>
        </div>
      </div>

      {/* Hızlı oda geçişi yalnızca admin içindir; oyuncular kapılardan (portallardan) gezer */}
      {isAdmin ? (
      <div className="hidden md:flex items-center gap-1 min-w-0 flex-1 max-w-xl">
        <button
          title="Cadde 1"
          onClick={() => onChangeRoom("cadde-1")}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition whitespace-nowrap shrink-0 border ${
            roomSlug === "cadde-1"
              ? "bg-sky-500 border-sky-300 text-slate-950 shadow"
              : "bg-slate-800 border-slate-700 text-sky-300 hover:bg-slate-700"
          }`}
        >
          🏙️<span className="hidden 2xl:inline"> Cadde 1</span>
        </button>

        <select
          aria-label="Mekanlar"
          value=""
          title="Mekanlar"
          onChange={(e) => e.target.value && onChangeRoom(e.target.value)}
          className="px-2 py-1 rounded-lg text-[11px] font-bold bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 w-[52px] max-w-[52px] truncate shrink-0 cursor-pointer"
        >
          <option value="" disabled>
            🗺️ Mekanlar
          </option>
          {visibleRooms.map((r) => (
            <option key={r.slug} value={r.slug}>
              {r.name}
            </option>
          ))}
        </select>
      </div>

      ) : (
        <div className="flex-1" />
      )}

      {/* Sağ araçlar */}
      {/* Mobil: kompakt çubuk + Menü */}
      <div className="flex md:hidden items-center gap-1.5 shrink-0 ml-auto">
        <button onClick={() => onTogglePanel("bag")} aria-label="Çanta" className={`px-2.5 py-1.5 rounded-lg text-sm border ${panel === "bag" ? "bg-sky-600 text-white border-sky-400" : "bg-slate-800 text-slate-200 border-slate-700"}`}>
          🎒
        </button>
        <button onClick={() => onTogglePanel("notifs")} aria-label="Bildirimler" className={`relative px-2.5 py-1.5 rounded-lg text-sm border ${panel === "notifs" ? "bg-sky-600 text-white border-sky-400" : "bg-slate-800 text-slate-200 border-slate-700"}`}>
          🔔
          {(unread ?? 0) > 0 && <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center">{(unread ?? 0) > 9 ? "9+" : unread}</span>}
        </button>
        <button onClick={() => onTogglePanel("daily")} aria-label="Günlük ödül" className={`px-2.5 py-1.5 rounded-lg text-sm border ${profile.canClaimDaily ? "bg-emerald-600 text-white border-emerald-400 animate-pulse" : "bg-slate-800 text-slate-200 border-slate-700"}`}>
          🎁
        </button>
        <button onClick={() => setMenuOpen((o) => !o)} aria-label="Menü" aria-expanded={menuOpen} className={`relative px-2.5 py-1.5 rounded-lg text-sm font-black border ${menuOpen ? "bg-yellow-400 text-slate-950 border-yellow-300" : "bg-slate-800 text-slate-200 border-slate-700"}`}>
          ☰
          {menuBadge > 0 && !menuOpen && <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center">{menuBadge > 9 ? "9+" : menuBadge}</span>}
        </button>
      </div>
      {menuOpen && (
        <>
          <div className="md:hidden fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
          <div className="md:hidden absolute top-full right-2 mt-1 z-40 w-[min(92vw,340px)] bg-slate-900/98 backdrop-blur border border-slate-700 rounded-2xl p-2.5 shadow-2xl">
            <div className="grid grid-cols-3 gap-2">
              {menuItems.map((it) => (
                <button
                  key={it.key}
                  onClick={() => pick(it.key)}
                  className={`relative flex flex-col items-center justify-center gap-0.5 min-h-[64px] rounded-xl border text-[11px] font-bold ${it.active ? "bg-yellow-400 text-slate-950 border-yellow-300" : "bg-slate-800 text-slate-100 border-slate-700 active:bg-slate-700"}`}
                >
                  <span className="text-2xl leading-none">{it.icon}</span>
                  <span>{it.label}</span>
                  {(it.badge ?? 0) > 0 && <span className="absolute top-1 right-1.5 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center">{it.badge}</span>}
                </button>
              ))}
            </div>
            {isAdmin && (
              <select
                aria-label="Mekanlar (mobil)"
                value=""
                onChange={(e) => {
                  if (e.target.value) {
                    setMenuOpen(false);
                    onChangeRoom(e.target.value);
                  }
                }}
                className="mt-2 w-full px-2 py-2 rounded-xl text-xs font-bold bg-slate-800 text-slate-200 border border-slate-700"
              >
                <option value="">🗺️ Mekan seç (admin)</option>
                <option value="cadde-1">🏙️ Cadde 1</option>
                {visibleRooms.map((r) => (
                  <option key={r.slug} value={r.slug}>
                    {r.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </>
      )}

      <div className="hidden md:flex items-center gap-1.5 min-w-0 overflow-x-auto no-scrollbar">
        {isAdmin && (
          <button
            onClick={() => onTogglePanel("admin")}
            className={`px-2.5 py-1 rounded-lg text-xs font-extrabold border transition flex items-center gap-1 ${
              panel === "admin"
                ? "bg-yellow-500 text-slate-950 border-yellow-300"
                : "bg-yellow-500/15 hover:bg-yellow-500/25 text-yellow-300 border-yellow-500/40"
            }`}
          >
            <RoleBadge role="admin" />
            <span className="hidden md:inline">Admin</span>
          </button>
        )}

        <button
          onClick={onGoHome}
          title="Kendi ev odana git"
          className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
            inHome ? "bg-amber-500 text-slate-950 border-amber-300" : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
          }`}
        >
          🏠 <span className="hidden 2xl:inline">Evim</span>
        </button>

        <button
          onClick={() => onTogglePanel("friends")}
          className={`relative px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
            panel === "friends" ? "bg-sky-500 text-slate-950 border-sky-300" : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
          }`}
        >
          👥 <span className="hidden 2xl:inline">Arkadaşlar</span>
          {friendBadge > 0 && (
            <span className="ml-1 bg-rose-500 text-white text-[10px] font-black px-1.5 rounded-full">{friendBadge}</span>
          )}
        </button>

        <button
          onClick={() => onTogglePanel("quests")}
          title={`Seviye ${levelOf(profile.xp)} • Günlük görevler & turnuva`}
          className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
            panel === "quests" ? "bg-emerald-500 text-slate-950 border-emerald-300" : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
          }`}
        >
          📜 <span className="hidden 2xl:inline">Görevler</span>
          {questBadge > 0 && <span className="ml-1 bg-emerald-500 text-slate-950 text-[10px] font-black px-1.5 rounded-full">{questBadge}</span>}
        </button>

        <button
          onClick={() => onTogglePanel("badges")}
          title="Rozetlerim"
          className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
            panel === "badges" ? "bg-amber-400 text-slate-950 border-amber-300" : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
          }`}
        >
          🎖️ <span className="hidden 2xl:inline">Rozetler</span>
        </button>

        <button
          onClick={() => onTogglePanel("events")}
          title="Etkinlikler"
          className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
            panel === "events" ? "bg-amber-400 text-slate-950 border-amber-300" : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
          }`}
        >
          🎉 <span className="hidden 2xl:inline">Etkinlik</span>
        </button>

        <button
          onClick={() => onTogglePanel("settings")}
          title="Ayarlar"
          className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
            panel === "settings" ? "bg-slate-200 text-slate-950 border-white" : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
          }`}
        >
          ⚙️ <span className="hidden 2xl:inline">Ayarlar</span>
        </button>

        <button
          onClick={() => onTogglePanel("wheel")}
          title="Günlük Şans Çarkı"
          className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
            panel === "wheel" ? "bg-fuchsia-400 text-slate-950 border-fuchsia-300" : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
          }`}
        >
          🎡 <span className="hidden 2xl:inline">Çark</span>
        </button>

        <button
          onClick={() => onTogglePanel("guild")}
          title="Lonca"
          className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
            panel === "guild" ? "bg-indigo-500 text-white border-indigo-300" : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
          }`}
        >
          🛡️ <span className="hidden 2xl:inline">Lonca</span>
        </button>

        <button
          onClick={() => onTogglePanel("market")}
          title="Oyuncu Pazarı"
          className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
            panel === "market" ? "bg-amber-500 text-slate-950 border-amber-300" : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
          }`}
        >
          🏪 <span className="hidden 2xl:inline">Pazar</span>
        </button>

        <button
          onClick={() => onTogglePanel("bag")}
          className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
            panel === "bag" ? "bg-pink-600 text-white border-pink-400" : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
          }`}
        >
          🎒 <span className="hidden 2xl:inline">Çantam</span>{" "}
          <span className="text-[10px] bg-slate-700 px-1.5 rounded-full">{profile.inventory.length}</span>
        </button>

        <button
          onClick={() => onTogglePanel("notifs")}
          title="Bildirimler"
          aria-label="Bildirimler"
          className={`relative px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
            panel === "notifs" ? "bg-sky-600 text-white border-sky-400" : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
          }`}
        >
          🔔
          {(unread ?? 0) > 0 && <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center">{(unread ?? 0) > 9 ? "9+" : unread}</span>}
        </button>

        <button
          onClick={() => onTogglePanel("daily")}
          title="Günlük ödül ve giriş serisi"
          className={`text-xs font-black px-2.5 py-1 rounded-lg shadow border ${
            profile.canClaimDaily
              ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950 border-emerald-300 animate-pulse"
              : "bg-slate-800 hover:bg-slate-700 text-orange-300 border-slate-700"
          }`}
        >
          {profile.canClaimDaily ? "🎁" : "🔥"}{" "}
          <span className="hidden md:inline">{profile.canClaimDaily ? `Gün ${profile.streakNext ?? 1}` : (profile.dailyStreak ?? 0)}</span>
        </button>

        <div className="bg-slate-800 border border-slate-700 px-2.5 py-1 rounded-lg flex items-center gap-1 text-xs font-bold text-yellow-400">
          <span>🪙</span>
          <span>{isAdmin ? "∞" : profile.coins}</span>
        </div>

        <button
          onClick={onToggleBuild}
          className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
            buildMode ? "bg-yellow-500 text-slate-950 border-yellow-300" : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
          }`}
        >
          🛠️ <span className="hidden md:inline">{buildMode ? "Bitti" : "Düzenle"}</span>
        </button>
      </div>
    </header>
  );
}
