import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import type { Look, Tile } from "./types";

export interface PresenceState extends Look {
  /** Sunucudaki hesap kimliği; sohbet balonlarını doğru karaktere bağlamak için */
  uid: string;
  name: string;
  gx: number;
  gy: number;
  isRidingHorse: boolean;
  isSitting: boolean;
  isDancing: boolean;
  tool?: string | null;
  pet?: string | null;
  isFishing?: boolean;
}

export type ConnStatus = "connecting" | "connected" | "demo" | "error";

export interface NetHandlers {
  onStatus(s: ConnStatus): void;
  onPresence(list: (PresenceState & { id: string })[]): void;
  onMove(p: { id: string; from: Tile; path: Tile[] }): void;
  onAction(p: { id: string; isDancing?: boolean; isSitting?: boolean; isRidingHorse?: boolean; isFishing?: boolean }): void;
  onEmote(p: { id: string; emoji: string }): void;
}

/**
 * Bir odanın gerçek zamanlı kanalı (Supabase Realtime presence + broadcast).
 * Yalnızca geçici/görsel veriler burada akar: konum, animasyon, emote.
 * Sohbet, Sanil, eşya, rütbe gibi her şey sunucuda (RPC + tablolar) doğrulanır.
 * Supabase yoksa (demo) hiçbir şey yapmaz.
 */
export class RoomNetwork {
  private channel: RealtimeChannel | null = null;

  constructor(
    private sb: SupabaseClient | null,
    private slug: string,
    private clientId: string,
    private h: NetHandlers,
  ) {}

  join(initial: PresenceState) {
    const sb = this.sb;
    if (!sb) {
      this.h.onStatus("demo");
      return;
    }
    this.h.onStatus("connecting");
    const ch = sb.channel(`sevalika:${this.slug}`, {
      config: { presence: { key: this.clientId }, broadcast: { self: false } },
    });
    this.channel = ch;

    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState<PresenceState>();
      const list = Object.entries(state)
        .map(([id, metas]) => ({ id, ...(metas[0] as PresenceState) }))
        .filter((p) => p.name);
      this.h.onPresence(list);
    })
      .on("broadcast", { event: "move" }, ({ payload }) => this.h.onMove(payload))
      .on("broadcast", { event: "action" }, ({ payload }) => this.h.onAction(payload))
      .on("broadcast", { event: "emote" }, ({ payload }) => this.h.onEmote(payload))
      .subscribe(async (status, err) => {
        if (status === "SUBSCRIBED") {
          this.h.onStatus("connected");
          await ch.track(initial);
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
         this.h.onStatus("error");
        }
      });
  }

  send(event: "move" | "action" | "emote", payload: Record<string, unknown>) {
    void this.channel?.send({ type: "broadcast", event, payload });
  }

  track(state: PresenceState) {
    void this.channel?.track(state);
  }

  leave() {
    if (this.channel && this.sb) void this.sb.removeChannel(this.channel);
    this.channel = null;
  }
}
