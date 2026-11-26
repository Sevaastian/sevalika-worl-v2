import { ACHIEVEMENTS, BADGE_BY_KEY, BAG_ITEM_LABELS, PROFESSIONS } from "./constants";
import type { Profession } from "./types";

/** Bildirim merkezinde gösterilen kişisel olaylar (sunucudaki my_notifications listesiyle aynı) */
export const NOTIF_KINDS = new Set([
  "friend_request", "friend_accepted", "gift_coins", "gift_item", "level_up", "achievement", "badge",
  "tournament_prize", "market_offer", "market_sold", "hide_survived", "muted", "guide_tour", "prof_cheer",
  "tip", "shoot_invite", "shoot_done",
]);

export interface NotifView {
  icon: string;
  text: string;
}

export function notifView(kind: string, p: Record<string, unknown>): NotifView | null {
  const from = String(p.from ?? "Biri");
  const n = (v: unknown) => Number(v ?? 0);
  switch (kind) {
    case "friend_request": return { icon: "👥", text: `${from} sana arkadaşlık isteği gönderdi.` };
    case "friend_accepted": return { icon: "🤝", text: `${from} arkadaşlık isteğini kabul etti.` };
    case "gift_coins": return { icon: "🎁", text: `${from} sana ${n(p.amount)} Sanil gönderdi.` };
    case "gift_item": return { icon: "🎁", text: `${from} sana ${BAG_ITEM_LABELS[String(p.item)]?.name ?? "bir eşya"} hediye etti.` };
    case "level_up": return { icon: "⭐", text: `Seviye ${n(p.level)} oldun!` };
    case "achievement": {
      const a = ACHIEVEMENTS[String(p.key ?? "")];
      return { icon: a?.icon ?? "🏅", text: `Başarım kazandın: ${a?.name ?? "yeni başarım"}` };
    }
    case "badge": {
      const d = BADGE_BY_KEY[String(p.key ?? "")];
      const tier = n(p.tier);
      const reward = n(p.reward);
      return { icon: d?.icon ?? "🎖️", text: `${d?.name ?? "Rozet"} rozeti${tier ? " " + "★".repeat(tier) : ""} kazandın${reward ? ` (+${reward} Sanil)` : ""}.` };
    }
    case "tournament_prize": return { icon: "🏆", text: `Turnuvada ${n(p.place)}. oldun! +${n(p.prize)} Sanil` };
    case "market_offer": return { icon: "🏪", text: `${from} sana özel bir ilan verdi.` };
    case "market_sold": return { icon: "💰", text: `${from} ilanını satın aldı! +${n(p.net)} Sanil` };
    case "hide_survived": return { icon: "🙈", text: `Ebelemecede sağ kaldın! +${n(p.prize)} Sanil` };
    case "muted": return { icon: "🔇", text: `${p.from ? String(p.from) : "Yetkili"} seni ${n(p.minutes)} dakika susturdu.` };
    case "guide_tour": return { icon: "🧭", text: `Rehber ${from} turunu tamamladı. +${n(p.amount)} Sanil ve XP kazandın.` };
    case "prof_cheer": {
      const pr = p.prof as Profession | undefined;
      return { icon: "👏", text: `${from} sana ${pr && PROFESSIONS[pr] ? PROFESSIONS[pr].name.toLowerCase() + " " : ""}puanı verdi.` };
    }
    case "tip": return { icon: "💰", text: `${from} sana ${n(p.amount)} Sanil bahşiş bıraktı.` };
    case "shoot_invite": return { icon: "🎬", text: `Yönetmen ${from} seni figüran olarak çekime davet etti.` };
    case "shoot_done": return { icon: "🎬", text: `Çekim tamamlandı! +${n(p.amount)} Sanil ve XP kazandın.` };
    default: return null;
  }
}

export function timeAgo(iso: string, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return "az önce";
  if (s < 3600) return `${Math.floor(s / 60)} dk önce`;
  if (s < 86400) return `${Math.floor(s / 3600)} sa önce`;
  return `${Math.floor(s / 86400)} gün önce`;
}
