"use client";

import { ROLE_RANK, ROOMS, isHomeSlug, levelOf } from "@/lib/constants";
import type { ConnStatus } from "@/lib/network";
import type { Profile } from "@/lib/types";
import RoleBadge from "./RoleBadge";

export type PanelKey = "bag" | "friends" | "shop" | "quests" | "market" | "guild" | "admin";

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
  onToggleBuild: () => void;
}) {
  const dot = resolveConnDot(conn);
  const visibleRooms = ROOMS.filter((r) => r.slug !== "cadde-1" && ROLE_RANK[profile.role] >= ROLE_RANK[r.minRole]);
  const inHome = isHomeSlug(roomSlug);

  return (
    <header className="h-12 bg-slate-900/95 border-b border-slate-800 px-2 md:px-4 flex items-center justify-between gap-2 shrink-0 z-20">
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

      {/* Sabit Cadde 1 + Diğer Oda Sekmeleri */}
      <div className="flex items-center gap-1 min-w-0 flex-1 max-w-xl">
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

      {/* Sağ araçlar */}
      <div className="flex items-center gap-1.5 shrink-0">
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
          🏠 <span className="hidden lg:inline">Evim</span>
        </button>

        <button
          onClick={() => onTogglePanel("friends")}
          className={`relative px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
            panel === "friends" ? "bg-sky-500 text-slate-950 border-sky-300" : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
          }`}
        >
          👥 <span className="hidden lg:inline">Arkadaşlar</span>
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
          📜 <span className="hidden lg:inline">Görevler</span>
          {questBadge > 0 && <span className="ml-1 bg-emerald-500 text-slate-950 text-[10px] font-black px-1.5 rounded-full">{questBadge}</span>}
        </button>

        <button
          onClick={() => onTogglePanel("guild")}
          title="Lonca"
          className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
            panel === "guild" ? "bg-indigo-500 text-white border-indigo-300" : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
          }`}
        >
          🛡️ <span className="hidden lg:inline">Lonca</span>
        </button>

        <button
          onClick={() => onTogglePanel("market")}
          title="Oyuncu Pazarı"
          className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
            panel === "market" ? "bg-amber-500 text-slate-950 border-amber-300" : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
          }`}
        >
          🏪 <span className="hidden lg:inline">Pazar</span>
        </button>

        <button
          onClick={() => onTogglePanel("bag")}
          className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
            panel === "bag" ? "bg-pink-600 text-white border-pink-400" : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
          }`}
        >
          🎒 <span className="hidden lg:inline">Çantam</span>{" "}
          <span className="text-[10px] bg-slate-700 px-1.5 rounded-full">{profile.inventory.length}</span>
        </button>

        {profile.canClaimDaily && (
          <button
            onClick={onClaimDaily}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black px-2.5 py-1 rounded-lg shadow animate-pulse"
          >
            🎁 <span className="hidden md:inline">+500</span>
          </button>
        )}

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
